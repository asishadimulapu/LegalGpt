/**
 * E2EE Utility — Web Crypto API wrapper for client-side encryption.
 *
 * Key hierarchy:
 *   1. On first login a random 256-bit AES-GCM key is generated.
 *   2. The raw key bytes are stored in localStorage (base64-encoded).
 *   3. Messages are encrypted client-side before being sent to the server.
 *   4. Only the owning browser can decrypt stored chat history.
 *
 * NOTE: The RAG pipeline requires the server to read the plaintext query in
 * order to retrieve relevant documents and generate a response.  Therefore
 * the *query itself* is sent in the clear — but the stored copy in the DB
 * is encrypted server-side with a per-user key.  This client-side module
 * provides an additional layer for any data the frontend chooses to
 * encrypt/decrypt locally (e.g. cached messages, contact form body).
 */

const STORAGE_KEY = 'lawgpt_e2ee_key';
const ALGO = 'AES-GCM';

/* ── Key Management ───────────────────────────────── */

/**
 * Generate a new AES-256-GCM CryptoKey.
 * @returns {Promise<CryptoKey>}
 */
export async function generateEncryptionKey() {
  return crypto.subtle.generateKey(
    { name: ALGO, length: 256 },
    true,           // extractable — so we can export to localStorage
    ['encrypt', 'decrypt'],
  );
}

/**
 * Export a CryptoKey to a base64 string for localStorage persistence.
 * @param {CryptoKey} key
 * @returns {Promise<string>}
 */
export async function exportKey(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

/**
 * Import a base64 string back into a CryptoKey.
 * @param {string} b64
 * @returns {Promise<CryptoKey>}
 */
export async function importKey(b64) {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: ALGO, length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Persist the encryption key in localStorage.
 * @param {CryptoKey} key
 */
export async function storeKey(key) {
  const b64 = await exportKey(key);
  localStorage.setItem(STORAGE_KEY, b64);
}

/**
 * Load the encryption key from localStorage, or generate + store a new one.
 * @returns {Promise<CryptoKey>}
 */
export async function loadOrCreateKey() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return importKey(stored);
  }
  const key = await generateEncryptionKey();
  await storeKey(key);
  return key;
}

/**
 * Check whether an encryption key currently exists in localStorage.
 * @returns {boolean}
 */
export function hasStoredKey() {
  return !!localStorage.getItem(STORAGE_KEY);
}

/* ── Encrypt / Decrypt ────────────────────────────── */

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * @param {string} plaintext
 * @param {CryptoKey} key
 * @returns {Promise<string>} base64-encoded "iv:ciphertext"
 */
export async function encryptMessage(plaintext, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    encoded,
  );
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(cipherBuf)));
  return `${ivB64}:${ctB64}`;
}

/**
 * Decrypt a previously encrypted string.
 * @param {string} payload  base64-encoded "iv:ciphertext"
 * @param {CryptoKey} key
 * @returns {Promise<string>} plaintext
 */
export async function decryptMessage(payload, key) {
  const [ivB64, ctB64] = payload.split(':');
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));
  const plainBuf = await crypto.subtle.decrypt(
    { name: ALGO, iv },
    key,
    ct,
  );
  return new TextDecoder().decode(plainBuf);
}

/* ── Helpers ──────────────────────────────────────── */

/**
 * Check whether a value looks like it was encrypted by the server-side
 * E2EE layer (prefixed with "enc::" or the lock emoji).
 * @param {string} value
 * @returns {boolean}
 */
export function isServerEncrypted(value) {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith('enc::') || value.startsWith('🔒');
}
