from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Database URL - defaults to SQLite for development
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bonus_calculator.db")

# Enhanced engine configuration for platform requirements
def create_db_engine():
    """Create database engine with enhanced configuration."""
    if DATABASE_URL.startswith("sqlite"):
        # SQLite configuration (development)
        return create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=os.getenv("DB_ECHO", "false").lower() == "true",
        )
    else:
        # PostgreSQL configuration (production)
        return create_engine(
            DATABASE_URL,
            pool_size=int(os.getenv("DB_POOL_SIZE", "20")),
            max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "30")),
            pool_pre_ping=True,
            pool_recycle=3600,  # Recycle connections after 1 hour
            echo=os.getenv("DB_ECHO", "false").lower() == "true",
        )

engine = create_db_engine()

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create DeclarativeBase class
class Base(DeclarativeBase):
    pass

def init_db():
    """Initialize database by creating all tables"""
    # Import all models to ensure they are registered
    from . import models
    Base.metadata.create_all(bind=engine)

# Tenant-aware session context
_tenant_context = None

def set_tenant_context(tenant_id: str):
    """Set tenant context for RLS (Row Level Security)."""
    global _tenant_context
    _tenant_context = tenant_id

def get_tenant_context() -> str:
    """Get current tenant context."""
    return _tenant_context

def create_tenant_session(tenant_id: str):
    """Create a database session with tenant context set for RLS."""
    db = SessionLocal()
    
    # Set tenant context for PostgreSQL RLS
    if not DATABASE_URL.startswith("sqlite") and tenant_id:
        try:
            # Set both tenant_id and current_tenant_id for compatibility
            db.execute(text("SELECT set_config('app.tenant_id', :tenant_id, true)"), 
                      {'tenant_id': tenant_id})
            db.execute(text("SELECT set_config('app.current_tenant_id', :tenant_id, true)"), 
                      {'tenant_id': tenant_id})
            logger.debug(f"Set tenant context: {tenant_id}")
        except Exception as e:
            logger.warning(f"Failed to set tenant context: {e}")
    
    return db

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependency to get tenant-aware DB session
def get_tenant_db(tenant_id: str = None):
    """Get database session with optional tenant context."""
    if tenant_id:
        db = create_tenant_session(tenant_id)
    else:
        db = SessionLocal()
    
    try:
        yield db
    finally:
        db.close()

def check_database_connectivity() -> bool:
    """Check if database is accessible."""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception as e:
        logger.error(f"Database connectivity check failed: {e}")
        return False

def get_db_stats() -> dict:
    """Get database connection statistics."""
    try:
        pool = engine.pool
        return {
            'pool_size': pool.size(),
            'checked_in': pool.checkedin(),
            'checked_out': pool.checkedout(),
            'overflow': pool.overflow(),
            'invalid': pool.invalid(),
        }
    except Exception as e:
        logger.error(f"Failed to get database stats: {e}")
        return {}
