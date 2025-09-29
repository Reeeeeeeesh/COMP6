from typing import Dict, Any, Optional, Tuple
from .base import ConnectorBase


class ADPConnector(ConnectorBase):
    def test_connection(self) -> Tuple[bool, str]:
        required = ['endpoint', 'auth']
        missing = [k for k in required if k not in self.config]
        if missing:
            return False, f"Missing config fields: {', '.join(missing)}"
        return True, "Connection parameters valid"

    def run_delivery(self, file_bytes: bytes, filename: str) -> Tuple[bool, str]:
        # Mock delivery success
        return True, f"File '{filename}' delivered (mock)"


class SageConnector(ConnectorBase):
    def test_connection(self) -> Tuple[bool, str]:
        required = ['endpoint', 'auth']
        missing = [k for k in required if k not in self.config]
        if missing:
            return False, f"Missing config fields: {', '.join(missing)}"
        return True, "Connection parameters valid"

    def run_delivery(self, file_bytes: bytes, filename: str) -> Tuple[bool, str]:
        return True, f"File '{filename}' delivered (mock)"

