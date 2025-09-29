/**
 * Import Test Component - Tests each import individually
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
} from '@mui/material';

// Test individual imports one by one
const PlanBuilderImportTest: React.FC = () => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const testStep1 = () => {
    console.log('🔧 Testing MUI Icons import...');
    try {
      // Test MUI icons import
      const {
        Add: AddIcon,
        Edit: EditIcon,
        Delete: DeleteIcon,
      } = require('@mui/icons-material');
      console.log('✅ MUI Icons imported successfully');
      setStep(2);
    } catch (err) {
      console.error('❌ MUI Icons import failed:', err);
      setError(`MUI Icons import failed: ${err}`);
    }
  };

  const testStep2 = () => {
    console.log('🔧 Testing Monaco Editor import...');
    try {
      // Test Monaco Editor import
      const Editor = require('@monaco-editor/react');
      console.log('✅ Monaco Editor imported successfully');
      setStep(3);
    } catch (err) {
      console.error('❌ Monaco Editor import failed:', err);
      setError(`Monaco Editor import failed: ${err}`);
    }
  };

  const testStep3 = () => {
    console.log('🔧 Testing Plan Management Service import...');
    try {
      // Test service import
      const planService = require('../../services/planManagementService');
      console.log('✅ Plan Management Service imported successfully');
      setStep(4);
    } catch (err) {
      console.error('❌ Plan Management Service import failed:', err);
      setError(`Plan Management Service import failed: ${err}`);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Plan Builder Import Test
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" sx={{ mb: 2 }}>
        Current Step: {step}
      </Typography>

      {step === 1 && (
        <Box>
          <Typography>Testing MUI Icons import...</Typography>
          <Button variant="contained" onClick={testStep1} sx={{ mt: 1 }}>
            Test MUI Icons
          </Button>
        </Box>
      )}

      {step === 2 && (
        <Box>
          <Typography>✅ MUI Icons OK. Testing Monaco Editor import...</Typography>
          <Button variant="contained" onClick={testStep2} sx={{ mt: 1 }}>
            Test Monaco Editor
          </Button>
        </Box>
      )}

      {step === 3 && (
        <Box>
          <Typography>✅ Monaco Editor OK. Testing Plan Management Service import...</Typography>
          <Button variant="contained" onClick={testStep3} sx={{ mt: 1 }}>
            Test Plan Service
          </Button>
        </Box>
      )}

      {step === 4 && (
        <Alert severity="success">
          ✅ All imports successful! The issue is likely in the component logic, not imports.
        </Alert>
      )}
    </Box>
  );
};

export default PlanBuilderImportTest;