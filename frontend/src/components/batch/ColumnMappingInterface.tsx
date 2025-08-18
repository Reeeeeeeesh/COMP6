/**
 * Column Mapping Interface - Visual drag-drop column mapping with intelligent suggestions
 * Transforms CSV column mapping from manual to intelligent with real-time validation
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tooltip,
  IconButton,
  Divider,
} from '@mui/material';
import {
  AutoAwesome as AutoIcon,
  DragIndicator as DragIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Help as HelpIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import { ColumnInfo } from './BatchUploadContainer';
import {
  ColumnSuggestion,
  MappingAnalysis,
  SystemFieldInfo,
  analyzeColumnMapping,
  getFieldSuggestions,
  getSystemFields,
  getConfidenceColor,
  getConfidenceLabel,
  getMatchTypeIcon,
} from '../../services/columnMappingService';

interface ColumnMappingInterfaceProps {
  columns: ColumnInfo[];
  onMappingComplete: (mapping: Record<string, string>) => void;
  onCancel: () => void;
}

export const ColumnMappingInterface: React.FC<ColumnMappingInterfaceProps> = ({
  columns,
  onMappingComplete,
  onCancel,
}) => {
  // State Management
  const [mappingAnalysis, setMappingAnalysis] = useState<MappingAnalysis | null>(null);
  const [currentMapping, setCurrentMapping] = useState<Record<string, string>>({});
  const [systemFields, setSystemFields] = useState<Record<string, SystemFieldInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [columnSuggestions, setColumnSuggestions] = useState<ColumnSuggestion[]>([]);

  // Load initial data
  useEffect(() => {
    loadMappingData();
  }, [columns]);

  const loadMappingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load system fields info
      const fieldsInfo = await getSystemFields();
      setSystemFields(fieldsInfo);

      // Convert columns to format expected by API
      const columnData: Record<string, any> = {};
      columns.forEach(col => {
        columnData[col.name] = {
          data_type: col.data_type,
          sample_values: col.sample_values,
          has_data: col.has_data,
        };
      });

      // Analyze column mapping
      const analysis = await analyzeColumnMapping(columnData);
      setMappingAnalysis(analysis);

      // Set initial mapping from recommendations
      setCurrentMapping(analysis.recommended_mapping);

    } catch (err) {
      setError(`Failed to analyze column mapping: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAnalysis = async () => {
    await loadMappingData();
  };

  const handleColumnMappingChange = (csvColumn: string, systemField: string) => {
    setCurrentMapping(prev => ({
      ...prev,
      [csvColumn]: systemField,
    }));
  };

  const handleRemoveMapping = (csvColumn: string) => {
    setCurrentMapping(prev => {
      const newMapping = { ...prev };
      delete newMapping[csvColumn];
      return newMapping;
    });
  };

  const handleShowSuggestions = async (csvColumn: string) => {
    try {
      const columnData = columns.find(col => col.name === csvColumn);
      if (!columnData) return;

      const suggestions = await getFieldSuggestions(csvColumn, {
        data_type: columnData.data_type,
        sample_values: columnData.sample_values,
        has_data: columnData.has_data,
      });

      setColumnSuggestions(suggestions);
      setSelectedColumn(csvColumn);
      setShowSuggestions(true);
    } catch (err) {
      setError(`Failed to get suggestions: ${err}`);
    }
  };

  const handleApplySuggestion = (suggestion: ColumnSuggestion) => {
    handleColumnMappingChange(suggestion.csv_column, suggestion.system_field);
    setShowSuggestions(false);
  };

  const handleComplete = () => {
    onMappingComplete(currentMapping);
  };

  // Validation and stats
  const validationStats = useMemo(() => {
    if (!mappingAnalysis || !systemFields) {
      return {
        requiredFieldsMapped: 0,
        totalRequiredFields: 0,
        totalMappedColumns: 0,
        overallConfidence: 0,
        canProceed: false,
      };
    }

    const requiredFields = Object.keys(systemFields).filter(field => systemFields[field].required);
    const mappedRequiredFields = requiredFields.filter(field => 
      Object.values(currentMapping).includes(field)
    );

    const totalMappedColumns = Object.keys(currentMapping).length;
    const overallConfidence = mappingAnalysis.confidence_score;
    const canProceed = mappedRequiredFields.length === requiredFields.length;

    return {
      requiredFieldsMapped: mappedRequiredFields.length,
      totalRequiredFields: requiredFields.length,
      totalMappedColumns,
      overallConfidence,
      canProceed,
    };
  }, [mappingAnalysis, currentMapping, systemFields]);

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Analyzing Column Mapping...
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Using AI to intelligently match your CSV columns to system fields
        </Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={handleRefreshAnalysis} startIcon={<RefreshIcon />}>
          Retry Analysis
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">
            <AutoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Intelligent Column Mapping
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={handleRefreshAnalysis}
            startIcon={<RefreshIcon />}
          >
            Re-analyze
          </Button>
        </Stack>

        {/* Validation Summary */}
        <Stack direction="row" spacing={2} mb={2}>
          <Chip
            label={`Required: ${validationStats.requiredFieldsMapped}/${validationStats.totalRequiredFields}`}
            color={validationStats.canProceed ? 'success' : 'error'}
            icon={validationStats.canProceed ? <CheckIcon /> : <WarningIcon />}
          />
          <Chip
            label={`Total Mapped: ${validationStats.totalMappedColumns}`}
            color="info"
          />
          <Chip
            label={`Confidence: ${getConfidenceLabel(validationStats.overallConfidence)}`}
            color={getConfidenceColor(validationStats.overallConfidence) as any}
          />
        </Stack>

        {!validationStats.canProceed && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Please map all required fields (employee_id, base_salary) to continue.
          </Alert>
        )}
      </Paper>

      {/* Column Mapping Cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {columns.map((column) => {
          const mappedField = currentMapping[column.name];
          const suggestion = mappingAnalysis?.suggestions.find(s => s.csv_column === column.name);
          const isRequired = systemFields[mappedField]?.required;

          return (
            <Card key={column.name} sx={{ border: mappedField ? '2px solid' : '1px solid', borderColor: mappedField ? 'primary.main' : 'divider' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <DragIcon color="disabled" />
                  <Box flex={1}>
                    <Typography variant="h6">
                      {column.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Type: {column.data_type} • Values: {column.sample_values.slice(0, 3).join(', ')}
                      {column.sample_values.length > 3 && '...'}
                    </Typography>
                  </Box>

                  {suggestion && (
                    <Tooltip title={suggestion.reasoning}>
                      <Chip
                        size="small"
                        label={`${getMatchTypeIcon(suggestion.match_type)} ${Math.round(suggestion.confidence * 100)}%`}
                        color={getConfidenceColor(suggestion.confidence) as any}
                      />
                    </Tooltip>
                  )}
                </Stack>

                <Stack direction="row" alignItems="center" spacing={2}>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Map to System Field</InputLabel>
                    <Select
                      value={mappedField || ''}
                      onChange={(e) => handleColumnMappingChange(column.name, e.target.value)}
                      label="Map to System Field"
                    >
                      <MenuItem value="">
                        <em>No mapping</em>
                      </MenuItem>
                      {Object.entries(systemFields).map(([fieldName, fieldInfo]) => (
                        <MenuItem key={fieldName} value={fieldName}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography>
                              {fieldName}
                            </Typography>
                            {fieldInfo.required && (
                              <Chip label="Required" size="small" color="error" />
                            )}
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleShowSuggestions(column.name)}
                    startIcon={<HelpIcon />}
                  >
                    Suggestions
                  </Button>

                  {mappedField && (
                    <Button
                      variant="text"
                      size="small"
                      color="error"
                      onClick={() => handleRemoveMapping(column.name)}
                    >
                      Remove
                    </Button>
                  )}
                </Stack>

                {mappedField && systemFields[mappedField] && (
                  <Box mt={2} p={2} sx={{ bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.primary">
                      <strong>Mapped to:</strong> {mappedField}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {systemFields[mappedField].description}
                    </Typography>
                    {systemFields[mappedField].aliases.length > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Aliases:</strong> {systemFields[mappedField].aliases.join(', ')}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button variant="outlined" onClick={onCancel}>
          Cancel
        </Button>
        
        <Button
          variant="contained"
          onClick={handleComplete}
          disabled={!validationStats.canProceed}
        >
          Apply Mapping & Continue
        </Button>
      </Box>

      {/* Suggestions Dialog */}
      <Dialog open={showSuggestions} onClose={() => setShowSuggestions(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Field Suggestions for "{selectedColumn}"
        </DialogTitle>
        <DialogContent>
          {columnSuggestions.length > 0 ? (
            <Stack spacing={2}>
              {columnSuggestions.map((suggestion, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="h6">
                        {suggestion.system_field}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip
                          size="small"
                          label={`${getMatchTypeIcon(suggestion.match_type)} ${Math.round(suggestion.confidence * 100)}%`}
                          color={getConfidenceColor(suggestion.confidence) as any}
                        />
                        {systemFields[suggestion.system_field]?.required && (
                          <Chip label="Required" size="small" color="error" />
                        )}
                      </Stack>
                    </Stack>
                    
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {systemFields[suggestion.system_field]?.description}
                    </Typography>
                    
                    <Typography variant="body2" color="text.primary">
                      <strong>Reasoning:</strong> {suggestion.reasoning}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleApplySuggestion(suggestion)}
                    >
                      Apply This Mapping
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Stack>
          ) : (
            <Alert severity="info">
              No suggestions found for this column. You can manually select a field to map to.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSuggestions(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ColumnMappingInterface;