import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ValidIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface MockPlan {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'archived';
  version: string;
  description?: string;
  steps: MockStep[];
}

interface MockStep {
  id: string;
  name: string;
  expression: string;
  description: string;
  order: number;
}

const PlanBuilderOffline: React.FC = () => {
  // Mock data for demonstration
  const [plans, setPlans] = useState<MockPlan[]>([
    {
      id: '1',
      name: 'Sales Bonus Plan 2024',
      status: 'draft',
      version: '1.0',
      description: 'Annual sales compensation plan with tiered bonuses',
      steps: [
        {
          id: '1-1',
          name: 'Base Calculation',
          expression: 'sales_amount * 0.05',
          description: 'Calculate 5% of total sales',
          order: 1,
        },
        {
          id: '1-2',
          name: 'Performance Multiplier',
          expression: 'base_bonus * performance_rating',
          description: 'Apply performance multiplier',
          order: 2,
        },
      ],
    },
    {
      id: '2',
      name: 'Management Bonus Scheme',
      status: 'active',
      version: '2.1',
      description: 'Leadership bonus based on team performance',
      steps: [
        {
          id: '2-1',
          name: 'Team Performance',
          expression: 'team_revenue / team_target',
          description: 'Calculate team achievement ratio',
          order: 1,
        },
      ],
    },
  ]);

  const [selectedPlan, setSelectedPlan] = useState<MockPlan | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDescription, setNewPlanDescription] = useState('');

  const handleCreatePlan = () => {
    if (newPlanName.trim()) {
      const newPlan: MockPlan = {
        id: Date.now().toString(),
        name: newPlanName.trim(),
        status: 'draft',
        version: '1.0',
        description: newPlanDescription.trim(),
        steps: [],
      };
      setPlans([...plans, newPlan]);
      setNewPlanName('');
      setNewPlanDescription('');
      setCreateDialog(false);
    }
  };

  const handleDeletePlan = (planId: string) => {
    setPlans(plans.filter(p => p.id !== planId));
    if (selectedPlan?.id === planId) {
      setSelectedPlan(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'warning';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Plan Builder - Offline Mode
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Offline Mode Active:</strong> The backend server is currently unavailable. 
        This demo version shows how the Plan Builder would work with mock data. 
        All functionality is simulated locally.
      </Alert>

      <Stack direction="row" spacing={3}>
        {/* Plans List */}
        <Paper sx={{ p: 2, minWidth: 400 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              Bonus Plans ({plans.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialog(true)}
              size="small"
            >
              New Plan
            </Button>
          </Stack>

          <List dense>
            {plans.map((plan) => (
              <ListItem
                key={plan.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  cursor: 'pointer',
                  bgcolor: selectedPlan?.id === plan.id ? 'action.selected' : 'background.paper',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => setSelectedPlan(plan)}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle2">{plan.name}</Typography>
                      <Chip
                        label={plan.status}
                        size="small"
                        color={getStatusColor(plan.status) as any}
                        variant="outlined"
                      />
                    </Stack>
                  }
                  secondary={`Version ${plan.version} • ${plan.steps.length} steps`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Plan Details */}
        <Paper sx={{ p: 2, flex: 1 }}>
          {selectedPlan ? (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">{selectedPlan.name}</Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    size="small"
                  >
                    Edit Plan
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    size="small"
                    onClick={() => handleDeletePlan(selectedPlan.id)}
                  >
                    Delete
                  </Button>
                </Stack>
              </Stack>

              <Stack spacing={2}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Plan Information
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Status:</strong> {selectedPlan.status}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Version:</strong> {selectedPlan.version}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {selectedPlan.description || 'No description provided'}
                    </Typography>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">
                        Calculation Steps ({selectedPlan.steps.length})
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        size="small"
                      >
                        Add Step
                      </Button>
                    </Stack>

                    {selectedPlan.steps.length === 0 ? (
                      <Alert severity="info">
                        No calculation steps defined. Click "Add Step" to create the first step.
                      </Alert>
                    ) : (
                      <Stack spacing={1}>
                        {selectedPlan.steps.map((step) => (
                          <Paper key={step.id} sx={{ p: 2, bgcolor: 'grey.50' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="start">
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2">{step.name}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  {step.description}
                                </Typography>
                                <Typography 
                                  variant="code" 
                                  sx={{ 
                                    mt: 1, 
                                    display: 'block',
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem',
                                    bgcolor: 'background.paper',
                                    p: 1,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                  }}
                                >
                                  {step.expression}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1}>
                                <ValidIcon color="success" fontSize="small" />
                                <Button size="small" startIcon={<EditIcon />}>
                                  Edit
                                </Button>
                              </Stack>
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Stack>
            </>
          ) : (
            <Alert severity="info">
              Select a plan from the list to view and edit its details.
            </Alert>
          )}
        </Paper>
      </Stack>

      {/* Create Plan Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Bonus Plan</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Plan Name"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newPlanDescription}
              onChange={(e) => setNewPlanDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreatePlan} 
            variant="contained"
            disabled={!newPlanName.trim()}
          >
            Create Plan
          </Button>
        </DialogActions>
      </Dialog>

      <Alert severity="success" sx={{ mt: 3 }}>
        <strong>Demo Features Available:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>✅ View existing bonus plans</li>
          <li>✅ Create new plans</li>
          <li>✅ Delete plans</li>
          <li>✅ View plan details and calculation steps</li>
          <li>🔄 Edit functionality (simulated)</li>
        </ul>
      </Alert>
    </Box>
  );
};

export default PlanBuilderOffline;
