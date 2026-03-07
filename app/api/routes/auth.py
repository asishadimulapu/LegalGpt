# Indian Law RAG Chatbot - Authentication Routes
"""
User authentication endpoints for registration and login.
Includes password strength validation and audit logging.

PRODUCTION NOTES:
- Database connection errors are handled gracefully with retry messaging
- Audit logs use force_commit for independent transactions
- Connection pool starvation is mitigated via proper session lifecycle
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, OperationalError, IntegrityError

from app.db.database import get_db
from app.db.crud import UserCRUD
from app.schemas.user import UserCreate, UserLogin, UserResponse, AdminUserResponse, Token, ForgotPasswordRequest
from app.utils.auth import create_access_token, create_refresh_token, validate_password_strength
from app.utils.audit import AuditLogger
from app.utils.logging_config import get_logger


import json
import os
import base64
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlencode

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Temporary cache for mobile auth code exchange
# Uses Redis when available (multi-worker safe); falls back to in-memory dict.
_TEMP_AUTH_CODES_MAX_SIZE = 100  # Limit for in-memory fallback
_TEMP_AUTH_CODE_TTL = 60  # seconds
temp_auth_codes = {}  # fallback dict
_temp_auth_codes_lock = asyncio.Lock()

# Redis key prefix for temp auth codes
_REDIS_AUTH_PREFIX = "temp_auth:"
# Redis key prefix for OAuth state CSRF tokens
_REDIS_OAUTH_STATE_PREFIX = "oauth_state:"
_OAUTH_STATE_TTL = 600  # 10 minutes
# In-memory fallback for OAuth states
_oauth_states: dict[str, float] = {}
_oauth_states_lock = asyncio.Lock()


async def _cleanup_expired_temp_auth_codes():
    """Remove expired entries from the in-memory fallback dict."""
    async with _temp_auth_codes_lock:
        now = datetime.now(timezone.utc)
        expired_keys = [k for k, v in list(temp_auth_codes.items()) if now > v.get("expires_at", now)]
        for k in expired_keys:
            temp_auth_codes.pop(k, None)


async def _store_temp_auth_code(code: str, data: dict):
    """
    Store a transfer code in Redis (preferred) or in-memory dict (fallback).
    Redis entries use a TTL so they expire automatically.
    """
    from app.utils.redis_client import get_redis

    redis = await get_redis()
    if redis:
        import json as _json
        # Serialise the value; AdminUserResponse → dict
        serialisable = {
            "access_token": data["access_token"],
            "user": data["user"].model_dump(mode="json") if hasattr(data["user"], "model_dump") else data["user"].__dict__,
        }
        await redis.setex(f"{_REDIS_AUTH_PREFIX}{code}", _TEMP_AUTH_CODE_TTL, _json.dumps(serialisable))
        return

    # ── In-memory fallback ──
    async with _temp_auth_codes_lock:
        if len(temp_auth_codes) >= _TEMP_AUTH_CODES_MAX_SIZE:
            now = datetime.now(timezone.utc)
            expired_keys = [k for k, v in list(temp_auth_codes.items()) if now > v.get("expires_at", now)]
            for k in expired_keys:
                temp_auth_codes.pop(k, None)
        if len(temp_auth_codes) >= _TEMP_AUTH_CODES_MAX_SIZE:
            evict_key = min(temp_auth_codes, key=lambda k: temp_auth_codes[k].get("expires_at", datetime.now(timezone.utc)))
            temp_auth_codes.pop(evict_key, None)
        temp_auth_codes[code] = data


async def _get_and_delete_temp_auth_code(code: str) -> dict | None:
    """
    Retrieve and atomically delete a transfer code (one-time use).
    Checks Redis first, then falls back to in-memory dict.
    """
    from app.utils.redis_client import get_redis
    import json as _json

    redis = await get_redis()
    if redis:
        key = f"{_REDIS_AUTH_PREFIX}{code}"
        raw = await redis.getdel(key)
        if raw:
            return _json.loads(raw)
        return None

    # ── In-memory fallback ──
    async with _temp_auth_codes_lock:
        code_data = temp_auth_codes.pop(code, None)
    if code_data and datetime.now(timezone.utc) > code_data.get("expires_at", datetime.min.replace(tzinfo=timezone.utc)):
        return None  # expired
    return code_data


# ── OAuth state CSRF helpers ──────────────────────────────────────────────

async def _store_oauth_state(state: str) -> None:
    """Store an OAuth state token in Redis (preferred) or in-memory."""
    from app.utils.redis_client import get_redis

    redis = await get_redis()
    if redis:
        await redis.setex(f"{_REDIS_OAUTH_STATE_PREFIX}{state}", _OAUTH_STATE_TTL, "1")
        return

    async with _oauth_states_lock:
        # Prune expired entries lazily
        now = datetime.now(timezone.utc).timestamp()
        expired = [k for k, exp in _oauth_states.items() if now > exp]
        for k in expired:
            _oauth_states.pop(k, None)
        _oauth_states[state] = now + _OAUTH_STATE_TTL


async def _verify_and_consume_oauth_state(state: str) -> bool:
    """
    Verify an OAuth state token exists and delete it (one-time use).
    Returns True if valid, False otherwise.
    """
    from app.utils.redis_client import get_redis

    # Extract the random part for lookup. State formats:
    #   - plain random: "abc..."
    #   - mobile prefix: "mobile_abc..."
    #   - mobile with redirect: "mobile.<b64>.<random>"
    # We store the FULL state string, so look it up as-is.

    redis = await get_redis()
    if redis:
        key = f"{_REDIS_OAUTH_STATE_PREFIX}{state}"
        result = await redis.getdel(key)
        return result is not None

    async with _oauth_states_lock:
        if state in _oauth_states:
            exp = _oauth_states.pop(state)
            return datetime.now(timezone.utc).timestamp() <= exp
    return False


# Fallback audit log directory
_FALLBACK_AUDIT_DIR = Path("logs/fallback_audit")
_FALLBACK_AUDIT_DIR.mkdir(parents=True, exist_ok=True)


def _write_fallback_audit_log(
    payload: dict,
    original_error: str,
    audit_error: str
) -> None:
    """
    Write audit log to a fallback file when DB is unreachable.
    Uses a rotating file approach with date-based naming.
    """
    try:
        timestamp = datetime.now(timezone.utc).isoformat()
        fallback_entry = {
            "timestamp": timestamp,
            "payload": payload,
            "original_db_error": original_error,
            "audit_write_error": audit_error
        }
        
        # Date-based file rotation
        filename = f"audit_fallback_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.jsonl"
        filepath = _FALLBACK_AUDIT_DIR / filename
        
        with open(filepath, "a", encoding="utf-8") as f:
            f.write(json.dumps(fallback_entry) + "\n")
        
        logger.warning(f"Audit log written to fallback file: {filepath}")
    except Exception as fallback_error:
        # Last resort: log to application logs
        logger.critical(
            f"CRITICAL: Failed to write fallback audit log. "
            f"Payload: {payload}, Original error: {original_error}, "
            f"Audit error: {audit_error}, Fallback error: {fallback_error}"
        )


# =============================================================================
# SECURITY NOTE: IP Extraction for Audit Logging Only
# =============================================================================
# This function is ONLY for audit logging purposes and assumes requests come
# through a trusted reverse proxy (Nginx, Azure App Gateway, etc.).
# 
# DO NOT use this for rate limiting or security decisions - use the
# RateLimitMiddleware which validates proxy headers via TRUSTED_PROXIES config.
# 
# For production, ensure:
# 1. Uvicorn runs with --proxy-headers and --forwarded-allow-ips set
# 2. Only trusted proxies can reach the application directly
# =============================================================================
def get_client_ip(request: Request) -> str:
    """
    Extract client IP from request for AUDIT LOGGING ONLY.
    
    WARNING: This trusts X-Forwarded-For unconditionally and should NOT be
    used for rate limiting or access control. See RateLimitMiddleware for
    secure IP extraction with proxy validation.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    request: Request,
    db: Session = Depends(get_db)
) -> UserResponse:
    """
    Register a new user with strong password requirements.
    
    Args:
        user_data: User registration data
        request: Request object for audit logging
        db: Database session
        
    Returns:
        UserResponse: Created user profile
        
    Raises:
        HTTPException: 400 if email already registered or password weak
        HTTPException: 503 if database connection fails
    """
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent")
    
    # Validate password strength (no DB required)
    is_valid, error_msg = validate_password_strength(user_data.password)
    if not is_valid:
        # Use force_commit for independent transaction
        AuditLogger.log_event(
            db=db,
            event_type="registration_failed",
            event_category="authentication",
            severity="warning",
            ip_address=client_ip,
            user_agent=user_agent,
            details={"email": user_data.email, "reason": "weak_password"},
            success=False,
            force_commit=True  # Independent transaction
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    try:
        # Check if user already exists
        existing_user = UserCRUD.get_by_email(db, user_data.email)
        if existing_user:
            AuditLogger.log_failed_authentication(
                db=db,
                email=user_data.email,
                ip_address=client_ip,
                user_agent=user_agent,
                reason="email_already_exists"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        user = UserCRUD.create(db, user_data)
        
        # Send email verification
        try:
            await _send_verification_email(user, db)
        except Exception as verif_err:
            logger.warning(f"Failed to send verification email: {verif_err}")
        
        # Log successful registration (independent transaction for reliability)
        AuditLogger.log_event(
            db=db,
            event_type="registration_success",
            event_category="authentication",
            severity="info",
            user_id=user.id,
            ip_address=client_ip,
            user_agent=user_agent,
            success=True,
            force_commit=True  # Ensure audit log persists
        )
        
        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            created_at=user.created_at
        )
        
    except IntegrityError:
        # Race condition: user was created between check and insert
        logger.warning(f"Race condition on registration: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    except OperationalError as e:
        # Database connection error
        logger.error(f"Database connection error during registration: {e}")
        
        # Attempt audit logging with fallback to file if DB is unreachable
        audit_payload = {
            "event_type": "registration_db_error",
            "event_category": "system",
            "severity": "critical",
            "ip_address": client_ip,
            "user_agent": user_agent,
            "email": user_data.email,
            "error": str(e)[:200],
            "success": False
        }
        try:
            AuditLogger.log_event(
                db=db,
                event_type="registration_db_error",
                event_category="system",
                severity="critical",
                ip_address=client_ip,
                user_agent=user_agent,
                details={"email": user_data.email, "error": str(e)[:200]},
                success=False,
                force_commit=True
            )
        except Exception as audit_error:
            # Fallback: Write to rotating file when DB is unreachable
            _write_fallback_audit_log(audit_payload, original_error=str(e), audit_error=str(audit_error))
        
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable. Please try again.",
            headers={"Retry-After": "5"}
        )
        
    except SQLAlchemyError as e:
        # Other database errors
        logger.error(f"Database error during registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again."
        )


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    request: Request,
    db: Session = Depends(get_db)
) -> Token:
    """
    Authenticate user and return JWT token.
    Sets an HttpOnly cookie for web clients and returns the token in the
    response body for mobile / programmatic clients.
    """
    from fastapi.responses import JSONResponse
    from app.utils.cookies import set_auth_cookie
    # Authenticate user
    user = UserCRUD.authenticate(db, credentials.email, credentials.password)
    
    if not user:
        # Log failed authentication
        AuditLogger.log_failed_authentication(
            db=db,
            email=credentials.email,
            ip_address=get_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
            reason="invalid_credentials"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not user.is_active:
        # Log attempted login to inactive account
        AuditLogger.log_event(
            db=db,
            event_type="inactive_account_login",
            event_category="authentication",
            severity="warning",
            user_id=user.id,
            ip_address=get_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
            success=False
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    # Block unverified email accounts (OAuth users are auto-verified)
    if not user.email_verified and user.auth_provider == "email":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before signing in. Check your inbox for the verification link.",
        )
    
    # Log successful login
    AuditLogger.log_login(
        db=db,
        user_id=user.id,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        success=True
    )
    
    # Create JWT tokens
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    
    # Set HttpOnly cookies for web clients
    from app.utils.cookies import set_refresh_cookie
    response = JSONResponse(content={
        "access_token": access_token,
        "token_type": "bearer",
    })
    set_auth_cookie(response, access_token)
    set_refresh_cookie(response, refresh_token)
    return response



@router.get("/me", response_model=AdminUserResponse)
async def get_current_user_profile(
    request: Request,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))
) -> AdminUserResponse:
    """
    Get current user's profile.
    Accepts JWT via Authorization header OR HttpOnly cookie.
    """
    from app.utils.auth import decode_access_token
    from app.db.crud import UserCRUD
    from app.utils.cookies import COOKIE_NAME
    from uuid import UUID
    
    # Extract token from header or cookie
    token = credentials.credentials if credentials else request.cookies.get(COOKIE_NAME)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    try:
        user = UserCRUD.get_by_id(db, UUID(user_id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    return AdminUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at
    )


@router.post("/logout")
async def logout():
    """
    Clear the HttpOnly auth cookie.
    Mobile clients can simply discard the stored token.
    """
    from fastapi.responses import JSONResponse
    from app.utils.cookies import clear_auth_cookie

    response = JSONResponse(content={"message": "Logged out"})
    clear_auth_cookie(response)
    return response


@router.post("/refresh")
async def refresh_tokens(request: Request, db: Session = Depends(get_db)):
    """
    Rotate tokens: consume the refresh-token cookie and issue a fresh
    access + refresh token pair.  Mobile clients can also POST the
    refresh token in the JSON body ``{"refresh_token": "..."}`` when
    cookies are not available.
    """
    from fastapi.responses import JSONResponse
    from app.utils.auth import decode_refresh_token
    from app.utils.cookies import (
        REFRESH_COOKIE_NAME, set_auth_cookie, set_refresh_cookie, clear_auth_cookie,
    )
    from uuid import UUID

    # Try cookie first, then JSON body
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not token:
        try:
            body = await request.json()
            token = body.get("refresh_token")
        except Exception:
            token = None

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    payload = decode_refresh_token(token)
    if not payload:
        # Token is invalid / expired — force full re-login
        resp = JSONResponse(
            status_code=401,
            content={"detail": "Refresh token invalid or expired"},
        )
        clear_auth_cookie(resp)
        return resp

    user_id = payload.get("sub")
    user = UserCRUD.get_by_id(db, UUID(user_id)) if user_id else None
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Issue new token pair (rotation)
    new_access = create_access_token(subject=user.id)
    new_refresh = create_refresh_token(subject=user.id)

    response = JSONResponse(content={
        "access_token": new_access,
        "token_type": "bearer",
    })
    set_auth_cookie(response, new_access)
    set_refresh_cookie(response, new_refresh)
    return response


# =============================================================================
# Google OAuth 2.0 Endpoints
# =============================================================================
from pydantic import BaseModel
from app.config import settings
import httpx
import secrets


class GoogleAuthURL(BaseModel):
    """Response for Google OAuth URL."""
    auth_url: str
    state: str


class GoogleCallback(BaseModel):
    """Request body for Google OAuth callback."""
    code: str
    code_verifier: Optional[str] = None  # Optional for mobile OAuth flow
    state: str


class GoogleAuthResponse(BaseModel):
    """Response for successful Google OAuth."""
    access_token: str
    token_type: str = "bearer"
    user: AdminUserResponse
    transfer_code: Optional[str] = None  # Temporary code for mobile to exchange for token


@router.get("/google/url", response_model=GoogleAuthURL)
async def get_google_oauth_url(source: Optional[str] = None, mobile_redirect: Optional[str] = None):
    """
    Get Google OAuth URL for frontend redirect.
    
    Args:
        source: Optional source identifier. Use 'mobile' for mobile app flow.
        mobile_redirect: Optional redirect URI for mobile app deep link callback.
    
    Returns:
        GoogleAuthURL: OAuth URL and state for CSRF protection
    """
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID in environment."
        )
    
    # Generate state for CSRF protection
    random_state = secrets.token_urlsafe(32)
    
    if source == "mobile":
        if mobile_redirect:
            # Validate redirect URI scheme to prevent Open Redirect attacks
            # Only allow specific schemes: 'exp' (Expo Go) and 'law-gpt' (Production App)
            allowed_schemes = {"exp", "law-gpt"}
            try:
                scheme = mobile_redirect.split(":")[0]
                if scheme not in allowed_schemes:
                    logger.warning(f"Blocked invalid mobile redirect scheme: {scheme}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid redirect URI scheme. Allowed: exp, law-gpt"
                    )
            except IndexError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid redirect URI format"
                )

            # Encode redirect URI in state: mobile.<base64url(redirect)>.<random>
            # Uses '.' separator which is safe (not in base64url or token_urlsafe alphabet)
            redirect_b64 = base64.urlsafe_b64encode(mobile_redirect.encode()).decode().rstrip('=')
            state = f"mobile.{redirect_b64}.{random_state}"
        else:
            state = f"mobile_{random_state}"
    else:
        state = random_state
    
    # Build Google OAuth URL
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent"
    }
    
    query_string = urlencode(params)
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query_string}"
    
    # Store state for CSRF verification on callback
    await _store_oauth_state(state)
    
    return GoogleAuthURL(auth_url=auth_url, state=state)


@router.post("/google/callback", response_model=GoogleAuthResponse)
async def google_oauth_callback(
    callback_data: GoogleCallback,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle Google OAuth callback.
    Exchanges authorization code for tokens and creates/links user.
    
    Flow:
    1. Exchange code for Google tokens (with PKCE verifier)
    2. Decode ID token to get user info
    3. Find existing user by google_id OR email
    4. Create new user or link existing account
    5. Return JWT token for our app
    
    Viva Explanation:
    - PKCE (Proof Key for Code Exchange) prevents authorization code interception
    - ID token contains user info (email, name, picture)
    - Auto-links if email already exists in our system
    """
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth not configured"
        )
    
    # Verify the state parameter to prevent CSRF attacks
    if not await _verify_and_consume_oauth_state(callback_data.state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state. Please try signing in again."
        )
    
    client_ip = get_client_ip(request)
    
    try:
        # Step 1: Exchange authorization code for tokens
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_data = {
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "code": callback_data.code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.google_redirect_uri
                }
            # Only include code_verifier if provided (not used in mobile flow)
            if callback_data.code_verifier:
                token_data["code_verifier"] = callback_data.code_verifier
            
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data=token_data
            )
        
        if token_response.status_code != 200:
            logger.error(f"Google token exchange failed: {token_response.text}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to authenticate with Google"
            )
        
        tokens = token_response.json()
        
        # Step 2: Get user info from Google
        async with httpx.AsyncClient(timeout=10.0) as client:
            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"}
            )
        
        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to get user info from Google"
            )
        
        google_user = userinfo_response.json()
        google_id = google_user.get("id")
        email = google_user.get("email")
        name = google_user.get("name", "")
        picture = google_user.get("picture")
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Google"
            )
        
        # Step 3: Find or create user
        user = None
        
        # First, check if user exists by Google ID
        user = UserCRUD.get_by_google_id(db, google_id)
        
        if not user:
            # Check if user exists by email (for account linking)
            user = UserCRUD.get_by_email(db, email)
            
            if user:
                # Link existing email account to Google
                user = UserCRUD.link_google_account(db, user, google_id, picture)
                logger.info(f"Linked Google account to existing user: {email}")
                
                AuditLogger.log_event(
                    db=db,
                    event_type="google_account_linked",
                    event_category="authentication",
                    severity="info",
                    user_id=user.id,
                    ip_address=client_ip,
                    details={"email": email},
                    success=True,
                    force_commit=True
                )
            else:
                # Create new user from Google
                user = UserCRUD.create_google_user(
                    db=db,
                    email=email,
                    full_name=name,
                    google_id=google_id,
                    picture_url=picture
                )
                logger.info(f"Created new Google OAuth user: {email}")
                
                AuditLogger.log_event(
                    db=db,
                    event_type="google_registration_success",
                    event_category="authentication",
                    severity="info",
                    user_id=user.id,
                    ip_address=client_ip,
                    details={"email": email},
                    success=True,
                    force_commit=True
                )
        
        # Step 4: Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled"
            )
        
        # Step 5: Log successful login and create JWT
        AuditLogger.log_login(
            db=db,
            user_id=user.id,
            ip_address=client_ip,
            user_agent=request.headers.get("User-Agent"),
            success=True
        )
        
        access_token = create_access_token(subject=user.id)
        
        # Check if mobile flow (via state prefix)
        transfer_code = None
        is_mobile = callback_data.state.startswith("mobile.") or callback_data.state.startswith("mobile_")
        if callback_data.state.startswith("mobile."):
            # Generate short-lived transfer code
            # We don't want to expose the JWT in the URL
            transfer_code = secrets.token_urlsafe(16)
            await _store_temp_auth_code(transfer_code, {
                "access_token": access_token,
                "user": AdminUserResponse(
                    id=user.id,
                    email=user.email,
                    full_name=user.full_name,
                    is_active=user.is_active,
                    is_superuser=user.is_superuser,
                    created_at=user.created_at
                ),
                "expires_at": datetime.now(timezone.utc) + timedelta(minutes=1)
            })
        
        auth_response = GoogleAuthResponse(
            access_token=access_token,
            user=AdminUserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
                is_superuser=user.is_superuser,
                created_at=user.created_at
            ),
            transfer_code=transfer_code
        )

        # Set HttpOnly cookie for web OAuth flow
        if not is_mobile:
            from fastapi.responses import JSONResponse
            from app.utils.cookies import set_auth_cookie, set_refresh_cookie
            web_refresh = create_refresh_token(subject=user.id)
            response = JSONResponse(content=auth_response.model_dump(mode="json"))
            set_auth_cookie(response, access_token)
            set_refresh_cookie(response, web_refresh)
            return response

        return auth_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed. Please try again."
        )


class GoogleMobileAuth(BaseModel):
    """Request body for mobile Google auth (access token flow)."""
    access_token: str


@router.post("/google/mobile-auth", response_model=GoogleAuthResponse)
async def google_mobile_auth(
    auth_data: GoogleMobileAuth,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Mobile Google OAuth - accepts Google access token directly.
    
    Used by mobile apps (Expo) that get an access token from Google
    via expo-auth-session, bypassing the authorization code exchange.
    
    Flow:
    1. Mobile app gets Google access token via expo-auth-session
    2. Sends access token to this endpoint
    3. We verify by fetching user info from Google
    4. Create/find user and return our JWT
    """
    client_ip = get_client_ip(request)
    
    try:
        # Verify the access token by fetching user info from Google
        async with httpx.AsyncClient(timeout=10.0) as client:
            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {auth_data.access_token}"}
            )
        
        if userinfo_response.status_code != 200:
            logger.error(f"Google userinfo failed: {userinfo_response.text}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google access token"
            )
        
        google_user = userinfo_response.json()
        google_id = google_user.get("id")
        email = google_user.get("email")
        name = google_user.get("name", "")
        picture = google_user.get("picture")
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Google"
            )
        
        # Find or create user (same logic as web OAuth)
        user = UserCRUD.get_by_google_id(db, google_id)
        
        if not user:
            user = UserCRUD.get_by_email(db, email)
            
            if user:
                user = UserCRUD.link_google_account(db, user, google_id, picture)
                logger.info(f"Mobile: Linked Google account to existing user: {email}")
                
                AuditLogger.log_event(
                    db=db,
                    event_type="google_account_linked",
                    event_category="authentication",
                    severity="info",
                    user_id=user.id,
                    ip_address=client_ip,
                    details={"email": email, "source": "mobile"},
                    success=True,
                    force_commit=True
                )
            else:
                user = UserCRUD.create_google_user(
                    db=db,
                    email=email,
                    full_name=name,
                    google_id=google_id,
                    picture_url=picture
                )
                logger.info(f"Mobile: Created new Google OAuth user: {email}")
                
                AuditLogger.log_event(
                    db=db,
                    event_type="google_registration_success",
                    event_category="authentication",
                    severity="info",
                    user_id=user.id,
                    ip_address=client_ip,
                    details={"email": email, "source": "mobile"},
                    success=True,
                    force_commit=True
                )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled"
            )
        
        AuditLogger.log_login(
            db=db,
            user_id=user.id,
            ip_address=client_ip,
            user_agent=request.headers.get("User-Agent"),
            success=True
        )
        
        access_token = create_access_token(subject=user.id)
        
        return GoogleAuthResponse(
            access_token=access_token,
            user=AdminUserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
                is_superuser=user.is_superuser,
                created_at=user.created_at
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Mobile Google OAuth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed. Please try again."
        )


class ExchangeRequest(BaseModel):
    code: str


@router.post("/mobile/exchange", response_model=GoogleAuthResponse)
async def exchange_transfer_code(request: ExchangeRequest):
    """
    Exchange a temporary transfer code for an access token.
    Used by mobile app to securely retrieve the token after deep link.

    Viva Explanation:
    - Mobile app receives a short-lived transfer_code via deep link
    - This endpoint exchanges it for the actual JWT (one-time use)
    - Uses Redis (multi-worker safe) with in-memory fallback
    """
    code_data = await _get_and_delete_temp_auth_code(request.code)

    if not code_data:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    # If data came from Redis it's already a plain dict (user is a dict);
    # if from in-memory it may be an AdminUserResponse model.
    token = code_data["access_token"]
    user = code_data["user"]

    # Rebuild AdminUserResponse if user came from Redis as a dict
    if isinstance(user, dict):
        user = AdminUserResponse(**user)

    logger.info(f"Transfer code exchanged successfully for user {user.email}")

    return GoogleAuthResponse(
        access_token=token,
        user=user
    )


# =============================================================================
# Email Verification Helpers & Endpoints
# =============================================================================
from app.utils.email import send_email_verification

_EMAIL_VERIFY_TTL = 86400  # 24 hours
_REDIS_VERIFY_PREFIX = "email_verify:"
_email_verify_codes: dict[str, dict] = {}  # in-memory fallback
_email_verify_lock = asyncio.Lock()


async def _send_verification_email(user, db: Session) -> None:
    """Generate a verification token, store it, and send the email."""
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    # Store in Redis (preferred) or in-memory
    from app.utils.redis_client import get_redis
    redis = await get_redis()
    if redis:
        await redis.setex(
            f"{_REDIS_VERIFY_PREFIX}{token_hash}",
            _EMAIL_VERIFY_TTL,
            str(user.id),
        )
    else:
        async with _email_verify_lock:
            _email_verify_codes[token_hash] = {
                "user_id": str(user.id),
                "expires_at": datetime.now(timezone.utc) + timedelta(seconds=_EMAIL_VERIFY_TTL),
            }

    verify_link = f"{settings.app_url}/verify-email?token={raw_token}"
    send_email_verification(
        to_email=user.email,
        to_name=user.full_name or "",
        verify_link=verify_link,
    )


@router.get("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email(token: str, db: Session = Depends(get_db)):
    """
    Verify a user's email address using the token sent during registration.
    """
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    # Look up in Redis first
    from app.utils.redis_client import get_redis
    redis = await get_redis()
    user_id_str: str | None = None

    if redis:
        raw = await redis.getdel(f"{_REDIS_VERIFY_PREFIX}{token_hash}")
        if raw:
            user_id_str = raw.decode() if isinstance(raw, bytes) else raw
    else:
        async with _email_verify_lock:
            entry = _email_verify_codes.pop(token_hash, None)
        if entry and datetime.now(timezone.utc) < entry["expires_at"]:
            user_id_str = entry["user_id"]

    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link. Please register again.",
        )

    from uuid import UUID
    user = UserCRUD.get_by_id(db, UUID(user_id_str))
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found.")

    user.email_verified = True
    db.commit()

    logger.info(f"Email verified for user {user.email}")
    return {"message": "Email verified successfully. You can now sign in."}


_RESEND_RATE_PREFIX = "resend_verify_rate:"
_RESEND_RATE_MAX = 3
_RESEND_RATE_WINDOW = 3600
_resend_rate_mem: dict = {}
_resend_rate_lock = asyncio.Lock()


async def _check_resend_rate_limit(email: str) -> bool:
    """Return True if the email has exceeded its resend-verification rate limit."""
    import time
    key = f"{_RESEND_RATE_PREFIX}{email.lower()}"
    now = time.time()

    try:
        from app.utils.redis_client import get_redis
        redis = await get_redis()
        if redis:
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, _RESEND_RATE_WINDOW)
            return count > _RESEND_RATE_MAX
    except Exception as exc:
        logger.warning("Redis error in resend rate-limit check: %s", exc)

    async with _resend_rate_lock:
        entry = _resend_rate_mem.get(key)
        if entry is None or now - entry["start"] > _RESEND_RATE_WINDOW:
            _resend_rate_mem[key] = {"start": now, "count": 1}
            return False
        entry["count"] += 1
        return entry["count"] > _RESEND_RATE_MAX


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
async def resend_verification_email(
    body: ForgotPasswordRequest,  # reuses {email} schema
    db: Session = Depends(get_db),
):
    """Resend the verification email (rate-limited)."""
    if await _check_resend_rate_limit(body.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
        )

    user = UserCRUD.get_by_email(db, body.email)
    if not user or user.email_verified:
        # Don't reveal whether the email exists
        return {"message": "If an unverified account with that email exists, a verification link has been sent."}

    await _send_verification_email(user, db)
    return {"message": "If an unverified account with that email exists, a verification link has been sent."}


# =============================================================================
# Password Reset Endpoints
# =============================================================================
import hashlib
import secrets
from app.db.models import PasswordResetToken
from app.schemas.user import ForgotPasswordRequest, ResetPasswordRequest
from app.utils.email import send_password_reset_email

# ── Per-email rate limiting for password-reset requests ──
_RESET_RATE_PREFIX = "pwd_reset_rate:"
_RESET_RATE_MAX = 3           # max requests per window
_RESET_RATE_WINDOW = 3600     # 1-hour window (seconds)
_reset_rate_mem: dict = {}    # fallback when Redis is unavailable


async def _check_reset_rate_limit(email: str) -> bool:
    """Return True if the email has exceeded its password-reset rate limit."""
    import time
    key = f"{_RESET_RATE_PREFIX}{email.lower()}"
    now = time.time()

    # Try Redis first
    try:
        from app.utils.redis_client import get_redis
        redis = await get_redis()
        if redis:
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, _RESET_RATE_WINDOW)
            return count > _RESET_RATE_MAX
    except Exception:
        pass

    # In-memory fallback
    entry = _reset_rate_mem.get(key)
    if entry is None or now - entry["start"] > _RESET_RATE_WINDOW:
        _reset_rate_mem[key] = {"start": now, "count": 1}
        return False
    entry["count"] += 1
    return entry["count"] > _RESET_RATE_MAX


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    body: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Request a password-reset email.

    Always returns 200 to prevent email enumeration.
    If the email exists, a reset link is sent via Brevo.
    """
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent")

    # Rate-limit: max 3 reset emails per hour per email address
    if await _check_reset_rate_limit(body.email):
        logger.warning(f"Password reset rate-limited for email: {body.email}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset requests. Please try again later.",
        )

    user = UserCRUD.get_by_email(db, body.email)
    if not user:
        # Return same message to prevent email enumeration
        logger.info(f"Password reset requested for non-existent email: {body.email}")
        return {"message": "If an account with that email exists, a reset link has been sent."}

    # Reject OAuth-only accounts (no password to reset)
    if user.auth_provider != "email":
        logger.info(f"Password reset ignored for OAuth user: {body.email}")
        return {
            "message": "This account uses Google Sign-In. Please sign in with Google instead.",
            "oauth_account": True
        }

    # Invalidate any previous unused tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False,  # noqa: E712
    ).update({"used": True})
    db.commit()

    # Generate a secure random token and store its SHA-256 hash
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.password_reset_expire_minutes
    )

    reset_entry = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(reset_entry)
    db.commit()

    # Build the reset link (frontend route)
    reset_link = f"{settings.app_url}/reset-password?token={raw_token}"

    # Send email (non-blocking failure — user still gets generic 200)
    email_sent = send_password_reset_email(
        to_email=user.email,
        to_name=user.full_name or "",
        reset_link=reset_link,
    )

    # Audit log
    AuditLogger.log_event(
        db=db,
        event_type="password_reset_requested",
        event_category="authentication",
        severity="info",
        user_id=user.id,
        ip_address=client_ip,
        user_agent=user_agent,
        details={"email_sent": email_sent},
        success=email_sent,
        force_commit=True,
    )

    return {"message": "If an account with that email exists, a reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    body: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Consume a password-reset token and set a new password.
    """
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent")

    # Hash the incoming token to compare with stored hash
    token_hash = hashlib.sha256(body.token.encode()).hexdigest()

    reset_entry = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used == False,  # noqa: E712
    ).first()

    if not reset_entry or reset_entry.expires_at < datetime.now(timezone.utc):
        AuditLogger.log_event(
            db=db,
            event_type="password_reset_failed",
            event_category="authentication",
            severity="warning",
            ip_address=client_ip,
            user_agent=user_agent,
            details={"reason": "invalid_or_expired_token"},
            success=False,
            force_commit=True,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token. Please request a new one.",
        )

    # Validate new password strength
    is_valid, error_msg = validate_password_strength(body.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    # Update the user's password
    user = UserCRUD.get_by_id(db, reset_entry.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account not found.",
        )

    UserCRUD.update_password(db, user, body.new_password)

    # Mark token as used
    reset_entry.used = True
    db.commit()

    # Audit log
    AuditLogger.log_event(
        db=db,
        event_type="password_reset_success",
        event_category="authentication",
        severity="info",
        user_id=user.id,
        ip_address=client_ip,
        user_agent=user_agent,
        success=True,
        force_commit=True,
    )

    logger.info(f"Password reset completed for user {user.email}")
    return {"message": "Password has been reset successfully. You can now sign in."}
