# app/utils/audit.py
"""
Security audit logging utilities.
Records authentication events and security-relevant actions.

PERSISTENCE MODEL:
- Critical events (severity="critical") use an independent session/transaction
  to ensure they are persisted even if the caller's transaction rolls back.
- Non-critical events use db.flush() to work with the caller's transaction
  (faster, but may be lost on rollback).
"""

from datetime import datetime, timezone
from uuid import UUID
from typing import Optional
from sqlalchemy.orm import Session
import logging

from app.db.models import AuditLog
from app.core.encryption import encrypt_metadata

logger = logging.getLogger(__name__)


def _get_audit_session() -> Session:
    """
    Create an independent session for critical audit events.
    This ensures critical audit logs are persisted even if caller rolls back.
    """
    # Import here to avoid circular imports
    from app.db.database import SessionLocal
    return SessionLocal()


class AuditLogger:
    """
    Audit logging for security events.
    
    Persistence behavior:
    - Critical events: Independent transaction (always persisted)
    - Other events: Uses caller's transaction via flush() (may rollback)
    """
    
    @staticmethod
    def log_event(
        db: Session,
        event_type: str,
        event_category: str,
        severity: str = "info",
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[dict] = None,
        success: bool = True,
        force_commit: bool = False
    ) -> None:
        """
        Log a security audit event.
        
        Args:
            db: Database session (used for non-critical events)
            event_type: Type of event (login, logout, failed_auth, etc.)
            event_category: Category (authentication, access_control, data_access)
            severity: Severity level (info, warning, critical)
            user_id: User ID involved
            ip_address: Client IP address
            user_agent: Client user agent
            details: Additional details (will be encrypted)
            success: Whether action succeeded
            force_commit: If True, use independent session even for non-critical events
            
        Note:
            - severity="critical" or force_commit=True: Uses independent transaction
              to guarantee persistence regardless of caller's transaction outcome.
            - Other cases: Uses db.flush() which may be lost if caller rolls back.
        """
        try:
            # Encrypt sensitive details
            details_encrypted = None
            if details:
                import json
                details_str = json.dumps(details)
                details_encrypted = encrypt_metadata(details_str)
            
            # Create audit log entry
            audit_log = AuditLog(
                user_id=user_id,
                event_type=event_type,
                event_category=event_category,
                severity=severity,
                ip_address=ip_address,
                user_agent=user_agent,
                details_encrypted=details_encrypted,
                success=success,
                timestamp=datetime.now(timezone.utc)
            )
            
            # Determine persistence strategy
            use_independent_session = severity == "critical" or force_commit
            
            if use_independent_session:
                # Critical events: Use independent session to guarantee persistence
                # This ensures the audit log survives even if caller rolls back
                audit_session = _get_audit_session()
                try:
                    audit_session.add(audit_log)
                    audit_session.commit()
                except Exception as e:
                    audit_session.rollback()
                    logger.error(f"Failed to commit critical audit log: {e}")
                    raise
                finally:
                    audit_session.close()
            else:
                # Non-critical events: Use caller's session with flush
                # Note: May be lost if caller's transaction rolls back
                db.add(audit_log)
                db.flush()
            
            # Also log to application logs
            log_msg = (
                f"AUDIT: {event_type} | "
                f"user={user_id} | "
                f"ip={ip_address} | "
                f"success={success}"
            )
            
            if severity == "critical":
                logger.critical(log_msg)
            elif severity == "warning":
                logger.warning(log_msg)
            else:
                logger.info(log_msg)
                
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
    
    @staticmethod
    def log_login(
        db: Session,
        user_id: UUID,
        ip_address: str,
        user_agent: str,
        success: bool
    ) -> None:
        """Log login attempt."""
        AuditLogger.log_event(
            db=db,
            event_type="login_attempt" if not success else "login_success",
            event_category="authentication",
            severity="warning" if not success else "info",
            user_id=user_id if success else None,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success
        )
    
    @staticmethod
    def log_logout(
        db: Session,
        user_id: UUID,
        ip_address: str,
        user_agent: str
    ) -> None:
        """Log logout event."""
        AuditLogger.log_event(
            db=db,
            event_type="logout",
            event_category="authentication",
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True
        )
    
    @staticmethod
    def log_failed_authentication(
        db: Session,
        email: str,
        ip_address: str,
        user_agent: str,
        reason: str
    ) -> None:
        """Log failed authentication attempt."""
        AuditLogger.log_event(
            db=db,
            event_type="auth_failed",
            event_category="authentication",
            severity="warning",
            ip_address=ip_address,
            user_agent=user_agent,
            details={"email": email, "reason": reason},
            success=False
        )
    
    @staticmethod
    def log_password_change(
        db: Session,
        user_id: UUID,
        ip_address: str,
        user_agent: str
    ) -> None:
        """Log password change."""
        AuditLogger.log_event(
            db=db,
            event_type="password_change",
            event_category="authentication",
            severity="info",
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True
        )
    
    @staticmethod
    def log_suspicious_activity(
        db: Session,
        event_type: str,
        ip_address: str,
        details: dict,
        user_id: Optional[UUID] = None
    ) -> None:
        """Log suspicious activity."""
        AuditLogger.log_event(
            db=db,
            event_type=event_type,
            event_category="security_violation",
            severity="critical",
            user_id=user_id,
            ip_address=ip_address,
            details=details,
            success=False
        )
