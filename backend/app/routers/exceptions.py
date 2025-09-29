"""
Exception Management Router

Endpoints for listing, summarizing, and resolving exceptions.
"""

from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import ApiResponse
from ..dal.exception_dal import ExceptionEventDAL
from ..models import ExceptionEvent
from ..rbac.permissions import require_role

router = APIRouter(prefix="/api/v1", tags=["exceptions"])


@router.get("/exceptions", response_model=ApiResponse)
async def list_exceptions(
    source: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db)
):
    dal = ExceptionEventDAL(db)
    if status is None or status == 'open':
        exceptions = dal.get_open_exceptions(source=source, severity=severity, date_from=date_from, date_to=date_to)
    else:
        q = db.query(ExceptionEvent)
        if status:
            q = q.filter(ExceptionEvent.status == status)
        if source:
            q = q.filter(ExceptionEvent.source == source)
        if severity:
            q = q.filter(ExceptionEvent.severity == severity)
        if date_from:
            q = q.filter(ExceptionEvent.created_at >= date_from)
        if date_to:
            q = q.filter(ExceptionEvent.created_at <= date_to)
        exceptions = q.order_by(ExceptionEvent.created_at.desc()).all()
    data = [{
        'id': e.id,
        'source': e.source,
        'reference_id': e.reference_id,
        'exception_code': e.exception_code,
        'severity': e.severity,
        'status': e.status,
        'context': e.context_json,
        'created_at': e.created_at,
        'resolved_by': e.resolved_by,
        'resolved_at': e.resolved_at
    } for e in exceptions]
    return ApiResponse(success=True, data=data)


@router.get("/batch-results/{result_id}/exceptions", response_model=ApiResponse)
async def batch_exceptions(result_id: str, db: Session = Depends(get_db)):
    dal = ExceptionEventDAL(db)
    events = dal.get_by_batch_result(result_id)
    data = [{
        'id': e.id,
        'source': e.source,
        'reference_id': e.reference_id,
        'exception_code': e.exception_code,
        'severity': e.severity,
        'status': e.status,
        'context': e.context_json,
        'created_at': e.created_at
    } for e in events]
    return ApiResponse(success=True, data=data)


@router.post("/exceptions/{exception_id}/resolve", response_model=ApiResponse, dependencies=[Depends(require_role(["admin", "compliance"]))])
async def resolve_exception(exception_id: str, notes: Optional[str] = None, resolver_id: Optional[str] = None, db: Session = Depends(get_db)):
    dal = ExceptionEventDAL(db)
    evt = dal.resolve_exception(exception_id, resolver_id or 'system', notes)
    if not evt:
        raise HTTPException(status_code=404, detail="Exception not found")
    return ApiResponse(success=True, message="Resolved", data={'id': evt.id})


@router.get("/exceptions/summary", response_model=ApiResponse)
async def exceptions_summary(db: Session = Depends(get_db)):
    dal = ExceptionEventDAL(db)
    counts = dal.get_summary_counts()
    return ApiResponse(success=True, data=counts)
