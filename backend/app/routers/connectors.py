from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..middleware import RequiredTenant, get_tenant_db_session
from ..rbac.permissions import require_role
from ..services.connector_service import get_connector_service

router = APIRouter(prefix="/connectors", tags=["connectors"]) 


@router.post('/config', dependencies=[Depends(require_role(["admin", "hr"]))])
async def register_connector(config: dict, request: Request, tenant_id: str = Depends(RequiredTenant)):
    db: Session = get_tenant_db_session(request)
    try:
        svc = get_connector_service(db, tenant_id)
        cfg = svc.register_connector(config)
        return {"success": True, "config_id": cfg.id}
    finally:
        db.close()


@router.get('', dependencies=[Depends(require_role(["admin", "hr"]))])
async def list_connectors(request: Request, tenant_id: str = Depends(RequiredTenant)):
    db: Session = get_tenant_db_session(request)
    try:
        from ..models import ConnectorConfig
        cfgs = db.query(ConnectorConfig).filter(ConnectorConfig.tenant_id == tenant_id).all()
        return [{
            'id': c.id,
            'type': c.connector_type,
            'system': c.system_name,
            'enabled': c.enabled
        } for c in cfgs]
    finally:
        db.close()


@router.post('/{config_id}/test', dependencies=[Depends(require_role(["admin", "hr"]))])
async def test_connector(config_id: str, request: Request, tenant_id: str = Depends(RequiredTenant)):
    db: Session = get_tenant_db_session(request)
    try:
        svc = get_connector_service(db, tenant_id)
        ok, msg = svc.test_connector(config_id)
        return {"success": ok, "message": msg}
    finally:
        db.close()


@router.post('/{config_id}/run', dependencies=[Depends(require_role(["admin", "hr"]))])
async def run_connector(config_id: str, payload: dict, request: Request, tenant_id: str = Depends(RequiredTenant)):
    db: Session = get_tenant_db_session(request)
    try:
        svc = get_connector_service(db, tenant_id)
        result = svc.run_connector(config_id, data_type=payload.get('data_type','employees'), filters=payload.get('filters') or {})
        return result
    finally:
        db.close()


@router.get('/{config_id}/runs', dependencies=[Depends(require_role(["admin", "hr"]))])
async def list_runs(config_id: str, request: Request, tenant_id: str = Depends(RequiredTenant)):
    db: Session = get_tenant_db_session(request)
    try:
        from ..models import ConnectorRun, ConnectorConfig
        cfg = db.query(ConnectorConfig).filter(ConnectorConfig.id == config_id, ConnectorConfig.tenant_id == tenant_id).first()
        if not cfg:
            raise HTTPException(status_code=404, detail="Connector not found")
        runs = db.query(ConnectorRun).filter(ConnectorRun.config_id == config_id).order_by(ConnectorRun.started_at.desc()).all()
        return [{
            'id': r.id,
            'status': r.status,
            'run_type': r.run_type,
            'started_at': r.started_at,
            'finished_at': r.finished_at,
            'records_processed': r.records_processed,
            'output_file_id': r.output_file_id,
            'error': r.error_message
        } for r in runs]
    finally:
        db.close()

