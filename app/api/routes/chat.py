# Indian Law RAG Chatbot - Chat Routes
"""
Main chat endpoints for the RAG-powered legal question answering.
"""

from typing import Optional, List
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User, MessageRole
from app.db.crud import ChatSessionCRUD, ChatMessageCRUD, QueryLogCRUD
from app.api.dependencies import get_current_user_optional, get_rag_pipeline_dep
from app.core.rag_pipeline import RAGPipeline
from app.schemas.chat import (
    ChatRequest, ChatResponse, 
    ChatSessionSchema, ChatSessionDetailSchema, ChatMessageSchema,
    LegalSource
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
    rag: RAGPipeline = Depends(get_rag_pipeline_dep)
) -> ChatResponse:
    """
    Main chat endpoint for legal question answering.
    
    Workflow:
    1. Retrieve relevant legal documents from FAISS
    2. Generate response using LLM with retrieved context
    3. Store conversation in database
    4. Return response with legal citations
    
    Args:
        request: Chat request with query and optional session_id
        db: Database session
        user: Optional authenticated user
        rag: RAG pipeline instance
        
    Returns:
        ChatResponse: Generated answer with sources and session ID
        
    Viva Explanation:
    - Entire RAG pipeline is executed here
    - Anti-hallucination is enforced through prompts
    - All queries are logged for analytics
    """
    user_id = user.id if user else None
    
    # Get or create chat session
    if request.session_id:
        session = ChatSessionCRUD.get_by_id(db, request.session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found"
            )
    else:
        # Create new session with query as initial title
        title = request.query[:50] + "..." if len(request.query) > 50 else request.query
        session = ChatSessionCRUD.create(db, user_id=user_id, title=title)
    
    # Store user message
    ChatMessageCRUD.create(
        db=db,
        session_id=session.id,
        role=MessageRole.USER,
        content=request.query
    )
    
    try:
        # Execute RAG pipeline
        answer, sources, is_fallback, latency_ms = rag.query(request.query)
        
        # Convert sources to dict for storage
        sources_dict = [s.model_dump() for s in sources]
        
        # Store assistant message
        ChatMessageCRUD.create(
            db=db,
            session_id=session.id,
            role=MessageRole.ASSISTANT,
            content=answer,
            sources=sources_dict
        )
        
        # Log query for analytics
        QueryLogCRUD.create(
            db=db,
            query=request.query,
            user_id=user_id,
            retrieved_docs=sources_dict,
            response=answer,
            sources=sources_dict,
            latency_ms=latency_ms,
            was_successful=not is_fallback
        )
        
        logger.info(
            f"Chat query completed: user={user_id}, "
            f"session={session.id}, latency={latency_ms}ms"
        )
        
        return ChatResponse(
            answer=answer,
            sources=sources,
            session_id=session.id,
            is_fallback=is_fallback,
            latency_ms=latency_ms
        )
    
    except Exception as e:
        # Enhanced structured error logging
        import traceback
        error_details = {
            "error_type": type(e).__name__,
            "error_message": str(e),
            "query": request.query[:100],  # Truncate for logging
            "user_id": str(user_id) if user_id else None,
            "session_id": str(session.id) if session else None,
            "traceback": traceback.format_exc()
        }
        logger.error(f"Chat error: {error_details}")
        
        # Log failed query with error details
        QueryLogCRUD.create(
            db=db,
            query=request.query,
            user_id=user_id,
            was_successful=False,
            error_message=f"{type(e).__name__}: {str(e)}"
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing query: {str(e)}"
        )


@router.get("/sessions", response_model=List[ChatSessionSchema])
async def get_chat_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_optional),
    limit: int = 20,
    offset: int = 0
) -> List[ChatSessionSchema]:
    """
    Get user's chat sessions.
    
    Args:
        db: Database session
        user: Authenticated user
        limit: Maximum sessions to return
        offset: Pagination offset
        
    Returns:
        List[ChatSessionSchema]: User's chat sessions
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to view sessions"
        )
    
    sessions = ChatSessionCRUD.get_user_sessions(
        db, user.id, limit=limit, offset=offset
    )
    
    return [
        ChatSessionSchema(
            id=s.id,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=len(s.messages)
        )
        for s in sessions
    ]


@router.get("/sessions/{session_id}", response_model=ChatSessionDetailSchema)
async def get_chat_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
) -> ChatSessionDetailSchema:
    """
    Get a specific chat session with messages.
    
    Args:
        session_id: Session UUID
        db: Database session
        user: Optional authenticated user
        
    Returns:
        ChatSessionDetailSchema: Session with full message history
    """
    session = ChatSessionCRUD.get_by_id(db, session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    # Check access (if session has user_id, only that user can access)
    if session.user_id and (not user or session.user_id != user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this session"
        )
    
    messages = ChatMessageCRUD.get_session_messages(db, session_id)
    
    return ChatSessionDetailSchema(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=len(messages),
        messages=[
            ChatMessageSchema(
                id=m.id,
                role=m.role.value,
                content=m.content,
                sources=[LegalSource(**s) for s in (m.sources or [])],
                created_at=m.created_at
            )
            for m in messages
        ]
    )


@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_optional)
) -> dict:
    """
    Delete a chat session.
    
    Args:
        session_id: Session UUID to delete
        db: Database session
        user: Authenticated user
        
    Returns:
        dict: Deletion confirmation
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    session = ChatSessionCRUD.get_by_id(db, session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    if session.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete another user's session"
        )
    
    ChatSessionCRUD.delete(db, session)
    
    return {"message": "Session deleted successfully", "session_id": str(session_id)}
