"""
Payroll Export Router

Endpoints for previewing and exporting payroll CSVs.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import ApiResponse, PayrollExportRequest, PayrollExportResponse
from ..services.payroll_export_service import PayrollExportService
from ..dal.payout_dal import PayoutLegDAL
from ..rbac.permissions import require_role

router = APIRouter(prefix="/api/v1/payroll", tags=["payroll"])


@router.post("/export/{batch_result_id}", response_model=ApiResponse, dependencies=[Depends(require_role(["admin", "payroll"]))])
async def export_payroll(batch_result_id: str, pay_date: datetime, tenant_id: Optional[str] = None, db: Session = Depends(get_db)):
    service = PayrollExportService(db)
    result = service.export_cash_payouts(tenant_id or 'default', batch_result_id, pay_date)
    return ApiResponse(success=True, data=result)


@router.get("/preview/{batch_result_id}", response_model=ApiResponse)
async def preview_payroll(batch_result_id: str, pay_date: datetime, db: Session = Depends(get_db)):
    leg_dal = PayoutLegDAL(db)
    legs = leg_dal.get_cash_legs_for_payroll(batch_result_id, pay_date)
    total = sum(l.amount for l in legs)
    return ApiResponse(success=True, data={
        'count': len(legs),
        'total_cash': total,
        'pay_date': pay_date
    })


@router.get("/exports", response_model=ApiResponse)
async def list_exports(tenant_id: Optional[str] = None):
    # Basic listing from local storage; production should persist metadata in DB
    from ..storage.file_store import LocalFileStore
    fs = LocalFileStore('storage')
    base = fs.base_path / (tenant_id or 'default')
    exports = []
    if base.exists():
        for f in base.iterdir():
            if f.is_file() and f.name.startswith('payroll_export_') and not f.name.endswith('.meta'):
                info = fs.get_file_info(str((f.relative_to(fs.base_path)))) or {}
                exports.append({
                    'filename': f.name,
                    'download_url': f"/api/v1/files/{str(f.relative_to(fs.base_path))}",
                    'size_bytes': f.stat().st_size,
                    **info
                })
    return ApiResponse(success=True, data=exports)

