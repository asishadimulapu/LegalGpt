# Indian Law RAG Chatbot - File Upload Routes
"""
Endpoints for uploading and processing case documents.
Supports PDF, DOCX, and TXT files.
Now includes chat history saving for document analysis.
"""

import logging
import asyncio
from typing import Optional
from uuid import uuid4, UUID

from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User, MessageRole
from app.db.crud import ChatSessionCRUD, ChatMessageCRUD, QueryLogCRUD
from app.api.dependencies import get_current_user_optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["Upload"])


class UploadResponse(BaseModel):
    """Response schema for file upload."""
    success: bool
    file_id: str
    filename: str
    file_type: str
    text_content: str
    text_length: int
    message: str


# Supported file types
ALLOWED_EXTENSIONS = {'.pdf', '.txt', '.doc', '.docx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file using PyMuPDF."""
    try:
        import fitz  # PyMuPDF
        
        doc = fitz.open(stream=file_content, filetype="pdf")
        text_parts = []
        
        for page_num in range(doc.page_count):
            page = doc.load_page(page_num)
            text_parts.append(page.get_text())
        
        doc.close()
        return "\n\n".join(text_parts)
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to extract text from PDF: {str(e)}"
        )


def extract_text_from_txt(file_content: bytes) -> str:
    """Extract text from TXT file."""
    try:
        # Try UTF-8 first, then fallback to latin-1
        try:
            return file_content.decode('utf-8')
        except UnicodeDecodeError:
            return file_content.decode('latin-1')
    except Exception as e:
        logger.error(f"TXT extraction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to read text file: {str(e)}"
        )


def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file."""
    try:
        import io
        from zipfile import ZipFile
        from xml.etree import ElementTree
        
        # DOCX is a ZIP file with XML content
        with ZipFile(io.BytesIO(file_content)) as zf:
            xml_content = zf.read('word/document.xml')
            tree = ElementTree.fromstring(xml_content)
            
            # Extract text from all paragraph elements
            namespaces = {
                'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
            }
            
            text_parts = []
            for paragraph in tree.findall('.//w:p', namespaces):
                texts = paragraph.findall('.//w:t', namespaces)
                para_text = ''.join([t.text or '' for t in texts])
                if para_text.strip():
                    text_parts.append(para_text)
            
            return '\n\n'.join(text_parts)
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to extract text from DOCX: {str(e)}"
        )


@router.post("", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...)
):
    """
    Upload a case document for analysis.
    
    Supported formats:
    - PDF (.pdf)
    - Text (.txt)
    - Word Document (.doc, .docx)
    
    Args:
        file: The uploaded file
        
    Returns:
        UploadResponse: Contains extracted text and file metadata
    """
    # Validate file extension
    filename = file.filename or "unknown"
    file_ext = '.' + filename.split('.')[-1].lower() if '.' in filename else ''
    
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{file_ext}' not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    file_content = await file.read()
    
    # Check file size
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)} MB"
        )
    
    # Extract text based on file type
    if file_ext == '.pdf':
        text_content = extract_text_from_pdf(file_content)
        file_type = 'PDF'
    elif file_ext == '.txt':
        text_content = extract_text_from_txt(file_content)
        file_type = 'TXT'
    elif file_ext in ['.doc', '.docx']:
        text_content = extract_text_from_docx(file_content)
        file_type = 'DOCX'
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file_ext}"
        )
    
    # Validate extracted text
    if not text_content.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No text content could be extracted from the file"
        )
    
    # Generate file ID
    file_id = str(uuid4())
    
    logger.info(f"Uploaded file: {filename} ({file_type}), extracted {len(text_content)} chars")
    
    return UploadResponse(
        success=True,
        file_id=file_id,
        filename=filename,
        file_type=file_type,
        text_content=text_content,
        text_length=len(text_content),
        message=f"Successfully extracted {len(text_content)} characters from {filename}"
    )


class AnalyzeRequest(BaseModel):
    """Request schema for document analysis."""
    document_content: str
    question: str
    session_id: Optional[UUID] = None  # Optional: link to existing chat session
    document_filename: Optional[str] = None  # Optional: original filename for context


class HybridAnalyzeResponse(BaseModel):
    """Response schema for hybrid document analysis."""
    answer: str
    document_type: str
    extracted_sections: list
    legal_context: list
    sources: list
    latency_ms: int
    session_id: Optional[UUID] = None  # Chat session ID (for history)


@router.post("/analyze", response_model=HybridAnalyzeResponse)
async def analyze_document(
    request: AnalyzeRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Hybrid document analysis: Analyzes uploaded document + retrieves related legal sections from RAG.
    
    This combines:
    1. Direct LLM analysis of the uploaded document (FIR, court order, etc.)
    2. RAG retrieval for mentioned legal sections (IPC 420, 302, etc.)
    3. **NEW**: Saves conversation to chat history for authenticated users
    
    Viva Explanation:
    - This is NOT like ChatGPT because we ground responses in our legal database
    - Uploaded documents are analyzed for fact extraction
    - Mentioned sections are looked up in our curated IPC/CrPC database
    - Conversations are now persisted for future reference
    """
    import time
    import re
    from app.core.rag_pipeline import get_llm, RAGPipeline
    from app.core.prompts import DOCUMENT_ANALYSIS_PROMPT
    
    start_time = time.time()
    user_id = user.id if user else None
    session = None
    
    try:
        llm = get_llm()
        
        # Step 1: Extract section numbers mentioned in the document
        # Multiple patterns to catch various formats
        doc_text = request.document_content
        
        # Pattern 1: "Section 420" or "section 406"
        pattern1 = r'section[s]?\s*[:\-]?\s*(\d+[A-Za-z]?)'
        # Pattern 2: "420 IPC" or "302 of IPC"
        pattern2 = r'(\d+[A-Za-z]?)\s*(?:of\s*)?(?:IPC|CrPC|BNS)'
        # Pattern 3: Standalone numbers after "Section" label like "Sections: 420, 406"
        pattern3 = r'(?:section[s]?\s*[:\-]?\s*)(\d+(?:\s*,\s*\d+)*)'
        
        sections_found = []
        
        # Find from pattern 1
        sections_found.extend(re.findall(pattern1, doc_text, re.IGNORECASE))
        
        # Find from pattern 2
        sections_found.extend(re.findall(pattern2, doc_text, re.IGNORECASE))
        
        # Find comma-separated sections
        comma_matches = re.findall(pattern3, doc_text, re.IGNORECASE)
        for match in comma_matches:
            sections_found.extend([s.strip() for s in match.split(',')])
        
        # Find articles
        article_pattern = r'article\s*[:\-]?\s*(\d+[A-Za-z]?)'
        articles_found = re.findall(article_pattern, doc_text, re.IGNORECASE)
        
        # Combine and deduplicate - handle empty strings and multi-letter suffixes (e.g., 302AA)
        all_sections = set()
        for s in sections_found + articles_found:
            s_clean = s.strip()
            if not s_clean:
                continue
            # Accept patterns like: 302, 302A, 302AA, 420B, etc.
            if re.match(r'^\d+[A-Za-z]*$', s_clean):
                all_sections.add(s_clean)
        extracted_sections = list(all_sections)[:10]  # Limit to 10
        
        logger.info(f"Extracted sections from document: {extracted_sections}")

        
        # Step 2: Analyze the document with LLM (with timeout protection)
        prompt = DOCUMENT_ANALYSIS_PROMPT.format(
            document_content=request.document_content[:12000],
            question=request.question
        )
        
        try:
            # Wrap sync LLM call with async timeout
            response = await asyncio.wait_for(
                asyncio.get_running_loop().run_in_executor(None, llm.invoke, prompt),
                timeout=30.0
            )
        except asyncio.TimeoutError as err:
            logger.error("LLM invoke timed out after 30 seconds")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Document analysis timed out. Please try again with a shorter document."
            ) from err
        answer = response.content if hasattr(response, 'content') else str(response)
        
        # Step 3: Retrieve legal context from RAG for mentioned sections
        legal_context = []
        sources = []
        
        if extracted_sections:
            try:
                rag = RAGPipeline()
                
                # Search for each section in our legal database
                for section in extracted_sections[:5]:  # Limit to 5 sections
                    query = f"Section {section} IPC Indian Penal Code punishment provision"
                    docs = rag.retrieve(query, top_k=2)
                    
                    for doc in docs:
                        legal_context.append({
                            "section": section,
                            "content": doc.page_content[:500],
                            "source": doc.metadata.get("source", "Indian Law Database")
                        })
                        sources.append({
                            "title": f"Section {section}",
                            "source": doc.metadata.get("source", "IPC/CrPC"),
                            "relevance": "high"
                        })
            except Exception as e:
                logger.warning(f"RAG retrieval failed: {e}, continuing with document analysis only")
        
        # Step 4: Detect document type
        doc_content_lower = request.document_content.lower()[:500]
        if 'fir' in doc_content_lower or 'first information report' in doc_content_lower:
            doc_type = 'FIR (First Information Report)'
        elif 'judgment' in doc_content_lower or 'order' in doc_content_lower:
            doc_type = 'Court Order/Judgment'
        elif 'notice' in doc_content_lower:
            doc_type = 'Legal Notice'
        elif 'contract' in doc_content_lower or 'agreement' in doc_content_lower:
            doc_type = 'Contract/Agreement'
        else:
            doc_type = 'Legal Document'
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Step 5: Save to chat history (for authenticated users or existing sessions)
        session_id = None
        try:
            # Get or create chat session
            if request.session_id:
                session = ChatSessionCRUD.get_by_id(db, request.session_id)
                if session:
                    session_id = session.id
            
            if not session and user_id:
                # Create new session for document analysis
                filename_info = f" ({request.document_filename})" if request.document_filename else ""
                title = f"📄 {doc_type}{filename_info}"[:100]
                session = ChatSessionCRUD.create(db, user_id=user_id, title=title)
                session_id = session.id
            
            if session:
                # Build user message with document context
                doc_preview = request.document_content[:500] + "..." if len(request.document_content) > 500 else request.document_content
                user_message = f"[Document Analysis - {doc_type}]\n\n**Question:** {request.question}\n\n**Document Preview:**\n{doc_preview}"
                
                # Store user message
                ChatMessageCRUD.create(
                    db=db,
                    session_id=session.id,
                    role=MessageRole.USER,
                    content=user_message
                )
                
                # Store assistant response with sources
                sources_for_db = [
                    {"title": s.get("title", ""), "source": s.get("source", ""), "relevance": s.get("relevance", "")}
                    for s in sources
                ]
                
                ChatMessageCRUD.create(
                    db=db,
                    session_id=session.id,
                    role=MessageRole.ASSISTANT,
                    content=answer,
                    sources=sources_for_db
                )
                
                # Log query for analytics
                QueryLogCRUD.create(
                    db=db,
                    query=f"[Document Analysis] {request.question}",
                    user_id=user_id,
                    retrieved_docs=sources_for_db,
                    response=answer[:1000],  # Truncate for logging
                    sources=sources_for_db,
                    latency_ms=latency_ms,
                    was_successful=True
                )
                
                logger.info(f"Saved document analysis to chat history: session={session.id}, user={user_id}")
        except Exception as chat_save_error:
            # Log but don't fail the request if chat history save fails
            logger.warning(f"Failed to save document analysis to chat history: {chat_save_error}")
        
        logger.info(f"Hybrid analysis complete: {doc_type}, sections={extracted_sections}, latency={latency_ms}ms")
        
        return HybridAnalyzeResponse(
            answer=answer,
            document_type=doc_type,
            extracted_sections=extracted_sections,
            legal_context=legal_context,
            sources=sources,
            latency_ms=latency_ms,
            session_id=session_id
        )
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except ValueError as e:
        logger.exception(f"Hybrid document analysis value error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid input: {str(e)}"
        ) from e
    except Exception as e:
        logger.exception(f"Hybrid document analysis error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing document: {str(e)}"
        ) from e
