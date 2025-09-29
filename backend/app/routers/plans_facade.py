"""Facade router exposing canonical plan-management endpoints.

This router delegates to the existing plan management service but reshapes
responses into the baseline contract expected by the frontend PlanService.
Routes are guarded by the PLAN_API_FACADE_V1 feature flag so we can roll out
safely without disrupting legacy clients that rely on /plan-management.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from ..feature_flags import FeatureFlag, get_feature_flags
from ..middleware import RequiredTenant, get_tenant_db_session
from ..schemas import (
    BonusPlanUpdate,
    PlatformApiResponse,
)
from ..services.plan_management_service import get_plan_management_service

router = APIRouter(prefix="/plans", tags=["plans"])


def _ensure_facade_enabled():
    flags = get_feature_flags()
    if not flags.plan_api_facade_enabled():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan API facade is disabled"
        )


@router.get("", response_model=PlatformApiResponse)
async def list_plans(
    status: Optional[str] = Query(None, description="Filter by plan status"),
    include_steps: bool = Query(False, description="Include plan steps in response"),
    include_inputs: bool = Query(False, description="Include plan inputs in response"),
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant),
):
    """Return the list of plans using the canonical contract."""
    _ensure_facade_enabled()

    db = get_tenant_db_session(request)
    try:
        plan_service = get_plan_management_service(db, tenant_id)
        plans = plan_service.get_plans(
            status_filter=status,
            include_steps=include_steps,
            include_inputs=include_inputs,
        )
        return PlatformApiResponse(
            success=True,
            data={"plans": plans},
            tenant_id=tenant_id,
        )
    finally:
        db.close()


@router.get("/{plan_id}", response_model=PlatformApiResponse)
async def get_plan(
    plan_id: str,
    include_steps: bool = Query(False, description="Include plan steps in response"),
    include_inputs: bool = Query(False, description="Include plan inputs in response"),
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant),
):
    """Return a single plan with optional nested resources."""
    _ensure_facade_enabled()

    db = get_tenant_db_session(request)
    try:
        plan_service = get_plan_management_service(db, tenant_id)
        plan = plan_service.get_plan(
            plan_id,
            include_steps=include_steps,
            include_inputs=include_inputs,
        )
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

        return PlatformApiResponse(
            success=True,
            data={"plan": plan},
            tenant_id=tenant_id,
        )
    finally:
        db.close()


@router.put("/{plan_id}", response_model=PlatformApiResponse)
async def update_plan(
    plan_id: str,
    plan_data: BonusPlanUpdate,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant),
):
    """Update mutable attributes of an existing plan via the facade."""
    _ensure_facade_enabled()

    db = get_tenant_db_session(request)
    try:
        plan_service = get_plan_management_service(db, tenant_id)
        plan = plan_service.update_plan(plan_id, plan_data)
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found or cannot be updated")

        return PlatformApiResponse(
            success=True,
            message="Plan updated successfully",
            data={"plan": plan.model_dump()},
            tenant_id=tenant_id,
        )
    finally:
        db.close()

