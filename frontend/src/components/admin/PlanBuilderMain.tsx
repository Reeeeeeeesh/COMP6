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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  CheckCircle as ValidIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import Editor from '@monaco-editor/react';
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

const PlanBuilderMain: React.FC = () => {
  // State Management
  const [plans, setPlans] = useState<BonusPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BonusPlan | null>(null);
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([]);
  const [selectedStep, setSelectedStep] = useState<PlanStep | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

  // Load initial data
  useEffect(() => {
    loadPlans();
  }, []);

  // Load plan steps when plan selection changes
  useEffect(() => {
    if (selectedPlan) {
      loadPlanSteps(selectedPlan.id);
    }
  }, [selectedPlan]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const fetchedPlans = await getPlans();
      setPlans(fetchedPlans);
      
      // Auto-select first draft plan
      const draftPlan = fetchedPlans.find(p => p.status === 'draft');
      if (draftPlan) {
        setSelectedPlan(draftPlan);
      }
    } catch (err) {
      setError(`Failed to load plans: ${err}`);
    } finally {
      setLoading(false);
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

  const handleCreatePlan = async () => {
    try {
      const newPlan = await createPlan({
        name: newPlanName,
        notes: newPlanNotes,
        status: 'draft',
      });
      
      setPlans([...plans, newPlan]);
      setSelectedPlan(newPlan);
      setCreatePlanDialog(false);
      setNewPlanName('');
      setNewPlanNotes('');
    } catch (err) {
      setError(`Failed to create plan: ${err}`);
    }
  };

  const handleCreateStep = () => {
    setSelectedStep(null);
    setStepName('');
    setStepExpression('');
    setStepOutputs('');
    setStepDescription('');
    setValidationResult(null);
    setEditStepDialog(true);
  };

  const handleEditStep = (step: PlanStep) => {
    setSelectedStep(step);
    setStepName(step.name);
    setStepExpression(step.expression);
    setStepOutputs(step.outputs.join(', '));
    setStepDescription(step.description || '');
    setValidationResult(null);
    setEditStepDialog(true);
  };

  const handleSaveStep = async () => {
    if (!selectedPlan) return;

    try {
      const stepData = {
        name: stepName,
        expression: stepExpression,
        outputs: stepOutputs.split(',').map(s => s.trim()).filter(s => s),
        description: stepDescription,
        step_order: selectedStep?.step_order || planSteps.length + 1,
      };

      if (selectedStep) {
        // Update existing step
        await updatePlanStep(selectedStep.id, stepData);
      } else {
        // Create new step
        await createPlanStep(selectedPlan.id, stepData);
      }

      // Reload steps
      await loadPlanSteps(selectedPlan.id);
      setEditStepDialog(false);
    } catch (err) {
      setError(`Failed to save step: ${err}`);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Are you sure you want to delete this step?')) return;

    try {
      await deletePlanStep(stepId);
      await loadPlanSteps(selectedPlan!.id);
    } catch (err) {
      setError(`Failed to delete step: ${err}`);
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bonus Plan Builder
      </Typography>

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
              {plans.map((plan) => (
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
                  {planSteps.map((step, index) => (
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
      <Dialog open={editStepDialog} onClose={() => setEditStepDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedStep ? 'Edit Plan Step' : 'Create Plan Step'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Step Name"
                value={stepName}
                onChange={(e) => setStepName(e.target.value)}
                fullWidth
              />
              <TextField
                label="Output Variables (comma-separated)"
                value={stepOutputs}
                onChange={(e) => setStepOutputs(e.target.value)}
                fullWidth
                placeholder="e.g., bonus_amount, adjusted_bonus"
              />
            </Box>
            <TextField
              label="Description"
              value={stepDescription}
              onChange={(e) => setStepDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Expression (use Monaco editor below)
              </Typography>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Editor
                  height="200px"
                  defaultLanguage="javascript"
                  value={stepExpression}
                  onChange={handleExpressionChange}
                  options={{
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    theme: 'vs-light',
                  }}
                />
              </Box>
              
              {validationResult && (
                <Alert
                  severity={validationResult.valid ? 'success' : 'error'}
                  sx={{ mt: 1 }}
                  icon={validationResult.valid ? <ValidIcon /> : <ErrorIcon />}
                >
                  {validationResult.valid ? (
                    <>
                      Expression is valid! Variables: {validationResult.variables.join(', ') || 'none'}
                    </>
                  ) : (
                    <>
                      {validationResult.error}
                    </>
                  )}
                </Alert>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditStepDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSaveStep}
            variant="contained"
            disabled={!stepName.trim() || !stepExpression.trim() || (validationResult != null && !validationResult.valid)}
          >
            Save Step
          </Button>
        </DialogActions>
      </Dialog>
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