"""
Exception Register Data Access Layer

Provides CRUD and query helpers for structured exception tracking.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import logging

from ..models import ExceptionEvent, EmployeeCalculationResult

logger = logging.getLogger(__name__)


class ExceptionEventDAL:
    def __init__(self, db: Session):
        self.db = db

    def create_exception(self, source: str, reference_id: Optional[str], code: str,
                         severity: str = 'warning', context: Optional[Dict[str, Any]] = None) -> ExceptionEvent:
        evt = ExceptionEvent(
            source=source,
            reference_id=reference_id,
            exception_code=code,
            severity=severity,
            status='open',
            context_json=context or {},
        )
        self.db.add(evt)
        self.db.commit()
        self.db.refresh(evt)
        return evt

    def bulk_create_exceptions(self, events: List[Dict[str, Any]]) -> List[ExceptionEvent]:
        records = [ExceptionEvent(**{
            'source': e.get('source'),
            'reference_id': e.get('reference_id'),
            'exception_code': e.get('exception_code'),
            'severity': e.get('severity', 'warning'),
            'status': e.get('status', 'open'),
            'context_json': e.get('context', {}),
        }) for e in events]
        self.db.add_all(records)
        self.db.commit()
        for r in records:
            self.db.refresh(r)
        return records

    def get_by_source_and_reference(self, source: str, reference_id: str) -> List[ExceptionEvent]:
        return (
            self.db.query(ExceptionEvent)
            .filter(ExceptionEvent.source == source, ExceptionEvent.reference_id == reference_id)
            .order_by(ExceptionEvent.created_at.asc())
            .all()
        )

    def get_open_exceptions(self, source: Optional[str] = None, severity: Optional[str] = None,
                             date_from: Optional[datetime] = None, date_to: Optional[datetime] = None) -> List[ExceptionEvent]:
        q = self.db.query(ExceptionEvent).filter(ExceptionEvent.status == 'open')
        if source:
            q = q.filter(ExceptionEvent.source == source)
        if severity:
            q = q.filter(ExceptionEvent.severity == severity)
        if date_from:
            q = q.filter(ExceptionEvent.created_at >= date_from)
        if date_to:
            q = q.filter(ExceptionEvent.created_at <= date_to)
        return q.order_by(ExceptionEvent.created_at.desc()).all()

    def get_by_batch_result(self, batch_result_id: str) -> List[ExceptionEvent]:
        return (
            self.db.query(ExceptionEvent)
            .filter(ExceptionEvent.reference_id == batch_result_id)
            .order_by(ExceptionEvent.created_at.desc())
            .all()
        )

    def resolve_exception(self, exception_id: str, resolver_id: str, notes: Optional[str] = None) -> Optional[ExceptionEvent]:
        evt = self.db.query(ExceptionEvent).filter(ExceptionEvent.id == exception_id).first()
        if not evt:
            return None
        evt.status = 'resolved'
        evt.resolved_by = resolver_id
        evt.resolved_at = datetime.utcnow()
        evt.resolution_notes = notes
        self.db.commit()
        self.db.refresh(evt)
        return evt

    def get_summary_counts(self) -> Dict[str, int]:
        # Simple aggregation: counts by severity
        rows = (
            self.db.query(ExceptionEvent.severity, func.count(ExceptionEvent.id))
            .group_by(ExceptionEvent.severity)
            .all()
        )
        return {sev: cnt for sev, cnt in rows}

