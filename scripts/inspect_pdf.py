
import sys
from pathlib import Path
import logging
import re

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from scripts.load_pdf_documents import extract_text_from_pdf, chunk_document_safely

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def inspect_pdf(filename, search_terms):
    pdf_path = project_root / "data" / "legal_pdfs" / filename
    if not pdf_path.exists():
        print(f"File not found: {pdf_path}")
        return

    print(f"\n--- Inspecting {filename} ---")
    text, pages = extract_text_from_pdf(pdf_path)
    print(f"Extracted {len(text)} chars from {pages} pages")
    
    # Check if search terms exist in raw text
    for term in search_terms:
        if term.lower() in text.lower():
            print(f"✓ Found '{term}' in raw text!")
            # Find context
            idx = text.lower().find(term.lower())
            start = max(0, idx - 100)
            end = min(len(text), idx + 300)
            print(f"  Context: {text[start:end].replace(chr(10), ' ')}...")
        else:
            print(f"✗ '{term}' NOT FOUND in raw text")

    # Check chunks
    chunks = chunk_document_safely(text, "Test Act")
    print(f"Created {len(chunks)} chunks")
    
    found_in_chunks = False
    for term in search_terms:
        found_in_chunk = False
        for i, doc in enumerate(chunks):
            if term.lower() in doc.page_content.lower():
                print(f"✓ '{term}' found in Chunk {i}")
                found_in_chunk = True
                break
        if not found_in_chunk:
             print(f"✗ '{term}' NOT found in any chunk")

def main():
    inspect_pdf("IPC_1860.pdf", ["Section 299", "Section 300", "Culpable homicide", "Murder"])
    inspect_pdf("it_act_2000_updated.pdf", ["Section 66", "Section 66A", "Hacking"])

if __name__ == "__main__":
    main()
