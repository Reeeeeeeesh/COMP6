"""
Role-Based Access Control (RBAC) module.
Provides permission checking functions and decorators for securing API endpoints and service methods.
"""

from .permissions import (
    ROUTE_PERMISSIONS,
    check_permission,
    require_role,
    can_upload_files,
    can_approve_plans,
    can_view_audit_logs,
    get_user_permissions
)

from .decorators import (
    require_permission,
    audit_action,
    tenant_scoped
)

__all__ = [
    "ROUTE_PERMISSIONS",
    "check_permission", 
    "require_role",
    "can_upload_files",
    "can_approve_plans", 
    "can_view_audit_logs",
    "get_user_permissions",
    "require_permission",
    "audit_action",
    "tenant_scoped"
]
