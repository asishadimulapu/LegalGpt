# Indian Law RAG Chatbot - Health Check Routes
"""
Health check endpoints for monitoring application status.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict, Any
import logging

from app.config import settings
from app.db.database import check_db_connection
from app.core.vector_store import get_vector_store, VectorStoreManager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str
    version: str
    environment: str
    components: Dict[str, Any]


class ComponentStatus(BaseModel):
    """Individual component status."""
    status: str
    message: str = ""


@router.get("/health", response_model=HealthResponse)
async def health_check(
    vector_store: VectorStoreManager = Depends(get_vector_store)
) -> HealthResponse:
    """
    Comprehensive health check endpoint.
    
    Checks:
    - Database connection
    - FAISS vector store status
    - Overall application health
    
    Returns:
        HealthResponse: Detailed health status
    """
    components = {}
    overall_healthy = True
    
    # Check database connection
    try:
        db_healthy = check_db_connection()
        components["database"] = {
            "status": "healthy" if db_healthy else "unhealthy",
            "type": "postgresql"
        }
        if not db_healthy:
            overall_healthy = False
    except Exception as e:
        components["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        overall_healthy = False
    
    # Check vector store (FAISS)
    try:
        vs_loaded = vector_store.is_loaded()
        doc_count = vector_store.get_document_count() if vs_loaded else 0
        components["vector_store"] = {
            "status": "healthy" if vs_loaded else "not_loaded",
            "type": "faiss",
            "document_count": doc_count
        }
        if not vs_loaded:
            # Vector store not loaded is a warning, not an error
            components["vector_store"]["message"] = "Run data pipeline to create index"
    except Exception as e:
        components["vector_store"] = {
            "status": "error",
            "error": str(e)
        }
    
    # Check LLM configuration
    components["llm"] = {
        "status": "configured",
        "provider": settings.llm_provider
    }
    
    return HealthResponse(
        status="healthy" if overall_healthy else "degraded",
        version=settings.app_version,
        environment=settings.app_env,
        components=components
    )


@router.get("/health/live")
async def liveness_probe() -> Dict[str, str]:
    """
    Kubernetes liveness probe endpoint.
    Returns 200 if application is running.
    """
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness_probe(
    vector_store: VectorStoreManager = Depends(get_vector_store)
) -> Dict[str, Any]:
    """
    Kubernetes readiness probe endpoint.
    Returns 200 if application is ready to serve traffic.
    
    Checks:
    - Database is connected
    - Vector store is loaded
    """
    ready = True
    details = {}
    
    # Check database
    if not check_db_connection():
        ready = False
        details["database"] = "not connected"
    else:
        details["database"] = "connected"
    
    # Check vector store
    if not vector_store.is_loaded():
        ready = False
        details["vector_store"] = "not loaded"
    else:
        details["vector_store"] = "loaded"
    
    if not ready:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail=details)
    
    return {"status": "ready", "details": details}
