# Indian Law RAG Chatbot - Vector Store Manager
"""
Unified vector store management supporting both FAISS and pgvector.

Viva Explanation:
- pgvector: PostgreSQL-based, no files needed (preferred for deployment)
- FAISS: File-based, faster for local development
- Automatic fallback: Uses pgvector if available, else FAISS
"""

import os
from pathlib import Path
from typing import List, Optional, Tuple
import logging

from langchain_core.documents import Document

from app.config import settings

logger = logging.getLogger(__name__)

# Check if pgvector is available
try:
    from app.core.pgvector_store import pgvector_store, PgVectorStore
    PGVECTOR_AVAILABLE = True
except ImportError:
    PGVECTOR_AVAILABLE = False
    pgvector_store = None


class VectorStoreManager:
    """
    Unified manager for vector store operations.
    
    Viva Explanation:
    - Automatically chooses between pgvector and FAISS
    - pgvector preferred for production (no file dependencies)
    - FAISS used as fallback for local development
    """
    
    def __init__(self, index_path: Optional[str] = None, use_pgvector: bool = False):
        """
        Initialize the vector store manager.
        
        Args:
            index_path: Path to FAISS index (fallback)
            use_pgvector: Whether to prefer pgvector over FAISS
        """
        self.index_path = index_path or settings.faiss_index_path
        self._use_pgvector = use_pgvector and PGVECTOR_AVAILABLE
        self._faiss_store = None
        self._embeddings = None
        self._initialized = False
    
    @property
    def embeddings(self):
        """Lazy load embeddings model."""
        if self._embeddings is None:
            from app.core.embeddings import get_embedding_model
            self._embeddings = get_embedding_model()
        return self._embeddings
    
    def _check_pgvector_data(self) -> bool:
        """Check if pgvector has data."""
        if not PGVECTOR_AVAILABLE:
            return False
        try:
            count = pgvector_store.get_document_count()
            return count > 0
        except Exception as e:
            logger.warning(f"Could not check pgvector: {e}")
            return False
    
    def _check_faiss_data(self) -> bool:
        """Check if FAISS index exists."""
        index_path = Path(self.index_path)
        return index_path.exists() and (index_path / "index.faiss").exists()
    
    def load(self) -> bool:
        """
        Load the vector store (pgvector or FAISS).
        
        Returns:
            bool: True if loaded successfully
        """
        # Try pgvector first
        if self._use_pgvector and self._check_pgvector_data():
            logger.info("Using pgvector store from PostgreSQL")
            self._initialized = True
            return True
        
        # Fallback to FAISS
        if self._check_faiss_data():
            logger.info(f"Loading FAISS index from {self.index_path}")
            try:
                from langchain_community.vectorstores import FAISS
                # Try with allow_dangerous_deserialization first (newer versions)
                try:
                    self._faiss_store = FAISS.load_local(
                        folder_path=str(self.index_path),
                        embeddings=self.embeddings,
                        allow_dangerous_deserialization=True
                    )
                except TypeError:
                    # Fall back for older langchain versions
                    self._faiss_store = FAISS.load_local(
                        folder_path=str(self.index_path),
                        embeddings=self.embeddings
                    )
                self._initialized = True
                logger.info("FAISS index loaded successfully")
                return True
            except Exception as e:
                logger.error(f"Failed to load FAISS: {e}")
                return False
        
        logger.warning("No vector store data found (neither pgvector nor FAISS)")
        return False
    
    def similarity_search(
        self, 
        query: str, 
        k: int = 5
    ) -> List[Document]:
        """
        Perform hybrid search (keyword + vector) for better retrieval.
        
        Args:
            query: Search query
            k: Number of results
            
        Returns:
            List[Document]: Most similar documents
        """
        # Lazy load if not initialized
        if not self._initialized:
            logger.info("Lazy loading vector store for first request...")
            if not self.load():
                logger.error("Vector store not available")
                return []
        
        # Use pgvector if available and has data
        if self._use_pgvector and self._check_pgvector_data():
            return pgvector_store.similarity_search(query, k)
        
        # Use FAISS with hybrid approach
        if self._faiss_store:
            logger.debug(f"Hybrid search for: {query[:100]}...")
            
            # Step 1: Vector similarity search (get more candidates)
            vector_results = self._faiss_store.similarity_search(query, k=k*2)
            
            # Step 2: Keyword boost - check for exact matches
            query_lower = query.lower()
            keywords = self._extract_keywords(query)
            
            # Score each result based on keyword matches
            scored_results = []
            for doc in vector_results:
                content_lower = doc.page_content.lower()
                metadata = doc.metadata
                section = metadata.get('section') or ''  # Handle None
                
                # Calculate keyword match score
                keyword_score = 0
                for kw in keywords:
                    if kw.lower() in content_lower:
                        keyword_score += 2
                    if section.lower().find(kw.lower()) >= 0:
                        keyword_score += 3  # Boost for section match
                
                scored_results.append((doc, keyword_score))
            
            # Sort by keyword score (higher = better), keep top k
            scored_results.sort(key=lambda x: x[1], reverse=True)
            results = [doc for doc, score in scored_results[:k]]
            
            logger.debug(f"Hybrid search found {len(results)} results")
            return results
        
        logger.error("No vector store available for search")
        return []
    
    def _extract_keywords(self, query: str) -> List[str]:
        """Extract important keywords from query for hybrid matching."""
        # Common words to ignore
        stopwords = {'what', 'is', 'the', 'a', 'an', 'of', 'in', 'for', 'to', 'as', 
                     'can', 'i', 'do', 'how', 'under', 'about', 'with', 'are', 'be'}
        
        # Extract words
        words = query.replace('?', '').replace('.', '').replace(',', '').split()
        
        # Filter and extract keywords
        keywords = []
        for word in words:
            if word.lower() not in stopwords and len(word) > 2:
                keywords.append(word)
        
        # Look for section/article patterns
        import re
        section_match = re.search(r'(?:section|article|sec\.?)\s*(\d+[A-Za-z]*)', query, re.IGNORECASE)
        if section_match:
            keywords.append(f"Section {section_match.group(1)}")
            keywords.append(section_match.group(1))
        
        return keywords
    
    def similarity_search_with_score(
        self, 
        query: str, 
        k: int = 5
    ) -> List[Tuple[Document, float]]:
        """
        Perform similarity search with scores.
        
        Args:
            query: Search query
            k: Number of results
            
        Returns:
            List[Tuple[Document, float]]: Documents with scores
        """
        # Lazy load if not initialized
        if not self._initialized:
            if not self.load():
                return []
        
        # Use pgvector if available
        if self._use_pgvector and self._check_pgvector_data():
            return pgvector_store.similarity_search_with_score(query, k)
        
        # Use FAISS
        if self._faiss_store:
            return self._faiss_store.similarity_search_with_score(query, k=k)
        
        return []
    
    def is_loaded(self) -> bool:
        """Check if vector store is loaded."""
        return self._initialized
    
    def get_document_count(self) -> int:
        """Get the number of documents."""
        if self._use_pgvector and PGVECTOR_AVAILABLE:
            try:
                return pgvector_store.get_document_count()
            except:
                pass
        
        if self._faiss_store:
            return len(self._faiss_store.docstore._dict)
        
        return 0
    
    def create_from_documents(self, documents: List[Document], save: bool = True) -> None:
        """
        Create FAISS index from documents.
        
        Args:
            documents: List of documents to index
            save: Whether to save the index to disk
            
        Viva Explanation:
        - Creates embeddings for all documents
        - Builds FAISS index for similarity search
        - Saves index to disk for persistence
        """
        from langchain_community.vectorstores import FAISS
        
        logger.info(f"Creating FAISS index from {len(documents)} documents...")
        
        # Create FAISS index from documents
        self._faiss_store = FAISS.from_documents(
            documents=documents,
            embedding=self.embeddings
        )
        
        self._initialized = True
        
        if save:
            # Ensure directory exists
            Path(self.index_path).mkdir(parents=True, exist_ok=True)
            
            # Save the index
            self._faiss_store.save_local(str(self.index_path))
            logger.info(f"FAISS index saved to {self.index_path}")


# Global vector store manager instance
vector_store_manager = VectorStoreManager()


def load_vector_store() -> VectorStoreManager:
    """Load the global vector store."""
    if not vector_store_manager.is_loaded():
        vector_store_manager.load()
    return vector_store_manager


def get_vector_store() -> VectorStoreManager:
    """Get the vector store manager (for dependency injection)."""
    return vector_store_manager
