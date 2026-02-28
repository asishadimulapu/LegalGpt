# Admin Dashboard - API Routes
"""
Admin-only endpoints for user management, analytics, documents, 
audit logs, and system settings.
All routes require is_superuser=True.
"""

import logging
import math
import os
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func, desc, cast, String, and_

logger = logging.getLogger(__name__)

from app.db.database import get_db
from app.db.models import (
    User, ChatSession, ChatMessage, QueryLog,
    ApplicationLog, DocumentEmbedding, AuditLog,
    UserProfile, UserMemory,
)
from app.api.admin_deps import require_admin
from app.schemas.admin import (
    DashboardStats,
    UserAdminItem, UserListResponse, UserAdminDetail, UserUpdateAdmin,
    QueryAnalytics, QueryDayStat, TopTopic, QueryLogItem, QueryLogListResponse,
    DocumentItem, DocumentListResponse,
    AuditLogItem, AuditLogListResponse,
    SystemSettings,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


# =============================================================================
# Dashboard Overview
# =============================================================================
@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Aggregated stats for the admin dashboard overview."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    total_users = db.query(func.count(User.id)).scalar() or 0
    new_users_today = db.query(func.count(User.id)).filter(
        User.created_at >= today_start
    ).scalar() or 0

    # Active users: users with chat sessions in the last 7 days
    active_users = db.query(func.count(func.distinct(ChatSession.user_id))).filter(
        ChatSession.updated_at >= week_ago,
        ChatSession.user_id.isnot(None),
    ).scalar() or 0

    total_sessions = db.query(func.count(ChatSession.id)).scalar() or 0
    total_messages = db.query(func.count(ChatMessage.id)).scalar() or 0
    total_queries = db.query(func.count(QueryLog.id)).scalar() or 0
    queries_today = db.query(func.count(QueryLog.id)).filter(
        QueryLog.created_at >= today_start
    ).scalar() or 0

    # Document count
    try:
        total_documents = db.query(func.count(DocumentEmbedding.id)).scalar() or 0
    except SQLAlchemyError as e:
        logger.warning("Failed to count documents: %s", e)
        total_documents = 0

    # Average latency
    avg_latency = db.query(func.avg(QueryLog.latency_ms)).filter(
        QueryLog.latency_ms.isnot(None),
        QueryLog.created_at >= week_ago,
    ).scalar() or 0.0

    return DashboardStats(
        total_users=total_users,
        active_users=active_users,
        new_users_today=new_users_today,
        total_sessions=total_sessions,
        total_messages=total_messages,
        total_queries=total_queries,
        total_documents=total_documents,
        avg_response_time_ms=round(float(avg_latency), 1),
        queries_today=queries_today,
        system_uptime="running",
    )


# =============================================================================
# User Management
# =============================================================================
@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    provider: Optional[str] = None,
    active_only: Optional[bool] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Paginated user list with search and filters."""
    query = db.query(User)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_term)) | (User.full_name.ilike(search_term))
        )
    if provider:
        query = query.filter(User.auth_provider == provider)
    if active_only is True:
        query = query.filter(User.is_active == True)
    elif active_only is False:
        query = query.filter(User.is_active == False)

    total = query.count()
    total_pages = max(1, math.ceil(total / per_page))
    offset = (page - 1) * per_page

    # Subqueries for session/message counts to avoid N+1
    session_sub = (
        db.query(
            ChatSession.user_id,
            func.count(ChatSession.id).label("cnt"),
        )
        .group_by(ChatSession.user_id)
        .subquery()
    )
    message_sub = (
        db.query(
            ChatSession.user_id,
            func.count(ChatMessage.id).label("cnt"),
        )
        .join(ChatMessage, ChatMessage.session_id == ChatSession.id)
        .group_by(ChatSession.user_id)
        .subquery()
    )

    users = (
        query.outerjoin(session_sub, User.id == session_sub.c.user_id)
        .outerjoin(message_sub, User.id == message_sub.c.user_id)
        .add_columns(
            func.coalesce(session_sub.c.cnt, 0).label("session_count"),
            func.coalesce(message_sub.c.cnt, 0).label("message_count"),
        )
        .order_by(desc(User.created_at))
        .offset(offset)
        .limit(per_page)
        .all()
    )

    items = []
    for u, session_count, message_count in users:
        items.append(UserAdminItem(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            auth_provider=u.auth_provider,
            picture_url=u.picture_url,
            is_active=u.is_active,
            is_superuser=u.is_superuser,
            created_at=u.created_at,
            updated_at=u.updated_at,
            session_count=session_count,
            message_count=message_count,
        ))

    return UserListResponse(
        users=items, total=total, page=page,
        per_page=per_page, total_pages=total_pages,
    )


@router.get("/users/{user_id}", response_model=UserAdminDetail)
async def get_user_detail(
    user_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get detailed info for a single user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    session_count = db.query(func.count(ChatSession.id)).filter(
        ChatSession.user_id == user.id
    ).scalar() or 0

    message_count = db.query(func.count(ChatMessage.id)).filter(
        ChatMessage.session_id.in_(
            db.query(ChatSession.id).filter(ChatSession.user_id == user.id)
        )
    ).scalar() or 0

    query_count = db.query(func.count(QueryLog.id)).filter(
        QueryLog.user_id == user.id
    ).scalar() or 0

    memory_count = db.query(func.count(UserMemory.id)).filter(
        UserMemory.user_id == user.id
    ).scalar() or 0

    # Last active: most recent session update
    last_session = db.query(ChatSession.updated_at).filter(
        ChatSession.user_id == user.id
    ).order_by(desc(ChatSession.updated_at)).first()
    last_active = last_session[0] if last_session else None

    # Recent sessions
    recent = db.query(ChatSession).filter(
        ChatSession.user_id == user.id
    ).order_by(desc(ChatSession.updated_at)).limit(5).all()
    recent_sessions = [
        {"id": str(s.id), "title": s.title, "updated_at": s.updated_at.isoformat()}
        for s in recent
    ]

    # Fetch user profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()

    return UserAdminDetail(
        id=user.id, email=user.email, full_name=user.full_name,
        auth_provider=user.auth_provider, picture_url=user.picture_url,
        is_active=user.is_active, is_superuser=user.is_superuser,
        created_at=user.created_at, updated_at=user.updated_at,
        google_id=user.google_id,
        session_count=session_count, message_count=message_count,
        query_count=query_count, memory_count=memory_count,
        last_active=last_active, recent_sessions=recent_sessions,
        location=profile.location if profile else None,
        preferred_language=profile.preferred_language if profile else "en",
        case_types=profile.case_types if profile and profile.case_types else [],
        legal_interests=profile.legal_interests if profile and profile.legal_interests else [],
    )


@router.patch("/users/{user_id}", response_model=UserAdminItem)
async def update_user(
    user_id: UUID,
    updates: UserUpdateAdmin,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a user's admin-controlled fields."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin from deactivating themselves
    if user.id == admin.id and updates.is_active is False:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    if user.id == admin.id and updates.is_superuser is False:
        raise HTTPException(status_code=400, detail="Cannot revoke your own admin access")

    if updates.is_active is not None:
        user.is_active = updates.is_active
    if updates.is_superuser is not None:
        user.is_superuser = updates.is_superuser
    if updates.full_name is not None:
        user.full_name = updates.full_name

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    session_count = db.query(func.count(ChatSession.id)).filter(
        ChatSession.user_id == user.id
    ).scalar() or 0
    message_count = db.query(func.count(ChatMessage.id)).filter(
        ChatMessage.session_id.in_(
            db.query(ChatSession.id).filter(ChatSession.user_id == user.id)
        )
    ).scalar() or 0

    return UserAdminItem(
        id=user.id, email=user.email, full_name=user.full_name,
        auth_provider=user.auth_provider, picture_url=user.picture_url,
        is_active=user.is_active, is_superuser=user.is_superuser,
        created_at=user.created_at, updated_at=user.updated_at,
        session_count=session_count, message_count=message_count,
    )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a user and cascade all their data."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    db.delete(user)
    db.commit()
    return {"detail": "User deleted", "user_id": str(user_id)}


# =============================================================================
# Query Analytics
# =============================================================================
@router.get("/queries/analytics", response_model=QueryAnalytics)
async def get_query_analytics(
    days: int = Query(30, ge=1, le=365),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Aggregated query analytics for charts."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    total = db.query(func.count(QueryLog.id)).filter(
        QueryLog.created_at >= cutoff
    ).scalar() or 0

    # Queries per day
    daily = db.query(
        func.date(QueryLog.created_at).label("day"),
        func.count(QueryLog.id).label("cnt"),
    ).filter(
        QueryLog.created_at >= cutoff
    ).group_by(func.date(QueryLog.created_at)).order_by("day").all()

    queries_per_day = [
        QueryDayStat(date=str(row.day), count=row.cnt) for row in daily
    ]

    # Average latency
    avg_lat = db.query(func.avg(QueryLog.latency_ms)).filter(
        QueryLog.created_at >= cutoff,
        QueryLog.latency_ms.isnot(None),
    ).scalar() or 0.0

    # Success rate
    success_count = db.query(func.count(QueryLog.id)).filter(
        QueryLog.created_at >= cutoff,
        QueryLog.was_successful == True,
    ).scalar() or 0
    success_rate = (success_count / total * 100) if total > 0 else 0.0

    return QueryAnalytics(
        total_queries=total,
        queries_per_day=queries_per_day,
        top_topics=[],  # Would need NLP for topic extraction
        avg_latency_ms=round(float(avg_lat), 1),
        success_rate=round(success_rate, 1),
    )


@router.get("/queries", response_model=QueryLogListResponse)
async def list_query_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Paginated list of all query logs."""
    total = db.query(func.count(QueryLog.id)).scalar() or 0
    offset = (page - 1) * per_page

    # Join User to avoid N+1 for email lookup
    logs = (
        db.query(QueryLog, User.email)
        .outerjoin(User, QueryLog.user_id == User.id)
        .order_by(desc(QueryLog.created_at))
        .offset(offset)
        .limit(per_page)
        .all()
    )

    items = []
    for log, user_email in logs:
        items.append(QueryLogItem(
            id=log.id,
            user_email=user_email,
            query_text=log.query[:200] if log.query else "",
            response_length=len(log.response or ""),
            latency_ms=log.latency_ms or 0,
            num_sources=len(log.sources) if log.sources else 0,
            created_at=log.created_at,
        ))

    return QueryLogListResponse(
        logs=items, total=total, page=page, per_page=per_page,
    )


# =============================================================================
# Document Management
# =============================================================================
@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    source: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all indexed document embeddings."""
    try:
        query = db.query(DocumentEmbedding)
        if source:
            query = query.filter(DocumentEmbedding.source.ilike(f"%{source}%"))

        total = query.count()
        offset = (page - 1) * per_page

        docs = query.order_by(
            desc(DocumentEmbedding.created_at)
        ).offset(offset).limit(per_page).all()

        items = [
            DocumentItem(
                id=d.id,
                source=d.source or "",
                act_type=d.act_type,
                chunk_index=d.chunk_index or 0,
                content_preview=(d.content[:150] + "...") if d.content and len(d.content) > 150 else (d.content or ""),
                created_at=d.created_at,
            )
            for d in docs
        ]

        return DocumentListResponse(
            documents=items, total=total, page=page, per_page=per_page,
        )
    except Exception as e:
        logger.exception("Failed to list documents: %s", e)
        raise HTTPException(status_code=500, detail="Failed to list documents")


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a document embedding."""
    doc = db.query(DocumentEmbedding).filter(DocumentEmbedding.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return {"detail": "Document deleted", "id": str(doc_id)}


# =============================================================================
# Audit Logs
# =============================================================================
@router.get("/audit-logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Paginated, filterable audit log viewer."""
    try:
        query = db.query(AuditLog)
        if event_type:
            query = query.filter(AuditLog.event_type == event_type)
        if severity:
            query = query.filter(AuditLog.severity == severity)

        total = query.count()
        offset = (page - 1) * per_page

        logs = query.order_by(
            desc(AuditLog.timestamp)
        ).offset(offset).limit(per_page).all()

        items = []
        for log in logs:
            user_email = None
            if log.user_id:
                user = db.query(User.email).filter(User.id == log.user_id).first()
                user_email = user[0] if user else None

            items.append(AuditLogItem(
                id=log.id,
                event_type=log.event_type,
                user_email=user_email,
                ip_address=log.ip_address,
                severity=log.severity,
                details=log.details,
                timestamp=log.timestamp,
            ))

        return AuditLogListResponse(
            logs=items, total=total, page=page, per_page=per_page,
        )
    except Exception as e:
        logger.exception("Failed to list audit logs: %s", e)
        raise HTTPException(status_code=500, detail="Failed to list audit logs")


# =============================================================================
# System Settings
# =============================================================================
@router.get("/settings", response_model=SystemSettings)
async def get_settings(
    admin: User = Depends(require_admin),
):
    """Get current system settings from environment."""
    def _safe_int(name: str, default: int) -> int:
        try:
            return int(os.getenv(name, str(default)))
        except ValueError:
            logger.warning("Invalid int for env %s, using default %d", name, default)
            return default

    return SystemSettings(
        rate_limit_per_minute=_safe_int("RATE_LIMIT_PER_MINUTE", 100),
        rate_limit_burst=_safe_int("RATE_LIMIT_BURST", 20),
        rate_limit_enabled=os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true",
        enable_hsts=os.getenv("ENABLE_HSTS", "true").lower() == "true",
        enable_csp=os.getenv("ENABLE_CSP", "true").lower() == "true",
        debug=os.getenv("DEBUG", "false").lower() == "true",
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        app_env=os.getenv("APP_ENV", "production"),
    )
