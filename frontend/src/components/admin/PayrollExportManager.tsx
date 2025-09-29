import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, Alert } from '@mui/material';
import payrollService from '../../services/payrollService';
import payoutService from '../../services/payoutService';

const PayrollExportManager: React.FC = () => {
  const [batchResultId, setBatchResultId] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [preview, setPreview] = useState<{ count: number; total_cash: number; pay_date: string } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    const items = await payrollService.getPayrollExports();
    setHistory(items);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const doPreview = async () => {
    try {
      const p = await payrollService.previewPayroll(batchResultId, payDate);
      setPreview(p);
    } catch (e: any) {
      setError(e.message || 'Preview failed');
    }
  };

  const doExport = async () => {
    try {
      const res = await payrollService.exportPayroll(batchResultId, payDate);
      await loadHistory();
      // Navigate to download
      await payrollService.downloadPayrollFile(res.download_url);
    } catch (e: any) {
      setError(e.message || 'Export failed');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Payroll Export Manager</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField label="Batch Result ID" value={batchResultId} onChange={e => setBatchResultId(e.target.value)} fullWidth sx={{ mb: 2 }} />
        <TextField type="date" label="Pay Date" value={payDate} onChange={e => setPayDate(e.target.value)} fullWidth sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={doPreview} disabled={!batchResultId}>Preview</Button>
          <Button variant="contained" onClick={doExport} disabled={!batchResultId}>Export CSV</Button>
        </Box>
        {preview && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Preview</Typography>
            <Typography variant="body2">Eligible legs: {preview.count}</Typography>
            <Typography variant="body2">Total cash: £{preview.total_cash.toLocaleString()}</Typography>
          </Box>
        )}
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Export History</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Filename</TableCell>
              <TableCell>Checksum</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Download</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((h, idx) => (
              <TableRow key={idx}>
                <TableCell>{h.filename || h.storage_path}</TableCell>
                <TableCell>{h.checksum_sha256 || h.bytes_hash}</TableCell>
                <TableCell>{h.size_bytes || h.file_size}</TableCell>
                <TableCell><Button onClick={() => payrollService.downloadPayrollFile(h.download_url)}>Download</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default PayrollExportManager;

