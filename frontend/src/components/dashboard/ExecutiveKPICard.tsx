import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Alert,
  Grid
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Speed as SpeedIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { ExecutiveKPI } from '../../services/executiveDashboardService';

interface ExecutiveKPICardProps {
  kpi: ExecutiveKPI;
  showDetails?: boolean;
  showTrend?: boolean;
  showActions?: boolean;
  onActionClick?: (action: string, kpiId: string) => void;
  compact?: boolean;
}

interface KPITrendData {
  period: string;
  value: number;
  target: number;
}

export const ExecutiveKPICard: React.FC<ExecutiveKPICardProps> = ({
  kpi,
  showDetails = true,
  showTrend = true,
  showActions = true,
  onActionClick,
  compact = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Mock trend data - in production, this would come from props or API
  const trendData: KPITrendData[] = [
    { period: 'Jan', value: kpi.previousValue * 0.85, target: kpi.target * 0.9 },
    { period: 'Feb', value: kpi.previousValue * 0.92, target: kpi.target * 0.9 },
    { period: 'Mar', value: kpi.previousValue, target: kpi.target * 0.95 },
    { period: 'Apr', value: kpi.value * 0.95, target: kpi.target },
    { period: 'May', value: kpi.value, target: kpi.target }
  ];

  // Utility Functions
  const formatValue = (value: number, unit: string) => {
    switch (unit) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          notation: value > 1000000 ? 'compact' : 'standard'
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const getChangeValue = () => {
    return ((kpi.value - kpi.previousValue) / kpi.previousValue) * 100;
  };

  const getProgressToTarget = () => {
    return Math.min((kpi.value / kpi.target) * 100, 100);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon color="success" fontSize="small" />;
      case 'down':
        return <TrendingDownIcon color="error" fontSize="small" />;
      default:
        return <SpeedIcon color="action" fontSize="small" />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'primary' | 'warning' | 'error' => {
    switch (status) {
      case 'excellent': return 'success';
      case 'good': return 'primary';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'primary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircleIcon color="success" />;
      case 'good': return <CheckCircleIcon color="primary" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'critical': return <ErrorIcon color="error" />;
      default: return <InfoIcon color="primary" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      financial: '#1976d2',
      operational: '#2e7d32',
      strategic: '#7b1fa2',
      people: '#ed6c02'
    };
    return colors[category as keyof typeof colors] || '#666';
  };

  const handleActionClick = (action: string) => {
    if (onActionClick) {
      onActionClick(action, kpi.id);
    }
  };

  const changeValue = getChangeValue();
  const progressToTarget = getProgressToTarget();

  if (compact) {
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
              {kpi.name}
            </Typography>
            <Chip 
              label={kpi.status} 
              color={getStatusColor(kpi.status)}
              size="small"
              sx={{ fontSize: '0.6rem', height: 20 }}
            />
          </Box>
          
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
            {formatValue(kpi.value, kpi.unit)}
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getTrendIcon(kpi.trend)}
              <Typography variant="caption" color={changeValue >= 0 ? 'success.main' : 'error.main'}>
                {changeValue >= 0 ? '+' : ''}{changeValue.toFixed(1)}%
              </Typography>
            </Box>
            <Typography variant="caption" color="textSecondary">
              {formatValue(kpi.target, kpi.unit)}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          '&:hover': {
            boxShadow: 4
          }
        }}
      >
        {/* Category Indicator */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            bgcolor: getCategoryColor(kpi.category),
            borderRadius: '4px 4px 0 0'
          }}
        />

        <CardContent sx={{ flexGrow: 1, pt: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" component="h3" sx={{ fontSize: '1rem', fontWeight: 600, mb: 0.5 }}>
                {kpi.name}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase' }}>
                {kpi.category}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                label={kpi.status} 
                color={getStatusColor(kpi.status)}
                size="small"
                icon={getStatusIcon(kpi.status)}
              />
              <Tooltip title="Confidence Level">
                <Chip 
                  label={`${(kpi.confidenceLevel * 100).toFixed(0)}%`}
                  variant="outlined"
                  size="small"
                />
              </Tooltip>
            </Box>
          </Box>
          
          {/* Main Value */}
          <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 2 }}>
            <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', mr: 1, fontSize: '2rem' }}>
              {formatValue(kpi.value, kpi.unit)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getTrendIcon(kpi.trend)}
              <Typography 
                variant="body2" 
                color={changeValue >= 0 ? 'success.main' : 'error.main'}
                sx={{ fontWeight: 'medium' }}
              >
                {changeValue >= 0 ? '+' : ''}{changeValue.toFixed(1)}%
              </Typography>
            </Box>
          </Box>

          {/* Progress to Target */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Progress to Target
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {formatValue(kpi.target, kpi.unit)}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progressToTarget}
              color={progressToTarget >= 100 ? 'success' : progressToTarget >= 80 ? 'primary' : 'warning'}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
              {progressToTarget.toFixed(1)}% of target achieved
            </Typography>
          </Box>

          {/* Description */}
          {showDetails && (
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              {kpi.description}
            </Typography>
          )}

          {/* Trend Chart */}
          {showTrend && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Trend (Last 5 Periods)
              </Typography>
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={trendData}>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={getCategoryColor(kpi.category)}
                    fill={getCategoryColor(kpi.category)}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#666"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                  />
                  <XAxis dataKey="period" hide />
                  <YAxis hide />
                  <RechartsTooltip
                    formatter={(value: any, name: string) => [
                      formatValue(value, kpi.unit),
                      name === 'value' ? 'Current' : 'Target'
                    ]}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          )}

          {/* Action Items Preview */}
          {showActions && kpi.actionItems.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
                  Action Items ({kpi.actionItems.length})
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setExpanded(!expanded)}
                  sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}
                >
                  <ExpandMoreIcon />
                </IconButton>
              </Box>
              
              <Collapse in={expanded}>
                <List dense sx={{ pt: 1 }}>
                  {kpi.actionItems.slice(0, 3).map((item, index) => (
                    <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <CheckCircleIcon sx={{ fontSize: 16 }} color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={item}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                  {kpi.actionItems.length > 3 && (
                    <ListItem sx={{ py: 0.5, px: 0 }}>
                      <ListItemText
                        primary={`+${kpi.actionItems.length - 3} more actions...`}
                        primaryTypographyProps={{ variant: 'caption', color: 'textSecondary' }}
                      />
                    </ListItem>
                  )}
                </List>
              </Collapse>
            </Box>
          )}
        </CardContent>

        {/* Card Actions */}
        <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1 }}>
          <Typography variant="caption" color="textSecondary">
            Updated: {new Date(kpi.lastUpdated).toLocaleDateString()}
          </Typography>
          <Box>
            <Tooltip title="View Details">
              <IconButton size="small" onClick={() => setDetailsOpen(true)}>
                <InfoIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="View Analytics">
              <IconButton size="small" onClick={() => handleActionClick('analytics')}>
                <AssessmentIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="View Timeline">
              <IconButton size="small" onClick={() => handleActionClick('timeline')}>
                <TimelineIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </CardActions>
      </Card>

      {/* Detailed View Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {getStatusIcon(kpi.status)}
            <Box>
              <Typography variant="h6">{kpi.name}</Typography>
              <Typography variant="caption" color="textSecondary">
                {kpi.category.charAt(0).toUpperCase() + kpi.category.slice(1)} KPI
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={3}>
            {/* Current Performance */}
            <Grid item xs={12} md={6}>
              <Alert 
                severity={kpi.status === 'excellent' ? 'success' : 
                          kpi.status === 'good' ? 'info' :
                          kpi.status === 'warning' ? 'warning' : 'error'}
                sx={{ mb: 2 }}
              >
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {formatValue(kpi.value, kpi.unit)}
                </Typography>
                <Typography variant="body2">
                  Current Performance ({kpi.status})
                </Typography>
              </Alert>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Previous Period: {formatValue(kpi.previousValue, kpi.unit)}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Target: {formatValue(kpi.target, kpi.unit)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Confidence: {(kpi.confidenceLevel * 100).toFixed(0)}%
                </Typography>
              </Box>
            </Grid>

            {/* Trend Chart */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Performance Trend
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <RechartsTooltip
                    formatter={(value: any, name: string) => [
                      formatValue(value, kpi.unit),
                      name === 'value' ? 'Actual' : 'Target'
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={getCategoryColor(kpi.category)}
                    strokeWidth={3}
                    dot={{ fill: getCategoryColor(kpi.category) }}
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#666"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Typography variant="body1" paragraph>
                {kpi.description}
              </Typography>
            </Grid>

            {/* Action Items */}
            {kpi.actionItems.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Recommended Actions
                </Typography>
                <List>
                  {kpi.actionItems.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircleIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              handleActionClick('drill-down');
              setDetailsOpen(false);
            }}
          >
            View Analytics
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};