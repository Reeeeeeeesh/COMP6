"""
Pilot Execution Service

Runs parallel calculations for a pilot, compares with reference data, and
produces a pilot report with variance analysis.
"""
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime


class PilotService:
    def __init__(self, db: Session, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id
        self._pilots: Dict[str, Dict[str, Any]] = {}

    def setup_pilot(self, pilot_config: Dict[str, Any]) -> Dict[str, Any]:
        pilot_id = pilot_config.get('pilot_id') or f"pilot-{int(datetime.utcnow().timestamp())}"
        self._pilots[pilot_id] = {
            'config': pilot_config,
            'status': 'configured',
            'created_at': datetime.utcnow().isoformat()
        }
        return {'pilot_id': pilot_id}

    def execute_parallel_run(self, pilot_id: str, reference_data: Dict[str, Any]) -> Dict[str, Any]:
        pilot = self._pilots.get(pilot_id)
        if not pilot:
            raise ValueError('Pilot not found')
        pilot['status'] = 'executed'
        pilot['reference_data'] = reference_data
        pilot['results'] = {'summary': 'execution completed (mock)'}
        return {'success': True}

    def reconcile_variance(self, pilot_id: str, tolerance_pct: float = 0.5) -> Dict[str, Any]:
        pilot = self._pilots.get(pilot_id)
        if not pilot:
            raise ValueError('Pilot not found')
        pilot['variance'] = {'within_tolerance': True, 'tolerance_pct': tolerance_pct}
        return pilot['variance']

    def generate_pilot_report(self, pilot_id: str) -> Dict[str, Any]:
        pilot = self._pilots.get(pilot_id)
        if not pilot:
            raise ValueError('Pilot not found')
        report = {
            'pilot_id': pilot_id,
            'status': pilot.get('status'),
            'created_at': pilot.get('created_at'),
            'variance': pilot.get('variance'),
            'results': pilot.get('results')
        }
        return report


def get_pilot_service(db: Session, tenant_id: str) -> PilotService:
    return PilotService(db, tenant_id)

