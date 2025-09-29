import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const PlanBuilderEmergency: React.FC = () => {
  console.log('🚨 EMERGENCY COMPONENT LOADED');

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Plan Builder - Emergency Mode
      </Typography>

      <Alert severity="success" sx={{ mb: 2 }}>
        🎉 SUCCESS! This component loaded without crashing.
      </Alert>

      <Alert severity="info">
        This proves the routing and component loading works.
        The issue is specifically with the PlanBuilderMain component.
      </Alert>

      <Typography variant="body1" sx={{ mt: 2 }}>
        If you can see this message, it means:
        <ul>
          <li>✅ Your routing is working</li>
          <li>✅ Your role permissions are working</li>
          <li>✅ Component loading is working</li>
        </ul>

        The problem is isolated to the PlanBuilderMain component's data handling.
      </Typography>
    </Box>
  );
};

export default PlanBuilderEmergency;