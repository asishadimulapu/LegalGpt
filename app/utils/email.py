# Indian Law RAG Chatbot - Email Utility (Brevo / Sendinblue)
"""
Transactional email sending via the Brevo REST API.
Uses the `requests` library (already a project dependency) instead of
the heavy `sib-api-v3-sdk` package.
"""

import logging
import html as html_mod
import requests

from app.config import settings

logger = logging.getLogger(__name__)

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"


def _send_brevo_email(
    to_email: str,
    to_name: str,
    subject: str,
    html_content: str,
) -> bool:
    """
    Send a transactional email through the Brevo SMTP API.

    Returns True on success, False on failure (logged, never raises).
    """
    if not settings.brevo_api_key:
        logger.error("BREVO_API_KEY is not configured — cannot send email")
        return False

    payload = {
        "sender": {
            "name": settings.support_email_name,
            "email": settings.support_email,
        },
        "to": [{"email": to_email, "name": to_name or to_email}],
        "subject": subject,
        "htmlContent": html_content,
    }

    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": settings.brevo_api_key,
    }

    try:
        resp = requests.post(BREVO_SEND_URL, json=payload, headers=headers, timeout=15)
        if resp.status_code in (200, 201):
            logger.info(f"Password-reset email sent to {to_email}")
            return True
        logger.error(
            f"Brevo API error {resp.status_code}: {resp.text[:300]}"
        )
        return False
    except requests.RequestException as exc:
        logger.error(f"Failed to send email via Brevo: {exc}")
        return False


def send_password_reset_email(
    to_email: str,
    to_name: str,
    reset_link: str,
) -> bool:
    """
    Send a branded password-reset email.

    Args:
        to_email: Recipient email address.
        to_name:  Recipient display name.
        reset_link: Full URL with token, e.g.
                    https://law-gpt.app/reset-password?token=abc123

    Returns:
        True if the email was accepted by Brevo, False otherwise.
    """
    subject = "Reset Your LawGPT Password"

    html_content = f"""\
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f1219;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1219;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#1a1f2e;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#26B8B8,#1a8a8a);padding:32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;">&#9878; LawGPT</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
              Your AI Legal Assistant
            </p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;color:#e5e7eb;font-size:15px;line-height:1.7;">
            <p style="margin:0 0 16px;">Hi {html_mod.escape(to_name) if to_name else "there"},</p>
            <p style="margin:0 0 16px;">
              We received a request to reset the password for your LawGPT account.
              Click the button below to choose a new password:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:8px 0 24px;">
                <a href="{reset_link}"
                   style="display:inline-block;padding:14px 36px;background:#26B8B8;
                          color:#fff;text-decoration:none;border-radius:8px;
                          font-weight:600;font-size:15px;">
                  Reset Password
                </a>
              </td></tr>
            </table>
            <p style="margin:0 0 16px;color:#9ca3af;font-size:13px;">
              This link expires in <strong>{settings.password_reset_expire_minutes} minutes</strong>.
              If you didn't request this, you can safely ignore this email.
            </p>
            <hr style="border:none;border-top:1px solid #374151;margin:24px 0;">
            <p style="margin:0;color:#6b7280;font-size:12px;text-align:center;">
              &copy; LawGPT &mdash; AI-powered Indian legal guidance<br>
              <a href="https://law-gpt.app" style="color:#26B8B8;text-decoration:none;">
                law-gpt.app
              </a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    return _send_brevo_email(to_email, to_name, subject, html_content)


def send_email_verification(
    to_email: str,
    to_name: str,
    verify_link: str,
) -> bool:
    """
    Send a branded email-verification message to a newly registered user.

    Args:
        to_email: Recipient email address.
        to_name:  Recipient display name.
        verify_link: Full URL with token, e.g.
                     https://law-gpt.app/verify-email?token=abc123

    Returns:
        True if the email was accepted by Brevo, False otherwise.
    """
    subject = "Verify Your LawGPT Account"

    html_content = f"""\
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f1219;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1219;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#1a1f2e;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#26B8B8,#1a8a8a);padding:32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;">&#9878; LawGPT</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
              Your AI Legal Assistant
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#e5e7eb;font-size:15px;line-height:1.7;">
            <p style="margin:0 0 16px;">Hi {html_mod.escape(to_name) if to_name else "there"},</p>
            <p style="margin:0 0 16px;">
              Thanks for signing up for LawGPT! Please verify your email
              address by clicking the button below:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:8px 0 24px;">
                <a href="{verify_link}"
                   style="display:inline-block;padding:14px 36px;background:#26B8B8;
                          color:#fff;text-decoration:none;border-radius:8px;
                          font-weight:600;font-size:15px;">
                  Verify Email
                </a>
              </td></tr>
            </table>
            <p style="margin:0 0 16px;color:#9ca3af;font-size:13px;">
              This link expires in <strong>24 hours</strong>.
              If you didn't create this account, you can safely ignore this email.
            </p>
            <hr style="border:none;border-top:1px solid #374151;margin:24px 0;">
            <p style="margin:0;color:#6b7280;font-size:12px;text-align:center;">
              &copy; LawGPT &mdash; AI-powered Indian legal guidance<br>
              <a href="https://law-gpt.app" style="color:#26B8B8;text-decoration:none;">
                law-gpt.app
              </a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    return _send_brevo_email(to_email, to_name, subject, html_content)
