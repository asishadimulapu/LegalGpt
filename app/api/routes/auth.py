# Indian Law RAG Chatbot - Authentication Routes
"""
User authentication endpoints for registration and login.
Includes password strength validation and audit logging.

PRODUCTION NOTES:
- Database connection errors are handled gracefully with retry messaging
- Audit logs use force_commit for independent transactions
- Connection pool starvation is mitigated via proper session lifecycle
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, OperationalError, IntegrityError

from app.db.database import get_db
from app.db.crud import UserCRUD
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.utils.auth import create_access_token, validate_password_strength
from app.utils.audit import AuditLogger

import logging
import json
import os
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

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
    user = Depends(lambda: None)  # Placeholder, will use proper dependency
) -> UserResponse:
    """
    Get current user's profile.
    Requires authentication.
    """
    from app.api.dependencies import get_current_user
    # This would need proper integration - placeholder for now
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Endpoint under development"
    )

