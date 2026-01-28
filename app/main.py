# Indian Law RAG Chatbot - Main FastAPI Application
"""
Main application entry point. Configures FastAPI, middleware, and routes.

Viva Explanation:
- FastAPI is a modern, high-performance Python web framework
- Built on Starlette (ASGI) and Pydantic (validation)
- Automatic OpenAPI documentation at /docs
- Async-first design for high concurrency
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time

from app.config import settings
from app.db.database import init_db
from app.core.vector_store import vector_store_manager
from app.api.routes import health, chat, retrieval, auth, upload
from app.utils.logging_config import setup_logging

# Initialize logging
logger = setup_logging()


# =============================================================================
# Application Lifespan Events
# =============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application startup and shutdown events.
    
    Startup:
    - Initialize database tables
    - Load FAISS vector store
    
    Shutdown:
    - Clean up resources
    
    Viva Explanation:
    - lifespan context manager replaces deprecated on_event decorators
    - Resources are properly initialized before serving requests
    - Cleanup happens on graceful shutdown
    """
    # -------------------------------------------------------------------------
    # Startup
    # -------------------------------------------------------------------------
    logger.info("=" * 60)
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.app_env}")
    logger.info(f"LLM Provider: {settings.llm_provider}")
    logger.info("=" * 60)
    
    # Initialize database
    try:
        init_db()
        logger.info("✓ Database initialized")
    except Exception as e:
        logger.error(f"✗ Database initialization failed: {e}")
        # Continue anyway - database might just need connection
    
    # Load vector store
    # NOTE: Disabled for deployment speed. Lazy loading implemented in vector_store.py
    # try:
    #     vector_store_manager.load()
    #     doc_count = vector_store_manager.get_document_count()
    #     logger.info(f"✓ Vector store loaded ({doc_count} documents)")
    # except FileNotFoundError:
    #     logger.warning(
    #         "⚠ Vector store not found. Run 'python scripts/create_embeddings.py' "
    #         "to create the FAISS index."
    #     )
    # except Exception as e:
    #     logger.error(f"✗ Vector store loading failed: {e}")
    
    logger.info("Application startup complete")
    logger.info("=" * 60)
    
    yield  # Application runs here
    
    # -------------------------------------------------------------------------
    # Shutdown
    # -------------------------------------------------------------------------
    logger.info("Shutting down application...")
    logger.info("Cleanup complete")


# =============================================================================
# Create FastAPI Application
# =============================================================================
app = FastAPI(
    title=settings.app_name,
    description="""
    ## Indian Law RAG Chatbot API
    
    An AI-powered legal question answering system based on Indian law documents.
    
    ### Features
    - 🔍 **Semantic Search**: Find relevant legal sections using natural language
    - 🤖 **RAG Pipeline**: Answers grounded exclusively in legal documents
    - 📝 **Citations**: Every answer includes legal references
    - 💬 **Chat History**: Continue conversations across sessions
    - 🔒 **Anti-Hallucination**: Strict adherence to source documents
    
    ### Data Sources
    - Indian Penal Code (IPC)
    - Code of Criminal Procedure (CrPC)
    - Code of Civil Procedure (CPC)
    - Constitution of India
    - Various Indian Acts
    
    ### Important Note
    This system provides legal information only, not legal advice. 
    Always consult a qualified legal professional for legal matters.
    """,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)


# =============================================================================
# Middleware Configuration
# =============================================================================
# CORS middleware for frontend integration
# Security: Origins are configured based on environment
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins,  # Environment-based origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Explicit methods
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests with timing."""
    start_time = time.time()
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration_ms = int((time.time() - start_time) * 1000)
    
    # Log request details
    logger.info(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Duration: {duration_ms}ms"
    )
    
    # Add timing header
    response.headers["X-Response-Time-Ms"] = str(duration_ms)
    
    return response


# =============================================================================
# Exception Handlers
# =============================================================================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred. Please try again.",
            "details": str(exc) if settings.debug else None
        }
    )


# =============================================================================
# Register Routes
# =============================================================================
# Health check routes (no prefix)
app.include_router(health.router)

# API v1 routes
app.include_router(chat.router, prefix="/api/v1")
app.include_router(retrieval.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(upload.router, prefix="/api/v1")


# =============================================================================
# Root Endpoint
# =============================================================================
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint with API information.
    """
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": "Indian Law RAG Chatbot API",
        "documentation": "/docs",
        "health": "/health",
        "endpoints": {
            "chat": "/api/v1/chat",
            "retrieve": "/api/v1/retrieve",
            "auth": "/api/v1/auth"
        }
    }
