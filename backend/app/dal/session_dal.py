from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from .base import BaseDAL
from ..models import Session as SessionModel

class SessionDAL(BaseDAL[SessionModel]):
    """Data Access Layer for Session operations"""
    
    def __init__(self, db: Session):
        super().__init__(SessionModel, db)
    
    def create_session(self, expires_in_hours: int = 24) -> SessionModel:
        """Create a new session with specified expiration"""
        session_data = {
            "expires_at": datetime.utcnow() + timedelta(hours=expires_in_hours)
        }
        return self.create(session_data)
    
    def get_active_session(self, session_id: str) -> Optional[SessionModel]:
        """Get an active (non-expired) session"""
        return self.db.query(SessionModel).filter(
            SessionModel.id == session_id,
            SessionModel.expires_at > datetime.utcnow()
        ).first()
    
    def extend_session(self, session_id: str, hours: int = 24) -> Optional[SessionModel]:
        """Extend session expiration time"""
        session = self.get(session_id)
        if session:
            new_expiry = datetime.utcnow() + timedelta(hours=hours)
            return self.update(session, {"expires_at": new_expiry})
        return None
    
    def cleanup_expired_sessions(self) -> int:
        """Remove expired sessions and return count of deleted sessions"""
        expired_count = self.db.query(SessionModel).filter(
            SessionModel.expires_at <= datetime.utcnow()
        ).count()
        
        self.db.query(SessionModel).filter(
            SessionModel.expires_at <= datetime.utcnow()
        ).delete()
        
        self.db.commit()
        return expired_count
    
    def get_sessions_expiring_soon(self, hours: int = 1) -> List[SessionModel]:
        """Get sessions that will expire within specified hours"""
        cutoff_time = datetime.utcnow() + timedelta(hours=hours)
        return self.db.query(SessionModel).filter(
            SessionModel.expires_at <= cutoff_time,
            SessionModel.expires_at > datetime.utcnow()
        ).all()
