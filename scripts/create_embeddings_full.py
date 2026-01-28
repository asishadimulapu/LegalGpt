# Indian Law RAG Chatbot - Full Embeddings Creation
"""
Create FAISS index from ALL sources:
1. PDF legal documents (IPC, CrPC, CPC, Evidence Act)
2. Core IPC sections (hardcoded for reliability)
3. Constitution articles
4. Hugging Face datasets

Run: python scripts/create_embeddings_full.py
"""

import sys
from pathlib import Path
from typing import List
import logging
import time

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
load_dotenv(project_root / ".env")

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from app.config import settings
from app.core.vector_store import VectorStoreManager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s"
)
logger = logging.getLogger(__name__)


def load_all_sources() -> List[Document]:
    """Load documents from all available sources."""
    all_documents = []
    
    # 1. Load PDF documents (highest priority - official acts)
    try:
        from scripts.load_pdf_documents import load_all_pdfs
        pdf_docs = load_all_pdfs()
        all_documents.extend(pdf_docs)
        logger.info(f"✓ Loaded {len(pdf_docs)} documents from PDFs")
    except Exception as e:
        logger.warning(f"Could not load PDF documents: {e}")
    
    # 2. Load core sections and datasets
    try:
        from scripts.load_all_datasets import (
            get_ipc_core_sections,
            get_constitution_articles,
            get_evidence_act_sections,
            get_it_act_core_sections,
            load_viber1_dataset
        )
        
        # Add core IPC sections
        core_ipc = get_ipc_core_sections()
        all_documents.extend(core_ipc)
        logger.info(f"✓ Loaded {len(core_ipc)} core IPC sections")
        
        # Add Constitution articles
        constitution = get_constitution_articles()
        all_documents.extend(constitution)
        logger.info(f"✓ Loaded {len(constitution)} Constitution articles")
        
        # Add Evidence Act sections (Section 65B, etc.)
        evidence_docs = get_evidence_act_sections()
        all_documents.extend(evidence_docs)
        logger.info(f"✓ Loaded {len(evidence_docs)} Evidence Act sections")

        # Add IT Act sections (Section 66, 66A, etc.)
        it_act_docs = get_it_act_core_sections()
        all_documents.extend(it_act_docs)
        logger.info(f"✓ Loaded {len(it_act_docs)} IT Act sections")
        
        # Add Hugging Face dataset
        hf_docs = load_viber1_dataset()
        all_documents.extend(hf_docs)
        logger.info(f"✓ Loaded {len(hf_docs)} from Hugging Face")
        
    except Exception as e:
        logger.warning(f"Could not load datasets: {e}")
    
    return all_documents


def chunk_documents(documents: List[Document]) -> List[Document]:
    """Split documents into smaller chunks."""
    logger.info(f"Chunking {len(documents)} documents...")
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", "; ", ", ", " ", ""],
        length_function=len
    )
    
    chunks = splitter.split_documents(documents)
    
    for i, chunk in enumerate(chunks):
        chunk.metadata["chunk_index"] = i
    
    logger.info(f"Created {len(chunks)} chunks")
    return chunks


def create_index(documents: List[Document]) -> None:
    """Create and save FAISS index."""
    index_path = settings.faiss_index_path
    
    logger.info("=" * 60)
    logger.info("Creating FAISS Index")
    logger.info("=" * 60)
    logger.info(f"Documents to index: {len(documents)}")
    logger.info(f"Index path: {index_path}")
    logger.info(f"Embedding provider: {settings.embedding_provider}")
    
    start_time = time.time()
    
    manager = VectorStoreManager(index_path)
    
    logger.info("Generating embeddings... (this may take several minutes)")
    manager.create_from_documents(documents, save=True)
    
    duration = time.time() - start_time
    
    logger.info("=" * 60)
    logger.info("✓ Index Creation Complete!")
    logger.info("=" * 60)
    logger.info(f"Total documents indexed: {manager.get_document_count()}")
    logger.info(f"Time taken: {duration:.2f} seconds")
    logger.info(f"Index saved to: {index_path}")


def main():
    print("\n" + "=" * 60)
    print("Indian Law RAG - Full Index Creation")
    print("=" * 60 + "\n")
    
    # Step 1: Load all sources
    print("Step 1: Loading all data sources...")
    documents = load_all_sources()
    
    if not documents:
        print("\n✗ No documents loaded! Please add PDFs to data/legal_pdfs/")
        return
    
    print(f"\nTotal documents: {len(documents)}")
    
    # Show breakdown by source
    sources = {}
    for doc in documents:
        src = doc.metadata.get("source", "unknown")
        sources[src] = sources.get(src, 0) + 1
    
    print("\nDocuments by source:")
    for src, count in sorted(sources.items(), key=lambda x: -x[1]):
        print(f"  {src}: {count}")
    
    # Step 2: Chunk
    print("\nStep 2: Chunking documents...")
    chunks = chunk_documents(documents)
    
    # Step 3: Create index
    print("\nStep 3: Creating FAISS index...")
    print("This will generate embeddings for all chunks.\n")
    
    try:
        create_index(chunks)
        print("\n✓ FAISS index created successfully!")
        print(f"✓ Index saved to: {settings.faiss_index_path}")
        print("\nRestart the backend to use the new index.")
    except Exception as e:
        logger.error(f"Failed to create index: {e}")
        print(f"\n✗ Error: {e}")


if __name__ == "__main__":
    main()
