from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from ..dal.session_dal import SessionDAL
from ..models import Session as SessionModel

logger = logging.getLogger(__name__)

class SessionService:
    """Service for managing user sessions"""
    
    def __init__(self, db: Session):
        self.db = db
        self.session_dal = SessionDAL(db)
    
    def create_session(self, expires_in_hours: int = 24) -> SessionModel:
        """Create a new session"""
        try:
            session = self.session_dal.create_session(expires_in_hours)
            logger.info(f"Created new session: {session.id}")
            return session
        except Exception as e:
            logger.error(f"Failed to create session: {str(e)}")
            raise
    
    def get_session(self, session_id: str) -> Optional[SessionModel]:
        """Get an active session by ID"""
        try:
            session = self.session_dal.get_active_session(session_id)
            if session:
                logger.debug(f"Retrieved active session: {session_id}")
            else:
                logger.warning(f"Session not found or expired: {session_id}")
            return session
        except Exception as e:
            logger.error(f"Failed to get session {session_id}: {str(e)}")
            return None
    
    def extend_session(self, session_id: str, hours: int = 24) -> Optional[SessionModel]:
        """Extend session expiration time"""
        try:
            session = self.session_dal.extend_session(session_id, hours)
            if session:
                logger.info(f"Extended session {session_id} by {hours} hours")
            else:
                logger.warning(f"Failed to extend session: {session_id}")
            return session
        except Exception as e:
            logger.error(f"Failed to extend session {session_id}: {str(e)}")
            return None
    
    def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions"""
        try:
            deleted_count = self.session_dal.cleanup_expired_sessions()
            logger.info(f"Cleaned up {deleted_count} expired sessions")
            return deleted_count
        except Exception as e:
            logger.error(f"Failed to cleanup expired sessions: {str(e)}")
            return 0
    
    def is_session_valid(self, session_id: str) -> bool:
        """Check if a session is valid and not expired"""
        session = self.get_session(session_id)
        return session is not None
    
    def get_session_info(self, session_id: str) -> Optional[dict]:
        """Get session information including expiration status"""
        try:
            session = self.session_dal.get(session_id)
            if not session:
                return None
            
            now = datetime.utcnow()
            is_expired = session.expires_at <= now
            time_remaining = session.expires_at - now if not is_expired else timedelta(0)
            
            return {
                "id": session.id,
                "created_at": session.created_at,
                "expires_at": session.expires_at,
                "is_expired": is_expired,
                "time_remaining_seconds": int(time_remaining.total_seconds()),
                "updated_at": session.updated_at
            }
        except Exception as e:
            logger.error(f"Failed to get session info for {session_id}: {str(e)}")
            return None
