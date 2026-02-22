# Indian Law RAG Chatbot - Per-User Memory Manager
"""
Implements short-term (session) and long-term (persistent) memory
for each user.  All operations are scoped by user_id to guarantee
strict data isolation — no cross-user leakage.

Viva Explanation:
- Short-term memory: last N messages from the current chat session
- Long-term memory: summarised conversation insights stored in DB
- Memory recall: relevant past memories are injected into the RAG
  prompt so the LLM can reference earlier interactions
"""

import logging
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session

from app.db.crud import UserMemoryCRUD, UserProfileCRUD, ChatMessageCRUD
from app.db.models import UserMemory, UserProfile, ChatMessage

logger = logging.getLogger(__name__)


# =============================================================================
# Short-Term Memory (current session context window)
# =============================================================================

def get_short_term_context(
    db: Session,
    session_id: uuid.UUID,
    max_messages: int = 10
) -> str:
    """
    Build a short-term context string from the current chat session.

    Returns the last `max_messages` messages formatted as:
      User: ...
      Assistant: ...

    Viva Explanation:
    - Provides conversational continuity within a single session
    - Limited window avoids exceeding LLM context limits
    """
    messages: List[ChatMessage] = ChatMessageCRUD.get_recent_context(
        db, session_id, limit=max_messages
    )

    if not messages:
        return ""

    lines = []
    for msg in messages:
        role_label = "User" if msg.role.value == "user" else "Assistant"
        # Truncate very long messages to save context space
        content = msg.content[:500] if len(msg.content) > 500 else msg.content
        lines.append(f"{role_label}: {content}")

    return "\n".join(lines)


# =============================================================================
# Long-Term Memory (persistent per-user memory store)
# =============================================================================

def store_conversation_summary(
    db: Session,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    summary: str,
    importance: float = 0.5,
    metadata: Optional[dict] = None
) -> UserMemory:
    """
    Store a conversation summary as a long-term memory entry.

    Called at the end of each session (or periodically) to persist
    key insights that the chatbot can recall later.
    """
    return UserMemoryCRUD.create(
        db=db,
        user_id=user_id,
        memory_type="conversation_summary",
        content=summary,
        metadata_json=metadata or {"session_id": str(session_id)},
        importance_score=importance,
        session_id=session_id,
    )


def store_user_fact(
    db: Session,
    user_id: uuid.UUID,
    fact: str,
    importance: float = 0.7,
    metadata: Optional[dict] = None
) -> UserMemory:
    """
    Store a discrete user fact (e.g., "User is from Maharashtra",
    "User's case is under Section 498A").
    """
    return UserMemoryCRUD.create(
        db=db,
        user_id=user_id,
        memory_type="user_fact",
        content=fact,
        metadata_json=metadata or {},
        importance_score=importance,
    )


def recall_relevant_memories(
    db: Session,
    user_id: uuid.UUID,
    query: str,
    limit: int = 5
) -> str:
    """
    Recall long-term memories relevant to the current query.

    Strategy:
    1. Fetch recent conversation summaries (temporal relevance)
    2. Text-search memories matching keywords in the query
    3. Deduplicate and rank by importance

    Returns a formatted string ready to inject into the LLM prompt.

    Viva Explanation:
    - Always scoped to user_id — no other user's data is touched
    - Combines recency with keyword relevance
    """
    memories: List[UserMemory] = []

    # 1. Recent summaries (always useful for continuity)
    recent = UserMemoryCRUD.get_recent_summaries(db, user_id, limit=3)
    memories.extend(recent)

    # 2. Keyword search for query-relevant memories
    keywords = _extract_keywords(query)
    if keywords:
        for kw in keywords[:3]:  # limit keyword searches
            matches = UserMemoryCRUD.search_memories_text(
                db, user_id, kw, limit=3
            )
            memories.extend(matches)

    # 3. Also fetch high-importance user facts
    facts = UserMemoryCRUD.get_user_memories(
        db, user_id, memory_type="user_fact", limit=5
    )
    memories.extend(facts)

    # Deduplicate by id
    seen_ids = set()
    unique: List[UserMemory] = []
    for m in memories:
        if m.id not in seen_ids:
            seen_ids.add(m.id)
            unique.append(m)

    # Sort by importance (desc) then recency (desc)
    import datetime as _dt
    unique.sort(key=lambda m: (m.importance_score or 0, m.created_at or _dt.datetime.min), reverse=True)

    # Take top N
    top_memories = unique[:limit]

    if not top_memories:
        return ""

    # Format for prompt injection
    parts = ["## Relevant User History (from previous conversations):"]
    for i, mem in enumerate(top_memories, 1):
        mem_date = mem.created_at.strftime("%Y-%m-%d") if mem.created_at else "unknown"
        parts.append(f"[Memory {i} | {mem.memory_type} | {mem_date}]\n{mem.content}")

    return "\n\n".join(parts)


def get_user_profile_context(db: Session, user_id: uuid.UUID) -> str:
    """
    Build a profile context string for the LLM prompt.

    Returns something like:
      User location: Maharashtra
      Known interests: property law, criminal law
      Preferred language: hi
    """
    profile: UserProfile = UserProfileCRUD.get_or_create(db, user_id)

    lines = []
    if profile.location:
        lines.append(f"User location: {profile.location}")
    if profile.case_types:
        lines.append(f"Case types discussed: {', '.join(profile.case_types)}")
    if profile.legal_interests:
        lines.append(f"Legal interests: {', '.join(profile.legal_interests)}")
    if profile.preferred_language and profile.preferred_language != "en":
        lines.append(f"Preferred language: {profile.preferred_language}")
    if profile.extra_context:
        for k, v in profile.extra_context.items():
            lines.append(f"{k}: {v}")

    return "\n".join(lines) if lines else ""


# =============================================================================
# Summarisation helper (uses the same LLM to compress a session)
# =============================================================================

def summarise_session_for_memory(messages_text: str, llm=None) -> str:
    """
    Use the LLM to produce a concise summary of a chat session.
    The summary is stored as a long-term memory entry.

    If no LLM is provided, falls back to a simple truncation.
    """
    if llm is None:
        # Fallback: first 500 chars
        return messages_text[:500]

    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import StrOutputParser

    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "You are a concise summariser. Given a chat conversation about Indian law, "
         "produce a 2-4 sentence summary capturing: the user's question topic, "
         "key legal sections discussed, and any personal details the user shared "
         "(name, location, case type).  Output ONLY the summary."),
        ("human", "{conversation}")
    ])

    chain = prompt | llm | StrOutputParser()
    try:
        return chain.invoke({"conversation": messages_text})
    except Exception as e:
        logger.error(f"Summarisation failed, using truncation: {e}")
        return messages_text[:500]


# =============================================================================
# Helpers
# =============================================================================

def _extract_keywords(text: str) -> List[str]:
    """Extract meaningful keywords from a query for memory search."""
    import re
    # Remove common stop words
    stop_words = {
        "what", "is", "the", "of", "in", "a", "an", "and", "or", "to",
        "for", "on", "it", "my", "me", "can", "you", "how", "does",
        "do", "are", "was", "were", "been", "be", "have", "has",
        "this", "that", "which", "who", "whom", "where", "when", "why",
        "about", "under", "with", "from", "by", "at", "as", "if", "not",
        "please", "tell", "explain", "describe",
    }
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    return [w for w in words if w not in stop_words]
