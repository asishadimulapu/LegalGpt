
import os
import sys
import logging

# Disable logging to keep output clean
logging.disable(logging.CRITICAL)

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.vector_store import VectorStoreManager

def get_local_doc_count():
    try:
        # Initialize manager specifically for FAISS
        manager = VectorStoreManager(use_pgvector=False)
        
        if manager.load():
            count = manager.get_document_count()
            
            # Extract metadata summary if possible
            sources = set()
            if manager._faiss_store:
                for doc_id, doc in manager._faiss_store.docstore._dict.items():
                    sources.add(doc.metadata.get('source', 'Unknown'))
            
            print(f"\n🏠 --- Local FAISS Store Statistics ---")
            print(f"Total Chunks (Embeddings): {count:,}")
            print(f"Total Unique Sources: {len(sources):,}")
            print(f"Source Names:")
            for s in sorted(sources):
                print(f"  - {s}")
            print(f"----------------------------------------\n")
        else:
            print("❌ Failed to load local FAISS index. Make sure it has been created.")
            
    except Exception as e:
        print(f"Error checking local store: {e}")

if __name__ == "__main__":
    get_local_doc_count()
