# Indian Law RAG Chatbot - Chat Routes
"""
Main chat endpoints for the RAG-powered legal question answering.
"""

from typing import Optional, List
from uuid import UUID
import json # Added for stream_generator

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db, get_independent_session
from app.db.models import User, MessageRole
from app.db.crud import ChatSessionCRUD, ChatMessageCRUD, QueryLogCRUD, UserProfileCRUD
from app.api.dependencies import get_current_user_optional, get_rag_pipeline_dep # Kept get_current_user_optional, get_rag_pipeline_dep
from app.core.rag_pipeline import RAGPipeline # Removed LegalSource from here, it's in schemas
from app.core.translation import translate_to_english, translate_from_english
from app.core.memory import store_conversation_summary, summarise_session_for_memory, get_short_term_context
from app.schemas.chat import (
    ChatRequest, ChatResponse, 
    ChatSessionSchema, ChatSessionDetailSchema, ChatMessageSchema,
    LegalSource
)
from fastapi.responses import StreamingResponse # Moved up
from app.utils.logging_config import get_logger

logger = get_logger(__name__)

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
    
    # ── Translation: detect language & translate to English ──
    original_query = request.query
    detected_lang = "en"
    try:
        # If user has a saved preferred language, use it as hint
        source_hint = None
        if user:
            profile = UserProfileCRUD.get_or_create(db, user.id)
            source_hint = profile.preferred_language
        translated_query, detected_lang = translate_to_english(
            request.query, source_lang=source_hint
        )
        # Update user's preferred language if auto-detected
        if user and detected_lang != "en":
            UserProfileCRUD.update(db, user.id, preferred_language=detected_lang)
    except Exception as e:
        logger.warning(f"Translation failed, using original query: {e}")
        translated_query = request.query
    
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
    
    # Store user message (original language)
    ChatMessageCRUD.create(
        db=db,
        session_id=session.id,
        role=MessageRole.USER,
        content=original_query
    )
    
    try:
        # Execute RAG pipeline with memory context
        answer, sources, is_fallback, latency_ms = rag.query(
            translated_query,
            db=db,
            user_id=user_id,
            session_id=session.id
        )
        
        # Convert sources to dict for storage
        sources_dict = [s.model_dump() for s in sources]
        
        # ── Translate response back to user's language ──
        display_answer = answer
        if detected_lang != "en":
            try:
                display_answer = translate_from_english(answer, detected_lang)
            except Exception as e:
                logger.warning(f"Response translation failed: {e}")
        
        # Store assistant message (English canonical form)
        ChatMessageCRUD.create(
            db=db,
            session_id=session.id,
            role=MessageRole.ASSISTANT,
            content=answer,
            sources=sources_dict
        )
        
        # ── Store conversation summary as long-term memory ──
        if user_id and not is_fallback:
            try:
                short_ctx = get_short_term_context(db, session.id, max_messages=4)
                summary = summarise_session_for_memory(short_ctx, llm=rag.llm)
                store_conversation_summary(
                    db, user_id, session.id, summary, importance=0.6
                )
            except Exception as e:
                logger.warning(f"Memory storage failed (non-fatal): {e}")
        
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
            answer=display_answer,
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


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    user: Optional[User] = Depends(get_current_user_optional),
    rag: RAGPipeline = Depends(get_rag_pipeline_dep)
):
    """
    Stream chat response (Server-Sent Events).
    
    Viva Explanation:
    - Uses async generator to stream tokens to client
    - Prevents blocking event loop
    - Handles independent DB session for saving logs
    """
    user_id = user.id if user else None
    
    # Get or create chat session (this part needs to be done before streaming starts
    # to get the session_id for the initial user message and for the stream)
    session_id_for_stream = None
    with get_independent_session() as db_session:
        if request.session_id:
            session = ChatSessionCRUD.get_by_id(db_session, request.session_id)
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Chat session not found"
                )
            session_id_for_stream = session.id
        else:
            title = request.query[:50] + "..." if len(request.query) > 50 else request.query
            session = ChatSessionCRUD.create(db_session, user_id=user_id, title=title)
            session_id_for_stream = session.id
        
        # Store user message immediately in the same session
        ChatMessageCRUD.create(
            db=db_session,
            session_id=session_id_for_stream,
            role=MessageRole.USER,
            content=request.query
        )

    async def stream_generator():
        full_answer = ""
        sources = []
        is_fallback = False
        latency_ms = 0
        
        try:
            # Yield session ID first as a special event
            yield f"event: session\ndata: {session_id_for_stream}\n\n"
            
            # Stream tokens asynchronously
            async for chunk in rag.aquery_stream(request.query):
                if chunk.startswith("\n__METADATA__:"):
                    # Extract metadata from the final chunk
                    meta_json = chunk.replace("\n__METADATA__:", "")
                    try:
                        metadata = json.loads(meta_json)
                        # Reconstruct sources objects
                        sources_data = metadata.get('sources', [])
                        sources = [LegalSource(**s) for s in sources_data]
                        is_fallback = metadata.get('is_fallback', False)
                        latency_ms = metadata.get('latency_ms', 0)
                        
                        # Send the metadata event to client
                        yield f"event: metadata\ndata: {meta_json}\n\n"
                    except Exception as e:
                        logger.error(f"Failed to parse metadata: {e}")
                else:
                    # Append to full answer and yield
                    full_answer += chunk
                    # SSE format: "data: <content>\n\n"
                    # We need to escape newlines for SSE data payload if strictly following spec,
                    # but simple data: <chunk> usually suffices for text fragments.
                    # Better to use JSON or specialized encoding if expecting complex chars.
                    # Here we assume simple text.
                    yield f"data: {chunk}\n\n"
            
            # Save logs using a fresh session
            if full_answer:
                try:
                    with get_independent_session() as db_session:
                        # Store assistant message
                        ChatMessageCRUD.create(
                            db=db_session,
                            session_id=session_id_for_stream,
                            role=MessageRole.ASSISTANT,
                            content=full_answer,
                            sources=[s.model_dump() for s in sources] # Convert LegalSource objects back to dicts for storage
                        )
                        
                        QueryLogCRUD.create(
                            db=db_session,
                            query=request.query,
                            user_id=user_id,
                            retrieved_docs=[s.model_dump() for s in sources], # Convert LegalSource objects back to dicts for storage
                            response=full_answer,
                            sources=[s.model_dump() for s in sources], # Convert LegalSource objects back to dicts for storage
                            latency_ms=latency_ms,
                            was_successful=not is_fallback
                        )
                        logger.info(f"Stream logs saved for user {user_id}, session {session_id_for_stream}")
                        
                except Exception as e:
                    logger.error(f"Error saving stream result: {e}")
                    # Compensating record: mark the assistant response as failed
                    try:
                        with get_independent_session() as fallback_db:
                            ChatMessageCRUD.create(
                                db=fallback_db,
                                session_id=session_id_for_stream,
                                role=MessageRole.ASSISTANT,
                                content="[Assistant response failed to save; please retry]"
                            )
                            QueryLogCRUD.create(
                                db=fallback_db,
                                query=request.query,
                                user_id=user_id,
                                retrieved_docs=[],
                                response="internal error",
                                sources=[],
                                latency_ms=latency_ms,
                                was_successful=False
                            )
                            logger.exception("Full exception for failed stream persistence")
                    except Exception as fallback_err:
                        logger.error(f"Compensating record also failed: {fallback_err}")
                    
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"event: error\ndata: {json.dumps({'error': 'Stream generation failed'})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream"
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
