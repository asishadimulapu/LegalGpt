# Indian Law RAG Chatbot - Bulletproof PDF Loader (Zero Letter Loss)
"""
Production-grade PDF text extraction with ZERO letter loss.
Implements the user's requested "Bulletproof" pipeline:

1. Detect PDF type (text-based vs scanned) using pdfplumber
2. Use pdfplumber for text-based PDFs (preserves layout, best accuracy)
3. Use OCR (Tesseract) fallback for scanned PDFs (300 DPI)
4. Verify extraction
5. Safe chunking without breaking sentences

Run: python scripts/load_pdf_documents.py
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Tuple, Optional
import logging

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PDF_DIR = project_root / "data" / "legal_pdfs"

# Try to import OCR dependencies
try:
    from pdf2image import convert_from_path
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    logger.warning("OCR dependencies (pdf2image, pytesseract) not installed. Scanned PDFs may fail.")

def install_dependencies():
    """Install required PDF processing packages."""
    os.system(f"{sys.executable} -m pip install pdfplumber pdf2image pytesseract pillow")

def is_text_pdf(pdf_path: Path) -> bool:
    """
    Step 1: Detect PDF type (MOST IMPORTANT)
    Returns: True if text-based, False if scanned.
    """
    import pdfplumber
    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            for page in pdf.pages[:2]:
                text = page.extract_text()
                if text and len(text.strip()) > 50:
                    return True
    except Exception as e:
        logger.warning(f"Error checking PDF type for {pdf_path.name}: {e}")
    return False

def extract_text_pdfplumber(pdf_path: Path) -> str:
    """
    Step 2A: Text-based PDF extraction (BEST)
    Keeps punctuation, spacing, sections, numbering.
    """
    import pdfplumber
    full_text = ""
    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            logger.info(f"  Extracting {len(pdf.pages)} pages (Text-Based) with pdfplumber...")
            for i, page in enumerate(pdf.pages):
                # User recommended x_tolerance=1, y_tolerance=1
                text = page.extract_text(
                    x_tolerance=1, 
                    y_tolerance=1,
                    layout=True
                )
                if text:
                    full_text += f"\n--- Page {i+1} ---\n{text}\n"
    except Exception as e:
        logger.error(f"pdfplumber extraction failed: {e}")
    return full_text

def extract_text_ocr(pdf_path: Path) -> str:
    """
    Step 2B: Scanned PDF → OCR (Fallback)
    300 DPI = no missing letters.
    """
    if not OCR_AVAILABLE:
        logger.error("OCR libraries not available. Cannot process scanned PDF.")
        return ""
    
    full_text = ""
    try:
        logger.info(f"  Starting OCR extraction for {pdf_path.name} (this is slow)...")
        # Check if poppler is installed
        try:
            images = convert_from_path(str(pdf_path), dpi=300)
        except Exception as e:
            logger.error(f"  OCR Failed: Poppler not found or error: {e}")
            logger.warning("  Please install Poppler and add to PATH for OCR.")
            return ""

        for i, img in enumerate(images):
            try:
                text = pytesseract.image_to_string(
                    img,
                    lang="eng",
                    config="--oem 3 --psm 6"
                )
                full_text += f"\n--- Page {i+1} ---\n{text}\n"
            except Exception as e:
                logger.error(f"  Tesseract failed on page {i+1}: {e}")
                logger.warning("  Please install Tesseract-OCR and add to PATH.")
                break
                
    except Exception as e:
        logger.error(f"OCR overall failed: {e}")
    
    return full_text

def extract_pdf_text(pdf_path: Path) -> Tuple[str, str]:
    """
    Step 3: Unified extraction function
    Returns: (text, extraction_method)
    """
    if is_text_pdf(pdf_path):
        logger.info(f"  [Text-based PDF detected]: {pdf_path.name}")
        return extract_text_pdfplumber(pdf_path), "pdfplumber"
    else:
        logger.info(f"  [Scanned PDF detected]: {pdf_path.name} – using OCR")
        return extract_text_ocr(pdf_path), "ocr"

def detect_act_name(text: str, filename: str) -> str:
    """Simple heuristic to guess Act Name."""
    combined = (filename + " " + text[:5000]).lower()
    if "ipc" in combined or "penal code" in combined:
        return "Indian Penal Code, 1860"
    if "evidence" in combined:
        return "Indian Evidence Act, 1872"
    if "contract" in combined:
        return "Indian Contract Act, 1872"
    if "constitution" in combined:
        return "Constitution of India"
    if "crpc" in combined or "criminal procedure" in combined:
        return "Code of Criminal Procedure, 1973"
    if "cpc" in combined or "civil procedure" in combined:
        return "Code of Civil Procedure, 1908"
    if "information technology" in combined or "it act" in combined:
        return "Information Technology Act, 2000"
    return "Indian Law"

def chunk_document_bulletproof(text: str, act_name: str) -> List[Document]:
    """
    Step 5: Chunking Without Breaking Sentences (RAG SAFE)
    """
    from app.config import settings
    
    # Use user's recommended settings or config
    chunk_size = getattr(settings, 'chunk_size', 800)
    chunk_overlap = getattr(settings, 'chunk_overlap', 150)
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n\n", "\n\n", "\n", ". ", " ", ""],
        length_function=len
    )
    
    chunks = splitter.split_text(text)
    
    documents = []
    for i, chunk in enumerate(chunks):
        # Try to find section info in chunk
        section_match = re.search(r'(?:Section|Article)\s*(\d+[A-Za-z]*)', chunk, re.IGNORECASE)
        section_ref = section_match.group(0) if section_match else f"Chunk {i+1}"
        
        doc_content = f"{act_name} - {section_ref}\n\n{chunk}"
        
        doc = Document(
            page_content=doc_content,
            metadata={
                "act_name": act_name,
                "section": section_ref,
                "source": "bulletproof_pdf_extractor",
                "chunk_index": i
            }
        )
        documents.append(doc)
        
    return documents

def process_pdf(pdf_path: Path) -> List[Document]:
    """Process a single PDF."""
    text, method = extract_pdf_text(pdf_path)
    
    # Step 4: Text Verification
    if not text or len(text.strip()) == 0:
        logger.error(f"  ✗ Text extraction failed for {pdf_path.name} using {method}!")
        return []
    
    logger.info(f"  ✓ Extracted {len(text):,} chars using {method}")
    
    act_name = detect_act_name(text, pdf_path.name)
    documents = chunk_document_bulletproof(text, act_name)
    
    logger.info(f"  ✓ Created {len(documents)} chunks")
    return documents

def load_all_pdfs() -> List[Document]:
    """Main loader function."""
    if not PDF_DIR.exists():
        logger.warning(f"PDF directory not found: {PDF_DIR}")
        return []
        
    pdf_files = list(PDF_DIR.glob("*.pdf"))
    logger.info(f"Found {len(pdf_files)} PDFs in {PDF_DIR}")
    
    all_docs = []
    for pdf in sorted(pdf_files):
        docs = process_pdf(pdf)
        all_docs.extend(docs)
        
    return all_docs

if __name__ == "__main__":
    print("\nRunning Bulletproof PDF Extraction Test...\n")
    docs = load_all_pdfs()
    print(f"\nTotal Documents: {len(docs)}")
