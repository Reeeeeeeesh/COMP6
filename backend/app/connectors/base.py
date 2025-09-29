"""
Connector Base

Defines the abstract base class for external connectors and common utilities.
Connectors should emit CSV content that flows through FileProcessingService
for consistent lineage tracking and storage.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Tuple
import io


class ConnectorBase(ABC):
    def __init__(self, config: Dict[str, Any]):
        self.config = config or {}

    @abstractmethod
    def test_connection(self) -> Tuple[bool, str]:
        """Validate credentials and connectivity; return (ok, message)."""
        raise NotImplementedError

    @abstractmethod
    def run_extract(self, data_type: str, filters: Optional[Dict[str, Any]] = None) -> Tuple[bool, str, bytes]:
        """Run extraction and return (ok, message, csv_bytes)."""
        raise NotImplementedError

    @abstractmethod
    def get_schema(self, data_type: str) -> Dict[str, Any]:
        """Return schema description for data_type."""
        raise NotImplementedError

    def get_status(self) -> Dict[str, Any]:
        return {"healthy": True, "details": {}}

    # Utility to store CSV through FileProcessingService
    def store_csv_via_file_processor(self, db_session, tenant_id: str, csv_bytes: bytes, filename: str, metadata: Optional[Dict]=None) -> Tuple[bool, str, Optional[str]]:
        from ..services.file_processing_service import FileProcessingService
        fps = FileProcessingService(db_session)
        return fps.process_platform_upload(tenant_id=tenant_id, file_content=csv_bytes, filename=filename, metadata=metadata)

