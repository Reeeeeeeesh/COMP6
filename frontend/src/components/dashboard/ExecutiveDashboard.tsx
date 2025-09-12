import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  Tooltip,
  Menu,
  MenuList,
  Paper,
  Tab,
  Tabs
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Analytics as AnalyticsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Dashboard as DashboardIcon,
  FilterList as FilterIcon,
  GetApp as ExportIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Legend,
  Scatter,
  ScatterChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { NavigationHeader } from '../common/NavigationHeader';
import { useUser } from '../../contexts/UserContext';

// Enhanced KPI and Analytics Interfaces
interface ExecutiveKPI {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'excellent' | 'good' | 'warning' | 'critical';
  category: 'financial' | 'operational' | 'strategic' | 'people';
  description: string;
  actionItems: string[];
}

interface ExecutiveInsight {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: 'opportunity' | 'risk' | 'performance' | 'compliance';
  urgency: 'immediate' | 'short-term' | 'long-term';
  recommendations: string[];
  dataSupport: any;
}

interface StrategicMetric {
  name: string;
  value: number;
  benchmark: number;
  industry: number;
  trend: number[];
  forecast: number[];
}

interface DecisionSupport {
  scenario: string;
  impact: number;
  probability: number;
  timeframe: string;
  recommendation: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface ExecutiveDashboardProps {
  userId?: string;
  tenantId?: string;
  timeframe?: '7d' | '30d' | '90d' | '1y';
}

const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  userId,
  tenantId,
  timeframe = '30d'
}) => {
  // State Management
  const [kpis, setKpis] = useState<ExecutiveKPI[]>([]);
  const [insights, setInsights] = useState<ExecutiveInsight[]>([]);
  const [strategicMetrics, setStrategicMetrics] = useState<StrategicMetric[]>([]);
  const [decisionSupport, setDecisionSupport] = useState<DecisionSupport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(30000);
  const [currentTab, setCurrentTab] = useState(0);
  const [dashboardView, setDashboardView] = useState<'overview' | 'financial' | 'operational' | 'strategic'>('overview');

  const { user } = useUser();

  // Mock Data Generation (replace with real API calls)
  const generateMockKPIs = useCallback((): ExecutiveKPI[] => [
    {
      id: 'total_compensation_cost',
      name: 'Total Compensation Cost',
      value: 12500000,
      previousValue: 11800000,
      target: 13000000,
      unit: 'currency',
      trend: 'up',
      status: 'good',
      category: 'financial',
      description: 'Total cost of all compensation including base salary and bonuses',
      actionItems: ['Review bonus allocation strategy', 'Optimize departmental distribution']
    },
    {
      id: 'cost_per_employee',
      name: 'Average Cost Per Employee',
      value: 78125,
      previousValue: 75500,
      target: 80000,
      unit: 'currency',
      trend: 'up',
      status: 'excellent',
      category: 'financial',
      description: 'Average total compensation per employee',
      actionItems: ['Monitor market competitiveness', 'Assess role-based adjustments']
    },
    {
      id: 'retention_rate',
      name: 'Employee Retention Rate',
      value: 94.2,
      previousValue: 92.8,
      target: 95.0,
      unit: 'percentage',
      trend: 'up',
      status: 'good',
      category: 'people',
      description: 'Percentage of employees retained over the period',
      actionItems: ['Focus on departments with lower retention', 'Enhance career development programs']
    },
    {
      id: 'pay_equity_index',
      name: 'Pay Equity Index',
      value: 96.8,
      previousValue: 94.1,
      target: 98.0,
      unit: 'percentage',
      trend: 'up',
      status: 'good',
      category: 'strategic',
      description: 'Measure of pay fairness across demographics',
      actionItems: ['Continue pay equity initiatives', 'Regular compensation audits']
    },
    {
      id: 'bonus_to_salary_ratio',
      name: 'Bonus to Salary Ratio',
      value: 18.5,
      previousValue: 16.2,
      target: 20.0,
      unit: 'percentage',
      trend: 'up',
      status: 'warning',
      category: 'operational',
      description: 'Ratio of bonus payments to base salary',
      actionItems: ['Review bonus criteria effectiveness', 'Align with performance targets']
    },
    {
      id: 'calculation_accuracy',
      name: 'Calculation Accuracy',
      value: 99.7,
      previousValue: 99.4,
      target: 99.9,
      unit: 'percentage',
      trend: 'up',
      status: 'excellent',
      category: 'operational',
      description: 'Accuracy rate of bonus calculations',
      actionItems: ['Continue process improvements', 'Monitor data quality']
    }
  ], []);

  const generateMockInsights = useCallback((): ExecutiveInsight[] => [
    {
      id: 'budget_variance',
      title: 'Compensation Budget Variance Analysis',
      description: 'Current compensation spend is tracking 5.9% above budget due to higher-than-expected performance bonuses in Engineering and Sales divisions.',
      impact: 'high',
      category: 'performance',
      urgency: 'short-term',
      recommendations: [
        'Implement monthly budget reconciliation process',
        'Adjust Q4 bonus targets to align with annual budget',
        'Consider performance bonus caps for remainder of fiscal year'
      ],
      dataSupport: { variance: 5.9, affectedDepartments: ['Engineering', 'Sales'], budgetImpact: 740000 }
    },
    {
      id: 'pay_equity_opportunity',
      title: 'Pay Equity Improvement Opportunity',
      description: 'Analysis shows 12% improvement in pay equity scores over the past quarter, with remaining gaps primarily in mid-level management roles.',
      impact: 'medium',
      category: 'opportunity',
      urgency: 'long-term',
      recommendations: [
        'Conduct targeted compensation review for management levels',
        'Implement structured salary bands',
        'Enhance promotion and advancement transparency'
      ],
      dataSupport: { improvement: 12, gapAreas: ['Mid-Management'], affectedEmployees: 45 }
    },
    {
      id: 'retention_risk',
      title: 'Retention Risk in High-Performing Segments',
      description: 'Top performers with below-median compensation show 23% higher attrition risk, particularly in Product and Engineering teams.',
      impact: 'high',
      category: 'risk',
      urgency: 'immediate',
      recommendations: [
        'Conduct immediate retention interviews with at-risk employees',
        'Accelerate compensation reviews for high performers',
        'Implement retention bonuses for critical roles'
      ],
      dataSupport: { attritionRisk: 23, affectedEmployees: 28, departments: ['Product', 'Engineering'] }
    }
  ], []);

  // Data Loading Functions
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // In production, replace with real API calls
      setTimeout(() => {
        setKpis(generateMockKPIs());
        setInsights(generateMockInsights());
        
        // Generate mock strategic metrics
        setStrategicMetrics([
          {
            name: 'Market Competitiveness',
            value: 96.5,
            benchmark: 100,
            industry: 94.2,
            trend: [94.1, 94.8, 95.2, 95.9, 96.5],
            forecast: [96.8, 97.2, 97.5]
          },
          {
            name: 'Pay Satisfaction Score',
            value: 4.2,
            benchmark: 4.5,
            industry: 3.8,
            trend: [3.9, 4.0, 4.1, 4.1, 4.2],
            forecast: [4.3, 4.4, 4.5]
          }
        ]);

        setLoading(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      setLoading(false);
    }
  }, [generateMockKPIs, generateMockInsights]);

  // Effects
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, selectedTimeframe]);

  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(loadDashboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, loadDashboardData]);

  // Computed Values
  const kpisByCategory = useMemo(() => {
    return kpis.reduce((acc, kpi) => {
      if (!acc[kpi.category]) acc[kpi.category] = [];
      acc[kpi.category].push(kpi);
      return acc;
    }, {} as Record<string, ExecutiveKPI[]>);
  }, [kpis]);

  const insightsByUrgency = useMemo(() => {
    return insights.sort((a, b) => {
      const urgencyOrder = { immediate: 3, 'short-term': 2, 'long-term': 1 };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });
  }, [insights]);

  // Utility Functions
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(value);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUpIcon color="success" />;
      case 'down': return <TrendingDownIcon color="error" />;
      default: return <SpeedIcon color="action" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'success';
      case 'good': return 'primary';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  // Component Renderers
  const renderKPICard = (kpi: ExecutiveKPI) => {
    const change = ((kpi.value - kpi.previousValue) / kpi.previousValue) * 100;
    const progressToTarget = (kpi.value / kpi.target) * 100;

    return (
      <Card key={kpi.id} sx={{ height: '100%', position: 'relative' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
            <Typography variant="h6" component="h3" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {kpi.name}
            </Typography>
            <Chip 
              label={kpi.status} 
              color={getStatusColor(kpi.status) as any}
              size="small" 
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mr: 1 }}>
              {kpi.unit === 'currency' ? formatCurrency(kpi.value) : 
               kpi.unit === 'percentage' ? formatPercentage(kpi.value) : 
               kpi.value.toLocaleString()}
            </Typography>
            {getTrendIcon(kpi.trend)}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              {change >= 0 ? '+' : ''}{change.toFixed(1)}% vs prev
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Target: {kpi.unit === 'currency' ? formatCurrency(kpi.target) : 
                      kpi.unit === 'percentage' ? formatPercentage(kpi.target) : 
                      kpi.target.toLocaleString()}
            </Typography>
          </Box>

          <LinearProgress 
            variant="determinate" 
            value={Math.min(progressToTarget, 100)}
            color={progressToTarget >= 100 ? 'success' : progressToTarget >= 80 ? 'primary' : 'warning'}
            sx={{ mb: 2 }}
          />

          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            {kpi.description}
          </Typography>

          {kpi.actionItems.length > 0 && (
            <Box>
              <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                Key Actions:
              </Typography>
              <List dense sx={{ pt: 0 }}>
                {kpi.actionItems.slice(0, 2).map((item, index) => (
                  <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 20 }}>
                      <CheckCircleIcon sx={{ fontSize: 16 }} color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={item} 
                      primaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderInsightCard = (insight: ExecutiveInsight) => {
    const getImpactColor = (impact: string) => {
      switch (impact) {
        case 'high': return 'error';
        case 'medium': return 'warning';
        default: return 'info';
      }
    };

    const getUrgencyIcon = (urgency: string) => {
      switch (urgency) {
        case 'immediate': return <WarningIcon color="error" />;
        case 'short-term': return <ScheduleIcon color="warning" />;
        default: return <InfoIcon color="info" />;
      }
    };

    return (
      <Card key={insight.id} sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
            <Typography variant="h6" component="h3">
              {insight.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip label={insight.impact} color={getImpactColor(insight.impact) as any} size="small" />
              <Chip label={insight.category} variant="outlined" size="small" />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {getUrgencyIcon(insight.urgency)}
            <Typography variant="body2" sx={{ ml: 1 }}>
              {insight.urgency} priority
            </Typography>
          </Box>

          <Typography variant="body1" paragraph>
            {insight.description}
          </Typography>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Recommendations:
          </Typography>
          <List dense>
            {insight.recommendations.map((rec, index) => (
              <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 24 }}>
                  <CheckCircleIcon sx={{ fontSize: 18 }} color="primary" />
                </ListItemIcon>
                <ListItemText primary={rec} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  };

  const renderStrategicChart = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Strategic Performance Radar
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={strategicMetrics.map(metric => ({
            name: metric.name,
            current: metric.value,
            benchmark: metric.benchmark,
            industry: metric.industry
          }))}>
            <PolarGrid />
            <PolarAngleAxis dataKey="name" />
            <PolarRadiusAxis angle={90} domain={[0, 'dataMax']} />
            <Radar name="Current" dataKey="current" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            <Radar name="Benchmark" dataKey="benchmark" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.2} />
            <Radar name="Industry" dataKey="industry" stroke="#ffc658" fill="#ffc658" fillOpacity={0.2} />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  const renderExecutiveOverview = () => (
    <Grid container spacing={3}>
      {/* KPI Overview */}
      <Grid item xs={12}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          Executive KPIs Overview
        </Typography>
        <Grid container spacing={2}>
          {kpis.map(renderKPICard)}
        </Grid>
      </Grid>

      {/* Strategic Performance */}
      <Grid item xs={12} md={6}>
        {renderStrategicChart()}
      </Grid>

      {/* Key Insights */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Critical Insights & Actions
            </Typography>
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {insightsByUrgency.slice(0, 3).map(renderInsightCard)}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <NavigationHeader title="Executive Dashboard" />
      
      <Box sx={{ p: 3 }}>
        {/* Header Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Executive Dashboard
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Timeframe</InputLabel>
              <Select
                value={selectedTimeframe}
                label="Timeframe"
                onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              >
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
                <MenuItem value="90d">Last 90 Days</MenuItem>
                <MenuItem value="1y">Last Year</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={refreshInterval !== null}
                  onChange={(e) => setRefreshInterval(e.target.checked ? 30000 : null)}
                />
              }
              label="Auto-refresh"
            />

            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              size="small"
            >
              Export
            </Button>

            <IconButton onClick={loadDashboardData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Loading executive dashboard data...
            </Typography>
          </Box>
        )}

        {/* Dashboard Content */}
        {!loading && (
          <>
            {/* Quick Status Bar */}
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Card sx={{ bgcolor: 'success.main', color: 'success.contrastText' }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CheckCircleIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">
                          {kpis.filter(k => k.status === 'excellent').length} Excellent
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TrendingUpIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">
                          {kpis.filter(k => k.status === 'good').length} Good
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Card sx={{ bgcolor: 'warning.main', color: 'warning.contrastText' }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <WarningIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">
                          {kpis.filter(k => k.status === 'warning').length} Warning
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Card sx={{ bgcolor: 'error.main', color: 'error.contrastText' }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <WarningIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">
                          {kpis.filter(k => k.status === 'critical').length} Critical
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>

            {/* Main Dashboard */}
            {renderExecutiveOverview()}
          </>
        )}
      </Box>
    </Box>
  );
};

export default ExecutiveDashboard;