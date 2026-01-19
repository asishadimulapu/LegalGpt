#!/usr/bin/env python3
"""
Migrate FAISS index to PostgreSQL pgvector.

This script:
1. Enables pgvector extension in PostgreSQL
2. Creates the document_embeddings table
3. Reads existing FAISS index
4. Transfers all embeddings to PostgreSQL

Run once: python scripts/migrate_faiss_to_pg.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pathlib import Path
import logging

from sqlalchemy import text

from app.config import settings
from app.db.database import engine, SessionLocal, init_db
from app.db.models import DocumentEmbedding
from app.core.embeddings import get_embedding_model

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def enable_pgvector():
    """Enable pgvector extension in PostgreSQL."""
    logger.info("Enabling pgvector extension...")
    
    with engine.connect() as conn:
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
            logger.info("✓ pgvector extension enabled")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to enable pgvector: {e}")
            logger.error("Make sure pgvector is installed on your PostgreSQL server")
            return False


def create_tables():
    """Create all database tables including document_embeddings."""
    logger.info("Creating database tables...")
    init_db()
    logger.info("✓ Database tables created")


def load_faiss_index():
    """Load existing FAISS index."""
    from langchain_community.vectorstores import FAISS
    
    index_path = Path(settings.faiss_index_path)
    
    if not index_path.exists():
        logger.error(f"✗ FAISS index not found at {index_path}")
        return None
    
    logger.info(f"Loading FAISS index from {index_path}...")
    
    embeddings = get_embedding_model()
    
    faiss_store = FAISS.load_local(
        folder_path=str(index_path),
        embeddings=embeddings,
        allow_dangerous_deserialization=True
    )
    
    logger.info("✓ FAISS index loaded")
    return faiss_store


def migrate_embeddings(faiss_store, batch_size=100):
    """Transfer embeddings from FAISS to PostgreSQL."""
    
    # Get all documents from FAISS
    docstore = faiss_store.docstore._dict
    index_to_docstore_id = faiss_store.index_to_docstore_id
    
    total_docs = len(docstore)
    logger.info(f"Migrating {total_docs} documents to PostgreSQL...")
    
    db = SessionLocal()
    migrated = 0
    errors = 0
    
    try:
        # Clear existing embeddings (optional - comment out if you want to append)
        existing_count = db.query(DocumentEmbedding).count()
        if existing_count > 0:
            logger.info(f"Found {existing_count} existing embeddings")
            response = input("Clear existing embeddings? (y/n): ")
            if response.lower() == 'y':
                db.query(DocumentEmbedding).delete()
                db.commit()
                logger.info("✓ Cleared existing embeddings")
        
        # Get embeddings from FAISS index
        embeddings = get_embedding_model()
        
        # Process documents
        doc_items = list(docstore.items())
        
        for i in range(0, len(doc_items), batch_size):
            batch = doc_items[i:i + batch_size]
            
            for doc_id, doc in batch:
                try:
                    # Get the embedding for this document
                    # We need to look up the index position
                    index_pos = None
                    for idx, stored_id in index_to_docstore_id.items():
                        if stored_id == doc_id:
                            index_pos = idx
                            break
                    
                    if index_pos is None:
                        logger.warning(f"Could not find index position for doc {doc_id}")
                        continue
                    
                    # Re-generate embedding with current embedding model (Jina AI)
                    # This creates a 768-dim vector instead of 384-dim FAISS vector
                    embedding_vector = embeddings.embed_query(doc.page_content)
                    
                    metadata = doc.metadata or {}
                    
                    doc_embedding = DocumentEmbedding(
                        content=doc.page_content,
                        embedding=embedding_vector,
                        source=metadata.get("source", "unknown"),
                        section=metadata.get("section"),
                        title=metadata.get("title"),
                        act_type=metadata.get("act_type"),
                        extra_data=metadata
                    )
                    db.add(doc_embedding)
                    migrated += 1
                    
                except Exception as e:
                    logger.error(f"Error migrating doc {doc_id}: {e}")
                    errors += 1
            
            db.commit()
            logger.info(f"Progress: {migrated}/{total_docs} ({migrated*100//total_docs}%)")
        
        logger.info(f"✓ Migration complete: {migrated} documents migrated, {errors} errors")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Migration failed: {e}")
        raise
    finally:
        db.close()
    
    return migrated


def verify_migration():
    """Verify the migration was successful."""
    db = SessionLocal()
    try:
        count = db.query(DocumentEmbedding).count()
        logger.info(f"✓ Verification: {count} documents in PostgreSQL")
        
        # Test a sample search
        sample = db.query(DocumentEmbedding).first()
        if sample:
            logger.info(f"✓ Sample document: {sample.source} - {sample.title[:50] if sample.title else 'No title'}...")
        
        return count > 0
    finally:
        db.close()


def main():
    print("=" * 60)
    print("FAISS to pgvector Migration")
    print("=" * 60)
    print()
    
    # Step 1: Enable pgvector
    if not enable_pgvector():
        print("\n⚠️  pgvector extension not available.")
        print("For Azure PostgreSQL, enable it in Azure Portal:")
        print("  1. Go to your database")
        print("  2. Server parameters > search 'azure.extensions'")
        print("  3. Add 'VECTOR' to allowed extensions")
        print("  4. Restart the database")
        return
    
    # Step 2: Create tables
    create_tables()
    
    # Step 3: Load FAISS
    faiss_store = load_faiss_index()
    if not faiss_store:
        print("\n⚠️  No FAISS index to migrate. Create embeddings first.")
        return
    
    # Step 4: Migrate
    migrate_embeddings(faiss_store)
    
    # Step 5: Verify
    verify_migration()
    
    print()
    print("=" * 60)
    print("✅ Migration complete!")
    print()
    print("Next steps:")
    print("1. Update app/core/vector_store.py to use pgvector_store")
    print("2. Remove FAISS index from git: git rm -r data/faiss_index/")
    print("3. Add data/faiss_index/ back to .gitignore")
    print("4. Commit and push to deploy")
    print("=" * 60)


if __name__ == "__main__":
    main()
