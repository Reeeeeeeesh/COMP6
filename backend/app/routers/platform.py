"""
Platform API router for tenant and user management.
Provides endpoints for multi-tenant platform operations.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware import RequiredTenant, OptionalTenant, get_tenant_db_session
from ..services.platform_service import get_platform_service, get_tenant_service
from ..schemas import (
    TenantCreate, TenantResponse, TenantUpdate,
    UserCreate, UserResponse, UserUpdate,
    BonusPlanCreate, BonusPlanResponse, BonusPlanUpdate,
    PlatformApiResponse
)

router = APIRouter(prefix="/platform", tags=["platform"])

# ================================
# Platform-wide operations (no tenant context required)
# ================================

@router.post("/tenants", response_model=PlatformApiResponse)
async def create_tenant(
    tenant_data: TenantCreate,
    admin_email: str,
    admin_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Create a new tenant with admin user."""
    try:
        platform_service = get_platform_service(db)
        tenant, user = platform_service.create_tenant_with_admin(
            tenant_data, admin_email, admin_name
        )
        
        return PlatformApiResponse(
            success=True,
            message="Tenant created successfully",
            data={
                "tenant": tenant.model_dump(),
                "admin_user": user.model_dump()
            },
            tenant_id=tenant.id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create tenant: {str(e)}"
        )


@router.get("/tenants", response_model=PlatformApiResponse)
async def list_tenants(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """List all tenants (platform admin only)."""
    try:
        platform_service = get_platform_service(db)
        tenants = platform_service.get_tenants(active_only=active_only)
        
        return PlatformApiResponse(
            success=True,
            data={"tenants": [t.model_dump() for t in tenants]}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list tenants: {str(e)}"
        )


@router.patch("/tenants/{tenant_id}/deactivate", response_model=PlatformApiResponse)
async def deactivate_tenant(
    tenant_id: str,
    actor_user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Deactivate a tenant (soft delete)."""
    try:
        platform_service = get_platform_service(db)
        success = platform_service.deactivate_tenant(tenant_id, actor_user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        return PlatformApiResponse(
            success=True,
            message="Tenant deactivated successfully",
            tenant_id=tenant_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to deactivate tenant: {str(e)}"
        )

# ================================
# Tenant-specific operations (require tenant context)
# ================================

@router.post("/users", response_model=PlatformApiResponse)
async def create_user(
    user_data: UserCreate,
    created_by: Optional[str] = None,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Create a new user within the current tenant."""
    try:
        db = get_tenant_db_session(request)
        tenant_service = get_tenant_service(db, tenant_id)
        user = tenant_service.create_user(user_data, created_by)
        
        return PlatformApiResponse(
            success=True,
            message="User created successfully",
            data={"user": user.model_dump()},
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create user: {str(e)}"
        )
    finally:
        db.close()


@router.get("/users", response_model=PlatformApiResponse)
async def list_users(
    role: Optional[str] = None,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """List users within the current tenant."""
    try:
        db = get_tenant_db_session(request)
        tenant_service = get_tenant_service(db, tenant_id)
        users = tenant_service.get_users(role=role)
        
        return PlatformApiResponse(
            success=True,
            data={"users": [u.model_dump() for u in users]},
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list users: {str(e)}"
        )
    finally:
        db.close()


@router.post("/bonus-plans", response_model=PlatformApiResponse)
async def create_bonus_plan(
    plan_data: BonusPlanCreate,
    created_by: Optional[str] = None,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Create a new bonus plan."""
    try:
        db = get_tenant_db_session(request)
        tenant_service = get_tenant_service(db, tenant_id)
        plan = tenant_service.create_bonus_plan(plan_data, created_by)
        
        return PlatformApiResponse(
            success=True,
            message="Bonus plan created successfully",
            data={"plan": plan.model_dump()},
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create bonus plan: {str(e)}"
        )
    finally:
        db.close()


@router.get("/bonus-plans", response_model=PlatformApiResponse)
async def list_bonus_plans(
    status_filter: Optional[str] = None,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """List bonus plans within the current tenant."""
    try:
        db = get_tenant_db_session(request)
        tenant_service = get_tenant_service(db, tenant_id)
        plans = tenant_service.get_bonus_plans(status=status_filter)
        
        return PlatformApiResponse(
            success=True,
            data={"plans": [p.model_dump() for p in plans]},
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list bonus plans: {str(e)}"
        )
    finally:
        db.close()


@router.patch("/bonus-plans/{plan_id}/lock", response_model=PlatformApiResponse)
async def lock_bonus_plan(
    plan_id: str,
    locked_by: str,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Lock a bonus plan to prevent modifications."""
    try:
        db = get_tenant_db_session(request)
        tenant_service = get_tenant_service(db, tenant_id)
        success = tenant_service.lock_bonus_plan(plan_id, locked_by)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bonus plan not found or cannot be locked"
            )
        
        return PlatformApiResponse(
            success=True,
            message="Bonus plan locked successfully",
            tenant_id=tenant_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to lock bonus plan: {str(e)}"
        )
    finally:
        db.close()


@router.get("/audit-trail", response_model=PlatformApiResponse)
async def get_audit_trail(
    entity: Optional[str] = None,
    entity_id: Optional[str] = None,
    actor_user_id: Optional[str] = None,
    limit: int = 100,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Get audit trail for the current tenant."""
    try:
        db = get_tenant_db_session(request)
        tenant_service = get_tenant_service(db, tenant_id)
        events = tenant_service.get_audit_trail(entity, entity_id, actor_user_id, limit)
        
        return PlatformApiResponse(
            success=True,
            data={"audit_events": events},
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get audit trail: {str(e)}"
        )
    finally:
        db.close()