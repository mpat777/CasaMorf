// ============================================================================
// CasaMorf — Client-side AES-256-GCM Encryption
// All data stored locally (or synced to a public repo) is encrypted
// with a passphrase-derived key using Web Crypto API.
// ============================================================================

const CasaCrypto = (() => {
    const SALT_KEY = 'casamorf_salt';
    const ITERATIONS = 310000; // OWASP recommended for PBKDF2-SHA256

    // Generate or retrieve a persistent salt
    function getSalt() {
        let saltHex = localStorage.getItem(SALT_KEY);
        if (!saltHex) {
            const salt = crypto.getRandomValues(new Uint8Array(16));
            saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
            localStorage.setItem(SALT_KEY, saltHex);
        }
        return new Uint8Array(saltHex.match(/.{2}/g).map(h => parseInt(h, 16)));
    }

    // Derive AES-256-GCM key from passphrase
    async function deriveKey(passphrase) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: getSalt(), iterations: ITERATIONS, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // Encrypt plaintext → base64 string (iv + ciphertext)
    async function encrypt(plaintext, key) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder();
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            enc.encode(plaintext)
        );
        // Prepend IV to ciphertext
        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(ciphertext), iv.length);
        return btoa(String.fromCharCode(...combined));
    }

    // Decrypt base64 string → plaintext
    async function decrypt(base64, key) {
        const combined = new Uint8Array(
            atob(base64).split('').map(c => c.charCodeAt(0))
        );
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );
        return new TextDecoder().decode(decrypted);
    }

    // Quick hash for passphrase verification
    async function hashPassphrase(passphrase) {
        const enc = new TextEncoder();
        const hash = await crypto.subtle.digest('SHA-256', enc.encode(passphrase + 'casamorf'));
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    return { deriveKey, encrypt, decrypt, hashPassphrase };
})();
