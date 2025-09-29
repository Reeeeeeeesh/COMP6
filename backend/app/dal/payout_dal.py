"""
Payout Data Access Layer

Implements DAL for payout policies and payout legs following existing patterns.
"""

from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import logging

from ..models import PayoutPolicy, PayoutLeg, EmployeeCalculationResult, BatchCalculationResult

logger = logging.getLogger(__name__)


class PayoutPolicyDAL:
    def __init__(self, db: Session):
        self.db = db

    def get_by_cycle_and_population(self, cycle: str, population: str) -> List[PayoutPolicy]:
        return (
            self.db.query(PayoutPolicy)
            .filter(PayoutPolicy.cycle == cycle, PayoutPolicy.population == population)
            .order_by(PayoutPolicy.version.desc(), PayoutPolicy.created_at.desc())
            .all()
        )

    def get_active_policy(self, cycle: str, population: str) -> Optional[PayoutPolicy]:
        return (
            self.db.query(PayoutPolicy)
            .filter(
                PayoutPolicy.cycle == cycle,
                PayoutPolicy.population == population,
                PayoutPolicy.status == 'active',
            )
            .order_by(PayoutPolicy.version.desc())
            .first()
        )

    def create(self, obj_in: Dict[str, Any]) -> PayoutPolicy:
        policy = PayoutPolicy(**obj_in)
        self.db.add(policy)
        self.db.commit()
        self.db.refresh(policy)
        return policy

    def update(self, policy: PayoutPolicy, obj_in: Dict[str, Any]) -> PayoutPolicy:
        for k, v in obj_in.items():
            if hasattr(policy, k):
                setattr(policy, k, v)
        self.db.commit()
        self.db.refresh(policy)
        return policy

    def get_pending_approvals(self) -> List[PayoutPolicy]:
        return (
            self.db.query(PayoutPolicy)
            .filter(PayoutPolicy.status == 'pending_approval')
            .order_by(PayoutPolicy.created_at.asc())
            .all()
        )


class PayoutLegDAL:
    def __init__(self, db: Session):
        self.db = db

    def get_by_employee_result(self, employee_result_id: str) -> List[PayoutLeg]:
        return (
            self.db.query(PayoutLeg)
            .filter(PayoutLeg.employee_calculation_result_id == employee_result_id)
            .order_by(PayoutLeg.leg_number.asc())
            .all()
        )

    def get_by_batch_result(self, batch_result_id: str) -> List[PayoutLeg]:
        return (
            self.db.query(PayoutLeg)
            .join(EmployeeCalculationResult, EmployeeCalculationResult.id == PayoutLeg.employee_calculation_result_id)
            .filter(EmployeeCalculationResult.batch_result_id == batch_result_id)
            .order_by(PayoutLeg.created_at.asc())
            .all()
        )

    def bulk_create(self, legs: List[Dict[str, Any]]) -> List[PayoutLeg]:
        records = [PayoutLeg(**leg) for leg in legs]
        self.db.add_all(records)
        self.db.commit()
        # Refresh individually to get IDs
        for r in records:
            self.db.refresh(r)
        return records

    def create_legs_for_employee(self, employee_result_id: str, legs: List[Dict[str, Any]]) -> List[PayoutLeg]:
        for i, leg in enumerate(legs, start=1):
            leg.setdefault('employee_calculation_result_id', employee_result_id)
            leg.setdefault('leg_number', i)
        return self.bulk_create(legs)

    def get_cash_legs_for_payroll(self, batch_result_id: str, pay_date: datetime) -> List[PayoutLeg]:
        return (
            self.db.query(PayoutLeg)
            .join(EmployeeCalculationResult, EmployeeCalculationResult.id == PayoutLeg.employee_calculation_result_id)
            .filter(
                EmployeeCalculationResult.batch_result_id == batch_result_id,
                PayoutLeg.instrument == 'cash',
                or_(PayoutLeg.grant_date.is_(None), PayoutLeg.grant_date <= pay_date),
                PayoutLeg.status.in_(['pending', 'granted'])
            )
            .all()
        )

    def aggregate_legs(self, employee_result_id: str) -> Dict[str, Any]:
        legs = self.get_by_employee_result(employee_result_id)
        total = sum(l.amount for l in legs)
        cash = sum(l.amount for l in legs if l.instrument == 'cash')
        deferred = total - cash
        earliest_vest = min([l.vest_date for l in legs if l.vest_date], default=None)
        latest_vest = max([l.vest_date for l in legs if l.vest_date], default=None)
        return {
            'total_amount': total,
            'cash_amount': cash,
            'deferred_amount': deferred,
            'earliest_vest': earliest_vest,
            'latest_vest': latest_vest,
            'legs': legs,
        }

