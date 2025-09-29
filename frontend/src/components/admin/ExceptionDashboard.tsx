import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Chip, Table, TableHead, TableRow, TableCell, TableBody, Button } from '@mui/material';
import exceptionService, { ExceptionEvent } from '../../services/exceptionService';

const ExceptionDashboard: React.FC = () => {
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [events, setEvents] = useState<ExceptionEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const load = async () => {
    setLoading(true);
    const s = await exceptionService.getExceptionSummary();
    const e = await exceptionService.getExceptions();
    setSummary(s);
    setEvents(e);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const bulkResolve = async () => {
    const ids = events.map(e => e.id);
    await exceptionService.bulkResolveExceptions(ids, 'Bulk resolved');
    await load();
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Exception Dashboard</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Summary</Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          {Object.entries(summary).map(([sev, count]) => (
            <Chip key={sev} label={`${sev}: ${count as number}`} />
          ))}
        </Box>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Exceptions</Typography>
          <Button variant="outlined" onClick={bulkResolve}>Bulk Resolve</Button>
        </Box>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map(e => (
              <TableRow key={e.id}>
                <TableCell>{e.id}</TableCell>
                <TableCell>{e.source}</TableCell>
                <TableCell>{e.exception_code}</TableCell>
                <TableCell>{e.severity}</TableCell>
                <TableCell>{e.status}</TableCell>
                <TableCell>{new Date(e.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default ExceptionDashboard;

