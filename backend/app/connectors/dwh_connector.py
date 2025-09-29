from typing import Dict, Any, Optional, Tuple
from .base import ConnectorBase
import csv
import io


class SnowflakeConnector(ConnectorBase):
    def test_connection(self) -> Tuple[bool, str]:
        required = ['account', 'user', 'password']
        missing = [k for k in required if k not in self.config]
        if missing:
            return False, f"Missing config fields: {', '.join(missing)}"
        return True, "Connection parameters valid"

    def run_extract(self, data_type: str, filters: Optional[Dict[str, Any]] = None) -> Tuple[bool, str, bytes]:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['employee_id','kpi_ir','kpi_sharpe'])
        csv_bytes = output.getvalue().encode('utf-8')
        return True, "Metrics extract completed (mock)", csv_bytes

    def get_schema(self, data_type: str) -> Dict[str, Any]:
        return {'columns': ['employee_id','kpi_ir','kpi_sharpe'], 'primary_key': 'employee_id'}


class BigQueryConnector(ConnectorBase):
    def test_connection(self) -> Tuple[bool, str]:
        required = ['project', 'credentials']
        missing = [k for k in required if k not in self.config]
        if missing:
            return False, f"Missing config fields: {', '.join(missing)}"
        return True, "Connection parameters valid"

    def run_extract(self, data_type: str, filters: Optional[Dict[str, Any]] = None) -> Tuple[bool, str, bytes]:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['employee_id','kpi_ir','kpi_sharpe'])
        csv_bytes = output.getvalue().encode('utf-8')
        return True, "Metrics extract completed (mock)", csv_bytes

    def get_schema(self, data_type: str) -> Dict[str, Any]:
        return {'columns': ['employee_id','kpi_ir','kpi_sharpe'], 'primary_key': 'employee_id'}

