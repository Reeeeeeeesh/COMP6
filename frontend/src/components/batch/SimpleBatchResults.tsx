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
  Alert
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { getBatchCalculationResults, getEmployeeCalculationResults } from '../../services/batchCalculationService';
import { NavigationHeader } from '../common/NavigationHeader';

/**
 * A simplified version of the BatchResultsDisplay component
 * This component is designed to be more robust and easier to debug
 */
const SimpleBatchResults: React.FC = () => {
  const { uploadId, resultId } = useParams<{ uploadId: string, resultId?: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [employeeResults, setEmployeeResults] = useState<any[]>([]);
  
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const results = await getBatchCalculationResults(uploadId);
        console.log('Batch results received:', results);
        
        if (!results || results.length === 0) {
          console.error('No batch results found for uploadId:', uploadId);
          setError('No calculation results found. Please try again.');
          setLoading(false);
          return;
        }
        
        setBatchResults(results);
        
        // If resultId is provided in URL, select that result
        if (resultId && results.length > 0) {
          const result = results.find((r: any) => r.id === resultId);
          if (result) {
            setSelectedResult(result);
            console.log('Selected result by ID:', result);
          } else {
            // If resultId is not found, select the most recent result
            setSelectedResult(results[0]);
            console.log('Selected first result:', results[0]);
          }
        } else if (results.length > 0) {
          // Otherwise select the most recent result
          setSelectedResult(results[0]);
          console.log('Selected first result:', results[0]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching batch results:', err);
        setError('Failed to load batch calculation results. Please try again.');
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
        
        const results = await getEmployeeCalculationResults(
          selectedResult.id,
          1, // page
          100, // pageSize
          'last_name', // sortBy
          'asc' // sortOrder
        );
        
        console.log('Employee results received:', results);
        setEmployeeResults(results);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching employee results:', err);
        setError('Failed to load employee calculation results');
        setLoading(false);
      }
    };
    
    fetchEmployeeResults();
  }, [selectedResult]);
  
  const handleBackToUpload = () => {
    navigate(`/batch`);
  };
  
  if (loading && !selectedResult) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <div>
      <NavigationHeader title="Batch Results" />
      <Box sx={{ mt: 2, p: 3 }}>
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
        <Box>
          {selectedResult && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Calculation Summary
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => navigate(`/calculator/${selectedResult.id}?uploadId=${uploadId}`)}
                >
                  Open Individual Calculator
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Employees
                  </Typography>
                  <Typography variant="h6">
                    {selectedResult.total_employees}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Base Salary
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(selectedResult.total_base_salary)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Bonus Amount
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(selectedResult.total_bonus_amount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Average Bonus %
                  </Typography>
                  <Typography variant="h6">
                    {formatPercentage(selectedResult.average_bonus_percentage)}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}
          
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Employee Results
            </Typography>
            
            {loading ? (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
              </Box>
            ) : employeeResults.length === 0 ? (
              <Alert severity="info">
                No employee results found for this calculation.
              </Alert>
            ) : (
              <TableContainer sx={{ border: '1px solid rgba(224, 224, 224, 1)', borderRadius: 1, boxShadow: 1 }}>
                <Table>
                  <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', color: '#333' }}>Employee ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#333' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#333' }}>Department</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: '#333' }}>Base Salary</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: '#333' }}>Bonus Amount</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: '#333' }}>Bonus %</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#333' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employeeResults.map((result, index) => (
                      <TableRow 
                        key={result.id} 
                        hover 
                        sx={{ 
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9f9f9',
                          '&:hover': { backgroundColor: '#f0f7ff' }
                        }}
                      >
                        <TableCell sx={{ color: '#333' }}>{result.employee_data?.employee_id || 'N/A'}</TableCell>
                        <TableCell sx={{ color: '#333' }}>
                          {result.employee_data ? 
                            `${result.employee_data.last_name}, ${result.employee_data.first_name}` : 
                            'N/A'}
                        </TableCell>
                        <TableCell sx={{ color: '#333' }}>{result.employee_data?.department || 'N/A'}</TableCell>
                        <TableCell align="right" sx={{ color: '#333', fontWeight: 'medium' }}>{formatCurrency(result.base_salary)}</TableCell>
                        <TableCell align="right" sx={{ color: '#333', fontWeight: 'medium' }}>{formatCurrency(result.bonus_amount)}</TableCell>
                        <TableCell align="right" sx={{ color: '#333', fontWeight: 'medium' }}>{formatPercentage(result.bonus_percentage)}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => {
                              // Navigate to individual calculator with the batch result ID and pre-select this employee
                              navigate(`/calculator/${selectedResult.id}?uploadId=${uploadId}&employee=${result.id}`);
                            }}
                          >
                            Calculate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      )}
      </Box>
    </div>
  );
};

export default SimpleBatchResults;
