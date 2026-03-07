# Indian Law RAG Chatbot - Redis Client
"""
Shared async Redis client.

Falls back gracefully: if Redis is unreachable the getter returns None
so callers can degrade to in-memory storage.
"""

import asyncio
import logging
from typing import Optional

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

_redis_client: Optional[aioredis.Redis] = None
_redis_lock = asyncio.Lock()


async def get_redis() -> Optional[aioredis.Redis]:
    """
    Return a shared async Redis connection (lazy-initialised).
    Returns None if Redis is unavailable.
    Uses an async lock to prevent concurrent initialisation races.
    """
    global _redis_client

    # Fast path — no lock needed if already connected
    if _redis_client is not None:
        try:
            await _redis_client.ping()
            return _redis_client
        except Exception:
            try:
                await _redis_client.close()
            except Exception:
                pass
            _redis_client = None  # stale connection — reconnect below

    async with _redis_lock:
        # Double-check after acquiring the lock
        if _redis_client is not None:
            try:
                await _redis_client.ping()
                return _redis_client
            except Exception:
                try:
                    await _redis_client.close()
                except Exception:
                    pass
                _redis_client = None

        try:
            _redis_client = aioredis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=2,
            )
            await _redis_client.ping()
            logger.info("Redis connection established")
            return _redis_client
        except Exception as exc:
            logger.warning("Redis unavailable (%s); falling back to in-memory", exc)
            _redis_client = None
            return None
