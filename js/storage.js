// ============================================================================
// CasaMorf — Encrypted GitHub Storage Layer
// 
// store.json format on GitHub:
// {
//   "pinHash": "sha256-hash-for-verification",
//   "data": "base64-AES-256-GCM-encrypted-blob"
// }
//
// Without the PIN, "data" is unreadable garbage.
// ============================================================================

const GITHUB_FILE = "data/store.json";
const LOCAL_TOKEN_KEY = "casamorf-gh-token";
const LOCAL_REPO_KEY = "casamorf-gh-repo";
const LOCAL_PIN_KEY = "casamorf-pin-session";
const LOCAL_PW_KEY = "casamorf-pw";

// ─── GitHub DB Layer (reads/writes raw JSON to repo) ───

class GitHubDB {
    constructor(token, repo) {
        this.token = token;
        this.repo = repo;
        this.sha = null;
        this.baseUrl = `https://api.github.com/repos/${repo}/contents/${GITHUB_FILE}`;
    }

    async read() {
        try {
            const res = await fetch(this.baseUrl, {
                headers: { Authorization: `Bearer ${this.token}`, Accept: "application/vnd.github.v3+json" },
                cache: "no-store",
            });
            if (res.status === 404) { console.log("DB read: file not found (404)"); return null; }
            if (!res.ok) throw new Error(`GitHub API ${res.status}`);
            const json = await res.json();
            this.sha = json.sha;
            console.log("DB read OK, SHA:", this.sha, "size:", json.size);
            // GitHub returns base64 with newlines — strip them
            const clean = json.content.replace(/\n/g, '').replace(/\r/g, '');
            const decoded = decodeURIComponent(escape(atob(clean)));
            console.log("DB decoded:", decoded.substring(0, 100));
            return JSON.parse(decoded);
        } catch (e) {
            console.error("DB read error:", e);
            return null;
        }
    }

    async write(data) {
        try {
            const body = {
                message: `CasaMorf update ${new Date().toISOString()}`,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
            };
            if (this.sha) body.sha = this.sha;

            let res = await fetch(this.baseUrl, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    Accept: "application/vnd.github.v3+json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            // SHA conflict or file already exists — fetch current SHA and retry
            if (res.status === 409 || res.status === 422) {
                console.warn("SHA conflict, re-reading...");
                await this.read();
                body.sha = this.sha;
                res = await fetch(this.baseUrl, {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        Accept: "application/vnd.github.v3+json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                });
            }

            if (!res.ok) {
                const errBody = await res.text();
                console.error(`GitHub write failed: ${res.status}`, errBody);
                return false;
            }

            const result = await res.json();
            this.sha = result.content.sha;
            console.log("GitHub write OK, new SHA:", this.sha);
            return true;
        } catch (e) {
            console.error("DB write error:", e);
            return false;
        }
    }
}

// ─── CasaStore: Encrypted storage on top of GitHubDB ───

const CasaStore = (() => {
    let _db = null;
    let _raw = null;      // Raw store.json content { pinHash, data }
    let _decrypted = null; // Decrypted app data
    let _aesKey = null;    // Derived AES key (from PIN)

    // --- GitHub credentials (localStorage, per device) ---

    function hasCredentials() {
        return !!(localStorage.getItem(LOCAL_TOKEN_KEY) && localStorage.getItem(LOCAL_REPO_KEY));
    }

    function getCredentials() {
        return { token: localStorage.getItem(LOCAL_TOKEN_KEY), repo: localStorage.getItem(LOCAL_REPO_KEY) };
    }

    function saveCredentials(token, repo) {
        localStorage.setItem(LOCAL_TOKEN_KEY, token);
        localStorage.setItem(LOCAL_REPO_KEY, repo);
    }

    function clearCredentials() {
        localStorage.removeItem(LOCAL_TOKEN_KEY);
        localStorage.removeItem(LOCAL_REPO_KEY);
        localStorage.removeItem(LOCAL_PW_KEY);
        sessionStorage.removeItem(LOCAL_PIN_KEY);
    }

    // --- Connect to GitHub and read raw store ---

    async function connect(token, repo) {
        console.log("CasaStore.connect:", repo);
        _db = new GitHubDB(token, repo);
        _raw = await _db.read();
        if (!_raw) {
            console.log("connect: no file on GitHub, starting fresh");
            _raw = { pinHash: null, data: null };
        } else if (!_raw.pinHash && !_raw.data) {
            console.log("connect: empty placeholder, SHA:", _db.sha);
            _raw = { pinHash: null, data: null };
        } else {
            console.log("connect: existing data found, pinHash:", !!_raw.pinHash, "data:", !!_raw.data);
        }
        return true;
    }

    function isConnected() { return _db !== null; }
    function hasPinSet() { 
        const r = !!(_raw && _raw.pinHash);
        console.log("hasPinSet:", r);
        return r;
    }

    // --- PIN verification and unlock ---

    async function verifyPin(pin) {
        const hash = await CasaCrypto.hashPin(pin);
        console.log("verifyPin:", hash === _raw.pinHash);
        return hash === _raw.pinHash;
    }

    async function unlock(pin) {
        console.log("unlock called, has data:", !!_raw.data);
        _aesKey = await CasaCrypto.deriveKey(pin);
        if (_raw.data) {
            try {
                const json = await CasaCrypto.decrypt(_raw.data, _aesKey);
                _decrypted = JSON.parse(json);
                console.log("unlock OK, members:", _decrypted.members?.length);
            } catch (e) {
                console.error("Decrypt failed:", e);
                _aesKey = null;
                return false;
            }
        } else {
            _decrypted = { household: null, members: [], items: [], tasks: [] };
            console.log("unlock: fresh start");
        }
        // Remember password locally so user doesn't have to re-enter
        localStorage.setItem(LOCAL_PW_KEY, pin);
        sessionStorage.setItem(LOCAL_PIN_KEY, "1");
        return true;
    }

    async function setPin(pin) {
        console.log("setPin called");
        _aesKey = await CasaCrypto.deriveKey(pin);
        _raw.pinHash = await CasaCrypto.hashPin(pin);
        if (!_decrypted) _decrypted = { household: null, members: [], items: [], tasks: [] };
        localStorage.setItem(LOCAL_PW_KEY, pin);
        sessionStorage.setItem(LOCAL_PIN_KEY, "1");
        const ok = await _save();
        console.log("setPin _save result:", ok);
    }

    function getSavedPassword() {
        return localStorage.getItem(LOCAL_PW_KEY);
    }

    function isSessionAuth() { return sessionStorage.getItem(LOCAL_PIN_KEY) === "1"; }

    // --- Data access (works on decrypted data) ---

    async function save(key, value) {
        if (!_decrypted) return;
        _decrypted[key] = value;
        await _save();
    }

    async function load(key, fallback = null) {
        if (!_decrypted) return fallback;
        return _decrypted[key] !== undefined ? _decrypted[key] : fallback;
    }

    async function saveAll(obj) {
        console.log("CasaStore.saveAll called, keys:", Object.keys(obj || {}));
        if (!_decrypted) { console.error("CasaStore.saveAll: _decrypted is null!"); return false; }
        Object.assign(_decrypted, obj);
        return await _save();
    }

    // Encrypt and write to GitHub
    async function _save() {
        console.log("_save called:", { db: !!_db, aesKey: !!_aesKey, decrypted: !!_decrypted });
        if (!_db) { console.error("_save aborted: no db connection"); return false; }
        if (!_aesKey) { console.error("_save aborted: no AES key (not unlocked?)"); return false; }
        if (!_decrypted) { console.error("_save aborted: no decrypted data"); return false; }
        try {
            const json = JSON.stringify(_decrypted);
            console.log("_save encrypting", json.length, "chars");
            const encrypted = await CasaCrypto.encrypt(json, _aesKey);
            console.log("_save encrypted, blob length:", encrypted.length);
            _raw.data = encrypted;
            console.log("_save writing to GitHub, pinHash:", _raw.pinHash ? "set" : "null");
            const result = await _db.write(_raw);
            console.log("_save write result:", result);
            return result;
        } catch (e) {
            console.error("_save error:", e);
            return false;
        }
    }

    // Pull latest from GitHub and re-decrypt
    async function refresh() {
        if (!_db) return false;
        _raw = await _db.read();
        if (_raw && _raw.data && _aesKey) {
            try {
                const json = await CasaCrypto.decrypt(_raw.data, _aesKey);
                _decrypted = JSON.parse(json);
            } catch (e) {
                console.error("Refresh decrypt failed:", e);
                return false;
            }
        }
        return true;
    }

    // Export decrypted data as JSON (local backup)
    function exportAll() {
        return JSON.stringify(_decrypted, null, 2);
    }

    return {
        hasCredentials, getCredentials, saveCredentials, clearCredentials,
        connect, isConnected, hasPinSet, verifyPin, unlock, setPin,
        isSessionAuth, getSavedPassword,
        save, load, saveAll, refresh, exportAll,
    };
})();
