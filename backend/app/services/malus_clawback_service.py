"""
Malus/Clawback Service

Implements risk event workflows for malus (pre-vesting reductions) and
clawback (post-payment recoveries), impact calculation previews, and
statement restatements with amendment history.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from ..models import PayoutLeg
from ..dal.risk_event_dal import RiskEventDAL, PayoutLegAmendmentDAL


class MalusClawbackService:
    def __init__(self, db: Session, tenant_id: Optional[str] = None):
        self.db = db
        self.tenant_id = tenant_id
        self.event_dal = RiskEventDAL(db)
        self.amd_dal = PayoutLegAmendmentDAL(db)

    # --- Public API ---
    def apply_malus(self, employee_id: str, cycle: str, event_details: Dict[str, Any], approver_id: Optional[str]) -> Dict[str, Any]:
        """Create a malus risk event and amend unvested payout legs."""
        evt = self._create_event(employee_id, cycle, decision='malus', details=event_details)

        if approver_id:
            self._approve_event(evt.id, approver_id)

        # Apply to unvested legs only
        affected, amendments = self._amend_legs_for_event(evt, include_only_unvested=True)

        return {
            'event': evt.id,
            'affected_legs': affected,
            'amendments': [a.id for a in amendments]
        }

    def apply_clawback(self, employee_id: str, cycle: str, event_details: Dict[str, Any], approver_id: Optional[str]) -> Dict[str, Any]:
        """Create a clawback event and add recovery amendments to relevant legs."""
        evt = self._create_event(employee_id, cycle, decision='clawback', details=event_details)

        if approver_id:
            self._approve_event(evt.id, approver_id)

        # Create recovery amendments; allow on vested legs
        affected, amendments = self._amend_legs_for_event(evt, include_only_unvested=False)

        return {
            'event': evt.id,
            'affected_legs': affected,
            'amendments': [a.id for a in amendments]
        }

    def calculate_impact(self, employee_id: str, event_details: Dict[str, Any]) -> Dict[str, Any]:
        """Preview malus/clawback impact without persisting changes."""
        # Fetch relevant legs (simple approach: by employee_id via join path EmployeeCalculationResult -> EmployeeData)
        legs = self._get_employee_legs(employee_id)
        pct_mode = bool(event_details.get('is_percentage', False))
        val = float(event_details.get('amount_or_percentage', 0))
        include_only_unvested = event_details.get('decision') == 'malus'

        preview: List[Dict[str, Any]] = []
        for leg in legs:
            if include_only_unvested and leg.vest_date and leg.vest_date <= datetime.utcnow():
                continue
            current_amount = leg.get_current_amount()
            delta = (current_amount * val / 100.0) if pct_mode else min(val, current_amount)
            adjusted = max(0.0, current_amount - delta)
            preview.append({
                'leg_id': leg.id,
                'original': current_amount,
                'adjusted': adjusted,
                'delta': current_amount - adjusted
            })

        return {
            'employee_id': employee_id,
            'legs_considered': len(preview),
            'total_delta': sum(p['delta'] for p in preview),
            'legs': preview
        }

    def restate_employee_statement(self, employee_id: str, cycle: str) -> Dict[str, Any]:
        """Return data needed to regenerate statements with amendment deltas."""
        events = self.event_dal.get_by_employee_and_cycle(employee_id, cycle)
        legs = self._get_employee_legs(employee_id)

        amendments: List[Dict[str, Any]] = []
        for leg in legs:
            for amd in self.amd_dal.get_by_leg_id(leg.id):
                amendments.append({
                    'leg_id': leg.id,
                    'amendment_id': amd.id,
                    'type': amd.amendment_type,
                    'original_amount': amd.original_amount,
                    'adjusted_amount': amd.adjusted_amount,
                    'effective_date': amd.effective_date.isoformat() if amd.effective_date else None
                })

        return {
            'employee_id': employee_id,
            'cycle': cycle,
            'risk_events': [
                {
                    'id': e.id,
                    'type': e.event_type,
                    'decision': e.decision,
                    'amount_or_percentage': e.amount_or_percentage,
                    'is_percentage': e.is_percentage,
                    'status': e.status,
                    'occurred_at': e.occurred_at.isoformat() if e.occurred_at else None,
                } for e in events
            ],
            'amendments': amendments
        }

    # --- Helpers ---
    def _create_event(self, employee_id: str, cycle: str, decision: str, details: Dict[str, Any]):
        payload = {
            'employee_id': employee_id,
            'cycle': cycle,
            'event_type': details.get('event_type', 'manual_adjustment'),
            'occurred_at': details.get('occurred_at') or datetime.utcnow(),
            'decision': decision,
            'amount_or_percentage': float(details.get('amount_or_percentage', 0)),
            'is_percentage': bool(details.get('is_percentage', decision == 'malus')),
            'currency': details.get('currency'),
            'rationale': details.get('rationale'),
            'status': 'pending'
        }
        return self.event_dal.create_risk_event(payload)

    def _approve_event(self, event_id: str, approver_id: str):
        self.event_dal.approve_risk_event(event_id, approver_id)

    def _get_employee_legs(self, employee_id: str) -> List[PayoutLeg]:
        # Join path: PayoutLeg -> EmployeeCalculationResult -> EmployeeData.employee_id
        from ..models import EmployeeCalculationResult, EmployeeData
        q = (
            self.db.query(PayoutLeg)
            .join(EmployeeCalculationResult, EmployeeCalculationResult.id == PayoutLeg.employee_calculation_result_id)
            .join(EmployeeData, EmployeeData.id == EmployeeCalculationResult.employee_data_id)
            .filter(EmployeeData.employee_id == employee_id)
        )
        return q.all()

    def _amend_legs_for_event(self, evt, include_only_unvested: bool):
        legs = self._get_employee_legs(evt.employee_id)
        amendments = []
        affected_ids: List[str] = []
        pct_mode = bool(evt.is_percentage)
        val = float(evt.amount_or_percentage)

        for leg in legs:
            if include_only_unvested and leg.vest_date and leg.vest_date <= datetime.utcnow():
                continue
            current = leg.get_current_amount()
            delta = (current * val / 100.0) if pct_mode else min(val, current)
            adjusted = max(0.0, current - delta)

            amd = self.amd_dal.create_amendment({
                'original_leg_id': leg.id,
                'risk_event_id': evt.id,
                'amendment_type': 'malus_reduction' if evt.decision == 'malus' else 'clawback_recovery',
                'original_amount': current,
                'adjusted_amount': adjusted,
                'effective_date': datetime.utcnow(),
            })
            amendments.append(amd)
            affected_ids.append(leg.id)

        # Mark event as applied if amendments created
        if amendments:
            evt.status = 'applied'
            self.db.commit()

        return affected_ids, amendments


def get_malus_clawback_service(db: Session, tenant_id: Optional[str] = None) -> MalusClawbackService:
    return MalusClawbackService(db, tenant_id)

