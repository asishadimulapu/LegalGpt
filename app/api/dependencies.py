# Indian Law RAG Chatbot - API Dependencies
"""
Shared dependencies for FastAPI routes.
Includes authentication, database sessions, and service instances.
"""

from typing import Optional, Generator
from uuid import UUID

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User
from app.db.crud import UserCRUD
from app.utils.auth import decode_access_token
from app.utils.cookies import COOKIE_NAME
from app.core.rag_pipeline import get_rag_pipeline, RAGPipeline
from app.core.vector_store import get_vector_store, VectorStoreManager

# HTTP Bearer token security scheme
security = HTTPBearer(auto_error=False)


def _extract_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials],
) -> Optional[str]:
    """
    Extract JWT token — prefer Authorization header, fall back to HttpOnly cookie.
    This allows the web frontend to use cookies while mobile apps keep using
    the Authorization header.
    """
    if credentials:
        return credentials.credentials
    # Fallback: HttpOnly cookie
    return request.cookies.get(COOKIE_NAME)


async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise.
    Use this for endpoints that work with or without authentication.
    
    Checks Authorization header first, then falls back to HttpOnly cookie.
    """
    token = _extract_token(request, credentials)
    if not token:
        return None
    
    payload = decode_access_token(token)
    
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    try:
        user = UserCRUD.get_by_id(db, UUID(user_id))
        return user
    except Exception:
        return None


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user.
    Raises 401 if not authenticated.
    
    Checks Authorization header first, then falls back to HttpOnly cookie.
    """
    token = _extract_token(request, credentials)
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
            detail="User account is disabled"
        )
    
    return user


def get_rag_pipeline_dep() -> RAGPipeline:
    """
    Dependency to get RAG pipeline instance.
    
    Returns:
        RAGPipeline: Configured RAG pipeline
    """
    return get_rag_pipeline()


def get_vector_store_dep() -> VectorStoreManager:
    """
    Dependency to get vector store instance.
    
    Returns:
        VectorStoreManager: Vector store manager
    """
    return get_vector_store()
