"""
Permission matrix and checking functions for RBAC system.
Maps routes to allowed roles and provides helper functions for common permission checks.
"""

import fnmatch
import logging
from typing import Dict, List, Set, Optional
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from ..models import User
from ..middleware.tenant_middleware import OptionalTenant
from ..database import get_db

logger = logging.getLogger(__name__)

# HTTP Bearer token scheme for authentication
security = HTTPBearer()

# Role hierarchy (higher roles inherit permissions from lower roles)
ROLE_HIERARCHY = {
    "super_admin": 100,
    "admin": 80,
    "hr": 60,
    "manager": 40,
    "analyst": 20,
    "viewer": 10
}

# Route permission matrix - maps route patterns to allowed roles
ROUTE_PERMISSIONS: Dict[str, List[str]] = {
    # File upload and batch processing
    "/batch/**": ["admin", "hr", "manager"],
    "/uploads/**": ["admin", "hr", "manager"],
    "/platform/uploads/**": ["admin", "hr"],
    
    # Plan management
    "/plans/**": ["admin", "hr"],
    "/scenarios/**": ["admin", "hr", "manager"],
    "/bonus-pools/**": ["admin", "hr"],
    
    # Calculation and execution
    "/calculations/**": ["admin", "hr", "manager", "analyst"],
    "/plan-runs/**": ["admin", "hr", "manager"],
    
    # Audit and monitoring
    "/audit/**": ["admin"],
    "/audit-events/**": ["admin"],
    "/metrics/**": ["admin", "hr"],
    
    # User and tenant management
    "/users/**": ["admin"],
    "/tenants/**": ["super_admin"],
    
    # Revenue banding
    "/revenue-banding/**": ["admin", "hr", "manager"],
    
    # Team RAF
    "/teams/*/raf/**": ["admin", "hr"],
    "/teams/revenue-history/import": ["admin", "hr"],
    "/evidence-pack/**": ["admin", "hr", "analyst"],
    
    # Connector and Pilot management
    "/connectors/**": ["admin", "hr"],
    "/pilot/**": ["admin", "compliance"],
    # Risk events (malus/clawback)
    "/risk-events/**": ["admin", "compliance", "risk"],
    
    # Golden datasets management
    "/golden-datasets/**": ["admin", "qa"],
    
    # Payouts, Exceptions, Payroll
    "/payout-policies/**": ["admin", "hr"],
    "/batch-results/*/split-payouts": ["admin", "hr"],
    "/exceptions/**": ["admin", "compliance"],
    "/payroll/**": ["admin", "payroll"],
    
    # Read-only endpoints
    "/health": ["*"],  # Public endpoint
    "/docs": ["*"],    # Public endpoint
    "/openapi.json": ["*"],  # Public endpoint
    
    # Default catch-all (most restrictive)
    "/**": ["admin"]
}

# Permission groups for common operations
PERMISSION_GROUPS = {
    "file_operations": {
        "upload": ["admin", "hr", "manager"],
        "download": ["admin", "hr", "manager", "analyst"],
        "delete": ["admin", "hr"]
    },
    "plan_operations": {
        "create": ["admin", "hr"],
        "read": ["admin", "hr", "manager", "analyst"],
        "update": ["admin", "hr"],
        "delete": ["admin"],
        "approve": ["admin", "hr"],
        "execute": ["admin", "hr", "manager"]
    },
    "audit_operations": {
        "read": ["admin"],
        "export": ["admin"]
    },
    "user_operations": {
        "create": ["admin"],
        "read": ["admin", "hr"],
        "update": ["admin"],
        "delete": ["admin"]
    },
    "raf_operations": {
        "create": ["admin", "hr"],
        "read": ["admin", "hr", "manager", "analyst"],
        "update": ["admin", "hr"],
        "approve": ["admin", "hr"],
        "import": ["admin", "hr"]
    },
    "evidence_operations": {
        "generate": ["admin", "hr"],
        "download": ["admin", "hr", "analyst"],
        "verify": ["admin", "hr", "analyst"],
        "read": ["admin", "hr", "analyst"]
    },
    "payout_operations": {
        "manage": ["admin", "hr"],
        "split": ["admin", "hr"],
        "view": ["admin", "hr", "manager", "analyst"]
    },
    "exception_operations": {
        "view": ["admin", "compliance"],
        "resolve": ["admin", "compliance"]
    },
    "payroll_operations": {
        "export": ["admin", "payroll"],
        "view": ["admin", "payroll"]
    },
    "risk_operations": {
        "manage": ["admin", "compliance", "risk"],
        "apply": ["compliance", "risk"],
    },
    "golden_operations": {
        "run": ["admin", "qa"],
        "regenerate": ["admin", "qa"]
    },
    "connector_operations": {
        "manage": ["admin", "hr"],
        "run": ["admin", "hr"]
    },
    "pilot_operations": {
        "execute": ["admin", "compliance"],
        "approve": ["compliance", "auditor"]
    }
}


def get_role_level(role: str) -> int:
    """Get numeric level for role comparison."""
    return ROLE_HIERARCHY.get(role, 0)


def check_permission(user_role: str, route_pattern: str) -> bool:
    """
    Check if user role has permission for the given route pattern.
    
    Args:
        user_role: User's role (e.g., 'admin', 'hr', 'manager')
        route_pattern: Route pattern to check (e.g., '/batch/upload')
        
    Returns:
        bool: True if permission granted, False otherwise
    """
    if not user_role:
        return False
    
    # Check for exact matches first
    if route_pattern in ROUTE_PERMISSIONS:
        allowed_roles = ROUTE_PERMISSIONS[route_pattern]
        if "*" in allowed_roles or user_role in allowed_roles:
            return True
        
        # Check role hierarchy - higher roles inherit lower role permissions
        user_level = get_role_level(user_role)
        for allowed_role in allowed_roles:
            if user_level >= get_role_level(allowed_role):
                return True
    
    # Check pattern matches using glob patterns
    for pattern, allowed_roles in ROUTE_PERMISSIONS.items():
        if fnmatch.fnmatch(route_pattern, pattern):
            if "*" in allowed_roles or user_role in allowed_roles:
                return True
            
            # Check role hierarchy
            user_level = get_role_level(user_role)
            for allowed_role in allowed_roles:
                if user_level >= get_role_level(allowed_role):
                    return True
    
    return False


def check_group_permission(user_role: str, group: str, operation: str) -> bool:
    """
    Check permission using permission groups.
    
    Args:
        user_role: User's role
        group: Permission group (e.g., 'file_operations')
        operation: Operation within group (e.g., 'upload')
        
    Returns:
        bool: True if permission granted, False otherwise
    """
    if group not in PERMISSION_GROUPS:
        return False
    
    group_perms = PERMISSION_GROUPS[group]
    if operation not in group_perms:
        return False
    
    allowed_roles = group_perms[operation]
    if "*" in allowed_roles or user_role in allowed_roles:
        return True
    
    # Check role hierarchy
    user_level = get_role_level(user_role)
    for allowed_role in allowed_roles:
        if user_level >= get_role_level(allowed_role):
            return True
    
    return False


async def get_current_user(
    token: str = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current user from JWT token.
    This is a placeholder - integrate with your actual authentication system.
    """
    try:
        # TODO: Implement actual JWT token validation
        # For now, return a mock user or None
        # In real implementation, decode JWT and fetch user from database
        
        # Mock implementation for development
        if token.credentials == "mock_admin_token":
            return User(id="admin_user", role="admin", email="admin@example.com")
        elif token.credentials == "mock_hr_token":
            return User(id="hr_user", role="hr", email="hr@example.com")
        
        return None
        
    except Exception as e:
        logger.error(f"Error validating user token: {str(e)}")
        return None


def require_role(allowed_roles: List[str]):
    """
    FastAPI dependency that checks if user has one of the allowed roles.
    
    Args:
        allowed_roles: List of allowed roles for the endpoint
        
    Returns:
        FastAPI dependency function
        
    Raises:
        HTTPException: 401 if not authenticated, 403 if not authorized
    """
    async def check_role(
        current_user: Optional[User] = Depends(get_current_user),
        current_tenant: Optional[str] = Depends(OptionalTenant)
    ):
        if not current_user:
            raise HTTPException(
                status_code=401,
                detail="Authentication required"
            )
        
        if not current_user.role:
            raise HTTPException(
                status_code=403,
                detail="User role not defined"
            )
        
        # Check if user role is allowed
        if "*" not in allowed_roles and current_user.role not in allowed_roles:
            # Check role hierarchy
            user_level = get_role_level(current_user.role)
            has_permission = any(
                user_level >= get_role_level(role) 
                for role in allowed_roles
            )
            
            if not has_permission:
                logger.warning(
                    f"Access denied for user {current_user.id} "
                    f"with role {current_user.role}. Required: {allowed_roles}"
                )
                raise HTTPException(
                    status_code=403,
                    detail=f"Insufficient permissions. Required roles: {allowed_roles}"
                )
        
        return current_user
    
    return check_role


def require_permission(permission_group: str, operation: str):
    """
    FastAPI dependency that checks specific permission group and operation.
    
    Args:
        permission_group: Permission group name
        operation: Operation within the group
        
    Returns:
        FastAPI dependency function
    """
    async def check_permission_dep(
        current_user: Optional[User] = Depends(get_current_user)
    ):
        if not current_user:
            raise HTTPException(
                status_code=401,
                detail="Authentication required"
            )
        
        if not check_group_permission(current_user.role, permission_group, operation):
            logger.warning(
                f"Permission denied for user {current_user.id} "
                f"with role {current_user.role} for {permission_group}.{operation}"
            )
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions for {permission_group}.{operation}"
            )
        
        return current_user
    
    return check_permission_dep


# Helper functions for common permission checks

def can_upload_files(user_role: str) -> bool:
    """Check if user can upload files."""
    return check_group_permission(user_role, "file_operations", "upload")


def can_approve_plans(user_role: str) -> bool:
    """Check if user can approve bonus plans."""
    return check_group_permission(user_role, "plan_operations", "approve")


def can_view_audit_logs(user_role: str) -> bool:
    """Check if user can view audit logs."""
    return check_group_permission(user_role, "audit_operations", "read")


def can_manage_users(user_role: str) -> bool:
    """Check if user can manage other users."""
    return check_group_permission(user_role, "user_operations", "create")


def can_execute_plans(user_role: str) -> bool:
    """Check if user can execute bonus plans."""
    return check_group_permission(user_role, "plan_operations", "execute")


def can_manage_team_raf(user_role: str) -> bool:
    """Check if user can manage team RAF configurations."""
    return check_group_permission(user_role, "raf_operations", "create")


def can_approve_raf(user_role: str) -> bool:
    """Check if user can approve RAF configurations."""
    return check_group_permission(user_role, "raf_operations", "approve")


def can_generate_evidence_pack(user_role: str) -> bool:
    """Check if user can generate evidence packs."""
    return check_group_permission(user_role, "evidence_operations", "generate")


def can_manage_payouts(user_role: str) -> bool:
    """Check if user can manage payout operations."""
    return check_group_permission(user_role, "payout_operations", "manage")


def can_resolve_exceptions(user_role: str) -> bool:
    """Check if user can resolve exceptions."""
    return check_group_permission(user_role, "exception_operations", "resolve")


def can_export_payroll(user_role: str) -> bool:
    """Check if user can export payroll files."""
    return check_group_permission(user_role, "payroll_operations", "export")


def can_manage_risk_events(user_role: str) -> bool:
    """Check if user can manage risk events."""
    return check_group_permission(user_role, "risk_operations", "manage")


def can_apply_malus_clawback(user_role: str) -> bool:
    """Check if user can apply malus/clawback."""
    return check_group_permission(user_role, "risk_operations", "apply")


def can_regenerate_golden_fixtures(user_role: str) -> bool:
    """Check if user can regenerate golden dataset fixtures."""
    return check_group_permission(user_role, "golden_operations", "regenerate")


def can_manage_connectors(user_role: str) -> bool:
    return check_group_permission(user_role, "connector_operations", "manage")


def can_execute_pilot(user_role: str) -> bool:
    return check_group_permission(user_role, "pilot_operations", "execute")


def can_approve_pilot(user_role: str) -> bool:
    return check_group_permission(user_role, "pilot_operations", "approve")


def get_user_permissions(user_role: str) -> Dict[str, List[str]]:
    """
    Get all permissions for a user role.
    
    Args:
        user_role: User's role
        
    Returns:
        Dict mapping permission groups to allowed operations
    """
    permissions = {}
    
    for group, operations in PERMISSION_GROUPS.items():
        allowed_operations = []
        for operation, allowed_roles in operations.items():
            if check_group_permission(user_role, group, operation):
                allowed_operations.append(operation)
        
        if allowed_operations:
            permissions[group] = allowed_operations
    
    return permissions


def get_accessible_routes(user_role: str) -> List[str]:
    """
    Get list of route patterns accessible to user role.
    
    Args:
        user_role: User's role
        
    Returns:
        List of accessible route patterns
    """
    accessible = []
    
    for route_pattern, allowed_roles in ROUTE_PERMISSIONS.items():
        if check_permission(user_role, route_pattern):
            accessible.append(route_pattern)
    
    return accessible
