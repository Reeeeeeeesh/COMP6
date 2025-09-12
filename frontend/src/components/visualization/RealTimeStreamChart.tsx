import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  Alert,
  LinearProgress,
  Badge
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  NotificationsActive as AlertIcon,
  Analytics as AnalyticsIcon
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
  ReferenceLine,
  Brush,
  Legend
} from 'recharts';

// Real-time Data Interfaces
export interface StreamDataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
  alert?: {
    level: 'info' | 'warning' | 'error';
    message: string;
  };
}

export interface StreamChannel {
  id: string;
  name: string;
  color: string;
  unit: string;
  data: StreamDataPoint[];
  isActive: boolean;
  alertThresholds?: {
    warning?: { min?: number; max?: number };
    error?: { min?: number; max?: number };
  };
}

export interface StreamConfig {
  maxDataPoints: number;
  updateInterval: number;
  autoScale: boolean;
  showGrid: boolean;
  showLegend: boolean;
  timeWindow: number; // in milliseconds
  animation: {
    enabled: boolean;
    duration: number;
  };
  alerts: {
    enabled: boolean;
    sound: boolean;
    visual: boolean;
  };
}

interface RealTimeStreamChartProps {
  channels: StreamChannel[];
  config: StreamConfig;
  onDataReceived?: (channelId: string, data: StreamDataPoint) => void;
  onAlert?: (channelId: string, alert: { level: 'info' | 'warning' | 'error'; message: string }) => void;
  width?: number;
  height?: number;
  dataSource?: () => Promise<Record<string, StreamDataPoint>>;
}

// Utility Functions
const generateRandomData = (channelId: string): StreamDataPoint => {
  const baseValues = {
    'revenue': Math.random() * 1000000,
    'users': Math.random() * 10000,
    'performance': Math.random() * 100,
    'errors': Math.random() * 50
  };
  
  const baseValue = baseValues[channelId as keyof typeof baseValues] || Math.random() * 100;
  const variation = baseValue * 0.1;
  
  return {
    timestamp: Date.now(),
    value: baseValue + (Math.random() - 0.5) * variation,
    metadata: {
      source: 'random-generator',
      quality: Math.random() > 0.1 ? 'good' : 'poor'
    }
  };
};

const checkAlerts = (data: StreamDataPoint, thresholds?: StreamChannel['alertThresholds']) => {
  if (!thresholds) return null;
  
  const { value } = data;
  
  if (thresholds.error?.min && value < thresholds.error.min) {
    return { level: 'error' as const, message: `Value ${value.toFixed(2)} below critical minimum ${thresholds.error.min}` };
  }
  if (thresholds.error?.max && value > thresholds.error.max) {
    return { level: 'error' as const, message: `Value ${value.toFixed(2)} above critical maximum ${thresholds.error.max}` };
  }
  if (thresholds.warning?.min && value < thresholds.warning.min) {
    return { level: 'warning' as const, message: `Value ${value.toFixed(2)} below warning minimum ${thresholds.warning.min}` };
  }
  if (thresholds.warning?.max && value > thresholds.warning.max) {
    return { level: 'warning' as const, message: `Value ${value.toFixed(2)} above warning maximum ${thresholds.warning.max}` };
  }
  
  return null;
};

export const RealTimeStreamChart: React.FC<RealTimeStreamChartProps> = ({
  channels: initialChannels,
  config,
  onDataReceived,
  onAlert,
  width,
  height,
  dataSource
}) => {
  const [channels, setChannels] = useState<StreamChannel[]>(initialChannels);
  const [isPlaying, setIsPlaying] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    channelId: string;
    level: 'info' | 'warning' | 'error';
    message: string;
    timestamp: number;
  }>>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [dataRate, setDataRate] = useState(0);
  const [totalDataPoints, setTotalDataPoints] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const alertCountRef = useRef(0);

  // Combined data for visualization
  const combinedData = useMemo(() => {
    if (channels.length === 0) return [];

    // Get all timestamps from all channels
    const allTimestamps = new Set<number>();
    channels.forEach(channel => {
      channel.data.forEach(point => allTimestamps.add(point.timestamp));
    });

    // Sort timestamps and limit to time window
    const sortedTimestamps = Array.from(allTimestamps).sort();
    const cutoffTime = Date.now() - config.timeWindow;
    const filteredTimestamps = sortedTimestamps.filter(ts => ts >= cutoffTime);

    // Create combined data structure
    return filteredTimestamps.map(timestamp => {
      const dataPoint: any = { timestamp };
      
      channels.forEach(channel => {
        const point = channel.data.find(p => p.timestamp === timestamp);
        dataPoint[channel.id] = point?.value;
      });

      return dataPoint;
    });
  }, [channels, config.timeWindow]);

  // Start/Stop streaming
  const toggleStreaming = useCallback(() => {
    if (isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setConnectionStatus('disconnected');
      setIsPlaying(false);
    } else {
      setConnectionStatus('connecting');
      
      intervalRef.current = setInterval(async () => {
        try {
          let newData: Record<string, StreamDataPoint>;
          
          if (dataSource) {
            newData = await dataSource();
          } else {
            // Generate mock data
            newData = {};
            channels.forEach(channel => {
              if (channel.isActive) {
                newData[channel.id] = generateRandomData(channel.id);
              }
            });
          }

          setChannels(prevChannels => {
            const updatedChannels = prevChannels.map(channel => {
              if (newData[channel.id] && channel.isActive) {
                const newPoint = newData[channel.id];
                
                // Check for alerts
                if (config.alerts.enabled) {
                  const alert = checkAlerts(newPoint, channel.alertThresholds);
                  if (alert) {
                    const alertId = `alert_${Date.now()}_${Math.random()}`;
                    setAlerts(prev => [...prev.slice(-19), {
                      id: alertId,
                      channelId: channel.id,
                      ...alert,
                      timestamp: newPoint.timestamp
                    }]);
                    
                    if (onAlert) {
                      onAlert(channel.id, alert);
                    }
                  }
                }

                // Add new data point
                const updatedData = [...channel.data, newPoint];
                
                // Trim old data
                if (updatedData.length > config.maxDataPoints) {
                  updatedData.shift();
                }

                // Filter by time window
                const cutoffTime = Date.now() - config.timeWindow;
                const filteredData = updatedData.filter(point => point.timestamp >= cutoffTime);

                if (onDataReceived) {
                  onDataReceived(channel.id, newPoint);
                }

                return { ...channel, data: filteredData };
              }
              return channel;
            });

            return updatedChannels;
          });

          setConnectionStatus('connected');
          setDataRate(prev => prev + 1);
          setTotalDataPoints(prev => prev + Object.keys(newData).length);
        } catch (error) {
          console.error('Error fetching stream data:', error);
          setConnectionStatus('disconnected');
        }
      }, config.updateInterval);

      setIsPlaying(true);
    }
  }, [isPlaying, channels, config, dataSource, onDataReceived, onAlert]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
    setConnectionStatus('disconnected');
    setDataRate(0);
  }, []);

  // Clear data
  const clearData = useCallback(() => {
    setChannels(prev => prev.map(channel => ({ ...channel, data: [] })));
    setAlerts([]);
    setTotalDataPoints(0);
  }, []);

  // Toggle channel
  const toggleChannel = useCallback((channelId: string) => {
    setChannels(prev => prev.map(channel => 
      channel.id === channelId ? { ...channel, isActive: !channel.isActive } : channel
    ));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Data rate counter reset
  useEffect(() => {
    const rateInterval = setInterval(() => {
      setDataRate(0);
    }, 1000);

    return () => clearInterval(rateInterval);
  }, []);

  const activeChannels = channels.filter(channel => channel.isActive);
  const latestAlerts = alerts.slice(-5);

  return (
    <Card sx={{ width: width || '100%', height: height || 'auto' }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" component="h3">
              Real-time Data Stream
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Chip
                label={connectionStatus}
                color={connectionStatus === 'connected' ? 'success' : connectionStatus === 'connecting' ? 'warning' : 'default'}
                size="small"
              />
              <Chip
                label={`${dataRate} pts/sec`}
                variant="outlined"
                size="small"
              />
              <Chip
                label={`${activeChannels.length} active`}
                variant="outlined"
                size="small"
              />
            </Box>
          </Box>

          {/* Controls */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
              <IconButton onClick={toggleStreaming} color="primary">
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Stop">
              <IconButton onClick={stopStreaming}>
                <StopIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Clear Data">
              <IconButton onClick={clearData}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Settings">
              <IconButton onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            {alerts.length > 0 && (
              <Tooltip title={`${alerts.length} alerts`}>
                <Badge badgeContent={alerts.length} color="error">
                  <IconButton>
                    <AlertIcon />
                  </IconButton>
                </Badge>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Channel Controls */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Data Channels
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {channels.map(channel => (
              <Chip
                key={channel.id}
                label={channel.name}
                onClick={() => toggleChannel(channel.id)}
                color={channel.isActive ? 'primary' : 'default'}
                variant={channel.isActive ? 'filled' : 'outlined'}
                sx={{
                  '& .MuiChip-label': {
                    color: channel.isActive ? 'white' : channel.color
                  },
                  backgroundColor: channel.isActive ? channel.color : 'transparent',
                  borderColor: channel.color
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Alerts */}
        {latestAlerts.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {latestAlerts.map(alert => (
              <Alert 
                key={alert.id} 
                severity={alert.level} 
                sx={{ mb: 1 }}
                onClose={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
              >
                <strong>{channels.find(c => c.id === alert.channelId)?.name}:</strong> {alert.message}
              </Alert>
            ))}
          </Box>
        )}

        {/* Chart */}
        <Box sx={{ height: 400, mb: 2 }}>
          {combinedData.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="body1" color="textSecondary">
                {isPlaying ? 'Waiting for data...' : 'Click play to start streaming data'}
              </Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedData}>
                {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis 
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                />
                <YAxis />
                <RechartsTooltip
                  labelFormatter={(timestamp: any) => new Date(timestamp).toLocaleString()}
                  formatter={(value: any, name: string) => [
                    typeof value === 'number' ? value.toFixed(2) : value,
                    channels.find(c => c.id === name)?.name || name
                  ]}
                />
                {config.showLegend && <Legend />}
                
                {activeChannels.map(channel => (
                  <Line
                    key={channel.id}
                    type="monotone"
                    dataKey={channel.id}
                    stroke={channel.color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    animationDuration={config.animation.enabled ? config.animation.duration : 0}
                  />
                ))}
                
                {/* Alert threshold lines */}
                {activeChannels.map(channel => (
                  <React.Fragment key={`thresholds-${channel.id}`}>
                    {channel.alertThresholds?.warning?.max && (
                      <ReferenceLine
                        y={channel.alertThresholds.warning.max}
                        stroke="orange"
                        strokeDasharray="5 5"
                        label={`${channel.name} Warning`}
                      />
                    )}
                    {channel.alertThresholds?.error?.max && (
                      <ReferenceLine
                        y={channel.alertThresholds.error.max}
                        stroke="red"
                        strokeDasharray="5 5"
                        label={`${channel.name} Critical`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Box>

        {/* Statistics */}
        <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary">
                Total Data Points
              </Typography>
              <Typography variant="h6">
                {totalDataPoints.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary">
                Data Rate
              </Typography>
              <Typography variant="h6">
                {dataRate} pts/sec
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary">
                Active Channels
              </Typography>
              <Typography variant="h6">
                {activeChannels.length}/{channels.length}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary">
                Total Alerts
              </Typography>
              <Typography variant="h6">
                {alerts.length}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </CardContent>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Stream Settings</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Update Interval</InputLabel>
                <Select
                  value={config.updateInterval}
                  label="Update Interval"
                  onChange={(e) => {
                    config.updateInterval = e.target.value as number;
                  }}
                >
                  <MenuItem value={100}>100ms (Fast)</MenuItem>
                  <MenuItem value={500}>500ms (Normal)</MenuItem>
                  <MenuItem value={1000}>1s (Slow)</MenuItem>
                  <MenuItem value={5000}>5s (Very Slow)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Max Data Points</InputLabel>
                <Select
                  value={config.maxDataPoints}
                  label="Max Data Points"
                  onChange={(e) => {
                    config.maxDataPoints = e.target.value as number;
                  }}
                >
                  <MenuItem value={50}>50 points</MenuItem>
                  <MenuItem value={100}>100 points</MenuItem>
                  <MenuItem value={500}>500 points</MenuItem>
                  <MenuItem value={1000}>1000 points</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.showGrid}
                    onChange={(e) => {
                      config.showGrid = e.target.checked;
                    }}
                  />
                }
                label="Show Grid"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.alerts.enabled}
                    onChange={(e) => {
                      config.alerts.enabled = e.target.checked;
                    }}
                  />
                }
                label="Enable Alerts"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.animation.enabled}
                    onChange={(e) => {
                      config.animation.enabled = e.target.checked;
                    }}
                  />
                }
                label="Enable Animations"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default RealTimeStreamChart;