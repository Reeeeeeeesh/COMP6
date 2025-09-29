"""
Connector Orchestration Service

Manages connector registration, testing, and execution. On extract, the
returned CSV is stored via FileProcessingService for lineage.
"""
from typing import Dict, Any, Optional, Tuple, List
from sqlalchemy.orm import Session
from datetime import datetime

from ..models import ConnectorConfig, ConnectorRun
from ..connectors import create_connector


class ConnectorService:
    def __init__(self, db: Session, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id

    def register_connector(self, connector_config: Dict[str, Any], created_by: Optional[str] = None) -> ConnectorConfig:
        cfg = ConnectorConfig(
            tenant_id=self.tenant_id,
            connector_type=connector_config['connector_type'],
            system_name=connector_config['system_name'],
            config_json=connector_config.get('config', {}),
            enabled=bool(connector_config.get('enabled', False)),
            created_by=created_by,
        )
        self.db.add(cfg)
        self.db.commit()
        self.db.refresh(cfg)
        return cfg

    def test_connector(self, config_id: str) -> Tuple[bool, str]:
        cfg = self.db.query(ConnectorConfig).filter(ConnectorConfig.id == config_id, ConnectorConfig.tenant_id == self.tenant_id).first()
        if not cfg:
            return False, "Connector config not found"
        conn = create_connector(cfg.connector_type, cfg.system_name, cfg.get_decrypted_config())
        return conn.test_connection()

    def run_connector(self, config_id: str, data_type: str, filters: Optional[Dict[str, Any]] = None, created_by: Optional[str] = None) -> Dict[str, Any]:
        cfg = self.db.query(ConnectorConfig).filter(ConnectorConfig.id == config_id, ConnectorConfig.tenant_id == self.tenant_id).first()
        if not cfg:
            raise ValueError("Connector config not found")
        conn = create_connector(cfg.connector_type, cfg.system_name, cfg.get_decrypted_config())

        run = ConnectorRun(
            config_id=cfg.id,
            run_type='extract',
            status='running',
            started_at=datetime.utcnow(),
            metadata_json={'data_type': data_type, 'filters': filters or {}}
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)

        ok, message, csv_bytes = conn.run_extract(data_type, filters or {})
        if not ok:
            run.status = 'failed'
            run.error_message = message
            self.db.commit()
            return {'success': False, 'run_id': run.id, 'error': message}

        # Store via file processor
        from ..services.file_processing_service import FileProcessingService
        fps = FileProcessingService(self.db)
        success, store_msg, upload_id = fps.process_platform_upload(tenant_id=self.tenant_id, file_content=csv_bytes, filename=f"{cfg.connector_type}_{cfg.system_name}_{data_type}.csv", metadata={'connector_run_id': run.id})

        run.records_processed = 0  # unknown in mock
        run.output_file_id = upload_id
        run.status = 'completed' if success else 'failed'
        run.finished_at = datetime.utcnow()
        if not success:
            run.error_message = store_msg
        self.db.commit()

        return {'success': success, 'run_id': run.id, 'upload_id': upload_id, 'message': store_msg}

    def get_connector_status(self, config_id: str) -> Dict[str, Any]:
        cfg = self.db.query(ConnectorConfig).filter(ConnectorConfig.id == config_id, ConnectorConfig.tenant_id == self.tenant_id).first()
        if not cfg:
            raise ValueError("Connector config not found")
        last = cfg.get_last_successful_run()
        return {
            'config_id': cfg.id,
            'enabled': cfg.enabled,
            'connector_type': cfg.connector_type,
            'system_name': cfg.system_name,
            'last_run': {
                'id': last.id,
                'finished_at': last.finished_at.isoformat() if last and last.finished_at else None
            } if last else None
        }


def get_connector_service(db: Session, tenant_id: str) -> ConnectorService:
    return ConnectorService(db, tenant_id)

