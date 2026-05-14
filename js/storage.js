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
            if (res.status === 404) return null;
            if (!res.ok) throw new Error(`GitHub API ${res.status}`);
            const json = await res.json();
            this.sha = json.sha;
            return JSON.parse(decodeURIComponent(escape(atob(json.content))));
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

            const res = await fetch(this.baseUrl, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    Accept: "application/vnd.github.v3+json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (res.status === 409 || res.status === 422) {
                await this.read();
                body.sha = this.sha;
                const retry = await fetch(this.baseUrl, {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        Accept: "application/vnd.github.v3+json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                });
                if (!retry.ok) throw new Error(`Retry failed: ${retry.status}`);
                this.sha = (await retry.json()).content.sha;
                return true;
            }

            if (!res.ok) throw new Error(`GitHub API ${res.status}`);
            this.sha = (await res.json()).content.sha;
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
        sessionStorage.removeItem(LOCAL_PIN_KEY);
    }

    // --- Connect to GitHub and read raw store ---

    async function connect(token, repo) {
        _db = new GitHubDB(token, repo);
        _raw = await _db.read();
        // First time: no file exists yet
        if (!_raw) _raw = { pinHash: null, data: null };
        return true;
    }

    function isConnected() { return _db !== null; }
    function hasPinSet() { return !!(_raw && _raw.pinHash); }

    // --- PIN verification and unlock ---

    async function verifyPin(pin) {
        const hash = await CasaCrypto.hashPin(pin);
        return hash === _raw.pinHash;
    }

    async function unlock(pin) {
        _aesKey = await CasaCrypto.deriveKey(pin);
        // Try to decrypt existing data
        if (_raw.data) {
            try {
                const json = await CasaCrypto.decrypt(_raw.data, _aesKey);
                _decrypted = JSON.parse(json);
            } catch (e) {
                console.error("Decrypt failed — wrong PIN?", e);
                _aesKey = null;
                return false;
            }
        } else {
            // Fresh start
            _decrypted = { household: null, members: [], items: [], tasks: [] };
        }
        sessionStorage.setItem(LOCAL_PIN_KEY, "1");
        return true;
    }

    async function setPin(pin) {
        _aesKey = await CasaCrypto.deriveKey(pin);
        _raw.pinHash = await CasaCrypto.hashPin(pin);
        if (!_decrypted) _decrypted = { household: null, members: [], items: [], tasks: [] };
        sessionStorage.setItem(LOCAL_PIN_KEY, "1");
        await _save();
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
        if (!_decrypted) return;
        Object.assign(_decrypted, obj);
        await _save();
    }

    // Encrypt and write to GitHub
    async function _save() {
        if (!_db || !_aesKey || !_decrypted) return false;
        const encrypted = await CasaCrypto.encrypt(JSON.stringify(_decrypted), _aesKey);
        _raw.data = encrypted;
        return await _db.write(_raw);
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
        isSessionAuth,
        save, load, saveAll, refresh, exportAll,
    };
})();
