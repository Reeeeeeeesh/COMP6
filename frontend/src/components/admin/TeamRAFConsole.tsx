/**
 * Team RAF Console - Admin interface for Revenue Adjustment Factor configuration and governance
 * 
 * Features:
 * - Team selector and cycle input
 * - Revenue history chart visualization
 * - RAF method configuration (CAGR/Avg-YoY)
 * - FX and performance fee toggles
 * - Cap/floor inputs with validation
 * - Preview panel with computed factor and explanation
 * - Maker-checker approval workflow
 * - CSV upload with validation feedback
 * - History timeline and audit trail
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Preview as PreviewIcon,
  CheckCircle as ApproveIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Lock as LockIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
// Chart components are imported but not used in current implementation
// Keeping for future revenue history visualization
// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip as RechartsTooltip,
//   ResponsiveContainer,
//   BarChart,
//   Bar,
//   Legend,
// } from 'recharts';

import {
  Team,
  RAFMethod,
  RAFStatus,
  RAFStatusResponse,
  RAFPreviewResponse,
  RAFHistoryResponse,
  getTeams,
  createRAFConfig,
  getRAFStatus,
  previewRAF,
  approveRAF,
  getRAFHistory,
  uploadTeamRevenueHistory,
  getRevenueHistoryTemplate,
  updateRAFConfig,
} from '../../services/teamRAFService';

// ================================
// Component Interfaces
// ================================

interface TeamRAFConsoleProps {
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

interface RAFFormData {
  method: RAFMethod;
  include_perf_fees: boolean;
  const_currency: boolean;
  cap_factor?: number;
  floor_factor?: number;
  weight_pct: number;
}

interface ValidationErrors {
  cap_factor?: string;
  floor_factor?: string;
  weight_pct?: string;
  cycle?: string;
}

// ================================
// Main Component
// ================================

export const TeamRAFConsole: React.FC<TeamRAFConsoleProps> = ({
  onError,
  onSuccess,
}) => {
  // ================================
  // State Management
  // ================================
  
  // Core State
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [cycle, setCycle] = useState<string>('2025');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // RAF Configuration State
  const [rafConfig, setRafConfig] = useState<RAFFormData>({
    method: 'CAGR_3Y',
    include_perf_fees: false,
    const_currency: false,
    weight_pct: 100,
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  
  // RAF Status and Data
  const [rafStatus, setRafStatus] = useState<RAFStatusResponse | null>(null);
  const [rafPreview, setRafPreview] = useState<RAFPreviewResponse | null>(null);
  const [rafHistory, setRafHistory] = useState<RAFHistoryResponse | null>(null);
  
  // UI State
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalRationale, setApprovalRationale] = useState('');
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ================================
  // Effects
  // ================================

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam && cycle) {
      loadRAFStatus();
      loadRAFHistory();
    }
  }, [selectedTeam, cycle]);

  // ================================
  // Data Loading Functions
  // ================================

  const loadTeams = async () => {
    try {
      setLoading(true);
      const teamsData = await getTeams();
      setTeams(teamsData);
    } catch (err: any) {
      const errorMsg = `Failed to load teams: ${err.message}`;
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const loadRAFStatus = async () => {
    if (!selectedTeam || !cycle) return;
    
    try {
      setLoading(true);
      const status = await getRAFStatus(selectedTeam, cycle);
      setRafStatus(status);
      
      // Update form with existing config if available
      if (status.has_config) {
        setRafConfig({
          method: status.method || 'CAGR_3Y',
          include_perf_fees: status.include_perf_fees || false,
          const_currency: status.const_currency || false,
          cap_factor: status.cap_factor,
          floor_factor: status.floor_factor,
          weight_pct: status.weight_pct || 100,
        });
        
        // Auto-load preview if config exists
        if (status.config_id) {
          loadRAFPreview(status.config_id);
        }
      }
    } catch (err: any) {
      const errorMsg = `Failed to load RAF status: ${err.message}`;
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const loadRAFPreview = async (configId?: string) => {
    if (!selectedTeam || !cycle) return;
    
    const targetConfigId = configId || rafStatus?.config_id;
    if (!targetConfigId) return;

    try {
      const preview = await previewRAF(selectedTeam, cycle, targetConfigId);
      setRafPreview(preview);
      setPreviewExpanded(true);
    } catch (err: any) {
      const errorMsg = `Failed to load RAF preview: ${err.message}`;
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const loadRAFHistory = async () => {
    if (!selectedTeam || !cycle) return;
    
    try {
      const history = await getRAFHistory(selectedTeam, cycle);
      setRafHistory(history);
    } catch (err: any) {
      console.warn('Failed to load RAF history:', err.message);
      // Don't show error for history as it's not critical
    }
  };

  // ================================
  // Form Validation
  // ================================

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (!cycle.trim()) {
      errors.cycle = 'Cycle is required';
    }
    
    if (rafConfig.cap_factor !== undefined && rafConfig.cap_factor < 0) {
      errors.cap_factor = 'Cap factor must be >= 0';
    }
    
    if (rafConfig.floor_factor !== undefined && rafConfig.floor_factor <= 0) {
      errors.floor_factor = 'Floor factor must be > 0';
    }
    
    if (rafConfig.weight_pct <= 0 || rafConfig.weight_pct > 100) {
      errors.weight_pct = 'Weight percentage must be between 0 and 100';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ================================
  // Action Handlers
  // ================================

  const handleCreateOrUpdateConfig = async () => {
    if (!selectedTeam || !cycle || !validateForm()) return;
    
    try {
      setLoading(true);
      
      if (rafStatus?.has_config && rafStatus.config_id) {
        // Update existing configuration
        await updateRAFConfig(selectedTeam, rafStatus.config_id, rafConfig);
        setSuccess('RAF configuration updated successfully');
      } else {
        // Create new configuration
        await createRAFConfig(selectedTeam, cycle, rafConfig);
        setSuccess('RAF configuration created successfully');
      }
      
      onSuccess?.('RAF configuration saved successfully');
      
      // Reload status and preview
      await loadRAFStatus();
      
    } catch (err: any) {
      const errorMsg = `Failed to save RAF configuration: ${err.message}`;
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!rafStatus?.config_id) {
      setError('Please save configuration first before previewing');
      return;
    }
    
    await loadRAFPreview();
  };

  const handleApprove = async () => {
    if (!selectedTeam || !cycle || !approvalRationale.trim()) return;
    
    try {
      setLoading(true);
      await approveRAF(selectedTeam, cycle, approvalRationale);
      setSuccess('RAF configuration approved successfully');
      onSuccess?.('RAF configuration approved successfully');
      
      // Close dialog and reload data
      setApprovalDialog(false);
      setApprovalRationale('');
      await loadRAFStatus();
      await loadRAFHistory();
      
    } catch (err: any) {
      const errorMsg = `Failed to approve RAF configuration: ${err.message}`;
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedTeam) return;
    
    try {
      setLoading(true);
      setUploadProgress(0);
      
      // Simulate progress (in real implementation, you might use XMLHttpRequest for progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      const result = await uploadTeamRevenueHistory(selectedFile, selectedTeam);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setSuccess(`File uploaded successfully: ${result.data?.rows_processed} rows processed`);
      onSuccess?.('Revenue history uploaded successfully');
      
      // Close dialog and reload data
      setUploadDialog(false);
      setSelectedFile(null);
      setUploadProgress(0);
      
    } catch (err: any) {
      const errorMsg = `Failed to upload file: ${err.message}`;
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const template = await getRevenueHistoryTemplate();
      
      // Create and download file
      const blob = new Blob([template.data?.template || ''], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = template.data?.filename || 'team_revenue_history_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err: any) {
      const errorMsg = `Failed to download template: ${err.message}`;
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  // ================================
  // Utility Functions
  // ================================

  const getStatusColor = (status?: RAFStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'draft': return 'warning';
      case 'approved': return 'success';
      case 'locked': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status?: RAFStatus) => {
    switch (status) {
      case 'draft': return <EditIcon />;
      case 'approved': return <ApproveIcon />;
      case 'locked': return <LockIcon />;
      default: return <InfoIcon />;
    }
  };

  // Utility functions for future use
  // const formatCurrency = (value: number): string => {
  //   return new Intl.NumberFormat('en-US', {
  //     style: 'currency',
  //     currency: 'USD',
  //     minimumFractionDigits: 0,
  //     maximumFractionDigits: 0,
  //   }).format(value);
  // };

  // const formatPercentage = (value: number): string => {
  //   return `${(value * 100).toFixed(2)}%`;
  // };

  // ================================
  // Render Functions
  // ================================

  const renderTeamSelector = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Team & Cycle Selection
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Select Team</InputLabel>
              <Select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                label="Select Team"
              >
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    <Box>
                      <Typography variant="body1">{team.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {team.division} • {team.peer_group}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: 1 }}>
            <TextField
              fullWidth
              label="Cycle"
              value={cycle}
              onChange={(e) => setCycle(e.target.value)}
              placeholder="e.g., 2025, 2025-Q2"
              error={!!validationErrors.cycle}
              helperText={validationErrors.cycle}
            />
          </Box>
        </Box>
        
        {rafStatus && (
          <Box sx={{ mt: 2 }}>
            <Chip
              icon={getStatusIcon(rafStatus.status)}
              label={`Status: ${rafStatus.status?.toUpperCase() || 'No Config'}`}
              color={getStatusColor(rafStatus.status)}
              variant={rafStatus.has_config ? 'filled' : 'outlined'}
            />
            {rafStatus.computed_factor && (
              <Chip
                icon={<AssessmentIcon />}
                label={`RAF Factor: ${rafStatus.computed_factor.toFixed(4)}`}
                color="info"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderConfigurationForm = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          RAF Configuration
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 3, flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
            <Box sx={{ flex: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Calculation Method</InputLabel>
                <Select
                  value={rafConfig.method}
                  onChange={(e) => setRafConfig({ ...rafConfig, method: e.target.value as RAFMethod })}
                  label="Calculation Method"
                >
                  <MenuItem value="CAGR_3Y">
                    <Box>
                      <Typography variant="body1">CAGR (3-Year)</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Compound Annual Growth Rate over 3 years
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="AVG_YOY_3Y">
                    <Box>
                      <Typography variant="body1">Average YoY (3-Year)</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Average Year-over-Year growth over 3 years
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                label="Weight Percentage"
                type="number"
                value={rafConfig.weight_pct}
                onChange={(e) => setRafConfig({ ...rafConfig, weight_pct: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
                error={!!validationErrors.weight_pct}
                helperText={validationErrors.weight_pct || 'Percentage weight in final calculation (0-100)'}
              />
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                label="Cap Factor (Optional)"
                type="number"
                value={rafConfig.cap_factor || ''}
                onChange={(e) => setRafConfig({ ...rafConfig, cap_factor: e.target.value ? parseFloat(e.target.value) : undefined })}
                inputProps={{ min: 0, step: 0.01 }}
                error={!!validationErrors.cap_factor}
                helperText={validationErrors.cap_factor || 'Maximum RAF factor limit'}
              />
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                label="Floor Factor (Optional)"
                type="number"
                value={rafConfig.floor_factor || ''}
                onChange={(e) => setRafConfig({ ...rafConfig, floor_factor: e.target.value ? parseFloat(e.target.value) : undefined })}
                inputProps={{ min: 0.01, step: 0.01 }}
                error={!!validationErrors.floor_factor}
                helperText={validationErrors.floor_factor || 'Minimum RAF factor limit (must be > 0)'}
              />
            </Box>
          </Box>
          
          <Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={rafConfig.include_perf_fees}
                    onChange={(e) => setRafConfig({ ...rafConfig, include_perf_fees: e.target.checked })}
                  />
                }
                label="Include Performance Fees"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={rafConfig.const_currency}
                    onChange={(e) => setRafConfig({ ...rafConfig, const_currency: e.target.checked })}
                  />
                }
                label="Constant Currency (FX Adjusted)"
              />
            </Box>
          </Box>
        </Box>
      </CardContent>
      
      <CardActions>
        <Button
          variant="contained"
          onClick={handleCreateOrUpdateConfig}
          disabled={loading || !selectedTeam || !cycle}
          startIcon={loading ? <CircularProgress size={20} /> : <EditIcon />}
        >
          {rafStatus?.has_config ? 'Update Configuration' : 'Create Configuration'}
        </Button>
        
        <Button
          variant="outlined"
          onClick={handlePreview}
          disabled={loading || !rafStatus?.config_id}
          startIcon={<PreviewIcon />}
        >
          Preview Calculation
        </Button>
      </CardActions>
    </Card>
  );

  const renderPreviewPanel = () => (
    <Accordion expanded={previewExpanded} onChange={() => setPreviewExpanded(!previewExpanded)}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">
          RAF Preview & Impact Analysis
          {rafPreview && (
            <Chip
              label={`Factor: ${rafPreview.computed_factor.toFixed(4)}`}
              color="primary"
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        {rafPreview ? (
          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
            <Box sx={{ flex: 1 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Calculation Results
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Computed Factor"
                      secondary={rafPreview.computed_factor.toFixed(4)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Original Factor"
                      secondary={rafPreview.original_factor.toFixed(4)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Method"
                      secondary={rafPreview.method}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Weight"
                      secondary={`${rafPreview.weight_pct}%`}
                    />
                  </ListItem>
                </List>
                
                {(rafPreview.cap_applied || rafPreview.floor_applied) && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {rafPreview.cap_applied && 'Cap limit applied. '}
                    {rafPreview.floor_applied && 'Floor limit applied.'}
                  </Alert>
                )}
              </Paper>
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Calculation Breakdown
                </Typography>
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  <pre style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(rafPreview.explanation_tape, null, 2)}
                  </pre>
                </Box>
              </Paper>
            </Box>
          </Box>
        ) : (
          <Alert severity="info">
            No preview available. Please save configuration and click "Preview Calculation".
          </Alert>
        )}
      </AccordionDetails>
    </Accordion>
  );

  const renderApprovalSection = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Approval & Governance
        </Typography>
        
        {rafStatus?.status === 'draft' && rafStatus.config_id && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This configuration is in draft status and requires approval before use.
            </Alert>
            <Button
              variant="contained"
              color="success"
              onClick={() => setApprovalDialog(true)}
              startIcon={<ApproveIcon />}
              disabled={loading}
            >
              Approve Configuration
            </Button>
          </Box>
        )}
        
        {rafStatus?.status === 'approved' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Configuration approved by {rafStatus.approved_by} on{' '}
            {rafStatus.approved_at ? new Date(rafStatus.approved_at).toLocaleString() : 'Unknown'}
            {rafStatus.rationale && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Rationale:</strong> {rafStatus.rationale}
              </Typography>
            )}
          </Alert>
        )}
        
        {rafStatus?.status === 'locked' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Configuration is locked and cannot be modified.
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderHistoryTimeline = () => (
    <Accordion expanded={historyExpanded} onChange={() => setHistoryExpanded(!historyExpanded)}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">
          History & Audit Trail
          <IconButton onClick={loadRAFHistory} size="small" sx={{ ml: 1 }}>
            <RefreshIcon />
          </IconButton>
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        {rafHistory?.history && rafHistory.history.length > 0 ? (
          <List>
            {rafHistory.history.map((event, index) => (
              <ListItem key={index} divider={index < rafHistory.history.length - 1}>
                <ListItemIcon>
                  <TimelineIcon />
                </ListItemIcon>
                <ListItemText
                  primary={event.event}
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        {new Date(event.timestamp).toLocaleString()} by {event.user_email}
                      </Typography>
                      {Object.keys(event.details).length > 0 && (
                        <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                          <pre style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Alert severity="info">No history available for this configuration.</Alert>
        )}
      </AccordionDetails>
    </Accordion>
  );

  const renderFileUploadSection = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Revenue History Management
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Upload CSV files containing team revenue history for RAF calculations.
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={() => setUploadDialog(true)}
            startIcon={<UploadIcon />}
            disabled={!selectedTeam}
          >
            Upload Revenue History
          </Button>
          
          <Button
            variant="text"
            onClick={handleDownloadTemplate}
            startIcon={<DownloadIcon />}
          >
            Download Template
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  // ================================
  // Render Dialogs
  // ================================

  const renderApprovalDialog = () => (
    <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Approve RAF Configuration</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          You are about to approve this RAF configuration. This action will create an immutable snapshot and enable the configuration for use in calculations.
        </Alert>
        
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Approval Rationale"
          value={approvalRationale}
          onChange={(e) => setApprovalRationale(e.target.value)}
          placeholder="Please provide a rationale for approving this RAF configuration..."
          required
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setApprovalDialog(false)}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleApprove}
          disabled={loading || !approvalRationale.trim()}
          startIcon={loading ? <CircularProgress size={20} /> : <ApproveIcon />}
        >
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderUploadDialog = () => (
    <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Revenue History</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Upload a CSV file containing team revenue history. The file should include columns for fiscal year, reported revenue, currency, and optional performance fees.
        </Alert>
        
        <Box sx={{ mt: 2, mb: 2 }}>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            style={{ width: '100%' }}
          />
        </Box>
        
        {uploadProgress > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Upload Progress: {uploadProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setUploadDialog(false)}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleFileUpload}
          disabled={loading || !selectedFile}
          startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ================================
  // Main Render
  // ================================

  if (loading && teams.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading Team RAF Console...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Team RAF Console
        <Tooltip title="Revenue Adjustment Factor Configuration and Governance">
          <IconButton size="small" sx={{ ml: 1 }}>
            <InfoIcon />
          </IconButton>
        </Tooltip>
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Configure and manage Revenue Adjustment Factors for teams. This console provides tools for 
        importing revenue data, configuring RAF calculations, previewing results, and managing the 
        approval workflow with full audit trails.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {renderTeamSelector()}
      
      {selectedTeam && cycle && (
        <>
          {renderFileUploadSection()}
          {renderConfigurationForm()}
          {renderPreviewPanel()}
          {renderApprovalSection()}
          {renderHistoryTimeline()}
        </>
      )}

      {renderApprovalDialog()}
      {renderUploadDialog()}
    </Box>
  );
};

export default TeamRAFConsole;