import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Alert
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { CategoryBasedBatchParameters, CategoryParameters, BatchParameters } from './BatchParameterConfig';

interface CategoryParameterConfigProps {
  parameters: CategoryBasedBatchParameters;
  onParametersChange: (parameters: CategoryBasedBatchParameters) => void;
  availableCategories?: {
    departments: string[];
    positions: string[];
  };
}

const SALARY_RANGES = [
  'Under 25k',
  '25k-50k', 
  '50k-75k',
  '75k-100k',
  '100k-150k',
  '150k-200k',
  '200k+'
];

export const CategoryParameterConfig: React.FC<CategoryParameterConfigProps> = ({
  parameters,
  onParametersChange,
  availableCategories = { departments: [], positions: [] }
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>([]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAccordionToggle = (accordion: string) => {
    setExpandedAccordions(prev => 
      prev.includes(accordion) 
        ? prev.filter(a => a !== accordion)
        : [...prev, accordion]
    );
  };

  const updateCategoryParameters = (
    categoryType: 'departmentOverrides' | 'salaryRangeOverrides' | 'positionOverrides',
    categoryName: string,
    categoryParams: CategoryParameters | null
  ) => {
    const updatedParameters = { ...parameters };
    
    if (!updatedParameters[categoryType]) {
      updatedParameters[categoryType] = {};
    }
    
    if (categoryParams === null) {
      // Remove the category override
      delete updatedParameters[categoryType]![categoryName];
    } else {
      // Update the category override
      updatedParameters[categoryType]![categoryName] = categoryParams;
    }
    
    onParametersChange(updatedParameters);
  };

  const renderParameterInputs = (
    categoryType: 'departmentOverrides' | 'salaryRangeOverrides' | 'positionOverrides',
    categoryName: string,
    currentParams: CategoryParameters = {}
  ) => {
    const updateParam = (paramName: keyof CategoryParameters, value: any) => {
      const updatedParams = { ...currentParams, [paramName]: value };
      updateCategoryParameters(categoryType, categoryName, updatedParams);
    };

    return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Target Bonus %"
            type="number"
            value={currentParams.targetBonusPct || ''}
            onChange={(e) => updateParam('targetBonusPct', e.target.value ? parseFloat(e.target.value) : undefined)}
            inputProps={{ min: 0, max: 100, step: 0.1 }}
            helperText="Leave empty to use default"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Investment Weight"
            type="number"
            value={currentParams.investmentWeight || ''}
            onChange={(e) => updateParam('investmentWeight', e.target.value ? parseFloat(e.target.value) : undefined)}
            inputProps={{ min: 0, max: 1, step: 0.01 }}
            helperText="Leave empty to use default"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Qualitative Weight"
            type="number"
            value={currentParams.qualitativeWeight || ''}
            onChange={(e) => updateParam('qualitativeWeight', e.target.value ? parseFloat(e.target.value) : undefined)}
            inputProps={{ min: 0, max: 1, step: 0.01 }}
            helperText="Leave empty to use default"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="RAF (Risk Adjustment Factor)"
            type="number"
            value={currentParams.raf || ''}
            onChange={(e) => updateParam('raf', e.target.value ? parseFloat(e.target.value) : undefined)}
            inputProps={{ min: 0, step: 0.1 }}
            helperText="Leave empty to use default"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="MRT Cap %"
            type="number"
            value={currentParams.mrtCapPct || ''}
            onChange={(e) => updateParam('mrtCapPct', e.target.value ? parseFloat(e.target.value) : undefined)}
            inputProps={{ min: 0, step: 0.1 }}
            helperText="Leave empty to use default"
          />
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => updateCategoryParameters(categoryType, categoryName, null)}
            >
              Remove Override
            </Button>
          </Box>
        </Grid>
      </Grid>
    );
  };

  const renderCategoryOverrides = (
    categoryType: 'departmentOverrides' | 'salaryRangeOverrides' | 'positionOverrides',
    availableOptions: string[],
    title: string
  ) => {
    const existingOverrides = parameters[categoryType] || {};
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        
        {Object.keys(existingOverrides).length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No {title.toLowerCase()} overrides configured. Add overrides to apply different parameters to specific {title.toLowerCase().slice(0, -1)} categories.
          </Alert>
        )}
        
        {Object.entries(existingOverrides).map(([categoryName, categoryParams]) => (
          <Accordion
            key={categoryName}
            expanded={expandedAccordions.includes(`${categoryType}-${categoryName}`)}
            onChange={() => handleAccordionToggle(`${categoryType}-${categoryName}`)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="subtitle1">{categoryName}</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Chip
                  label={`${Object.keys(categoryParams).length} overrides`}
                  size="small"
                  color="primary"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {renderParameterInputs(categoryType, categoryName, categoryParams)}
            </AccordionDetails>
          </Accordion>
        ))}
        
        <Paper sx={{ p: 2, mt: 2, backgroundColor: 'grey.50' }}>
          <Typography variant="subtitle2" gutterBottom>
            Add New Override
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Select {title.slice(0, -1)}</InputLabel>
            <Select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  updateCategoryParameters(categoryType, e.target.value as string, {});
                }
              }}
              label={`Select ${title.slice(0, -1)}`}
            >
              {availableOptions
                .filter(option => !existingOverrides[option])
                .map(option => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Paper>
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Category-Based Parameter Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Configure different calculation parameters for specific departments, salary ranges, or positions.
        Parameters not specified will use the default values.
      </Typography>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Department Overrides" />
        <Tab label="Salary Range Overrides" />
        <Tab label="Position Overrides" />
      </Tabs>

      {activeTab === 0 && renderCategoryOverrides(
        'departmentOverrides',
        availableCategories.departments,
        'Departments'
      )}

      {activeTab === 1 && renderCategoryOverrides(
        'salaryRangeOverrides',
        SALARY_RANGES,
        'Salary Ranges'
      )}

      {activeTab === 2 && renderCategoryOverrides(
        'positionOverrides',
        availableCategories.positions,
        'Positions'
      )}
    </Box>
  );
};

export default CategoryParameterConfig; 