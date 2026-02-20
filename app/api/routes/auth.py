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
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.utils.auth import create_access_token, validate_password_strength
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

# Temporary cache for mobile auth code exchange (Simple in-memory for now)
# In production, use Redis or DB with TTL
# Map: transfer_code -> {access_token: str, expires_at: datetime}
_TEMP_AUTH_CODES_MAX_SIZE = 100  # Prevent unbounded growth
temp_auth_codes = {}
_temp_auth_codes_lock = asyncio.Lock()


async def _cleanup_expired_temp_auth_codes():
    """
    Remove expired entries from temp_auth_codes (lazy cleanup).

    Viva Explanation:
    - Acquires asyncio lock to prevent concurrent dict mutation
    - Snapshots items via list() for safe iteration during cleanup
    - Called lazily on access and before inserts to bound memory usage
    """
    async with _temp_auth_codes_lock:
        now = datetime.now(timezone.utc)
        expired_keys = [k for k, v in list(temp_auth_codes.items()) if now > v.get("expires_at", now)]
        for k in expired_keys:
            temp_auth_codes.pop(k, None)


async def _store_temp_auth_code(code: str, data: dict):
    """
    Store a transfer code with max-size enforcement and lazy cleanup.

    Viva Explanation:
    - Acquires asyncio lock to serialize concurrent dict mutations
    - Enforces a cap on the dict to prevent unbounded memory growth
    - Evicts expired entries first, then entry closest to expiry if still at capacity
    - Ensures the auth code cache stays bounded in single-instance setups
    """
    async with _temp_auth_codes_lock:
        if len(temp_auth_codes) >= _TEMP_AUTH_CODES_MAX_SIZE:
            # Remove expired first
            now = datetime.now(timezone.utc)
            expired_keys = [k for k, v in list(temp_auth_codes.items()) if now > v.get("expires_at", now)]
            for k in expired_keys:
                temp_auth_codes.pop(k, None)
        # If still at capacity, evict the entry closest to expiry
        if len(temp_auth_codes) >= _TEMP_AUTH_CODES_MAX_SIZE:
            evict_key = min(temp_auth_codes, key=lambda k: temp_auth_codes[k].get("expires_at", now))
            temp_auth_codes.pop(evict_key, None)
        temp_auth_codes[code] = data


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
    Includes audit logging for security monitoring.
    
    Args:
        credentials: Login credentials (email + password)
        request: Request object for audit logging
        db: Database session
        
    Returns:
        Token: JWT access token
        
    Raises:
        HTTPException: 401 if credentials are invalid
    """
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
    
    # Log successful login
    AuditLogger.log_login(
        db=db,
        user_id=user.id,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        success=True
    )
    
    # Create JWT token
    access_token = create_access_token(subject=user.id)
    
    return Token(access_token=access_token, token_type="bearer")



@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
) -> UserResponse:
    """
    Get current user's profile.
    Requires authentication via JWT token.
    
    Returns:
        UserResponse: Current user's profile
        
    Raises:
        HTTPException: 401 if not authenticated or token invalid
    """
    from app.utils.auth import decode_access_token
    from app.db.crud import UserCRUD
    from uuid import UUID
    
    # Decode and validate token
    token = credentials.credentials
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
    
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        created_at=user.created_at
    )


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
    user: UserResponse
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
            # Only allow specific schemes: 'exp' (Expo Go) and 'nyayasahay' (Production App)
            allowed_schemes = {"exp", "nyayasahay"}
            try:
                scheme = mobile_redirect.split(":")[0]
                if scheme not in allowed_schemes:
                    logger.warning(f"Blocked invalid mobile redirect scheme: {scheme}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid redirect URI scheme. Allowed: exp, nyayasahay"
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
        if callback_data.state.startswith("mobile."):
            # Generate short-lived transfer code
            # We don't want to expose the JWT in the URL
            transfer_code = secrets.token_urlsafe(16)
            _store_temp_auth_code(transfer_code, {
                "access_token": access_token,
                "user": UserResponse(
                    id=user.id,
                    email=user.email,
                    full_name=user.full_name,
                    is_active=user.is_active,
                    created_at=user.created_at
                ),
                "expires_at": datetime.now(timezone.utc) + timedelta(minutes=1)
            })
        
        return GoogleAuthResponse(
            access_token=access_token,
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
                created_at=user.created_at
            ),
            transfer_code=transfer_code
        )
        
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
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
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
    - Expired entries are cleaned up lazily on access
    """
    # Lazy cleanup on every access
    await _cleanup_expired_temp_auth_codes()

    async with _temp_auth_codes_lock:
        code_data = temp_auth_codes.get(request.code)

        if not code_data:
            raise HTTPException(status_code=400, detail="Invalid code")

        if datetime.now(timezone.utc) > code_data["expires_at"]:
            temp_auth_codes.pop(request.code, None)
            raise HTTPException(status_code=400, detail="Code expired")

        # One-time use: pop the code so it cannot be reused
        temp_auth_codes.pop(request.code, None)
    token = code_data["access_token"]
    user = code_data["user"]

    # Audit log for transfer code exchange
    logger.info(f"Transfer code exchanged successfully for user {user.email}")

    return GoogleAuthResponse(
        access_token=token,
        user=user
    )
