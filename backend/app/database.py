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
    # Best-effort lightweight migrations for SQLite dev dbs
    try:
        _apply_sqlite_hotfixes()
    except Exception as _e:
        # Don't block startup for dev hotfixes
        logger.warning(f"SQLite hotfixes skipped: {_e}")


def _apply_sqlite_hotfixes():
    """Apply minimal, safe schema hotfixes for SQLite during development.

    This is not a replacement for Alembic migrations; it only patches known
    missing columns in existing local databases to keep the app usable.
    """
    # Only apply to SQLite
    if not str(engine.url).startswith("sqlite"):
        return

    with engine.connect() as conn:
        # Helper: check if a column exists
        def has_column(table: str, column: str) -> bool:
            res = conn.execute(text(f"PRAGMA table_info('{table}')"))
            return any(row[1] == column for row in res.fetchall())

        # 1) employee_calculation_results.payout_generated
        if not has_column('employee_calculation_results', 'payout_generated'):
            logger.info("Applying SQLite hotfix: adding employee_calculation_results.payout_generated")
            conn.execute(text(
                "ALTER TABLE employee_calculation_results "
                "ADD COLUMN payout_generated INTEGER NOT NULL DEFAULT 0"
            ))
            conn.commit()

        # 2) platform_uploads enhanced storage columns (dev DBs created before feature landed)
        #    These columns are nullable and safe to add on the fly.
        try:
            # If the table exists, PRAGMA will return rows; if not, skip silently
            res = conn.execute(text("PRAGMA table_info('platform_uploads')"))
            cols = {row[1] for row in res.fetchall()}
            if cols:  # table exists
                if 'bytes_hash' not in cols:
                    logger.info("Applying SQLite hotfix: adding platform_uploads.bytes_hash")
                    conn.execute(text(
                        "ALTER TABLE platform_uploads ADD COLUMN bytes_hash TEXT"
                    ))
                if 'storage_path' not in cols:
                    logger.info("Applying SQLite hotfix: adding platform_uploads.storage_path")
                    conn.execute(text(
                        "ALTER TABLE platform_uploads ADD COLUMN storage_path TEXT"
                    ))
                if 'lineage_metadata' not in cols:
                    logger.info("Applying SQLite hotfix: adding platform_uploads.lineage_metadata (JSON)")
                    conn.execute(text(
                        "ALTER TABLE platform_uploads ADD COLUMN lineage_metadata JSON"
                    ))
                # Some early dev DBs may also be missing upload_metadata or file_size
                if 'upload_metadata' not in cols:
                    logger.info("Applying SQLite hotfix: adding platform_uploads.upload_metadata (JSON)")
                    conn.execute(text(
                        "ALTER TABLE platform_uploads ADD COLUMN upload_metadata JSON"
                    ))
                if 'file_size' not in cols:
                    logger.info("Applying SQLite hotfix: adding platform_uploads.file_size")
                    conn.execute(text(
                        "ALTER TABLE platform_uploads ADD COLUMN file_size INTEGER"
                    ))
                conn.commit()
        except Exception as e:
            # Do not block startup for dev hotfixes
            logger.warning(f"SQLite hotfix for platform_uploads skipped: {e}")

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
