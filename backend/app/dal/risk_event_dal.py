"""
Risk Event DAL for malus/clawback operations.

Implements data access methods for RiskEvent and PayoutLegAmendment
following existing DAL patterns.
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from ..models import RiskEvent, PayoutLegAmendment, PayoutLeg


class RiskEventDAL:
    def __init__(self, db: Session):
        self.db = db

    def create_risk_event(self, data: Dict[str, Any]) -> RiskEvent:
        evt = RiskEvent(**data)
        self.db.add(evt)
        self.db.commit()
        self.db.refresh(evt)
        return evt

    def get_by_employee_and_cycle(self, employee_id: str, cycle: str) -> List[RiskEvent]:
        return (
            self.db.query(RiskEvent)
            .filter(RiskEvent.employee_id == employee_id, RiskEvent.cycle == cycle)
            .order_by(RiskEvent.created_at.asc())
            .all()
        )

    def get_pending_approvals(self) -> List[RiskEvent]:
        return (
            self.db.query(RiskEvent)
            .filter(RiskEvent.status == 'pending')
            .order_by(RiskEvent.created_at.asc())
            .all()
        )

    def approve_risk_event(self, event_id: str, approver_id: str) -> Optional[RiskEvent]:
        evt = self.get_by_id(event_id)
        if not evt:
            return None
        evt.status = 'approved'
        evt.approver_id = approver_id
        evt.approved_at = func.now()
        self.db.commit()
        self.db.refresh(evt)
        return evt

    def get_by_id(self, event_id: str) -> Optional[RiskEvent]:
        return self.db.query(RiskEvent).filter(RiskEvent.id == event_id).first()


class PayoutLegAmendmentDAL:
    def __init__(self, db: Session):
        self.db = db

    def create_amendment(self, data: Dict[str, Any]) -> PayoutLegAmendment:
        amd = PayoutLegAmendment(**data)
        self.db.add(amd)
        self.db.commit()
        self.db.refresh(amd)
        return amd

    def get_by_leg_id(self, leg_id: str) -> List[PayoutLegAmendment]:
        return (
            self.db.query(PayoutLegAmendment)
            .filter(PayoutLegAmendment.original_leg_id == leg_id)
            .order_by(PayoutLegAmendment.created_at.asc())
            .all()
        )

    def get_by_risk_event(self, event_id: str) -> List[PayoutLegAmendment]:
        return (
            self.db.query(PayoutLegAmendment)
            .filter(PayoutLegAmendment.risk_event_id == event_id)
            .order_by(PayoutLegAmendment.created_at.asc())
            .all()
        )

    def calculate_current_leg_amount(self, leg_id: str) -> float:
        leg = self.db.query(PayoutLeg).filter(PayoutLeg.id == leg_id).first()
        if not leg:
            return 0.0
        return leg.get_current_amount()

