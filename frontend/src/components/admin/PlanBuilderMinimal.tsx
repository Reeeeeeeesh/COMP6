/**
 * Minimal Plan Builder - Gradual feature addition for debugging
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  Button,
  Paper,
} from '@mui/material';

// Import only the service types first, no functions
import type { BonusPlan } from '../../services/planManagementService';

const PlanBuilderMinimal: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<BonusPlan[]>([]);

  console.log('🔧 PlanBuilderMinimal: Component rendering');

  useEffect(() => {
    console.log('🔧 PlanBuilderMinimal: useEffect - simulating plan loading');

    // Simulate loading without actual API call
    setTimeout(() => {
      console.log('🔧 PlanBuilderMinimal: Setting up mock plans');
      const mockPlans: BonusPlan[] = [
        {
          id: 'mock-1',
          name: 'Mock Plan 1',
          version: 1,
          status: 'draft',
          notes: 'This is a mock plan',
          created_at: new Date().toISOString(),
        },
      ];

      setPlans(mockPlans);
      setLoading(false);
      console.log('✅ PlanBuilderMinimal: Mock plans loaded successfully');
    }, 500);
  }, []);

  if (loading) {
    console.log('🔧 PlanBuilderMinimal: Rendering loading state');
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading minimal plan builder...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  console.log('🔧 PlanBuilderMinimal: Rendering main content');

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Plan Builder - Minimal Version
      </Typography>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Plans ({plans.length})
        </Typography>

        {plans.map((plan) => (
          <Paper key={plan.id} sx={{ p: 1, mb: 1, bgcolor: 'grey.50' }}>
            <Typography variant="body1">
              {plan.name} - {plan.status}
            </Typography>
          </Paper>
        ))}

        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={() => {
            console.log('🔧 Add plan button clicked');
            setPlans(prev => [...prev, {
              id: `mock-${prev.length + 1}`,
              name: `New Plan ${prev.length + 1}`,
              version: 1,
              status: 'draft',
              created_at: new Date().toISOString(),
            }]);
          }}
        >
          Add Mock Plan
        </Button>
      </Paper>

      <Alert severity="info" sx={{ mt: 2 }}>
        ✅ Minimal plan builder working! No external API calls.
      </Alert>
    </Box>
  );
};

export default PlanBuilderMinimal;