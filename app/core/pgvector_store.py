# Indian Law RAG Chatbot - pgvector Vector Store
"""
PostgreSQL pgvector-based vector store for semantic search.
Replaces FAISS file-based storage for better deployment compatibility.

Viva Explanation:
- pgvector is a PostgreSQL extension for vector similarity search
- Stores embeddings directly in the database
- Supports L2 distance, cosine similarity, and inner product
- No external files needed - better for cloud deployments
"""

import logging
from typing import List, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session

from langchain_core.documents import Document

from app.db.database import SessionLocal, engine
from app.db.models import DocumentEmbedding, PGVECTOR_AVAILABLE
from app.core.embeddings import get_embedding_model

logger = logging.getLogger(__name__)


class PgVectorStore:
    """
    PostgreSQL pgvector-based vector store manager.
    
    Viva Explanation:
    - Uses SQL for vector similarity search
    - Embeddings stored in database, not files
    - Cosine similarity for semantic matching
    - Lazy loading of embedding model
    """
    
    def __init__(self):
        self._embeddings = None
        self._initialized = False
    
    @property
    def embeddings(self):
        """Lazy load embeddings model."""
        if self._embeddings is None:
            self._embeddings = get_embedding_model()
        return self._embeddings
    
    def initialize(self) -> bool:
        """
        Initialize pgvector extension in PostgreSQL.
        Must be called once before using vector operations.
        """
        try:
            with engine.connect() as conn:
                # Enable pgvector extension
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                conn.commit()
                logger.info("pgvector extension enabled")
                self._initialized = True
                return True
        except Exception as e:
            logger.error(f"Failed to initialize pgvector: {e}")
            return False
    
    def create_hnsw_index(self, m: int = 16, ef_construction: int = 64) -> bool:
        """
        Create HNSW index for fast approximate nearest neighbor search.
        
        Args:
            m: Maximum number of connections per layer (default 16)
            ef_construction: Build-time accuracy tradeoff (default 64)
            
        Returns:
            bool: True if index created successfully
            
        Viva Explanation:
        - HNSW (Hierarchical Navigable Small World) is faster than brute-force
        - Good for large datasets (10k+ documents)
        - Tradeoff: slightly approximate but much faster
        """
        try:
            with engine.connect() as conn:
                # Create HNSW index for cosine similarity
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS document_embeddings_hnsw_idx 
                    ON document_embeddings 
                    USING hnsw (embedding vector_cosine_ops)
                    WITH (m = :m, ef_construction = :ef_construction)
                """), {"m": m, "ef_construction": ef_construction})
                conn.commit()
                logger.info("HNSW index created for document_embeddings")
                return True
        except Exception as e:
            logger.error(f"Failed to create HNSW index: {e}")
            return False
    
    def add_documents(
        self, 
        documents: List[Document],
        batch_size: int = 100
    ) -> int:
        """
        Add documents with embeddings to the database.
        
        Args:
            documents: List of LangChain Document objects
            batch_size: Number of documents to process at once
            
        Returns:
            int: Number of documents added
        """
        if not documents:
            return 0
        
        logger.info(f"Adding {len(documents)} documents to pgvector store")
        
        added_count = 0
        db = SessionLocal()
        
        try:
            # Process in batches
            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                texts = [doc.page_content for doc in batch]
                
                # Generate embeddings
                embeddings = self.embeddings.embed_documents(texts)
                
                # Insert into database
                for doc, embedding in zip(batch, embeddings):
                    metadata = doc.metadata or {}
                    
                    doc_embedding = DocumentEmbedding(
                        content=doc.page_content,
                        embedding=embedding,
                        source=metadata.get("source", "unknown"),
                        section=metadata.get("section"),
                        title=metadata.get("title"),
                        act_type=metadata.get("act_type"),
                        extra_data=metadata
                    )
                    db.add(doc_embedding)
                    added_count += 1
                
                db.commit()
                logger.info(f"Added batch {i // batch_size + 1}, total: {added_count}")
            
            logger.info(f"Successfully added {added_count} documents")
            return added_count
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error adding documents: {e}")
            raise
        finally:
            db.close()
    
    def similarity_search(
        self, 
        query: str, 
        k: int = 5
    ) -> List[Document]:
        """
        Perform similarity search using pgvector.
        
        Args:
            query: Search query text
            k: Number of results to return
            
        Returns:
            List[Document]: Most similar documents
        """
        # Generate query embedding
        query_embedding = self.embeddings.embed_query(query)
        
        db = SessionLocal()
        try:
            # Use parameterized query to prevent SQL injection
            # pgvector <=> is cosine distance (0=identical, 2=opposite)
            # Convert to similarity: 1 - (distance / 2) for normalized score
            embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
            
            results = db.execute(
                text("""
                    SELECT id, content, source, section, title, act_type, extra_data,
                           1 - (embedding <=> :query_embedding::vector) as similarity
                    FROM document_embeddings
                    ORDER BY embedding <=> :query_embedding::vector
                    LIMIT :limit
                """),
                {
                    "query_embedding": embedding_str,
                    "limit": k
                }
            ).fetchall()
            
            # Convert to LangChain Documents
            documents = []
            for row in results:
                metadata = row.extra_data or {}
                metadata.update({
                    "source": row.source,
                    "section": row.section,
                    "title": row.title,
                    "act_type": row.act_type,
                    "similarity": float(row.similarity) if row.similarity else 0
                })
                
                doc = Document(
                    page_content=row.content,
                    metadata=metadata
                )
                documents.append(doc)
            
            logger.debug(f"Found {len(documents)} similar documents")
            return documents
            
        except Exception as e:
            logger.error(f"Similarity search failed: {e}")
            return []
        finally:
            db.close()
    
    def similarity_search_with_score(
        self, 
        query: str, 
        k: int = 5
    ) -> List[Tuple[Document, float]]:
        """
        Perform similarity search with scores.
        
        Args:
            query: Search query text
            k: Number of results
            
        Returns:
            List[Tuple[Document, float]]: Documents with similarity scores (0-1, higher=better)
        """
        query_embedding = self.embeddings.embed_query(query)
        embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
        
        db = SessionLocal()
        try:
            results = db.execute(
                text("""
                    SELECT id, content, source, section, title, act_type, extra_data,
                           embedding <=> :query_embedding::vector as distance
                    FROM document_embeddings
                    ORDER BY embedding <=> :query_embedding::vector
                    LIMIT :limit
                """),
                {
                    "query_embedding": embedding_str,
                    "limit": k
                }
            ).fetchall()
            
            documents_with_scores = []
            for row in results:
                metadata = row.extra_data or {}
                metadata.update({
                    "source": row.source,
                    "section": row.section,
                    "title": row.title,
                    "act_type": row.act_type
                })
                
                doc = Document(
                    page_content=row.content,
                    metadata=metadata
                )
                # Convert distance to similarity (1 - distance for cosine)
                # Cosine distance ranges from 0 (identical) to 2 (opposite)
                distance = float(row.distance) if row.distance else 0
                similarity = 1.0 - distance
                documents_with_scores.append((doc, similarity))
            
            return documents_with_scores
            
        except Exception as e:
            logger.error(f"Similarity search with score failed: {e}")
            return []
        finally:
            db.close()
    
    def get_document_count(self) -> int:
        """Get the number of documents in the store."""
        db = SessionLocal()
        try:
            count = db.query(DocumentEmbedding).count()
            return count
        finally:
            db.close()
    
    def is_loaded(self) -> bool:
        """Check if the vector store has documents."""
        return self.get_document_count() > 0
    
    def clear(self) -> None:
        """Delete all documents from the store."""
        db = SessionLocal()
        try:
            db.query(DocumentEmbedding).delete()
            db.commit()
            logger.info("Cleared all documents from pgvector store")
        finally:
            db.close()


# Global instance
pgvector_store = PgVectorStore()


def get_pgvector_store() -> PgVectorStore:
    """Get the global pgvector store instance."""
    return pgvector_store
