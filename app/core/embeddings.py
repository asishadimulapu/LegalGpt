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

from typing import List, Optional, Dict
import logging
import hashlib
import time

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
    - Includes LRU cache for query embeddings (PERFORMANCE OPTIMIZATION)
    - Cache reduces latency from ~200-400ms to <5ms for repeated queries
    """
    
    # Cache size - store up to 1000 query embeddings
    CACHE_SIZE = 1000
    
    def __init__(self):
        self._model: Optional[Embeddings] = None
        self._cache: Dict[str, List[float]] = {}
        self._cache_hits = 0
        self._cache_misses = 0
        self._is_warmed_up = False
    
    @property
    def model(self) -> Embeddings:
        """Lazy initialization of embedding model."""
        if self._model is None:
            start_time = time.time()
            self._model = get_embedding_model()
            load_time = (time.time() - start_time) * 1000
            logger.info(f"Embedding model loaded in {load_time:.0f}ms")
        return self._model
    
    def _get_cache_key(self, text: str) -> str:
        """Generate a cache key for the text using MD5 hash."""
        return hashlib.md5(text.strip().lower().encode()).hexdigest()
    
    def _evict_oldest_if_full(self):
        """Remove oldest cache entries if cache is full."""
        if len(self._cache) >= self.CACHE_SIZE:
            # Remove 10% of oldest entries
            keys_to_remove = list(self._cache.keys())[:self.CACHE_SIZE // 10]
            for key in keys_to_remove:
                del self._cache[key]
            logger.debug(f"Evicted {len(keys_to_remove)} cache entries")
    
    def embed_query(self, text: str) -> List[float]:
        """
        Generate embedding for a single query with caching.
        
        Args:
            text: Query text to embed
            
        Returns:
            List[float]: Embedding vector
            
        Performance:
        - Cached queries: <1ms
        - Uncached queries: ~200-400ms (HuggingFace local)
        """
        cache_key = self._get_cache_key(text)
        
        # Check cache first
        if cache_key in self._cache:
            self._cache_hits += 1
            logger.debug(f"Embedding cache HIT (hits: {self._cache_hits})")
            return self._cache[cache_key]
        
        # Cache miss - generate embedding
        self._cache_misses += 1
        start_time = time.time()
        
        try:
            embedding = self.model.embed_query(text)
            
            # Store in cache
            self._evict_oldest_if_full()
            self._cache[cache_key] = embedding
            
            latency_ms = (time.time() - start_time) * 1000
            logger.debug(f"Embedding generated in {latency_ms:.0f}ms (misses: {self._cache_misses})")
            
            return embedding
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
        - Document embeddings are NOT cached (one-time operation)
        """
        try:
            logger.info(f"Generating embeddings for {len(texts)} documents")
            start_time = time.time()
            embeddings = self.model.embed_documents(texts)
            latency_ms = (time.time() - start_time) * 1000
            logger.info(f"Generated {len(texts)} embeddings in {latency_ms:.0f}ms")
            return embeddings
        except Exception as e:
            logger.error(f"Error generating document embeddings: {e}")
            raise
    
    def warmup(self):
        """
        Pre-warm the embedding model by generating a test embedding.
        Call this at application startup for faster first queries.
        """
        if self._is_warmed_up:
            return
        
        logger.info("Warming up embedding model...")
        start_time = time.time()
        
        # Generate a test embedding to load the model
        _ = self.embed_query("What are my legal rights in India?")
        
        warmup_time = (time.time() - start_time) * 1000
        self._is_warmed_up = True
        logger.info(f"Embedding model warmed up in {warmup_time:.0f}ms")
    
    def get_cache_stats(self) -> dict:
        """Get cache statistics for monitoring."""
        total = self._cache_hits + self._cache_misses
        hit_rate = (self._cache_hits / total * 100) if total > 0 else 0
        return {
            "cache_size": len(self._cache),
            "max_size": self.CACHE_SIZE,
            "hits": self._cache_hits,
            "misses": self._cache_misses,
            "hit_rate_percent": round(hit_rate, 2)
        }
    
    def clear_cache(self):
        """Clear the embedding cache."""
        self._cache.clear()
        self._cache_hits = 0
        self._cache_misses = 0
        logger.info("Embedding cache cleared")
    
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
