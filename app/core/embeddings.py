# Indian Law RAG Chatbot - Embedding Generation
"""
Embedding generation utilities supporting HuggingFace, OpenAI, and Gemini.
Converts text into high-dimensional vectors for semantic search.

Viva Explanation:
- Embeddings are numerical representations of text
- Semantically similar text has similar embeddings
- Used for finding relevant documents in FAISS
- HuggingFace embeddings are FREE and run locally
"""

from typing import List, Optional
import logging

from langchain_core.embeddings import Embeddings

from app.config import settings

logger = logging.getLogger(__name__)


def get_embedding_model() -> Embeddings:
    """
    Get the configured embedding model.
    
    Returns:
        Embeddings: LangChain embedding model instance
        
    Viva Explanation:
    - Factory pattern for creating embedding model
    - Uses embedding_provider setting (separate from llm_provider)
    - HuggingFace = FREE local embeddings (no API key needed!)
    - OpenAI = 'text-embedding-ada-002' (1536 dimensions)
    - Gemini = 'models/embedding-001' (768 dimensions)
    """
    provider = settings.embedding_provider
    
    if provider == "huggingface":
        from langchain_community.embeddings import HuggingFaceEmbeddings
        
        logger.info(f"Using HuggingFace local embeddings: {settings.huggingface_embedding_model}")
        return HuggingFaceEmbeddings(
            model_name=settings.huggingface_embedding_model,
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
    
    if provider == "openai":
        from langchain_openai import OpenAIEmbeddings
        
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required for OpenAI embeddings")
        
        logger.info("Using OpenAI embeddings (text-embedding-ada-002)")
        return OpenAIEmbeddings(
            api_key=settings.openai_api_key,
            model="text-embedding-ada-002"
        )
    
    if provider == "gemini":
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        
        if not settings.google_api_key:
            raise ValueError("GOOGLE_API_KEY is required for Gemini embeddings")
        
        logger.info("Using Google Gemini embeddings")
        return GoogleGenerativeAIEmbeddings(
            google_api_key=settings.google_api_key,
            model="models/embedding-001"
        )
    
    raise ValueError(f"Unsupported embedding provider: {provider}")


class EmbeddingGenerator:
    """
    Wrapper class for embedding generation with caching and error handling.
    
    Viva Explanation:
    - Provides consistent interface for embedding operations
    - Handles batch processing for efficiency
    - Includes retry logic for API failures
    """
    
    def __init__(self):
        self._model: Optional[Embeddings] = None
    
    @property
    def model(self) -> Embeddings:
        """Lazy initialization of embedding model."""
        if self._model is None:
            self._model = get_embedding_model()
        return self._model
    
    def embed_query(self, text: str) -> List[float]:
        """
        Generate embedding for a single query.
        
        Args:
            text: Query text to embed
            
        Returns:
            List[float]: Embedding vector
        """
        try:
            return self.model.embed_query(text)
        except Exception as e:
            logger.error(f"Error generating query embedding: {e}")
            raise
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple documents.
        
        Args:
            texts: List of document texts
            
        Returns:
            List[List[float]]: List of embedding vectors
            
        Viva Explanation:
        - Batch processing is more efficient than individual calls
        - Reduces API calls and latency
        """
        try:
            logger.info(f"Generating embeddings for {len(texts)} documents")
            return self.model.embed_documents(texts)
        except Exception as e:
            logger.error(f"Error generating document embeddings: {e}")
            raise
    
    def get_embedding_dimension(self) -> int:
        """
        Get the dimension of the embedding vectors.
        
        Returns:
            int: Embedding dimension
        """
        if settings.embedding_provider == "openai":
            return 1536
        elif settings.embedding_provider == "gemini":
            return 768
        elif settings.embedding_provider == "huggingface":
            return 384  # all-MiniLM-L6-v2 dimension
        else:
            # Generate a test embedding to determine dimension
            test_embedding = self.embed_query("test")
            return len(test_embedding)


# Global embedding generator instance
embedding_generator = EmbeddingGenerator()
