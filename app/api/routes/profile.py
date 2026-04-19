# Indian Law RAG Chatbot - User Profile Routes
"""
Endpoints for user profile management, memory retrieval,
and DPDPA/GDPR-compliant privacy controls.
"""

from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.middleware import rate_limit
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.db.database import get_db
from app.db.models import User, ChatSession, ChatMessage, MessageRole
from app.db.crud import UserCRUD, UserProfileCRUD, UserMemoryCRUD, ChatSessionCRUD
from app.api.dependencies import get_current_user
from app.utils.privacy import delete_all_user_data, export_user_data
from app.utils.logging_config import get_logger
from app.utils.auth import verify_password
from sqlalchemy import func, desc

logger = get_logger(__name__)

router = APIRouter(prefix="/profile", tags=["Profile"])


# =============================================================================
# Schemas
# =============================================================================

class ProfileResponse(BaseModel):
    """User profile data returned to the frontend."""
    email: str
    full_name: Optional[str] = None
    picture_url: Optional[str] = None
    auth_provider: str = "local"
    location: Optional[str] = None
    preferred_language: str = "en"
    case_types: List[str] = []
    legal_interests: List[str] = []
    created_at: str
    total_sessions: int = 0
    total_messages: int = 0


class ProfileUpdateRequest(BaseModel):
    """Fields the user can update on their profile."""
    full_name: Optional[str] = None
    location: Optional[str] = None
    preferred_language: Optional[str] = None
    case_types: Optional[List[str]] = None
    legal_interests: Optional[List[str]] = None


class MemoryItem(BaseModel):
    """Single memory entry for the frontend."""
    id: str
    memory_type: str
    content: str
    importance_score: float
    created_at: str


class StatsResponse(BaseModel):
    """Aggregated user statistics."""
    total_sessions: int = 0
    total_messages: int = 0
    total_memories: int = 0
    languages_used: List[str] = []
    top_topics: List[str] = []
    member_since: str = ""


# =============================================================================
# Profile Endpoints
# =============================================================================

@router.get("", response_model=ProfileResponse)
@rate_limit(requests_per_minute=60)
async def get_profile(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the authenticated user's full profile."""
    profile = UserProfileCRUD.get_or_create(db, user.id)

    # Count sessions and messages
    total_sessions = db.query(func.count(ChatSession.id)).filter(
        ChatSession.user_id == user.id
    ).scalar() or 0

    total_messages = 0
    if total_sessions > 0:
        # Use subquery instead of loading all IDs into Python memory
        session_id_subq = db.query(ChatSession.id).filter(
            ChatSession.user_id == user.id
        ).subquery()
        total_messages = db.query(func.count(ChatMessage.id)).filter(
            ChatMessage.session_id.in_(session_id_subq),
            ChatMessage.role == MessageRole.USER,
        ).scalar() or 0

    return ProfileResponse(
        email=user.email,
        full_name=user.full_name,
        picture_url=getattr(user, "picture_url", None),
        auth_provider=getattr(user, "auth_provider", "local"),
        location=profile.location,
        preferred_language=profile.preferred_language or "en",
        case_types=profile.case_types or [],
        legal_interests=profile.legal_interests or [],
        created_at=user.created_at.isoformat(),
        total_sessions=total_sessions,
        total_messages=total_messages,
    )


@router.put("", response_model=ProfileResponse)
@rate_limit(requests_per_minute=20)
async def update_profile(
    request: Request,
    body: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user profile fields."""
    # Update name on User model if provided
    if body.full_name is not None:
        user.full_name = body.full_name
        db.flush()
        db.commit()
        db.refresh(user)

    UserProfileCRUD.update(
        db,
        user.id,
        location=body.location,
        preferred_language=body.preferred_language,
        case_types=body.case_types,
        legal_interests=body.legal_interests,
    )

    # Re-fetch to return fresh data
    return await get_profile(user=user, db=db)


# =============================================================================
# Stats Endpoint
# =============================================================================

@router.get("/stats", response_model=StatsResponse)
@rate_limit(requests_per_minute=60)
async def get_stats(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get aggregated statistics for the user dashboard."""
    profile = UserProfileCRUD.get_or_create(db, user.id)

    total_sessions = db.query(func.count(ChatSession.id)).filter(
        ChatSession.user_id == user.id
    ).scalar() or 0

    # Use subquery instead of loading all IDs into Python memory
    session_id_subq = db.query(ChatSession.id).filter(
        ChatSession.user_id == user.id
    ).subquery()

    total_messages = 0
    if total_sessions > 0:
        total_messages = db.query(func.count(ChatMessage.id)).filter(
            ChatMessage.session_id.in_(session_id_subq),
            ChatMessage.role == MessageRole.USER,
        ).scalar() or 0

    from app.db.models import UserMemory
    total_memories = db.query(func.count(UserMemory.id)).filter(
        UserMemory.user_id == user.id
    ).scalar() or 0

    languages_used = []
    if profile.preferred_language and profile.preferred_language != "en":
        languages_used.append(profile.preferred_language)
    languages_used.insert(0, "en")

    return StatsResponse(
        total_sessions=total_sessions,
        total_messages=total_messages,
        total_memories=total_memories,
        languages_used=languages_used,
        top_topics=profile.legal_interests or [],
        member_since=user.created_at.isoformat(),
    )


# =============================================================================
# Memory Endpoints
# =============================================================================

@router.get("/memories", response_model=List[MemoryItem])
@rate_limit(requests_per_minute=60)
async def get_memories(
    request: Request,
    memory_type: Optional[str] = None,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the user's stored AI memories."""
    memories = UserMemoryCRUD.get_user_memories(
        db, user.id, memory_type=memory_type, limit=limit
    )
    return [
        MemoryItem(
            id=str(m.id),
            memory_type=m.memory_type,
            content=m.content,
            importance_score=m.importance_score,
            created_at=m.created_at.isoformat(),
        )
        for m in memories
    ]


@router.delete("/memories")
@rate_limit(requests_per_minute=10)
async def clear_memories(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete all AI memories for the current user."""
    count = UserMemoryCRUD.delete_user_memories(db, user.id)
    return {"deleted": count, "message": f"Cleared {count} memories."}


# =============================================================================
# Privacy Endpoints (DPDPA / GDPR)
# =============================================================================

@router.get("/export")
@rate_limit(requests_per_minute=10)
async def export_data(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Export all user data in portable JSON format.
    DPDPA Section 11 / GDPR Article 20.
    """
    data = export_user_data(db, user.id)
    return JSONResponse(content=data)


class DeleteAccountRequest(BaseModel):
    """Requires current password for confirmation (local users) or confirm flag (OAuth users)."""
    current_password: Optional[str] = Field(None, min_length=1)
    confirm: bool = Field(False, description="OAuth users must set this to true to confirm deletion.")


@router.delete("/delete-account")
@rate_limit(requests_per_minute=5)
async def delete_account(
    request: Request,
    body: DeleteAccountRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently delete user account and ALL associated data.
    DPDPA Section 12 / GDPR Article 17 (Right to Erasure).
    Requires current password for local users, or explicit confirm flag for OAuth users.
    This action is irreversible.
    """
    is_local_user = bool(user.hashed_password)

    if is_local_user:
        # Local users must verify their password
        if not body.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required to delete a local account.",
            )
        if not verify_password(body.current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Incorrect password. Account deletion aborted.",
            )
    else:
        # OAuth users must explicitly confirm
        if not body.confirm:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OAuth account deletion requires confirm=true.",
            )

    counts = delete_all_user_data(db, user.id)
    return {
        "message": "Account and all data permanently deleted.",
        "deleted_counts": counts,
    }
