/**
 * Minimal Test Component for Plan Builder - Debug Version
 * This will help us isolate what's causing the blank screen issue
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  Button,
  Paper,
} from '@mui/material';

const PlanBuilderTest: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  console.log('🔧 PlanBuilderTest: Component rendering, step:', step);

  useEffect(() => {
    console.log('🔧 PlanBuilderTest: useEffect triggered');

    // Simulate initialization
    setTimeout(() => {
      console.log('🔧 PlanBuilderTest: Setting loading to false');
      setLoading(false);
    }, 1000);
  }, []);

  const testStep = () => {
    console.log('🔧 PlanBuilderTest: Testing step', step + 1);
    setStep(s => s + 1);
  };

  if (loading) {
    console.log('🔧 PlanBuilderTest: Rendering loading state');
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading test component...</Typography>
      </Box>
    );
  }

  if (error) {
    console.log('🔧 PlanBuilderTest: Rendering error state');
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  console.log('🔧 PlanBuilderTest: Rendering main content');

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Plan Builder Test Component
      </Typography>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6">
          Test Step: {step}
        </Typography>
        <Button
          variant="contained"
          onClick={testStep}
          sx={{ mt: 1 }}
        >
          Next Step
        </Button>
      </Paper>

      <Alert severity="success" sx={{ mt: 2 }}>
        ✅ Basic component rendering works!
      </Alert>
    </Box>
  );
};

export default PlanBuilderTest;