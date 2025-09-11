/**
 * Expression Builder - Visual drag-and-drop interface for building compensation expressions
 * Works alongside Monaco Editor to provide both visual and code-based expression creation
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Stack,
  Chip,
  Button,
  Grid,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  DragIndicator as DragIcon,
  Functions as FunctionIcon,
  DataArray as FieldIcon,
  Calculate as OperatorIcon,
  Numbers as NumberIcon,
  TextFields as TextIcon,
  ExpandMore as ExpandIcon,
  Code as CodeIcon,
  Visibility as PreviewIcon,
  ContentCopy as CopyIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

interface ExpressionNode {
  id: string;
  type: 'function' | 'field' | 'operator' | 'literal' | 'group';
  value: string;
  children?: ExpressionNode[];
  parameters?: ExpressionNode[];
  displayName?: string;
  description?: string;
}

interface ExpressionBuilderProps {
  value?: string;
  onChange?: (expression: string) => void;
  availableFields?: string[];
  availableFunctions?: Array<{
    name: string;
    parameters: string[];
    description: string;
    category: string;
  }>;
  readOnly?: boolean;
  showCode?: boolean;
  onShowMonaco?: () => void;
}

interface FunctionDefinition {
  name: string;
  parameters: string[];
  description: string;
  category: string;
  example: string;
}

// Built-in function categories
const FUNCTION_CATEGORIES: Record<string, FunctionDefinition[]> = {
  'Mathematical': [
    {
      name: 'SUM',
      parameters: ['values...'],
      description: 'Calculate sum of values',
      category: 'Mathematical',
      example: 'SUM(base_salary, bonus)'
    },
    {
      name: 'AVG',
      parameters: ['values...'],
      description: 'Calculate average of values',
      category: 'Mathematical',
      example: 'AVG(q1_sales, q2_sales, q3_sales)'
    },
    {
      name: 'MAX',
      parameters: ['values...'],
      description: 'Find maximum value',
      category: 'Mathematical',
      example: 'MAX(commission, minimum_payout)'
    },
    {
      name: 'MIN',
      parameters: ['values...'],
      description: 'Find minimum value',
      category: 'Mathematical',
      example: 'MIN(rate, cap_rate)'
    },
    {
      name: 'ROUND',
      parameters: ['value', 'decimals'],
      description: 'Round to decimal places',
      category: 'Mathematical',
      example: 'ROUND(amount, 2)'
    },
    {
      name: 'ABS',
      parameters: ['value'],
      description: 'Absolute value',
      category: 'Mathematical',
      example: 'ABS(variance)'
    },
  ],
  'Conditional': [
    {
      name: 'IF',
      parameters: ['condition', 'true_value', 'false_value'],
      description: 'Conditional expression',
      category: 'Conditional',
      example: 'IF(sales > target, bonus_rate, 0)'
    },
    {
      name: 'SWITCH',
      parameters: ['expression', 'case1', 'result1', 'default'],
      description: 'Multi-condition switch',
      category: 'Conditional',
      example: 'SWITCH(level, "A", 0.1, "B", 0.15, 0.05)'
    },
  ],
  'Compensation': [
    {
      name: 'PERCENT',
      parameters: ['value', 'total'],
      description: 'Calculate percentage',
      category: 'Compensation',
      example: 'PERCENT(achieved, target)'
    },
    {
      name: 'BAND',
      parameters: ['value', 'bands'],
      description: 'Apply banding logic',
      category: 'Compensation',
      example: 'BAND(revenue, revenue_bands)'
    },
    {
      name: 'TIER',
      parameters: ['value', 'thresholds'],
      description: 'Tiered calculation',
      category: 'Compensation',
      example: 'TIER(sales, tier_rates)'
    },
  ],
};

// Operators
const OPERATORS = [
  { symbol: '+', name: 'Add', description: 'Addition' },
  { symbol: '-', name: 'Subtract', description: 'Subtraction' },
  { symbol: '*', name: 'Multiply', description: 'Multiplication' },
  { symbol: '/', name: 'Divide', description: 'Division' },
  { symbol: '%', name: 'Modulo', description: 'Remainder' },
  { symbol: '==', name: 'Equal', description: 'Equal to' },
  { symbol: '!=', name: 'Not Equal', description: 'Not equal to' },
  { symbol: '>', name: 'Greater', description: 'Greater than' },
  { symbol: '<', name: 'Less', description: 'Less than' },
  { symbol: '>=', name: 'Greater Equal', description: 'Greater than or equal' },
  { symbol: '<=', name: 'Less Equal', description: 'Less than or equal' },
  { symbol: '&&', name: 'AND', description: 'Logical AND' },
  { symbol: '||', name: 'OR', description: 'Logical OR' },
];

export const ExpressionBuilder: React.FC<ExpressionBuilderProps> = ({
  value = '',
  onChange,
  availableFields = [],
  availableFunctions = [],
  readOnly = false,
  showCode = true,
  onShowMonaco,
}) => {
  const [expressionTree, setExpressionTree] = useState<ExpressionNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newNodeType, setNewNodeType] = useState<'function' | 'field' | 'operator' | 'literal'>('field');
  const [newNodeValue, setNewNodeValue] = useState('');
  const [draggedItem, setDraggedItem] = useState<any>(null);

  // Generate expression string from tree
  const generateExpression = useCallback((nodes: ExpressionNode[]): string => {
    return nodes.map(node => {
      switch (node.type) {
        case 'function':
          const params = node.parameters?.map(p => generateExpression([p])).join(', ') || '';
          return `${node.value}(${params})`;
        
        case 'operator':
          if (node.children && node.children.length === 2) {
            const left = generateExpression([node.children[0]]);
            const right = generateExpression([node.children[1]]);
            return `${left} ${node.value} ${right}`;
          }
          return node.value;
        
        case 'group':
          const groupContent = node.children ? generateExpression(node.children) : '';
          return `(${groupContent})`;
        
        case 'field':
        case 'literal':
        default:
          return node.value;
      }
    }).join(' ');
  }, []);

  // Update parent when tree changes
  const updateExpression = useCallback((newTree: ExpressionNode[]) => {
    setExpressionTree(newTree);
    const expression = generateExpression(newTree);
    onChange?.(expression);
  }, [generateExpression, onChange]);

  // Add new node
  const handleAddNode = useCallback(() => {
    const newNode: ExpressionNode = {
      id: `node_${Date.now()}`,
      type: newNodeType,
      value: newNodeValue,
      displayName: newNodeValue,
      children: newNodeType === 'operator' ? [] : undefined,
      parameters: newNodeType === 'function' ? [] : undefined,
    };

    updateExpression([...expressionTree, newNode]);
    setShowAddDialog(false);
    setNewNodeValue('');
  }, [expressionTree, newNodeType, newNodeValue, updateExpression]);

  // Delete node
  const handleDeleteNode = useCallback((nodeId: string) => {
    const deleteFromTree = (nodes: ExpressionNode[]): ExpressionNode[] => {
      return nodes.filter(node => {
        if (node.id === nodeId) {
          return false;
        }
        if (node.children) {
          node.children = deleteFromTree(node.children);
        }
        if (node.parameters) {
          node.parameters = deleteFromTree(node.parameters);
        }
        return true;
      });
    };

    updateExpression(deleteFromTree(expressionTree));
  }, [expressionTree, updateExpression]);

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(expressionTree);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    updateExpression(items);
  };

  // Handle external drag from palette
  const handlePaletteDragStart = (item: any) => {
    setDraggedItem(item);
  };

  const handleCanvasDropAccept = () => {
    if (!draggedItem) return;

    const newNode: ExpressionNode = {
      id: `node_${Date.now()}`,
      type: draggedItem.type,
      value: draggedItem.value,
      displayName: draggedItem.displayName || draggedItem.value,
      description: draggedItem.description,
      children: draggedItem.type === 'operator' ? [] : undefined,
      parameters: draggedItem.type === 'function' ? [] : undefined,
    };

    updateExpression([...expressionTree, newNode]);
    setDraggedItem(null);
  };

  // Get node icon
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'function': return <FunctionIcon />;
      case 'field': return <FieldIcon />;
      case 'operator': return <OperatorIcon />;
      case 'literal': return <NumberIcon />;
      default: return <TextIcon />;
    }
  };

  // Get node color
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'function': return 'primary';
      case 'field': return 'secondary';
      case 'operator': return 'info';
      case 'literal': return 'success';
      default: return 'default';
    }
  };

  const generatedExpression = useMemo(() => {
    return generateExpression(expressionTree);
  }, [expressionTree, generateExpression]);

  return (
    <Box sx={{ height: '100%', display: 'flex' }}>
      {/* Function Palette */}
      <Paper sx={{ width: 300, p: 2, mr: 2, overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Expression Components
        </Typography>

        {/* Fields */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <FieldIcon sx={{ mr: 1 }} />
            <Typography>Fields</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              {availableFields.map((field) => (
                <Card
                  key={field}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={() => {
                    const newNode: ExpressionNode = {
                      id: `node_${Date.now()}`,
                      type: 'field',
                      value: field,
                      displayName: field,
                    };
                    updateExpression([...expressionTree, newNode]);
                  }}
                >
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <FieldIcon fontSize="small" />
                      <Typography variant="body2">{field}</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Functions */}
        {Object.entries(FUNCTION_CATEGORIES).map(([category, functions]) => (
          <Accordion key={category}>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <FunctionIcon sx={{ mr: 1 }} />
              <Typography>{category}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                {functions.map((func) => (
                  <Card
                    key={func.name}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => {
                      const newNode: ExpressionNode = {
                        id: `node_${Date.now()}`,
                        type: 'function',
                        value: func.name,
                        displayName: func.name,
                        description: func.description,
                        parameters: [],
                      };
                      updateExpression([...expressionTree, newNode]);
                    }}
                  >
                    <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                      <Stack spacing={0.5}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <FunctionIcon fontSize="small" color="primary" />
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {func.name}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {func.description}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {func.example}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}

        {/* Operators */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <OperatorIcon sx={{ mr: 1 }} />
            <Typography>Operators</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={1}>
              {OPERATORS.map((op) => (
                <Grid item xs={6} key={op.symbol}>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    onClick={() => {
                      const newNode: ExpressionNode = {
                        id: `node_${Date.now()}`,
                        type: 'operator',
                        value: op.symbol,
                        displayName: op.name,
                        description: op.description,
                        children: [],
                      };
                      updateExpression([...expressionTree, newNode]);
                    }}
                  >
                    <Stack alignItems="center" spacing={0.5}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {op.symbol}
                      </Typography>
                      <Typography variant="caption">{op.name}</Typography>
                    </Stack>
                  </Button>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Main Canvas */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <Paper sx={{ p: 1, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Visual Expression Builder</Typography>
            
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setShowAddDialog(true)}
                disabled={readOnly}
              >
                Add Element
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={() => updateExpression([])}
                disabled={readOnly || expressionTree.length === 0}
                color="error"
              >
                Clear
              </Button>
              
              {showCode && (
                <Button
                  variant="outlined"
                  startIcon={<CodeIcon />}
                  onClick={onShowMonaco}
                >
                  Code Editor
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>

        {/* Expression Canvas */}
        <Paper sx={{ flexGrow: 1, p: 2, position: 'relative' }}>
          {expressionTree.length === 0 ? (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: 'text.secondary',
                border: 2,
                borderStyle: 'dashed',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" gutterBottom>
                Build Your Expression
              </Typography>
              <Typography variant="body2" textAlign="center">
                Drag components from the left panel or click "Add Element" to start building your expression
              </Typography>
            </Box>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="expression-canvas">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    style={{
                      minHeight: '200px',
                      backgroundColor: snapshot.isDraggingOver ? '#f5f5f5' : 'transparent',
                    }}
                  >
                    {expressionTree.map((node, index) => (
                      <Draggable key={node.id} draggableId={node.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            sx={{
                              mb: 2,
                              border: selectedNode === node.id ? 2 : 1,
                              borderColor: selectedNode === node.id ? 'primary.main' : 'divider',
                              transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
                              cursor: snapshot.isDragging ? 'grabbing' : 'pointer',
                            }}
                            onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                          >
                            <CardContent>
                              <Stack direction="row" alignItems="center" spacing={2}>
                                <div {...provided.dragHandleProps}>
                                  <DragIcon color="disabled" />
                                </div>

                                <Chip
                                  icon={getNodeIcon(node.type)}
                                  label={node.type}
                                  color={getNodeColor(node.type) as any}
                                  size="small"
                                />

                                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                  {node.displayName || node.value}
                                </Typography>

                                {node.description && (
                                  <Typography variant="caption" color="text.secondary">
                                    {node.description}
                                  </Typography>
                                )}

                                <Stack direction="row" spacing={1}>
                                  <IconButton size="small" onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNode(node.id);
                                    setShowEditDialog(true);
                                  }}>
                                    <EditIcon />
                                  </IconButton>
                                  
                                  <IconButton 
                                    size="small" 
                                    color="error"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNode(node.id);
                                    }}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Stack>
                              </Stack>

                              {/* Show parameters for functions */}
                              {node.type === 'function' && node.parameters && (
                                <Box sx={{ mt: 1, ml: 4 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Parameters: {node.parameters.length === 0 ? 'None' : node.parameters.map(p => p.value).join(', ')}
                                  </Typography>
                                </Box>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </Paper>

        {/* Generated Expression Preview */}
        {showCode && generatedExpression && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">Generated Expression</Typography>
              <IconButton
                size="small"
                onClick={() => navigator.clipboard.writeText(generatedExpression)}
              >
                <CopyIcon />
              </IconButton>
            </Stack>
            <Box
              sx={{
                p: 1,
                bgcolor: 'grey.100',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                wordBreak: 'break-all',
              }}
            >
              {generatedExpression}
            </Box>
          </Paper>
        )}
      </Box>

      {/* Add Element Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Expression Element</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Element Type</InputLabel>
              <Select
                value={newNodeType}
                onChange={(e) => setNewNodeType(e.target.value as any)}
                label="Element Type"
              >
                <MenuItem value="field">Field</MenuItem>
                <MenuItem value="function">Function</MenuItem>
                <MenuItem value="operator">Operator</MenuItem>
                <MenuItem value="literal">Literal Value</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Value"
              value={newNodeValue}
              onChange={(e) => setNewNodeValue(e.target.value)}
              placeholder={
                newNodeType === 'field' ? 'Enter field name...' :
                newNodeType === 'function' ? 'Enter function name...' :
                newNodeType === 'operator' ? 'Enter operator symbol...' :
                'Enter literal value...'
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddNode} 
            variant="contained"
            disabled={!newNodeValue}
          >
            Add Element
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpressionBuilder;