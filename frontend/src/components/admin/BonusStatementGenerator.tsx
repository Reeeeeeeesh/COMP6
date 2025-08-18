/**
 * Bonus Statement Generator - Individual employee statement download interface
 * Task 20: Professional PDF/XLSX bonus statement generation with calculation transparency
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Group as GroupIcon,
} from '@mui/icons-material';

import {
  getAvailableEmployeesForStatements,
  downloadStatementWithTrigger,
  bulkGenerateStatements,
  AvailableEmployee,
} from '../../services/bonusStatementService';

interface BonusStatementGeneratorProps {
  runId: string;
  onError?: (error: string) => void;
}

export const BonusStatementGenerator: React.FC<BonusStatementGeneratorProps> = ({
  runId,
  onError,
}) => {
  const [employees, setEmployees] = useState<AvailableEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [format, setFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [includeSteps, setIncludeSteps] = useState(true);
  const [companyName, setCompanyName] = useState('Fund Management Company');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadAvailableEmployees();
  }, [runId]);

  const loadAvailableEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      
      const employeeList = await getAvailableEmployeesForStatements(runId);
      setEmployees(employeeList);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load employees';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadStatement = async (employeeRef: string) => {
    try {
      setDownloading(employeeRef);
      
      await downloadStatementWithTrigger(runId, employeeRef, format, {
        include_calculation_steps: includeSteps,
        company_name: companyName,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setDownloading(null);
    }
  };

  const handleBulkGenerate = async () => {
    try {
      setDownloading('bulk');
      
      const result = await bulkGenerateStatements(runId, format, {
        include_calculation_steps: includeSteps,
        company_name: companyName,
        employee_refs: selectedEmployees.length > 0 ? selectedEmployees : undefined,
      });

      setError('');
      setBulkDialog(false);
      
      // Show success message (could implement notification here)
      console.log(`Bulk generation completed: ${result.successful_count} successful, ${result.failed_count} failed`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bulk generation failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setDownloading(null);
    }
  };

  const toggleEmployeeSelection = (employeeRef: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeRef)
        ? prev.filter(ref => ref !== employeeRef)
        : [...prev, employeeRef]
    );
  };

  const selectAllEmployees = () => {
    setSelectedEmployees(employees.map(emp => emp.employee_ref));
  };

  const clearSelection = () => {
    setSelectedEmployees([]);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading available employees...
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

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Bonus Statement Generator
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Chip 
          label={`Run: ${runId}`} 
          color="primary" 
          variant="outlined" 
          sx={{ mr: 1 }} 
        />
        <Chip 
          label={`${employees.length} Employees Available`} 
          color="info" 
          variant="outlined" 
        />
      </Box>

      {/* Configuration Options */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Statement Configuration
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Format</InputLabel>
            <Select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'pdf' | 'xlsx')}
              label="Format"
            >
              <MenuItem value="pdf">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PdfIcon sx={{ mr: 1, color: 'error.main' }} />
                  PDF
                </Box>
              </MenuItem>
              <MenuItem value="xlsx">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ExcelIcon sx={{ mr: 1, color: 'success.main' }} />
                  Excel
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            sx={{ minWidth: 200 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={includeSteps}
                onChange={(e) => setIncludeSteps(e.target.checked)}
                color="primary"
              />
            }
            label="Include Calculation Steps"
          />

          <Button
            variant="outlined"
            startIcon={<GroupIcon />}
            onClick={() => setBulkDialog(true)}
            disabled={employees.length === 0}
          >
            Bulk Generate ({selectedEmployees.length || 'All'})
          </Button>
        </Box>
      </Paper>

      {/* Employee List */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Button size="small" onClick={selectAllEmployees}>
                  All
                </Button>
                <Button size="small" onClick={clearSelection} sx={{ ml: 1 }}>
                  None
                </Button>
              </TableCell>
              <TableCell><strong>Employee</strong></TableCell>
              <TableCell><strong>Department</strong></TableCell>
              <TableCell><strong>Position</strong></TableCell>
              <TableCell align="right"><strong>Bonus Amount</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((employee) => (
              <TableRow
                key={employee.employee_ref}
                selected={selectedEmployees.includes(employee.employee_ref)}
                onClick={() => toggleEmployeeSelection(employee.employee_ref)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(employee.employee_ref)}
                    onChange={() => toggleEmployeeSelection(employee.employee_ref)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {employee.first_name} {employee.last_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ID: {employee.employee_ref}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {employee.department || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {employee.position || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="medium" color="primary.main">
                    ${employee.bonus_amount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadStatement(employee.employee_ref);
                    }}
                    disabled={downloading === employee.employee_ref}
                    color="primary"
                    size="small"
                  >
                    {downloading === employee.employee_ref ? (
                      <CircularProgress size={20} />
                    ) : (
                      <DownloadIcon />
                    )}
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Bulk Generation Dialog */}
      <Dialog open={bulkDialog} onClose={() => setBulkDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Statement Generation</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Generate {format.toUpperCase()} statements for{' '}
            {selectedEmployees.length > 0 
              ? `${selectedEmployees.length} selected employees`
              : `all ${employees.length} employees`
            }.
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {format === 'pdf' ? <PdfIcon color="error" /> : <ExcelIcon color="success" />}
            <Typography variant="body2">
              Format: {format.toUpperCase()}
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ mt: 1 }}>
            Include calculation steps: {includeSteps ? 'Yes' : 'No'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkGenerate}
            variant="contained"
            disabled={downloading === 'bulk'}
            startIcon={downloading === 'bulk' ? <CircularProgress size={16} /> : <GroupIcon />}
          >
            {downloading === 'bulk' ? 'Generating...' : 'Generate All'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BonusStatementGenerator;