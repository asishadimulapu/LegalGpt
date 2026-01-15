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
    metadata = Column(
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
