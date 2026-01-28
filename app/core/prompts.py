# Indian Law RAG Chatbot - Anti-Hallucination Prompts
"""
Carefully crafted prompt templates for the RAG pipeline.
Designed to prevent hallucinations and ensure legal accuracy.

Viva Explanation:
- Prompt engineering is crucial for RAG systems
- Clear instructions prevent the LLM from using external knowledge
- Structured format ensures consistent, citable responses
"""

# =============================================================================
# Main RAG System Prompt
# =============================================================================
RAG_SYSTEM_PROMPT = """You are an expert Indian Law Assistant providing legal information based on the provided context from Indian legal documents.

## YOUR TASK:
Answer legal questions using the information from the CONTEXT section. Be helpful and informative.

## GUIDELINES:

1. **USE THE CONTEXT**: Base your answer on the information provided in the CONTEXT. Synthesize information from multiple documents if relevant.

2. **BE HELPFUL**: If the context contains related or partial information, provide what's available and note what aspects are covered.

3. **CITE YOUR SOURCES**: Include citations in the format [Act Name, Section X] when referencing specific provisions.

4. **WHEN INFORMATION IS MISSING**: If the specific question cannot be answered from the context:
   - Mention what related information IS available
   - Then state that the specific answer is not found
   - Do NOT make up laws or provisions

5. **QUOTE RELEVANT TEXT**: When helpful, quote the actual legal text from the documents.

## Response Style:
- Clear and direct
- Cite specific sections
- Quote relevant provisions
- Be helpful, not overly restrictive"""


# =============================================================================
# RAG Question-Answer Template
# =============================================================================
RAG_QA_TEMPLATE = """## CONTEXT (Indian Legal Documents):
{context}

---

## USER QUESTION:
{question}

---

## INSTRUCTIONS:
Based ONLY on the context provided above, answer the user's question. Follow these steps:

1. Search the context for relevant information
2. If found, provide a clear answer with citations [Act Name, Section X]
3. If NOT found, respond: "The requested information is not available in the provided legal documents."
4. Quote relevant portions from the context when helpful

## YOUR ANSWER:"""


# =============================================================================
# Context Formatting Template
# =============================================================================
def format_retrieved_context(documents: list) -> str:
    """
    Format retrieved documents into a structured context string.
    
    Args:
        documents: List of retrieved document chunks with metadata
        
    Returns:
        str: Formatted context for the LLM
    """
    if not documents:
        return "No relevant documents found in the legal database."
    
    context_parts = []
    for i, doc in enumerate(documents, 1):
        # Extract metadata
        act_name = doc.metadata.get("act_name", "Unknown Act")
        section = doc.metadata.get("section", "")
        title = doc.metadata.get("title", "")
        
        # Format the document
        header = f"[Document {i}]"
        source_info = f"Source: {act_name}"
        if section:
            source_info += f", {section}"
        if title:
            source_info += f" - {title}"
        
        context_parts.append(f"{header}\n{source_info}\nContent:\n{doc.page_content}\n")
    
    return "\n---\n".join(context_parts)


# =============================================================================
# Fallback Response
# =============================================================================
FALLBACK_RESPONSE = "The requested information is not available in the provided legal documents."


# =============================================================================
# Query Refinement Prompt (Optional Enhancement)
# =============================================================================
QUERY_REFINEMENT_PROMPT = """Given the user's question about Indian law, create a search-optimized query for finding relevant legal sections.

Original Question: {question}

Create a refined search query that:
1. Focuses on key legal terms
2. Includes relevant act names if mentioned
3. Removes unnecessary words

Refined Query:"""


# =============================================================================
# Conversation History Template
# =============================================================================
CONVERSATION_CONTEXT_TEMPLATE = """## Previous Conversation:
{chat_history}

## Current Question:
{question}

Answer the current question based on the provided legal context. You may use the conversation history for context about what the user is asking about, but your answer must still come ONLY from the legal documents provided."""
