import React, { useEffect, useState } from 'react';
import { getConnectors, createConnectorConfig, testConnector, runConnector } from '../../services/connectorService';

const ConnectorManager: React.FC = () => {
  const [connectors, setConnectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const res = await getConnectors();
    if (res.success) setConnectors(res.data as any[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div>
      <h2>Connector Manager</h2>
      {loading ? <p>Loading…</p> : <pre style={{background:'#fafafa', padding:12}}>{JSON.stringify(connectors, null, 2)}</pre>}
    </div>
  );
};

export default ConnectorManager;

