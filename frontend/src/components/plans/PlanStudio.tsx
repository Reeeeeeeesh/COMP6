/**
 * Plan Studio - Advanced compensation plan editor with visual field builder and expression editor
 * Core interface for creating and editing sophisticated calculation plans with real-time validation
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Stack,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Badge,
  Divider,
  LinearProgress,
  Snackbar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  PlayArrow as TestIcon,
  Share as ShareIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Code as CodeIcon,
  Functions as FunctionIcon,
  CheckCircle as ValidIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  DragIndicator as DragIcon,
  Preview as PreviewIcon,
  Group as CollabIcon,
  CloudUpload as UploadIcon,
  GetApp as ExportIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useParams, useNavigate } from 'react-router-dom';

import { useUser } from '../../contexts/UserContext';
import { planService } from '../../services/planService';
import {
  Plan,
  PlanField,
  PlanCalculation,
  PlanCondition,
  PlanOutput,
  PlanValidationResult,
  PlanCollaborator,
  CollaboratorRole,
} from '../../types/planTypes';
import ExpressionStudio from '../expression/ExpressionStudio';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`plan-tabpanel-${index}`}
      aria-labelledby={`plan-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const PlanStudio: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();

  // State Management
  const [plan, setPlan] = useState<Plan | null>(null);
  const [originalPlan, setOriginalPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  // Validation
  const [validationResults, setValidationResults] = useState<PlanValidationResult[]>([]);
  const [validating, setValidating] = useState(false);
  
  // Collaboration
  const [collaborators, setCollaborators] = useState<PlanCollaborator[]>([]);
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  
  // Dialogs
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [showExpressionEditor, setShowExpressionEditor] = useState(false);
  const [selectedExpression, setSelectedExpression] = useState<{ type: 'calculation' | 'condition'; id: string } | null>(null);
  const [currentExpressionValue, setCurrentExpressionValue] = useState('');
  
  // UI State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [fullscreenField, setFullscreenField] = useState<string | null>(null);

  // Load plan data
  useEffect(() => {
    if (planId && planId !== 'new') {
      loadPlan();
    } else {
      initializeNewPlan();
    }
  }, [planId]);

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && plan && planId !== 'new') {
      const autoSaveTimer = setTimeout(() => {
        handleAutoSave();
      }, 30000); // Auto-save every 30 seconds

      return () => clearTimeout(autoSaveTimer);
    }
  }, [hasUnsavedChanges, plan]);

  const loadPlan = async () => {
    try {
      setLoading(true);
      const planData = await planService.getPlan(planId!);
      setPlan(planData);
      setOriginalPlan(structuredClone(planData));
      
      const collaboratorsData = await planService.getPlanCollaborators(planId!);
      setCollaborators(collaboratorsData);
      
      // Load validation results
      const validation = await planService.validatePlan(planId!);
      setValidationResults(validation);
    } catch (err) {
      setError(`Failed to load plan: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const initializeNewPlan = () => {
    const newPlan: Plan = {
      id: 'new',
      name: 'Untitled Plan',
      description: '',
      type: 'bonus',
      status: 'draft',
      version: 1,
      structure: {
        fields: [
          {
            id: 'employee_id',
            name: 'employee_id',
            label: 'Employee ID',
            type: 'text',
            required: true,
            displayOrder: 1,
          },
          {
            id: 'base_salary',
            name: 'base_salary',
            label: 'Base Salary',
            type: 'number',
            required: true,
            displayOrder: 2,
          },
        ],
        calculations: [],
        conditions: [],
        outputs: [],
      },
      settings: {
        timezone: 'UTC',
        currency: 'USD',
        decimalPlaces: 2,
        roundingMethod: 'nearest',
        dateFormat: 'MM/dd/yyyy',
        enableAuditLog: true,
        allowCollaboration: true,
        autoSave: true,
      },
      collaborators: [],
      sharedWith: [],
      tags: [],
      category: 'general',
      createdBy: user?.id || '',
      createdAt: new Date().toISOString(),
      updatedBy: user?.id || '',
      updatedAt: new Date().toISOString(),
      validationResults: [],
      versionHistory: [],
      usageStats: {
        totalExecutions: 0,
        averageExecutionTime: 0,
        errorRate: 0,
        mostUsedBy: [],
      },
    };
    
    setPlan(newPlan);
    setOriginalPlan(structuredClone(newPlan));
    setLoading(false);
  };

  const handlePlanChange = useCallback((updates: Partial<Plan>) => {
    setPlan(prev => prev ? { ...prev, ...updates } : null);
    setHasUnsavedChanges(true);
  }, []);

  const handleFieldsChange = useCallback((fields: PlanField[]) => {
    setPlan(prev => prev ? {
      ...prev,
      structure: { ...prev.structure, fields }
    } : null);
    setHasUnsavedChanges(true);
  }, []);

  const handleCalculationsChange = useCallback((calculations: PlanCalculation[]) => {
    setPlan(prev => prev ? {
      ...prev,
      structure: { ...prev.structure, calculations }
    } : null);
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = async () => {
    if (!plan) return;
    
    try {
      setSaving(true);
      
      if (planId === 'new') {
        const createdPlan = await planService.createPlan({
          name: plan.name,
          description: plan.description,
          type: plan.type,
          structure: plan.structure,
          settings: plan.settings,
          tags: plan.tags,
          category: plan.category,
        });
        
        setPlan(createdPlan);
        setOriginalPlan(structuredClone(createdPlan));
        navigate(`/plans/${createdPlan.id}`, { replace: true });
        setNotification({ message: 'Plan created successfully', type: 'success' });
      } else {
        const updatedPlan = await planService.updatePlan(planId!, {
          name: plan.name,
          description: plan.description,
          structure: plan.structure,
          settings: plan.settings,
          tags: plan.tags,
          category: plan.category,
        });
        
        setPlan(updatedPlan);
        setOriginalPlan(structuredClone(updatedPlan));
        setNotification({ message: 'Plan saved successfully', type: 'success' });
      }
      
      setHasUnsavedChanges(false);
    } catch (err) {
      setNotification({ message: `Save failed: ${err}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAutoSave = async () => {
    if (!plan || planId === 'new') return;
    
    try {
      await planService.updatePlan(planId!, {
        structure: plan.structure,
        settings: plan.settings,
      });
      
      setNotification({ message: 'Auto-saved', type: 'info' });
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  const handleValidate = async () => {
    if (!plan || planId === 'new') return;
    
    try {
      setValidating(true);
      const results = await planService.validatePlan(planId!);
      setValidationResults(results);
      
      const errorCount = results.filter(r => r.level === 'error').length;
      const warningCount = results.filter(r => r.level === 'warning').length;
      
      setNotification({
        message: `Validation complete: ${errorCount} errors, ${warningCount} warnings`,
        type: errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success'
      });
    } catch (err) {
      setNotification({ message: `Validation failed: ${err}`, type: 'error' });
    } finally {
      setValidating(false);
    }
  };

  const handleTest = async () => {
    if (!plan) return;
    
    try {
      setTesting(true);
      const testData = {}; // Would be populated from a test data dialog
      const results = await planService.testPlan(plan.id, testData);
      setNotification({ message: 'Test completed successfully', type: 'success' });
      console.log('Test results:', results);
    } catch (err) {
      setNotification({ message: `Test failed: ${err}`, type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const handleApplyExpression = () => {
    if (!selectedExpression || !plan) return;

    if (selectedExpression.type === 'calculation') {
      updateCalculation(selectedExpression.id, { expression: currentExpressionValue });
    }
    // Handle conditions when implemented
    // else if (selectedExpression.type === 'condition') {
    //   updateCondition(selectedExpression.id, { expression: currentExpressionValue });
    // }

    setShowExpressionEditor(false);
    setSelectedExpression(null);
    setCurrentExpressionValue('');
    setNotification({ message: 'Expression applied successfully', type: 'success' });
  };

  const handleTestExpression = async (expression: string) => {
    // Mock test implementation - in real scenario, this would call backend
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ result: 42, expression, timestamp: new Date().toISOString() });
      }, 1000);
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !plan) return;

    const { source, destination, type } = result;

    if (type === 'fields') {
      const fields = Array.from(plan.structure.fields);
      const [reorderedField] = fields.splice(source.index, 1);
      fields.splice(destination.index, 0, reorderedField);
      
      // Update display order
      fields.forEach((field, index) => {
        field.displayOrder = index + 1;
      });
      
      handleFieldsChange(fields);
    }
  };

  const addField = () => {
    if (!plan) return;
    
    const newField: PlanField = {
      id: `field_${Date.now()}`,
      name: `new_field_${plan.structure.fields.length + 1}`,
      label: `New Field ${plan.structure.fields.length + 1}`,
      type: 'text',
      required: false,
      displayOrder: plan.structure.fields.length + 1,
    };
    
    handleFieldsChange([...plan.structure.fields, newField]);
  };

  const updateField = (fieldId: string, updates: Partial<PlanField>) => {
    if (!plan) return;
    
    const fields = plan.structure.fields.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    );
    
    handleFieldsChange(fields);
  };

  const removeField = (fieldId: string) => {
    if (!plan) return;
    
    const fields = plan.structure.fields.filter(field => field.id !== fieldId);
    handleFieldsChange(fields);
  };

  const addCalculation = () => {
    if (!plan) return;
    
    const newCalculation: PlanCalculation = {
      id: `calc_${Date.now()}`,
      name: `calculation_${plan.structure.calculations.length + 1}`,
      expression: '',
      description: '',
      dependencies: [],
      outputType: 'number',
      order: plan.structure.calculations.length + 1,
    };
    
    handleCalculationsChange([...plan.structure.calculations, newCalculation]);
  };

  const updateCalculation = (calcId: string, updates: Partial<PlanCalculation>) => {
    if (!plan) return;
    
    const calculations = plan.structure.calculations.map(calc =>
      calc.id === calcId ? { ...calc, ...updates } : calc
    );
    
    handleCalculationsChange(calculations);
  };

  const removeCalculation = (calcId: string) => {
    if (!plan) return;
    
    const calculations = plan.structure.calculations.filter(calc => calc.id !== calcId);
    handleCalculationsChange(calculations);
  };

  const validationSummary = useMemo(() => {
    const errors = validationResults.filter(r => r.level === 'error').length;
    const warnings = validationResults.filter(r => r.level === 'warning').length;
    const info = validationResults.filter(r => r.level === 'info').length;
    return { errors, warnings, info };
  }, [validationResults]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>Loading plan studio...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate('/plans')} sx={{ mt: 2 }}>
          Back to Plans
        </Button>
      </Box>
    );
  }

  if (!plan) return null;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={2}>
            <TextField
              value={plan.name}
              onChange={(e) => handlePlanChange({ name: e.target.value })}
              variant="standard"
              sx={{ 
                '& .MuiInput-input': { 
                  fontSize: '1.25rem', 
                  fontWeight: 500,
                  minWidth: '200px'
                }
              }}
            />
            
            <Chip 
              label={plan.status} 
              color={plan.status === 'active' ? 'success' : 'primary'}
              size="small"
            />
            
            {hasUnsavedChanges && (
              <Chip 
                label="Unsaved Changes" 
                color="warning" 
                size="small" 
              />
            )}
          </Stack>

          <Stack direction="row" spacing={1}>
            {validationResults.length > 0 && (
              <Tooltip title={`${validationSummary.errors} errors, ${validationSummary.warnings} warnings`}>
                <Badge badgeContent={validationSummary.errors} color="error">
                  <Badge badgeContent={validationSummary.warnings} color="warning" sx={{ ml: 1 }}>
                    <IconButton 
                      onClick={handleValidate}
                      disabled={validating}
                      color={validationSummary.errors > 0 ? 'error' : validationSummary.warnings > 0 ? 'warning' : 'success'}
                    >
                      {validationSummary.errors > 0 ? <ErrorIcon /> : validationSummary.warnings > 0 ? <WarningIcon /> : <ValidIcon />}
                    </IconButton>
                  </Badge>
                </Badge>
              </Tooltip>
            )}

            <IconButton onClick={() => setShowCollabPanel(true)}>
              <Badge badgeContent={collaborators.length} color="primary">
                <CollabIcon />
              </Badge>
            </IconButton>

            <Button
              variant="outlined"
              startIcon={<TestIcon />}
              onClick={handleTest}
              disabled={testing}
            >
              Test
            </Button>

            <Button
              variant="outlined"
              startIcon={validating ? <RefreshIcon className="animate-spin" /> : <ValidIcon />}
              onClick={handleValidate}
              disabled={validating}
            >
              Validate
            </Button>

            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>

            <IconButton onClick={() => setShowSettingsDialog(true)}>
              <SettingsIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel - Navigation */}
        <Paper sx={{ width: 240, borderRadius: 0, borderRight: 1, borderColor: 'divider' }}>
          <Tabs
            orientation="vertical"
            variant="fullWidth"
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ height: '100%' }}
          >
            <Tab label="Fields" icon={<EditIcon />} />
            <Tab label="Calculations" icon={<FunctionIcon />} />
            <Tab label="Conditions" icon={<CodeIcon />} />
            <Tab label="Outputs" icon={<PreviewIcon />} />
            <Tab label="Settings" icon={<SettingsIcon />} />
          </Tabs>
        </Paper>

        {/* Main Editor Area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <DragDropContext onDragEnd={handleDragEnd}>
            {/* Fields Tab */}
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6">Plan Fields</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={addField}
                  >
                    Add Field
                  </Button>
                </Stack>

                <Droppable droppableId="fields" type="fields">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      <Stack spacing={2}>
                        {plan.structure.fields.map((field, index) => (
                          <Draggable key={field.id} draggableId={field.id} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                sx={{
                                  border: 1,
                                  borderColor: snapshot.isDragging ? 'primary.main' : 'divider',
                                  ...(snapshot.isDragging && { transform: 'rotate(5deg)' }),
                                }}
                              >
                                <CardContent>
                                  <Stack direction="row" alignItems="center" spacing={2}>
                                    <div {...provided.dragHandleProps}>
                                      <DragIcon color="disabled" />
                                    </div>
                                    
                                    <Grid container spacing={2} alignItems="center">
                                      <Grid item xs={3}>
                                        <TextField
                                          label="Field Name"
                                          value={field.name}
                                          onChange={(e) => updateField(field.id, { name: e.target.value })}
                                          size="small"
                                          fullWidth
                                        />
                                      </Grid>
                                      
                                      <Grid item xs={3}>
                                        <TextField
                                          label="Display Label"
                                          value={field.label}
                                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                                          size="small"
                                          fullWidth
                                        />
                                      </Grid>
                                      
                                      <Grid item xs={2}>
                                        <FormControl size="small" fullWidth>
                                          <InputLabel>Type</InputLabel>
                                          <Select
                                            value={field.type}
                                            onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                                            label="Type"
                                          >
                                            <MenuItem value="text">Text</MenuItem>
                                            <MenuItem value="number">Number</MenuItem>
                                            <MenuItem value="date">Date</MenuItem>
                                            <MenuItem value="boolean">Boolean</MenuItem>
                                            <MenuItem value="select">Select</MenuItem>
                                            <MenuItem value="calculated">Calculated</MenuItem>
                                          </Select>
                                        </FormControl>
                                      </Grid>
                                      
                                      <Grid item xs={2}>
                                        <FormControlLabel
                                          control={
                                            <Switch
                                              checked={field.required}
                                              onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                            />
                                          }
                                          label="Required"
                                        />
                                      </Grid>
                                      
                                      <Grid item xs={2}>
                                        <Stack direction="row" spacing={1}>
                                          <IconButton
                                            onClick={() => setFullscreenField(field.id)}
                                            size="small"
                                          >
                                            <FullscreenIcon />
                                          </IconButton>
                                          
                                          <IconButton
                                            onClick={() => removeField(field.id)}
                                            size="small"
                                            color="error"
                                          >
                                            <DeleteIcon />
                                          </IconButton>
                                        </Stack>
                                      </Grid>
                                    </Grid>
                                  </Stack>

                                  {field.description && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                      {field.description}
                                    </Typography>
                                  )}
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </Stack>
                    </div>
                  )}
                </Droppable>

                {plan.structure.fields.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No fields defined
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Add fields to define the data structure of your compensation plan
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={addField}
                    >
                      Add Your First Field
                    </Button>
                  </Box>
                )}
              </Box>
            </TabPanel>

            {/* Calculations Tab */}
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6">Calculations</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={addCalculation}
                  >
                    Add Calculation
                  </Button>
                </Stack>

                <Stack spacing={2}>
                  {plan.structure.calculations.map((calculation) => (
                    <Card key={calculation.id}>
                      <CardContent>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={4}>
                            <TextField
                              label="Calculation Name"
                              value={calculation.name}
                              onChange={(e) => updateCalculation(calculation.id, { name: e.target.value })}
                              size="small"
                              fullWidth
                            />
                          </Grid>
                          
                          <Grid item xs={4}>
                            <TextField
                              label="Description"
                              value={calculation.description}
                              onChange={(e) => updateCalculation(calculation.id, { description: e.target.value })}
                              size="small"
                              fullWidth
                            />
                          </Grid>
                          
                          <Grid item xs={2}>
                            <FormControl size="small" fullWidth>
                              <InputLabel>Output Type</InputLabel>
                              <Select
                                value={calculation.outputType}
                                onChange={(e) => updateCalculation(calculation.id, { outputType: e.target.value as any })}
                                label="Output Type"
                              >
                                <MenuItem value="number">Number</MenuItem>
                                <MenuItem value="boolean">Boolean</MenuItem>
                                <MenuItem value="text">Text</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          
                          <Grid item xs={2}>
                            <Stack direction="row" spacing={1}>
                              <IconButton
                                onClick={() => {
                                  setSelectedExpression({ type: 'calculation', id: calculation.id });
                                  setCurrentExpressionValue(calculation.expression);
                                  setShowExpressionEditor(true);
                                }}
                                size="small"
                                color="primary"
                              >
                                <CodeIcon />
                              </IconButton>
                              
                              <IconButton
                                onClick={() => removeCalculation(calculation.id)}
                                size="small"
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Stack>
                          </Grid>
                        </Grid>

                        {calculation.expression && (
                          <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {calculation.expression}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>

                {plan.structure.calculations.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No calculations defined
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Add calculations to define the business logic of your compensation plan
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={addCalculation}
                    >
                      Add Your First Calculation
                    </Button>
                  </Box>
                )}
              </Box>
            </TabPanel>

            {/* Conditions Tab */}
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6">Conditions & Rules</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Define eligibility criteria and validation rules
                </Typography>
                
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="body1" color="text.secondary">
                    Conditions editor coming soon...
                  </Typography>
                </Box>
              </Box>
            </TabPanel>

            {/* Outputs Tab */}
            <TabPanel value={activeTab} index={3}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6">Output Configuration</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Define how calculation results are formatted and displayed
                </Typography>
                
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="body1" color="text.secondary">
                    Output configuration coming soon...
                  </Typography>
                </Box>
              </Box>
            </TabPanel>

            {/* Settings Tab */}
            <TabPanel value={activeTab} index={4}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6">Plan Settings</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configure calculation behavior and collaboration options
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>General Settings</Typography>
                        
                        <Stack spacing={2}>
                          <TextField
                            label="Description"
                            value={plan.description}
                            onChange={(e) => handlePlanChange({ description: e.target.value })}
                            multiline
                            rows={3}
                            fullWidth
                          />
                          
                          <FormControl fullWidth>
                            <InputLabel>Plan Type</InputLabel>
                            <Select
                              value={plan.type}
                              onChange={(e) => handlePlanChange({ type: e.target.value as any })}
                              label="Plan Type"
                            >
                              <MenuItem value="commission">Commission</MenuItem>
                              <MenuItem value="bonus">Bonus</MenuItem>
                              <MenuItem value="incentive">Incentive</MenuItem>
                              <MenuItem value="hybrid">Hybrid</MenuItem>
                            </Select>
                          </FormControl>
                          
                          <TextField
                            label="Tags (comma separated)"
                            value={plan.tags.join(', ')}
                            onChange={(e) => handlePlanChange({ 
                              tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                            })}
                            fullWidth
                          />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Calculation Settings</Typography>
                        
                        <Stack spacing={2}>
                          <FormControl fullWidth>
                            <InputLabel>Currency</InputLabel>
                            <Select
                              value={plan.settings.currency}
                              onChange={(e) => handlePlanChange({
                                settings: { ...plan.settings, currency: e.target.value }
                              })}
                              label="Currency"
                            >
                              <MenuItem value="USD">USD</MenuItem>
                              <MenuItem value="EUR">EUR</MenuItem>
                              <MenuItem value="GBP">GBP</MenuItem>
                            </Select>
                          </FormControl>
                          
                          <TextField
                            label="Decimal Places"
                            type="number"
                            value={plan.settings.decimalPlaces}
                            onChange={(e) => handlePlanChange({
                              settings: { ...plan.settings, decimalPlaces: parseInt(e.target.value) }
                            })}
                            inputProps={{ min: 0, max: 10 }}
                            fullWidth
                          />
                          
                          <FormControl fullWidth>
                            <InputLabel>Rounding Method</InputLabel>
                            <Select
                              value={plan.settings.roundingMethod}
                              onChange={(e) => handlePlanChange({
                                settings: { ...plan.settings, roundingMethod: e.target.value as any }
                              })}
                              label="Rounding Method"
                            >
                              <MenuItem value="up">Round Up</MenuItem>
                              <MenuItem value="down">Round Down</MenuItem>
                              <MenuItem value="nearest">Round to Nearest</MenuItem>
                            </Select>
                          </FormControl>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
          </DragDropContext>
        </Box>
      </Box>

      {/* Expression Editor Dialog */}
      <Dialog 
        open={showExpressionEditor} 
        onClose={() => setShowExpressionEditor(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogContent sx={{ p: 0, height: '100%' }}>
          {selectedExpression && (
            <ExpressionStudio
              expression={currentExpressionValue}
              onChange={setCurrentExpressionValue}
              onTest={handleTestExpression}
              onSave={(expr) => {
                setCurrentExpressionValue(expr);
                handleApplyExpression();
              }}
              availableFields={plan?.structure.fields.map(field => field.name) || []}
              availableFunctions={[
                {
                  name: 'SUM',
                  parameters: ['values...'],
                  description: 'Calculate sum of values',
                  category: 'Mathematical',
                },
                {
                  name: 'AVG',
                  parameters: ['values...'],
                  description: 'Calculate average of values',
                  category: 'Mathematical',
                },
                {
                  name: 'IF',
                  parameters: ['condition', 'true_value', 'false_value'],
                  description: 'Conditional expression',
                  category: 'Conditional',
                },
                {
                  name: 'PERCENT',
                  parameters: ['value', 'total'],
                  description: 'Calculate percentage',
                  category: 'Compensation',
                },
                {
                  name: 'BAND',
                  parameters: ['value', 'bands'],
                  description: 'Apply banding logic',
                  category: 'Compensation',
                },
              ]}
              title={`Expression Editor - ${selectedExpression.type}: ${selectedExpression.id}`}
              theme="light"
              showTemplates={true}
              showHistory={true}
              autoSave={false}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExpressionEditor(false)}>Cancel</Button>
          <Button 
            variant="contained"
            onClick={handleApplyExpression}
            disabled={!currentExpressionValue.trim()}
          >
            Apply Expression
          </Button>
        </DialogActions>
      </Dialog>

      {/* Collaboration Panel */}
      <Drawer
        anchor="right"
        open={showCollabPanel}
        onClose={() => setShowCollabPanel(false)}
        PaperProps={{ sx: { width: 400 } }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Collaborators</Typography>
            <IconButton onClick={() => setShowCollabPanel(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
          
          <List>
            {collaborators.map((collaborator) => (
              <ListItem key={collaborator.userId}>
                <ListItemText
                  primary={collaborator.userName}
                  secondary={`${collaborator.userEmail} • ${collaborator.role}`}
                />
              </ListItem>
            ))}
          </List>
          
          {collaborators.length === 0 && (
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              No collaborators yet
            </Typography>
          )}
          
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            sx={{ mt: 2 }}
          >
            Add Collaborator
          </Button>
        </Box>
      </Drawer>

      {/* Notification */}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        message={notification?.message}
      />
    </Box>
  );
};

export default PlanStudio;