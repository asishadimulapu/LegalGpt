"""
Contact form endpoint.

Receives messages from the contact page and delivers them via Brevo
transactional email to the support address.
"""

import html
import ipaddress
import logging
import time
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field

from app.config import settings
from app.utils.crypto import encrypt_contact

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["Contact"])

# ── Trusted reverse-proxy IPs (loopback + configured gateways) ──
_DEFAULT_TRUSTED = {"127.0.0.1", "::1"}
_TRUSTED_PROXIES: set[str] = _DEFAULT_TRUSTED | {
    entry.strip()
    for entry in (settings.trusted_proxy_ips.split(",") if getattr(settings, "trusted_proxy_ips", "") else [])
    if entry.strip()
}

# ── Simple in-memory rate-limit (per IP, 5 submissions / hour) ───
_RATE_WINDOW = 3600
_RATE_MAX = 5
_rate_store: dict = {}


def _is_rate_limited(ip: str) -> bool:
    now = time.time()
    entry = _rate_store.get(ip)
    if entry is None or now - entry["start"] > _RATE_WINDOW:
        _rate_store[ip] = {"start": now, "count": 1}
        return False
    entry["count"] += 1
    return entry["count"] > _RATE_MAX


def _get_client_ip(request: Request) -> str:
    """Extract the real client IP with proxy trust and validation.

    Only honours X-Forwarded-For when the direct peer is a trusted proxy.
    Falls back to a unique per-request ID when the peer address is unknown
    so rate-limit buckets are never shared across anonymous callers.
    """
    direct_ip = request.client.host if request.client else None

    # When behind a trusted proxy, use the first entry from X-Forwarded-For
    if direct_ip and direct_ip in _TRUSTED_PROXIES:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            candidate = forwarded.split(",")[0].strip()
            try:
                ipaddress.ip_address(candidate)
                return candidate
            except ValueError:
                logger.warning(
                    "Invalid IP in X-Forwarded-For: %s — falling back to proxy IP %s",
                    candidate, direct_ip,
                )
                return direct_ip  # deterministic key so rate-limits use a stable bucket

    # Direct connection — validate the peer address
    if direct_ip:
        try:
            ipaddress.ip_address(direct_ip)
            return direct_ip
        except ValueError:
            pass

    # No usable IP — generate a unique fallback so rate-limits stay isolated
    return f"unknown-{uuid.uuid4()}"


# ── Request / Response schemas ───────────────────────
class ContactRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    subject: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=10, max_length=5000)


class ContactResponse(BaseModel):
    message: str


# ── Endpoint ─────────────────────────────────────────
@router.post("", response_model=ContactResponse, status_code=status.HTTP_200_OK)
async def submit_contact(body: ContactRequest, request: Request):
    """Receive a contact-form submission and email it to support."""
    client_ip = _get_client_ip(request)

    if _is_rate_limited(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many submissions. Please try again later.",
        )

    # ── E2EE: Encrypt sensitive fields for logging ──
    enc_email = encrypt_contact(body.email)

    # ── HTML-escape user input to prevent XSS in email ──
    safe_name = html.escape(body.name)
    safe_email = html.escape(body.email)
    safe_subject = html.escape(body.subject)
    safe_message = html.escape(body.message)

    # Send via Brevo transactional email
    try:
        import sib_api_v3_sdk
        from sib_api_v3_sdk.rest import ApiException

        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key["api-key"] = settings.brevo_api_key
        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
            sib_api_v3_sdk.ApiClient(configuration)
        )

        html_body = f"""
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:8px;">
            <h2 style="color:#1a1a2e;">&#128274; New Contact Form Submission</h2>
            <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;font-weight:600;color:#555;">Name</td><td style="padding:8px 0;">{safe_name}</td></tr>
                <tr><td style="padding:8px 0;font-weight:600;color:#555;">Email</td><td style="padding:8px 0;"><a href="mailto:{safe_email}">{safe_email}</a></td></tr>
                <tr><td style="padding:8px 0;font-weight:600;color:#555;">Subject</td><td style="padding:8px 0;">{safe_subject}</td></tr>
            </table>
            <h3 style="margin-top:20px;color:#1a1a2e;">Message</h3>
            <p style="background:#f8f8f8;padding:16px;border-radius:6px;white-space:pre-wrap;">{safe_message}</p>
            <hr style="margin:24px 0;border:none;border-top:1px solid #e0e0e0;" />
            <p style="font-size:12px;color:#888;">IP: {html.escape(client_ip)}</p>
        </div>
        """

        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": settings.support_email, "name": "LawGPT Support"}],
            sender={"email": "noreply@law-gpt.app", "name": "LawGPT Contact Form"},
            reply_to={"email": body.email, "name": body.name},
            subject=f"[Contact] {body.subject} — from {body.name}",
            html_content=html_body,
        )

        api_instance.send_transac_email(send_smtp_email)
        # Log only encrypted identifiers — never plaintext PII
        logger.info("Contact form email sent — from=%s subject=[redacted]", enc_email)

    except Exception as exc:
        logger.error("Failed to send contact email: %s", exc)
        # Return error so user knows to retry
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to deliver your message. Please try again or email us directly.",
        )

    return ContactResponse(message="Your message has been sent. We'll get back to you within 24-48 hours.")
