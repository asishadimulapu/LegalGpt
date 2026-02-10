# app/middleware/rate_limiting.py
"""
Rate limiting middleware for API protection.
Prevents brute force attacks and DDoS.

SECURITY NOTES:
- IP extraction does NOT trust X-Forwarded-For by default
- Use TRUSTED_PROXIES config to whitelist known proxy IPs
- Run Uvicorn with --proxy-headers --forwarded-allow-ips for production
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timedelta, timezone
import asyncio
import logging
import functools
import ipaddress
from typing import Optional, Set, Union

logger = logging.getLogger(__name__)

# =============================================================================
# Configuration - Set trusted proxies here or via environment
# =============================================================================
# In production, set this to your load balancer/proxy IPs
# Supports both plain IPs ("10.0.0.1") and CIDR notation ("172.16.0.0/12")
# Empty set = don't trust any proxy headers (safest default)
TRUSTED_PROXIES: Set[str] = set()  # e.g., {"10.0.0.1", "172.16.0.0/12"}

# TTL for bucket cleanup (used by both middleware and decorator)
BUCKET_TTL_MINUTES = 10


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Token bucket rate limiter with async-safe bucket management.
    
    Features:
    - Per-IP rate limiting
    - Configurable burst capacity
    - Automatic cleanup of expired entries
    - Exempts health check endpoints
    - Thread-safe with asyncio.Lock
    
    SECURITY: Does NOT trust X-Forwarded-For unless request comes from TRUSTED_PROXIES.
    Configure TRUSTED_PROXIES or use Uvicorn's --forwarded-allow-ips for production.
    """
    
    def __init__(
        self, 
        app, 
        requests_per_minute: int = 100,
        burst_size: int = 20,
        enabled: bool = True,
        trusted_proxies: Optional[Set[str]] = None
    ):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.burst_size = burst_size
        self.enabled = enabled
        self.trusted_proxies = trusted_proxies or TRUSTED_PROXIES
        
        # Token bucket: {ip: {'tokens': float, 'last_update': datetime}}
        # Use plain dict with explicit locking for thread safety
        self.buckets: dict = {}
        
        # Lock for thread-safe bucket access
        self._lock = asyncio.Lock()
        
        # Lock for cleanup task initialization (prevents race condition)
        self._cleanup_lock = asyncio.Lock()
        
        # Cleanup task handle
        self._cleanup_task: Optional[asyncio.Task] = None
        self._shutdown = False
        self._cleanup_started = False
        
        # Parse trusted proxies into network objects for CIDR support
        self._parsed_proxies: list = []
        for proxy in self.trusted_proxies:
            try:
                # Try parsing as network (CIDR notation)
                self._parsed_proxies.append(ipaddress.ip_network(proxy, strict=False))
            except ValueError:
                try:
                    # Try parsing as single IP
                    self._parsed_proxies.append(ipaddress.ip_address(proxy))
                except ValueError:
                    logger.warning(f"Invalid trusted proxy entry: {proxy}")
        
        if enabled:
            logger.info(
                f"✓ Rate limiting enabled: {requests_per_minute} req/min, "
                f"burst: {burst_size}"
            )
    
    def _is_trusted_proxy(self, ip_str: str) -> bool:
        """
        Check if an IP address is from a trusted proxy.
        
        Supports both plain IPs and CIDR ranges in trusted_proxies.
        Safely handles None or invalid IP strings.
        
        Args:
            ip_str: IP address string to check
            
        Returns:
            bool: True if IP is from a trusted proxy
        """
        if not ip_str or ip_str == "unknown":
            return False
        
        try:
            client_ip = ipaddress.ip_address(ip_str)
        except ValueError:
            logger.debug(f"Invalid IP address format: {ip_str}")
            return False
        
        for proxy in self._parsed_proxies:
            try:
                if isinstance(proxy, (ipaddress.IPv4Network, ipaddress.IPv6Network)):
                    if client_ip in proxy:
                        return True
                elif client_ip == proxy:
                    return True
            except TypeError:
                # IPv4/IPv6 mismatch
                continue
        
        return False
    
    def _validate_ip(self, ip_str: str) -> Optional[str]:
        """
        Validate and normalize an IP address string.
        
        Mitigates header injection by ensuring the value is a valid IP.
        
        Args:
            ip_str: IP address string to validate
            
        Returns:
            Normalized IP string if valid, None otherwise
        """
        if not ip_str:
            return None
        
        # Strip whitespace and take only the IP part
        ip_str = ip_str.strip()
        
        try:
            # Parse and return normalized form
            return str(ipaddress.ip_address(ip_str))
        except ValueError:
            logger.debug(f"Invalid IP in header: {ip_str}")
            return None
    
    async def _ensure_cleanup_started(self):
        """
        Start the cleanup task if not already running.
        Uses double-checked locking to prevent race conditions.
        """
        # Fast path: already started
        if self._cleanup_started and self._cleanup_task is not None:
            return
        
        # Slow path: acquire lock and double-check
        async with self._cleanup_lock:
            # Re-check after acquiring lock
            if self._cleanup_started and self._cleanup_task is not None:
                return
            
            if not self.enabled:
                return
            
            try:
                loop = asyncio.get_running_loop()
                self._cleanup_task = loop.create_task(self._cleanup_old_entries())
                self._cleanup_started = True
                logger.debug("Rate limit cleanup task started")
            except RuntimeError:
                # No event loop yet, will try again on next request
                pass
    
    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting."""
        
        # Start cleanup task if needed (deferred start for event loop availability)
        await self._ensure_cleanup_started()
        
        # Skip rate limiting if disabled
        if not self.enabled:
            return await call_next(request)
        
        # Exempt OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Exempt health check and metrics endpoints
        if request.url.path in ['/health', '/metrics', '/api/v1/health']:
            return await call_next(request)
        
        # Get client IP (securely, validating proxy headers)
        client_ip = self._get_client_ip(request)
        
        # Check rate limit with lock
        allowed, tokens_remaining = await self._check_rate_limit_async(client_ip)
        
        if not allowed:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Please try again later.",
                    "retry_after": 60
                },
                headers={
                    "Retry-After": "60",
                    "X-RateLimit-Limit": str(self.requests_per_minute),
                    "X-RateLimit-Remaining": "0"
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(int(tokens_remaining))
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """
        Extract client IP from request with proxy header validation.
        
        SECURITY: Only trusts X-Forwarded-For if the direct connection
        comes from a trusted proxy IP. This prevents IP spoofing attacks.
        All header values are validated using ipaddress module.
        """
        # Safely get direct IP, handling None request.client
        if request.client is None:
            return "unknown"
        
        direct_ip = request.client.host
        if not direct_ip:
            return "unknown"
        
        # Validate direct IP format
        validated_direct = self._validate_ip(direct_ip)
        if not validated_direct:
            return "unknown"
        
        # Only trust proxy headers if direct connection is from trusted proxy
        if self._is_trusted_proxy(validated_direct):
            # Check X-Forwarded-For header (proxy/load balancer)
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                # Take first IP in chain (original client)
                first_ip = forwarded.split(",")[0].strip()
                validated_forwarded = self._validate_ip(first_ip)
                if validated_forwarded:
                    return validated_forwarded
            
            # Check X-Real-IP header
            real_ip = request.headers.get("X-Real-IP")
            if real_ip:
                validated_real = self._validate_ip(real_ip.strip())
                if validated_real:
                    return validated_real
        
        # Fallback to direct connection IP (safest)
        return validated_direct
    
    async def _check_rate_limit_async(self, client_ip: str) -> tuple:
        """
        Check if request is allowed using token bucket algorithm.
        Thread-safe with asyncio.Lock.
        
        Returns:
            tuple: (allowed: bool, tokens_remaining: float)
        """
        async with self._lock:
            now = datetime.now(timezone.utc)
            
            # Initialize bucket if needed
            if client_ip not in self.buckets:
                self.buckets[client_ip] = {
                    'tokens': float(self.burst_size),
                    'last_update': now
                }
            
            bucket = self.buckets[client_ip]
            
            # Calculate time since last update
            time_passed = (now - bucket['last_update']).total_seconds()
            
            # Refill tokens based on time passed
            tokens_to_add = time_passed * (self.requests_per_minute / 60.0)
            bucket['tokens'] = min(
                float(self.burst_size),
                bucket['tokens'] + tokens_to_add
            )
            bucket['last_update'] = now
            
            # Check if we have tokens available
            if bucket['tokens'] >= 1.0:
                bucket['tokens'] -= 1.0
                return True, bucket['tokens']
            
            return False, 0.0
    
    async def _cleanup_old_entries(self):
        """Periodically cleanup old bucket entries."""
        try:
            while not self._shutdown:
                await asyncio.sleep(300)  # Every 5 minutes
                
                if self._shutdown:
                    break
                
                async with self._lock:
                    now = datetime.now(timezone.utc)
                    cutoff = now - timedelta(minutes=10)
                    
                    # Find and remove old entries
                    old_ips = [
                        ip for ip, bucket in list(self.buckets.items())
                        if bucket['last_update'] < cutoff
                    ]
                    
                    for ip in old_ips:
                        del self.buckets[ip]
                    
                    if old_ips:
                        logger.debug(f"Cleaned up {len(old_ips)} old rate limit entries")
        except asyncio.CancelledError:
            logger.debug("Rate limit cleanup task cancelled")
        except Exception as e:
            logger.error(f"Error in rate limit cleanup: {e}")
    
    async def shutdown(self):
        """Gracefully shutdown the cleanup task."""
        self._shutdown = True
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None


# =============================================================================
# Endpoint-specific rate limiting decorator
# =============================================================================

# Module-level state for decorator-based rate limiting
_endpoint_buckets: dict = {}
# Lazy-initialized lock to avoid event loop issues at import time
_endpoint_lock: Optional[asyncio.Lock] = None
_endpoint_cleanup_counter: int = 0
_ENDPOINT_CLEANUP_INTERVAL: int = 100  # Cleanup every N new entries


def _get_endpoint_lock() -> asyncio.Lock:
    """
    Get or create the endpoint lock lazily.
    This ensures the lock is created within an active event loop.
    """
    global _endpoint_lock
    if _endpoint_lock is None:
        _endpoint_lock = asyncio.Lock()
    return _endpoint_lock


def _cleanup_old_endpoint_buckets() -> None:
    """
    Remove expired entries from _endpoint_buckets.
    Called periodically when new entries are added.
    Uses the same TTL as RateLimitMiddleware for consistency.
    """
    
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=BUCKET_TTL_MINUTES)
    
    # Find and remove old entries
    old_keys = [
        key for key, bucket in list(_endpoint_buckets.items())
        if bucket['last_update'] < cutoff
    ]
    
    for key in old_keys:
        del _endpoint_buckets[key]
    
    if old_keys:
        logger.debug(f"Cleaned up {len(old_keys)} old endpoint rate limit entries")


def _get_client_ip_from_request(request: Request, trusted_proxies: Set[str] = None) -> str:
    """
    Shared utility for extracting client IP from request.
    Used by both middleware and decorators for consistent IP resolution.
    
    Args:
        request: FastAPI Request object
        trusted_proxies: Set of trusted proxy IPs/CIDRs (defaults to TRUSTED_PROXIES)
        
    Returns:
        Validated client IP string
    """
    if trusted_proxies is None:
        trusted_proxies = TRUSTED_PROXIES
    
    # Safely get direct IP
    if request.client is None:
        return "unknown"
    
    direct_ip = request.client.host
    if not direct_ip:
        return "unknown"
    
    # Validate direct IP format
    try:
        validated_direct = str(ipaddress.ip_address(direct_ip))
    except ValueError:
        return "unknown"
    
    # Parse trusted proxies
    parsed_proxies = []
    for proxy in trusted_proxies:
        try:
            parsed_proxies.append(ipaddress.ip_network(proxy, strict=False))
        except ValueError:
            try:
                parsed_proxies.append(ipaddress.ip_address(proxy))
            except ValueError:
                pass
    
    # Check if direct IP is from trusted proxy
    is_trusted = False
    try:
        client_ip_obj = ipaddress.ip_address(validated_direct)
        for proxy in parsed_proxies:
            if isinstance(proxy, (ipaddress.IPv4Network, ipaddress.IPv6Network)):
                if client_ip_obj in proxy:
                    is_trusted = True
                    break
            elif client_ip_obj == proxy:
                is_trusted = True
                break
    except (ValueError, TypeError):
        pass
    
    # Only trust proxy headers if from trusted proxy
    if is_trusted:
        # Check X-Forwarded-For header
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            first_ip = forwarded.split(",")[0].strip()
            try:
                return str(ipaddress.ip_address(first_ip))
            except ValueError:
                pass
        
        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            try:
                return str(ipaddress.ip_address(real_ip.strip()))
            except ValueError:
                pass
    
    return validated_direct


def rate_limit(requests_per_minute: int = 60):
    """
    Decorator for endpoint-specific rate limiting.
    
    This provides stricter limits for specific expensive endpoints,
    independent of the global middleware limits.
    
    Usage:
        @router.post("/expensive-operation")
        @rate_limit(requests_per_minute=10)
        async def expensive_operation(request: Request):
            ...
    
    Args:
        requests_per_minute: Maximum requests per minute for this endpoint
    
    Note: The decorated function MUST accept a `request: Request` parameter.
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            global _endpoint_cleanup_counter
            
            # Extract request from args or kwargs
            request = kwargs.get('request')
            if request is None:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            if request is None:
                raise ValueError(
                    f"@rate_limit decorator requires 'request: Request' parameter. "
                    f"Add it to {func.__name__}()"
                )
            
            # Get client IP using shared proxy-aware logic
            client_ip = _get_client_ip_from_request(request)
            endpoint_key = f"{func.__module__}.{func.__name__}:{client_ip}"
            
            # Get lazily-initialized lock
            lock = _get_endpoint_lock()
            
            async with lock:
                now = datetime.now(timezone.utc)
                
                # Initialize bucket if needed
                if endpoint_key not in _endpoint_buckets:
                    _endpoint_buckets[endpoint_key] = {
                        'tokens': requests_per_minute / 60.0 * 10,  # 10 second burst
                        'last_update': now
                    }
                    
                    # Periodic cleanup on new entries
                    _endpoint_cleanup_counter += 1
                    if _endpoint_cleanup_counter >= _ENDPOINT_CLEANUP_INTERVAL:
                        _cleanup_old_endpoint_buckets()
                        _endpoint_cleanup_counter = 0
                
                bucket = _endpoint_buckets[endpoint_key]
                
                # Refill tokens
                time_passed = (now - bucket['last_update']).total_seconds()
                tokens_to_add = time_passed * (requests_per_minute / 60.0)
                bucket['tokens'] = min(
                    requests_per_minute / 60.0 * 10,  # Max burst
                    bucket['tokens'] + tokens_to_add
                )
                bucket['last_update'] = now
                
                # Check and consume token
                if bucket['tokens'] >= 1.0:
                    bucket['tokens'] -= 1.0
                else:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Rate limit exceeded for this endpoint ({requests_per_minute}/min). "
                               f"Please try again later.",
                        headers={"Retry-After": "60"}
                    )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator
