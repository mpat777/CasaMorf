// ============================================================================
// CasaMorf — GitHub-based Shared Storage Layer
// Same architecture as evChargeTracker: data stored as JSON
// in the repo via GitHub API. All devices share one data file.
// ============================================================================

const GITHUB_FILE = "data/store.json";
const LOCAL_TOKEN_KEY = "casamorf-gh-token";
const LOCAL_REPO_KEY = "casamorf-gh-repo";
const LOCAL_PIN_KEY = "casamorf-pin-session";

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
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    Accept: "application/vnd.github.v3+json",
                },
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

            // SHA conflict — re-read and retry once
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

// ─── CasaStore: App-level storage interface ───

const CasaStore = (() => {
    let _db = null;
    let _data = null;
    let _pinHash = null;

    async function hashPin(pin) {
        const enc = new TextEncoder();
        const hash = await crypto.subtle.digest("SHA-256", enc.encode(pin + "casamorf-salt"));
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
    }

    function hasCredentials() {
        return !!(localStorage.getItem(LOCAL_TOKEN_KEY) && localStorage.getItem(LOCAL_REPO_KEY));
    }

    function getCredentials() {
        return {
            token: localStorage.getItem(LOCAL_TOKEN_KEY),
            repo: localStorage.getItem(LOCAL_REPO_KEY),
        };
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

    async function connect(token, repo) {
        _db = new GitHubDB(token, repo);
        _data = await _db.read();
        if (!_data) {
            _data = { pinHash: null, household: null, members: [], items: [], tasks: [] };
        }
        _pinHash = _data.pinHash || null;
        return true;
    }

    function isConnected() { return _db !== null && _data !== null; }
    function hasPinSet() { return !!_pinHash; }

    async function verifyPin(pin) {
        return (await hashPin(pin)) === _pinHash;
    }

    async function setPin(pin) {
        _pinHash = await hashPin(pin);
        _data.pinHash = _pinHash;
        await _save();
    }

    function setSessionAuth() { sessionStorage.setItem(LOCAL_PIN_KEY, "1"); }
    function isSessionAuth() { return sessionStorage.getItem(LOCAL_PIN_KEY) === "1"; }

    async function save(key, value) {
        if (!_data) return;
        _data[key] = value;
        await _save();
    }

    async function load(key, fallback = null) {
        if (!_data) return fallback;
        return _data[key] !== undefined ? _data[key] : fallback;
    }

    async function saveAll(obj) {
        if (!_data) return;
        Object.assign(_data, obj);
        await _save();
    }

    async function _save() {
        if (!_db || !_data) return false;
        return await _db.write(_data);
    }

    async function refresh() {
        if (!_db) return false;
        _data = await _db.read();
        if (_data) _pinHash = _data.pinHash || null;
        return !!_data;
    }

    function exportAll() {
        return JSON.stringify(_data, null, 2);
    }

    return {
        hasCredentials, getCredentials, saveCredentials, clearCredentials,
        connect, isConnected, hasPinSet, verifyPin, setPin,
        setSessionAuth, isSessionAuth,
        save, load, saveAll, refresh, exportAll,
    };
})();
