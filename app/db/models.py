# Indian Law RAG Chatbot - SQLAlchemy ORM Models
"""
Database models for users, chat sessions, messages, and query logs.
Uses SQLAlchemy ORM with PostgreSQL-specific features.
"""

import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    Column, String, Text, Boolean, Integer, DateTime, Float,
    ForeignKey, Index, Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum

# pgvector support
try:
    from pgvector.sqlalchemy import Vector
    PGVECTOR_AVAILABLE = True
except ImportError:
    PGVECTOR_AVAILABLE = False
    Vector = None

from app.db.database import Base


# =============================================================================
# Enums
# =============================================================================
class MessageRole(str, enum.Enum):
    """Enum for chat message roles."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


# =============================================================================
# User Model
# =============================================================================
class User(Base):
    """
    User model for authentication and session tracking.
    
    Viva Explanation:
    - UUID primary key for security (non-sequential)
    - Hashed password storage using bcrypt
    - Relationship to chat sessions for query history
    """
    __tablename__ = "users"
    
    id = Column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4,
        comment="Unique user identifier"
    )
    email = Column(
        String(255), 
        unique=True, 
        nullable=False, 
        index=True,
        comment="User email address"
    )
    hashed_password = Column(
        String(255), 
        nullable=False,
        comment="Bcrypt hashed password"
    )
    full_name = Column(
        String(255), 
        nullable=True,
        comment="User's full name"
    )
    is_active = Column(
        Boolean, 
        default=True, 
        nullable=False,
        comment="Account active status"
    )
    is_superuser = Column(
        Boolean, 
        default=False, 
        nullable=False,
        comment="Admin privileges flag"
    )
    created_at = Column(
        DateTime, 
        default=datetime.utcnow, 
        nullable=False,
        comment="Account creation timestamp"
    )
    updated_at = Column(
        DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow,
        comment="Last update timestamp"
    )
    
    # OAuth fields
    google_id = Column(
        String(255),
        unique=True,
        nullable=True,
        index=True,
        comment="Google OAuth user ID"
    )
    auth_provider = Column(
        String(50),
        default="email",
        nullable=False,
        comment="Authentication provider: email, google"
    )
    picture_url = Column(
        String(500),
        nullable=True,
        comment="User profile picture URL"
    )
    
    # Relationships
    chat_sessions = relationship(
        "ChatSession", 
        back_populates="user", 
        cascade="all, delete-orphan"
    )
    query_logs = relationship(
        "QueryLog", 
        back_populates="user", 
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"


# =============================================================================
# Chat Session Model
# =============================================================================
class ChatSession(Base):
    """
    Chat session model for grouping related messages.
    
    Viva Explanation:
    - Each session contains multiple messages
    - Allows users to continue previous conversations
    - Title is auto-generated or user-defined
    """
    __tablename__ = "chat_sessions"
    
    id = Column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4,
        comment="Unique session identifier"
    )
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,  # Allow anonymous sessions
        index=True,
        comment="Reference to user"
    )
    title = Column(
        String(255), 
        nullable=True,
        default="New Chat",
        comment="Session title"
    )
    created_at = Column(
        DateTime, 
        default=datetime.utcnow, 
        nullable=False,
        comment="Session creation timestamp"
    )
    updated_at = Column(
        DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow,
        comment="Last activity timestamp"
    )
    
    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship(
        "ChatMessage", 
        back_populates="session", 
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at"
    )
    
    def __repr__(self) -> str:
        return f"<ChatSession(id={self.id}, title={self.title})>"


# =============================================================================
# Chat Message Model
# =============================================================================
class ChatMessage(Base):
    """
    Individual chat message within a session.
    
    Viva Explanation:
    - Role distinguishes between user queries and assistant responses
    - Sources stored as JSONB for flexible legal citation storage
    - JSONB allows efficient querying of nested data in PostgreSQL
    """
    __tablename__ = "chat_messages"
    
    id = Column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4,
        comment="Unique message identifier"
    )
    session_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Reference to chat session"
    )
    role = Column(
        SQLEnum(MessageRole, name="message_role"),
        nullable=False,
        comment="Message sender role"
    )
    content = Column(
        Text, 
        nullable=False,
        comment="Message content"
    )
    sources = Column(
        JSONB, 
        nullable=True,
        default=list,
        comment="Legal references for assistant messages"
    )
    created_at = Column(
        DateTime, 
        default=datetime.utcnow, 
        nullable=False,
        comment="Message timestamp"
    )
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    
    # Indexes for efficient querying
    __table_args__ = (
        Index("idx_messages_session_created", "session_id", "created_at"),
    )
    
    def __repr__(self) -> str:
        return f"<ChatMessage(id={self.id}, role={self.role})>"


# =============================================================================
# Query Log Model
# =============================================================================
class QueryLog(Base):
    """
    Log of all RAG queries for analytics and debugging.
    
    Viva Explanation:
    - Tracks every query for performance monitoring
    - Stores retrieved documents for debugging retrieval quality
    - Latency tracking for optimization
    """
    __tablename__ = "query_logs"
    
    id = Column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4,
        comment="Unique log identifier"
    )
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,  # Allow anonymous queries
        index=True,
        comment="Reference to user (if authenticated)"
    )
    query = Column(
        Text, 
        nullable=False,
        comment="User's original query"
    )
    retrieved_docs = Column(
        JSONB, 
        nullable=True,
        default=list,
        comment="List of retrieved document chunks"
    )
    response = Column(
        Text, 
        nullable=True,
        comment="Generated response"
    )
    sources = Column(
        JSONB, 
        nullable=True,
        default=list,
        comment="Cited legal sources"
    )
    latency_ms = Column(
        Integer, 
        nullable=True,
        comment="Response time in milliseconds"
    )
    was_successful = Column(
        Boolean, 
        default=True,
        comment="Whether query was answered successfully"
    )
    error_message = Column(
        Text, 
        nullable=True,
        comment="Error message if query failed"
    )
    created_at = Column(
        DateTime, 
        default=datetime.utcnow, 
        nullable=False,
        index=True,
        comment="Query timestamp"
    )
    
    # Relationships
    user = relationship("User", back_populates="query_logs")
    
    def __repr__(self) -> str:
        return f"<QueryLog(id={self.id}, query={self.query[:50]}...)>"


# =============================================================================
# Application Log Model (Optional - for structured logging)
# =============================================================================
class ApplicationLog(Base):
    """
    Structured application logs stored in database.
    Useful for production monitoring and debugging.
    """
    __tablename__ = "application_logs"
    
    id = Column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    level = Column(
        String(20), 
        nullable=False,
        index=True,
        comment="Log level (INFO, WARNING, ERROR, etc.)"
    )
    module = Column(
        String(255), 
        nullable=True,
        comment="Source module name"
    )
    message = Column(
        Text, 
        nullable=False,
        comment="Log message"
    )
    extra_data = Column(
        JSONB, 
        nullable=True,
        comment="Additional context data"
    )
    created_at = Column(
        DateTime, 
        default=datetime.utcnow, 
        nullable=False,
        index=True
    )
    
    # Index for efficient log querying
    __table_args__ = (
        Index("idx_logs_level_created", "level", "created_at"),
    )


# =============================================================================
# Document Embedding Model (pgvector)
# =============================================================================
class DocumentEmbedding(Base):
    """
    Store document embeddings using pgvector for semantic search.
    
    Viva Explanation:
    - Replaces FAISS file-based vector storage
    - Uses PostgreSQL pgvector extension for similarity search
    - 384 dimensions for all-MiniLM-L6-v2 embeddings
    - Enables SQL-based vector operations (cosine similarity, L2 distance)
    """
    __tablename__ = "document_embeddings"
    
    id = Column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4,
        comment="Unique embedding identifier"
    )
    content = Column(
        Text, 
        nullable=False,
        comment="Original document text chunk"
    )
    # Vector column for embeddings (384 dimensions for all-MiniLM-L6-v2)
    # Using conditional column creation to handle missing pgvector
    embedding = Column(
        Vector(384) if PGVECTOR_AVAILABLE else Text,
        nullable=False,
        comment="384-dimensional embedding vector"
    )
    # Metadata from original documents
    source = Column(
        String(255), 
        nullable=True,
        index=True,
        comment="Source document/act name"
    )
    section = Column(
        String(255), 
        nullable=True,
        comment="Section number or reference"
    )
    title = Column(
        String(500), 
        nullable=True,
        comment="Section or article title"
    )
    act_type = Column(
        String(100), 
        nullable=True,
        index=True,
        comment="Type of legal act (IPC, CrPC, Constitution, etc.)"
    )
    extra_data = Column(
        JSONB, 
        nullable=True,
        default=dict,
        comment="Additional metadata from source"
    )
    created_at = Column(
        DateTime, 
        default=datetime.utcnow, 
        nullable=False,
        comment="Embedding creation timestamp"
    )
    
    # Index for HNSW vector search (if pgvector supports it)
    __table_args__ = (
        Index("idx_embeddings_source", "source"),
        Index("idx_embeddings_act_type", "act_type"),
    )
    
    def __repr__(self) -> str:
        return f"<DocumentEmbedding(id={self.id}, source={self.source})>"


# =============================================================================
# User Profile Model (Per-User Context & Preferences)
# =============================================================================
class UserProfile(Base):
    """
    Extended user profile storing legal context and preferences.
    Enables personalized responses based on user's case history.
    
    Viva Explanation:
    - Stores user-specific details (location, case type, language)
    - Isolated per-user — no cross-user leakage
    - Used by RAG pipeline to personalize retrieval and responses
    """
    __tablename__ = "user_profiles"
    
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique profile identifier"
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        comment="Owner user — one profile per user"
    )
    location = Column(
        String(255),
        nullable=True,
        comment="User's location/state (for jurisdiction context)"
    )
    case_types = Column(
        JSONB,
        nullable=True,
        default=list,
        comment="List of case types user has asked about"
    )
    preferred_language = Column(
        String(10),
        nullable=True,
        default="en",
        comment="ISO 639-1 language code (e.g., hi, ta, te, en)"
    )
    legal_interests = Column(
        JSONB,
        nullable=True,
        default=list,
        comment="Topics of interest (e.g., property law, criminal law)"
    )
    extra_context = Column(
        JSONB,
        nullable=True,
        default=dict,
        comment="Arbitrary per-user context (key-value)"
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    
    # Relationship
    user = relationship("User", backref="profile")
    
    def __repr__(self) -> str:
        return f"<UserProfile(user_id={self.user_id}, lang={self.preferred_language})>"


# =============================================================================
# User Memory Model (Long-Term Persistent Memory per User)
# =============================================================================
class UserMemory(Base):
    """
    Per-user long-term memory entries.
    Stores summarized conversation insights for future recall.
    
    Viva Explanation:
    - Each row is a memory "fact" extracted from conversations
    - memory_type distinguishes: 'conversation_summary', 'user_fact', 'case_detail'
    - Indexed by user_id — queries are always scoped to one user
    - Optional embedding for semantic memory search
    """
    __tablename__ = "user_memories"
    
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique memory entry identifier"
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Owner user — strict isolation"
    )
    memory_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Type: conversation_summary, user_fact, case_detail, preference"
    )
    content = Column(
        Text,
        nullable=False,
        comment="The memory content (plain text summary)"
    )
    metadata_json = Column(
        JSONB,
        nullable=True,
        default=dict,
        comment="Extra metadata (session_id, act references, etc.)"
    )
    embedding = Column(
        Vector(384) if PGVECTOR_AVAILABLE else Text,
        nullable=True,
        comment="384-dim embedding for semantic memory retrieval"
    )
    importance_score = Column(
        Float,
        nullable=True,
        default=0.5,
        comment="0.0-1.0 importance for memory ranking"
    )
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="SET NULL"),
        nullable=True,
        comment="Source session (if applicable)"
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )
    expires_at = Column(
        DateTime,
        nullable=True,
        comment="Optional TTL for temporary memories"
    )
    
    # Relationship
    user = relationship("User", backref="memories")
    
    # Indexes for efficient per-user memory retrieval
    __table_args__ = (
        Index('idx_user_memory_user_type', 'user_id', 'memory_type'),
        Index('idx_user_memory_user_created', 'user_id', 'created_at'),
    )
    
    def __repr__(self) -> str:
        return f"<UserMemory(user_id={self.user_id}, type={self.memory_type})>"


# =============================================================================
# Encrypted Data Storage Model
# =============================================================================
class EncryptedData(Base):
    """
    End-to-end encrypted data storage.
    Server stores encrypted blobs without ability to decrypt user content.
    
    Viva Explanation:
    - All sensitive user data stored encrypted
    - Only user's device has decryption keys
    - Server cannot read chat messages/queries
    - Complies with zero-knowledge architecture
    """
    __tablename__ = "encrypted_data"
    
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique encrypted data identifier"
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Owner of this encrypted data"
    )
    data_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Type: chat_message, document, etc."
    )
    encrypted_content = Column(
        Text,
        nullable=False,
        comment="Base64 AES-256-GCM ciphertext"
    )
    iv = Column(
        String(255),
        nullable=False,
        comment="Initialization vector (base64)"
    )
    auth_tag = Column(
        String(255),
        nullable=False,
        comment="GCM authentication tag (base64)"
    )
    algorithm = Column(
        String(50),
        default="AES-256-GCM",
        nullable=False,
        comment="Encryption algorithm"
    )
    key_version = Column(
        Integer,
        default=1,
        nullable=False,
        comment="Key version for rotation"
    )
    content_hash = Column(
        String(64),
        nullable=True,
        index=True,
        comment="HMAC hash for searching (no plaintext)"
    )
    metadata_encrypted = Column(
        Text,
        nullable=True,
        comment="Encrypted metadata (Fernet)"
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
        comment="Creation timestamp"
    )
    expires_at = Column(
        DateTime,
        nullable=True,
        comment="Auto-deletion timestamp"
    )
    
    # Relationship
    user = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index('idx_encrypted_data_user_type', 'user_id', 'data_type'),
        Index('idx_encrypted_data_created', 'created_at'),
        Index('idx_encrypted_data_expires', 'expires_at'),
    )
    
    def __repr__(self) -> str:
        return f"<EncryptedData(id={self.id}, type={self.data_type})>"


# =============================================================================
# Audit Log Model (Security Events)
# =============================================================================
class AuditLog(Base):
    """
    Security audit log for compliance and threat detection.
    Records authentication events, access attempts, and security violations.
    """
    __tablename__ = "audit_logs"
    
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique audit log identifier"
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="User involved in event"
    )
    event_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Event type: login, logout, failed_auth, etc."
    )
    event_category = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Category: authentication, access_control, data_access"
    )
    severity = Column(
        String(20),
        nullable=False,
        index=True,
        comment="Severity: info, warning, critical"
    )
    ip_address = Column(
        String(45),
        nullable=True,
        comment="IPv4/IPv6 address"
    )
    user_agent = Column(
        Text,
        nullable=True,
        comment="User agent string"
    )
    details_encrypted = Column(
        Text,
        nullable=True,
        comment="Encrypted event details (may contain sensitive info)"
    )
    success = Column(
        Boolean,
        default=True,
        nullable=False,
        comment="Whether action succeeded"
    )
    timestamp = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
        comment="Event timestamp"
    )
    
    # Relationship
    user = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index('idx_audit_logs_user_time', 'user_id', 'timestamp'),
        Index('idx_audit_logs_type_time', 'event_type', 'timestamp'),
        Index('idx_audit_logs_severity', 'severity', 'timestamp'),
    )
    
    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, type={self.event_type}, severity={self.severity})>"
