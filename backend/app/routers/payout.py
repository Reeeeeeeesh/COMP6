"""
Payout Management Router

Endpoints for payout policies and payout leg generation.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import ApiResponse, PayoutPolicyCreate, PayoutPolicyResponse, PayoutLegResponse
from ..models import PayoutPolicy, EmployeeCalculationResult
from ..dal.payout_dal import PayoutPolicyDAL, PayoutLegDAL
from ..services.payout_splitter_service import PayoutSplitterService
from ..rbac.permissions import require_role

router = APIRouter(prefix="/api/v1", tags=["payouts"])


@router.post("/payout-policies", response_model=ApiResponse, dependencies=[Depends(require_role(["admin", "hr"]))])
async def create_payout_policy(payload: PayoutPolicyCreate, db: Session = Depends(get_db)):
    try:
        dal = PayoutPolicyDAL(db)
        policy = dal.create({
            'cycle': payload.cycle,
            'population': payload.population,
            'rules_json': payload.rules,
            'version': payload.version or 1,
            'status': 'pending_approval'
        })
        return ApiResponse(success=True, message="Policy created", data=PayoutPolicyResponse.model_validate({
            **policy.__dict__,
            'rules': policy.rules_json
        }))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/payout-policies/{cycle}", response_model=ApiResponse)
async def get_payout_policies(cycle: str, population: Optional[str] = Query(None), db: Session = Depends(get_db)):
    dal = PayoutPolicyDAL(db)
    if population:
        policies = dal.get_by_cycle_and_population(cycle, population)
    else:
        policies = db.query(PayoutPolicy).filter(PayoutPolicy.cycle == cycle).all()
    data = [{
        'id': p.id,
        'cycle': p.cycle,
        'population': p.population,
        'rules': p.rules_json,
        'version': p.version,
        'status': p.status,
        'approved_by': p.approved_by,
        'approved_at': p.approved_at,
        'created_at': p.created_at
    } for p in policies]
    return ApiResponse(success=True, data=data)


@router.post("/batch-results/{result_id}/split-payouts", response_model=ApiResponse, dependencies=[Depends(require_role(["admin", "hr"]))])
async def split_batch_payouts(result_id: str, policy_id: Optional[str] = None, db: Session = Depends(get_db)):
    service = PayoutSplitterService(db)
    stats = service.split_batch_payouts(user=None, batch_result_id=result_id, policy_id=policy_id)
    return ApiResponse(success=True, message="Payouts split", data=stats)


@router.get("/batch-results/{result_id}/payout-legs", response_model=ApiResponse)
async def get_batch_payout_legs(result_id: str, db: Session = Depends(get_db)):
    dal = PayoutLegDAL(db)
    legs = dal.get_by_batch_result(result_id)
    data = [{
        'id': l.id,
        'employee_calculation_result_id': l.employee_calculation_result_id,
        'leg_number': l.leg_number,
        'amount': l.amount,
        'instrument': l.instrument,
        'grant_date': l.grant_date,
        'vest_date': l.vest_date,
        'retention_end_date': l.retention_end_date,
        'currency': l.currency,
        'policy_version': l.policy_version,
        'status': l.status,
        'created_at': l.created_at
    } for l in legs]
    return ApiResponse(success=True, data=data)


@router.get("/employees/{employee_id}/payout-legs", response_model=ApiResponse)
async def get_employee_payout_legs(employee_id: str, db: Session = Depends(get_db)):
    # Translate employee_id -> EmployeeCalculationResult(s)
    from ..models import EmployeeData
    ers = db.query(EmployeeCalculationResult).join(EmployeeData, EmployeeData.id == EmployeeCalculationResult.employee_data_id).filter(
        EmployeeData.employee_id == employee_id
    ).all()
    dal = PayoutLegDAL(db)
    results: List[Dict[str, Any]] = []
    for er in ers:
        for l in dal.get_by_employee_result(er.id):
            results.append({
                'id': l.id,
                'employee_calculation_result_id': l.employee_calculation_result_id,
                'leg_number': l.leg_number,
                'amount': l.amount,
                'instrument': l.instrument,
                'grant_date': l.grant_date,
                'vest_date': l.vest_date,
                'retention_end_date': l.retention_end_date,
                'currency': l.currency,
                'policy_version': l.policy_version,
                'status': l.status,
                'created_at': l.created_at
            })
    return ApiResponse(success=True, data=results)
