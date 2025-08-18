import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .database import get_db, init_db, engine, Base
from .models import Session as SessionModel
from .schemas import ApiResponse, SessionResponse
from .services.session_service import SessionService
from .services.data_retention_service import DataRetentionService
from .routers import batch, batch_parameters, parameter_presets, batch_calculations, scenarios, dashboard, revenue_banding, health, platform, input_catalog, plan_management, column_mapping, bonus_statements, executive_reporting

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variable to control cleanup task
cleanup_task = None

async def periodic_cleanup():
    """Background task to periodically clean up expired sessions and data"""
    logger.info("Starting periodic cleanup task")
    
    while True:
        try:
            # Wait 4 hours between cleanup runs
            await asyncio.sleep(4 * 60 * 60)  # 4 hours in seconds
            
            logger.info("Running periodic cleanup of expired data")
            
            # Get database session
            from .database import SessionLocal
            db = SessionLocal()
            
            try:
                # Run cleanup
                retention_service = DataRetentionService(db)
                cleanup_stats = retention_service.cleanup_expired_data(retention_hours=72)
                
                logger.info(f"Periodic cleanup completed: {cleanup_stats}")
                
            except Exception as e:
                logger.error(f"Error during periodic cleanup: {str(e)}")
            finally:
                db.close()
                
        except asyncio.CancelledError:
            logger.info("Periodic cleanup task cancelled")
            break
        except Exception as e:
            logger.error(f"Unexpected error in periodic cleanup: {str(e)}")
            # Continue running even if an error occurs

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage FastAPI application lifespan"""
    # Startup
    logger.info("Starting FastAPI application")
    init_db()
    
    # Initialize platform infrastructure
    from .redis_client import is_redis_available
    from .queue import queue_service
    from .metrics import enable_metrics
    
    # Check Redis availability (non-blocking)
    if is_redis_available():
        logger.info("Redis connection established")
    else:
        logger.warning("Redis not available - running in degraded mode")
    
    # Check queue system (non-blocking)
    if queue_service.is_available():
        logger.info("Queue system available")
    else:
        logger.info("Queue system not available - falling back to synchronous processing")
    
    # Enable metrics collection
    enable_metrics()
    logger.info("Metrics collection enabled")
    
    # Start periodic cleanup task
    global cleanup_task
    cleanup_task = asyncio.create_task(periodic_cleanup())
    logger.info("Started periodic cleanup background task")
    
    yield
    
    # Shutdown
    logger.info("Shutting down FastAPI application")
    
    # Cleanup Redis connections
    try:
        from .redis_client import close_redis
        close_redis()
        logger.info("Redis connections closed")
    except Exception as e:
        logger.warning(f"Error closing Redis connections: {e}")
    
    # Cancel cleanup task
    if cleanup_task:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            logger.info("Periodic cleanup task cancelled successfully")

app = FastAPI(
    title="Compensation Platform API",
    description="Pluggable bonus calculation platform for fund managers with multi-tenant support, configurable rules, and workflow automation",
    version="2.0.0-dev",
    lifespan=lifespan
)

# Platform tenant middleware
from .middleware import TenantMiddleware
app.add_middleware(TenantMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002", 
        "http://127.0.0.1:3003",
        "*"  # Fallback for any other origins
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(batch.router)  # Router already has prefix='/api/v1/batch'
app.include_router(batch_parameters.router, prefix="/api/v1/batch")

# Mount parameter_presets only under /api/v1 to avoid duplicate routes
app.include_router(parameter_presets.router, prefix="/api/v1")

# Mount batch_calculations router (now under /api/v1/batch-calculations)
app.include_router(batch_calculations.router)

# Include scenarios router
app.include_router(scenarios.router)  # Router already has prefix='/api/v1/scenarios'

# Include dashboard router
app.include_router(dashboard.router)  # Router already has prefix='/api/v1/dashboard'

# Include revenue banding router (read-only for now)
app.include_router(revenue_banding.router)

# Include enhanced health monitoring (platform transformation)
app.include_router(health.router)

# Include platform transformation router
app.include_router(platform.router, prefix="/api/v1")

# Include input catalog router
app.include_router(input_catalog.router, prefix="/api/v1")

# Include plan management router
app.include_router(plan_management.router, prefix="/api/v1")

# Include column mapping router
app.include_router(column_mapping.router, prefix="/api/v1")

# Include bonus statements router (Task 20)
app.include_router(bonus_statements.router, prefix="/api/v1")

# Include executive reporting router (Task 21)
app.include_router(executive_reporting.router)

@app.get("/")
async def root():
    return {"message": "Bonus Calculator API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": "2024-01-01T00:00:00Z"}

# Session Management Endpoints
@app.post("/api/v1/sessions", response_model=ApiResponse)
async def create_session(db: Session = Depends(get_db)):
    """Create a new session"""
    try:
        session_service = SessionService(db)
        session = session_service.create_session()
        
        return ApiResponse(
            success=True,
            message="Session created successfully",
            data=SessionResponse.model_validate(session)
        )
    except Exception as e:
        logger.error(f"Failed to create session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create session"
        )

@app.get("/api/v1/sessions/{session_id}", response_model=ApiResponse)
async def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get session information"""
    try:
        session_service = SessionService(db)
        session_info = session_service.get_session_info(session_id)
        
        if not session_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        return ApiResponse(
            success=True,
            message="Session retrieved successfully",
            data=session_info
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session"
        )

@app.post("/api/v1/sessions/{session_id}/extend", response_model=ApiResponse)
async def extend_session(session_id: str, hours: int = 24, db: Session = Depends(get_db)):
    """Extend session expiration time"""
    try:
        session_service = SessionService(db)
        session = session_service.extend_session(session_id, hours)
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        return ApiResponse(
            success=True,
            message=f"Session extended by {hours} hours",
            data=SessionResponse.model_validate(session)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to extend session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extend session"
        )

# Data Retention Endpoints
@app.get("/api/admin/retention/stats", response_model=ApiResponse)
async def get_retention_stats(db: Session = Depends(get_db)):
    """Get data retention statistics"""
    try:
        retention_service = DataRetentionService(db)
        stats = retention_service.get_data_retention_stats()
        
        return ApiResponse(
            success=True,
            message="Retention statistics retrieved successfully",
            data=stats
        )
    except Exception as e:
        logger.error(f"Failed to get retention stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve retention statistics"
        )

@app.post("/api/admin/retention/cleanup", response_model=ApiResponse)
async def cleanup_expired_data(retention_hours: int = 72, db: Session = Depends(get_db)):
    """Clean up expired data"""
    try:
        retention_service = DataRetentionService(db)
        cleanup_stats = retention_service.cleanup_expired_data(retention_hours)
        
        return ApiResponse(
            success=True,
            message="Data cleanup completed successfully",
            data=cleanup_stats
        )
    except Exception as e:
        logger.error(f"Failed to cleanup expired data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cleanup expired data"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
