"""
Payroll Export Service

Generates CSV exports for cash payout legs eligible by pay date.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import csv
import io
import hashlib
import logging
from sqlalchemy.orm import Session

from ..dal.payout_dal import PayoutLegDAL
from ..models import BatchCalculationResult
from ..storage.file_store import LocalFileStore

logger = logging.getLogger(__name__)


class PayrollExportService:
    def __init__(self, db: Session, storage_base_path: str = "storage"):
        self.db = db
        self.leg_dal = PayoutLegDAL(db)
        self.file_store = LocalFileStore(storage_base_path)

    def export_cash_payouts(self, tenant_id: str, batch_result_id: str, pay_date: datetime, fmt: str = 'csv') -> Dict[str, Any]:
        # Validate batch completion
        batch = self.db.query(BatchCalculationResult).filter(BatchCalculationResult.id == batch_result_id).first()
        if not batch:
            raise ValueError("Batch result not found")

        # Get eligible cash legs
        legs = self.leg_dal.get_cash_legs_for_payroll(batch_result_id, pay_date)

        # Generate CSV content
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['employee_id', 'cycle', 'cash_amount', 'pay_date', 'currency', 'cost_center', 'notes'])

        cycle = (batch.calculation_parameters or {}).get('cycle')
        for leg in legs:
            emp = leg.employee_result.employee_data
            employee_id = emp.employee_id if emp else ''
            currency = leg.currency or 'USD'
            writer.writerow([
                employee_id,
                cycle or '',
                f"{leg.amount:.2f}",
                pay_date.date().isoformat(),
                currency,
                emp.department if emp and emp.department else '',
                ''
            ])

        csv_bytes = output.getvalue().encode('utf-8')
        checksum = hashlib.sha256(csv_bytes).hexdigest()

        filename = f"payroll_export_{batch_result_id}_{pay_date.strftime('%Y%m%d')}.csv"
        meta = {
            'batch_result_id': batch_result_id,
            'pay_date': pay_date.isoformat(),
            'checksum_sha256': checksum,
            'exported_count': len(legs),
        }

        stored = self.file_store.save_file(tenant_id, csv_bytes, filename, metadata=meta)
        download_url = f"/api/v1/files/{stored.storage_path}"  # Assuming existing file serving route

        # Optionally update legs status to 'exported'
        for leg in legs:
            leg.status = 'exported'
        self.db.commit()

        return {
            'success': True,
            'filename': filename,
            'download_url': download_url,
            'checksum_sha256': checksum,
            'exported_count': len(legs)
        }

