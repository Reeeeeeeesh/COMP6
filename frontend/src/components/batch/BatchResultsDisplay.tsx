import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { 
  Download as DownloadIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import BatchSummary from './BatchSummary';
import BonusDistributionVisualization from './BonusDistributionVisualization';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { getBatchCalculationResults, getEmployeeCalculationResults, exportCalculationResults } from '../../services/batchCalculationService';

interface EmployeeResult {
  id: string;
  employee_data_id: string;
  batch_result_id: string;
  base_salary: number;
  bonus_percentage: number;
  bonus_amount: number;
  total_compensation: number;
  calculation_breakdown?: any;
  calculated_at: string;
  employee_data: {
    employee_id: string;
    first_name: string;
    last_name: string;
    department: string;
    position: string;
  };
}

interface BatchResult {
  id: string;
  batch_upload_id: string;
  scenario_id?: string;
  total_employees: number;
  total_base_salary: number;
  total_bonus_amount: number;
  average_bonus_percentage: number;
  calculation_parameters: any;
  calculated_at: string;
}

const BatchResultsDisplay: React.FC = () => {
  const { uploadId, resultId } = useParams<{ uploadId: string, resultId?: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<BatchResult | null>(null);
  const [employeeResults, setEmployeeResults] = useState<EmployeeResult[]>([]);
  
  // Pagination and filtering state
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [sortBy, setSortBy] = useState<string>('last_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterDept, setFilterDept] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departments, setDepartments] = useState<string[]>([]);
  
  // Load batch calculation results
  useEffect(() => {
    const fetchBatchResults = async () => {
      try {
        console.log('Fetching batch results for uploadId:', uploadId, 'resultId:', resultId);
        setLoading(true);
        setError(null);
        
        if (!uploadId) {
          console.error('No upload ID provided');
          setError('No upload ID provided');
          setLoading(false);
          return;
        }
        
        // Add a small delay to ensure the backend has processed the calculation
        // This helps when navigating directly from the calculation trigger
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const results = await getBatchCalculationResults(uploadId);
        console.log('Batch results received:', results);
        
        if (!results || results.length === 0) {
          console.error('No batch results found for uploadId:', uploadId);
          setError('No calculation results found. Please try again.');
          setLoading(false);
          return;
        }
        
        console.log('Setting batch results:', results);
        setBatchResults(results);
        
        // If resultId is provided in URL, select that result
        if (resultId && results.length > 0) {
          const result = results.find((r: any) => r.id === resultId);
          if (result) {
            setSelectedResult(result);
          } else {
            // If resultId is not found, select the most recent result
            setSelectedResult(results[0]);
          }
        } else if (results.length > 0) {
          // Otherwise select the most recent result
          setSelectedResult(results[0]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching batch results:', err);
        setError('Failed to load batch calculation results');
        setLoading(false);
      }
    };
    
    fetchBatchResults();
  }, [uploadId, resultId]);
  
  // Load employee results when a batch result is selected
  useEffect(() => {
    const fetchEmployeeResults = async () => {
      try {
        if (!selectedResult) {
          console.log('No selected result, skipping employee results fetch');
          return;
        }
        
        console.log('Fetching employee results for batch result:', selectedResult.id);
        setLoading(true);
        setError(null);
        
        const results = await getEmployeeCalculationResults(
          selectedResult.id,
          page + 1,
          rowsPerPage,
          sortBy,
          sortOrder,
          filterDept || undefined,
          searchTerm || undefined
        );
        
        console.log('Employee results received:', results);
        setEmployeeResults(results);
        
        // Extract unique departments for filtering
        const deptSet = new Set<string>();
        results.forEach((result: any) => {
          if (result.employee_data?.department) {
            deptSet.add(result.employee_data.department);
          }
        });
        setDepartments(Array.from(deptSet));
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching employee results:', err);
        setError('Failed to load employee calculation results');
        setLoading(false);
      }
    };
    
    fetchEmployeeResults();
  }, [selectedResult, page, rowsPerPage, sortBy, sortOrder, filterDept, searchTerm]);
  
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };
  
  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!selectedResult) return;
    
    try {
      const response = await exportCalculationResults(selectedResult.id, format);
      
      // Create a download link
      if (response.success && response.data?.download_url) {
        const link = document.createElement('a');
        link.href = response.data.download_url;
        link.download = `batch-results-${selectedResult.id}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setError('Failed to export results');
      }
    } catch (err) {
      console.error('Error exporting results:', err);
      setError('Failed to export results');
    }
  };
  
  const handleResultSelect = (result: BatchResult) => {
    setSelectedResult(result);
    // Update URL to include the selected result ID
    navigate(`/batch/${uploadId}/results/${result.id}`);
  };
  
  const handleRefresh = () => {
    // Reload employee results with current filters
    if (selectedResult) {
      setLoading(true);
      getEmployeeCalculationResults(
        selectedResult.id,
        page + 1,
        rowsPerPage,
        sortBy,
        sortOrder,
        filterDept || undefined,
        searchTerm || undefined
      )
        .then(results => {
          setEmployeeResults(results);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error refreshing results:', err);
          setError('Failed to refresh results');
          setLoading(false);
        });
    }
  };
  
  const handleBackToUpload = () => {
    navigate('/batch');
  };
  
  const renderSortArrow = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };
  
  if (loading && !selectedResult) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ mt: 2 }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={handleBackToUpload}
        sx={{ mb: 2 }}
      >
        Back to Batch Upload
      </Button>
      
      <Typography variant="h5" gutterBottom>
        Batch Calculation Results
      </Typography>
      
    {error && (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    )}
      
    {batchResults.length === 0 ? (
      <Alert severity="info">
        No calculation results found for this batch upload. Please run a calculation first.
      </Alert>
    ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Results selection */}
          {batchResults.length > 1 && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Available Calculations
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {batchResults.map(result => (
                  <Chip
                    key={result.id}
                    label={`Calculation ${new Date(result.calculated_at).toLocaleString()}`}
                    onClick={() => handleResultSelect(result)}
                    color={selectedResult?.id === result.id ? 'primary' : 'default'}
                    variant={selectedResult?.id === result.id ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Paper>
          )}
          
          {/* Summary section */}
          <Box>
            {selectedResult && (
              <BatchSummary batchResultId={selectedResult.id} />
            )}
          </Box>

          {/* Bonus Distribution Visualization */}
          <Box>
            {selectedResult && (
              <BonusDistributionVisualization batchResultId={selectedResult.id} />
            )}
          </Box>
          
          {/* Filters and search */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="department-filter-label">Department</InputLabel>
                <Select
                  labelId="department-filter-label"
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value as string)}
                  label="Department"
                  size="small"
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                label="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                placeholder="Name or Employee ID"
                InputProps={{
                  startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
              
              <Box sx={{ flexGrow: 1 }} />
              
              <Tooltip title="Refresh Results">
                <IconButton onClick={handleRefresh} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Export to CSV">
                <IconButton onClick={() => handleExport('csv')} color="primary">
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
          
          {/* Results table */}
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell 
                      onClick={() => handleSort('employee_id')}
                      sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Employee ID{renderSortArrow('employee_id')}
                    </TableCell>
                    <TableCell 
                      onClick={() => handleSort('last_name')}
                      sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Name{renderSortArrow('last_name')}
                    </TableCell>
                    <TableCell 
                      onClick={() => handleSort('department')}
                      sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Department{renderSortArrow('department')}
                    </TableCell>
                    <TableCell 
                      onClick={() => handleSort('base_salary')}
                      sx={{ cursor: 'pointer', fontWeight: 'bold', textAlign: 'right' }}
                    >
                      Base Salary{renderSortArrow('base_salary')}
                    </TableCell>
                    <TableCell 
                      onClick={() => handleSort('bonus_amount')}
                      sx={{ cursor: 'pointer', fontWeight: 'bold', textAlign: 'right' }}
                    >
                      Bonus Amount{renderSortArrow('bonus_amount')}
                    </TableCell>
                    <TableCell 
                      onClick={() => handleSort('bonus_percentage')}
                      sx={{ cursor: 'pointer', fontWeight: 'bold', textAlign: 'right' }}
                    >
                      Bonus %{renderSortArrow('bonus_percentage')}
                    </TableCell>
                    <TableCell 
                      onClick={() => handleSort('total_compensation')}
                      sx={{ cursor: 'pointer', fontWeight: 'bold', textAlign: 'right' }}
                    >
                      Total Comp{renderSortArrow('total_compensation')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : employeeResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No results found
                      </TableCell>
                    </TableRow>
                  ) : (
                    employeeResults.map((result) => (
                      <TableRow key={result.id} hover>
                        <TableCell>{result.employee_data?.employee_id || 'N/A'}</TableCell>
                        <TableCell>
                          {result.employee_data ? 
                            `${result.employee_data.last_name}, ${result.employee_data.first_name}` : 
                            'N/A'}
                        </TableCell>
                        <TableCell>{result.employee_data?.department || 'N/A'}</TableCell>
                        <TableCell align="right">{formatCurrency(result.base_salary)}</TableCell>
                        <TableCell align="right">{formatCurrency(result.bonus_amount)}</TableCell>
                        <TableCell align="right">{formatPercentage(result.bonus_percentage)}</TableCell>
                        <TableCell align="right">{formatCurrency(result.total_compensation)}</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/calculator/${selectedResult?.id}?employee=${result.id}&uploadId=${uploadId}`)}
                            sx={{ fontSize: '0.75rem', padding: '2px 8px' }}
                          >
                            Open Calculator
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={-1} // We don't know the total count from the server
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default BatchResultsDisplay;
