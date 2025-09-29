"""
Payout Splitter Service

Converts final bonus amounts into vesting legs based on payout policy.
"""

from __future__ import annotations

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import math
import logging
from sqlalchemy.orm import Session

from ..models import EmployeeCalculationResult, PayoutPolicy, PayoutLeg, BatchCalculationResult
from ..dal.payout_dal import PayoutPolicyDAL, PayoutLegDAL
from ..rbac.decorators import audit_action, require_permission

logger = logging.getLogger(__name__)


class PayoutSplitterService:
    """Service to split employee bonuses into payout legs."""

    def __init__(self, db: Session):
        self.db = db
        self.policy_dal = PayoutPolicyDAL(db)
        self.leg_dal = PayoutLegDAL(db)

    def _round_legs(self, total: float, raw_amounts: List[float], ndigits: int = 2) -> List[float]:
        # Round each leg and adjust the last leg to match total exactly
        rounded = [round(a, ndigits) for a in raw_amounts]
        diff = round(total - sum(rounded), ndigits)
        if rounded:
            rounded[-1] = round(rounded[-1] + diff, ndigits)
        return rounded

    def _calc_dates(self, base_date: datetime, grant_off: int, vest_off: int, retention_off: int) -> Tuple[Optional[datetime], Optional[datetime], Optional[datetime]]:
        grant_date = base_date + timedelta(days=grant_off) if grant_off is not None else None
        vest_date = base_date + timedelta(days=vest_off) if vest_off is not None else None
        retention_end = base_date + timedelta(days=retention_off) if retention_off is not None else None
        return grant_date, vest_date, retention_end

    def _get_policy(self, policy_id: Optional[str] = None, cycle: Optional[str] = None, population: Optional[str] = None) -> PayoutPolicy:
        if policy_id:
            policy = self.db.query(PayoutPolicy).filter(PayoutPolicy.id == policy_id).first()
        else:
            policy = self.policy_dal.get_active_policy(cycle or '', population or 'non-MRT')
        if not policy:
            raise ValueError("Payout policy not found")
        if not policy.validate_tranches():
            raise ValueError("Invalid payout policy tranches")
        return policy

    @audit_action("payout_split_batch", resource_type="batch_result")
    @require_permission("create", group="plan_operations")
    def split_batch_payouts(self, user, batch_result_id: str, policy_id: Optional[str] = None) -> Dict[str, Any]:
        """Generate payout legs for all employees within a batch result."""
        # Load batch and policy
        batch = self.db.query(BatchCalculationResult).filter(BatchCalculationResult.id == batch_result_id).first()
        if not batch:
            raise ValueError("Batch result not found")

        params = batch.calculation_parameters or {}
        cycle = params.get('cycle')
        # Guess population if provided globally; default 'non-MRT'
        population = params.get('population', 'non-MRT')
        policy = self._get_policy(policy_id, cycle=cycle, population=population)

        # Process each employee result
        count = 0
        legs_created = 0
        for er in batch.employee_results:
            try:
                created = self._split_employee_with_policy(er, policy)
                count += 1
                legs_created += len(created)
            except Exception as e:
                logger.error(f"Failed to split payout for employee result {er.id}: {e}")
                continue

        return {"employees_processed": count, "legs_created": legs_created, "policy_id": policy.id}

    def split_employee_payout(self, employee_result_id: str, policy_id: Optional[str] = None) -> List[PayoutLeg]:
        er = self.db.query(EmployeeCalculationResult).filter(EmployeeCalculationResult.id == employee_result_id).first()
        if not er:
            raise ValueError("Employee calculation result not found")
        # Infer cycle from batch params
        params = er.batch_result.calculation_parameters or {}
        cycle = params.get('cycle')
        population = params.get('population', 'non-MRT')
        policy = self._get_policy(policy_id, cycle=cycle, population=population)
        return self._split_employee_with_policy(er, policy)

    def _split_employee_with_policy(self, er: EmployeeCalculationResult, policy: PayoutPolicy) -> List[PayoutLeg]:
        if er.payout_generated:
            raise ValueError("Payout already generated for this employee")

        final_bonus = float(er.bonus_amount or 0.0)
        if final_bonus <= 0:
            return []

        tranches: List[Dict[str, Any]] = (policy.rules_json or {}).get('tranches', [])
        raw_amounts = [final_bonus * (float(t.get('percentage', 0.0)) / 100.0) for t in tranches]
        amounts = self._round_legs(final_bonus, raw_amounts)

        base_date = datetime.utcnow()
        new_legs: List[Dict[str, Any]] = []
        for idx, t in enumerate(tranches):
            grant_off = int(t.get('grant_offset_days', 0) or 0)
            vest_off = int(t.get('vest_offset_days', 0) or 0)
            retention_off = int(t.get('retention_offset_days', 0) or 0)
            grant_date, vest_date, retention_end = self._calc_dates(base_date, grant_off, vest_off, retention_off)
            new_legs.append({
                'employee_calculation_result_id': er.id,
                'leg_number': idx + 1,
                'amount': amounts[idx],
                'instrument': t.get('instrument'),
                'grant_date': grant_date,
                'vest_date': vest_date,
                'retention_end_date': retention_end,
                'currency': t.get('currency'),
                'policy_version': policy.version,
                'status': 'pending',
            })

        created = self.leg_dal.bulk_create(new_legs)
        er.payout_generated = True
        self.db.commit()
        return created

