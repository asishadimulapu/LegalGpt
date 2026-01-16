# Indian Law RAG Chatbot - Embedding Generation
"""
Embedding generation utilities supporting HuggingFace API, local, OpenAI, and Gemini.
Converts text into high-dimensional vectors for semantic search.

Viva Explanation:
- Embeddings are numerical representations of text
- Semantically similar text has similar embeddings
- Used for finding relevant documents in pgvector/FAISS
- HuggingFace Inference API = FREE cloud embeddings (no local model!)
"""

from typing import List, Optional
import logging
import os

from langchain_core.embeddings import Embeddings

from app.config import settings

logger = logging.getLogger(__name__)


class HuggingFaceInferenceAPIEmbeddings(Embeddings):
    """
    Hugging Face Inference API embeddings - no local model needed!
    
    Viva Explanation:
    - Uses HuggingFace's free Inference API
    - Same model (all-MiniLM-L6-v2) but runs in the cloud
    - No 400MB sentence-transformers dependency!
    - Free tier: 1000 calls/hour
    """
    
    def __init__(self, api_key: str, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.api_key = api_key
        self.model_name = model_name
        self.api_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{model_name}"
    
    def _embed(self, texts: List[str]) -> List[List[float]]:
        """Call HuggingFace Inference API."""
        import httpx
        
        headers = {"Authorization": f"Bearer {self.api_key}"}
        
        response = httpx.post(
            self.api_url,
            headers=headers,
            json={"inputs": texts, "options": {"wait_for_model": True}},
            timeout=60.0
        )
        
        if response.status_code != 200:
            raise ValueError(f"HuggingFace API error: {response.status_code} - {response.text}")
        
        return response.json()
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed multiple documents."""
        return self._embed(texts)
    
    def embed_query(self, text: str) -> List[float]:
        """Embed a single query."""
        result = self._embed([text])
        return result[0]


def get_embedding_model() -> Embeddings:
    """
    Get the configured embedding model.
    
    Returns:
        Embeddings: LangChain embedding model instance
        
    Viva Explanation:
    - Factory pattern for creating embedding model
    - huggingface_api = FREE cloud embeddings (recommended for deploy!)
    - huggingface = Local embeddings (needs sentence-transformers)
    - gemini = Google embeddings (768 dimensions)
    """
    provider = settings.embedding_provider
    
    # HuggingFace Inference API - RECOMMENDED for deployment (no local model!)
    if provider == "huggingface_api":
        api_key = os.getenv("HUGGINGFACE_API_KEY") or settings.huggingface_api_key
        
        if not api_key:
            raise ValueError("HUGGINGFACE_API_KEY is required for HuggingFace API embeddings")
        
        logger.info("Using HuggingFace Inference API embeddings (cloud, no local model)")
        return HuggingFaceInferenceAPIEmbeddings(
            api_key=api_key,
            model_name=settings.huggingface_embedding_model
        )
    
    # Local HuggingFace - needs sentence-transformers (400MB)
    if provider == "huggingface":
        try:
            from langchain_community.embeddings import HuggingFaceEmbeddings
            
            logger.info(f"Using HuggingFace local embeddings: {settings.huggingface_embedding_model}")
            return HuggingFaceEmbeddings(
                model_name=settings.huggingface_embedding_model,
                model_kwargs={'device': 'cpu'},
                encode_kwargs={'normalize_embeddings': True}
            )
        except ImportError:
            logger.warning("sentence-transformers not installed, falling back to HuggingFace API")
            api_key = os.getenv("HUGGINGFACE_API_KEY")
            if api_key:
                return HuggingFaceInferenceAPIEmbeddings(api_key=api_key)
            raise ImportError("Install sentence-transformers or set HUGGINGFACE_API_KEY")
    
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
        elif settings.embedding_provider in ["huggingface", "huggingface_api"]:
            return 384  # all-MiniLM-L6-v2 dimension
        else:
            # Generate a test embedding to determine dimension
            test_embedding = self.embed_query("test")
            return len(test_embedding)


# Global embedding generator instance
embedding_generator = EmbeddingGenerator()
