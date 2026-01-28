
import sys
from pathlib import Path
import logging

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.core.vector_store import vector_store_manager
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug_search():
    vector_store_manager.load()
    
    queries = [
        "Section 299",
        "Section 300",
        "Section 66 Information Technology Act",
        "Section 66A"
    ]
    
    print("\n" + "="*50)
    print("DEBUG RETRIEVAL TEST")
    print("="*50)
    
    for q in queries:
        print(f"\nQuery: '{q}'")
        # 1. Normal Search
        results = vector_store_manager.similarity_search(q, k=3)
        print(f"  Found {len(results)} results:")
        for i, r in enumerate(results):
            act = r.metadata.get('act_name', 'Unknown')
            sec = r.metadata.get('section', 'Unknown')
            content_preview = r.page_content[:100].replace('\n', ' ')
            print(f"    {i+1}. [{act} - {sec}] {content_preview}...")
            
    print("\n" + "="*50)
    print("DEBUGGING SPECIFIC SECTIONS")
    print("="*50)
    
    # Check if these sections exist AT ALL in the index
    store = vector_store_manager._faiss_store
    if not store:
        print("FAISS store not loaded!")
        return

    # Hacky way to scan docs in the in-memory store if possible, 
    # but `store.docstore._dict` might be available for FAISS implementation in langchain
    # Or just do a very broad search
    
    print("\nChecking if 'Section 299' exists in content...")
    # Search for the specific text literal
    broad_results = store.similarity_search("IPC Section 299 culpable homicide", k=20)
    found = False
    for r in broad_results:
        if "299" in r.page_content and "culpable homicide" in r.page_content.lower():
            print(f"  FOUND! Metadata: {r.metadata}")
            print(f"  Content start: {r.page_content[:100]}...")
            found = True
            break
    if not found:
        print("  NOT FOUND in top 20 results for specific query")

if __name__ == "__main__":
    debug_search()
