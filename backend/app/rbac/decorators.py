"""
RBAC decorators for protecting service methods and API endpoints.
Provides automatic permission checking and audit logging for sensitive operations.
"""

import functools
import logging
from datetime import datetime
from typing import Callable, List, Optional, Any, Dict
from sqlalchemy.orm import Session

from ..models import User, AuditEvent
from ..database import get_db
from .permissions import check_group_permission, get_role_level
from ..middleware.tenant_middleware import get_current_tenant_id

logger = logging.getLogger(__name__)


def require_permission(permission_name: str, group: Optional[str] = None):
    """
    Decorator that checks user permissions before method execution.
    
    Args:
        permission_name: Name of the permission or operation to check
        group: Optional permission group name
        
    Usage:
        @require_permission("upload", group="file_operations")
        def upload_file(self, user: User, ...):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract user from arguments (assume it's passed as 'user' kwarg or first arg after self)
            user = None
            if 'user' in kwargs:
                user = kwargs['user']
            elif len(args) > 1 and hasattr(args[1], 'role'):
                user = args[1]
            
            if not user or not hasattr(user, 'role'):
                logger.error(f"No user provided for permission check in {func.__name__}")
                raise PermissionError("Authentication required")
            
            # Check permission
            if group:
                has_permission = check_group_permission(user.role, group, permission_name)
                permission_desc = f"{group}.{permission_name}"
            else:
                # Simple role-based check for backwards compatibility
                has_permission = user.role in ['admin', 'super_admin']  # Default to admin only
                permission_desc = permission_name
            
            if not has_permission:
                logger.warning(
                    f"Permission denied for user {getattr(user, 'id', 'unknown')} "
                    f"with role {user.role} for {permission_desc}"
                )
                raise PermissionError(f"Insufficient permissions for {permission_desc}")
            
            logger.debug(f"Permission granted for {permission_desc} to user {getattr(user, 'id', 'unknown')}")
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def audit_action(action_name: str, resource_type: Optional[str] = None):
    """
    Decorator that automatically creates audit events for sensitive operations.
    
    Args:
        action_name: Name of the action being performed
        resource_type: Type of resource being acted upon
        
    Usage:
        @audit_action("file_upload", resource_type="platform_upload")
        def upload_file(self, user: User, tenant_id: str, ...):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract context information
            user = None
            tenant_id = None
            db_session = None
            
            # Look for user in kwargs or args
            if 'user' in kwargs:
                user = kwargs['user']
            elif len(args) > 1 and hasattr(args[1], 'role'):
                user = args[1]
            
            # Look for tenant_id in kwargs
            if 'tenant_id' in kwargs:
                tenant_id = kwargs['tenant_id']
            
            # Look for database session
            if 'db' in kwargs:
                db_session = kwargs['db']
            elif hasattr(args[0], 'db'):  # Assume first arg is self with db attribute
                db_session = args[0].db
            
            # Execute the function first
            try:
                result = func(*args, **kwargs)
                
                # Create audit event for successful operation
                if db_session and user:
                    audit_event = AuditEvent(
                        tenant_id=tenant_id or get_current_tenant_id(),
                        user_id=getattr(user, 'id', None),
                        event_type=action_name,
                        resource_type=resource_type or "unknown",
                        resource_id=getattr(result, 'id', None) if hasattr(result, 'id') else None,
                        event_data={
                            "action": action_name,
                            "timestamp": datetime.utcnow().isoformat(),
                            "function": func.__name__,
                            "success": True,
                            "user_role": getattr(user, 'role', None)
                        }
                    )
                    
                    try:
                        db_session.add(audit_event)
                        db_session.commit()
                        logger.info(f"Audit event created for {action_name} by user {getattr(user, 'id', 'unknown')}")
                    except Exception as e:
                        logger.error(f"Failed to create audit event: {str(e)}")
                        db_session.rollback()
                
                return result
                
            except Exception as e:
                # Create audit event for failed operation
                if db_session and user:
                    audit_event = AuditEvent(
                        tenant_id=tenant_id or get_current_tenant_id(),
                        user_id=getattr(user, 'id', None),
                        event_type=f"{action_name}_failed",
                        resource_type=resource_type or "unknown",
                        resource_id=None,
                        event_data={
                            "action": action_name,
                            "timestamp": datetime.utcnow().isoformat(),
                            "function": func.__name__,
                            "success": False,
                            "error": str(e),
                            "user_role": getattr(user, 'role', None)
                        }
                    )
                    
                    try:
                        db_session.add(audit_event)
                        db_session.commit()
                        logger.warning(f"Audit event created for failed {action_name} by user {getattr(user, 'id', 'unknown')}")
                    except Exception as audit_error:
                        logger.error(f"Failed to create failure audit event: {str(audit_error)}")
                        db_session.rollback()
                
                # Re-raise the original exception
                raise
        
        return wrapper
    return decorator


def tenant_scoped(func: Callable) -> Callable:
    """
    Decorator that ensures operations are limited to user's tenant context.
    Validates that any tenant_id parameter matches the current user's tenant.
    
    Usage:
        @tenant_scoped
        def get_plans(self, user: User, tenant_id: str):
            ...
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Extract user and tenant_id
        user = None
        requested_tenant_id = None
        
        if 'user' in kwargs:
            user = kwargs['user']
        elif len(args) > 1 and hasattr(args[1], 'role'):
            user = args[1]
        
        if 'tenant_id' in kwargs:
            requested_tenant_id = kwargs['tenant_id']
        
        # Skip validation if no tenant context or user is super_admin
        if not user or not requested_tenant_id:
            return func(*args, **kwargs)
        
        if getattr(user, 'role', None) == 'super_admin':
            return func(*args, **kwargs)
        
        # Check if user belongs to the requested tenant
        user_tenant_id = getattr(user, 'tenant_id', None)
        if user_tenant_id and user_tenant_id != requested_tenant_id:
            logger.warning(
                f"Tenant scope violation: user {getattr(user, 'id', 'unknown')} "
                f"from tenant {user_tenant_id} tried to access tenant {requested_tenant_id}"
            )
            raise PermissionError("Access denied: insufficient tenant permissions")
        
        return func(*args, **kwargs)
    
    return wrapper


def rate_limit(calls_per_minute: int = 60):
    """
    Decorator for basic rate limiting based on user ID.
    
    Args:
        calls_per_minute: Maximum calls per minute per user
        
    Usage:
        @rate_limit(calls_per_minute=30)
        def expensive_operation(self, user: User, ...):
            ...
    """
    # Simple in-memory rate limiting (use Redis in production)
    call_history: Dict[str, List[datetime]] = {}
    
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract user
            user = None
            if 'user' in kwargs:
                user = kwargs['user']
            elif len(args) > 1 and hasattr(args[1], 'id'):
                user = args[1]
            
            if not user:
                return func(*args, **kwargs)  # Skip rate limiting if no user
            
            user_id = getattr(user, 'id', 'anonymous')
            now = datetime.utcnow()
            
            # Clean old entries and add current call
            if user_id not in call_history:
                call_history[user_id] = []
            
            # Remove calls older than 1 minute
            call_history[user_id] = [
                call_time for call_time in call_history[user_id]
                if (now - call_time).total_seconds() < 60
            ]
            
            # Check rate limit
            if len(call_history[user_id]) >= calls_per_minute:
                logger.warning(f"Rate limit exceeded for user {user_id}")
                raise PermissionError("Rate limit exceeded. Please try again later.")
            
            # Record this call
            call_history[user_id].append(now)
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_roles(*allowed_roles: str):
    """
    Simple decorator that requires one of the specified roles.
    
    Args:
        *allowed_roles: Roles that are allowed to execute the function
        
    Usage:
        @require_roles("admin", "hr")
        def sensitive_operation(self, user: User, ...):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract user
            user = None
            if 'user' in kwargs:
                user = kwargs['user']
            elif len(args) > 1 and hasattr(args[1], 'role'):
                user = args[1]
            
            if not user or not hasattr(user, 'role'):
                raise PermissionError("Authentication required")
            
            # Check if user role is allowed or if user has higher role in hierarchy
            user_level = get_role_level(user.role)
            has_permission = any(
                user.role == role or user_level >= get_role_level(role)
                for role in allowed_roles
            )
            
            if not has_permission:
                logger.warning(
                    f"Access denied for user {getattr(user, 'id', 'unknown')} "
                    f"with role {user.role}. Required: {allowed_roles}"
                )
                raise PermissionError(f"Insufficient permissions. Required roles: {allowed_roles}")
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


# Convenience decorators for common permission patterns

def admin_required(func: Callable) -> Callable:
    """Decorator that requires admin role."""
    return require_roles("admin")(func)


def hr_or_admin_required(func: Callable) -> Callable:
    """Decorator that requires HR or admin role."""
    return require_roles("hr", "admin")(func)


def manager_or_above_required(func: Callable) -> Callable:
    """Decorator that requires manager role or above."""
    return require_roles("manager", "hr", "admin")(func)
