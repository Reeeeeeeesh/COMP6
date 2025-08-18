/**
 * Calculation Tape Viewer - Step-by-step calculation transparency display
 * Shows detailed breakdown of how bonus calculations are derived for each employee
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

import {
  getCalculationTape,
  getRunSnapshotHash,
  CalculationTape,
  StepResult,
  SnapshotHashInfo,
} from '../../services/planManagementService';

interface CalculationTapeViewerProps {
  planId: string;
  runId: string;
  onError?: (error: string) => void;
}

export const CalculationTapeViewer: React.FC<CalculationTapeViewerProps> = ({
  planId,
  runId,
  onError,
}) => {
  const [calculationTape, setCalculationTape] = useState<CalculationTape | null>(null);
  const [snapshotHashInfo, setSnapshotHashInfo] = useState<SnapshotHashInfo | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadCalculationTape();
  }, [planId, runId]);

  const loadCalculationTape = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load both calculation tape and snapshot hash info in parallel
      const [tape, snapshotInfo] = await Promise.all([
        getCalculationTape(planId, runId),
        getRunSnapshotHash(runId)
      ]);
      
      setCalculationTape(tape);
      setSnapshotHashInfo(snapshotInfo);
      
      // Set first employee as default selection
      const employees = Object.keys(tape.calculation_tape);
      if (employees.length > 0) {
        setSelectedEmployee(employees[0]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load calculation tape';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatStepValue = (stepResult: StepResult): string => {
    const { value, type } = stepResult.value;
    
    if (type === 'numeric') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        return numValue.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
    }
    
    return value;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading calculation tape...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!calculationTape) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No calculation tape data available for this run.
      </Alert>
    );
  }

  const employees = Object.keys(calculationTape.calculation_tape);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Calculation Tape
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Chip 
          label={`Plan: ${planId}`} 
          color="primary" 
          variant="outlined" 
          sx={{ mr: 1 }} 
        />
        <Chip 
          label={`Run: ${runId}`} 
          color="secondary" 
          variant="outlined" 
          sx={{ mr: 1 }} 
        />
        <Chip 
          label={`${calculationTape.total_employees} Employees`} 
          color="info" 
          variant="outlined" 
          sx={{ mr: 1 }} 
        />
        <Chip 
          label={`${calculationTape.total_steps} Total Steps`} 
          color="success" 
          variant="outlined" 
        />
      </Box>

      {/* Snapshot Hash Information for Audit Transparency */}
      {snapshotHashInfo && (
        <Paper sx={{ p: 2, mb: 3, backgroundColor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom color="primary">
            🔒 Reproducibility Guarantee
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip 
              label="Calculation Reproducible" 
              color="success" 
              variant="filled"
              size="small"
            />
            <Chip 
              label={`Status: ${snapshotHashInfo.status}`} 
              color="info" 
              variant="outlined"
              size="small"
            />
            <Chip 
              label={new Date(snapshotHashInfo.started_at).toLocaleDateString()} 
              variant="outlined"
              size="small"
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <strong>Snapshot Hash:</strong> 
          </Typography>
          <Typography 
            variant="body2" 
            fontFamily="monospace" 
            sx={{ 
              backgroundColor: 'white', 
              p: 1, 
              border: '1px solid', 
              borderColor: 'grey.300',
              borderRadius: 1,
              wordBreak: 'break-all'
            }}
          >
            {snapshotHashInfo.snapshot_hash}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            This hash guarantees that identical plan configurations will produce identical results.
          </Typography>
        </Paper>
      )}

      {employees.length > 0 && (
        <FormControl sx={{ mb: 3, minWidth: 200 }}>
          <InputLabel>Select Employee</InputLabel>
          <Select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            label="Select Employee"
          >
            {employees.map((empRef) => (
              <MenuItem key={empRef} value={empRef}>
                {empRef}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {selectedEmployee && calculationTape.calculation_tape[selectedEmployee] && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Step-by-Step Results for {selectedEmployee}
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Step Name</strong></TableCell>
                  <TableCell align="right"><strong>Calculated Value</strong></TableCell>
                  <TableCell><strong>Data Type</strong></TableCell>
                  <TableCell><strong>Executed At</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {calculationTape.calculation_tape[selectedEmployee].map((stepResult, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {stepResult.step_name}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        fontFamily="monospace"
                        color={stepResult.value.type === 'numeric' ? 'primary.main' : 'text.primary'}
                      >
                        {formatStepValue(stepResult)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={stepResult.value.type} 
                        size="small" 
                        color={stepResult.value.type === 'numeric' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(stepResult.created_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {employees.length > 1 && (
        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">
              All Employees Summary ({employees.length} total)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Employee</strong></TableCell>
                    <TableCell align="center"><strong>Steps Completed</strong></TableCell>
                    <TableCell><strong>Last Step</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.map((empRef) => {
                    const steps = calculationTape.calculation_tape[empRef];
                    const lastStep = steps[steps.length - 1];
                    
                    return (
                      <TableRow 
                        key={empRef}
                        onClick={() => setSelectedEmployee(empRef)}
                        sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {empRef}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={steps.length} size="small" color="info" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {lastStep?.step_name || 'N/A'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default CalculationTapeViewer;