# Indian Law RAG Chatbot - RAG Pipeline
"""
Main RAG (Retrieval-Augmented Generation) pipeline implementation.
Combines retrieval and generation for accurate legal question answering.

Viva Explanation:
- RAG = Retrieval + Augmented + Generation
- Retrieval: Find relevant documents from FAISS
- Augmented: Add retrieved context to the prompt
- Generation: LLM generates answer from context only
"""

import time
from typing import List, Optional, Tuple
import logging

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document
from langchain_core.runnables import RunnablePassthrough

from app.config import settings
from app.core.vector_store import vector_store_manager, load_vector_store
from app.core.prompts import (
    RAG_SYSTEM_PROMPT, 
    RAG_QA_TEMPLATE, 
    FALLBACK_RESPONSE,
    format_retrieved_context
)
from app.schemas.chat import LegalSource

logger = logging.getLogger(__name__)


def get_llm():
    """
    Get the configured LLM model.
    
    Returns:
        ChatModel: LangChain chat model instance
        
    Viva Explanation:
    - Temperature=0 for deterministic, factual responses
    - Prevents creative/random outputs for legal accuracy
    - Groq provides ultra-fast inference
    """
    if settings.llm_provider == "openai":
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required")
        
        return ChatOpenAI(
            api_key=settings.openai_api_key,
            model="gpt-4-turbo-preview",
            temperature=settings.llm_temperature
        )
    
    elif settings.llm_provider == "gemini":
        if not settings.google_api_key:
            raise ValueError("GOOGLE_API_KEY is required")
        
        return ChatGoogleGenerativeAI(
            google_api_key=settings.google_api_key,
            model="gemini-1.5-flash",
            temperature=settings.llm_temperature
        )
    
    elif settings.llm_provider == "openrouter":
        if not settings.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY is required")
        
        return ChatOpenAI(
            api_key=settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
            model=settings.openrouter_model,
            temperature=settings.llm_temperature,
            default_headers={
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Indian Law RAG Chatbot"
            }
        )
    
    elif settings.llm_provider == "groq":
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY is required")
        
        from langchain_groq import ChatGroq
        return ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            temperature=settings.llm_temperature
        )
    
    else:
        raise ValueError(f"Unsupported LLM provider: {settings.llm_provider}")


class RAGPipeline:
    """
    Main RAG pipeline for Indian Law question answering.
    
    Viva Explanation:
    - Orchestrates the entire RAG workflow
    - Handles retrieval, context formatting, and generation
    - Implements anti-hallucination safeguards
    """
    
    def __init__(self):
        self._llm = None
        self._vector_store = None
    
    @property
    def llm(self):
        """Lazy load LLM."""
        if self._llm is None:
            self._llm = get_llm()
        return self._llm
    
    @property
    def vector_store(self):
        """Lazy load vector store."""
        if self._vector_store is None:
            self._vector_store = load_vector_store()
        return self._vector_store
    
    def retrieve(
        self, 
        query: str, 
        top_k: int = None
    ) -> List[Document]:
        """
        Retrieve relevant documents for a query.
        
        Args:
            query: User's legal question
            top_k: Number of documents to retrieve
            
        Returns:
            List[Document]: Retrieved documents with metadata
        """
        k = top_k or settings.top_k_results
        
        # Enhance query for section number queries
        enhanced_query = self._enhance_section_query(query)
        
        logger.info(f"Retrieving top-{k} documents for query: {enhanced_query[:100]}...")
        
        documents = self.vector_store.similarity_search(enhanced_query, k=k)
        
        logger.info(f"Retrieved {len(documents)} documents")
        return documents
    
    def _enhance_section_query(self, query: str) -> str:
        """
        Enhance queries about specific sections for better retrieval.
        
        If user asks "What is Section 65B", expand to include relevant keywords
        that improve semantic matching.
        """
        import re
        
        # Check for section/article references
        section_match = re.search(r'section\s*(\d+[A-Za-z]*)', query, re.IGNORECASE)
        article_match = re.search(r'article\s*(\d+[A-Za-z]*)', query, re.IGNORECASE)
        
        if section_match:
            section_num = section_match.group(1)
            # Add context keywords to improve matching
            enhanced = f"{query} Section {section_num} legal provision Indian law"
            
            # Special handling for known important sections
            section_context = {
                "65B": "electronic records admissibility Evidence Act computer output",
                "65A": "electronic record Evidence Act",
                "302": "murder punishment IPC death penalty",
                "304": "culpable homicide not amounting to murder IPC",
                "420": "cheating IPC dishonestly",
                "498A": "cruelty by husband IPC domestic violence",
                "376": "rape IPC sexual assault",
            }
            
            if section_num.upper() in section_context:
                enhanced = f"{query} {section_context[section_num.upper()]}"
            
            return enhanced
        
        if article_match:
            article_num = article_match.group(1)
            return f"{query} Article {article_num} Constitution of India fundamental rights"
        
        return query
    
    def retrieve_with_scores(
        self, 
        query: str, 
        top_k: int = None,
        score_threshold: float = None
    ) -> List[Tuple[Document, float]]:
        """
        Retrieve documents with similarity scores.
        
        Args:
            query: User's question
            top_k: Number to retrieve
            score_threshold: Minimum score threshold
            
        Returns:
            List[Tuple[Document, float]]: Documents with scores
        """
        k = top_k or settings.top_k_results
        
        results = self.vector_store.similarity_search_with_score(query, k=k)
        
        # Filter by threshold if specified
        if score_threshold is not None:
            results = [(doc, score) for doc, score in results if score <= score_threshold]
        
        return results
    
    def format_sources(self, documents: List[Document]) -> List[LegalSource]:
        """
        Convert retrieved documents to LegalSource format.
        
        Args:
            documents: Retrieved documents
            
        Returns:
            List[LegalSource]: Formatted legal sources
        """
        sources = []
        for doc in documents:
            source = LegalSource(
                act=doc.metadata.get("act_name", "Unknown Act"),
                section=doc.metadata.get("section"),
                title=doc.metadata.get("title"),
                content=doc.page_content[:500]  # Truncate for response
            )
            sources.append(source)
        return sources
    
    def generate_response(
        self, 
        query: str, 
        context: str
    ) -> str:
        """
        Generate response using LLM with retrieved context.
        
        Args:
            query: User's question
            context: Formatted context from retrieved documents
            
        Returns:
            str: Generated response
            
        Viva Explanation:
        - Uses carefully crafted prompt with anti-hallucination rules
        - LLM is constrained to use ONLY the provided context
        - Returns fallback if no relevant information found
        """
        # Create prompt template
        prompt = ChatPromptTemplate.from_messages([
            ("system", RAG_SYSTEM_PROMPT),
            ("human", RAG_QA_TEMPLATE)
        ])
        
        # Create chain
        chain = prompt | self.llm | StrOutputParser()
        
        # Generate response
        response = chain.invoke({
            "context": context,
            "question": query
        })
        
        return response
    
    def query(
        self, 
        query: str, 
        top_k: int = None
    ) -> Tuple[str, List[LegalSource], bool, int]:
        """
        Execute full RAG pipeline for a query.
        
        Args:
            query: User's legal question
            top_k: Number of documents to retrieve
            
        Returns:
            Tuple containing:
            - answer (str): Generated response
            - sources (List[LegalSource]): Cited sources
            - is_fallback (bool): True if no relevant docs found
            - latency_ms (int): Response time in milliseconds
            
        Viva Explanation:
        - Complete RAG workflow: retrieve -> format -> generate
        - Tracks latency for performance monitoring
        - Returns structured response with citations
        """
        start_time = time.time()
        
        try:
            # Step 1: Retrieve relevant documents
            documents = self.retrieve(query, top_k)
            
            # Step 2: Check if any relevant documents found
            if not documents:
                logger.warning(f"No documents found for query: {query[:100]}")
                latency_ms = int((time.time() - start_time) * 1000)
                return FALLBACK_RESPONSE, [], True, latency_ms
            
            # Step 3: Format context
            context = format_retrieved_context(documents)
            
            # Step 4: Generate response
            answer = self.generate_response(query, context)
            
            # Step 5: Format sources
            sources = self.format_sources(documents)
            
            # Calculate latency
            latency_ms = int((time.time() - start_time) * 1000)
            
            # Check if response is a fallback
            is_fallback = FALLBACK_RESPONSE.lower() in answer.lower()
            
            logger.info(f"Query completed in {latency_ms}ms")
            
            return answer, sources, is_fallback, latency_ms
        
        except Exception as e:
            logger.error(f"RAG pipeline error: {e}")
            latency_ms = int((time.time() - start_time) * 1000)
            raise
    
    def is_ready(self) -> bool:
        """Check if the pipeline is ready for queries."""
        try:
            return self.vector_store.is_loaded()
        except Exception:
            return False


# Global RAG pipeline instance
rag_pipeline = RAGPipeline()


def get_rag_pipeline() -> RAGPipeline:
    """
    Get the RAG pipeline instance (for dependency injection).
    
    Returns:
        RAGPipeline: Global pipeline instance
    """
    return rag_pipeline
