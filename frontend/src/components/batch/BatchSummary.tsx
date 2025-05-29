import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { getBatchCalculationSummary } from '../../services/batchCalculationService';

interface BatchSummaryProps {
  batchResultId: string;
}

interface SummaryData {
  total_employees: number;
  total_base_salary: number;
  total_bonus_amount: number;
  average_bonus_percentage: number;
  bonus_percentage_distribution: Record<string, number>;
  department_statistics: Record<string, {
    count: number;
    total_base_salary: number;
    total_bonus: number;
    average_bonus_pct: number;
  }>;
  calculation_parameters: any;
  // Bonus pool information
  bonus_pool_limit?: number;
  bonus_pool_scaling_applied?: boolean;
  bonus_pool_scaling_factor?: number;
  pre_scaling_bonus_total?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const BatchSummary: React.FC<BatchSummaryProps> = ({ batchResultId }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await getBatchCalculationSummary(batchResultId);
        setSummaryData(data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching batch summary:', err);
        setError('Failed to load batch calculation summary');
        setLoading(false);
      }
    };
    
    fetchSummary();
  }, [batchResultId]);
  
  const prepareBonusDistributionData = () => {
    if (!summaryData) return [];
    
    return Object.entries(summaryData.bonus_percentage_distribution).map(([range, count]) => ({
      name: range,
      value: count,
      percentage: count / summaryData.total_employees
    }));
  };
  
  const prepareDepartmentData = () => {
    if (!summaryData) return [];
    
    return Object.entries(summaryData.department_statistics).map(([dept, stats]) => ({
      name: dept,
      employees: stats.count,
      averageBonus: stats.average_bonus_pct,
      totalBonus: stats.total_bonus,
      averageSalary: stats.total_base_salary / stats.count
    }));
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }
  
  if (!summaryData) {
    return (
      <Alert severity="info">
        No summary data available
      </Alert>
    );
  }
  
  const bonusDistributionData = prepareBonusDistributionData();
  const departmentData = prepareDepartmentData();
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Batch Calculation Summary
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Bonus Pool Information - only show if bonus pool limit was used */}
        {summaryData.calculation_parameters?.useBonusPoolLimit && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(0, 128, 0, 0.05)', borderRadius: 1, border: '1px solid rgba(0, 128, 0, 0.2)' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ color: 'success.main', fontWeight: 'medium' }}>
              Bonus Pool Information
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="body2" color="text.secondary">
                  Total Bonus Pool Limit:
                </Typography>
                <Typography variant="h6" color="success.main">
                  {formatCurrency(summaryData.calculation_parameters?.totalBonusPool || 0)}
                </Typography>
              </Box>
              
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="body2" color="text.secondary">
                  Pre-Scaling Bonus Total:
                </Typography>
                <Typography variant="h6" color={summaryData.bonus_pool_scaling_applied ? 'warning.main' : 'text.primary'}>
                  {formatCurrency(summaryData.pre_scaling_bonus_total || summaryData.total_bonus_amount)}
                </Typography>
              </Box>
              
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="body2" color="text.secondary">
                  Final Bonus Total:
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(summaryData.total_bonus_amount)}
                </Typography>
              </Box>
              
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="body2" color="text.secondary">
                  Scaling Factor Applied:
                </Typography>
                <Typography variant="h6" color={summaryData.bonus_pool_scaling_applied ? 'warning.main' : 'success.main'}>
                  {summaryData.bonus_pool_scaling_applied 
                    ? `${(summaryData.bonus_pool_scaling_factor || 0) * 100}%` 
                    : 'None (within limit)'}
                </Typography>
              </Box>
            </Box>
            
            {summaryData.bonus_pool_scaling_applied && (
              <Alert severity="info" sx={{ mt: 2 }}>
                All individual bonuses were scaled down by a factor of {((summaryData.bonus_pool_scaling_factor || 0) * 100).toFixed(1)}% to fit within the total bonus pool limit.
              </Alert>
            )}
          </Box>
        )}
        
        {/* Key metrics and calculation parameters in two columns */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {/* Key metrics */}
          <Box sx={{ flex: '1 1 300px' }}>
            <Typography variant="subtitle1" gutterBottom>
              Key Metrics
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 45%' }}>
                <Typography variant="body2" color="text.secondary">
                  Total Employees:
                </Typography>
                <Typography variant="h6">
                  {summaryData.total_employees}
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 45%' }}>
                <Typography variant="body2" color="text.secondary">
                  Average Bonus:
                </Typography>
                <Typography variant="h6">
                  {formatPercentage(summaryData.average_bonus_percentage)}
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 45%' }}>
                <Typography variant="body2" color="text.secondary">
                  Total Base Salary:
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(summaryData.total_base_salary)}
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 45%' }}>
                <Typography variant="body2" color="text.secondary">
                  Total Bonus Amount:
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(summaryData.total_bonus_amount)}
                </Typography>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Calculation parameters */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Calculation Parameters
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: '1 1 45%' }}>
                  <Typography variant="body2" color="text.secondary">
                    Target Bonus:
                  </Typography>
                  <Typography variant="body1">
                    {formatPercentage(summaryData.calculation_parameters.targetBonusPct)}
                  </Typography>
                </Box>
                <Box sx={{ flex: '1 1 45%' }}>
                  <Typography variant="body2" color="text.secondary">
                    Investment Weight:
                  </Typography>
                  <Typography variant="body1">
                    {formatPercentage(summaryData.calculation_parameters.investmentWeight)}
                  </Typography>
                </Box>
                <Box sx={{ flex: '1 1 45%' }}>
                  <Typography variant="body2" color="text.secondary">
                    Qualitative Weight:
                  </Typography>
                  <Typography variant="body1">
                    {formatPercentage(summaryData.calculation_parameters.qualitativeWeight)}
                  </Typography>
                </Box>
                <Box sx={{ flex: '1 1 45%' }}>
                  <Typography variant="body2" color="text.secondary">
                    RAF:
                  </Typography>
                  <Typography variant="body1">
                    {summaryData.calculation_parameters.raf.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ flex: '1 1 45%' }}>
                  <Typography variant="body2" color="text.secondary">
                    MRT Cap:
                  </Typography>
                  <Typography variant="body1">
                    {formatPercentage(summaryData.calculation_parameters.mrtCapPct)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        
          {/* Bonus distribution chart */}
          <Box sx={{ flex: '1 1 300px' }}>
            <Typography variant="subtitle1" gutterBottom>
              Bonus Percentage Distribution
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bonusDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${(percentage * 100).toFixed(1)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bonusDistributionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number, name: string) => [
                      `${value} employees (${((value / summaryData.total_employees) * 100).toFixed(1)}%)`, 
                      name
                    ]} 
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Box>
        
        {/* Department statistics */}
        <Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>
            Department Statistics
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {/* Department table */}
            <Box sx={{ flex: '1 1 400px' }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Department</TableCell>
                      <TableCell align="right">Employees</TableCell>
                      <TableCell align="right">Avg Bonus %</TableCell>
                      <TableCell align="right">Total Bonus</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(summaryData.department_statistics).map(([department, stats]) => (
                      <TableRow key={department}>
                        <TableCell component="th" scope="row">
                          {department}
                        </TableCell>
                        <TableCell align="right">{stats.count}</TableCell>
                        <TableCell align="right">{formatPercentage(stats.average_bonus_pct)}</TableCell>
                        <TableCell align="right">{formatCurrency(stats.total_bonus)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
            
            {/* Department chart */}
            <Box sx={{ flex: '1 1 400px' }}>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={departmentData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip />
                    <Legend />
                    <Bar 
                      yAxisId="left" 
                      dataKey="average_bonus_pct" 
                      name="Avg. Bonus %" 
                      fill="#8884d8" 
                    />
                    <Bar 
                      yAxisId="right" 
                      dataKey="count" 
                      name="Employee Count" 
                      fill="#82ca9d" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default BatchSummary;
