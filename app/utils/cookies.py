# Indian Law RAG Chatbot - Cookie Utilities
"""
Helpers for setting / clearing the HttpOnly JWT cookies.

Two cookies are managed:
  - ``access_token``  — short-lived (30 min default)
  - ``refresh_token`` — long-lived (7 days default), path restricted
    to ``/api/v1/auth/refresh`` so it is only sent for token rotation.

The cookie names and attributes are centralised here so login, OAuth
callback, refresh, and logout endpoints all behave consistently.
"""

from fastapi import Response

from app.config import settings

# Cookie configuration
COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = settings.access_token_expire_minutes * 60  # seconds

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_MAX_AGE = settings.refresh_token_expire_days * 86400  # seconds


def set_auth_cookie(response: Response, token: str) -> None:
    """Attach an HttpOnly access-token cookie to the response."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.is_production,  # Secure flag only in prod (HTTPS)
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )


def set_refresh_cookie(response: Response, token: str) -> None:
    """Attach an HttpOnly refresh-token cookie scoped to the refresh endpoint."""
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/api/v1/auth/refresh",  # only sent on refresh calls
    )


def clear_auth_cookie(response: Response) -> None:
    """Remove both the access-token and refresh-token cookies."""
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
    )
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/api/v1/auth/refresh",
    )
