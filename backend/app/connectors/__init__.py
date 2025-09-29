from .base import ConnectorBase
from .hris_connector import WorkdayConnector, SAPSFConnector
from .payroll_connector import ADPConnector, SageConnector
from .dwh_connector import SnowflakeConnector, BigQueryConnector

CONNECTOR_REGISTRY = {
    ('hris', 'workday'): WorkdayConnector,
    ('hris', 'sap_successfactors'): SAPSFConnector,
    ('payroll', 'adp'): ADPConnector,
    ('payroll', 'sage'): SageConnector,
    ('dwh', 'snowflake'): SnowflakeConnector,
    ('dwh', 'bigquery'): BigQueryConnector,
}

def create_connector(connector_type: str, system_name: str, config: dict):
    key = (connector_type.lower(), system_name.lower())
    cls = CONNECTOR_REGISTRY.get(key)
    if not cls:
        raise ValueError(f"Unsupported connector: {connector_type}/{system_name}")
    return cls(config)

