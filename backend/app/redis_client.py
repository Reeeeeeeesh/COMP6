"""
Redis client configuration for the platform transformation.
This module provides Redis connectivity without breaking existing functionality.
"""
import os
import logging
from typing import Optional
from redis import Redis, ConnectionPool
from redis.exceptions import ConnectionError, RedisError

logger = logging.getLogger(__name__)

# Redis connection configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Global Redis connection pool
_redis_pool: Optional[ConnectionPool] = None
_redis_client: Optional[Redis] = None

def get_redis_pool() -> Optional[ConnectionPool]:
    """Get or create Redis connection pool."""
    global _redis_pool
    
    if _redis_pool is None:
        try:
            _redis_pool = ConnectionPool.from_url(
                REDIS_URL,
                max_connections=20,
                retry_on_timeout=True,
                socket_keepalive=True,
                socket_keepalive_options={},
            )
            logger.info("Redis connection pool created successfully")
        except Exception as e:
            logger.warning(f"Failed to create Redis connection pool: {e}")
            _redis_pool = None
    
    return _redis_pool

def get_redis() -> Optional[Redis]:
    """
    Get Redis client instance. Returns None if Redis is unavailable.
    This allows the application to gracefully degrade when Redis is not available.
    """
    global _redis_client
    
    if _redis_client is None:
        pool = get_redis_pool()
        if pool:
            try:
                _redis_client = Redis(connection_pool=pool, decode_responses=True)
                # Test connection
                _redis_client.ping()
                logger.info("Redis client connected successfully")
            except (ConnectionError, RedisError) as e:
                logger.warning(f"Redis connection failed: {e}")
                _redis_client = None
    
    return _redis_client

def is_redis_available() -> bool:
    """Check if Redis is available."""
    redis_client = get_redis()
    if redis_client is None:
        return False
    
    try:
        redis_client.ping()
        return True
    except (ConnectionError, RedisError):
        return False

def close_redis():
    """Close Redis connections gracefully."""
    global _redis_client, _redis_pool
    
    if _redis_client:
        try:
            _redis_client.close()
        except Exception as e:
            logger.error(f"Error closing Redis client: {e}")
        finally:
            _redis_client = None
    
    if _redis_pool:
        try:
            _redis_pool.disconnect()
        except Exception as e:
            logger.error(f"Error closing Redis pool: {e}")
        finally:
            _redis_pool = None

# Session namespace helpers (for future session migration)
def get_session_key(session_id: str) -> str:
    """Generate Redis key for session storage."""
    return f"session:{session_id}"

def get_tenant_key(tenant_id: str, key: str) -> str:
    """Generate Redis key with tenant namespace."""
    return f"tenant:{tenant_id}:{key}"

def get_cache_key(category: str, key: str) -> str:
    """Generate Redis key for caching."""
    return f"cache:{category}:{key}"