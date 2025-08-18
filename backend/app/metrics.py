"""
Metrics and observability for the platform transformation.
Provides Prometheus metrics without breaking existing functionality.
"""
import time
import logging
from typing import Dict, Any, Optional
from functools import wraps
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response

logger = logging.getLogger(__name__)

# Define Prometheus metrics
REQUESTS_TOTAL = Counter(
    'http_requests_total',
    'Total number of HTTP requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)

CALCULATION_REQUESTS = Counter(
    'calculation_requests_total',
    'Total number of calculation requests',
    ['plan_type', 'status']
)

CALCULATION_DURATION = Histogram(
    'calculation_duration_seconds',
    'Calculation processing time in seconds',
    ['plan_type']
)

ACTIVE_CALCULATIONS = Gauge(
    'active_calculations',
    'Number of currently active calculations'
)

FILE_UPLOADS = Counter(
    'file_uploads_total',
    'Total number of file uploads',
    ['status']
)

FILE_PROCESSING_DURATION = Histogram(
    'file_processing_duration_seconds',
    'File processing time in seconds',
    ['file_type']
)

QUEUE_DEPTH = Gauge(
    'queue_depth',
    'Current depth of job queue',
    ['queue_name']
)

DATABASE_CONNECTIONS = Gauge(
    'database_connections_active',
    'Number of active database connections'
)

class MetricsCollector:
    """Collect and expose metrics for monitoring."""
    
    def __init__(self):
        self.enabled = True
    
    def record_request(self, method: str, endpoint: str, status_code: int, duration: float):
        """Record HTTP request metrics."""
        if not self.enabled:
            return
        
        try:
            REQUESTS_TOTAL.labels(
                method=method,
                endpoint=endpoint,
                status_code=status_code
            ).inc()
            
            REQUEST_DURATION.labels(
                method=method,
                endpoint=endpoint
            ).observe(duration)
        except Exception as e:
            logger.error(f"Failed to record request metrics: {e}")
    
    def record_calculation(self, plan_type: str, status: str, duration: Optional[float] = None):
        """Record calculation metrics."""
        if not self.enabled:
            return
        
        try:
            CALCULATION_REQUESTS.labels(
                plan_type=plan_type,
                status=status
            ).inc()
            
            if duration is not None:
                CALCULATION_DURATION.labels(
                    plan_type=plan_type
                ).observe(duration)
        except Exception as e:
            logger.error(f"Failed to record calculation metrics: {e}")
    
    def set_active_calculations(self, count: int):
        """Set the number of active calculations."""
        if self.enabled:
            ACTIVE_CALCULATIONS.set(count)
    
    def record_file_upload(self, status: str, file_type: str = "unknown", duration: Optional[float] = None):
        """Record file upload metrics."""
        if not self.enabled:
            return
        
        try:
            FILE_UPLOADS.labels(status=status).inc()
            
            if duration is not None:
                FILE_PROCESSING_DURATION.labels(
                    file_type=file_type
                ).observe(duration)
        except Exception as e:
            logger.error(f"Failed to record file upload metrics: {e}")
    
    def set_queue_depth(self, queue_name: str, depth: int):
        """Set queue depth metric."""
        if self.enabled:
            QUEUE_DEPTH.labels(queue_name=queue_name).set(depth)
    
    def set_db_connections(self, count: int):
        """Set database connections metric."""
        if self.enabled:
            DATABASE_CONNECTIONS.set(count)

# Global metrics collector
metrics = MetricsCollector()

def track_request_metrics(endpoint: str):
    """Decorator to track request metrics."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            status_code = 200
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                status_code = 500
                raise
            finally:
                duration = time.time() - start_time
                # Extract method from request if available
                method = "GET"  # Default, would need request context for actual method
                metrics.record_request(method, endpoint, status_code, duration)
        
        return wrapper
    return decorator

def get_metrics() -> Response:
    """Get Prometheus metrics endpoint."""
    try:
        metrics_data = generate_latest()
        return Response(content=metrics_data, media_type=CONTENT_TYPE_LATEST)
    except Exception as e:
        logger.error(f"Failed to generate metrics: {e}")
        return Response(content="# Metrics unavailable\n", media_type=CONTENT_TYPE_LATEST)

def enable_metrics():
    """Enable metrics collection."""
    metrics.enabled = True
    logger.info("Metrics collection enabled")

def disable_metrics():
    """Disable metrics collection."""
    metrics.enabled = False
    logger.info("Metrics collection disabled")