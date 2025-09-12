import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Switch,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  Download as DownloadIcon,
  Palette as PaletteIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Info as InfoIcon
} from '@mui/icons-material';

// Heatmap Data Interfaces
export interface HeatmapDataPoint {
  x: string | number;
  y: string | number;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface HeatmapConfig {
  title: string;
  subtitle?: string;
  colorScheme: 'sequential' | 'diverging' | 'categorical';
  colorPalette: string[];
  minValue?: number;
  maxValue?: number;
  showLabels: boolean;
  showTooltips: boolean;
  cellSize: number;
  borderWidth: number;
  borderColor: string;
  animation: {
    enabled: boolean;
    duration: number;
  };
}

interface InteractiveHeatmapProps {
  data: HeatmapDataPoint[];
  config: HeatmapConfig;
  width?: number;
  height?: number;
  onCellClick?: (data: HeatmapDataPoint) => void;
  onCellHover?: (data: HeatmapDataPoint | null) => void;
  onExport?: (format: 'png' | 'svg' | 'csv') => void;
}

// Color Schemes
const colorSchemes = {
  sequential: {
    blues: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'],
    greens: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b'],
    reds: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'],
    oranges: ['#fff5eb', '#fee6ce', '#fdd0a2', '#fdae6b', '#fd8d3c', '#f16913', '#d94801', '#a63603', '#7f2704']
  },
  diverging: {
    redBlue: ['#67001f', '#b2182b', '#d6604d', '#f4a582', '#fddbc7', '#ffffff', '#d1e5f0', '#92c5de', '#4393c3', '#2166ac', '#053061'],
    purpleGreen: ['#40004b', '#762a83', '#9970ab', '#c2a5cf', '#e7d4e8', '#ffffff', '#d9f0d3', '#a6dba0', '#5aae61', '#1b7837', '#00441b'],
    brownTeal: ['#8c510a', '#bf812d', '#dfc27d', '#f6e8c3', '#f5f5f5', '#c7eae5', '#80cdc1', '#35978f', '#01665e', '#003c30']
  },
  categorical: {
    set1: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf', '#999999'],
    pastel: ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec', '#f2f2f2'],
    dark: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02', '#a6761d', '#666666']
  }
};

// Utility Functions
const getColorFromValue = (value: number, min: number, max: number, palette: string[]): string => {
  if (isNaN(value)) return palette[0];
  
  const normalized = (value - min) / (max - min);
  const index = Math.floor(normalized * (palette.length - 1));
  const clampedIndex = Math.max(0, Math.min(palette.length - 1, index));
  
  return palette[clampedIndex];
};

const interpolateColor = (color1: string, color2: string, ratio: number): string => {
  const hex = (x: number) => {
    const h = x.toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  
  const r1 = parseInt(color1.substr(1, 2), 16);
  const g1 = parseInt(color1.substr(3, 2), 16);
  const b1 = parseInt(color1.substr(5, 2), 16);
  
  const r2 = parseInt(color2.substr(1, 2), 16);
  const g2 = parseInt(color2.substr(3, 2), 16);
  const b2 = parseInt(color2.substr(5, 2), 16);
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return '#' + hex(r) + hex(g) + hex(b);
};

export const InteractiveHeatmap: React.FC<InteractiveHeatmapProps> = ({
  data,
  config,
  width,
  height,
  onCellClick,
  onCellHover,
  onExport
}) => {
  const [hoveredCell, setHoveredCell] = useState<HeatmapDataPoint | null>(null);
  const [selectedCell, setSelectedCell] = useState<HeatmapDataPoint | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const heatmapRef = useRef<SVGSVGElement>(null);

  // Process data for visualization
  const processedData = useMemo(() => {
    const uniqueX = Array.from(new Set(data.map(d => d.x))).sort();
    const uniqueY = Array.from(new Set(data.map(d => d.y))).sort();
    
    const minValue = config.minValue ?? Math.min(...data.map(d => d.value));
    const maxValue = config.maxValue ?? Math.max(...data.map(d => d.value));
    
    const matrix: (HeatmapDataPoint | null)[][] = [];
    
    uniqueY.forEach((y, yIndex) => {
      matrix[yIndex] = [];
      uniqueX.forEach((x, xIndex) => {
        const point = data.find(d => d.x === x && d.y === y);
        matrix[yIndex][xIndex] = point || null;
      });
    });
    
    return {
      matrix,
      uniqueX,
      uniqueY,
      minValue,
      maxValue
    };
  }, [data, config.minValue, config.maxValue]);

  const handleCellClick = useCallback((cellData: HeatmapDataPoint) => {
    setSelectedCell(cellData);
    if (onCellClick) {
      onCellClick(cellData);
    }
  }, [onCellClick]);

  const handleCellHover = useCallback((cellData: HeatmapDataPoint | null) => {
    setHoveredCell(cellData);
    if (onCellHover) {
      onCellHover(cellData);
    }
  }, [onCellHover]);

  const handleExport = (format: 'png' | 'svg' | 'csv') => {
    if (onExport) {
      onExport(format);
    }
  };

  const renderHeatmapCell = (
    cellData: HeatmapDataPoint | null, 
    x: number, 
    y: number, 
    cellSize: number
  ) => {
    if (!cellData) {
      return (
        <rect
          key={`cell-${x}-${y}`}
          x={x * cellSize}
          y={y * cellSize}
          width={cellSize}
          height={cellSize}
          fill="#f5f5f5"
          stroke={config.borderColor}
          strokeWidth={config.borderWidth}
        />
      );
    }

    const color = getColorFromValue(
      cellData.value,
      processedData.minValue,
      processedData.maxValue,
      config.colorPalette
    );

    return (
      <g key={`cell-${x}-${y}`}>
        <rect
          x={x * cellSize}
          y={y * cellSize}
          width={cellSize}
          height={cellSize}
          fill={color}
          stroke={config.borderColor}
          strokeWidth={config.borderWidth}
          style={{
            cursor: 'pointer',
            transition: config.animation.enabled ? `all ${config.animation.duration}ms ease` : 'none',
            opacity: hoveredCell === cellData ? 0.8 : 1,
            transform: selectedCell === cellData ? 'scale(1.05)' : 'scale(1)'
          }}
          onClick={() => handleCellClick(cellData)}
          onMouseEnter={() => handleCellHover(cellData)}
          onMouseLeave={() => handleCellHover(null)}
        />
        {config.showLabels && (
          <text
            x={x * cellSize + cellSize / 2}
            y={y * cellSize + cellSize / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.min(12, cellSize / 4)}
            fill={color === '#ffffff' ? '#000000' : '#ffffff'}
            pointerEvents="none"
          >
            {cellData.value.toFixed(1)}
          </text>
        )}
      </g>
    );
  };

  const renderColorScale = () => {
    const scaleWidth = 300;
    const scaleHeight = 20;
    const steps = config.colorPalette.length;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
        <Typography variant="caption" sx={{ mr: 1 }}>
          {processedData.minValue.toFixed(1)}
        </Typography>
        <svg width={scaleWidth} height={scaleHeight}>
          {config.colorPalette.map((color, index) => (
            <rect
              key={index}
              x={(index * scaleWidth) / steps}
              y={0}
              width={scaleWidth / steps}
              height={scaleHeight}
              fill={color}
            />
          ))}
        </svg>
        <Typography variant="caption" sx={{ ml: 1 }}>
          {processedData.maxValue.toFixed(1)}
        </Typography>
      </Box>
    );
  };

  const svgWidth = processedData.uniqueX.length * config.cellSize * zoomLevel;
  const svgHeight = processedData.uniqueY.length * config.cellSize * zoomLevel;

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
            <Tooltip title="Zoom In">
              <IconButton 
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 3))} 
                size="small"
              >
                <ZoomInIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Zoom Out">
              <IconButton 
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.5))} 
                size="small"
              >
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Settings">
              <IconButton onClick={() => setSettingsOpen(true)} size="small">
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Export">
              <IconButton onClick={() => handleExport('png')} size="small">
                <DownloadIcon />
              </IconButton>
            </Tooltip>

            {selectedCell && (
              <Tooltip title="View Details">
                <IconButton onClick={() => setDetailsOpen(true)} size="small">
                  <InfoIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Heatmap */}
        <Box sx={{ overflowX: 'auto', overflowY: 'auto', maxHeight: height || 600 }}>
          <svg
            ref={heatmapRef}
            width={svgWidth}
            height={svgHeight}
            style={{ display: 'block', margin: '0 auto' }}
          >
            {/* Y-axis labels */}
            {processedData.uniqueY.map((label, index) => (
              <text
                key={`y-label-${index}`}
                x={-10}
                y={index * config.cellSize * zoomLevel + (config.cellSize * zoomLevel) / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={Math.min(12 * zoomLevel, 14)}
                fill="#666"
              >
                {label}
              </text>
            ))}

            {/* X-axis labels */}
            {processedData.uniqueX.map((label, index) => (
              <text
                key={`x-label-${index}`}
                x={index * config.cellSize * zoomLevel + (config.cellSize * zoomLevel) / 2}
                y={-10}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.min(12 * zoomLevel, 14)}
                fill="#666"
                transform={`rotate(-45, ${index * config.cellSize * zoomLevel + (config.cellSize * zoomLevel) / 2}, -10)`}
              >
                {label}
              </text>
            ))}

            {/* Heatmap cells */}
            <g transform={`scale(${zoomLevel})`}>
              {processedData.matrix.map((row, yIndex) =>
                row.map((cell, xIndex) => 
                  renderHeatmapCell(cell, xIndex, yIndex, config.cellSize)
                )
              )}
            </g>
          </svg>
        </Box>

        {/* Color Scale */}
        {renderColorScale()}

        {/* Hover Info */}
        {hoveredCell && config.showTooltips && (
          <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.100' }}>
            <Typography variant="subtitle2">
              Cell Information
            </Typography>
            <Typography variant="body2">
              X: {hoveredCell.x}, Y: {hoveredCell.y}
            </Typography>
            <Typography variant="body2">
              Value: {hoveredCell.value}
            </Typography>
            {hoveredCell.label && (
              <Typography variant="body2">
                Label: {hoveredCell.label}
              </Typography>
            )}
          </Paper>
        )}

        {/* Statistics */}
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Typography variant="caption" color="textSecondary">
                Data Points
              </Typography>
              <Typography variant="h6">
                {data.length.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="textSecondary">
                Min Value
              </Typography>
              <Typography variant="h6">
                {processedData.minValue.toFixed(2)}
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="textSecondary">
                Max Value
              </Typography>
              <Typography variant="h6">
                {processedData.maxValue.toFixed(2)}
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="textSecondary">
                Zoom Level
              </Typography>
              <Typography variant="h6">
                {(zoomLevel * 100).toFixed(0)}%
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </CardContent>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Heatmap Settings</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography gutterBottom>Cell Size</Typography>
              <Slider
                value={config.cellSize}
                min={10}
                max={100}
                step={5}
                valueLabelDisplay="auto"
                onChange={(_, value) => {
                  config.cellSize = value as number;
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.showLabels}
                    onChange={(e) => {
                      config.showLabels = e.target.checked;
                    }}
                  />
                }
                label="Show Cell Labels"
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

      {/* Cell Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Cell Details</DialogTitle>
        <DialogContent>
          {selectedCell && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="h6">Coordinates</Typography>
                  <Typography>X: {selectedCell.x}</Typography>
                  <Typography>Y: {selectedCell.y}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6">Value</Typography>
                  <Typography variant="h4" color="primary">
                    {selectedCell.value}
                  </Typography>
                </Grid>
              </Grid>

              {selectedCell.metadata && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Additional Data
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        {Object.entries(selectedCell.metadata).map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell component="th" scope="row">
                              {key}
                            </TableCell>
                            <TableCell>{String(value)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default InteractiveHeatmap;