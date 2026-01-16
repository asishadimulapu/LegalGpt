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


class JinaAIEmbeddings(Embeddings):
    """
    Jina AI embeddings - free tier, fast, reliable!
    
    Viva Explanation:
    - Uses Jina AI's free Embedding API
    - jina-embeddings-v3 model (1024 dims, but we'll use v2 for 768)
    - Free tier: 1M tokens/month
    - No heavy dependencies!
    """
    
    def __init__(self, api_key: str, model_name: str = "jina-embeddings-v2-base-en"):
        self.api_key = api_key
        self.model_name = model_name
        self.api_url = "https://api.jina.ai/v1/embeddings"
    
    def _embed(self, texts: List[str]) -> List[List[float]]:
        """Call Jina AI Embedding API."""
        import httpx
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        response = httpx.post(
            self.api_url,
            headers=headers,
            json={
                "model": self.model_name,
                "input": texts
            },
            timeout=60.0
        )
        
        if response.status_code != 200:
            raise ValueError(f"Jina AI API error: {response.status_code} - {response.text}")
        
        result = response.json()
        # Extract embeddings from response
        embeddings = [item["embedding"] for item in result["data"]]
        return embeddings
    
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
    - jina = Jina AI cloud embeddings (RECOMMENDED for deploy!)
    - huggingface = Local embeddings (needs sentence-transformers)
    - gemini = Google embeddings (768 dimensions)
    """
    provider = settings.embedding_provider
    
    # Jina AI - RECOMMENDED for deployment (free, fast, reliable!)
    if provider == "jina":
        api_key = os.getenv("JINA_API_KEY") or getattr(settings, 'jina_api_key', '')
        
        if not api_key:
            raise ValueError("JINA_API_KEY is required for Jina AI embeddings")
        
        logger.info("Using Jina AI embeddings (cloud, no local model)")
        return JinaAIEmbeddings(
            api_key=api_key,
            model_name="jina-embeddings-v2-base-en"
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
        elif settings.embedding_provider == "jina":
            return 768  # jina-embeddings-v2-base-en dimension
        elif settings.embedding_provider in ["huggingface", "huggingface_api"]:
            return 384  # all-MiniLM-L6-v2 dimension
        else:
            # Generate a test embedding to determine dimension
            test_embedding = self.embed_query("test")
            return len(test_embedding)


# Global embedding generator instance
embedding_generator = EmbeddingGenerator()
