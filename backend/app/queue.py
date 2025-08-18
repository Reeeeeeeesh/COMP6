"""
Background job queue system for platform transformation.
This module provides queue functionality without breaking existing synchronous operations.
"""
import os
import logging
from typing import Optional, Any, Dict, Callable
from celery import Celery
from .redis_client import REDIS_URL

logger = logging.getLogger(__name__)

# Celery configuration
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

# Create Celery app
celery_app = Celery(
    'compensation_platform',
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=[
        'app.tasks.calculation_tasks',
        'app.tasks.processing_tasks',
    ]
)

# Configure Celery
celery_app.conf.update(
    # Task serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Task routing
    task_routes={
        'app.tasks.calculation_tasks.*': {'queue': 'calculations'},
        'app.tasks.processing_tasks.*': {'queue': 'processing'},
    },
    
    # Result settings
    result_expires=3600,  # 1 hour
    result_persistent=True,
    
    # Worker settings
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    
    # Task time limits
    task_soft_time_limit=300,  # 5 minutes
    task_time_limit=600,       # 10 minutes
    
    # Error handling
    task_reject_on_worker_lost=True,
)

class QueueService:
    """Service for managing background job queues."""
    
    def __init__(self):
        self.celery = celery_app
    
    @staticmethod
    def is_available() -> bool:
        """Check if queue system is available."""
        try:
            # Try to inspect active workers
            inspect = celery_app.control.inspect()
            stats = inspect.stats()
            return stats is not None and len(stats) > 0
        except Exception as e:
            logger.warning(f"Queue system not available: {e}")
            return False
    
    def enqueue_calculation(self, plan_id: str, upload_id: str, **kwargs) -> Optional[str]:
        """
        Enqueue a calculation task. Falls back to synchronous processing if queue unavailable.
        Returns task_id if queued, None if processed synchronously.
        """
        if self.is_available():
            try:
                from app.tasks.calculation_tasks import execute_plan_calculation
                result = execute_plan_calculation.delay(plan_id, upload_id, **kwargs)
                logger.info(f"Calculation task queued: {result.id}")
                return result.id
            except Exception as e:
                logger.error(f"Failed to queue calculation task: {e}")
        
        # Fallback to synchronous processing
        logger.info("Queue unavailable, processing calculation synchronously")
        return None
    
    def enqueue_file_processing(self, upload_id: str, **kwargs) -> Optional[str]:
        """
        Enqueue a file processing task.
        Returns task_id if queued, None if processed synchronously.
        """
        if self.is_available():
            try:
                from app.tasks.processing_tasks import process_uploaded_file
                result = process_uploaded_file.delay(upload_id, **kwargs)
                logger.info(f"File processing task queued: {result.id}")
                return result.id
            except Exception as e:
                logger.error(f"Failed to queue file processing task: {e}")
        
        return None
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get status of a queued task."""
        try:
            result = celery_app.AsyncResult(task_id)
            return {
                'task_id': task_id,
                'status': result.status,
                'result': result.result if result.ready() else None,
                'info': result.info,
            }
        except Exception as e:
            logger.error(f"Failed to get task status: {e}")
            return {'task_id': task_id, 'status': 'UNKNOWN', 'error': str(e)}
    
    def cancel_task(self, task_id: str) -> bool:
        """Cancel a queued task."""
        try:
            celery_app.control.revoke(task_id, terminate=True)
            return True
        except Exception as e:
            logger.error(f"Failed to cancel task: {e}")
            return False

# Global queue service instance
queue_service = QueueService()

def get_queue() -> QueueService:
    """Get the global queue service instance."""
    return queue_service