// ============================================================================
// CasaMorf — Encrypted Storage Layer
// Wraps localStorage with AES-256-GCM encryption.
// All data is encrypted before storage and decrypted on read.
// Safe to sync to a public GitHub repo as JSON export.
// ============================================================================

const CasaStore = (() => {
    const PREFIX = 'casamorf_';
    let _key = null; // AES-GCM key derived from passphrase

    function isUnlocked() {
        return _key !== null;
    }

    async function unlock(passphrase) {
        _key = await CasaCrypto.deriveKey(passphrase);
        // Store passphrase hash for verification on next load
        const hash = await CasaCrypto.hashPassphrase(passphrase);
        localStorage.setItem(PREFIX + 'keyhash', hash);
        return true;
    }

    async function verifyPassphrase(passphrase) {
        const stored = localStorage.getItem(PREFIX + 'keyhash');
        if (!stored) return true; // First time, any passphrase is valid
        const hash = await CasaCrypto.hashPassphrase(passphrase);
        return hash === stored;
    }

    function lock() {
        _key = null;
    }

    function hasData() {
        return localStorage.getItem(PREFIX + 'keyhash') !== null;
    }

    // Save an object under a key (encrypted)
    async function save(key, data) {
        if (!_key) throw new Error('Storage locked');
        const json = JSON.stringify(data);
        const encrypted = await CasaCrypto.encrypt(json, _key);
        localStorage.setItem(PREFIX + key, encrypted);
    }

    // Load an object by key (decrypted)
    async function load(key, fallback = null) {
        if (!_key) return fallback;
        const encrypted = localStorage.getItem(PREFIX + key);
        if (!encrypted) return fallback;
        try {
            const json = await CasaCrypto.decrypt(encrypted, _key);
            return JSON.parse(json);
        } catch {
            return fallback;
        }
    }

    // Remove a key
    function remove(key) {
        localStorage.removeItem(PREFIX + key);
    }

    // Export all encrypted data as JSON (for GitHub sync)
    function exportAll() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k.startsWith(PREFIX)) {
                data[k] = localStorage.getItem(k);
            }
        }
        return JSON.stringify(data, null, 2);
    }

    // Import encrypted JSON (from GitHub sync)
    function importAll(json) {
        const data = JSON.parse(json);
        for (const [k, v] of Object.entries(data)) {
            if (k.startsWith(PREFIX)) {
                localStorage.setItem(k, v);
            }
        }
    }

    // Clear all CasaMorf data
    function clearAll() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k.startsWith(PREFIX)) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
    }

    return { isUnlocked, unlock, lock, verifyPassphrase, hasData, save, load, remove, exportAll, importAll, clearAll };
})();
