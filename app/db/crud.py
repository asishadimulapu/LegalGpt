# Indian Law RAG Chatbot - Database CRUD Operations
"""
Create, Read, Update, Delete operations for database models.
Provides a clean abstraction layer over SQLAlchemy operations.

PRODUCTION NOTES:
- All write operations handle transactions explicitly
- Rollback on failure to prevent connection state corruption
- Flush before refresh to ensure database state is current
"""

import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy import desc
import logging

from app.db.models import User, ChatSession, ChatMessage, QueryLog, MessageRole
from app.schemas.user import UserCreate
from app.utils.auth import get_password_hash, verify_password

logger = logging.getLogger(__name__)


# =============================================================================
# User CRUD Operations
# =============================================================================
class UserCRUD:
    """CRUD operations for User model."""
    
    @staticmethod
    def create(db: Session, user_data: UserCreate) -> User:
        """
        Create a new user with proper transaction handling.
        
        Args:
            db: Database session
            user_data: User creation data
            
        Returns:
            User: Created user object
            
        Raises:
            SQLAlchemyError: If database operation fails
        """
        db_user = None
        try:
            hashed_password = get_password_hash(user_data.password)
            db_user = User(
                email=user_data.email,
                hashed_password=hashed_password,
                full_name=user_data.full_name
            )
            db.add(db_user)
            db.flush()  # Flush to get ID without committing
            db.refresh(db_user)  # Refresh to get DB-generated values
            db.commit()
            logger.info(f"Created user: {db_user.email}")
            return db_user
        except IntegrityError as e:
            db.rollback()
            logger.warning(f"User creation failed (duplicate): {user_data.email}")
            raise
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"User creation failed: {e}")
            raise
    
    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        """
        Get user by email address.
        
        Returns:
            User if found, None if not found
            
        Raises:
            SQLAlchemyError: If database query fails
        """
        try:
            return db.query(User).filter(User.email == email).first()
        except SQLAlchemyError as e:
            logger.exception(f"Failed to get user by email '{email}': {e}")
            raise
    
    @staticmethod
    def get_by_id(db: Session, user_id: uuid.UUID) -> Optional[User]:
        """
        Get user by ID.
        
        Returns:
            User if found, None if not found
            
        Raises:
            SQLAlchemyError: If database query fails
        """
        try:
            return db.query(User).filter(User.id == user_id).first()
        except SQLAlchemyError as e:
            logger.exception(f"Failed to get user by ID '{user_id}': {e}")
            raise
    
    @staticmethod
    def authenticate(db: Session, email: str, password: str) -> Optional[User]:
        """
        Authenticate user with email and password.
        
        Returns:
            User if authentication successful, None otherwise
        """
        user = UserCRUD.get_by_email(db, email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
    
    @staticmethod
    def update_password(db: Session, user: User, new_password: str) -> User:
        """Update user's password with proper transaction handling."""
        try:
            user.hashed_password = get_password_hash(new_password)
            db.flush()
            db.commit()
            db.refresh(user)
            return user
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Password update failed: {e}")
            raise
    
    # -------------------------------------------------------------------------
    # OAuth Methods
    # -------------------------------------------------------------------------
    @staticmethod
    def get_by_google_id(db: Session, google_id: str) -> Optional[User]:
        """
        Get user by Google OAuth ID.
        
        Returns:
            User if found, None if not found
        """
        try:
            return db.query(User).filter(User.google_id == google_id).first()
        except SQLAlchemyError as e:
            logger.exception(f"Failed to get user by google_id: {e}")
            raise
    
    @staticmethod
    def create_google_user(
        db: Session,
        email: str,
        full_name: str,
        google_id: str,
        picture_url: Optional[str] = None
    ) -> User:
        """
        Create a new user from Google OAuth.
        
        Args:
            db: Database session
            email: User's email from Google
            full_name: User's name from Google
            google_id: Google's unique user ID
            picture_url: Google profile picture URL
            
        Returns:
            User: Created user object
        """
        try:
            # Generate a random secure password (user won't use it)
            import secrets
            random_password = secrets.token_urlsafe(32)
            hashed_password = get_password_hash(random_password)
            
            db_user = User(
                email=email,
                hashed_password=hashed_password,
                full_name=full_name,
                google_id=google_id,
                auth_provider="google",
                picture_url=picture_url
            )
            db.add(db_user)
            db.flush()
            db.refresh(db_user)
            db.commit()
            logger.info(f"Created Google OAuth user: {email}")
            return db_user
        except IntegrityError as e:
            db.rollback()
            logger.warning(f"Google user creation failed (duplicate): {email}")
            raise
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Google user creation failed: {e}")
            raise
    
    @staticmethod
    def link_google_account(
        db: Session,
        user: User,
        google_id: str,
        picture_url: Optional[str] = None
    ) -> User:
        """
        Link an existing email user to their Google account.
        
        Args:
            db: Database session
            user: Existing user to link
            google_id: Google's unique user ID
            picture_url: Google profile picture URL
            
        Returns:
            User: Updated user object
        """
        try:
            user.google_id = google_id
            user.auth_provider = "google"
            if picture_url:
                user.picture_url = picture_url
            db.flush()
            db.commit()
            db.refresh(user)
            logger.info(f"Linked Google account for user: {user.email}")
            return user
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Failed to link Google account: {e}")
            raise


# =============================================================================
# Chat Session CRUD Operations
# =============================================================================
class ChatSessionCRUD:
    """CRUD operations for ChatSession model."""
    
    @staticmethod
    def create(
        db: Session, 
        user_id: Optional[uuid.UUID] = None,
        title: str = "New Chat"
    ) -> ChatSession:
        """
        Create a new chat session with proper transaction handling.
        
        Raises:
            SQLAlchemyError: If database operation fails
        """
        session = ChatSession(user_id=user_id, title=title)
        try:
            db.add(session)
            db.flush()
            db.refresh(session)
            db.commit()
            logger.info(f"Created chat session: {session.id}")
            return session
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Failed to create chat session: {e}", exc_info=True)
            raise
    
    @staticmethod
    def get_by_id(db: Session, session_id: uuid.UUID) -> Optional[ChatSession]:
        """Get chat session by ID."""
        return db.query(ChatSession).filter(ChatSession.id == session_id).first()
    
    @staticmethod
    def get_user_sessions(
        db: Session, 
        user_id: uuid.UUID,
        limit: int = 20,
        offset: int = 0
    ) -> List[ChatSession]:
        """Get all chat sessions for a user."""
        return (
            db.query(ChatSession)
            .filter(ChatSession.user_id == user_id)
            .order_by(desc(ChatSession.updated_at))
            .offset(offset)
            .limit(limit)
            .all()
        )
    
    @staticmethod
    def update_title(
        db: Session, 
        session: ChatSession, 
        title: str
    ) -> ChatSession:
        """
        Update session title with proper transaction handling.
        
        Raises:
            SQLAlchemyError: If database operation fails
        """
        try:
            session.title = title
            session.updated_at = datetime.utcnow()
            db.flush()
            db.commit()
            db.refresh(session)
            return session
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Failed to update chat session title (id={session.id}): {e}", exc_info=True)
            raise
    
    @staticmethod
    def delete(db: Session, session: ChatSession) -> None:
        """
        Delete a chat session and all its messages with proper transaction handling.
        
        Raises:
            SQLAlchemyError: If database operation fails
        """
        session_id = session.id  # Capture before delete
        try:
            db.delete(session)
            db.commit()
            logger.info(f"Deleted chat session: {session_id}")
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Failed to delete chat session (id={session_id}): {e}", exc_info=True)
            raise


# =============================================================================
# Chat Message CRUD Operations
# =============================================================================
class ChatMessageCRUD:
    """CRUD operations for ChatMessage model."""
    
    @staticmethod
    def create(
        db: Session,
        session_id: uuid.UUID,
        role: MessageRole,
        content: str,
        sources: Optional[List[dict]] = None
    ) -> ChatMessage:
        """Create a new chat message."""
        message = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            sources=sources or []
        )
        db.add(message)
        
        # Update session's updated_at timestamp
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id
        ).first()
        if session:
            session.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(message)
        return message
    
    @staticmethod
    def get_session_messages(
        db: Session,
        session_id: uuid.UUID,
        limit: Optional[int] = None
    ) -> List[ChatMessage]:
        """Get all messages in a session."""
        query = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
        )
        if limit:
            query = query.limit(limit)
        return query.all()
    
    @staticmethod
    def get_recent_context(
        db: Session,
        session_id: uuid.UUID,
        limit: int = 10
    ) -> List[ChatMessage]:
        """Get recent messages for conversation context."""
        return (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(desc(ChatMessage.created_at))
            .limit(limit)
            .all()
        )[::-1]  # Reverse to get chronological order


# =============================================================================
# Query Log CRUD Operations
# =============================================================================
class QueryLogCRUD:
    """CRUD operations for QueryLog model."""
    
    @staticmethod
    def create(
        db: Session,
        query: str,
        user_id: Optional[uuid.UUID] = None,
        retrieved_docs: Optional[List[dict]] = None,
        response: Optional[str] = None,
        sources: Optional[List[dict]] = None,
        latency_ms: Optional[int] = None,
        was_successful: bool = True,
        error_message: Optional[str] = None
    ) -> QueryLog:
        """Log a RAG query."""
        log = QueryLog(
            user_id=user_id,
            query=query,
            retrieved_docs=retrieved_docs or [],
            response=response,
            sources=sources or [],
            latency_ms=latency_ms,
            was_successful=was_successful,
            error_message=error_message
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
    
    @staticmethod
    def get_user_queries(
        db: Session,
        user_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0
    ) -> List[QueryLog]:
        """Get query history for a user."""
        return (
            db.query(QueryLog)
            .filter(QueryLog.user_id == user_id)
            .order_by(desc(QueryLog.created_at))
            .offset(offset)
            .limit(limit)
            .all()
        )
    
    @staticmethod
    def get_failed_queries(
        db: Session,
        limit: int = 100
    ) -> List[QueryLog]:
        """Get recent failed queries for debugging."""
        return (
            db.query(QueryLog)
            .filter(QueryLog.was_successful == False)
            .order_by(desc(QueryLog.created_at))
            .limit(limit)
            .all()
        )
    
    @staticmethod
    def get_average_latency(db: Session, days: int = 7) -> float:
        """Get average query latency over the specified period."""
        from sqlalchemy import func
        from datetime import timedelta
        
        cutoff = datetime.utcnow() - timedelta(days=days)
        result = (
            db.query(func.avg(QueryLog.latency_ms))
            .filter(QueryLog.created_at >= cutoff)
            .filter(QueryLog.latency_ms.isnot(None))
            .scalar()
        )
        return float(result) if result else 0.0
