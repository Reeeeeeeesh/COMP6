import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Paper,
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
  Alert,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as PlayArrowIcon,
  Compare as CompareIcon,
  Analytics as AnalyticsIcon,
  Share as ShareIcon,
  GetApp as ExportIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  FileCopy as CloneIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { NavigationHeader } from '../common/NavigationHeader';
import {
  Scenario,
  ScenarioResults,
  ScenarioComparison,
  SensitivityAnalysis,
  ScenarioStatus,
  ScenarioType,
  ComparisonMode,
  CalculationMode,
  CreateScenarioRequest,
  UpdateScenarioRequest,
  CalculateScenarioRequest
} from '../../types/scenarioTypes';
import {
  createComprehensiveScenario,
  updateComprehensiveScenario,
  getComprehensiveScenario,
  listComprehensiveScenarios,
  calculateScenario,
  getCalculationStatus,
  cloneScenario,
  createScenarioComparison,
  runSensitivityAnalysis,
  validateScenario,
  getOptimizationRecommendations,
  shareScenario,
  exportScenario
} from '../../services/scenarioService';

interface EnhancedScenarioPlaygroundProps {
  planId?: string;
  initialScenarioId?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`scenario-tabpanel-${index}`}
    aria-labelledby={`scenario-tab-${index}`}
  >
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

export const EnhancedScenarioPlayground: React.FC<EnhancedScenarioPlaygroundProps> = ({
  planId,
  initialScenarioId
}) => {
  // Core State
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [sensitivityDialogOpen, setSensitivityDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  // Menu State
  const [scenarioMenuAnchor, setScenarioMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedScenarioForMenu, setSelectedScenarioForMenu] = useState<string | null>(null);
  
  // Analysis State
  const [sensitivityAnalysis, setSensitivityAnalysis] = useState<SensitivityAnalysis | null>(null);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [optimizationRecommendations, setOptimizationRecommendations] = useState<any>(null);

  // Load scenarios on mount
  useEffect(() => {
    loadScenarios();
    if (initialScenarioId) {
      loadScenario(initialScenarioId);
    }
  }, [planId, initialScenarioId]);

  // Load scenarios list
  const loadScenarios = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listComprehensiveScenarios(planId);
      setScenarios(result.scenarios);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  }, [planId]);

  // Load specific scenario
  const loadScenario = useCallback(async (scenarioId: string) => {
    try {
      setLoading(true);
      const scenario = await getComprehensiveScenario(scenarioId);
      setActiveScenario(scenario);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenario');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new scenario
  const handleCreateScenario = useCallback(async (request: CreateScenarioRequest) => {
    try {
      setLoading(true);
      const scenario = await createComprehensiveScenario(request);
      setScenarios(prev => [scenario, ...prev]);
      setActiveScenario(scenario);
      setCreateDialogOpen(false);
      setSuccess('Scenario created successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scenario');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update scenario
  const handleUpdateScenario = useCallback(async (scenarioId: string, updates: UpdateScenarioRequest) => {
    try {
      const scenario = await updateComprehensiveScenario(scenarioId, updates);
      setScenarios(prev => prev.map(s => s.id === scenarioId ? scenario : s));
      if (activeScenario?.id === scenarioId) {
        setActiveScenario(scenario);
      }
      setSuccess('Scenario updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update scenario');
    }
  }, [activeScenario]);

  // Calculate scenario
  const handleCalculateScenario = useCallback(async (scenarioId: string, mode: CalculationMode = 'realtime') => {
    try {
      setCalculating(true);
      const request: CalculateScenarioRequest = {
        scenarioId,
        mode,
        options: {
          includeDetails: true,
          includeStatistics: true,
          includeValidation: true
        }
      };
      
      const results = await calculateScenario(request);
      
      // Update scenario with results
      setScenarios(prev => prev.map(s => 
        s.id === scenarioId 
          ? { ...s, results, calculationStatus: 'completed' }
          : s
      ));
      
      if (activeScenario?.id === scenarioId) {
        setActiveScenario(prev => prev ? { ...prev, results, calculationStatus: 'completed' } : null);
      }
      
      setSuccess('Calculation completed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  }, [activeScenario]);

  // Clone scenario
  const handleCloneScenario = useCallback(async (scenarioId: string, name: string, description: string) => {
    try {
      const cloned = await cloneScenario(scenarioId, name, description);
      setScenarios(prev => [cloned, ...prev]);
      setSuccess('Scenario cloned successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone scenario');
    }
  }, []);

  // Run sensitivity analysis
  const handleRunSensitivityAnalysis = useCallback(async (
    scenarioId: string, 
    parameterId: string, 
    valueRange: { min: number; max: number; steps: number }
  ) => {
    try {
      const analysis = await runSensitivityAnalysis(scenarioId, parameterId, valueRange);
      setSensitivityAnalysis(analysis);
      setSensitivityDialogOpen(true);
      setSuccess('Sensitivity analysis completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sensitivity analysis failed');
    }
  }, []);

  // Validate scenario
  const handleValidateScenario = useCallback(async (scenarioId: string) => {
    try {
      const validation = await validateScenario(scenarioId);
      setValidationResults(validation);
      
      if (validation.isValid) {
        setSuccess('Scenario validation passed');
      } else {
        setError(`Scenario validation failed: ${validation.errors.length} errors found`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    }
  }, []);

  // Get optimization recommendations
  const handleGetOptimizationRecommendations = useCallback(async (
    scenarioId: string, 
    goal: 'cost' | 'fairness' | 'performance'
  ) => {
    try {
      const recommendations = await getOptimizationRecommendations(scenarioId, goal);
      setOptimizationRecommendations(recommendations);
      setSuccess('Optimization recommendations generated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get recommendations');
    }
  }, []);

  // Share scenario
  const handleShareScenario = useCallback(async (
    scenarioId: string, 
    shareWith: string[], 
    isPublic: boolean
  ) => {
    try {
      await shareScenario(scenarioId, shareWith, isPublic);
      setSuccess('Scenario shared successfully');
      setShareDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share scenario');
    }
  }, []);

  // Export scenario
  const handleExportScenario = useCallback(async (
    scenarioId: string, 
    format: 'csv' | 'xlsx' | 'json' | 'pdf'
  ) => {
    try {
      const result = await exportScenario(scenarioId, format, true);
      window.open(result.downloadUrl, '_blank');
      setSuccess(`Export completed: ${result.filename}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  }, []);

  // Toggle comparison mode
  const handleToggleComparisonMode = useCallback(() => {
    setComparisonMode(prev => !prev);
    setSelectedScenarios([]);
  }, []);

  // Handle scenario selection for comparison
  const handleScenarioSelect = useCallback((scenarioId: string, selected: boolean) => {
    setSelectedScenarios(prev => 
      selected 
        ? [...prev, scenarioId]
        : prev.filter(id => id !== scenarioId)
    );
  }, []);

  // Menu handlers
  const handleScenarioMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, scenarioId: string) => {
    setScenarioMenuAnchor(event.currentTarget);
    setSelectedScenarioForMenu(scenarioId);
  }, []);

  const handleScenarioMenuClose = useCallback(() => {
    setScenarioMenuAnchor(null);
    setSelectedScenarioForMenu(null);
  }, []);

  // Memoized values
  const canCompare = useMemo(() => selectedScenarios.length >= 2, [selectedScenarios]);
  const activeScenarioStatus = useMemo(() => {
    if (!activeScenario) return 'none';
    if (calculating) return 'calculating';
    return activeScenario.calculationStatus;
  }, [activeScenario, calculating]);

  // Status indicator component
  const StatusIndicator: React.FC<{ status: ScenarioStatus }> = ({ status }) => {
    const colors = {
      draft: 'default',
      active: 'success',
      archived: 'secondary',
      template: 'primary'
    } as const;
    
    return <Chip label={status} color={colors[status]} size="small" />;
  };

  // Calculation progress component
  const CalculationProgress: React.FC<{ scenario: Scenario }> = ({ scenario }) => {
    if (scenario.calculationStatus !== 'running') return null;
    
    return (
      <Box sx={{ width: '100%', mt: 1 }}>
        <LinearProgress 
          variant="determinate" 
          value={scenario.calculationProgress || 0} 
        />
        <Typography variant="caption" color="textSecondary">
          {scenario.calculationProgress || 0}% complete
        </Typography>
      </Box>
    );
  };

  // Render scenario card
  const ScenarioCard: React.FC<{ scenario: Scenario; isActive: boolean }> = ({ scenario, isActive }) => (
    <Card 
      sx={{ 
        mb: 2, 
        border: isActive ? 2 : 1, 
        borderColor: isActive ? 'primary.main' : 'divider',
        cursor: 'pointer' 
      }}
      onClick={() => setActiveScenario(scenario)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              {scenario.name}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {scenario.description}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
              <StatusIndicator status={scenario.status} />
              <Chip label={scenario.type} variant="outlined" size="small" />
              {scenario.results && (
                <Chip 
                  icon={<CheckCircleIcon />} 
                  label="Calculated" 
                  color="success" 
                  size="small" 
                />
              )}
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {comparisonMode && (
              <Switch
                checked={selectedScenarios.includes(scenario.id)}
                onChange={(e) => handleScenarioSelect(scenario.id, e.target.checked)}
                size="small"
              />
            )}
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleScenarioMenuOpen(e, scenario.id);
              }}
              size="small"
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>
        
        <CalculationProgress scenario={scenario} />
        
        {scenario.results && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">
                  Total Payout
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  £{scenario.results.summary.totalPayout.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">
                  Employees
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {scenario.results.summary.employeeCount.toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <NavigationHeader title="Enhanced Scenario Playground" />
      
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        {/* Error and Success Messages */}
        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert 
            severity="success" 
            onClose={() => setSuccess(null)}
            sx={{ mb: 2 }}
          >
            {success}
          </Alert>
        )}

        {/* Header Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Scenario Analysis Workspace
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={comparisonMode}
                  onChange={handleToggleComparisonMode}
                />
              }
              label="Comparison Mode"
            />
            
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              New Scenario
            </Button>
            
            {canCompare && (
              <Button
                variant="contained"
                startIcon={<CompareIcon />}
                onClick={() => setCompareDialogOpen(true)}
              >
                Compare ({selectedScenarios.length})
              </Button>
            )}
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Scenario List Sidebar */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: 'fit-content' }}>
              <Typography variant="h6" gutterBottom>
                Scenarios ({scenarios.length})
              </Typography>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <LinearProgress sx={{ width: '100%' }} />
                </Box>
              ) : scenarios.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 3 }}>
                  <Typography variant="body2" color="textSecondary">
                    No scenarios found. Create your first scenario to get started.
                  </Typography>
                </Box>
              ) : (
                scenarios.map((scenario) => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    isActive={activeScenario?.id === scenario.id}
                  />
                ))
              )}
            </Paper>
          </Grid>

          {/* Main Content Area */}
          <Grid item xs={12} md={8}>
            {activeScenario ? (
              <Paper sx={{ height: 'fit-content' }}>
                {/* Scenario Header */}
                <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h5" gutterBottom>
                        {activeScenario.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        {activeScenario.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <StatusIndicator status={activeScenario.status} />
                        <Chip label={activeScenario.type} variant="outlined" size="small" />
                        <Chip 
                          label={`v${activeScenario.version}`} 
                          variant="outlined" 
                          size="small" 
                        />
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Validate">
                        <IconButton 
                          onClick={() => handleValidateScenario(activeScenario.id)}
                          size="small"
                        >
                          <CheckCircleIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Calculate">
                        <IconButton 
                          onClick={() => handleCalculateScenario(activeScenario.id)}
                          disabled={calculating}
                          size="small"
                        >
                          <PlayArrowIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Sensitivity Analysis">
                        <IconButton 
                          onClick={() => setSensitivityDialogOpen(true)}
                          size="small"
                        >
                          <SpeedIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Share">
                        <IconButton 
                          onClick={() => setShareDialogOpen(true)}
                          size="small"
                        >
                          <ShareIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Export">
                        <IconButton 
                          onClick={() => handleExportScenario(activeScenario.id, 'xlsx')}
                          size="small"
                        >
                          <ExportIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  
                  {calculating && (
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress />
                      <Typography variant="caption" color="textSecondary">
                        Calculating scenario...
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Tabs */}
                <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
                  <Tab label="Parameters" />
                  <Tab label="Results" />
                  <Tab label="Analysis" />
                  <Tab label="Comparison" />
                  <Tab label="Settings" />
                </Tabs>

                {/* Tab Panels */}
                <TabPanel value={currentTab} index={0}>
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Scenario Parameters
                    </Typography>
                    {/* Parameter editing interface will go here */}
                    <Typography variant="body2" color="textSecondary">
                      Interactive parameter editing interface coming soon...
                    </Typography>
                  </Box>
                </TabPanel>

                <TabPanel value={currentTab} index={1}>
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Calculation Results
                    </Typography>
                    {activeScenario.results ? (
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" color="primary" gutterBottom>
                                Total Payout
                              </Typography>
                              <Typography variant="h4">
                                £{activeScenario.results.summary.totalPayout.toLocaleString()}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                Average: £{activeScenario.results.summary.averagePayout.toLocaleString()}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" color="primary" gutterBottom>
                                Employee Count
                              </Typography>
                              <Typography variant="h4">
                                {activeScenario.results.summary.employeeCount.toLocaleString()}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                Median: £{activeScenario.results.summary.medianPayout.toLocaleString()}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    ) : (
                      <Alert severity="info">
                        Run calculations to see results here.
                      </Alert>
                    )}
                  </Box>
                </TabPanel>

                <TabPanel value={currentTab} index={2}>
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Advanced Analysis
                    </Typography>
                    
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item>
                        <Button
                          variant="outlined"
                          startIcon={<SpeedIcon />}
                          onClick={() => setSensitivityDialogOpen(true)}
                        >
                          Sensitivity Analysis
                        </Button>
                      </Grid>
                      
                      <Grid item>
                        <Button
                          variant="outlined"
                          startIcon={<AnalyticsIcon />}
                          onClick={() => handleGetOptimizationRecommendations(activeScenario.id, 'cost')}
                        >
                          Optimization
                        </Button>
                      </Grid>
                      
                      <Grid item>
                        <Button
                          variant="outlined"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => handleValidateScenario(activeScenario.id)}
                        >
                          Validate
                        </Button>
                      </Grid>
                    </Grid>
                    
                    {validationResults && (
                      <Alert 
                        severity={validationResults.isValid ? 'success' : 'error'}
                        sx={{ mb: 2 }}
                      >
                        {validationResults.isValid 
                          ? 'Scenario validation passed successfully'
                          : `${validationResults.errors.length} validation errors found`
                        }
                      </Alert>
                    )}
                    
                    {optimizationRecommendations && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Optimization Recommendations
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Estimated improvement: {optimizationRecommendations.estimatedImprovement}%
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </TabPanel>

                <TabPanel value={currentTab} index={3}>
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Scenario Comparison
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Enable comparison mode to compare multiple scenarios side by side.
                    </Typography>
                  </Box>
                </TabPanel>

                <TabPanel value={currentTab} index={4}>
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Scenario Settings
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Scenario configuration and metadata settings.
                    </Typography>
                  </Box>
                </TabPanel>
              </Paper>
            ) : (
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  No Scenario Selected
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                  Select a scenario from the list to start analyzing, or create a new one.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create New Scenario
                </Button>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Box>

      {/* Scenario Menu */}
      <Menu
        anchorEl={scenarioMenuAnchor}
        open={Boolean(scenarioMenuAnchor)}
        onClose={handleScenarioMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedScenarioForMenu) {
            loadScenario(selectedScenarioForMenu);
          }
          handleScenarioMenuClose();
        }}>
          <VisibilityIcon sx={{ mr: 1 }} />
          View
        </MenuItem>
        <MenuItem onClick={() => {
          // Clone logic here
          handleScenarioMenuClose();
        }}>
          <CloneIcon sx={{ mr: 1 }} />
          Clone
        </MenuItem>
        <MenuItem onClick={() => {
          // Export logic here
          handleScenarioMenuClose();
        }}>
          <ExportIcon sx={{ mr: 1 }} />
          Export
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          // Delete logic here
          handleScenarioMenuClose();
        }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Create Scenario Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Scenario</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Scenario Name"
            fullWidth
            variant="outlined"
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Type</InputLabel>
            <Select label="Type" defaultValue="custom">
              <MenuItem value="base">Base</MenuItem>
              <MenuItem value="optimistic">Optimistic</MenuItem>
              <MenuItem value="pessimistic">Pessimistic</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Sensitivity Analysis Dialog */}
      <Dialog open={sensitivityDialogOpen} onClose={() => setSensitivityDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Sensitivity Analysis
          <IconButton
            onClick={() => setSensitivityDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {sensitivityAnalysis ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                {sensitivityAnalysis.parameterName}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Elasticity: {sensitivityAnalysis.elasticity.toFixed(2)}
              </Typography>
              {/* Sensitivity results visualization will go here */}
            </Box>
          ) : (
            <Typography>No sensitivity analysis data available.</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};