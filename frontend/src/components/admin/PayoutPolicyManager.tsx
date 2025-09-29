import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Select, MenuItem, Grid, Divider, Table, TableBody, TableCell, TableHead, TableRow, Alert } from '@mui/material';
import payoutService, { PayoutPolicy, PayoutTranche } from '../../services/payoutService';

const defaultTranche: PayoutTranche = { percentage: 100, instrument: 'cash', grant_offset_days: 0, vest_offset_days: 0, retention_offset_days: 0 };

const PayoutPolicyManager: React.FC = () => {
  const [cycle, setCycle] = useState<string>('2025');
  const [population, setPopulation] = useState<'MRT' | 'non-MRT'>('non-MRT');
  const [tranches, setTranches] = useState<PayoutTranche[]>([ { ...defaultTranche } ]);
  const [policies, setPolicies] = useState<PayoutPolicy[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadPolicies = async () => {
    try {
      const res = await payoutService.getPayoutPolicies(cycle, population);
      setPolicies(res);
    } catch (e: any) {
      setError(e.message || 'Failed to load policies');
    }
  };

  useEffect(() => {
    loadPolicies();
  }, [cycle, population]);

  const sumPct = tranches.reduce((acc, t) => acc + (t.percentage || 0), 0);

  const addTranche = () => setTranches(prev => [ ...prev, { ...defaultTranche, percentage: 0 } ]);
  const removeTranche = (idx: number) => setTranches(prev => prev.filter((_, i) => i !== idx));
  const updateTranche = (idx: number, field: keyof PayoutTranche, value: any) => {
    setTranches(prev => prev.map((t, i) => i === idx ? ({ ...t, [field]: value }) : t));
  };

  const createPolicy = async () => {
    setError(null);
    if (Math.abs(sumPct - 100) > 1e-6) {
      setError('Tranche percentages must sum to 100%');
      return;
    }
    try {
      await payoutService.createPayoutPolicy(cycle, population, { tranches });
      await loadPolicies();
    } catch (e: any) {
      setError(e.message || 'Failed to create policy');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Payout Policy Manager</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField label="Cycle" value={cycle} onChange={e => setCycle(e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} md={3}>
            <Select fullWidth value={population} onChange={(e) => setPopulation(e.target.value as any)}>
              <MenuItem value={'MRT'}>MRT</MenuItem>
              <MenuItem value={'non-MRT'}>non-MRT</MenuItem>
            </Select>
          </Grid>
        </Grid>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6">Tranches (sum: {sumPct}%)</Typography>
        {tranches.map((t, idx) => (
          <Grid container spacing={1} key={idx} alignItems="center" sx={{ mt: 1 }}>
            <Grid item xs={2}><TextField type="number" label="%" value={t.percentage} onChange={e => updateTranche(idx, 'percentage', Number(e.target.value))} fullWidth /></Grid>
            <Grid item xs={2}>
              <Select fullWidth value={t.instrument} onChange={e => updateTranche(idx, 'instrument', e.target.value)}>
                <MenuItem value={'cash'}>Cash</MenuItem>
                <MenuItem value={'fund_units'}>Fund Units</MenuItem>
                <MenuItem value={'phantom'}>Phantom</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={2}><TextField type="number" label="Grant +days" value={t.grant_offset_days || 0} onChange={e => updateTranche(idx, 'grant_offset_days', Number(e.target.value))} fullWidth /></Grid>
            <Grid item xs={2}><TextField type="number" label="Vest +days" value={t.vest_offset_days || 0} onChange={e => updateTranche(idx, 'vest_offset_days', Number(e.target.value))} fullWidth /></Grid>
            <Grid item xs={2}><TextField type="number" label="Retention +days" value={t.retention_offset_days || 0} onChange={e => updateTranche(idx, 'retention_offset_days', Number(e.target.value))} fullWidth /></Grid>
            <Grid item xs={2}><Button color="error" onClick={() => removeTranche(idx)}>Remove</Button></Grid>
          </Grid>
        ))}
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={addTranche}>Add Tranche</Button>
          <Button variant="contained" onClick={createPolicy} disabled={Math.abs(sumPct - 100) > 1e-6}>Create Policy</Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Existing Policies</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Cycle</TableCell>
              <TableCell>Population</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {policies.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.id}</TableCell>
                <TableCell>{p.cycle}</TableCell>
                <TableCell>{p.population}</TableCell>
                <TableCell>{p.version || 1}</TableCell>
                <TableCell>{p.status}</TableCell>
                <TableCell>{new Date(p.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default PayoutPolicyManager;

