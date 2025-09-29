/**
 * Plan Builder Main Component - SAFE VERSION with comprehensive error handling
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
} from '@mui/icons-material';

// Import only what we need safely
import type {
  BonusPlan,
  PlanStep
} from '../../services/planManagementService';

const PlanBuilderMainSafe: React.FC = () => {
  const [plans, setPlans] = useState<BonusPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('🔧 PlanBuilderMainSafe: Component rendering');
  console.log('🔧 PlanBuilderMainSafe: Plans:', plans, 'isArray:', Array.isArray(plans));

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔧 PlanBuilderMainSafe: Starting data load...');
        setLoading(true);
        setError(null);

        // Try to import the service dynamically to catch import errors
        const planService = await import('../../services/planManagementService');
        console.log('🔧 PlanBuilderMainSafe: Service imported successfully');

        const fetchedPlans = await planService.getPlans();
        console.log('🔧 PlanBuilderMainSafe: Raw fetched data:', fetchedPlans);
        console.log('🔧 PlanBuilderMainSafe: Data type:', typeof fetchedPlans);
        console.log('🔧 PlanBuilderMainSafe: Is array:', Array.isArray(fetchedPlans));

        // Ensure we always have an array
        const safeArray = Array.isArray(fetchedPlans) ? fetchedPlans : [];
        console.log('🔧 PlanBuilderMainSafe: Using safe array:', safeArray);

        setPlans(safeArray);
        console.log('✅ PlanBuilderMainSafe: Plans loaded successfully');

      } catch (err) {
        console.error('❌ PlanBuilderMainSafe: Error:', err);
        setError(`Failed to load data: ${err}`);
      } finally {
        setLoading(false);
        console.log('🔧 PlanBuilderMainSafe: Loading complete');
      }
    };

    loadData();
  }, []);

  if (loading) {
    console.log('🔧 PlanBuilderMainSafe: Rendering loading state');
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Plan Builder...</Typography>
      </Box>
    );
  }

  if (error) {
    console.log('🔧 PlanBuilderMainSafe: Rendering error state');
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6">Plan Builder Error</Typography>
          <Typography variant="body2">{error}</Typography>
          <Button
            variant="outlined"
            size="small"
            sx={{ mt: 1 }}
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </Alert>
      </Box>
    );
  }

  console.log('🔧 PlanBuilderMainSafe: Rendering main content');

  // Ensure plans is always an array before rendering
  const safePlans = Array.isArray(plans) ? plans : [];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Plan Builder - Safe Version
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        This is a safe version of the Plan Builder that handles data structure issues.
      </Alert>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Bonus Plans ({safePlans.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              console.log('🔧 New Plan button clicked');
              alert('New Plan functionality would go here');
            }}
          >
            New Plan
          </Button>
        </Box>

        {safePlans.length === 0 ? (
          <Alert severity="info">
            No plans found. The API might be returning an empty result or the data structure might be different than expected.
          </Alert>
        ) : (
          <Box>
            {safePlans.map((plan, index) => (
              <Paper
                key={plan.id || `plan-${index}`}
                sx={{ p: 2, mb: 1, bgcolor: 'grey.50' }}
              >
                <Typography variant="h6">{plan.name || 'Unnamed Plan'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Status: {plan.status || 'Unknown'} | Version: {plan.version || 'N/A'}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>

      <Alert severity="success" sx={{ mt: 2 }}>
        ✅ Safe version loaded successfully! No crashes from .map() errors.
      </Alert>
    </Box>
  );
};

export default PlanBuilderMainSafe;