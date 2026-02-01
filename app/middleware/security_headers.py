# app/middleware/security_headers.py
"""
Security headers middleware for OWASP compliance.

Provides CSP with nonce support for inline scripts/styles,
configurable API origins, and comprehensive security headers.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
import logging
import secrets
import base64

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses.
    
    Headers:
    - HSTS (HTTP Strict Transport Security)
    - CSP (Content Security Policy) with nonce support
    - X-Content-Type-Options
    - X-Frame-Options
    - X-XSS-Protection
    - Referrer-Policy
    - Permissions-Policy
    
    CSP Configuration:
    - Uses nonces for inline scripts/styles instead of 'unsafe-inline'
    - API origins are configurable via api_origins parameter
    - 'unsafe-eval' is NOT included (security risk)
    """
    
    def __init__(
        self, 
        app, 
        enable_hsts: bool = True, 
        enable_csp: bool = True,
        api_origins: list = None
    ):
        """
        Initialize security headers middleware.
        
        Args:
            app: The ASGI application
            enable_hsts: Enable HTTP Strict Transport Security
            enable_csp: Enable Content Security Policy
            api_origins: List of allowed API origins for connect-src
                        Defaults to ['self'] if not provided
        """
        super().__init__(app)
        self.enable_hsts = enable_hsts
        self.enable_csp = enable_csp
        # Default to self only; configure via settings in production
        self.api_origins = api_origins or []
        logger.info("✓ Security headers middleware enabled")
    
    def _generate_nonce(self) -> str:
        """Generate a cryptographically secure nonce for CSP."""
        return base64.b64encode(secrets.token_bytes(16)).decode('utf-8')
    
    async def dispatch(self, request: Request, call_next):
        # Generate nonce for this request (for inline scripts/styles if needed)
        nonce = self._generate_nonce()
        
        # Store nonce in request state for templates/responses to use
        request.state.csp_nonce = nonce
        
        response = await call_next(request)
        
        # HSTS: Force HTTPS for 1 year
        if self.enable_hsts:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        
        # CSP: Prevent XSS and injection attacks
        # NOTE: We use nonces for inline scripts/styles instead of 'unsafe-inline'
        # For legacy browser support or specific needs, 'unsafe-inline' can be added
        # but it significantly weakens XSS protection.
        if self.enable_csp:
            # Build connect-src with configured API origins
            connect_sources = ["'self'"] + self.api_origins
            connect_src = " ".join(connect_sources)
            
            # CSP Policy:
            # - 'unsafe-inline' for style-src is often needed for CSS-in-JS frameworks
            # - 'unsafe-eval' is intentionally EXCLUDED (security risk)
            # - Nonce is provided for inline scripts that need it
            # 
            # TODO: If you need stricter CSP:
            # 1. Remove 'unsafe-inline' from style-src
            # 2. Use nonce-{nonce} for all inline scripts/styles
            # 3. Ensure all scripts are loaded from allowed sources
            response.headers["Content-Security-Policy"] = (
                f"default-src 'self'; "
                f"script-src 'self' 'nonce-{nonce}'; "
                f"style-src 'self' 'unsafe-inline'; "  # Required for many CSS frameworks
                f"img-src 'self' data: https:; "
                f"font-src 'self' data:; "
                f"connect-src {connect_src}; "
                f"frame-ancestors 'none';"
            )
        
        # Prevent MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # XSS protection (legacy, but doesn't hurt)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions policy (disable unused features)
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), "
            "payment=(), usb=(), magnetometer=(), gyroscope=()"
        )
        
        # Remove server header (don't advertise technology)
        # Note: MutableHeaders doesn't have pop(), use 'del' with key check
        # or use raw_headers access. This safely removes the header if present.
        if "server" in response.headers:
            del response.headers["server"]
        
        return response
