// ============================================================================
// CasaMorf — Client-side AES-256-GCM Encryption
// Data is encrypted before being written to GitHub.
// PIN serves as the passphrase for PBKDF2 key derivation.
// ============================================================================

const CasaCrypto = (() => {
    const SALT = "casamorf-v1-salt"; // Fixed app salt (not secret, just domain separation)
    const ITERATIONS = 310000;       // OWASP recommended for PBKDF2-SHA256

    async function deriveKey(pin) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            "raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]
        );
        return crypto.subtle.deriveKey(
            { name: "PBKDF2", salt: enc.encode(SALT), iterations: ITERATIONS, hash: "SHA-256" },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    // Encrypt plaintext → base64 string (iv prepended)
    async function encrypt(plaintext, key) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder();
        const ciphertext = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv }, key, enc.encode(plaintext)
        );
        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(ciphertext), iv.length);
        return btoa(String.fromCharCode(...combined));
    }

    // Decrypt base64 string → plaintext
    async function decrypt(base64, key) {
        const combined = new Uint8Array(
            atob(base64).split("").map(c => c.charCodeAt(0))
        );
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv }, key, ciphertext
        );
        return new TextDecoder().decode(decrypted);
    }

    // Hash PIN for verification (stored in cleartext in store.json)
    async function hashPin(pin) {
        const enc = new TextEncoder();
        const hash = await crypto.subtle.digest("SHA-256", enc.encode(pin + "casamorf-pin-verify"));
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
    }

    return { deriveKey, encrypt, decrypt, hashPin };
})();
