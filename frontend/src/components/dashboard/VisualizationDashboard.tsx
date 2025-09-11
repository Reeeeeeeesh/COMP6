import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Timeline as TimelineIcon,
  ScatterPlot as ScatterPlotIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Fullscreen as FullscreenIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { AdvancedVisualizationLibrary, ChartType, VisualizationData } from '../visualization/AdvancedVisualizationLibrary';
import { InteractiveHeatmap, HeatmapDataPoint } from '../visualization/InteractiveHeatmap';
import { RealTimeStreamChart, StreamChannel, StreamDataPoint } from '../visualization/RealTimeStreamChart';

interface VisualizationDashboardProps {
  userId?: string;
  tenantId?: string;
  refreshTrigger?: number;
}

interface VisualizationConfig {
  id: string;
  title: string;
  type: 'advanced' | 'heatmap' | 'stream';
  chartType?: ChartType;
  data: any;
  config: any;
  isEnabled: boolean;
  position: { row: number; col: number; };
  size: { width: number; height: number; };
}

interface DashboardSettings {
  autoRefresh: boolean;
  refreshInterval: number;
  theme: 'light' | 'dark' | 'auto';
  showLegends: boolean;
  showTooltips: boolean;
  animationsEnabled: boolean;
}

const VisualizationDashboard: React.FC<VisualizationDashboardProps> = ({
  userId,
  tenantId,
  refreshTrigger = 0
}) => {
  const [visualizations, setVisualizations] = useState<VisualizationConfig[]>([]);
  const [settings, setSettings] = useState<DashboardSettings>({
    autoRefresh: true,
    refreshInterval: 30000,
    theme: 'auto',
    showLegends: true,
    showTooltips: true,
    animationsEnabled: true
  });
  const [activeTab, setActiveTab] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreenViz, setFullscreenViz] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sample compensation-focused data generators
  const generateBonusDistributionData = (): VisualizationData[] => {
    return [
      { name: '0-5%', value: 120, category: 'Low', trend: 5 },
      { name: '5-10%', value: 340, category: 'Medium', trend: 12 },
      { name: '10-15%', value: 580, category: 'High', trend: 8 },
      { name: '15-20%', value: 290, category: 'Very High', trend: -3 },
      { name: '20%+', value: 85, category: 'Exceptional', trend: 15 }
    ];
  };

  const generateSalaryHeatmapData = (): HeatmapDataPoint[] => {
    const departments = ['Fixed Income', 'Equities', 'Real Estate', 'Alternatives', 'Multi-Asset'];
    const levels = ['Analyst', 'Associate', 'VP', 'Director', 'MD'];
    const data: HeatmapDataPoint[] = [];

    departments.forEach((dept, deptIndex) => {
      levels.forEach((level, levelIndex) => {
        data.push({
          x: dept,
          y: level,
          value: Math.random() * 100 + 50 + (levelIndex * 20) + (deptIndex * 5),
          label: `${dept} - ${level}`,
          metadata: {
            avgSalary: Math.random() * 200000 + 80000,
            employeeCount: Math.floor(Math.random() * 50) + 10,
            bonusRange: `${(Math.random() * 15 + 5).toFixed(1)}%-${(Math.random() * 25 + 15).toFixed(1)}%`
          }
        });
      });
    });

    return data;
  };

  const generateRealTimeStreams = (): StreamChannel[] => {
    return [
      {
        id: 'bonus-calculations',
        name: 'Bonus Calculations/sec',
        color: '#3B82F6',
        unit: 'calc/s',
        data: [],
        isActive: true,
        alertThresholds: {
          warning: { min: 50, max: 200 },
          error: { min: 20, max: 500 }
        }
      },
      {
        id: 'system-load',
        name: 'System Load',
        color: '#10B981',
        unit: '%',
        data: [],
        isActive: true,
        alertThresholds: {
          warning: { max: 80 },
          error: { max: 95 }
        }
      },
      {
        id: 'active-users',
        name: 'Active Users',
        color: '#F59E0B',
        unit: 'users',
        data: [],
        isActive: true
      }
    ];
  };

  const generatePerformanceMetricsData = (): VisualizationData[] => {
    return [
      { name: 'Q1 2024', value: 85, category: 'Performance', trend: 5, target: 90 },
      { name: 'Q2 2024', value: 92, category: 'Performance', trend: 8, target: 90 },
      { name: 'Q3 2024', value: 88, category: 'Performance', trend: -4, target: 90 },
      { name: 'Q4 2024', value: 95, category: 'Performance', trend: 7, target: 90 }
    ];
  };

  useEffect(() => {
    const initializeVisualizations = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize default visualization configurations
        const defaultVisualizations: VisualizationConfig[] = [
          {
            id: 'bonus-distribution',
            title: 'Bonus Distribution Analysis',
            type: 'advanced',
            chartType: 'bar',
            data: generateBonusDistributionData(),
            config: {
              showLegend: true,
              showTooltip: true,
              colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
              xAxis: { dataKey: 'name', label: 'Bonus Range' },
              yAxis: { label: 'Employee Count' }
            },
            isEnabled: true,
            position: { row: 0, col: 0 },
            size: { width: 6, height: 400 }
          },
          {
            id: 'salary-heatmap',
            title: 'Salary Distribution Heatmap',
            type: 'heatmap',
            data: generateSalaryHeatmapData(),
            config: {
              colorScheme: 'sequential',
              showTooltip: true,
              cellSize: { width: 80, height: 60 },
              margin: { top: 40, right: 40, bottom: 60, left: 80 }
            },
            isEnabled: true,
            position: { row: 0, col: 6 },
            size: { width: 6, height: 400 }
          },
          {
            id: 'performance-trends',
            title: 'Performance Trends',
            type: 'advanced',
            chartType: 'line',
            data: generatePerformanceMetricsData(),
            config: {
              showLegend: true,
              showTooltip: true,
              colors: ['#3B82F6'],
              xAxis: { dataKey: 'name', label: 'Quarter' },
              yAxis: { label: 'Performance Score' },
              showTarget: true
            },
            isEnabled: true,
            position: { row: 1, col: 0 },
            size: { width: 6, height: 350 }
          },
          {
            id: 'real-time-metrics',
            title: 'Real-Time System Metrics',
            type: 'stream',
            data: generateRealTimeStreams(),
            config: {
              updateInterval: 2000,
              maxDataPoints: 50,
              showLegend: true,
              showAlerts: true
            },
            isEnabled: true,
            position: { row: 1, col: 6 },
            size: { width: 6, height: 350 }
          },
          {
            id: 'department-comparison',
            title: 'Department Bonus Comparison',
            type: 'advanced',
            chartType: 'radar',
            data: [
              { name: 'Fixed Income', performance: 85, satisfaction: 90, retention: 88, growth: 75 },
              { name: 'Equities', performance: 92, satisfaction: 85, retention: 90, growth: 85 },
              { name: 'Real Estate', performance: 78, satisfaction: 88, retention: 85, growth: 70 },
              { name: 'Alternatives', performance: 88, satisfaction: 92, retention: 92, growth: 90 }
            ],
            config: {
              showLegend: true,
              showTooltip: true,
              polarGrid: true,
              domains: [
                { dataKey: 'performance', name: 'Performance', domain: [0, 100] },
                { dataKey: 'satisfaction', name: 'Satisfaction', domain: [0, 100] },
                { dataKey: 'retention', name: 'Retention', domain: [0, 100] },
                { dataKey: 'growth', name: 'Growth', domain: [0, 100] }
              ]
            },
            isEnabled: true,
            position: { row: 2, col: 0 },
            size: { width: 12, height: 400 }
          }
        ];

        setVisualizations(defaultVisualizations);
      } catch (err) {
        console.error('Error initializing visualizations:', err);
        setError('Failed to initialize visualization dashboard');
      } finally {
        setLoading(false);
      }
    };

    initializeVisualizations();
  }, [userId, tenantId, refreshTrigger]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!settings.autoRefresh) return;

    const interval = setInterval(() => {
      // Update data for each visualization
      setVisualizations(prev => prev.map(viz => ({
        ...viz,
        data: viz.type === 'advanced' && viz.chartType !== 'radar' 
          ? generateBonusDistributionData()
          : viz.data
      })));
    }, settings.refreshInterval);

    return () => clearInterval(interval);
  }, [settings.autoRefresh, settings.refreshInterval]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSettingsChange = (key: keyof DashboardSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleFullscreen = (vizId: string) => {
    setFullscreenViz(vizId);
  };

  const handleExport = (vizId: string, format: 'png' | 'svg' | 'pdf') => {
    // Implementation would export the specific visualization
    console.log(`Exporting ${vizId} as ${format}`);
  };

  const renderVisualization = (viz: VisualizationConfig, fullscreen: boolean = false) => {
    const commonProps = {
      key: viz.id,
      title: viz.title,
      width: fullscreen ? '100%' : viz.size.width,
      height: fullscreen ? 600 : viz.size.height
    };

    switch (viz.type) {
      case 'advanced':
        return (
          <AdvancedVisualizationLibrary
            {...commonProps}
            type={viz.chartType!}
            data={viz.data}
            config={viz.config}
            theme={settings.theme}
            showLegend={settings.showLegends && viz.config.showLegend}
            showTooltip={settings.showTooltips && viz.config.showTooltip}
            enableAnimations={settings.animationsEnabled}
          />
        );

      case 'heatmap':
        return (
          <InteractiveHeatmap
            {...commonProps}
            data={viz.data}
            colorScheme={viz.config.colorScheme}
            showTooltip={settings.showTooltips && viz.config.showTooltip}
            cellSize={viz.config.cellSize}
            margin={viz.config.margin}
          />
        );

      case 'stream':
        return (
          <RealTimeStreamChart
            {...commonProps}
            channels={viz.data}
            updateInterval={viz.config.updateInterval}
            maxDataPoints={viz.config.maxDataPoints}
            showLegend={settings.showLegends && viz.config.showLegend}
            showAlerts={viz.config.showAlerts}
          />
        );

      default:
        return <Alert severity="warning">Unknown visualization type: {viz.type}</Alert>;
    }
  };

  const filteredVisualizations = visualizations.filter(viz => viz.isEnabled);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Typography>Loading visualization dashboard...</Typography>
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

  return (
    <Box sx={{ width: '100%', padding: 2 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ padding: 2, marginBottom: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" gutterBottom>
              Advanced Visualization Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Comprehensive analytics and real-time insights for compensation management
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Tooltip title="Refresh Data">
              <IconButton onClick={() => window.location.reload()}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Dashboard Settings">
              <IconButton onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Navigation Tabs */}
      <Paper elevation={1} sx={{ marginBottom: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="All Visualizations" icon={<DashboardIcon />} />
          <Tab label="Performance Analytics" icon={<TimelineIcon />} />
          <Tab label="Distribution Analysis" icon={<BarChartIcon />} />
          <Tab label="Real-Time Monitoring" icon={<ScatterPlotIcon />} />
        </Tabs>
      </Paper>

      {/* Status Indicators */}
      <Box display="flex" gap={2} marginBottom={3}>
        <Chip 
          label={`${filteredVisualizations.length} Active Charts`} 
          color="primary" 
          variant="outlined" 
        />
        <Chip 
          label={settings.autoRefresh ? `Auto-refresh: ${settings.refreshInterval/1000}s` : 'Manual refresh'} 
          color={settings.autoRefresh ? 'success' : 'default'} 
          variant="outlined" 
        />
        <Chip 
          label={`Theme: ${settings.theme}`} 
          color="secondary" 
          variant="outlined" 
        />
      </Box>

      {/* Visualization Grid */}
      <Grid container spacing={3}>
        {filteredVisualizations
          .filter((viz, index) => {
            switch (activeTab) {
              case 1: return viz.chartType === 'line' || viz.chartType === 'radar';
              case 2: return viz.chartType === 'bar' || viz.type === 'heatmap';
              case 3: return viz.type === 'stream';
              default: return true;
            }
          })
          .map((viz) => (
            <Grid item xs={12} md={viz.size.width} key={viz.id}>
              <Card elevation={3}>
                <CardHeader
                  title={viz.title}
                  action={
                    <Box>
                      <Tooltip title="Export">
                        <IconButton onClick={() => handleExport(viz.id, 'png')}>
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Fullscreen">
                        <IconButton onClick={() => handleFullscreen(viz.id)}>
                          <FullscreenIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                  titleTypographyProps={{ variant: 'h6' }}
                />
                <CardContent>
                  {renderVisualization(viz)}
                </CardContent>
              </Card>
            </Grid>
          ))}
      </Grid>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dashboard Settings</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} paddingTop={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoRefresh}
                  onChange={(e) => handleSettingsChange('autoRefresh', e.target.checked)}
                />
              }
              label="Auto-refresh data"
            />
            
            <FormControl fullWidth>
              <InputLabel>Refresh Interval</InputLabel>
              <Select
                value={settings.refreshInterval}
                label="Refresh Interval"
                onChange={(e) => handleSettingsChange('refreshInterval', e.target.value)}
              >
                <MenuItem value={10000}>10 seconds</MenuItem>
                <MenuItem value={30000}>30 seconds</MenuItem>
                <MenuItem value={60000}>1 minute</MenuItem>
                <MenuItem value={300000}>5 minutes</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Theme</InputLabel>
              <Select
                value={settings.theme}
                label="Theme"
                onChange={(e) => handleSettingsChange('theme', e.target.value)}
              >
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
                <MenuItem value="auto">Auto</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showLegends}
                  onChange={(e) => handleSettingsChange('showLegends', e.target.checked)}
                />
              }
              label="Show legends"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showTooltips}
                  onChange={(e) => handleSettingsChange('showTooltips', e.target.checked)}
                />
              }
              label="Show tooltips"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.animationsEnabled}
                  onChange={(e) => handleSettingsChange('animationsEnabled', e.target.checked)}
                />
              }
              label="Enable animations"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Fullscreen Dialog */}
      <Dialog
        open={!!fullscreenViz}
        onClose={() => setFullscreenViz(null)}
        maxWidth="xl"
        fullWidth
        fullScreen
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {fullscreenViz && (
              <Typography variant="h5">
                {visualizations.find(v => v.id === fullscreenViz)?.title}
              </Typography>
            )}
            <Button onClick={() => setFullscreenViz(null)}>Close</Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {fullscreenViz && (
            <Box height="calc(100vh - 200px)">
              {renderVisualization(
                visualizations.find(v => v.id === fullscreenViz)!,
                true
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default VisualizationDashboard;