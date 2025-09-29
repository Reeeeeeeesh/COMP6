from app.queue import celery_app
from app.services.connector_service import ConnectorService
from app.database import SessionLocal


@celery_app.task(name='app.tasks.connector_tasks.run_connector_extraction')
def run_connector_extraction(tenant_id: str, config_id: str, data_type: str, filters: dict | None = None):
    db = SessionLocal()
    try:
        svc = ConnectorService(db, tenant_id)
        return svc.run_connector(config_id, data_type, filters or {})
    finally:
        db.close()


@celery_app.task(name='app.tasks.connector_tasks.test_connector_connectivity')
def test_connector_connectivity(tenant_id: str, config_id: str):
    db = SessionLocal()
    try:
        svc = ConnectorService(db, tenant_id)
        ok, msg = svc.test_connector(config_id)
        return {"success": ok, "message": msg}
    finally:
        db.close()

