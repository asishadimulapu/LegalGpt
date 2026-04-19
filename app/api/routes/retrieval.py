# Indian Law RAG Chatbot - Retrieval Routes
"""
Retrieval-only endpoints for document search without LLM generation.
Useful for debugging, testing retrieval quality, and exploration.
"""

from typing import List
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from app.middleware import rate_limit
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.dependencies import get_rag_pipeline_dep
from app.core.rag_pipeline import RAGPipeline
from app.schemas.chat import RetrievalRequest, RetrievalResponse, LegalSource

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/retrieve", tags=["Retrieval"])


@router.post("", response_model=RetrievalResponse)
@rate_limit(requests_per_minute=30)
async def retrieve_documents(
    http_request: Request,
    request: RetrievalRequest,
    rag: RAGPipeline = Depends(get_rag_pipeline_dep)
) -> RetrievalResponse:
    """
    Retrieve relevant legal documents without LLM generation.
    
    This endpoint is useful for:
    - Testing retrieval quality
    - Debugging search issues
    - Understanding what documents are being retrieved
    - Building custom UIs that show sources first
    
    Args:
        request: Retrieval request with query and top_k
        
    Returns:
        RetrievalResponse: Retrieved documents with metadata
        
    Viva Explanation:
    - Pure retrieval without generation
    - Shows exactly what the RAG pipeline "sees"
    - Useful for evaluating retrieval quality
    """
    try:
        # Perform similarity search
        documents = rag.retrieve(request.query, top_k=request.top_k)
        
        # Convert to LegalSource format
        sources = []
        for doc in documents:
            source = LegalSource(
                act=doc.metadata.get("act_name", "Unknown Act"),
                section=doc.metadata.get("section"),
                title=doc.metadata.get("title"),
                content=doc.page_content
            )
            sources.append(source)
        
        logger.info(f"Retrieved {len(sources)} documents for query: {request.query[:50]}...")
        
        return RetrievalResponse(
            query=request.query,
            documents=sources,
            total_found=len(sources)
        )
    
    except Exception as e:
        logger.error(f"Retrieval error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving documents: {str(e)}"
        )


@router.post("/with-scores")
@rate_limit(requests_per_minute=30)
async def retrieve_documents_with_scores(
    http_request: Request,
    request: RetrievalRequest,
    rag: RAGPipeline = Depends(get_rag_pipeline_dep)
) -> dict:
    """
    Retrieve documents with similarity scores.
    
    Scores indicate how relevant each document is to the query.
    Lower scores = more relevant (L2 distance).
    
    Args:
        request: Retrieval request
        
    Returns:
        dict: Documents with their similarity scores
    """
    try:
        results = rag.retrieve_with_scores(request.query, top_k=request.top_k)
        
        documents_with_scores = []
        for doc, score in results:
            documents_with_scores.append({
                "act": doc.metadata.get("act_name", "Unknown Act"),
                "section": doc.metadata.get("section"),
                "title": doc.metadata.get("title"),
                "content": doc.page_content,
                "similarity_score": float(score)
            })
        
        return {
            "query": request.query,
            "documents": documents_with_scores,
            "total_found": len(documents_with_scores)
        }
    
    except Exception as e:
        logger.error(f"Retrieval with scores error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving documents: {str(e)}"
        )
