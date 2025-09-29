"""
API Router for Risk Events (Malus/Clawback)
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from ..middleware import RequiredTenant, get_tenant_db_session
from ..rbac.permissions import require_role
from ..services.malus_clawback_service import get_malus_clawback_service
from ..schemas import (
    RiskEventCreate, RiskEventResponse,
    MalusRequest, ClawbackRequest, RestatementRequest, PlatformApiResponse
)

router = APIRouter(prefix="/risk-events", tags=["risk-events"])


@router.post("/", response_model=PlatformApiResponse, dependencies=[Depends(require_role(["admin", "compliance", "risk"]))])
async def create_risk_event(
    payload: RiskEventCreate,
    request: Request,
    tenant_id: str = Depends(RequiredTenant)
):
    db = get_tenant_db_session(request)
    try:
        svc = get_malus_clawback_service(db, tenant_id)
        event = svc._create_event(payload.employee_id, payload.cycle, payload.decision, payload.model_dump())
        return PlatformApiResponse(success=True, data={"event_id": event.id}, tenant_id=tenant_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()


@router.get("/{employee_id}/{cycle}", response_model=PlatformApiResponse, dependencies=[Depends(require_role(["admin", "compliance", "risk"]))])
async def list_risk_events(
    employee_id: str,
    cycle: str,
    request: Request,
    tenant_id: str = Depends(RequiredTenant)
):
    db = get_tenant_db_session(request)
    try:
        from ..dal.risk_event_dal import RiskEventDAL
        dal = RiskEventDAL(db)
        events = dal.get_by_employee_and_cycle(employee_id, cycle)
        # Simple serialization
        data = [
            {
                'id': e.id,
                'employee_id': e.employee_id,
                'cycle': e.cycle,
                'event_type': e.event_type,
                'decision': e.decision,
                'amount_or_percentage': e.amount_or_percentage,
                'is_percentage': e.is_percentage,
                'status': e.status,
                'occurred_at': e.occurred_at.isoformat() if e.occurred_at else None
            } for e in events
        ]
        return PlatformApiResponse(success=True, data=data, tenant_id=tenant_id)
    finally:
        db.close()


@router.post("/{event_id}/approve", response_model=PlatformApiResponse, dependencies=[Depends(require_role(["admin", "compliance", "risk"]))])
async def approve_risk_event(
    event_id: str,
    request: Request,
    tenant_id: str = Depends(RequiredTenant)
):
    db = get_tenant_db_session(request)
    try:
        from ..dal.risk_event_dal import RiskEventDAL
        dal = RiskEventDAL(db)
        # Approver inferred is omitted; set to None in this placeholder
        evt = dal.approve_risk_event(event_id, approver_id=None)
        if not evt:
            raise HTTPException(status_code=404, detail="Risk event not found")
        return PlatformApiResponse(success=True, data={'event_id': evt.id, 'status': evt.status}, tenant_id=tenant_id)
    finally:
        db.close()


@router.post("/employees/{employee_id}/malus", response_model=PlatformApiResponse, dependencies=[Depends(require_role(["admin", "compliance", "risk"]))])
async def apply_malus(
    employee_id: str,
    malus: MalusRequest,
    request: Request,
    tenant_id: str = Depends(RequiredTenant)
):
    db = get_tenant_db_session(request)
    try:
        svc = get_malus_clawback_service(db, tenant_id)
        result = svc.apply_malus(employee_id, malus.cycle, malus.model_dump(), approver_id=None)
        return PlatformApiResponse(success=True, data=result, tenant_id=tenant_id)
    finally:
        db.close()


@router.post("/employees/{employee_id}/clawback", response_model=PlatformApiResponse, dependencies=[Depends(require_role(["admin", "compliance", "risk"]))])
async def apply_clawback(
    employee_id: str,
    clawback: ClawbackRequest,
    request: Request,
    tenant_id: str = Depends(RequiredTenant)
):
    db = get_tenant_db_session(request)
    try:
        svc = get_malus_clawback_service(db, tenant_id)
        result = svc.apply_clawback(employee_id, clawback.cycle, clawback.model_dump(), approver_id=None)
        return PlatformApiResponse(success=True, data=result, tenant_id=tenant_id)
    finally:
        db.close()


@router.post("/employees/{employee_id}/restate-statement", response_model=PlatformApiResponse, dependencies=[Depends(require_role(["admin", "compliance", "risk"]))])
async def restate_statement(
    employee_id: str,
    body: RestatementRequest,
    request: Request,
    tenant_id: str = Depends(RequiredTenant)
):
    db = get_tenant_db_session(request)
    try:
        svc = get_malus_clawback_service(db, tenant_id)
        result = svc.restate_employee_statement(employee_id, body.cycle)
        return PlatformApiResponse(success=True, data=result, tenant_id=tenant_id)
    finally:
        db.close()

