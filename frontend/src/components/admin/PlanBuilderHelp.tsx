import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Code as CodeIcon,
  Functions as FunctionIcon,
  TrendingUp as TrendingUpIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';

interface PlanBuilderHelpProps {
  open: boolean;
  onClose: () => void;
}

export const PlanBuilderHelp: React.FC<PlanBuilderHelpProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CodeIcon color="primary" />
          Plan Builder Quick Guide
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* What is Plan Builder */}
          <Alert severity="info">
            <Typography variant="h6" gutterBottom>
              🎯 What is the Plan Builder?
            </Typography>
            <Typography variant="body2">
              The Plan Builder helps you create sophisticated bonus calculation plans using simple expressions. 
              Each plan consists of multiple steps that process data sequentially to calculate final compensation amounts.
            </Typography>
          </Alert>

          {/* Step-by-step guide */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                📋 How to Create a Plan
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="1. Give your step a clear name"
                    secondary="Example: 'Base Salary Calculation' or 'Performance Bonus'"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="2. Write a description"
                    secondary="Explain what this step calculates and why it's needed"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="3. Create the calculation expression"
                    secondary="Use JavaScript-style syntax with variables and functions"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="4. Define output variables"
                    secondary="Specify what variables this step produces for other steps to use"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Expression Examples */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                💻 Expression Examples
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  <CalculateIcon fontSize="small" sx={{ mr: 1 }} />
                  Basic Calculations
                </Typography>
                <Box component="pre" sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
                  <code>base_salary * 0.05        // 5% of base salary</code><br/>
                  <code>sales_amount * 0.02       // 2% commission</code><br/>
                  <code>hours_worked * hourly_rate // Simple multiplication</code>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  <FunctionIcon fontSize="small" sx={{ mr: 1 }} />
                  Conditional Logic
                </Typography>
                <Box component="pre" sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
                  <code>if(performance_rating {'>'}= 80, bonus_rate * sales, 0)</code><br/>
                  <code>if(tenure_years {'>'}= 2, senior_bonus, junior_bonus)</code><br/>
                  <code>if(quota_achievement {'>'}= 100, extra_commission, 0)</code>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  <TrendingUpIcon fontSize="small" sx={{ mr: 1 }} />
                  Advanced Examples
                </Typography>
                <Box component="pre" sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
                  <code>min(calculated_bonus, max_bonus_cap)  // Apply maximum limit</code><br/>
                  <code>max(base_commission, minimum_payout)  // Ensure minimum payment</code><br/>
                  <code>previous_step_result + discretionary_bonus</code>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Tips and Best Practices */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                💡 Tips & Best Practices
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Use descriptive variable names"
                    secondary="Instead of 'x', use 'base_salary' or 'performance_rating'"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Test your expressions with sample data"
                    secondary="Make sure the calculation produces expected results"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Break complex calculations into multiple steps"
                    secondary="Easier to debug and understand"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Use comments in your expressions"
                    secondary="Start lines with // to add explanatory comments"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Available Functions */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                🔧 Available Functions
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1 }}>
                <Typography variant="body2"><code>if(condition, true_value, false_value)</code></Typography>
                <Typography variant="body2"><code>min(value1, value2, ...)</code></Typography>
                <Typography variant="body2"><code>max(value1, value2, ...)</code></Typography>
                <Typography variant="body2"><code>abs(value)</code> - Absolute value</Typography>
                <Typography variant="body2"><code>round(value)</code> - Round to nearest integer</Typography>
                <Typography variant="body2"><code>floor(value)</code> - Round down</Typography>
                <Typography variant="body2"><code>ceil(value)</code> - Round up</Typography>
                <Typography variant="body2"><code>pow(base, exponent)</code> - Power</Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="contained" size="large">
          Got it, thanks!
        </Button>
      </DialogActions>
    </Dialog>
  );
};
