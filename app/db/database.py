# Indian Law RAG Chatbot - Database Connection
"""
PostgreSQL database connection and session management using SQLAlchemy.
Provides both sync and async database capabilities with production-ready
connection pool configuration.

PRODUCTION NOTES:
- pool_pre_ping: Validates connections before use (handles PostgreSQL restarts)
- pool_recycle: Prevents connections from exceeding PostgreSQL's idle timeout
- pool_size/max_overflow: Tuned for concurrent load without exhaustion
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import SQLAlchemyError, DisconnectionError
from typing import Generator
from contextlib import contextmanager
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# =============================================================================
# SQLAlchemy Base Class
# =============================================================================
Base = declarative_base()

# =============================================================================
# Database Engine Configuration - PRODUCTION READY
# =============================================================================
# 
# Connection Pool Sizing Guide:
# - pool_size: (2 * CPU cores) + effective_spindle_count for PostgreSQL
# - max_overflow: Handle burst traffic without permanent resource allocation
# - For Azure PostgreSQL Basic tier: pool_size=5, max_overflow=5
# - For Standard tier: pool_size=10, max_overflow=10
#
# Timeout Configuration:
# - pool_recycle: Must be LESS than PostgreSQL's idle_session_timeout (default 0 = no timeout)
# - Azure PostgreSQL default idle timeout is 10 minutes, so 300s is safe
# - pool_timeout: How long to wait for a connection from pool before error
#
engine = create_engine(
    settings.database_url,
    poolclass=QueuePool,
    # =========================================================================
    # CRITICAL: pool_pre_ping validates connections before checkout
    # This prevents "server closed the connection unexpectedly" errors
    # by issuing a SELECT 1 before each connection use
    # =========================================================================
    pool_pre_ping=True,
    
    # Connection pool sizing
    pool_size=5,               # Persistent connections to keep open
    max_overflow=5,            # Additional connections during burst (reduced from 10)
    
    # Timeout configuration
    pool_timeout=30,           # Seconds to wait for available connection
    pool_recycle=300,          # Recycle connections every 5 minutes (was 30 min)
                               # Must be < PostgreSQL idle_session_timeout
    
    # Query timeout to prevent hung connections
    connect_args={
        "connect_timeout": 10,           # Connection establishment timeout
        "options": "-c statement_timeout=30000"  # 30s query timeout
    },
    
    echo=settings.debug,       # Log SQL queries in debug mode
)


# =============================================================================
# Session Factory
# =============================================================================
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # Prevent lazy-load issues after commit
)


# =============================================================================
# Independent Session Factory (for audit logging, background tasks)
# =============================================================================
def get_independent_session() -> Session:
    """
    Get an independent session for operations that should not share
    the request's transaction (audit logging, async tasks, etc.).
    
    IMPORTANT: Caller is responsible for closing this session!
    
    Usage:
        session = get_independent_session()
        try:
            # do work
            session.commit()
        finally:
            session.close()
    """
    return SessionLocal()


@contextmanager
def get_scoped_session():
    """
    Context manager for independent database sessions.
    Automatically handles commit/rollback and cleanup.
    
    Usage:
        with get_scoped_session() as session:
            session.add(obj)
            # auto-commits on exit, auto-rollbacks on exception
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except SQLAlchemyError as e:
        session.rollback()
        logger.error(f"Database error in scoped session: {e}")
        raise
    finally:
        session.close()


# =============================================================================
# Database Event Listeners
# =============================================================================
@event.listens_for(engine, "connect")
def set_connection_options(dbapi_connection, connection_record):
    """
    Event listener for connection establishment.
    Configure connection-level settings.
    """
    logger.debug("Database connection established")
    # Set application name for PostgreSQL monitoring
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("SET application_name = 'legalgpt_app'")
    finally:
        cursor.close()


@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_connection, connection_record, connection_proxy):
    """
    Event listener for connection checkout from pool.
    Useful for monitoring connection usage.
    """
    logger.debug("Connection checked out from pool")


@event.listens_for(engine, "invalidate")
def receive_invalidate(dbapi_connection, connection_record, exception):
    """
    Log when a connection is invalidated (disconnected).
    Helps diagnose connection issues.
    """
    if exception:
        logger.warning(f"Connection invalidated due to: {exception}")
    else:
        logger.debug("Connection invalidated (soft)")


@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_connection, connection_record):
    """
    Event listener for connection return to pool.
    """
    logger.debug("Connection returned to pool")


# =============================================================================
# Dependency Injection for FastAPI
# =============================================================================
def get_db() -> Generator[Session, None, None]:
    """
    Dependency that provides a database session.
    
    Yields:
        Session: SQLAlchemy database session
        
    Usage in FastAPI:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
            
    IMPORTANT:
    - Session is automatically closed after request
    - Rollback is performed on exceptions to clean up transaction state
    - Connection is returned to pool for reuse
    """
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error, rolling back: {e}")
        raise
    finally:
        db.close()


# =============================================================================
# Database Initialization
# =============================================================================
def init_db() -> None:
    """
    Initialize database tables.
    Creates all tables defined in the models.
    
    Viva Explanation:
    - Uses SQLAlchemy's create_all() method
    - Safe to call multiple times (won't recreate existing tables)
    - Should be called on application startup
    """
    from app.db import models  # noqa: F401 - Import models to register them
    
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")


def check_db_connection() -> bool:
    """
    Check if database connection is healthy.
    
    Returns:
        bool: True if connection is successful, False otherwise
    """
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False
