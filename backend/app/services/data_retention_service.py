from typing import Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from ..dal.session_dal import SessionDAL
from ..dal.batch_upload_dal import BatchUploadDAL
from ..models import Session as SessionModel, BatchUpload, EmployeeData

logger = logging.getLogger(__name__)

class DataRetentionService:
    """Service for managing data retention policies"""
    
    def __init__(self, db: Session):
        self.db = db
        self.session_dal = SessionDAL(db)
        self.batch_upload_dal = BatchUploadDAL(db)
    
    def cleanup_expired_data(self, retention_hours: int = 72) -> Dict[str, Any]:
        """Clean up expired data based on retention policy"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=retention_hours)
            
            # Find expired sessions
            expired_sessions = self.db.query(SessionModel).filter(
                SessionModel.expires_at <= cutoff_time
            ).all()
            
            cleanup_stats = {
                "sessions_deleted": 0,
                "batch_uploads_deleted": 0,
                "employee_records_deleted": 0,
                "total_data_size_freed": 0
            }
            
            for session in expired_sessions:
                # Count related data before deletion
                batch_uploads = self.db.query(BatchUpload).filter(
                    BatchUpload.session_id == session.id
                ).all()
                
                for upload in batch_uploads:
                    employee_count = self.db.query(EmployeeData).filter(
                        EmployeeData.batch_upload_id == upload.id
                    ).count()
                    
                    cleanup_stats["employee_records_deleted"] += employee_count
                    cleanup_stats["total_data_size_freed"] += upload.file_size or 0
                
                cleanup_stats["batch_uploads_deleted"] += len(batch_uploads)
                cleanup_stats["sessions_deleted"] += 1
                
                # Delete session (cascade will handle related data)
                self.db.delete(session)
            
            self.db.commit()
            
            logger.info(f"Data retention cleanup completed: {cleanup_stats}")
            return cleanup_stats
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to cleanup expired data: {str(e)}")
            raise
    
    def get_data_retention_stats(self) -> Dict[str, Any]:
        """Get statistics about data retention"""
        try:
            now = datetime.utcnow()
            
            # Count active sessions
            active_sessions = self.db.query(SessionModel).filter(
                SessionModel.expires_at > now
            ).count()
            
            # Count expired sessions
            expired_sessions = self.db.query(SessionModel).filter(
                SessionModel.expires_at <= now
            ).count()
            
            # Count total batch uploads
            total_uploads = self.db.query(BatchUpload).count()
            
            # Count total employee records
            total_employees = self.db.query(EmployeeData).count()
            
            # Calculate total file size
            total_file_size = self.db.query(BatchUpload).with_entities(
                self.db.func.sum(BatchUpload.file_size)
            ).scalar() or 0
            
            return {
                "active_sessions": active_sessions,
                "expired_sessions": expired_sessions,
                "total_batch_uploads": total_uploads,
                "total_employee_records": total_employees,
                "total_file_size_bytes": total_file_size,
                "timestamp": now.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get retention stats: {str(e)}")
            raise
    
    def schedule_cleanup_warning(self, hours_before_cleanup: int = 24) -> Dict[str, Any]:
        """Get sessions that will be cleaned up soon"""
        try:
            warning_time = datetime.utcnow() + timedelta(hours=hours_before_cleanup)
            
            sessions_to_warn = self.db.query(SessionModel).filter(
                SessionModel.expires_at <= warning_time,
                SessionModel.expires_at > datetime.utcnow()
            ).all()
            
            warnings = []
            for session in sessions_to_warn:
                batch_count = self.db.query(BatchUpload).filter(
                    BatchUpload.session_id == session.id
                ).count()
                
                warnings.append({
                    "session_id": session.id,
                    "expires_at": session.expires_at.isoformat(),
                    "batch_uploads_count": batch_count,
                    "hours_until_expiry": (session.expires_at - datetime.utcnow()).total_seconds() / 3600
                })
            
            return {
                "sessions_expiring_soon": warnings,
                "total_count": len(warnings),
                "warning_threshold_hours": hours_before_cleanup
            }
            
        except Exception as e:
            logger.error(f"Failed to get cleanup warnings: {str(e)}")
            raise
