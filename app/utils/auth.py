# Indian Law RAG Chatbot - Authentication Utilities
"""
JWT authentication and password hashing utilities.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from jose import jwt, JWTError
import bcrypt
import logging
import re
from typing import Tuple

from app.config import settings

logger = logging.getLogger(__name__)

# =============================================================================
# Password Hashing
# =============================================================================
def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password meets security requirements.
    
    Returns:
        (is_valid, error_message)
    """
    if len(password) < settings.password_min_length:
        return False, f"Password must be at least {settings.password_min_length} characters"
    
    if settings.password_require_uppercase and not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if settings.password_require_lowercase and not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if settings.password_require_digit and not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    if settings.password_require_special and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    # Check for common weak passwords
    weak_passwords = ['password', '12345678', 'qwerty', 'abc123', 'password123']
    if password.lower() in weak_passwords:
        return False, "Password is too common. Please choose a stronger password."
    
    return True, ""


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt with cost factor 12.
    
    Args:
        password: Plain text password
        
    Returns:
        str: Hashed password
        
    Viva Explanation:
    - BCrypt is a secure, slow hashing algorithm
    - Cost factor 12 = 2^12 iterations (4096)
    - Automatically handles salting
    - Resistant to rainbow table attacks
    """
    # Encode password to bytes
    password_bytes = password.encode('utf-8')
    # Generate salt with cost factor 12 and hash
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Stored hashed password
        
    Returns:
        bool: True if password matches
    """
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


# =============================================================================
# JWT Token Management
# =============================================================================
def create_access_token(
    subject: str | UUID,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.
    
    Args:
        subject: Token subject (typically user ID)
        expires_delta: Optional custom expiration time
        
    Returns:
        str: Encoded JWT token
        
    Viva Explanation:
    - JWT (JSON Web Token) contains encoded claims
    - Signed with secret key for verification
    - Self-contained: no database lookup needed for validation
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),  # Issued at (timezone-aware)
        "type": "access"
    }
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_secret_key, 
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT access token.
    
    Args:
        token: JWT token string
        
    Returns:
        dict: Token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError as e:
        logger.warning(f"JWT decode error: {e}")
        return None


def get_token_subject(token: str) -> Optional[str]:
    """
    Extract the subject (user ID) from a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        str: User ID if token is valid, None otherwise
    """
    payload = decode_access_token(token)
    if payload:
        return payload.get("sub")
    return None
