"""
Platform Service for Multi-Tenant Operations
Provides high-level business logic for platform transformation features.
"""
import hashlib
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from datetime import datetime

from ..dal.platform_dal import TenantDAL, UserDAL, BonusPlanDAL, AuditEventDAL
from ..models import Tenant, User, BonusPlan
from ..schemas import (
    TenantCreate, TenantResponse, UserCreate, UserResponse,
    BonusPlanCreate, BonusPlanResponse
)


class PlatformService:
    """Service for platform-wide operations."""
    
    def __init__(self, db: Session):
        self.db = db
        self.tenant_dal = TenantDAL(db)
        self.audit_dal = AuditEventDAL(db)
    
    def create_tenant_with_admin(self, tenant_data: TenantCreate, admin_email: str, admin_name: str = None) -> tuple[TenantResponse, UserResponse]:
        """Create a new tenant with an admin user."""
        try:
            tenant, user = self.tenant_dal.create_with_default_user(
                tenant_data.name, admin_email, admin_name
            )
            
            # Log tenant creation
            self.audit_dal.log_event(
                action='tenant.create',
                entity='tenant',
                entity_id=tenant.id,
                actor_user_id=user.id,
                tenant_id=tenant.id,
                after={'name': tenant.name, 'admin_email': admin_email}
            )
            
            return (
                TenantResponse.model_validate(tenant),
                UserResponse.model_validate(user)
            )
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_tenants(self, active_only: bool = True) -> List[TenantResponse]:
        """Get all tenants."""
        if active_only:
            tenants = self.tenant_dal.get_active_tenants()
        else:
            tenants = self.tenant_dal.get_all()
        
        return [TenantResponse.model_validate(tenant) for tenant in tenants]
    
    def deactivate_tenant(self, tenant_id: str, actor_user_id: str = None) -> bool:
        """Deactivate a tenant (soft delete)."""
        try:
            tenant = self.tenant_dal.get_by_id(tenant_id)
            if not tenant:
                return False
            
            old_data = {'is_active': tenant.is_active}
            tenant.is_active = False
            self.db.commit()
            
            # Log deactivation
            self.audit_dal.log_event(
                action='tenant.deactivate',
                entity='tenant', 
                entity_id=tenant_id,
                actor_user_id=actor_user_id,
                tenant_id=tenant_id,
                before=old_data,
                after={'is_active': False}
            )
            
            return True
        except Exception as e:
            self.db.rollback()
            raise e


class TenantService:
    """Service for tenant-specific operations."""
    
    def __init__(self, db: Session, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id
        self.user_dal = UserDAL(db, tenant_id)
        self.plan_dal = BonusPlanDAL(db, tenant_id)
        self.audit_dal = AuditEventDAL(db, tenant_id)
    
    def create_user(self, user_data: UserCreate, created_by: str = None) -> UserResponse:
        """Create a new user within this tenant."""
        try:
            user = self.user_dal.create({
                'tenant_id': self.tenant_id,
                'email': user_data.email,
                'display_name': user_data.display_name,
                'role': user_data.role,
                'is_active': user_data.is_active
            })
            
            # Log user creation
            self.audit_dal.log_event(
                action='user.create',
                entity='user',
                entity_id=user.id,
                actor_user_id=created_by,
                after={
                    'email': user.email,
                    'role': user.role,
                    'is_active': user.is_active
                }
            )
            
            return UserResponse.model_validate(user)
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_users(self, role: str = None) -> List[UserResponse]:
        """Get users within this tenant."""
        if role:
            users = self.user_dal.get_by_role(role)
        else:
            users = self.user_dal.get_by_tenant()
        
        return [UserResponse.model_validate(user) for user in users]
    
    def create_bonus_plan(self, plan_data: BonusPlanCreate, created_by: str = None) -> BonusPlanResponse:
        """Create a new bonus plan."""
        try:
            plan = self.plan_dal.create({
                'tenant_id': self.tenant_id,
                'name': plan_data.name,
                'version': plan_data.version,
                'status': plan_data.status,
                'effective_from': plan_data.effective_from,
                'effective_to': plan_data.effective_to,
                'notes': plan_data.notes,
                'plan_metadata': plan_data.plan_metadata,
                'created_by': created_by
            })
            
            # Log plan creation
            self.audit_dal.log_event(
                action='plan.create',
                entity='bonus_plan',
                entity_id=plan.id,
                actor_user_id=created_by,
                after={
                    'name': plan.name,
                    'version': plan.version,
                    'status': plan.status
                }
            )
            
            return BonusPlanResponse.model_validate(plan)
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_bonus_plans(self, status: str = None) -> List[BonusPlanResponse]:
        """Get bonus plans within this tenant."""
        plans = self.plan_dal.get_by_tenant(status=status)
        return [BonusPlanResponse.model_validate(plan) for plan in plans]
    
    def lock_bonus_plan(self, plan_id: str, locked_by: str) -> bool:
        """Lock a bonus plan to prevent modifications."""
        try:
            plan = self.plan_dal.get_by_id(plan_id)
            if not plan or plan.tenant_id != self.tenant_id:
                return False
            
            success = self.plan_dal.lock_plan(plan_id, locked_by)
            if success:
                # Log plan lock
                self.audit_dal.log_event(
                    action='plan.lock',
                    entity='bonus_plan',
                    entity_id=plan_id,
                    actor_user_id=locked_by,
                    before={'status': 'draft'},
                    after={'status': 'locked', 'locked_by': locked_by}
                )
            
            return success
        except Exception as e:
            self.db.rollback()
            raise e
    
    def generate_snapshot_hash(self, plan_id: str) -> str:
        """Generate a reproducible hash for a plan configuration."""
        plan = self.plan_dal.get_by_id(plan_id)
        if not plan:
            raise ValueError(f"Plan {plan_id} not found")
        
        # Create hash of plan configuration
        hash_data = {
            'plan_id': plan.id,
            'name': plan.name,
            'version': plan.version,
            'steps': [],  # Would include plan steps once implemented
            'inputs': []  # Would include plan inputs once implemented
        }
        
        hash_string = str(hash_data)
        return hashlib.sha256(hash_string.encode()).hexdigest()
    
    def get_audit_trail(self, entity: str = None, entity_id: str = None, 
                       actor_user_id: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get audit trail with optional filters."""
        if entity and entity_id:
            events = self.audit_dal.get_by_entity(entity, entity_id)
        elif actor_user_id:
            events = self.audit_dal.get_by_actor(actor_user_id)
        else:
            # Get recent events for the tenant
            events = self.db.query(self.audit_dal.model).filter(
                self.audit_dal.model.tenant_id == self.tenant_id
            ).order_by(self.audit_dal.model.at.desc()).limit(limit).all()
        
        return [
            {
                'id': event.id,
                'action': event.action,
                'entity': event.entity,
                'entity_id': event.entity_id,
                'actor_user_id': event.actor_user_id,
                'at': event.at.isoformat(),
                'before': event.before,
                'after': event.after
            }
            for event in events[:limit]
        ]


def get_platform_service(db: Session) -> PlatformService:
    """Factory function to create PlatformService."""
    return PlatformService(db)


def get_tenant_service(db: Session, tenant_id: str) -> TenantService:
    """Factory function to create TenantService."""
    return TenantService(db, tenant_id)