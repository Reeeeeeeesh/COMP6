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
from .routers import batch, batch_parameters, parameter_presets, batch_calculations, scenarios

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
    
    # Start periodic cleanup task
    global cleanup_task
    cleanup_task = asyncio.create_task(periodic_cleanup())
    logger.info("Started periodic cleanup background task")
    
    yield
    
    # Shutdown
    logger.info("Shutting down FastAPI application")
    if cleanup_task:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            logger.info("Periodic cleanup task cancelled successfully")

app = FastAPI(
    title="Bonus Calculator API",
    description="API for calculating employee bonuses with batch processing and scenario modeling",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(batch.router)  # Router already has prefix='/api/v1/batch'
app.include_router(batch_parameters.router, prefix="/api/v1/batch")

# Fix parameter_presets router - it already has a prefix of '/parameter-presets'
# Mount it at both /api/v1/parameter-presets and /parameter-presets to ensure compatibility
app.include_router(parameter_presets.router, prefix="/api/v1")
app.include_router(parameter_presets.router, prefix="")

# Mount batch_calculations router at multiple prefixes to ensure compatibility
# The router itself has prefix='/api/batch-calculations'
app.include_router(batch_calculations.router)  # Original prefix
app.include_router(batch_calculations.router, prefix="/api/v1")  # Alternative prefix

# Include scenarios router
app.include_router(scenarios.router)  # Router already has prefix='/api/v1/scenarios'

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
