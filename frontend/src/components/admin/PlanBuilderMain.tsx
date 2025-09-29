/**
 * Plan Builder Main Component - Visual bonus plan configuration interface
 * Provides Monaco editor integration with real-time validation and step management
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Stack,
  Card,
  CardContent,
  CardActions,
  Tooltip,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Collapse,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  CheckCircle as ValidIcon,
  Error as ErrorIcon,
  Help as HelpIcon,
  Info as InfoIcon,
  LightbulbOutlined as TipIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
// Removed Monaco editor - using TextField for better compatibility
import {
  BonusPlan,
  PlanStep,
  getPlans,
  getPlanSteps,
  createPlan,
  createPlanStep,
  updatePlanStep,
  deletePlanStep,
  validateExpression,
  ExpressionValidation,
} from '../../services/planManagementService';
import { PlanBuilderHelp } from './PlanBuilderHelp';

// Removed Monaco Error Boundary - using simple TextField editor

const PlanBuilderMain: React.FC = () => {
  // State Management
  const [plans, setPlans] = useState<BonusPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BonusPlan | null>(null);
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([]);
  const [helpDialog, setHelpDialog] = useState(false);
  const [selectedStep, setSelectedStep] = useState<PlanStep | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug logging for component lifecycle
  console.log('🔧 PlanBuilderMain: Component rendering, loading:', loading, 'error:', error);
  console.log('🔧 PlanBuilderMain: Plans state:', plans, 'type:', typeof plans, 'isArray:', Array.isArray(plans));
  console.log('🔧 PlanBuilderMain: PlanSteps state:', planSteps, 'type:', typeof planSteps, 'isArray:', Array.isArray(planSteps));

  // Dialog State
  const [createPlanDialog, setCreatePlanDialog] = useState(false);
  const [editStepDialog, setEditStepDialog] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanNotes, setNewPlanNotes] = useState('');
  
  // Step Editor State
  const [stepName, setStepName] = useState('');
  const [stepExpression, setStepExpression] = useState('');
  const [stepOutputs, setStepOutputs] = useState('');
  const [stepDescription, setStepDescription] = useState('');
  const [validationResult, setValidationResult] = useState<ExpressionValidation | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [dialogFullyOpen, setDialogFullyOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadPlans();
  }, []);

  // Removed Monaco loader initialization - using simple TextField editor

  // Load plan steps when plan selection changes
  useEffect(() => {
    if (selectedPlan) {
      loadPlanSteps(selectedPlan.id);
    }
  }, [selectedPlan]);

  // Handle dialog state changes
  useEffect(() => {
    if (editStepDialog) {
      // Dialog is opening - start initialization process
      console.log('🚀 Dialog opening, starting Monaco initialization...');
      setDialogFullyOpen(false);
      setEditorReady(false);
      
      // Progressive initialization with multiple fallbacks
      setTimeout(() => {
        setDialogFullyOpen(true);
        console.log('✅ Dialog marked as fully open');
      }, 100);
      
      setTimeout(() => {
        setEditorReady(true);
        console.log('✅ Editor marked as ready (primary)');
      }, 500);
      
      // Ultimate fallback
      setTimeout(() => {
        setEditorReady(true);
        console.log('🔄 Editor forced ready (fallback)');
      }, 2000);
      
    } else {
      // Dialog is closing - reset states
      setEditorReady(false);
      setDialogFullyOpen(false);
      console.log('❌ Dialog closed, resetting editor states');
    }
  }, [editStepDialog]);

  const loadPlans = async () => {
    try {
      console.log('🔧 PlanBuilderMain: Starting to load plans...');
      setLoading(true);
      setError(null); // Clear any previous errors

      const fetchedPlans = await getPlans();
      console.log('🔧 PlanBuilderMain: Fetched plans:', fetchedPlans);
      console.log('🔧 PlanBuilderMain: Fetched plans type:', typeof fetchedPlans);
      console.log('🔧 PlanBuilderMain: Is array?', Array.isArray(fetchedPlans));

      // Defensive programming - ensure we always have an array
      const plansArray = Array.isArray(fetchedPlans) ? fetchedPlans : [];
      console.log('🔧 PlanBuilderMain: Using plans array:', plansArray);

      setPlans(plansArray);

      // Auto-select first draft plan
      const draftPlan = plansArray.find(p => p.status === 'draft');
      if (draftPlan) {
        console.log('🔧 PlanBuilderMain: Selected draft plan:', draftPlan);
        setSelectedPlan(draftPlan);
      }
    } catch (err) {
      console.error('❌ PlanBuilderMain: Failed to load plans:', err);
      setError(`Failed to load plans: ${err}`);
    } finally {
      setLoading(false);
      console.log('🔧 PlanBuilderMain: Load plans completed');
    }
  };

  const loadPlanSteps = async (planId: string) => {
    try {
      const steps = await getPlanSteps(planId);
      setPlanSteps(steps.sort((a, b) => a.step_order - b.step_order));
    } catch (err) {
      setError(`Failed to load plan steps: ${err}`);
    }
  };




  // Real-time expression validation
  const validateExpressionDebounced = useCallback(
    debounce(async (expression: string) => {
      if (!selectedPlan || !expression.trim()) {
        setValidationResult(null);
        return;
      }

      try {
        const result = await validateExpression(
          selectedPlan.id,
          expression,
          selectedStep?.step_order
        );
        setValidationResult(result);
      } catch (err) {
        setValidationResult({
          valid: false,
          error: `Validation error: ${err}`,
          variables: [],
        });
      }
    }, 500),
    [selectedPlan, selectedStep]
  );

  const handleExpressionChange = (value: string | undefined) => {
    const expression = value || '';
    setStepExpression(expression);
    validateExpressionDebounced(expression);
  };

  // Handler Functions
  const handleCreatePlan = async () => {
    try {
      console.log('🔧 Creating new plan:', newPlanName);
      const newPlan = await createPlan({
        name: newPlanName,
        notes: newPlanNotes,
        status: 'draft',
      });

      setPlans(prev => [...prev, newPlan]);
      setSelectedPlan(newPlan);
      setCreatePlanDialog(false);
      setNewPlanName('');
      setNewPlanNotes('');
    } catch (err) {
      console.error('❌ Failed to create plan:', err);
      setError(`Failed to create plan: ${err}`);
    }
  };

  const handleCreateStep = () => {
    console.log('🔧 Opening create step dialog');
    setSelectedStep(null);
    setStepName('');
    setStepExpression('');
    setStepOutputs('');
    setStepDescription('');
    setValidationResult(null);
    setEditStepDialog(true);
  };

  const handleEditStep = (step: PlanStep) => {
    console.log('🔧 Opening edit step dialog for:', step);
    setSelectedStep(step);
    setStepName(step.name);
    setStepExpression(step.expression);
    setStepOutputs(step.outputs.join(', '));
    setStepDescription(step.description || '');
    setValidationResult(null);
    setEditStepDialog(true);
  };

  const handleDeleteStep = async (stepId: string) => {
    try {
      console.log('🔧 Deleting step:', stepId);
      await deletePlanStep(stepId);
      setPlanSteps(prev => prev.filter(step => step.id !== stepId));
    } catch (err) {
      console.error('❌ Failed to delete step:', err);
      setError(`Failed to delete step: ${err}`);
    }
  };

  const handleSaveStep = async () => {
    if (!selectedPlan) return;

    try {
      console.log('🔧 Saving step:', selectedStep ? 'update' : 'create');
      const outputs = stepOutputs.split(',').map(o => o.trim()).filter(o => o);

      if (selectedStep) {
        // Update existing step
        const updatedStep = await updatePlanStep(selectedStep.id, {
          name: stepName,
          expression: stepExpression,
          outputs: outputs,
          description: stepDescription,
        });

        setPlanSteps(prev => prev.map(step =>
          step.id === selectedStep.id ? updatedStep : step
        ));
      } else {
        // Create new step
        const newStep = await createPlanStep(selectedPlan.id, {
          name: stepName,
          expression: stepExpression,
          outputs: outputs,
          description: stepDescription,
          step_order: planSteps.length + 1,
        });

        setPlanSteps(prev => [...prev, newStep]);
      }

      setEditStepDialog(false);
    } catch (err) {
      console.error('❌ Failed to save step:', err);
      setError(`Failed to save step: ${err}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'approved': return 'info';  
      case 'locked': return 'success';
      case 'archived': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading plans...</Typography>
      </Box>
    );
  }

  if (error) {
    console.error('🔧 PlanBuilderMain: Rendering error state:', error);
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6">Error Loading Plan Builder</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>{error}</Typography>
          <Button
            variant="outlined"
            size="small"
            sx={{ mt: 2 }}
            onClick={() => {
              setError(null);
              loadPlans();
            }}
          >
            Retry
          </Button>
        </Alert>
      </Box>
    );
  }

  console.log('🔧 PlanBuilderMain: Rendering main component, plans:', plans.length);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1">
          Bonus Plan Builder
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<HelpIcon />}
          onClick={() => setHelpDialog(true)}
          size="large"
        >
          Help & Examples
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Plan Selection Panel */}
        <Box sx={{ flex: '0 0 300px' }}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">Bonus Plans</Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setCreatePlanDialog(true)}
              >
                New Plan
              </Button>
            </Stack>

            <List dense>
              {(Array.isArray(plans) ? plans : []).map((plan) => (
                <ListItem
                  key={plan.id}
                  component="div"
                  onClick={() => setSelectedPlan(plan)}
                  sx={{
                    border: selectedPlan?.id === plan.id ? '2px solid' : '1px solid',
                    borderColor: selectedPlan?.id === plan.id ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    mb: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={plan.name}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          Version {plan.version} • Created {new Date(plan.created_at).toLocaleDateString()}
                        </Typography>
                        <Chip
                          label={plan.status}
                          size="small"
                          color={getStatusColor(plan.status) as any}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>

        {/* Plan Steps Panel */}
        <Box sx={{ flex: 1 }}>
          {selectedPlan ? (
            <Paper sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">
                  Plan Steps - {selectedPlan.name}
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleCreateStep}
                  disabled={selectedPlan.status === 'locked'}
                >
                  Add Step
                </Button>
              </Stack>

              {planSteps.length > 0 ? (
                <List>
                  {(Array.isArray(planSteps) ? planSteps : []).map((step, index) => (
                    <Card key={step.id} sx={{ mb: 2 }}>
                      <CardContent>
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                          <DragIcon color="disabled" />
                          <Typography variant="h6">
                            {index + 1}. {step.name}
                          </Typography>
                          <Chip label={`→ ${step.outputs.join(', ')}`} size="small" variant="outlined" />
                        </Stack>
                        
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            bgcolor: 'grey.100',
                            p: 1,
                            borderRadius: 1,
                            mb: 1,
                          }}
                        >
                          {step.expression}
                        </Typography>
                        
                        {step.description && (
                          <Typography variant="body2" color="text.secondary">
                            {step.description}
                          </Typography>
                        )}
                      </CardContent>
                      
                      <CardActions>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditStep(step)}
                          disabled={selectedPlan.status === 'locked'}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          startIcon={<DeleteIcon />}
                          color="error"
                          onClick={() => handleDeleteStep(step.id)}
                          disabled={selectedPlan.status === 'locked'}
                        >
                          Delete
                        </Button>
                      </CardActions>
                    </Card>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  No steps defined yet. Click "Add Step" to create the first calculation step.
                </Alert>
              )}
            </Paper>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Select a plan to view and edit its calculation steps
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Create Plan Dialog */}
      <Dialog open={createPlanDialog} onClose={() => setCreatePlanDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Bonus Plan</DialogTitle>
        <DialogContent>
          <TextField
            label="Plan Name"
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Notes"
            value={newPlanNotes}
            onChange={(e) => setNewPlanNotes(e.target.value)}
            fullWidth
            multiline
            rows={3}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePlanDialog(false)}>Cancel</Button>
          <Button onClick={handleCreatePlan} variant="contained" disabled={!newPlanName.trim()}>
            Create Plan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Step Dialog */}
      <Dialog 
        open={editStepDialog} 
        onClose={() => {
          setEditStepDialog(false);
          setDialogFullyOpen(false);
        }} 
        maxWidth="lg" 
        fullWidth
        TransitionProps={{
          onEntered: () => {
            console.log('📝 Dialog fully opened, enabling Monaco...');
            setDialogFullyOpen(true);
            // Give more time for Monaco to initialize and the dialog animation to complete
            setTimeout(() => {
              setEditorReady(true);
              console.log('✅ Editor ready after dialog opened');
            }, 300);
            
            // Fallback: Force editor ready after a longer delay if it's still not ready
            setTimeout(() => {
              setEditorReady(true);
              console.log('🔄 Fallback: Force setting editor ready');
            }, 1000);
          },
          onExited: () => {
            setDialogFullyOpen(false);
            setEditorReady(false);
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CodeIcon color="primary" />
            <Typography variant="h6">
              {selectedStep ? 'Edit Plan Step' : 'Create New Plan Step'}
            </Typography>
            <Tooltip title="Plan steps define the calculation logic for your bonus plan. Each step processes data and passes results to the next step.">
              <IconButton size="small">
                <HelpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ overflow: 'visible' }}>
          {/* Getting Started Guide */}
          <Alert severity="info" sx={{ mb: 3 }} icon={<TipIcon />}>
            <Typography variant="subtitle2" gutterBottom>
              💡 How to Create a Plan Step
            </Typography>
            <Typography variant="body2">
              <strong>1.</strong> Give your step a clear name (e.g., "Base Salary Calculation")<br/>
              <strong>2.</strong> Write what it calculates in the description<br/>
              <strong>3.</strong> Create an expression using variables like <code>base_salary</code>, <code>performance_rating</code><br/>
              <strong>4.</strong> Define output variables that other steps can use
            </Typography>
          </Alert>

          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Step Name"
                value={stepName}
                onChange={(e) => setStepName(e.target.value)}
                fullWidth
                required
                placeholder="e.g., Base Salary Calculation"
                helperText="Choose a clear, descriptive name for this calculation step"
                InputProps={{
                  startAdornment: stepName && <ValidIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                }}
              />
              <TextField
                label="Output Variables"
                value={stepOutputs}
                onChange={(e) => setStepOutputs(e.target.value)}
                fullWidth
                placeholder="e.g., base_bonus, commission"
                helperText="Variables that other steps can use (comma-separated)"
              />
            </Box>
            <TextField
              label="Description"
              value={stepDescription}
              onChange={(e) => setStepDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Explain what this step calculates and why it's needed"
              helperText="Help others understand the purpose of this calculation"
              InputProps={{
                startAdornment: stepDescription && <ValidIcon color="success" fontSize="small" sx={{ mr: 1 }} />
              }}
            />
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Typography variant="subtitle2">
                  Calculation Expression
                </Typography>
                <Tooltip title="Use JavaScript-style syntax with mathematical operations, conditions, and functions">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              {/* Expression Examples */}
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  💡 Common Expression Patterns:
                </Typography>
                <Box component="pre" sx={{ fontSize: '0.875rem', fontFamily: 'monospace', m: 0, whiteSpace: 'pre-wrap' }}>
                  <Typography variant="body2" component="div">
                    <code>• Basic calculation: base_salary * 0.05</code><br/>
                    <code>• Conditional logic: if(performance {'>'}= 80, bonus_rate * sales, 0)</code><br/>
                    <code>• Min/Max limits: min(calculated_bonus, max_bonus_cap)</code><br/>
                    <code>• Multiple conditions: if(tenure {'>'}= 2, extra_bonus, base_bonus)</code>
                  </Typography>
                </Box>
              </Alert>

              <Box sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                minHeight: '280px',
                width: '100%',
                position: 'relative',
                backgroundColor: '#f5f5f5'
              }}>
                {dialogFullyOpen && editorReady ? (
                  <TextField
                    multiline
                    rows={10}
                    fullWidth
                    value={stepExpression || ''}
                    onChange={(e) => handleExpressionChange(e.target.value)}
                    placeholder="// Enter your calculation expression here
// Examples:
base_salary * 0.1

// Conditional bonus based on performance
if(performance_rating >= 85, base_salary * 0.15, base_salary * 0.05)

// Multi-tier commission structure
if(sales_amount >= 100000, sales_amount * 0.05, 
   if(sales_amount >= 50000, sales_amount * 0.03, sales_amount * 0.01))"
                    variant="outlined"
                    sx={{
                      '& .MuiInputBase-root': {
                        fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                        fontSize: '14px',
                        lineHeight: 1.4,
                      },
                      '& .MuiInputBase-input': {
                        resize: 'vertical',
                      },
                    }}
                    InputProps={{
                      style: {
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #e9ecef',
                      }
                    }}
                  />
                ) : (
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '280px',
                    color: 'text.secondary',
                    backgroundColor: '#f9f9f9',
                    border: '1px dashed #ccc',
                    borderRadius: 1,
                    gap: 1
                  }}>
                    <Typography variant="body2">
                      {!dialogFullyOpen ? '⏳ Initializing dialog...' : '📝 Preparing expression editor...'}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      Ready in just a moment
                    </Typography>
                  </Box>
                )}
              </Box>
              
              {validationResult && (
                <Alert
                  severity={validationResult.valid ? 'success' : 'error'}
                  sx={{ mt: 2 }}
                  icon={validationResult.valid ? <ValidIcon /> : <ErrorIcon />}
                >
                  {validationResult.valid ? (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        ✅ Expression is valid!
                      </Typography>
                      <Typography variant="body2">
                        <strong>Variables detected:</strong> {validationResult.variables.length > 0 ? validationResult.variables.join(', ') : 'none'}
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        ❌ Expression Error
                      </Typography>
                      <Typography variant="body2">
                        {validationResult.error}
                      </Typography>
                    </Box>
                  )}
                </Alert>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={2} sx={{ width: '100%', alignItems: 'center' }}>
            <Button 
              onClick={() => setEditStepDialog(false)}
              variant="outlined"
              size="large"
            >
              Cancel
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            {(!stepName.trim() || !stepExpression.trim()) && (
              <Typography variant="caption" color="warning.main" sx={{ mr: 2 }}>
                ⚠️ Please fill in step name and expression
              </Typography>
            )}
            <Button
              onClick={handleSaveStep}
              variant="contained"
              size="large"
              disabled={!stepName.trim() || !stepExpression.trim() || (validationResult != null && !validationResult.valid)}
              startIcon={validationResult?.valid ? <ValidIcon /> : undefined}
              sx={{
                minWidth: '120px',
                bgcolor: validationResult?.valid ? 'success.main' : 'primary.main',
                '&:hover': {
                  bgcolor: validationResult?.valid ? 'success.dark' : 'primary.dark',
                }
              }}
            >
              {selectedStep ? 'Update Step' : 'Save Step'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Help Dialog */}
      <PlanBuilderHelp 
        open={helpDialog} 
        onClose={() => setHelpDialog(false)} 
      />
    </Box>
  );
};

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export default PlanBuilderMain;