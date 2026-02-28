# Admin Dashboard - Pydantic Schemas
"""
Request/response schemas for admin endpoints.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


# =============================================================================
# Dashboard Stats
# =============================================================================
class DashboardStats(BaseModel):
    """Aggregated statistics for the admin dashboard overview."""
    total_users: int = 0
    active_users: int = 0          # users active in last 7 days
    new_users_today: int = 0
    total_sessions: int = 0
    total_messages: int = 0
    total_queries: int = 0
    total_documents: int = 0
    avg_response_time_ms: float = 0.0
    queries_today: int = 0
    system_uptime: str = ""


# =============================================================================
# User Management
# =============================================================================
class UserAdminItem(BaseModel):
    """User row in the admin user list."""
    id: UUID
    email: str
    full_name: Optional[str] = None
    auth_provider: str = "email"
    picture_url: Optional[str] = None
    is_active: bool = True
    is_superuser: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    session_count: int = 0
    message_count: int = 0

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """Paginated user list."""
    users: List[UserAdminItem]
    total: int
    page: int
    per_page: int
    total_pages: int


class UserAdminDetail(UserAdminItem):
    """Extended user detail for admin view."""
    google_id: Optional[str] = None
    query_count: int = 0
    memory_count: int = 0
    last_active: Optional[datetime] = None
    recent_sessions: List[Dict[str, Any]] = []
    # Profile data
    location: Optional[str] = None
    preferred_language: str = "en"
    case_types: List[str] = []
    legal_interests: List[str] = []


class UserUpdateAdmin(BaseModel):
    """Fields an admin can update on any user."""
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    full_name: Optional[str] = None


# =============================================================================
# Query Analytics
# =============================================================================
class QueryDayStat(BaseModel):
    """Queries per day for charts."""
    date: str
    count: int


class TopTopic(BaseModel):
    """Most queried topic."""
    topic: str
    count: int


class QueryAnalytics(BaseModel):
    """Aggregated query analytics."""
    total_queries: int = 0
    queries_per_day: List[QueryDayStat] = []
    top_topics: List[TopTopic] = []
    avg_latency_ms: float = 0.0
    success_rate: float = 0.0


class QueryLogItem(BaseModel):
    """Single query log entry for the admin table."""
    id: UUID
    user_email: Optional[str] = None
    query_text: str
    response_length: int = 0
    latency_ms: int = 0
    num_sources: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class QueryLogListResponse(BaseModel):
    """Paginated query log list."""
    logs: List[QueryLogItem]
    total: int
    page: int
    per_page: int


# =============================================================================
# Document Management
# =============================================================================
class DocumentItem(BaseModel):
    """Document embedding entry for admin view."""
    id: UUID
    source: str
    act_type: Optional[str] = None
    chunk_index: int = 0
    content_preview: str = ""
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """Paginated document list."""
    documents: List[DocumentItem]
    total: int
    page: int
    per_page: int


# =============================================================================
# Audit Logs
# =============================================================================
class AuditLogItem(BaseModel):
    """Audit log entry for admin view."""
    id: UUID
    event_type: str
    user_email: Optional[str] = None
    ip_address: Optional[str] = None
    severity: str = "info"
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """Paginated audit log list."""
    logs: List[AuditLogItem]
    total: int
    page: int
    per_page: int


# =============================================================================
# System Settings
# =============================================================================
class SystemSettings(BaseModel):
    """System configuration (read/write)."""
    rate_limit_per_minute: int = 100
    rate_limit_burst: int = 20
    rate_limit_enabled: bool = True
    enable_hsts: bool = True
    enable_csp: bool = True
    debug: bool = False
    log_level: str = "INFO"
    app_env: str = "production"
