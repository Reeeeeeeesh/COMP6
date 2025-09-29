"""
Exception Register Service

Provides structured exception tracking, detection, and resolution workflows.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
from sqlalchemy.orm import Session

from ..models import BatchCalculationResult, EmployeeCalculationResult
from ..dal.exception_dal import ExceptionEventDAL

logger = logging.getLogger(__name__)


class ExceptionRegisterService:
    def __init__(self, db: Session):
        self.db = db
        self.dal = ExceptionEventDAL(db)

    def register_exception(self, source: str, reference_id: Optional[str], code: str, severity: str, context: Optional[Dict[str, Any]] = None):
        return self.dal.create_exception(source, reference_id, code, severity, context or {})

    def get_batch_exceptions(self, batch_result_id: str):
        return self.dal.get_by_batch_result(batch_result_id)

    def resolve_exception(self, exception_id: str, resolver_id: str, notes: Optional[str] = None):
        return self.dal.resolve_exception(exception_id, resolver_id, notes)

    # Detection helpers
    def detect_cap_hits(self, batch_result_id: str) -> List[str]:
        """Detect employees whose results indicate caps were applied."""
        hits: List[str] = []
        employees = self.db.query(EmployeeCalculationResult).filter(EmployeeCalculationResult.batch_result_id == batch_result_id).all()
        for er in employees:
            breakdown = er.calculation_breakdown or {}
            cap_applied = False
            if isinstance(breakdown, dict):
                cap_applied = bool(breakdown.get('cap_applied')) or bool(breakdown.get('mrt_cap_applied'))
            if cap_applied:
                self.register_exception(
                    source='batch_calculation',
                    reference_id=batch_result_id,
                    code='CAP_HIT',
                    severity='warning',
                    context={'employee_result_id': er.id}
                )
                hits.append(er.id)
        return hits

    def detect_unapproved_raf(self, cycle: Optional[str]) -> bool:
        """Stub detection for unapproved RAF. Integrate team RAF service if needed."""
        # In a full implementation, query RAF snapshots and configs.
        # Here we just register an info-level warning if cycle is missing.
        if not cycle:
            self.register_exception(
                source='team_raf',
                reference_id=None,
                code='RAF_MISSING_CYCLE',
                severity='warning',
                context={'message': 'No cycle provided for RAF validation'}
            )
            return True
        return False

    def detect_missing_metrics(self, batch_result_id: str) -> int:
        """Detect employees with missing calculation breakdown metrics."""
        count = 0
        employees = self.db.query(EmployeeCalculationResult).filter(EmployeeCalculationResult.batch_result_id == batch_result_id).all()
        for er in employees:
            if not er.calculation_breakdown:
                self.register_exception(
                    source='validation',
                    reference_id=batch_result_id,
                    code='MISSING_BREAKDOWN',
                    severity='warning',
                    context={'employee_result_id': er.id}
                )
                count += 1
        return count

    def detect_negative_bonuses(self, batch_result_id: str) -> int:
        """Detect negative bonus amounts which should be rare and reviewed."""
        count = 0
        employees = self.db.query(EmployeeCalculationResult).filter(EmployeeCalculationResult.batch_result_id == batch_result_id).all()
        for er in employees:
            if (er.bonus_amount or 0) < 0:
                self.register_exception(
                    source='batch_calculation',
                    reference_id=batch_result_id,
                    code='NEGATIVE_BONUS',
                    severity='error',
                    context={'employee_result_id': er.id, 'bonus_amount': er.bonus_amount}
                )
                count += 1
        return count

    def bulk_process_batch(self, batch_result_id: str, cycle: Optional[str]) -> Dict[str, Any]:
        caps = self.detect_cap_hits(batch_result_id)
        neg = self.detect_negative_bonuses(batch_result_id)
        missing = self.detect_missing_metrics(batch_result_id)
        raf_flag = self.detect_unapproved_raf(cycle)
        return {
            'cap_hits': len(caps),
            'negative_bonuses': neg,
            'missing_breakdowns': missing,
            'raf_issues': int(raf_flag),
        }

