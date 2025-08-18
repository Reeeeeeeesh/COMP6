"""
Data Access Layer for Platform Transformation Models
Provides tenant-aware database operations for the new multi-tenant platform.
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_

from .base import BaseDAL
from ..models import (
    Tenant, User, InputCatalog, BonusPlan, PlanInput, PlanStep, 
    BonusPool, PlatformUpload, EmployeeRow, PlanRun, RunStepResult, 
    RunTotals, AuditEvent
)


class TenantDAL(BaseDAL[Tenant]):
    """Data Access Layer for Tenant operations."""
    
    def __init__(self, db: Session):
        super().__init__(db, Tenant)
    
    def get_by_name(self, name: str) -> Optional[Tenant]:
        """Get tenant by name."""
        return self.db.query(self.model).filter(self.model.name == name).first()
    
    def get_active_tenants(self) -> List[Tenant]:
        """Get all active tenants."""
        return self.db.query(self.model).filter(self.model.is_active == True).all()
    
    def create_with_default_user(self, name: str, admin_email: str, admin_name: str = None) -> tuple[Tenant, User]:
        """Create a new tenant with a default admin user."""
        # Create tenant
        tenant = self.create({
            'name': name,
            'is_active': True,
            'tenant_metadata': {'created_by': admin_email}
        })
        
        # Create admin user
        user = User(
            tenant_id=tenant.id,
            email=admin_email,
            display_name=admin_name or admin_email.split('@')[0],
            role='admin',
            is_active=True
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        return tenant, user


class UserDAL(BaseDAL[User]):
    """Data Access Layer for User operations."""
    
    def __init__(self, db: Session, tenant_id: str = None):
        super().__init__(db, User)
        self.tenant_id = tenant_id
    
    def get_by_email(self, email: str, tenant_id: str = None) -> Optional[User]:
        """Get user by email within tenant."""
        tid = tenant_id or self.tenant_id
        if not tid:
            raise ValueError("tenant_id is required")
        
        return self.db.query(self.model).filter(
            and_(self.model.email == email, self.model.tenant_id == tid)
        ).first()
    
    def get_by_tenant(self, tenant_id: str = None) -> List[User]:
        """Get all users for a tenant."""
        tid = tenant_id or self.tenant_id
        if not tid:
            raise ValueError("tenant_id is required")
        
        return self.db.query(self.model).filter(self.model.tenant_id == tid).all()
    
    def get_by_role(self, role: str, tenant_id: str = None) -> List[User]:
        """Get users by role within tenant."""
        tid = tenant_id or self.tenant_id
        if not tid:
            raise ValueError("tenant_id is required")
        
        return self.db.query(self.model).filter(
            and_(self.model.role == role, self.model.tenant_id == tid)
        ).all()


class InputCatalogDAL(BaseDAL[InputCatalog]):
    """Data Access Layer for Input Catalog operations."""
    
    def __init__(self, db: Session, tenant_id: str = None):
        super().__init__(db, InputCatalog)
        self.tenant_id = tenant_id
    
    def get_by_key(self, key: str, tenant_id: str = None) -> Optional[InputCatalog]:
        """Get input definition by key within tenant."""
        tid = tenant_id or self.tenant_id
        if not tid:
            raise ValueError("tenant_id is required")
        
        return self.db.query(self.model).filter(
            and_(self.model.key == key, self.model.tenant_id == tid)
        ).first()
    
    def get_by_tenant(self, tenant_id: str = None) -> List[InputCatalog]:
        """Get all input definitions for a tenant."""
        tid = tenant_id or self.tenant_id
        if not tid:
            raise ValueError("tenant_id is required")
        
        return self.db.query(self.model).filter(self.model.tenant_id == tid).all()
    
    def get_required_inputs(self, tenant_id: str = None) -> List[InputCatalog]:
        """Get required input definitions for a tenant."""
        tid = tenant_id or self.tenant_id
        if not tid:
            raise ValueError("tenant_id is required")
        
        return self.db.query(self.model).filter(
            and_(self.model.tenant_id == tid, self.model.required == True)
        ).all()


class BonusPlanDAL(BaseDAL[BonusPlan]):
    """Data Access Layer for Bonus Plan operations."""
    
    def __init__(self, db: Session, tenant_id: str = None):
        super().__init__(db, BonusPlan)
        self.tenant_id = tenant_id
    
    def get_by_tenant(self, tenant_id: str = None, status: str = None) -> List[BonusPlan]:
        """Get bonus plans for a tenant, optionally filtered by status."""
        tid = tenant_id or self.tenant_id
        if not tid:
            raise ValueError("tenant_id is required")
        
        query = self.db.query(self.model).filter(self.model.tenant_id == tid)
        if status:
            query = query.filter(self.model.status == status)
        
        return query.order_by(self.model.created_at.desc()).all()
    
    def get_by_name_and_version(self, name: str, version: int, tenant_id: str = None) -> Optional[BonusPlan]:
        """Get specific plan version."""
        tid = tenant_id or self.tenant_id
        if not tid:
            raise ValueError("tenant_id is required")
        
        return self.db.query(self.model).filter(
            and_(
                self.model.name == name,
                self.model.version == version,
                self.model.tenant_id == tid
            )
        ).first()
    
    def get_latest_version(self, name: str, tenant_id: str = None) -> Optional[BonusPlan]:
        """Get the latest version of a plan."""
        tid = tenant_id or self.tenant_id
        if not tid:
            raise ValueError("tenant_id is required")
        
        return self.db.query(self.model).filter(
            and_(self.model.name == name, self.model.tenant_id == tid)
        ).order_by(self.model.version.desc()).first()
    
    def lock_plan(self, plan_id: str, locked_by: str) -> bool:
        """Lock a plan to prevent further modifications."""
        plan = self.get_by_id(plan_id)
        if not plan or plan.status != 'draft':
            return False
        
        plan.status = 'locked'
        plan.locked_by = locked_by
        plan.locked_at = self.db.execute("SELECT datetime('now')").scalar()
        
        self.db.commit()
        return True


class PlanRunDAL(BaseDAL[PlanRun]):
    """Data Access Layer for Plan Run operations."""
    
    def __init__(self, db: Session, tenant_id: str = None):
        super().__init__(db, PlanRun)
        self.tenant_id = tenant_id
    
    def get_by_tenant(self, tenant_id: str = None, status: str = None) -> List[PlanRun]:
        """Get plan runs for a tenant, optionally filtered by status."""
        tid = tenant_id or self.tenant_id
        if not tid:
            raise ValueError("tenant_id is required")
        
        query = self.db.query(self.model).filter(self.model.tenant_id == tid)
        if status:
            query = query.filter(self.model.status == status)
        
        return query.order_by(self.model.started_at.desc()).all()
    
    def get_by_plan(self, plan_id: str, tenant_id: str = None) -> List[PlanRun]:
        """Get all runs for a specific plan."""
        tid = tenant_id or self.tenant_id
        if not tid:
            raise ValueError("tenant_id is required")
        
        return self.db.query(self.model).filter(
            and__(self.model.plan_id == plan_id, self.model.tenant_id == tid)
        ).order_by(self.model.started_at.desc()).all()
    
    def update_status(self, run_id: str, status: str, finished_at = None) -> bool:
        """Update run status."""
        run = self.get_by_id(run_id)
        if not run:
            return False
        
        run.status = status
        if finished_at:
            run.finished_at = finished_at
        
        self.db.commit()
        return True


class AuditEventDAL(BaseDAL[AuditEvent]):
    """Data Access Layer for Audit Event operations."""
    
    def __init__(self, db: Session, tenant_id: str = None):
        super().__init__(db, AuditEvent)
        self.tenant_id = tenant_id
    
    def log_event(self, action: str, entity: str, entity_id: str, 
                  actor_user_id: str = None, before: Dict[str, Any] = None, 
                  after: Dict[str, Any] = None, tenant_id: str = None) -> AuditEvent:
        """Log an audit event."""
        tid = tenant_id or self.tenant_id
        if not tid:
            raise ValueError("tenant_id is required")
        
        event = self.create({
            'tenant_id': tid,
            'actor_user_id': actor_user_id,
            'action': action,
            'entity': entity,
            'entity_id': entity_id,
            'before': before,
            'after': after
        })
        
        return event
    
    def get_by_entity(self, entity: str, entity_id: str, tenant_id: str = None) -> List[AuditEvent]:
        """Get audit trail for a specific entity."""
        tid = tenant_id or self.tenant_id
        if not tid:
            raise ValueError("tenant_id is required")
        
        return self.db.query(self.model).filter(
            and_(
                self.model.entity == entity,
                self.model.entity_id == entity_id,
                self.model.tenant_id == tid
            )
        ).order_by(self.model.at.desc()).all()
    
    def get_by_actor(self, actor_user_id: str, tenant_id: str = None) -> List[AuditEvent]:
        """Get audit trail for a specific actor."""
        tid = tenant_id or self.tenant_id
        if not tid:
            raise ValueError("tenant_id is required")
        
        return self.db.query(self.model).filter(
            and_(
                self.model.actor_user_id == actor_user_id,
                self.model.tenant_id == tid
            )
        ).order_by(self.model.at.desc()).all()