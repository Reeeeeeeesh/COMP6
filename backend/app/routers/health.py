"""
Health check endpoints for infrastructure monitoring.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
import logging

from ..database import get_db, check_database_connectivity, get_db_stats
from ..redis_client import is_redis_available
from ..queue import queue_service
from ..metrics import get_metrics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/")
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "service": "bonus_calculator_platform",
        "version": "2.0.0-dev"
    }

@router.get("/detailed")
async def detailed_health_check(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Detailed health check including all infrastructure components."""
    health_status = {
        "status": "healthy",
        "timestamp": "2025-01-01T00:00:00Z",  # Would use datetime.utcnow()
        "services": {}
    }
    
    # Check database
    try:
        db_healthy = check_database_connectivity()
        db_stats = get_db_stats()
        health_status["services"]["database"] = {
            "status": "healthy" if db_healthy else "unhealthy",
            "type": "postgresql" if not str(db.bind.url).startswith("sqlite") else "sqlite",
            "stats": db_stats
        }
    except Exception as e:
        health_status["services"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # Check Redis
    try:
        redis_healthy = is_redis_available()
        health_status["services"]["redis"] = {
            "status": "healthy" if redis_healthy else "unavailable",
            "type": "redis"
        }
        if not redis_healthy:
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["services"]["redis"] = {
            "status": "error",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # Check Queue System
    try:
        queue_healthy = queue_service.is_available()
        health_status["services"]["queue"] = {
            "status": "healthy" if queue_healthy else "unavailable",
            "type": "celery"
        }
        if not queue_healthy:
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["services"]["queue"] = {
            "status": "error",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    return health_status

@router.get("/database")
async def database_health(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Database-specific health check."""
    try:
        # Test database connectivity
        healthy = check_database_connectivity()
        stats = get_db_stats()
        
        if not healthy:
            raise HTTPException(status_code=503, detail="Database is not accessible")
        
        return {
            "status": "healthy",
            "stats": stats,
            "url_type": "postgresql" if not str(db.bind.url).startswith("sqlite") else "sqlite"
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Database health check failed: {str(e)}")

@router.get("/redis")
async def redis_health() -> Dict[str, Any]:
    """Redis-specific health check."""
    try:
        available = is_redis_available()
        
        if not available:
            return {
                "status": "unavailable",
                "message": "Redis is not available (this is acceptable for degraded mode)"
            }
        
        return {
            "status": "healthy",
            "message": "Redis is available"
        }
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

@router.get("/queue")
async def queue_health() -> Dict[str, Any]:
    """Queue system health check."""
    try:
        available = queue_service.is_available()
        
        if not available:
            return {
                "status": "unavailable",
                "message": "Queue system is not available (falling back to synchronous processing)"
            }
        
        return {
            "status": "healthy",
            "message": "Queue system is available"
        }
    except Exception as e:
        logger.error(f"Queue health check failed: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

@router.get("/metrics")
async def metrics_endpoint():
    """Prometheus metrics endpoint."""
    return get_metrics()