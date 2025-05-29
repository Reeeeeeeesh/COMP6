from typing import Optional, List
from sqlalchemy.orm import Session
from .base import BaseDAL
from ..models import BatchUpload

class BatchUploadDAL(BaseDAL[BatchUpload]):
    """Data Access Layer for BatchUpload operations"""
    
    def __init__(self, db: Session):
        super().__init__(BatchUpload, db)
    
    def create_batch_upload(self, session_id: str, filename: str, 
                          original_filename: str, file_size: int) -> BatchUpload:
        """Create a new batch upload record"""
        upload_data = {
            "session_id": session_id,
            "filename": filename,
            "original_filename": original_filename,
            "file_size": file_size,
            "status": "uploaded"
        }
        return self.create(upload_data)
    
    def get_by_session(self, session_id: str) -> List[BatchUpload]:
        """Get all batch uploads for a session"""
        return self.db.query(BatchUpload).filter(
            BatchUpload.session_id == session_id
        ).order_by(BatchUpload.created_at.desc()).all()
    
    def update_status(self, upload_id: str, status: str, 
                     error_message: Optional[str] = None) -> Optional[BatchUpload]:
        """Update batch upload status"""
        upload = self.get(upload_id)
        if upload:
            update_data = {"status": status}
            if error_message:
                update_data["error_message"] = error_message
            return self.update(upload, update_data)
        return None
    
    def update_progress(self, upload_id: str, total_rows: int, 
                       processed_rows: int, failed_rows: int = 0) -> Optional[BatchUpload]:
        """Update batch upload progress"""
        upload = self.get(upload_id)
        if upload:
            update_data = {
                "total_rows": total_rows,
                "processed_rows": processed_rows,
                "failed_rows": failed_rows
            }
            return self.update(upload, update_data)
        return None
    
    def get_by_status(self, status: str) -> List[BatchUpload]:
        """Get batch uploads by status"""
        return self.db.query(BatchUpload).filter(
            BatchUpload.status == status
        ).all()
    
    def get_processing_uploads(self) -> List[BatchUpload]:
        """Get uploads that are currently being processed"""
        return self.get_by_status("processing")
    
    def mark_as_completed(self, upload_id: str) -> Optional[BatchUpload]:
        """Mark batch upload as completed"""
        return self.update_status(upload_id, "completed")
    
    def mark_as_failed(self, upload_id: str, error_message: str) -> Optional[BatchUpload]:
        """Mark batch upload as failed with error message"""
        return self.update_status(upload_id, "failed", error_message)
        
    def update_calculation_parameters(self, upload_id: str, parameters: dict) -> Optional[BatchUpload]:
        """Update calculation parameters for a batch upload"""
        upload = self.get(upload_id)
        if upload:
            update_data = {"calculation_parameters": parameters}
            return self.update(upload, update_data)
        return None
