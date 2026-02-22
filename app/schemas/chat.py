# Indian Law RAG Chatbot - Chat Schemas
"""
Pydantic schemas for chat-related request/response validation.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


# =============================================================================
# Legal Source Schema
# =============================================================================
class LegalSource(BaseModel):
    """
    Schema for legal source citations.
    
    Viva Explanation:
    - Provides structured citation format
    - Includes Act name, section, and relevant content
    - Optional relevance score for ranking sources
    """
    act: str = Field(..., description="Name of the legal act/code")
    section: Optional[str] = Field(None, description="Section or Article number")
    title: Optional[str] = Field(None, description="Section title if available")
    content: str = Field(..., description="Relevant text excerpt")
    relevance_score: Optional[float] = Field(
        None, 
        ge=0, 
        le=1, 
        description="Similarity score (0-1)"
    )


# =============================================================================
# Chat Request Schemas
# =============================================================================
class ChatRequest(BaseModel):
    """
    Schema for chat endpoint request.
    
    Example:
        {
            "query": "What is Article 21 of the Constitution?",
            "session_id": "optional-uuid",
            "language": "hi"
        }
    """
    query: str = Field(
        ..., 
        min_length=3,
        max_length=2000,
        description="Legal question to answer"
    )
    session_id: Optional[UUID] = Field(
        None, 
        description="Optional session ID to continue conversation"
    )
    language: Optional[str] = Field(
        None,
        min_length=2,
        max_length=10,
        description="ISO 639-1 language code (e.g., 'hi', 'ta'). Auto-detected if omitted."
    )


class RetrievalRequest(BaseModel):
    """Schema for retrieval-only endpoint (no LLM generation)."""
    query: str = Field(
        ..., 
        min_length=3,
        max_length=2000,
        description="Query for document retrieval"
    )
    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of documents to retrieve"
    )


# =============================================================================
# Chat Response Schemas
# =============================================================================
class ChatResponse(BaseModel):
    """
    Schema for chat endpoint response.
    
    Viva Explanation:
    - answer: The generated response grounded in retrieved documents
    - sources: List of legal citations supporting the answer
    - session_id: For continuing the conversation
    - fallback: True if answer was not found in documents
    """
    answer: str = Field(..., description="Generated response")
    sources: List[LegalSource] = Field(
        default_factory=list, 
        description="Legal sources cited"
    )
    session_id: UUID = Field(..., description="Chat session ID")
    is_fallback: bool = Field(
        default=False, 
        description="True if answer not found in documents"
    )
    latency_ms: Optional[int] = Field(
        None, 
        description="Response time in milliseconds"
    )


class RetrievalResponse(BaseModel):
    """Schema for retrieval-only endpoint response."""
    query: str = Field(..., description="Original query")
    documents: List[LegalSource] = Field(
        default_factory=list,
        description="Retrieved document chunks"
    )
    total_found: int = Field(..., description="Number of documents retrieved")


# =============================================================================
# Chat History Schemas
# =============================================================================
class ChatMessageSchema(BaseModel):
    """Schema for individual chat message."""
    id: UUID
    role: str = Field(..., description="'user' or 'assistant'")
    content: str
    sources: Optional[List[LegalSource]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChatSessionSchema(BaseModel):
    """Schema for chat session summary."""
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = None
    
    class Config:
        from_attributes = True


class ChatSessionDetailSchema(ChatSessionSchema):
    """Schema for chat session with full message history."""
    messages: List[ChatMessageSchema] = Field(default_factory=list)


# =============================================================================
# Error Schemas
# =============================================================================
class ErrorResponse(BaseModel):
    """Standard error response schema."""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict] = Field(None, description="Additional error details")
