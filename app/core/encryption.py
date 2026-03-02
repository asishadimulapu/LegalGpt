# app/core/encryption.py
"""
Server-side encryption handler for E2EE implementation.
Uses Fernet (symmetric) and RSA (asymmetric) for defense-in-depth.

SECURITY PRINCIPLE: Server stores encrypted data but cannot decrypt user content.
Only metadata encryption/decryption happens server-side.
"""

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.backends import default_backend
from cryptography.fernet import Fernet
import os
import base64
import hmac
import hashlib
from typing import Tuple, Dict, Optional
from datetime import datetime, timedelta, timezone
from pathlib import Path
import logging
from uuid import UUID

logger = logging.getLogger(__name__)

# Constants
AES_KEY_SIZE = 32  # 256 bits
GCM_IV_SIZE = 12   # 96 bits (recommended for GCM)
GCM_TAG_SIZE = 16  # 128 bits
RSA_KEY_SIZE = 2048
PBKDF2_ITERATIONS = 100000


class ServerEncryptionManager:
    """
    Server-side encryption manager.
    
    CRITICAL SECURITY NOTES:
    - Server NEVER decrypts user chat messages/queries
    - This class only handles:
      1. Validation of encrypted payloads
      2. Encryption of server-side metadata
      3. Key wrapping/unwrapping for key exchange
      4. Secure storage operations
    """
    
    def __init__(self, encryption_key: Optional[str] = None):
        self.backend = default_backend()
        
        # Load encryption key from environment
        if encryption_key:
            self.metadata_key = base64.urlsafe_b64decode(encryption_key.encode())
        else:
            from app.config import settings
            if settings.encryption_key:
                self.metadata_key = base64.urlsafe_b64decode(
                    settings.encryption_key.encode()
                )
            else:
                logger.warning("No encryption key provided - generating ephemeral key")
                self.metadata_key = Fernet.generate_key()
        
        self.fernet = Fernet(base64.urlsafe_b64encode(self.metadata_key))
        self._load_or_generate_server_keys()
    
    def _load_or_generate_server_keys(self):
        """Load or generate server's RSA key pair for key wrapping."""
        key_dir = Path("keys")
        key_dir.mkdir(exist_ok=True, mode=0o700)
        
        private_key_path = key_dir / "server_private.pem"
        public_key_path = key_dir / "server_public.pem"
        
        if private_key_path.exists():
            # Load existing keys
            with open(private_key_path, "rb") as f:
                self.private_key = serialization.load_pem_private_key(
                    f.read(),
                    password=None,
                    backend=self.backend
                )
            with open(public_key_path, "rb") as f:
                self.public_key = serialization.load_pem_public_key(
                    f.read(),
                    backend=self.backend
                )
            logger.info("✓ Loaded existing server RSA keys")
        else:
            # Generate new key pair
            self.private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=RSA_KEY_SIZE,
                backend=self.backend
            )
            self.public_key = self.private_key.public_key()
            
            # Save keys securely
            with open(private_key_path, "wb") as f:
                f.write(self.private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                ))
            os.chmod(private_key_path, 0o600)
            
            with open(public_key_path, "wb") as f:
                f.write(self.public_key.public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo
                ))
            
            logger.info("✓ Generated new server RSA keys")
    
    def get_server_public_key(self) -> str:
        """Return server's public key in PEM format for clients."""
        return self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')
    
    def validate_encrypted_payload(
        self, 
        payload: Dict, 
        max_age_seconds: int = 300
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate encrypted payload structure and freshness.
        
        Args:
            payload: Dict with encrypted_content, iv, auth_tag, signature, etc.
            max_age_seconds: Maximum age of payload (default 5 minutes)
        
        Returns:
            (is_valid, error_message)
        """
        required_fields = [
            'encrypted_content', 'iv', 'auth_tag', 
            'algorithm', 'timestamp'
        ]
        
        # Check required fields
        for field in required_fields:
            if field not in payload:
                return False, f"Missing required field: {field}"
        
        # Validate algorithm
        if payload['algorithm'] not in ['AES-256-GCM']:
            return False, f"Unsupported algorithm: {payload['algorithm']}"
        
        # Validate timestamp (prevent replay attacks)
        # Use timezone-aware UTC datetimes to avoid local timezone issues
        try:
            ts = datetime.fromtimestamp(payload['timestamp'], tz=timezone.utc)
            now = datetime.now(timezone.utc)
            age = now - ts
            if age > timedelta(seconds=max_age_seconds):
                return False, "Timestamp too old (replay attack?)"
            if age < timedelta(seconds=-30):
                return False, "Timestamp in future (clock skew?)"
        except Exception as e:
            return False, f"Invalid timestamp: {e}"
        
        # Validate base64 encoding
        try:
            base64.b64decode(payload['encrypted_content'])
            base64.b64decode(payload['iv'])
            base64.b64decode(payload['auth_tag'])
        except Exception as e:
            return False, f"Invalid base64 encoding: {e}"
        
        return True, None
    
    def encrypt_metadata(self, data: str) -> str:
        """
        Encrypt server-side metadata using Fernet.
        Use ONLY for non-sensitive metadata (session IDs, timestamps, etc.)
        """
        return self.fernet.encrypt(data.encode()).decode()
    
    def decrypt_metadata(self, encrypted_data: str) -> str:
        """Decrypt server-side metadata."""
        try:
            return self.fernet.decrypt(encrypted_data.encode()).decode()
        except Exception as e:
            logger.error(f"Metadata decryption failed: {e}")
            raise ValueError("Invalid or corrupted metadata")
    
    def hash_for_indexing(self, plaintext: str) -> str:
        """
        Create searchable hash of content without storing plaintext.
        Uses HMAC-SHA256 for secure indexing.
        """
        return hmac.HMAC(
            self.metadata_key,
            plaintext.encode(),
            hashlib.sha256
        ).hexdigest()
    
    def secure_delete(self, data: bytearray) -> None:
        """
        Securely delete sensitive data from memory (best-effort).
        
        IMPORTANT: This only works for MUTABLE buffers (bytearray/memoryview).
        Python strings are immutable and cannot be reliably zeroed in memory.
        
        For sensitive string data:
        1. Convert to bytearray immediately after use
        2. Call this method to overwrite
        3. Delete the reference
        
        Args:
            data: A mutable bytearray to securely overwrite and delete.
                  Passing a str will have NO EFFECT on memory.
        
        Note: This is best-effort - Python's memory management and garbage
        collector may still retain copies. For true secure deletion, use
        dedicated secure memory libraries or avoid storing secrets in Python.
        """
        if data and isinstance(data, (bytearray, memoryview)):
            # Overwrite with zeros
            for i in range(len(data)):
                data[i] = 0
            # Overwrite with random bytes for added security
            import os
            random_bytes = os.urandom(len(data))
            for i in range(len(data)):
                data[i] = random_bytes[i]
            # Final zero pass
            for i in range(len(data)):
                data[i] = 0
            del data


# Global instance
_encryption_manager = None

def get_encryption_manager() -> ServerEncryptionManager:
    """Get or create global encryption manager instance."""
    global _encryption_manager
    if _encryption_manager is None:
        _encryption_manager = ServerEncryptionManager()
    return _encryption_manager


# Convenience functions
def validate_payload(payload: Dict) -> Tuple[bool, Optional[str]]:
    """Validate encrypted payload."""
    return get_encryption_manager().validate_encrypted_payload(payload)

def encrypt_metadata(data: str) -> str:
    """Encrypt metadata."""
    return get_encryption_manager().encrypt_metadata(data)

def decrypt_metadata(data: str) -> str:
    """Decrypt metadata."""
    return get_encryption_manager().decrypt_metadata(data)

def hash_for_search(text: str) -> str:
    """Create searchable hash."""
    return get_encryption_manager().hash_for_indexing(text)
