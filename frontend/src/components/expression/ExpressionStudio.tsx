/**
 * Expression Studio - Combined visual and code-based expression editor
 * Seamlessly integrates Monaco Editor with Visual Expression Builder for optimal UX
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Divider,
  Tooltip,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  Code as CodeIcon,
  ViewModule as VisualIcon,
  Splitscreen as SplitIcon,
  PlayArrow as TestIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Help as HelpIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  CheckCircle as ValidIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  History as HistoryIcon,
  BookmarkBorder as TemplateIcon,
} from '@mui/icons-material';

import MonacoExpressionEditor from './MonacoExpressionEditor';
import ExpressionBuilder from './ExpressionBuilder';

interface ExpressionError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface ExpressionTemplate {
  id: string;
  name: string;
  description: string;
  expression: string;
  category: string;
  tags: string[];
}

interface ExpressionStudioProps {
  expression?: string;
  onChange?: (expression: string) => void;
  onValidate?: (errors: ExpressionError[]) => void;
  onTest?: (expression: string) => Promise<any>;
  onSave?: (expression: string) => void;
  availableFields?: string[];
  availableFunctions?: Array<{
    name: string;
    parameters: string[];
    description: string;
    category: string;
  }>;
  readOnly?: boolean;
  theme?: 'light' | 'dark';
  showTemplates?: boolean;
  showHistory?: boolean;
  autoSave?: boolean;
  title?: string;
}

type EditMode = 'visual' | 'code' | 'split';

const EXPRESSION_TEMPLATES: ExpressionTemplate[] = [
  {
    id: 'basic_commission',
    name: 'Basic Commission',
    description: 'Simple commission calculation based on sales',
    expression: 'sales * commission_rate',
    category: 'Commission',
    tags: ['basic', 'sales'],
  },
  {
    id: 'tiered_bonus',
    name: 'Tiered Bonus',
    description: 'Bonus with performance tiers',
    expression: 'IF(performance > 1.2, base_salary * 0.2, IF(performance > 1.0, base_salary * 0.1, 0))',
    category: 'Bonus',
    tags: ['performance', 'tiered'],
  },
  {
    id: 'revenue_band',
    name: 'Revenue Banding',
    description: 'Commission based on revenue bands',
    expression: 'BAND(total_revenue, revenue_bands) * commission_multiplier',
    category: 'Commission',
    tags: ['banding', 'revenue'],
  },
  {
    id: 'quota_achievement',
    name: 'Quota Achievement',
    description: 'Bonus based on quota achievement percentage',
    expression: 'base_salary * PERCENT(actual_sales, quota_target) * achievement_multiplier',
    category: 'Bonus',
    tags: ['quota', 'percentage'],
  },
];

export const ExpressionStudio: React.FC<ExpressionStudioProps> = ({
  expression = '',
  onChange,
  onValidate,
  onTest,
  onSave,
  availableFields = [],
  availableFunctions = [],
  readOnly = false,
  theme = 'light',
  showTemplates = true,
  showHistory = true,
  autoSave = false,
  title = 'Expression Studio',
}) => {
  const [editMode, setEditMode] = useState<EditMode>('code');
  const [currentExpression, setCurrentExpression] = useState(expression);
  const [errors, setErrors] = useState<ExpressionError[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Dialog states
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  
  // History
  const [expressionHistory, setExpressionHistory] = useState<string[]>([]);
  
  // Notifications
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);

  // Update expression when prop changes
  useEffect(() => {
    if (expression !== currentExpression) {
      setCurrentExpression(expression);
      setHasUnsavedChanges(false);
    }
  }, [expression, currentExpression]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && hasUnsavedChanges && currentExpression) {
      const autoSaveTimer = setTimeout(() => {
        handleSave();
      }, 2000);

      return () => clearTimeout(autoSaveTimer);
    }
  }, [autoSave, hasUnsavedChanges, currentExpression]);

  // Add to history when expression changes significantly
  useEffect(() => {
    if (currentExpression && currentExpression.length > 10) {
      const lastHistoryItem = expressionHistory[expressionHistory.length - 1];
      if (lastHistoryItem !== currentExpression) {
        setExpressionHistory(prev => [...prev.slice(-9), currentExpression]);
      }
    }
  }, [currentExpression, expressionHistory]);

  const handleExpressionChange = useCallback((newExpression: string) => {
    setCurrentExpression(newExpression);
    setHasUnsavedChanges(newExpression !== expression);
    onChange?.(newExpression);
  }, [expression, onChange]);

  const handleValidationResult = useCallback((validationErrors: ExpressionError[]) => {
    setErrors(validationErrors);
    onValidate?.(validationErrors);
  }, [onValidate]);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      // Simulate validation - in real implementation, this would call the backend
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockErrors: ExpressionError[] = [];
      
      // Basic validation checks
      if (!currentExpression.trim()) {
        mockErrors.push({
          line: 1,
          column: 1,
          message: 'Expression cannot be empty',
          severity: 'error',
        });
      }

      const openParens = (currentExpression.match(/\(/g) || []).length;
      const closeParens = (currentExpression.match(/\)/g) || []).length;
      
      if (openParens !== closeParens) {
        mockErrors.push({
          line: 1,
          column: currentExpression.length,
          message: 'Mismatched parentheses',
          severity: 'error',
        });
      }

      setErrors(mockErrors);
      onValidate?.(mockErrors);
      
      const errorCount = mockErrors.filter(e => e.severity === 'error').length;
      setNotification({
        message: errorCount === 0 ? 'Expression is valid!' : `Found ${errorCount} error(s)`,
        type: errorCount === 0 ? 'success' : 'error',
      });
    } catch (error) {
      setNotification({
        message: 'Validation failed',
        type: 'error',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleTest = async () => {
    if (!onTest) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await onTest(currentExpression);
      setTestResult(result);
      setNotification({
        message: 'Test completed successfully',
        type: 'success',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Test failed';
      setTestResult({ error: errorMessage });
      setNotification({
        message: errorMessage,
        type: 'error',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(currentExpression);
      setHasUnsavedChanges(false);
      setNotification({
        message: 'Expression saved successfully',
        type: 'success',
      });
    }
  };

  const handleApplyTemplate = (template: ExpressionTemplate) => {
    handleExpressionChange(template.expression);
    setShowTemplateDialog(false);
    setNotification({
      message: `Applied template: ${template.name}`,
      type: 'success',
    });
  };

  const handleApplyHistory = (historicalExpression: string) => {
    handleExpressionChange(historicalExpression);
    setShowHistoryDialog(false);
    setNotification({
      message: 'Applied expression from history',
      type: 'success',
    });
  };

  const errorCount = useMemo(() => errors.filter(e => e.severity === 'error').length, [errors]);
  const warningCount = useMemo(() => errors.filter(e => e.severity === 'warning').length, [errors]);

  return (
    <Box
      sx={{
        height: isFullscreen ? '100vh' : '100%',
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h6">{title}</Typography>
            
            {hasUnsavedChanges && (
              <Chip label="Unsaved Changes" color="warning" size="small" />
            )}
            
            {errors.length > 0 && (
              <Stack direction="row" spacing={1}>
                {errorCount > 0 && (
                  <Chip
                    icon={<ErrorIcon />}
                    label={`${errorCount} error${errorCount > 1 ? 's' : ''}`}
                    color="error"
                    size="small"
                  />
                )}
                {warningCount > 0 && (
                  <Chip
                    icon={<WarningIcon />}
                    label={`${warningCount} warning${warningCount > 1 ? 's' : ''}`}
                    color="warning"
                    size="small"
                  />
                )}
              </Stack>
            )}
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            {/* Edit Mode Toggle */}
            <ToggleButtonGroup
              value={editMode}
              exclusive
              onChange={(_, newMode) => newMode && setEditMode(newMode)}
              size="small"
            >
              <ToggleButton value="visual">
                <Tooltip title="Visual Builder">
                  <VisualIcon />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="code">
                <Tooltip title="Code Editor">
                  <CodeIcon />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="split">
                <Tooltip title="Split View">
                  <SplitIcon />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            <Divider orientation="vertical" flexItem />

            {/* Actions */}
            <Tooltip title="Validate Expression">
              <IconButton onClick={handleValidate} disabled={isValidating}>
                {isValidating ? <CircularProgress size={20} /> : <ValidIcon />}
              </IconButton>
            </Tooltip>

            {onTest && (
              <Tooltip title="Test Expression">
                <IconButton onClick={handleTest} disabled={isTesting}>
                  {isTesting ? <CircularProgress size={20} /> : <TestIcon />}
                </IconButton>
              </Tooltip>
            )}

            {showTemplates && (
              <Tooltip title="Expression Templates">
                <IconButton onClick={() => setShowTemplateDialog(true)}>
                  <TemplateIcon />
                </IconButton>
              </Tooltip>
            )}

            {showHistory && expressionHistory.length > 0 && (
              <Tooltip title="Expression History">
                <IconButton onClick={() => setShowHistoryDialog(true)}>
                  <HistoryIcon />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Settings">
              <IconButton onClick={() => setShowSettingsDialog(true)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              <IconButton onClick={() => setIsFullscreen(!isFullscreen)}>
                <FullscreenIcon />
              </IconButton>
            </Tooltip>

            {onSave && (
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!hasUnsavedChanges || readOnly}
              >
                Save
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Main Editor Area */}
      <Box sx={{ flexGrow: 1, p: 2, overflow: 'hidden' }}>
        {editMode === 'visual' && (
          <ExpressionBuilder
            value={currentExpression}
            onChange={handleExpressionChange}
            availableFields={availableFields}
            availableFunctions={availableFunctions}
            readOnly={readOnly}
            showCode={true}
            onShowMonaco={() => setEditMode('code')}
          />
        )}

        {editMode === 'code' && (
          <MonacoExpressionEditor
            value={currentExpression}
            onChange={handleExpressionChange}
            onValidate={handleValidationResult}
            onTest={onTest}
            availableFields={availableFields}
            availableFunctions={availableFunctions.map(f => ({
              name: f.name,
              type: 'function' as const,
              description: f.description,
              signature: `${f.name}(${f.parameters.join(', ')})`,
            }))}
            readOnly={readOnly}
            theme={theme}
            height={isFullscreen ? window.innerHeight - 200 : 600}
            showValidation={true}
            showTesting={!!onTest}
            autoValidate={true}
          />
        )}

        {editMode === 'split' && (
          <Stack direction="row" spacing={2} sx={{ height: '100%' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Visual Builder
              </Typography>
              <ExpressionBuilder
                value={currentExpression}
                onChange={handleExpressionChange}
                availableFields={availableFields}
                availableFunctions={availableFunctions}
                readOnly={readOnly}
                showCode={false}
              />
            </Box>
            
            <Divider orientation="vertical" flexItem />
            
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Code Editor
              </Typography>
              <MonacoExpressionEditor
                value={currentExpression}
                onChange={handleExpressionChange}
                onValidate={handleValidationResult}
                onTest={onTest}
                availableFields={availableFields}
                availableFunctions={availableFunctions.map(f => ({
                  name: f.name,
                  type: 'function' as const,
                  description: f.description,
                  signature: `${f.name}(${f.parameters.join(', ')})`,
                }))}
                readOnly={readOnly}
                theme={theme}
                height={400}
                showValidation={false}
                showTesting={false}
                autoValidate={false}
              />
            </Box>
          </Stack>
        )}
      </Box>

      {/* Test Results */}
      {testResult && (
        <Paper sx={{ p: 2, m: 2, mt: 0 }}>
          <Typography variant="subtitle2" gutterBottom>
            Test Results
          </Typography>
          <Box
            sx={{
              p: 1,
              bgcolor: testResult.error ? 'error.light' : 'success.light',
              borderRadius: 1,
              fontFamily: 'monospace',
              color: testResult.error ? 'error.contrastText' : 'success.contrastText',
            }}
          >
            {testResult.error ? `Error: ${testResult.error}` : JSON.stringify(testResult, null, 2)}
          </Box>
        </Paper>
      )}

      {/* Templates Dialog */}
      <Dialog open={showTemplateDialog} onClose={() => setShowTemplateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Expression Templates</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {EXPRESSION_TEMPLATES.map((template) => (
              <Paper key={template.id} sx={{ p: 2 }} variant="outlined">
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="h6">{template.name}</Typography>
                    <Chip label={template.category} size="small" />
                  </Stack>
                  
                  <Typography variant="body2" color="text.secondary">
                    {template.description}
                  </Typography>
                  
                  <Box
                    sx={{
                      p: 1,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                    }}
                  >
                    {template.expression}
                  </Box>
                  
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1}>
                      {template.tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Stack>
                    
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleApplyTemplate(template)}
                    >
                      Use Template
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplateDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onClose={() => setShowHistoryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Expression History</DialogTitle>
        <DialogContent>
          <Stack spacing={1}>
            {expressionHistory.map((histExpr, index) => (
              <Paper key={index} sx={{ p: 2 }} variant="outlined">
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box sx={{ flexGrow: 1, mr: 2 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {histExpr}
                    </Typography>
                  </Box>
                  
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleApplyHistory(histExpr)}
                  >
                    Apply
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        message={notification?.message}
        action={
          <Button color="inherit" size="small" onClick={() => setNotification(null)}>
            Close
          </Button>
        }
      />
    </Box>
  );
};

export default ExpressionStudio;
