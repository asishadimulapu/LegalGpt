/**
 * Client-Side End-to-End Encryption Module
 * Uses Web Crypto API for secure cryptographic operations
 * 
 * SECURITY PRINCIPLES:
 * - Master key NEVER leaves the device
 * - All encryption happens in browser
 * - Server cannot decrypt user data
 * 
 * @module encryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // bits
const PBKDF2_ITERATIONS = 100000;

/**
 * Generate a cryptographically secure random key
 * @returns {Promise<CryptoKey>} AES-GCM key
 */
export async function generateMasterKey() {
    return await window.crypto.subtle.generateKey(
        {
            name: ALGORITHM,
            length: KEY_LENGTH,
        },
        true, // extractable
        ['encrypt', 'decrypt']
    );
}

/**
 * Derive encryption key from password using PBKDF2
 * @param {string} password - User password
 * @param {Uint8Array} salt - Salt (16 bytes) - REQUIRED for repeatable key derivation
 * @returns {Promise<CryptoKey>} Derived key
 * @throws {Error} If salt is not provided
 */
export async function deriveKeyFromPassword(password, salt) {
    // Salt is REQUIRED for repeatable key derivation
    // Callers MUST generate a salt when encrypting and store it alongside ciphertext
    // The same salt MUST be provided when decrypting
    if (!salt || !(salt instanceof Uint8Array) || salt.length < 16) {
        throw new Error(
            'Salt is required for key derivation. ' +
            'Generate with: window.crypto.getRandomValues(new Uint8Array(16)) ' +
            'and store alongside encrypted data for decryption.'
        );
    }
    
    const encoder = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,  // Salt is now required, no fallback
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        passwordKey,
        { name: ALGORITHM, length: KEY_LENGTH },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt text using AES-GCM
 * @param {string} plaintext - Text to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<Object>} {ciphertext, iv, authTag, algorithm, timestamp}
 */
export async function encryptText(plaintext, key) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Encrypt (GCM produces ciphertext + auth tag)
    const encrypted = await window.crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            iv: iv,
            tagLength: TAG_LENGTH,
        },
        key,
        data
    );
    
    // GCM appends auth tag to ciphertext
    const encryptedArray = new Uint8Array(encrypted);
    const authTag = encryptedArray.slice(-16); // Last 16 bytes
    const ciphertext = encryptedArray.slice(0, -16);
    
    return {
        encrypted_content: arrayBufferToBase64(ciphertext),
        iv: arrayBufferToBase64(iv),
        auth_tag: arrayBufferToBase64(authTag),
        algorithm: ALGORITHM,
        timestamp: Math.floor(Date.now() / 1000)
    };
}

/**
 * Decrypt text using AES-GCM
 * @param {Object} encryptedData - Encrypted payload
 * @param {CryptoKey} key - Decryption key
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decryptText(encryptedData, key) {
    try {
        const ciphertext = base64ToArrayBuffer(encryptedData.encrypted_content);
        const iv = base64ToArrayBuffer(encryptedData.iv);
        const authTag = base64ToArrayBuffer(encryptedData.auth_tag);
        
        // Combine ciphertext and auth tag
        const combined = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
        combined.set(new Uint8Array(ciphertext), 0);
        combined.set(new Uint8Array(authTag), ciphertext.byteLength);
        
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: ALGORITHM,
                iv: iv,
                tagLength: TAG_LENGTH,
            },
            key,
            combined
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Failed to decrypt data. Invalid key or corrupted data.');
    }
}

/**
 * Sign data using HMAC-SHA256
 * @param {Object} data - Data to sign
 * @param {CryptoKey} signingKey - HMAC key
 * @returns {Promise<string>} Base64 signature
 */
export async function signData(data, signingKey) {
    const encoder = new TextEncoder();
    const signature = await window.crypto.subtle.sign(
        'HMAC',
        signingKey,
        encoder.encode(JSON.stringify(data))
    );
    return arrayBufferToBase64(signature);
}

/**
 * Store encryption key securely in IndexedDB
 * @param {string} keyName - Key identifier
 * @param {CryptoKey} key - Key to store
 */
export async function storeKeySecurely(keyName, key) {
    const db = await openKeysDB();
    const exportedKey = await window.crypto.subtle.exportKey('jwk', key);
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['keys'], 'readwrite');
        const store = transaction.objectStore('keys');
        const request = store.put({ name: keyName, key: exportedKey });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Retrieve key from IndexedDB
 * @param {string} keyName - Key identifier
 * @returns {Promise<CryptoKey|null>}
 */
export async function retrieveKeySecurely(keyName) {
    const db = await openKeysDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['keys'], 'readonly');
        const store = transaction.objectStore('keys');
        const request = store.get(keyName);
        
        request.onsuccess = async () => {
            if (request.result) {
                const key = await window.crypto.subtle.importKey(
                    'jwk',
                    request.result.key,
                    { name: ALGORITHM, length: KEY_LENGTH },
                    true,
                    ['encrypt', 'decrypt']
                );
                resolve(key);
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Open IndexedDB for key storage
 */
function openKeysDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('NyayaSahayKeys', 1);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('keys')) {
                db.createObjectStore('keys', { keyPath: 'name' });
            }
        };
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Helper: ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * Helper: Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Clear all stored keys (on logout)
 */
export async function clearAllKeys() {
    const db = await openKeysDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['keys'], 'readwrite');
        const store = transaction.objectStore('keys');
        const request = store.clear();
        
        request.onsuccess = () => {
            console.log('All encryption keys cleared');
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Initialize encryption for user
 * Called during registration or first login
 * @param {string} password - User password
 * @returns {Promise<Object>} {salt}
 */
export async function initializeUserEncryption(password) {
    // Generate salt
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    
    // Derive master key from password
    const masterKey = await deriveKeyFromPassword(password, salt);
    
    // Store key securely
    await storeKeySecurely('master_key', masterKey);
    
    // Store salt in localStorage (not sensitive)
    localStorage.setItem('encryption_salt', arrayBufferToBase64(salt));
    
    console.log('✓ User encryption initialized');
    
    return {
        salt: arrayBufferToBase64(salt)
    };
}

/**
 * Load user's encryption key
 * @param {string} password - User password
 * @returns {Promise<CryptoKey>}
 */
export async function loadUserKey(password) {
    // Try to load existing key
    let key = await retrieveKeySecurely('master_key');
    
    if (!key) {
        // Derive from password
        const saltB64 = localStorage.getItem('encryption_salt');
        if (!saltB64) {
            throw new Error('Encryption not initialized. Please re-login.');
        }
        
        const salt = base64ToArrayBuffer(saltB64);
        key = await deriveKeyFromPassword(password, salt);
        await storeKeySecurely('master_key', key);
    }
    
    return key;
}

/**
 * Check if encryption is enabled
 * @returns {Promise<boolean>}
 */
export async function isEncryptionEnabled() {
    const key = await retrieveKeySecurely('master_key');
    return key !== null;
}
