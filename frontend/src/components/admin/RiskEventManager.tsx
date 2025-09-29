import React, { useEffect, useState } from 'react';
import { createRiskEvent, getRiskEvents, applyMalus, applyClawback, restateStatement } from '../../services/malusClawbackService';

type RiskEvent = any;

const RiskEventManager: React.FC = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [cycle, setCycle] = useState('2024');
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!employeeId || !cycle) return;
    setLoading(true);
    const res = await getRiskEvents(employeeId, cycle);
    if (res.success) setEvents(res.data as any);
    setLoading(false);
  };

  useEffect(() => { /* noop */ }, []);

  return (
    <div>
      <h2>Risk Event Manager</h2>
      <div style={{display:'flex', gap:8}}>
        <input placeholder="Employee ID" value={employeeId} onChange={e => setEmployeeId(e.target.value)} />
        <input placeholder="Cycle" value={cycle} onChange={e => setCycle(e.target.value)} />
        <button onClick={refresh}>Load</button>
      </div>
      {loading ? <p>Loading…</p> : (
        <pre style={{background:'#fafafa', padding:12}}>{JSON.stringify(events, null, 2)}</pre>
      )}
    </div>
  );
};

export default RiskEventManager;

