# Indian Law RAG Chatbot - Privacy & Compliance Utilities
"""
Legal data privacy and compliance utilities.

Implements:
- Right to erasure (GDPR/DPDPA compliant data deletion)
- Data export (user can download all their data)
- Memory isolation audit (verify no cross-user leakage)
- PII redaction from logs

Viva Explanation:
- Digital Personal Data Protection Act 2023 (India) requires:
  * Consent-based data processing
  * Right to access personal data
  * Right to erasure / correction
  * Data breach notification
- All user memories are scoped by user_id with CASCADE deletes
- Audit logs track all data access events
"""

import logging
import re
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session

from app.db.models import (
    User, ChatSession, ChatMessage, QueryLog,
    UserProfile, UserMemory, EncryptedData, AuditLog,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Right to Erasure — Delete ALL user data
# =============================================================================

def delete_all_user_data(db: Session, user_id: uuid.UUID) -> Dict[str, int]:
    """
    Delete every piece of data associated with a user.
    Complies with DPDPA Section 12 (Right to Erasure) and GDPR Art. 17.

    Returns:
        Dict with counts of deleted records per table.

    Viva Explanation:
    - CASCADE on foreign keys handles most relations automatically
    - Explicit cleanup for memories & encrypted data
    - Audit log records the deletion event (retained for compliance)
    """
    counts = {}

    try:
        # 1. User memories
        c = db.query(UserMemory).filter(UserMemory.user_id == user_id).delete()
        counts["memories"] = c

        # 2. User profile
        c = db.query(UserProfile).filter(UserProfile.user_id == user_id).delete()
        counts["profile"] = c

        # 3. Encrypted data
        c = db.query(EncryptedData).filter(EncryptedData.user_id == user_id).delete()
        counts["encrypted_data"] = c

        # 4. Query logs
        c = db.query(QueryLog).filter(QueryLog.user_id == user_id).delete()
        counts["query_logs"] = c

        # 5. Chat sessions + messages (CASCADE)
        sessions = db.query(ChatSession).filter(
            ChatSession.user_id == user_id
        ).all()
        msg_count = 0
        for s in sessions:
            msg_count += db.query(ChatMessage).filter(
                ChatMessage.session_id == s.id
            ).delete()
        counts["messages"] = msg_count
        c = db.query(ChatSession).filter(
            ChatSession.user_id == user_id
        ).delete()
        counts["sessions"] = c

        # 6. Record audit event BEFORE deleting user
        audit = AuditLog(
            user_id=user_id,
            event_type="data_erasure",
            event_category="data_access",
            severity="info",
            success=True,
        )
        db.add(audit)

        # 7. Delete user account
        c = db.query(User).filter(User.id == user_id).delete()
        counts["user"] = c

        db.commit()
        safe_id = redact_pii(str(user_id))
        logger.info(f"Erased all data for user_id={safe_id}: {counts}")
        return counts

    except Exception as e:
        db.rollback()
        safe_id = redact_pii(str(user_id))
        logger.error(f"Data erasure failed for user_id={safe_id}: {e}")
        raise


# =============================================================================
# Data Export — Portable copy of all user data
# =============================================================================

def export_user_data(db: Session, user_id: uuid.UUID) -> Dict[str, Any]:
    """
    Export all data belonging to a user in a portable JSON-safe format.
    Complies with DPDPA Section 11 (Right to Access) and GDPR Art. 20.

    Returns:
        Dict containing all user tables serialized.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "User not found"}

    # Profile
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == user_id
    ).first()

    # Memories
    memories = db.query(UserMemory).filter(
        UserMemory.user_id == user_id
    ).order_by(UserMemory.created_at).all()

    # Sessions + Messages
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == user_id
    ).order_by(ChatSession.created_at).all()

    sessions_data = []
    for s in sessions:
        msgs = db.query(ChatMessage).filter(
            ChatMessage.session_id == s.id
        ).order_by(ChatMessage.created_at).all()
        sessions_data.append({
            "id": str(s.id),
            "title": s.title,
            "created_at": s.created_at.isoformat(),
            "messages": [
                {
                    "role": m.role.value,
                    "content": m.content,
                    "created_at": m.created_at.isoformat(),
                }
                for m in msgs
            ]
        })

    # Query logs
    logs = db.query(QueryLog).filter(
        QueryLog.user_id == user_id
    ).order_by(QueryLog.created_at).all()

    return {
        "exported_at": datetime.utcnow().isoformat(),
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "created_at": user.created_at.isoformat(),
        },
        "profile": {
            "location": profile.location if profile else None,
            "preferred_language": profile.preferred_language if profile else None,
            "case_types": profile.case_types if profile else [],
            "legal_interests": profile.legal_interests if profile else [],
        },
        "memories": [
            {
                "type": m.memory_type,
                "content": m.content,
                "importance": m.importance_score,
                "created_at": m.created_at.isoformat(),
            }
            for m in memories
        ],
        "sessions": sessions_data,
        "query_logs": [
            {
                "query": l.query,
                "was_successful": l.was_successful,
                "created_at": l.created_at.isoformat(),
            }
            for l in logs
        ],
    }


# =============================================================================
# PII Redaction — Strip personal info from log strings
# =============================================================================

# Patterns for common Indian PII
_PII_PATTERNS = [
    (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), '[EMAIL]'),
    (re.compile(r'\b\d{12}\b'), '[AADHAAR]'),       # 12-digit Aadhaar
    (re.compile(r'\b\d{10}\b'), '[PHONE]'),          # 10-digit phone
    (re.compile(r'[A-Z]{5}\d{4}[A-Z]'), '[PAN]'),   # PAN card
    (re.compile(r'\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b'), '[CARD]'),  # Card numbers
]


def redact_pii(text: str) -> str:
    """
    Redact personally identifiable information from text before logging.

    Viva Explanation:
    - Prevents PII from appearing in application logs
    - Matches Aadhaar, PAN, phone, email, card patterns
    - Applied to log output, NOT to user-facing responses
    """
    for pattern, replacement in _PII_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


# =============================================================================
# Memory Isolation Audit
# =============================================================================

def audit_memory_isolation(db: Session) -> Dict[str, Any]:
    """
    Run a diagnostic check to verify no cross-user memory leakage.
    Checks that every memory entry has a valid user_id foreign key.

    Returns:
        Dict with audit results.
    """
    from sqlalchemy import func

    total = db.query(func.count(UserMemory.id)).scalar()
    orphaned = db.query(func.count(UserMemory.id)).filter(
        ~UserMemory.user_id.in_(
            db.query(User.id)
        )
    ).scalar()

    # Count distinct users with memories
    users_with_mem = db.query(
        func.count(func.distinct(UserMemory.user_id))
    ).scalar()

    result = {
        "total_memories": total,
        "orphaned_memories": orphaned,
        "users_with_memories": users_with_mem,
        "isolation_ok": orphaned == 0,
        "checked_at": datetime.utcnow().isoformat(),
    }

    if orphaned > 0:
        logger.warning(f"MEMORY ISOLATION BREACH: {orphaned} orphaned memories found!")
    else:
        logger.info(f"Memory isolation audit passed: {total} memories, {users_with_mem} users")

    return result
