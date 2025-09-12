/**
 * Monaco Expression Editor - Advanced expression editor with syntax highlighting and IntelliSense
 * Provides VS Code-like editing experience for compensation calculation expressions
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Paper, Typography, Button, Stack, Chip, Alert, IconButton, Tooltip, Divider } from '@mui/material';
import {
  PlayArrow as RunIcon,
  Check as ValidateIcon,
  Save as SaveIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as ExitFullscreenIcon,
  Functions as FunctionIcon,
  Help as HelpIcon,
  Lightbulb as SuggestionIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import * as monaco from 'monaco-editor';

// Import Monaco Editor types
import type { editor, languages, IRange, IPosition } from 'monaco-editor';

interface ExpressionError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface ExpressionSuggestion {
  name: string;
  type: 'field' | 'function' | 'constant' | 'operator';
  description: string;
  signature?: string;
  example?: string;
}

interface MonacoExpressionEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onValidate?: (errors: ExpressionError[]) => void;
  onTest?: (expression: string) => Promise<any>;
  language?: string;
  theme?: 'light' | 'dark';
  readOnly?: boolean;
  height?: number;
  availableFields?: string[];
  availableFunctions?: ExpressionSuggestion[];
  placeholder?: string;
  showValidation?: boolean;
  showTesting?: boolean;
  autoValidate?: boolean;
}

// Custom language configuration for compensation expressions
const COMPENSATION_LANGUAGE_ID = 'compensation-expression';

// Built-in functions for compensation calculations
const BUILTIN_FUNCTIONS: ExpressionSuggestion[] = [
  {
    name: 'SUM',
    type: 'function',
    signature: 'SUM(values...)',
    description: 'Calculates the sum of numeric values',
    example: 'SUM(base_salary, bonus, commission)'
  },
  {
    name: 'AVG',
    type: 'function',
    signature: 'AVG(values...)',
    description: 'Calculates the average of numeric values',
    example: 'AVG(q1_sales, q2_sales, q3_sales, q4_sales)'
  },
  {
    name: 'MAX',
    type: 'function',
    signature: 'MAX(values...)',
    description: 'Returns the maximum value',
    example: 'MAX(target_amount, minimum_payout)'
  },
  {
    name: 'MIN',
    type: 'function',
    signature: 'MIN(values...)',
    description: 'Returns the minimum value',
    example: 'MIN(commission_rate, max_rate)'
  },
  {
    name: 'IF',
    type: 'function',
    signature: 'IF(condition, true_value, false_value)',
    description: 'Conditional expression',
    example: 'IF(sales > target, base_salary * 1.1, base_salary)'
  },
  {
    name: 'ROUND',
    type: 'function',
    signature: 'ROUND(value, decimals)',
    description: 'Rounds a number to specified decimal places',
    example: 'ROUND(commission_amount, 2)'
  },
  {
    name: 'CEIL',
    type: 'function',
    signature: 'CEIL(value)',
    description: 'Rounds up to the nearest integer',
    example: 'CEIL(bonus_amount)'
  },
  {
    name: 'FLOOR',
    type: 'function',
    signature: 'FLOOR(value)',
    description: 'Rounds down to the nearest integer',
    example: 'FLOOR(commission_rate * 100)'
  },
  {
    name: 'ABS',
    type: 'function',
    signature: 'ABS(value)',
    description: 'Returns the absolute value',
    example: 'ABS(actual_sales - target_sales)'
  },
  {
    name: 'PERCENT',
    type: 'function',
    signature: 'PERCENT(value, total)',
    description: 'Calculates percentage',
    example: 'PERCENT(achieved_sales, target_sales)'
  },
  {
    name: 'BAND',
    type: 'function',
    signature: 'BAND(value, bands)',
    description: 'Applies revenue banding logic',
    example: 'BAND(total_revenue, revenue_bands)'
  },
  {
    name: 'LOOKUP',
    type: 'function',
    signature: 'LOOKUP(key, table)',
    description: 'Looks up value from a table',
    example: 'LOOKUP(employee_level, commission_rates)'
  }
];

// Mathematical and logical operators
const OPERATORS: ExpressionSuggestion[] = [
  { name: '+', type: 'operator', description: 'Addition' },
  { name: '-', type: 'operator', description: 'Subtraction' },
  { name: '*', type: 'operator', description: 'Multiplication' },
  { name: '/', type: 'operator', description: 'Division' },
  { name: '%', type: 'operator', description: 'Modulo' },
  { name: '==', type: 'operator', description: 'Equal to' },
  { name: '!=', type: 'operator', description: 'Not equal to' },
  { name: '>', type: 'operator', description: 'Greater than' },
  { name: '<', type: 'operator', description: 'Less than' },
  { name: '>=', type: 'operator', description: 'Greater than or equal' },
  { name: '<=', type: 'operator', description: 'Less than or equal' },
  { name: '&&', type: 'operator', description: 'Logical AND' },
  { name: '||', type: 'operator', description: 'Logical OR' },
  { name: '!', type: 'operator', description: 'Logical NOT' },
];

export const MonacoExpressionEditor: React.FC<MonacoExpressionEditorProps> = ({
  value = '',
  onChange,
  onValidate,
  onTest,
  language = COMPENSATION_LANGUAGE_ID,
  theme = 'light',
  readOnly = false,
  height = 400,
  availableFields = [],
  availableFunctions = [],
  placeholder = 'Enter your expression...',
  showValidation = true,
  showTesting = true,
  autoValidate = true,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errors, setErrors] = useState<ExpressionError[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Initialize Monaco Editor
  useEffect(() => {
    if (!containerRef.current) return;

    // Register custom language
    if (!monaco.languages.getLanguages().find(lang => lang.id === COMPENSATION_LANGUAGE_ID)) {
      monaco.languages.register({ id: COMPENSATION_LANGUAGE_ID });

      // Set language configuration
      monaco.languages.setLanguageConfiguration(COMPENSATION_LANGUAGE_ID, {
        comments: {
          lineComment: '//',
          blockComment: ['/*', '*/'],
        },
        brackets: [
          ['{', '}'],
          ['[', ']'],
          ['(', ')'],
        ],
        autoClosingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
        ],
        surroundingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
        ],
      });

      // Set syntax highlighting
      monaco.languages.setMonarchTokensProvider(COMPENSATION_LANGUAGE_ID, {
        tokenizer: {
          root: [
            // Functions
            [/\b(SUM|AVG|MAX|MIN|IF|ROUND|CEIL|FLOOR|ABS|PERCENT|BAND|LOOKUP)\b/, 'keyword'],
            
            // Operators
            [/[+\-*/%]/, 'operator'],
            [/[<>=!&|]/, 'operator'],
            
            // Numbers
            [/\b\d+\.?\d*\b/, 'number'],
            
            // Strings
            [/"([^"\\]|\\.)*"/, 'string'],
            [/'([^'\\]|\\.)*'/, 'string'],
            
            // Comments
            [/\/\/.*$/, 'comment'],
            [/\/\*[\s\S]*?\*\//, 'comment'],
            
            // Field names (identifiers)
            [/\b[a-zA-Z_][a-zA-Z0-9_]*\b/, 'variable'],
            
            // Delimiters
            [/[{}[\]()]/, 'delimiter'],
            [/[,;]/, 'delimiter'],
          ],
        },
      });

      // Register completion provider
      monaco.languages.registerCompletionItemProvider(COMPENSATION_LANGUAGE_ID, {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions: languages.CompletionItem[] = [];

          // Add built-in functions
          BUILTIN_FUNCTIONS.forEach(func => {
            suggestions.push({
              label: func.name,
              kind: monaco.languages.CompletionItemKind.Function,
              documentation: func.description,
              detail: func.signature,
              insertText: `${func.name}()`,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            });
          });

          // Add available fields
          availableFields.forEach(field => {
            suggestions.push({
              label: field,
              kind: monaco.languages.CompletionItemKind.Field,
              documentation: `Field: ${field}`,
              insertText: field,
              range,
            });
          });

          // Add custom functions
          availableFunctions.forEach(func => {
            suggestions.push({
              label: func.name,
              kind: func.type === 'function' 
                ? monaco.languages.CompletionItemKind.Function 
                : monaco.languages.CompletionItemKind.Variable,
              documentation: func.description,
              detail: func.signature,
              insertText: func.type === 'function' ? `${func.name}()` : func.name,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            });
          });

          // Add operators
          OPERATORS.forEach(op => {
            suggestions.push({
              label: op.name,
              kind: monaco.languages.CompletionItemKind.Operator,
              documentation: op.description,
              insertText: op.name,
              range,
            });
          });

          return { suggestions };
        },
      });

      // Register hover provider
      monaco.languages.registerHoverProvider(COMPENSATION_LANGUAGE_ID, {
        provideHover: (model, position) => {
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          // Find function or field info
          const func = BUILTIN_FUNCTIONS.find(f => f.name === word.word);
          if (func) {
            return {
              range: new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn
              ),
              contents: [
                { value: `**${func.name}**` },
                { value: func.signature || '' },
                { value: func.description },
                func.example ? { value: `Example: \`${func.example}\`` } : { value: '' },
              ].filter(content => content.value),
            };
          }

          return null;
        },
      });
    }

    // Create editor instance
    const editor = monaco.editor.create(containerRef.current, {
      value,
      language,
      theme: theme === 'dark' ? 'vs-dark' : 'vs-light',
      readOnly,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbers: 'on',
      glyphMargin: true,
      folding: true,
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 3,
      renderLineHighlight: 'line',
      contextmenu: true,
      mouseWheelZoom: true,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      suggest: {
        showFields: true,
        showFunctions: true,
        showKeywords: true,
        showValues: true,
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
      },
      quickSuggestionsDelay: 100,
    });

    editorRef.current = editor;

    // Handle content changes
    const disposable = editor.onDidChangeModelContent(() => {
      const currentValue = editor.getValue();
      onChange?.(currentValue);
      
      if (autoValidate) {
        validateExpression(currentValue);
      }
    });

    // Add placeholder if empty
    if (!value && placeholder) {
      editor.onDidFocusEditorText(() => {
        if (!editor.getValue()) {
          editor.setValue('');
        }
      });
    }

    return () => {
      disposable.dispose();
      editor.dispose();
    };
  }, []);

  // Update editor value when prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== value) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  // Update theme when prop changes
  useEffect(() => {
    if (editorRef.current) {
      monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs-light');
    }
  }, [theme]);

  // Handle fullscreen mode
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const validateExpression = useCallback(async (expression: string) => {
    if (!showValidation) return;

    setIsValidating(true);
    
    try {
      // Simple validation - in a real implementation, this would call the backend
      const validationErrors: ExpressionError[] = [];
      
      // Basic syntax checking
      const openParens = (expression.match(/\(/g) || []).length;
      const closeParens = (expression.match(/\)/g) || []).length;
      
      if (openParens !== closeParens) {
        validationErrors.push({
          line: 1,
          column: expression.length,
          message: 'Mismatched parentheses',
          severity: 'error',
        });
      }

      // Check for empty expression
      if (!expression.trim()) {
        validationErrors.push({
          line: 1,
          column: 1,
          message: 'Expression cannot be empty',
          severity: 'warning',
        });
      }

      setErrors(validationErrors);
      onValidate?.(validationErrors);

      // Update editor markers
      if (editorRef.current) {
        const markers = validationErrors.map(error => ({
          startLineNumber: error.line,
          startColumn: error.column,
          endLineNumber: error.line,
          endColumn: error.column + 1,
          message: error.message,
          severity: error.severity === 'error' 
            ? monaco.MarkerSeverity.Error
            : error.severity === 'warning'
            ? monaco.MarkerSeverity.Warning
            : monaco.MarkerSeverity.Info,
        }));

        monaco.editor.setModelMarkers(
          editorRef.current.getModel()!,
          'compensation-expression',
          markers
        );
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  }, [showValidation, onValidate]);

  const handleValidate = () => {
    if (editorRef.current) {
      validateExpression(editorRef.current.getValue());
    }
  };

  const handleTest = async () => {
    if (!onTest || !editorRef.current) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const expression = editorRef.current.getValue();
      const result = await onTest(expression);
      setTestResult(result);
    } catch (error) {
      setTestResult({ error: error instanceof Error ? error.message : 'Test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.getValue());
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getErrorSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'info': return <InfoIcon color="info" />;
      default: return <InfoIcon />;
    }
  };

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  return (
    <Box 
      sx={{ 
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto',
        width: isFullscreen ? '100vw' : '100%',
        height: isFullscreen ? '100vh' : 'auto',
        bgcolor: 'background.paper',
      }}
    >
      <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle2">Expression Editor</Typography>
              
              {errors.length > 0 && (
                <Stack direction="row" spacing={1}>
                  {errorCount > 0 && (
                    <Chip
                      size="small"
                      icon={<ErrorIcon />}
                      label={`${errorCount} error${errorCount > 1 ? 's' : ''}`}
                      color="error"
                      variant="outlined"
                    />
                  )}
                  {warningCount > 0 && (
                    <Chip
                      size="small"
                      icon={<WarningIcon />}
                      label={`${warningCount} warning${warningCount > 1 ? 's' : ''}`}
                      color="warning"
                      variant="outlined"
                    />
                  )}
                </Stack>
              )}
            </Stack>

            <Stack direction="row" spacing={1}>
              {showValidation && (
                <Tooltip title="Validate Expression">
                  <IconButton 
                    size="small" 
                    onClick={handleValidate}
                    disabled={isValidating}
                  >
                    <ValidateIcon />
                  </IconButton>
                </Tooltip>
              )}
              
              {showTesting && onTest && (
                <Tooltip title="Test Expression">
                  <IconButton 
                    size="small" 
                    onClick={handleTest}
                    disabled={isTesting}
                  >
                    <RunIcon />
                  </IconButton>
                </Tooltip>
              )}
              
              <Tooltip title="Show Suggestions">
                <IconButton 
                  size="small" 
                  onClick={() => setShowSuggestions(!showSuggestions)}
                >
                  <SuggestionIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                <IconButton size="small" onClick={toggleFullscreen}>
                  {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        {/* Editor Container */}
        <Box 
          sx={{ 
            flexGrow: 1, 
            height: isFullscreen ? 'calc(100vh - 120px)' : height,
            position: 'relative',
          }}
        >
          <div 
            ref={containerRef} 
            style={{ width: '100%', height: '100%' }}
          />
          
          {/* Placeholder overlay */}
          {!value && placeholder && (
            <Box
              sx={{
                position: 'absolute',
                top: 10,
                left: 60,
                color: 'text.disabled',
                pointerEvents: 'none',
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                fontSize: 14,
              }}
            >
              {placeholder}
            </Box>
          )}
        </Box>

        {/* Status Bar */}
        <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              {language.toUpperCase()} • Line 1, Column 1
            </Typography>
            
            <Stack direction="row" spacing={2} alignItems="center">
              {testResult && (
                <Typography 
                  variant="caption" 
                  color={testResult.error ? 'error' : 'success'}
                >
                  {testResult.error ? `Error: ${testResult.error}` : `Result: ${JSON.stringify(testResult)}`}
                </Typography>
              )}
              
              <Typography variant="caption" color="text.secondary">
                {errors.length === 0 ? 'No issues' : `${errorCount} errors, ${warningCount} warnings`}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      {/* Function Suggestions Panel */}
      {showSuggestions && (
        <Paper 
          sx={{ 
            position: 'absolute',
            top: 60,
            right: 8,
            width: 300,
            maxHeight: 400,
            overflow: 'auto',
            zIndex: 1000,
            p: 2,
          }}
        >
          <Typography variant="h6" gutterBottom>
            <FunctionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Functions & Fields
          </Typography>
          
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Built-in Functions
              </Typography>
              <Stack spacing={1}>
                {BUILTIN_FUNCTIONS.slice(0, 5).map((func) => (
                  <Box key={func.name} sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                      {func.signature}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {func.description}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
            
            {availableFields.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Available Fields
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {availableFields.slice(0, 8).map((field) => (
                    <Chip key={field} label={field} size="small" variant="outlined" />
                  ))}
                  {availableFields.length > 8 && (
                    <Chip label={`+${availableFields.length - 8} more`} size="small" />
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default MonacoExpressionEditor;