"""
Per-user message encryption utility for E2EE at rest.

Every user gets a unique Fernet key derived from their user-id and the
server's ``encryption_key`` via HKDF.  Chat messages, session titles and
query-log entries are encrypted before being persisted so that:
  - The database stores only ciphertext.
  - Only the owning user's API endpoints ever call ``decrypt_for_user``.
  - Admin endpoints return a "[E2E Encrypted]" placeholder instead.

The approach is deterministic per (user_id, server_secret) pair, so the
same key is re-derived every time — no extra key-storage table needed.
"""

import base64
import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

from app.config import settings

logger = logging.getLogger(__name__)

# Prefix prepended to every ciphertext so we can distinguish encrypted
# values from legacy plaintext rows during the migration period.
_ENC_PREFIX = "enc::"


def _get_encryption_secret() -> str:
    """Return the encryption secret, raising if not configured."""
    secret = settings.encryption_key
    if not secret:
        raise RuntimeError(
            "ENCRYPTION_KEY is not configured. "
            "Set the ENCRYPTION_KEY environment variable to enable E2EE."
        )
    return secret


def _derive_user_key(user_id: str) -> bytes:
    """Derive a 32-byte Fernet-compatible key unique to *user_id*."""
    secret = _get_encryption_secret()
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"lawgpt-e2ee-v1",
        info=f"user-msg-{user_id}".encode(),
    )
    raw = hkdf.derive(secret.encode())
    return base64.urlsafe_b64encode(raw)


def encrypt_for_user(plaintext: str, user_id) -> str:
    """Encrypt *plaintext* with *user_id*'s derived key.

    Returns a string prefixed with ``enc::`` followed by the Fernet token.
    """
    if not plaintext:
        return plaintext
    key = _derive_user_key(str(user_id))
    token = Fernet(key).encrypt(plaintext.encode()).decode()
    return f"{_ENC_PREFIX}{token}"


def decrypt_for_user(ciphertext: str, user_id) -> str:
    """Decrypt *ciphertext* previously encrypted with :func:`encrypt_for_user`.

    If the value is **not** prefixed with ``enc::`` it is returned verbatim
    (legacy plaintext row).
    """
    if not ciphertext:
        return ciphertext
    if not ciphertext.startswith(_ENC_PREFIX):
        # Legacy plaintext — return as-is
        return ciphertext
    token = ciphertext[len(_ENC_PREFIX):]
    try:
        key = _derive_user_key(str(user_id))
        return Fernet(key).decrypt(token.encode()).decode()
    except InvalidToken:
        logger.warning("Message decryption failed (invalid token)")
        return "[Decryption failed]"
    except Exception:
        logger.warning("Message decryption failed (unexpected error)")
        return "[Decryption failed]"


def is_encrypted(value: Optional[str]) -> bool:
    """Check whether *value* was encrypted by this module."""
    return bool(value and value.startswith(_ENC_PREFIX))


# ── Contact-form encryption (uses server-level key, no user) ─────────
def _server_fernet() -> Fernet:
    secret = _get_encryption_secret()
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"lawgpt-contact-v1",
        info=b"contact-form",
    )
    raw = hkdf.derive(secret.encode())
    return Fernet(base64.urlsafe_b64encode(raw))


def encrypt_contact(plaintext: str) -> str:
    """Encrypt contact-form content with a server-level key."""
    if not plaintext:
        return plaintext
    token = _server_fernet().encrypt(plaintext.encode()).decode()
    return f"{_ENC_PREFIX}{token}"


def decrypt_contact(ciphertext: str) -> Optional[str]:
    """Decrypt contact-form content. Returns None on failure."""
    if not ciphertext or not ciphertext.startswith(_ENC_PREFIX):
        return ciphertext
    token = ciphertext[len(_ENC_PREFIX):]
    try:
        return _server_fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        logger.warning("Contact decryption failed (invalid token)")
        return None
    except Exception:
        logger.warning("Contact decryption failed (unexpected error)")
        return None
