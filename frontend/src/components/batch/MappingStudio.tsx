/**
 * Visual Mapping Studio - Enterprise-grade drag-and-drop column mapping interface
 * Phase 2 Week 6 Implementation: Two-column layout with AI confidence visualization
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Alert,
  LinearProgress,
  Tooltip,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Grid,
  Badge
} from '@mui/material';
import {
  DragIndicator,
  AutoAwesome,
  CheckCircle,
  Warning,
  Info,
  Help,
  Refresh,
  Save,
  Visibility,
  Link as LinkIcon,
  LinkOff,
  Timeline,
  Psychology,
  TrendingUp,
  Star,
  ExpandMore,
  Close,
  ThumbUp,
  ThumbDown,
  Lightbulb
} from '@mui/icons-material';

// Import types from BatchUploadContainer
import { ColumnInfo, MappingSuggestion, MappingPreset } from '../batch/BatchUploadContainer';

// Enhanced interfaces for visual mapping
export interface VisualConnection {
  id: string;
  sourceColumn: string;
  targetField: string;
  confidence: number;
  reasoning: string;
  status: 'suggested' | 'confirmed' | 'rejected' | 'manual';
  userFeedback?: 'positive' | 'negative';
  alternatives?: { field: string; confidence: number; reasoning: string }[];
}

export interface SystemField {
  id: string;
  name: string;
  displayName: string;
  description: string;
  required: boolean;
  dataType: string;
  examples: string[];
  category: 'identity' | 'financial' | 'performance' | 'metadata' | 'custom';
  validations?: string[];
}

export interface MappingStudioProps {
  columns: ColumnInfo[];
  systemFields?: SystemField[];
  initialMapping?: Record<string, string>;
  onMappingComplete: (mapping: Record<string, string>, preset?: MappingPreset) => void;
  onCancel: () => void;
  allowSaveAsPreset?: boolean;
  title?: string;
}

// Mock system fields - in real app, this would come from backend
const DEFAULT_SYSTEM_FIELDS: SystemField[] = [
  {
    id: 'employee_id',
    name: 'employee_id',
    displayName: 'Employee ID',
    description: 'Unique identifier for the employee',
    required: true,
    dataType: 'string',
    examples: ['EMP001', 'E12345', 'JOHN.DOE'],
    category: 'identity',
    validations: ['unique', 'not_empty']
  },
  {
    id: 'employee_name',
    name: 'employee_name',
    displayName: 'Employee Name',
    description: 'Full name of the employee',
    required: true,
    dataType: 'string',
    examples: ['John Doe', 'Jane Smith', 'Michael Johnson'],
    category: 'identity'
  },
  {
    id: 'base_salary',
    name: 'base_salary',
    displayName: 'Base Salary',
    description: 'Employee annual base salary',
    required: true,
    dataType: 'number',
    examples: ['75000', '120000', '95500'],
    category: 'financial',
    validations: ['positive', 'numeric']
  },
  {
    id: 'department',
    name: 'department',
    displayName: 'Department',
    description: 'Employee department or division',
    required: false,
    dataType: 'string',
    examples: ['Engineering', 'Sales', 'Marketing'],
    category: 'metadata'
  },
  {
    id: 'performance_rating',
    name: 'performance_rating',
    displayName: 'Performance Rating',
    description: 'Employee performance score or rating',
    required: false,
    dataType: 'number',
    examples: ['4.2', '3.8', '5.0'],
    category: 'performance',
    validations: ['range:1-5']
  },
  {
    id: 'hire_date',
    name: 'hire_date',
    displayName: 'Hire Date',
    description: 'Date when employee was hired',
    required: false,
    dataType: 'date',
    examples: ['2023-01-15', '2022-06-01', '2024-03-10'],
    category: 'metadata'
  },
  {
    id: 'bonus_percentage',
    name: 'bonus_percentage',
    displayName: 'Bonus Percentage',
    description: 'Target bonus as percentage of salary',
    required: false,
    dataType: 'number',
    examples: ['15', '20', '12.5'],
    category: 'financial',
    validations: ['percentage']
  }
];

export const MappingStudio: React.FC<MappingStudioProps> = ({
  columns,
  systemFields = DEFAULT_SYSTEM_FIELDS,
  initialMapping = {},
  onMappingComplete,
  onCancel,
  allowSaveAsPreset = true,
  title = 'Visual Mapping Studio'
}) => {
  // State management
  const [connections, setConnections] = useState<VisualConnection[]>([]);
  const [currentMapping, setCurrentMapping] = useState<Record<string, string>>(initialMapping);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiAnalysisComplete, setAiAnalysisComplete] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<VisualConnection | null>(null);
  const [showReasoningDialog, setShowReasoningDialog] = useState(false);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    draggedColumn?: string;
    dropTarget?: string;
  }>({
    isDragging: false
  });

  // Preset management
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);
  
  // SVG canvas refs for drawing connections
  const canvasRef = useRef<SVGSVGElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // Generate AI suggestions on component mount
  useEffect(() => {
    generateAISuggestions();
  }, [columns]);

  // Mock AI suggestion generation
  const generateAISuggestions = async () => {
    setIsGeneratingAI(true);
    
    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const suggestions: VisualConnection[] = columns.map((column, index) => {
      const columnName = column.name.toLowerCase();
      
      // AI logic for field matching (in real app, this would be ML-based)
      let suggestedField = 'employee_name'; // default
      let confidence = 50;
      let reasoning = 'Based on column name analysis';
      let alternatives: { field: string; confidence: number; reasoning: string }[] = [];

      if (columnName.includes('id') || columnName.includes('emp')) {
        suggestedField = 'employee_id';
        confidence = 92;
        reasoning = 'Column contains "ID" or "emp" suggesting employee identifier. Sample values match expected ID patterns.';
        alternatives = [
          { field: 'employee_name', confidence: 15, reasoning: 'Less likely but possible if IDs contain names' }
        ];
      } else if (columnName.includes('name') || columnName.includes('employee')) {
        suggestedField = 'employee_name';
        confidence = 95;
        reasoning = 'Column header strongly indicates employee names. Sample values contain typical name patterns.';
        alternatives = [
          { field: 'employee_id', confidence: 5, reasoning: 'Unlikely given sample data patterns' }
        ];
      } else if (columnName.includes('salary') || columnName.includes('base')) {
        suggestedField = 'base_salary';
        confidence = 89;
        reasoning = 'Column name suggests salary information. Sample values are numeric and within expected salary ranges.';
        alternatives = [
          { field: 'bonus_percentage', confidence: 25, reasoning: 'Could be bonus if values are percentages' }
        ];
      } else if (columnName.includes('department') || columnName.includes('dept')) {
        suggestedField = 'department';
        confidence = 85;
        reasoning = 'Clear match for department field. Sample values contain typical department names.';
        alternatives = [];
      } else if (columnName.includes('performance') || columnName.includes('rating')) {
        suggestedField = 'performance_rating';
        confidence = 78;
        reasoning = 'Column suggests performance metrics. Sample values appear to be ratings or scores.';
        alternatives = [
          { field: 'bonus_percentage', confidence: 30, reasoning: 'Could be bonus percentage if format matches' }
        ];
      } else if (columnName.includes('date') || columnName.includes('hired')) {
        suggestedField = 'hire_date';
        confidence = 73;
        reasoning = 'Column name indicates date field. Sample values need format validation for date parsing.';
        alternatives = [];
      } else if (columnName.includes('bonus')) {
        suggestedField = 'bonus_percentage';
        confidence = 81;
        reasoning = 'Column clearly relates to bonus information. Sample values suggest percentage format.';
        alternatives = [
          { field: 'base_salary', confidence: 20, reasoning: 'Could be salary if values are large amounts' }
        ];
      }

      return {
        id: `conn_${index}`,
        sourceColumn: column.name,
        targetField: suggestedField,
        confidence,
        reasoning,
        status: 'suggested' as const,
        alternatives
      };
    });

    setConnections(suggestions);
    
    // Set initial mapping from AI suggestions
    const mappingFromAI = suggestions.reduce((acc, conn) => {
      acc[conn.sourceColumn] = conn.targetField;
      return acc;
    }, {} as Record<string, string>);
    
    setCurrentMapping(mappingFromAI);
    setIsGeneratingAI(false);
    setAiAnalysisComplete(true);
  };

  // Get confidence color for visual indicators
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 90) return '#10B981'; // green
    if (confidence >= 70) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  // Get confidence label
  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 90) return 'High Confidence';
    if (confidence >= 70) return 'Medium Confidence';
    return 'Low Confidence';
  };

  // Handle drag operations
  const handleDragStart = (e: React.DragEvent, columnName: string) => {
    e.dataTransfer.setData('text/plain', columnName);
    setDragState({ isDragging: true, draggedColumn: columnName });
  };

  const handleDragOver = (e: React.DragEvent, fieldName: string) => {
    e.preventDefault();
    setDragState(prev => ({ ...prev, dropTarget: fieldName }));
  };

  const handleDragLeave = () => {
    setDragState(prev => ({ ...prev, dropTarget: undefined }));
  };

  const handleDrop = (e: React.DragEvent, fieldName: string) => {
    e.preventDefault();
    const columnName = e.dataTransfer.getData('text/plain');
    
    if (columnName && fieldName) {
      // Create or update connection
      const existingConnectionIndex = connections.findIndex(conn => conn.sourceColumn === columnName);
      
      if (existingConnectionIndex >= 0) {
        // Update existing connection
        const updatedConnections = [...connections];
        updatedConnections[existingConnectionIndex] = {
          ...updatedConnections[existingConnectionIndex],
          targetField: fieldName,
          status: 'manual',
          confidence: 100, // Manual mappings get full confidence
          reasoning: 'User manually mapped this field via drag and drop.'
        };
        setConnections(updatedConnections);
      } else {
        // Create new connection
        const newConnection: VisualConnection = {
          id: `manual_${Date.now()}`,
          sourceColumn: columnName,
          targetField: fieldName,
          confidence: 100,
          reasoning: 'User manually mapped this field via drag and drop.',
          status: 'manual'
        };
        setConnections([...connections, newConnection]);
      }
      
      // Update mapping
      setCurrentMapping(prev => ({
        ...prev,
        [columnName]: fieldName
      }));
    }
    
    setDragState({ isDragging: false });
  };

  // Handle connection confirmation/rejection
  const handleConfirmConnection = (connectionId: string) => {
    setConnections(prev => 
      prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, status: 'confirmed' as const }
          : conn
      )
    );
  };

  const handleRejectConnection = (connectionId: string) => {
    const connection = connections.find(conn => conn.id === connectionId);
    if (!connection) return;
    
    setConnections(prev => 
      prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, status: 'rejected' as const }
          : conn
      )
    );
    
    // Remove from mapping
    setCurrentMapping(prev => {
      const newMapping = { ...prev };
      delete newMapping[connection.sourceColumn];
      return newMapping;
    });
  };

  // Handle user feedback for AI improvement
  const handleUserFeedback = (connectionId: string, feedback: 'positive' | 'negative') => {
    setConnections(prev => 
      prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, userFeedback: feedback }
          : conn
      )
    );
    
    // In real app, this would send feedback to ML service for model improvement
    console.log(`User feedback: ${feedback} for connection ${connectionId}`);
  };

  // Show reasoning dialog
  const showReasoning = (connection: VisualConnection) => {
    setSelectedConnection(connection);
    setShowReasoningDialog(true);
  };

  // Calculate overall mapping confidence
  const overallConfidence = useMemo(() => {
    if (connections.length === 0) return 0;
    const totalConfidence = connections.reduce((sum, conn) => {
      return conn.status !== 'rejected' ? sum + conn.confidence : sum;
    }, 0);
    const activeConnections = connections.filter(conn => conn.status !== 'rejected').length;
    return activeConnections > 0 ? Math.round(totalConfidence / activeConnections) : 0;
  }, [connections]);

  // Handle save as preset
  const handleSaveAsPreset = () => {
    if (!presetName.trim()) return;
    
    const preset: MappingPreset = {
      id: `preset_${Date.now()}`,
      name: presetName,
      description: presetDescription,
      mapping: currentMapping,
      usage_count: 0,
      created_by: 'current_user', // In real app, get from user context
      tenant_id: 'current_tenant' // In real app, get from tenant context
    };
    
    // In real app, save to backend
    console.log('Saving preset:', preset);
    
    setShowSavePresetDialog(false);
    setPresetName('');
    setPresetDescription('');
    
    onMappingComplete(currentMapping, preset);
  };

  // Handle complete mapping
  const handleCompleteMapping = () => {
    onMappingComplete(currentMapping);
  };

  return (
    <Box className="h-full flex flex-col">
      {/* Header */}
      <Paper className="p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h5" className="font-bold flex items-center">
              <Psychology className="mr-2 text-blue-600" />
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" className="mt-1">
              Drag columns to system fields or use AI suggestions to create mappings
            </Typography>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Overall Confidence Indicator */}
            <Tooltip title={`Overall mapping confidence: ${overallConfidence}%`}>
              <Chip
                icon={overallConfidence >= 80 ? <CheckCircle /> : <Warning />}
                label={`${overallConfidence}% Confidence`}
                color={overallConfidence >= 80 ? 'success' : overallConfidence >= 60 ? 'warning' : 'error'}
                variant="outlined"
              />
            </Tooltip>
            
            {/* AI Status */}
            {isGeneratingAI ? (
              <Chip
                icon={<AutoAwesome className="animate-pulse" />}
                label="Analyzing..."
                color="primary"
                variant="outlined"
              />
            ) : aiAnalysisComplete ? (
              <Chip
                icon={<CheckCircle />}
                label="AI Analysis Complete"
                color="success"
                variant="outlined"
              />
            ) : null}
          </div>
        </div>
        
        {/* Progress bar during AI analysis */}
        {isGeneratingAI && (
          <Box className="mt-3">
            <LinearProgress className="mb-2" />
            <Typography variant="caption" color="text.secondary">
              AI is analyzing your columns and generating intelligent mapping suggestions...
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Main Mapping Interface */}
      <div className="flex-1 flex gap-4 relative">
        {/* Left Panel - CSV Columns */}
        <Paper ref={leftPanelRef} className="flex-1 p-4">
          <Typography variant="h6" className="mb-3 flex items-center">
            <Timeline className="mr-2" />
            Source Columns ({columns.length})
          </Typography>
          
          <div className="space-y-3">
            {columns.map((column, index) => {
              const connection = connections.find(conn => conn.sourceColumn === column.name);
              const isMapped = currentMapping[column.name];
              
              return (
                <Card 
                  key={column.name}
                  className={`
                    cursor-move transition-all duration-200 border-2
                    ${dragState.draggedColumn === column.name ? 'border-blue-500 shadow-lg' : 'border-gray-200'}
                    ${isMapped ? 'bg-green-50 border-green-200' : 'hover:border-gray-300'}
                  `}
                  draggable
                  onDragStart={(e) => handleDragStart(e, column.name)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <DragIndicator className="mr-2 text-gray-400" />
                          <Typography variant="subtitle2" className="font-medium">
                            {column.name}
                          </Typography>
                          {connection && (
                            <Chip
                              size="small"
                              label={`${connection.confidence}%`}
                              style={{ 
                                backgroundColor: getConfidenceColor(connection.confidence),
                                color: 'white',
                                marginLeft: 8
                              }}
                            />
                          )}
                        </div>
                        
                        <Typography variant="caption" color="text.secondary" className="block mt-1">
                          Type: {column.data_type} • {column.sample_values.length} samples
                        </Typography>
                        
                        {/* Sample Values */}
                        <div className="mt-2">
                          <Typography variant="caption" color="text.secondary">
                            Sample values:
                          </Typography>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {column.sample_values.slice(0, 3).map((value, idx) => (
                              <Chip
                                key={idx}
                                label={value}
                                size="small"
                                variant="outlined"
                                className="text-xs"
                              />
                            ))}
                            {column.sample_values.length > 3 && (
                              <Chip
                                label={`+${column.sample_values.length - 3} more`}
                                size="small"
                                variant="outlined"
                                className="text-xs"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Connection Status & Actions */}
                      <div className="flex flex-col items-end space-y-1">
                        {connection && (
                          <>
                            <Tooltip title="View AI reasoning">
                              <IconButton
                                size="small"
                                onClick={() => showReasoning(connection)}
                              >
                                <Lightbulb className="w-4 h-4" />
                              </IconButton>
                            </Tooltip>
                            
                            {connection.status === 'suggested' && (
                              <div className="flex space-x-1">
                                <Tooltip title="Confirm mapping">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleConfirmConnection(connection.id)}
                                    className="text-green-600"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject mapping">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRejectConnection(connection.id)}
                                    className="text-red-600"
                                  >
                                    <Close className="w-4 h-4" />
                                  </IconButton>
                                </Tooltip>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </Paper>

        {/* Visual Connection Canvas */}
        <div className="flex items-center justify-center p-4">
          <svg
            ref={canvasRef}
            width="120"
            height="600"
            className="absolute z-10 pointer-events-none"
          >
            {/* Draw connection lines */}
            {connections
              .filter(conn => conn.status !== 'rejected')
              .map((connection, index) => {
                const yOffset = index * 80 + 50; // Approximate positioning
                const confidence = connection.confidence;
                const color = getConfidenceColor(confidence);
                const strokeWidth = confidence >= 80 ? 3 : confidence >= 60 ? 2 : 1;
                
                return (
                  <g key={connection.id}>
                    {/* Connection line */}
                    <line
                      x1="10"
                      y1={yOffset}
                      x2="110"
                      y2={yOffset}
                      stroke={color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={connection.status === 'suggested' ? '5,5' : 'none'}
                      opacity={0.8}
                    />
                    
                    {/* Confidence indicator circle */}
                    <circle
                      cx="60"
                      cy={yOffset}
                      r="8"
                      fill={color}
                      opacity={0.9}
                    />
                    
                    {/* Confidence text */}
                    <text
                      x="60"
                      y={yOffset + 3}
                      textAnchor="middle"
                      fontSize="10"
                      fill="white"
                      fontWeight="bold"
                    >
                      {Math.round(confidence)}
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>

        {/* Right Panel - System Fields */}
        <Paper ref={rightPanelRef} className="flex-1 p-4">
          <Typography variant="h6" className="mb-3 flex items-center">
            <Star className="mr-2" />
            System Fields ({systemFields.length})
          </Typography>
          
          <div className="space-y-3">
            {systemFields.map((field) => {
              const isTargeted = Object.values(currentMapping).includes(field.name);
              const connection = connections.find(conn => 
                conn.targetField === field.name && conn.status !== 'rejected'
              );
              
              return (
                <Card 
                  key={field.id}
                  className={`
                    transition-all duration-200 border-2
                    ${dragState.dropTarget === field.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                    ${isTargeted ? 'bg-green-50 border-green-200' : 'hover:border-gray-300'}
                  `}
                  onDragOver={(e) => handleDragOver(e, field.name)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, field.name)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <Typography variant="subtitle2" className="font-medium">
                            {field.displayName}
                          </Typography>
                          {field.required && (
                            <Chip
                              size="small"
                              label="Required"
                              color="error"
                              variant="outlined"
                              className="ml-2"
                            />
                          )}
                          {isTargeted && (
                            <LinkIcon className="ml-2 text-green-600 w-4 h-4" />
                          )}
                        </div>
                        
                        <Typography variant="caption" color="text.secondary" className="block mt-1">
                          {field.description}
                        </Typography>
                        
                        <Typography variant="caption" color="text.secondary" className="block">
                          Type: {field.dataType} • Category: {field.category}
                        </Typography>
                        
                        {/* Example Values */}
                        <div className="mt-2">
                          <Typography variant="caption" color="text.secondary">
                            Examples:
                          </Typography>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {field.examples.slice(0, 2).map((example, idx) => (
                              <Chip
                                key={idx}
                                label={example}
                                size="small"
                                variant="outlined"
                                className="text-xs"
                              />
                            ))}
                          </div>
                        </div>
                        
                        {/* Show connected column */}
                        {connection && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border">
                            <Typography variant="caption" className="font-medium text-blue-800">
                              Mapped from: {connection.sourceColumn}
                            </Typography>
                            <div className="flex items-center mt-1">
                              <Chip
                                size="small"
                                label={getConfidenceLabel(connection.confidence)}
                                style={{ backgroundColor: getConfidenceColor(connection.confidence) }}
                                className="text-white text-xs"
                              />
                              <Typography variant="caption" className="ml-2 text-blue-600">
                                {connection.status}
                              </Typography>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </Paper>
      </div>

      {/* Action Bar */}
      <Paper className="p-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Typography variant="body2" color="text.secondary">
              {connections.filter(conn => conn.status !== 'rejected').length} of {columns.length} columns mapped
            </Typography>
            <Chip
              label={`${overallConfidence}% Overall Confidence`}
              color={overallConfidence >= 80 ? 'success' : 'warning'}
              size="small"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={generateAISuggestions}
              disabled={isGeneratingAI}
            >
              Regenerate AI
            </Button>
            
            {allowSaveAsPreset && (
              <Button
                variant="outlined"
                startIcon={<Save />}
                onClick={() => setShowSavePresetDialog(true)}
                disabled={connections.filter(conn => conn.status !== 'rejected').length === 0}
              >
                Save as Preset
              </Button>
            )}
            
            <Button
              variant="outlined"
              onClick={onCancel}
            >
              Cancel
            </Button>
            
            <Button
              variant="contained"
              startIcon={<CheckCircle />}
              onClick={handleCompleteMapping}
              disabled={connections.filter(conn => conn.status !== 'rejected').length === 0}
            >
              Complete Mapping
            </Button>
          </div>
        </div>
      </Paper>

      {/* Reasoning Dialog */}
      <Dialog
        open={showReasoningDialog}
        onClose={() => setShowReasoningDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle className="flex items-center">
          <Psychology className="mr-2" />
          AI Reasoning Analysis
        </DialogTitle>
        <DialogContent>
          {selectedConnection && (
            <div className="space-y-4">
              <Alert severity="info">
                <strong>Mapping:</strong> {selectedConnection.sourceColumn} → {selectedConnection.targetField}
              </Alert>
              
              <div>
                <Typography variant="h6" className="mb-2">Confidence Score</Typography>
                <div className="flex items-center space-x-2">
                  <LinearProgress
                    variant="determinate"
                    value={selectedConnection.confidence}
                    className="flex-1 h-2 rounded"
                    style={{ backgroundColor: '#E5E7EB' }}
                    sx={{
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getConfidenceColor(selectedConnection.confidence)
                      }
                    }}
                  />
                  <Typography variant="body2" className="font-medium">
                    {selectedConnection.confidence}%
                  </Typography>
                </div>
              </div>
              
              <div>
                <Typography variant="h6" className="mb-2">Reasoning</Typography>
                <Typography variant="body2" className="p-3 bg-gray-50 rounded">
                  {selectedConnection.reasoning}
                </Typography>
              </div>
              
              {selectedConnection.alternatives && selectedConnection.alternatives.length > 0 && (
                <div>
                  <Typography variant="h6" className="mb-2">Alternative Suggestions</Typography>
                  <div className="space-y-2">
                    {selectedConnection.alternatives.map((alt, index) => (
                      <div key={index} className="p-3 border rounded bg-yellow-50">
                        <div className="flex items-center justify-between">
                          <Typography variant="subtitle2">{alt.field}</Typography>
                          <Chip size="small" label={`${alt.confidence}%`} />
                        </div>
                        <Typography variant="caption" color="text.secondary">
                          {alt.reasoning}
                        </Typography>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* User Feedback */}
              <div>
                <Typography variant="h6" className="mb-2">Help Improve AI</Typography>
                <Typography variant="body2" className="mb-3 text-gray-600">
                  Was this mapping suggestion helpful?
                </Typography>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={selectedConnection.userFeedback === 'positive' ? 'contained' : 'outlined'}
                    startIcon={<ThumbUp />}
                    onClick={() => handleUserFeedback(selectedConnection.id, 'positive')}
                    color="success"
                    size="small"
                  >
                    Helpful
                  </Button>
                  <Button
                    variant={selectedConnection.userFeedback === 'negative' ? 'contained' : 'outlined'}
                    startIcon={<ThumbDown />}
                    onClick={() => handleUserFeedback(selectedConnection.id, 'negative')}
                    color="error"
                    size="small"
                  >
                    Not Helpful
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReasoningDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Save Preset Dialog */}
      <Dialog
        open={showSavePresetDialog}
        onClose={() => setShowSavePresetDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Save Mapping as Preset</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-2">
            <TextField
              label="Preset Name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              fullWidth
              required
              placeholder="e.g., Standard Employee Mapping"
            />
            <TextField
              label="Description"
              value={presetDescription}
              onChange={(e) => setPresetDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Describe when to use this mapping preset..."
            />
            
            <Alert severity="info">
              This preset will include {connections.filter(conn => conn.status !== 'rejected').length} column mappings and can be reused for similar data files.
            </Alert>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSavePresetDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveAsPreset}
            variant="contained"
            disabled={!presetName.trim()}
          >
            Save Preset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MappingStudio;