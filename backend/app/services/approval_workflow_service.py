"""
Approval Workflow Service - State machine for bonus plan lifecycle management.
Implements role-based approval gates with audit trail integration.
"""
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session

from ..models import BonusPlan, User, AuditEvent
from ..dal.platform_dal import BonusPlanDAL, UserDAL, AuditEventDAL

logger = logging.getLogger(__name__)


class ApprovalWorkflowService:
    """Centralized approval workflow service with role-based state machine."""
    
    # Role-based transition authorization matrix
    ROLE_PERMISSIONS = {
        'admin': {'can_approve': True, 'can_lock': True, 'can_archive': True},
        'hr': {'can_approve': True, 'can_lock': False, 'can_archive': False},
        'manager': {'can_approve': False, 'can_lock': False, 'can_archive': False},
        'auditor': {'can_approve': False, 'can_lock': False, 'can_archive': False},
        'readonly': {'can_approve': False, 'can_lock': False, 'can_archive': False}
    }
    
    # Valid state transitions (reusing existing logic)
    VALID_TRANSITIONS = {
        'draft': ['approved', 'archived'],
        'approved': ['locked', 'draft', 'archived'], 
        'locked': ['archived'],
        'archived': []
    }
    
    def __init__(self, db: Session, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id
        self.plan_dal = BonusPlanDAL(db, tenant_id)
        self.user_dal = UserDAL(db, tenant_id)
        self.audit_dal = AuditEventDAL(db, tenant_id)
    
    def approve_plan(self, plan_id: str, approver_id: str, notes: Optional[str] = None) -> Dict[str, any]:
        """Approve a draft plan with role-based authorization."""
        return self._execute_transition(plan_id, 'approved', approver_id, 'approve', notes)
    
    def lock_plan(self, plan_id: str, locker_id: str, notes: Optional[str] = None) -> Dict[str, any]:
        """Lock an approved plan with role-based authorization."""
        return self._execute_transition(plan_id, 'locked', locker_id, 'lock', notes)
    
    def archive_plan(self, plan_id: str, archiver_id: str, notes: Optional[str] = None) -> Dict[str, any]:
        """Archive a plan with role-based authorization.""" 
        return self._execute_transition(plan_id, 'archived', archiver_id, 'archive', notes)
    
    def revert_to_draft(self, plan_id: str, reverter_id: str, notes: Optional[str] = None) -> Dict[str, any]:
        """Revert approved plan back to draft."""
        return self._execute_transition(plan_id, 'draft', reverter_id, 'revert', notes)
    
    def _execute_transition(self, plan_id: str, target_status: str, user_id: str, 
                          action: str, notes: Optional[str]) -> Dict[str, any]:
        """Execute state transition with authorization and audit logging."""
        try:
            # Get plan and user
            plan = self.plan_dal.get_by_id(plan_id)
            if not plan:
                return {'success': False, 'error': 'Plan not found'}
            
            user = self.user_dal.get_by_id(user_id) 
            if not user:
                return {'success': False, 'error': 'User not found'}
            
            # Validate transition
            if target_status not in self.VALID_TRANSITIONS.get(plan.status, []):
                return {
                    'success': False, 
                    'error': f'Invalid transition from {plan.status} to {target_status}'
                }
            
            # Check role authorization
            auth_result = self._check_authorization(user.role, action, plan.status, target_status)
            if not auth_result['authorized']:
                return {
                    'success': False,
                    'error': f'Role {user.role} not authorized to {action} plans'
                }
            
            # Store old status for audit
            old_status = plan.status
            
            # Execute transition
            update_fields = {'status': target_status}
            if target_status == 'locked':
                update_fields['locked_by'] = user_id
                update_fields['locked_at'] = datetime.utcnow()
            
            updated_plan = self.plan_dal.update(plan_id, update_fields)
            
            # Create audit event
            audit_data = {
                'event_type': f'plan_{action}',
                'entity_type': 'bonus_plan',
                'entity_id': plan_id,
                'actor_id': user_id,
                'old_values': {'status': old_status},
                'new_values': {'status': target_status},
                'notes': notes or f'Plan {action} by {user.email}'
            }
            self.audit_dal.create(audit_data)
            
            self.db.commit()
            
            return {
                'success': True,
                'plan_id': plan_id,
                'old_status': old_status,
                'new_status': target_status,
                'action': action,
                'performed_by': user.email,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f'Error executing {action} transition for plan {plan_id}: {e}')
            return {'success': False, 'error': f'Transition failed: {str(e)}'}
    
    def _check_authorization(self, user_role: str, action: str, current_status: str, 
                           target_status: str) -> Dict[str, any]:
        """Check if user role is authorized for the requested action."""
        permissions = self.ROLE_PERMISSIONS.get(user_role, {})
        
        # Action-specific authorization
        if action == 'approve':
            authorized = permissions.get('can_approve', False)
        elif action == 'lock':  
            authorized = permissions.get('can_lock', False)
        elif action == 'archive':
            authorized = permissions.get('can_archive', False)
        elif action == 'revert':
            # Only admins and HR can revert approved plans
            authorized = user_role in ['admin', 'hr']
        else:
            authorized = False
        
        return {
            'authorized': authorized,
            'user_role': user_role,
            'action': action,
            'permissions': permissions
        }
    
    def get_plan_workflow_status(self, plan_id: str) -> Dict[str, any]:
        """Get comprehensive workflow status for a plan."""
        plan = self.plan_dal.get_by_id(plan_id)
        if not plan:
            return {'error': 'Plan not found'}
        
        # Get workflow history from audit events
        workflow_events = self.audit_dal.get_by_entity('bonus_plan', plan_id)
        
        return {
            'plan_id': plan_id,
            'current_status': plan.status,
            'created_by': plan.creator.email if plan.creator else None,
            'created_at': plan.created_at.isoformat() if plan.created_at else None,
            'locked_by': plan.locker.email if plan.locker else None,
            'locked_at': plan.locked_at.isoformat() if plan.locked_at else None,
            'possible_transitions': self.VALID_TRANSITIONS.get(plan.status, []),
            'workflow_history': [
                {
                    'action': event.event_type.replace('plan_', ''),
                    'performed_by': event.actor.email if event.actor else 'unknown',
                    'timestamp': event.created_at.isoformat(),
                    'notes': event.notes
                } for event in workflow_events if event.event_type.startswith('plan_')
            ]
        }


def get_approval_workflow_service(db: Session, tenant_id: str) -> ApprovalWorkflowService:
    """Factory function to create ApprovalWorkflowService.""" 
    return ApprovalWorkflowService(db, tenant_id)