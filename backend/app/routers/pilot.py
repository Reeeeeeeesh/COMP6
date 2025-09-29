from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session

from ..middleware import RequiredTenant, get_tenant_db_session
from ..rbac.permissions import require_role
from ..services.pilot_service import get_pilot_service

router = APIRouter(prefix='/pilot', tags=['pilot'])


@router.post('/setup', dependencies=[Depends(require_role(["admin", "compliance"]))])
async def setup_pilot(config: dict, request: Request, tenant_id: str = Depends(RequiredTenant)):
    db: Session = get_tenant_db_session(request)
    try:
        svc = get_pilot_service(db, tenant_id)
        return svc.setup_pilot(config)
    finally:
        db.close()


@router.post('/{pilot_id}/execute', dependencies=[Depends(require_role(["admin", "compliance"]))])
async def execute_pilot(pilot_id: str, reference: dict, request: Request, tenant_id: str = Depends(RequiredTenant)):
    db: Session = get_tenant_db_session(request)
    try:
        svc = get_pilot_service(db, tenant_id)
        return svc.execute_parallel_run(pilot_id, reference)
    finally:
        db.close()


@router.get('/{pilot_id}/status', dependencies=[Depends(require_role(["admin", "compliance"]))])
async def pilot_status(pilot_id: str, request: Request, tenant_id: str = Depends(RequiredTenant)):
    db: Session = get_tenant_db_session(request)
    try:
        svc = get_pilot_service(db, tenant_id)
        report = svc.generate_pilot_report(pilot_id)
        return report
    finally:
        db.close()


@router.post('/{pilot_id}/reconcile', dependencies=[Depends(require_role(["admin", "compliance"]))])
async def reconcile_pilot(pilot_id: str, body: dict, request: Request, tenant_id: str = Depends(RequiredTenant)):
    db: Session = get_tenant_db_session(request)
    try:
        svc = get_pilot_service(db, tenant_id)
        return svc.reconcile_variance(pilot_id, float(body.get('tolerance_pct', 0.5)))
    finally:
        db.close()


@router.post('/{pilot_id}/approve', dependencies=[Depends(require_role(["compliance", "auditor"]))])
async def approve_pilot(pilot_id: str, request: Request, tenant_id: str = Depends(RequiredTenant)):
    db: Session = get_tenant_db_session(request)
    try:
        svc = get_pilot_service(db, tenant_id)
        rep = svc.generate_pilot_report(pilot_id)
        rep['approved'] = True
        return rep
    finally:
        db.close()

