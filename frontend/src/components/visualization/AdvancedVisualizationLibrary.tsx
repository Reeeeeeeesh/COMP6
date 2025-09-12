import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
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
  TextField,
  Slider,
  Switch,
  FormControlLabel,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  Fab,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert
} from '@mui/material';
import {
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  FilterList as FilterIcon,
  Zoom as ZoomIcon,
  TrendingUp as TrendingUpIcon,
  ScatterPlot as ScatterPlotIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Timeline as TimelineIcon,
  Map as MapIcon,
  BubbleChart as BubbleChartIcon
} from '@mui/icons-material';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar,
  Treemap,
  Sankey,
  FunnelChart,
  Funnel,
  LineChart,
  AreaChart,
  BarChart as RechartsBarChart,
  Surface,
  ReferenceLine,
  ReferenceArea,
  Brush,
  ErrorBar
} from 'recharts';

// Advanced Chart Types
export type ChartType = 
  | 'line' | 'area' | 'bar' | 'pie' | 'scatter' | 'bubble' | 'radar' 
  | 'heatmap' | 'treemap' | 'sankey' | 'funnel' | 'waterfall' 
  | 'candlestick' | 'gauge' | 'speedometer' | 'sunburst' | 'parallel'
  | 'box_plot' | 'violin' | 'density' | 'correlation_matrix';

export interface AdvancedDataPoint {
  id: string;
  timestamp?: string | number;
  category?: string;
  subcategory?: string;
  value: number;
  secondaryValue?: number;
  metadata?: Record<string, any>;
  color?: string;
  size?: number;
  label?: string;
}

export interface ChartConfiguration {
  type: ChartType;
  title: string;
  subtitle?: string;
  xAxis?: {
    label: string;
    type: 'category' | 'number' | 'time';
    scale?: 'linear' | 'log' | 'sqrt';
    domain?: [number, number];
    tickCount?: number;
    format?: string;
  };
  yAxis?: {
    label: string;
    type: 'number' | 'category';
    scale?: 'linear' | 'log' | 'sqrt';
    domain?: [number, number];
    tickCount?: number;
    format?: string;
  };
  colors?: string[];
  theme?: 'light' | 'dark' | 'colorful' | 'minimal' | 'corporate';
  animation?: {
    enabled: boolean;
    duration: number;
    easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
    delay?: number;
  };
  interaction?: {
    zoom: boolean;
    pan: boolean;
    brush: boolean;
    crossfilter: boolean;
    tooltip: 'standard' | 'detailed' | 'custom' | 'none';
    clickHandler?: (data: any) => void;
    hoverHandler?: (data: any) => void;
  };
  realtime?: {
    enabled: boolean;
    interval: number;
    maxDataPoints: number;
    autoScale: boolean;
  };
}

export interface VisualizationProps {
  data: AdvancedDataPoint[];
  config: ChartConfiguration;
  width?: number;
  height?: number;
  onExport?: (format: 'png' | 'svg' | 'pdf' | 'csv') => void;
  onDataUpdate?: (data: AdvancedDataPoint[]) => void;
  isRealTime?: boolean;
  loading?: boolean;
}

// Color Themes
const themes = {
  light: {
    background: '#ffffff',
    text: '#333333',
    grid: '#e0e0e0',
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16']
  },
  dark: {
    background: '#1a1a1a',
    text: '#ffffff',
    grid: '#404040',
    colors: ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#22D3EE', '#FB923C', '#A3E635']
  },
  colorful: {
    background: '#fafafa',
    text: '#333333',
    grid: '#e8e8e8',
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9']
  },
  minimal: {
    background: '#ffffff',
    text: '#666666',
    grid: '#f0f0f0',
    colors: ['#2E3440', '#3B4252', '#434C5E', '#4C566A', '#5E81AC', '#81A1C1', '#88C0D0', '#8FBCBB']
  },
  corporate: {
    background: '#ffffff',
    text: '#2D3748',
    grid: '#E2E8F0',
    colors: ['#2B6CB0', '#2C7A7B', '#D69E2E', '#C53030', '#553C9A', '#2C5282', '#00A3C4', '#38A169']
  }
};

// Advanced Chart Components
export const AdvancedLineChart: React.FC<{
  data: AdvancedDataPoint[];
  config: ChartConfiguration;
  theme: keyof typeof themes;
}> = ({ data, config, theme }) => {
  const themeColors = themes[theme];
  
  const processedData = useMemo(() => {
    return data.map(point => ({
      x: point.timestamp || point.category,
      y: point.value,
      y2: point.secondaryValue,
      category: point.category,
      ...point.metadata
    }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={processedData}>
        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
        <XAxis 
          dataKey="x" 
          tick={{ fill: themeColors.text, fontSize: 12 }}
          axisLine={{ stroke: themeColors.text }}
        />
        <YAxis 
          tick={{ fill: themeColors.text, fontSize: 12 }}
          axisLine={{ stroke: themeColors.text }}
        />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: themeColors.background,
            border: `1px solid ${themeColors.grid}`,
            borderRadius: '8px',
            color: themeColors.text
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="y"
          stroke={themeColors.colors[0]}
          strokeWidth={3}
          dot={{ fill: themeColors.colors[0], strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: themeColors.colors[0], strokeWidth: 2 }}
          animationDuration={config.animation?.duration || 1000}
        />
        {data.some(d => d.secondaryValue !== undefined) && (
          <Line
            type="monotone"
            dataKey="y2"
            stroke={themeColors.colors[1]}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: themeColors.colors[1], strokeWidth: 2, r: 3 }}
            animationDuration={config.animation?.duration || 1000}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};

export const AdvancedScatterChart: React.FC<{
  data: AdvancedDataPoint[];
  config: ChartConfiguration;
  theme: keyof typeof themes;
}> = ({ data, config, theme }) => {
  const themeColors = themes[theme];
  
  const processedData = useMemo(() => {
    return data.map(point => ({
      x: point.value,
      y: point.secondaryValue || 0,
      z: point.size || 100,
      category: point.category,
      ...point.metadata
    }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart data={processedData}>
        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
        <XAxis 
          type="number" 
          dataKey="x"
          tick={{ fill: themeColors.text, fontSize: 12 }}
          axisLine={{ stroke: themeColors.text }}
        />
        <YAxis 
          type="number" 
          dataKey="y"
          tick={{ fill: themeColors.text, fontSize: 12 }}
          axisLine={{ stroke: themeColors.text }}
        />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: themeColors.background,
            border: `1px solid ${themeColors.grid}`,
            borderRadius: '8px',
            color: themeColors.text
          }}
        />
        <Scatter
          name="Data Points"
          dataKey="z"
          fill={themeColors.colors[0]}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export const AdvancedComposedChart: React.FC<{
  data: AdvancedDataPoint[];
  config: ChartConfiguration;
  theme: keyof typeof themes;
}> = ({ data, config, theme }) => {
  const themeColors = themes[theme];
  
  const processedData = useMemo(() => {
    return data.map(point => ({
      name: point.category,
      value: point.value,
      secondaryValue: point.secondaryValue,
      ...point.metadata
    }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={processedData}>
        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
        <XAxis 
          dataKey="name"
          tick={{ fill: themeColors.text, fontSize: 12 }}
          axisLine={{ stroke: themeColors.text }}
        />
        <YAxis 
          tick={{ fill: themeColors.text, fontSize: 12 }}
          axisLine={{ stroke: themeColors.text }}
        />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: themeColors.background,
            border: `1px solid ${themeColors.grid}`,
            borderRadius: '8px',
            color: themeColors.text
          }}
        />
        <Legend />
        <Bar dataKey="value" fill={themeColors.colors[0]} />
        <Line type="monotone" dataKey="secondaryValue" stroke={themeColors.colors[1]} strokeWidth={3} />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export const AdvancedTreemap: React.FC<{
  data: AdvancedDataPoint[];
  config: ChartConfiguration;
  theme: keyof typeof themes;
}> = ({ data, config, theme }) => {
  const themeColors = themes[theme];
  
  const processedData = useMemo(() => {
    return data.map(point => ({
      name: point.category || point.label,
      size: point.value,
      fill: point.color || themeColors.colors[Math.floor(Math.random() * themeColors.colors.length)]
    }));
  }, [data, themeColors.colors]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <Treemap
        data={processedData}
        dataKey="size"
        aspectRatio={4 / 3}
        stroke={themeColors.text}
        fill={themeColors.colors[0]}
      />
    </ResponsiveContainer>
  );
};

// Main Advanced Visualization Component
export const AdvancedVisualization: React.FC<VisualizationProps> = ({
  data,
  config,
  width,
  height,
  onExport,
  onDataUpdate,
  isRealTime = false,
  loading = false
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<keyof typeof themes>(config.theme || 'light');
  const [isPlaying, setIsPlaying] = useState(isRealTime && config.realtime?.enabled);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);

  // Real-time data simulation
  useEffect(() => {
    if (!isPlaying || !config.realtime?.enabled) return;

    const interval = setInterval(() => {
      if (onDataUpdate) {
        const newDataPoint: AdvancedDataPoint = {
          id: `realtime_${Date.now()}`,
          timestamp: Date.now(),
          value: Math.random() * 100,
          secondaryValue: Math.random() * 50,
          category: 'Real-time'
        };
        
        const updatedData = [...data, newDataPoint];
        if (updatedData.length > (config.realtime?.maxDataPoints || 100)) {
          updatedData.shift();
        }
        
        onDataUpdate(updatedData);
      }
    }, config.realtime?.interval || 1000);

    return () => clearInterval(interval);
  }, [isPlaying, config.realtime, data, onDataUpdate]);

  const handleExport = (format: 'png' | 'svg' | 'pdf' | 'csv') => {
    if (onExport) {
      onExport(format);
    }
    setExportMenuAnchor(null);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const renderChart = () => {
    switch (config.type) {
      case 'line':
        return <AdvancedLineChart data={data} config={config} theme={currentTheme} />;
      case 'scatter':
      case 'bubble':
        return <AdvancedScatterChart data={data} config={config} theme={currentTheme} />;
      case 'treemap':
        return <AdvancedTreemap data={data} config={config} theme={currentTheme} />;
      default:
        return <AdvancedComposedChart data={data} config={config} theme={currentTheme} />;
    }
  };

  return (
    <Card sx={{ width: width || '100%', height: height || 'auto' }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" component="h3">
              {config.title}
            </Typography>
            {config.subtitle && (
              <Typography variant="body2" color="textSecondary">
                {config.subtitle}
              </Typography>
            )}
          </Box>

          {/* Controls */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {config.realtime?.enabled && (
              <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
                <IconButton onClick={togglePlayback} size="small">
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Settings">
              <IconButton onClick={() => setSettingsOpen(true)} size="small">
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Export">
              <IconButton 
                onClick={(e) => setExportMenuAnchor(e.currentTarget)} 
                size="small"
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              <IconButton onClick={toggleFullscreen} size="small">
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Chart Content */}
        <Box sx={{ position: 'relative', minHeight: 300 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
              <Typography>Loading visualization...</Typography>
            </Box>
          ) : data.length === 0 ? (
            <Alert severity="info">No data available for visualization</Alert>
          ) : (
            renderChart()
          )}
        </Box>

        {/* Data Summary */}
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary">
                Data Points
              </Typography>
              <Typography variant="h6">
                {data.length.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary">
                Chart Type
              </Typography>
              <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                {config.type.replace('_', ' ')}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary">
                Theme
              </Typography>
              <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                {currentTheme}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary">
                Real-time
              </Typography>
              <Typography variant="h6">
                {isPlaying ? 'Active' : 'Inactive'}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </CardContent>

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={() => setExportMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleExport('png')}>
          <ListItemIcon><DownloadIcon /></ListItemIcon>
          <ListItemText>Export as PNG</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('svg')}>
          <ListItemIcon><DownloadIcon /></ListItemIcon>
          <ListItemText>Export as SVG</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('pdf')}>
          <ListItemIcon><DownloadIcon /></ListItemIcon>
          <ListItemText>Export as PDF</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleExport('csv')}>
          <ListItemIcon><DownloadIcon /></ListItemIcon>
          <ListItemText>Export Data as CSV</ListItemText>
        </MenuItem>
      </Menu>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Visualization Settings</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={currentTheme}
                  label="Theme"
                  onChange={(e) => setCurrentTheme(e.target.value as keyof typeof themes)}
                >
                  {Object.keys(themes).map((theme) => (
                    <MenuItem key={theme} value={theme}>
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {config.realtime?.enabled && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isPlaying}
                      onChange={(e) => setIsPlaying(e.target.checked)}
                    />
                  }
                  label="Enable Real-time Updates"
                />
              </Grid>
            )}

            {config.animation && (
              <Grid item xs={12}>
                <Typography gutterBottom>Animation Duration (ms)</Typography>
                <Slider
                  value={config.animation.duration}
                  min={0}
                  max={5000}
                  step={100}
                  valueLabelDisplay="auto"
                  onChange={(_, value) => {
                    if (config.animation) {
                      config.animation.duration = value as number;
                    }
                  }}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Fullscreen Dialog */}
      <Dialog
        open={isFullscreen}
        onClose={toggleFullscreen}
        maxWidth={false}
        fullWidth
        PaperProps={{ sx: { width: '95vw', height: '90vh' } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5">{config.title}</Typography>
            <IconButton onClick={toggleFullscreen}>
              <FullscreenExitIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ height: '70vh' }}>
            {renderChart()}
          </Box>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export { AdvancedVisualization as AdvancedVisualizationLibrary };