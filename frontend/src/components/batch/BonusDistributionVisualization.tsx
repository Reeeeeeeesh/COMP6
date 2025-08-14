import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { getBonusDistributionAnalysis } from '../../services/batchCalculationService';

interface BonusDistributionVisualizationProps {
  batchResultId: string;
  refreshTrigger?: number; // Optional prop to trigger refresh
}

interface DistributionData {
  salary_range_distribution: Array<{
    range: string;
    count: number;
    totalBonus: number;
    avgBonusPct: number;
    employees: Array<{
      id: string;
      name: string;
      department: string;
      salary: number;
      bonus_amount: number;
      bonus_percentage: number;
    }>;
  }>;
  bonus_percentage_distribution: Array<{
    range: string;
    count: number;
    employees: Array<{
      id: string;
      name: string;
      department: string;
      salary: number;
      bonus_amount: number;
      bonus_percentage: number;
    }>;
  }>;
  department_distribution: Array<{
    department: string;
    count: number;
    totalBonus: number;
    avgBonusPct: number;
    employees: Array<{
      id: string;
      name: string;
      department: string;
      salary: number;
      bonus_amount: number;
      bonus_percentage: number;
    }>;
  }>;
  total_employees: number;
  calculation_parameters: any;
}

interface Employee {
  id: string;
  name: string;
  department: string;
  salary: number;
  bonus_amount: number;
  bonus_percentage: number;
}

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280', '#EC4899', '#06B6D4'];
const GRADIENT_COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#fc466b', '#3f5efb'
];

const BonusDistributionVisualization: React.FC<BonusDistributionVisualizationProps> = ({
  batchResultId,
  refreshTrigger = 0
}) => {
  const [data, setData] = useState<DistributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{
    title: string;
    employees: Employee[];
  } | null>(null);

  useEffect(() => {
    const fetchDistributionData = async () => {
      try {
        setLoading(true);
        setError(null);
        const distributionData = await getBonusDistributionAnalysis(batchResultId);
        setData(distributionData);
      } catch (err) {
        console.error('Error fetching distribution data:', err);
        setError('Failed to load bonus distribution data');
      } finally {
        setLoading(false);
      }
    };

    if (batchResultId) {
      fetchDistributionData();
    }
  }, [batchResultId, refreshTrigger]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleDrillDown = (title: string, employees: Employee[]) => {
    setSelectedGroup({ title, employees });
    setDrillDownOpen(true);
  };

  const handleCloseDrillDown = () => {
    setDrillDownOpen(false);
    setSelectedGroup(null);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box className="bg-white p-4 border border-gray-200 rounded-xl shadow-lg backdrop-blur-sm">
          <Typography variant="subtitle2" className="font-semibold text-gray-900 mb-2">
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography key={index} variant="body2" style={{ color: entry.color }}>
              {entry.dataKey === 'count' && `Employees: ${entry.value}`}
              {entry.dataKey === 'totalBonus' && `Total Bonus: ${formatCurrency(entry.value)}`}
              {entry.dataKey === 'avgBonusPct' && `Avg Bonus %: ${formatPercentage(entry.value / 100)}`}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box className="bg-white p-4 border border-gray-200 rounded-xl shadow-lg backdrop-blur-sm">
          <Typography variant="subtitle2" className="font-semibold text-gray-900 mb-2">
            {data.range || data.department}
          </Typography>
          <Typography variant="body2">
            Employees: {data.count}
          </Typography>
          <Typography variant="body2">
            Percentage: {((data.count / (data.total || 1)) * 100).toFixed(1)}%
          </Typography>
          {data.totalBonus && (
            <Typography variant="body2">
              Total Bonus: {formatCurrency(data.totalBonus)}
            </Typography>
          )}
        </Box>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ margin: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="info" sx={{ margin: 2 }}>
        No distribution data available
      </Alert>
    );
  }

  // Add total to pie chart data
  const salaryRangePieData = data.salary_range_distribution.map(item => ({
    ...item,
    total: data.total_employees
  }));

  const bonusPercentagePieData = data.bonus_percentage_distribution.map(item => ({
    ...item,
    total: data.total_employees
  }));

  const departmentPieData = data.department_distribution.map(item => ({
    ...item,
    total: data.total_employees
  }));

  return (
    <Paper elevation={2} sx={{ padding: 3, marginBottom: 3 }}>
      <Typography variant="h5" gutterBottom>
        Bonus Distribution Analysis
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Interactive analysis of bonus distribution across salary ranges, departments, and bonus percentage ranges
      </Typography>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ marginBottom: 3 }}>
        <Tab label="Salary Ranges" />
        <Tab label="Bonus Percentages" />
        <Tab label="Departments" />
      </Tabs>

      {/* Salary Range Distribution */}
      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Distribution by Salary Range
          </Typography>
          <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={4}>
            {/* Bar Chart */}
            <Box flex={2}>
              <Typography variant="subtitle2" gutterBottom>
                Employee Count and Average Bonus %
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.salary_range_distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="count" 
                    fill={COLORS[0]} 
                    name="Employee Count"
                    onClick={(data) => handleDrillDown(`Salary Range: ${data.range}`, data.employees)}
                    style={{ cursor: 'pointer' }}
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="avgBonusPct" 
                    fill={COLORS[1]} 
                    name="Avg Bonus %"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>

            {/* Pie Chart */}
            <Box flex={1}>
              <Typography variant="subtitle2" gutterBottom>
                Employee Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={salaryRangePieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ range, count }) => `${range}: ${count}`}
                    onClick={(data) => handleDrillDown(`Salary Range: ${data.range}`, data.employees)}
                    style={{ cursor: 'pointer' }}
                  >
                    {salaryRangePieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Box>
      )}

      {/* Bonus Percentage Distribution */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Distribution by Bonus Percentage Range
          </Typography>
          <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={4}>
            {/* Bar Chart */}
            <Box flex={2}>
              <Typography variant="subtitle2" gutterBottom>
                Employee Count by Bonus Percentage Range
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.bonus_percentage_distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="count" 
                    fill={COLORS[2]} 
                    name="Employee Count"
                    onClick={(data) => handleDrillDown(`Bonus Range: ${data.range}`, data.employees)}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>

            {/* Pie Chart */}
            <Box flex={1}>
              <Typography variant="subtitle2" gutterBottom>
                Bonus Range Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={bonusPercentagePieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ range, count }) => `${range}: ${count}`}
                    onClick={(data) => handleDrillDown(`Bonus Range: ${data.range}`, data.employees)}
                    style={{ cursor: 'pointer' }}
                  >
                    {bonusPercentagePieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Box>
      )}

      {/* Department Distribution */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Distribution by Department
          </Typography>
          <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={4}>
            {/* Bar Chart */}
            <Box flex={2}>
              <Typography variant="subtitle2" gutterBottom>
                Department Analysis
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.department_distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="department" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="count" 
                    fill={COLORS[3]} 
                    name="Employee Count"
                    onClick={(data) => handleDrillDown(`Department: ${data.department}`, data.employees)}
                    style={{ cursor: 'pointer' }}
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="avgBonusPct" 
                    fill={COLORS[4]} 
                    name="Avg Bonus %"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>

            {/* Pie Chart */}
            <Box flex={1}>
              <Typography variant="subtitle2" gutterBottom>
                Department Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={departmentPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ department, count }) => `${department}: ${count}`}
                    onClick={(data) => handleDrillDown(`Department: ${data.department}`, data.employees)}
                    style={{ cursor: 'pointer' }}
                  >
                    {departmentPieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Box>
      )}

      {/* Drill-down Dialog */}
      <Dialog 
        open={drillDownOpen} 
        onClose={handleCloseDrillDown}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedGroup?.title}
            </Typography>
            <IconButton onClick={handleCloseDrillDown}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedGroup && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedGroup.employees.length} employee(s) in this group
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell align="right">Base Salary</TableCell>
                      <TableCell align="right">Bonus Amount</TableCell>
                      <TableCell align="right">Bonus %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedGroup.employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>{employee.id}</TableCell>
                        <TableCell>{employee.name}</TableCell>
                        <TableCell>
                          <Chip 
                            label={employee.department} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(employee.salary)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(employee.bonus_amount)}
                        </TableCell>
                        <TableCell align="right">
                          {formatPercentage(employee.bonus_percentage)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default BonusDistributionVisualization;