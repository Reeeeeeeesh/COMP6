import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  RadioGroup,
  Radio,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  Chip,
  Autocomplete,
  Switch,
  Slider,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Collapse,
  Alert,
  IconButton,
  useTheme,
  useMediaQuery,
  Fab,
  Backdrop,
  CircularProgress,
  Snackbar,
  Grid,
  Divider,
  Avatar,
  ListItem,
  ListItemIcon,
  ListItemText,
  DialogTitle,
  DialogContent,
  DialogActions,
  Dialog
} from '@mui/material';
import { DatePicker, TimePicker, DateTimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Save as SaveIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  PhotoCamera as CameraIcon,
  AttachFile as AttachIcon,
  LocationOn as LocationIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  KeyboardArrowUp as ScrollUpIcon,
  TouchApp as TouchIcon
} from '@mui/icons-material';

interface FormField {
  id: string;
  type: 'text' | 'number' | 'email' | 'password' | 'tel' | 'url' | 'textarea' | 
        'select' | 'multiselect' | 'radio' | 'checkbox' | 'switch' | 'slider' |
        'date' | 'time' | 'datetime' | 'file' | 'autocomplete' | 'custom';
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    custom?: (value: any) => string | null;
  };
  options?: Array<{ value: any; label: string; disabled?: boolean; }>;
  defaultValue?: any;
  helperText?: string;
  fullWidth?: boolean;
  multiline?: boolean;
  rows?: number;
  step?: number;
  marks?: Array<{ value: number; label: string; }>;
  accept?: string; // For file inputs
  multiple?: boolean; // For file/multiselect
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  conditionalDisplay?: (formData: any) => boolean;
  mobileOptimized?: boolean;
  touchFriendly?: boolean;
  autoFocus?: boolean;
  section?: string;
}

interface ResponsiveFormProps {
  fields: FormField[];
  onSubmit: (data: any) => Promise<void> | void;
  onCancel?: () => void;
  onFieldChange?: (fieldId: string, value: any, formData: any) => void;
  initialData?: any;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  readOnly?: boolean;
  showStepper?: boolean;
  sectioned?: boolean;
  validateOnChange?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
  mobileFullscreen?: boolean;
  compactMode?: boolean;
}

interface ValidationErrors {
  [key: string]: string;
}

const ResponsiveForm: React.FC<ResponsiveFormProps> = ({
  fields,
  onSubmit,
  onCancel,
  onFieldChange,
  initialData = {},
  title,
  subtitle,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  loading = false,
  readOnly = false,
  showStepper = false,
  sectioned = false,
  validateOnChange = true,
  autoSave = false,
  autoSaveInterval = 30000,
  mobileFullscreen = false,
  compactMode = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  const [formData, setFormData] = useState<any>(initialData);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [activeStep, setActiveStep] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  
  const formRef = useRef<HTMLFormElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Group fields by section
  const sectionsMap = fields.reduce((acc, field) => {
    const section = field.section || 'main';
    if (!acc[section]) acc[section] = [];
    acc[section].push(field);
    return acc;
  }, {} as { [key: string]: FormField[] });

  const sections = Object.keys(sectionsMap);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave) return;

    const interval = setInterval(async () => {
      if (Object.keys(formData).length > 0) {
        setAutoSaveStatus('saving');
        try {
          // Simulate auto-save (implement actual logic here)
          await new Promise(resolve => setTimeout(resolve, 1000));
          setAutoSaveStatus('saved');
        } catch (error) {
          setAutoSaveStatus('error');
        }
      }
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [autoSave, autoSaveInterval, formData]);

  // Validate individual field
  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (value === '' || value == null || value === undefined)) {
      return `${field.label} is required`;
    }

    if (field.validation) {
      const { pattern, min, max, minLength, maxLength, custom } = field.validation;

      if (pattern && value && !new RegExp(pattern).test(value)) {
        return `${field.label} format is invalid`;
      }

      if (typeof value === 'number') {
        if (min !== undefined && value < min) {
          return `${field.label} must be at least ${min}`;
        }
        if (max !== undefined && value > max) {
          return `${field.label} must be at most ${max}`;
        }
      }

      if (typeof value === 'string') {
        if (minLength !== undefined && value.length < minLength) {
          return `${field.label} must be at least ${minLength} characters`;
        }
        if (maxLength !== undefined && value.length > maxLength) {
          return `${field.label} must be at most ${maxLength} characters`;
        }
      }

      if (custom) {
        return custom(value);
      }
    }

    return null;
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    fields.forEach(field => {
      if (field.conditionalDisplay && !field.conditionalDisplay(formData)) return;
      
      const error = validateField(field, formData[field.id]);
      if (error) {
        errors[field.id] = error;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    const newFormData = { ...formData, [fieldId]: value };
    setFormData(newFormData);
    setTouched(prev => new Set(prev).add(fieldId));

    if (validateOnChange) {
      const field = fields.find(f => f.id === fieldId);
      if (field) {
        const error = validateField(field, value);
        setValidationErrors(prev => ({
          ...prev,
          [fieldId]: error || ''
        }));
      }
    }

    onFieldChange?.(fieldId, value, newFormData);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (readOnly || loading) return;

    const isValid = validateForm();
    if (!isValid) {
      setSubmitStatus('error');
      setSubmitMessage('Please fix the errors above');
      return;
    }

    setSubmitStatus('submitting');
    try {
      await onSubmit(formData);
      setSubmitStatus('success');
      setSubmitMessage('Form submitted successfully');
    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const togglePasswordVisibility = (fieldId: string) => {
    setShowPassword(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  const toggleSectionCollapse = (section: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const scrollToTop = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderField = (field: FormField) => {
    if (field.conditionalDisplay && !field.conditionalDisplay(formData)) {
      return null;
    }

    const value = formData[field.id] ?? field.defaultValue ?? '';
    const error = touched.has(field.id) && validationErrors[field.id];
    const fieldProps = {
      disabled: field.disabled || readOnly || loading,
      fullWidth: field.fullWidth ?? true,
      error: !!error,
      helperText: error || field.helperText,
      value,
      onChange: (e: any) => handleFieldChange(field.id, e.target ? e.target.value : e),
      onBlur: () => setTouched(prev => new Set(prev).add(field.id)),
      size: (isMobile || compactMode) ? 'small' as const : 'medium' as const,
      sx: {
        marginBottom: compactMode ? 1 : 2,
        '& .MuiInputBase-root': {
          fontSize: isMobile ? '16px' : '14px', // Prevents zoom on iOS
          minHeight: isMobile ? '48px' : 'auto', // Touch-friendly height
        },
        '& .MuiFormLabel-root': {
          fontSize: isMobile ? '16px' : '14px',
        }
      }
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'tel':
      case 'url':
        return (
          <TextField
            key={field.id}
            type={field.type === 'password' && showPassword[field.id] ? 'text' : field.type}
            label={field.label}
            placeholder={field.placeholder}
            required={field.required}
            autoFocus={field.autoFocus}
            inputMode={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
            InputProps={{
              startAdornment: field.startAdornment,
              endAdornment: field.type === 'password' ? (
                <IconButton
                  edge="end"
                  onClick={() => togglePasswordVisibility(field.id)}
                  size="small"
                >
                  {showPassword[field.id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              ) : field.endAdornment
            }}
            {...fieldProps}
          />
        );

      case 'number':
        return (
          <TextField
            key={field.id}
            type="number"
            label={field.label}
            placeholder={field.placeholder}
            required={field.required}
            inputMode="numeric"
            inputProps={{
              min: field.validation?.min,
              max: field.validation?.max,
              step: field.step || 1
            }}
            {...fieldProps}
          />
        );

      case 'textarea':
        return (
          <TextField
            key={field.id}
            label={field.label}
            placeholder={field.placeholder}
            required={field.required}
            multiline
            rows={field.rows || (isMobile ? 3 : 4)}
            {...fieldProps}
          />
        );

      case 'select':
        return (
          <FormControl key={field.id} {...fieldProps}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              label={field.label}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: isMobile ? '50vh' : '300px'
                  }
                }
              }}
            >
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {(error || field.helperText) && (
              <FormHelperText>{error || field.helperText}</FormHelperText>
            )}
          </FormControl>
        );

      case 'multiselect':
        return (
          <Autocomplete
            key={field.id}
            multiple
            options={field.options || []}
            getOptionLabel={(option) => option.label}
            value={field.options?.filter(opt => value.includes(opt.value)) || []}
            onChange={(_, newValue) => 
              handleFieldChange(field.id, newValue.map(opt => opt.value))
            }
            renderTags={(tagValue, getTagProps) =>
              tagValue.map((option, index) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  size="small"
                  {...getTagProps({ index })}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={field.label}
                placeholder={field.placeholder}
                required={field.required}
                error={!!error}
                helperText={error || field.helperText}
                size={fieldProps.size}
              />
            )}
            sx={fieldProps.sx}
          />
        );

      case 'radio':
        return (
          <FormControl key={field.id} error={!!error} sx={fieldProps.sx}>
            <FormLabel component="legend">{field.label}</FormLabel>
            <RadioGroup
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              row={!isMobile}
            >
              {field.options?.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio size={isMobile ? 'medium' : 'small'} />}
                  label={option.label}
                  disabled={option.disabled || fieldProps.disabled}
                />
              ))}
            </RadioGroup>
            {(error || field.helperText) && (
              <FormHelperText>{error || field.helperText}</FormHelperText>
            )}
          </FormControl>
        );

      case 'checkbox':
        return (
          <FormControlLabel
            key={field.id}
            control={
              <Checkbox
                checked={!!value}
                onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                size={isMobile ? 'medium' : 'small'}
              />
            }
            label={field.label}
            disabled={fieldProps.disabled}
            sx={fieldProps.sx}
          />
        );

      case 'switch':
        return (
          <FormControlLabel
            key={field.id}
            control={
              <Switch
                checked={!!value}
                onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                size={isMobile ? 'medium' : 'small'}
              />
            }
            label={field.label}
            disabled={fieldProps.disabled}
            sx={fieldProps.sx}
          />
        );

      case 'slider':
        return (
          <Box key={field.id} sx={fieldProps.sx}>
            <Typography gutterBottom>{field.label}</Typography>
            <Slider
              value={value}
              onChange={(_, newValue) => handleFieldChange(field.id, newValue)}
              min={field.validation?.min || 0}
              max={field.validation?.max || 100}
              step={field.step || 1}
              marks={field.marks}
              valueLabelDisplay="auto"
              disabled={fieldProps.disabled}
              size={isMobile ? 'medium' : 'small'}
            />
            {(error || field.helperText) && (
              <FormHelperText error={!!error}>
                {error || field.helperText}
              </FormHelperText>
            )}
          </Box>
        );

      case 'date':
        return (
          <LocalizationProvider key={field.id} dateAdapter={AdapterDateFns}>
            <DatePicker
              label={field.label}
              value={value ? new Date(value) : null}
              onChange={(date) => handleFieldChange(field.id, date?.toISOString())}
              disabled={fieldProps.disabled}
              slotProps={{
                textField: {
                  ...fieldProps,
                  required: field.required,
                  size: fieldProps.size
                }
              }}
            />
          </LocalizationProvider>
        );

      case 'time':
        return (
          <LocalizationProvider key={field.id} dateAdapter={AdapterDateFns}>
            <TimePicker
              label={field.label}
              value={value ? new Date(value) : null}
              onChange={(date) => handleFieldChange(field.id, date?.toISOString())}
              disabled={fieldProps.disabled}
              slotProps={{
                textField: {
                  ...fieldProps,
                  required: field.required,
                  size: fieldProps.size
                }
              }}
            />
          </LocalizationProvider>
        );

      case 'datetime':
        return (
          <LocalizationProvider key={field.id} dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label={field.label}
              value={value ? new Date(value) : null}
              onChange={(date) => handleFieldChange(field.id, date?.toISOString())}
              disabled={fieldProps.disabled}
              slotProps={{
                textField: {
                  ...fieldProps,
                  required: field.required,
                  size: fieldProps.size
                }
              }}
            />
          </LocalizationProvider>
        );

      case 'file':
        return (
          <Box key={field.id} sx={fieldProps.sx}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<AttachIcon />}
              disabled={fieldProps.disabled}
              fullWidth={isMobile}
              size={fieldProps.size}
            >
              {field.label}
              <input
                type="file"
                hidden
                accept={field.accept}
                multiple={field.multiple}
                onChange={(e) => handleFieldChange(field.id, 
                  field.multiple ? Array.from(e.target.files || []) : e.target.files?.[0]
                )}
              />
            </Button>
            {value && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {Array.isArray(value) 
                  ? `${value.length} files selected`
                  : value.name || 'File selected'
                }
              </Typography>
            )}
            {(error || field.helperText) && (
              <FormHelperText error={!!error}>
                {error || field.helperText}
              </FormHelperText>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const renderSection = (sectionName: string, sectionFields: FormField[]) => {
    const isCollapsed = collapsedSections.has(sectionName);
    
    if (sectionName === 'main' && !sectioned) {
      return sectionFields.map(renderField);
    }

    return (
      <Card key={sectionName} sx={{ marginBottom: 2 }} elevation={compactMode ? 0 : 1}>
        <CardContent 
          sx={{ 
            cursor: 'pointer',
            paddingBottom: isCollapsed ? 2 : 1
          }}
          onClick={() => toggleSectionCollapse(sectionName)}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" component="h3">
              {sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}
            </Typography>
            <IconButton size="small">
              {isCollapsed ? <ExpandIcon /> : <CollapseIcon />}
            </IconButton>
          </Box>
        </CardContent>
        
        <Collapse in={!isCollapsed}>
          <CardContent sx={{ paddingTop: 0 }}>
            {sectionFields.map(renderField)}
          </CardContent>
        </Collapse>
      </Card>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        component="form"
        ref={formRef}
        onSubmit={handleSubmit}
        sx={{
          width: '100%',
          maxWidth: isMobile && mobileFullscreen ? '100vw' : '800px',
          margin: '0 auto',
          padding: isMobile ? 1 : 2
        }}
      >
        {/* Header */}
        {(title || subtitle) && (
          <Box marginBottom={3} textAlign="center">
            {title && (
              <Typography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body1" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        )}

        {/* Auto-save status */}
        {autoSave && (
          <Box display="flex" justifyContent="center" marginBottom={2}>
            <Chip
              size="small"
              icon={
                autoSaveStatus === 'saving' ? (
                  <CircularProgress size={16} />
                ) : autoSaveStatus === 'saved' ? (
                  <SuccessIcon />
                ) : (
                  <ErrorIcon />
                )
              }
              label={
                autoSaveStatus === 'saving' ? 'Saving...' :
                autoSaveStatus === 'saved' ? 'Saved' : 'Save failed'
              }
              color={
                autoSaveStatus === 'saved' ? 'success' : 
                autoSaveStatus === 'error' ? 'error' : 'default'
              }
            />
          </Box>
        )}

        {/* Form Content */}
        {showStepper ? (
          <Stepper activeStep={activeStep} orientation={isMobile ? 'vertical' : 'horizontal'}>
            {sections.map((sectionName, index) => (
              <Step key={sectionName}>
                <StepLabel>{sectionName}</StepLabel>
                <StepContent>
                  {renderSection(sectionName, sectionsMap[sectionName])}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        ) : (
          Object.entries(sectionsMap).map(([sectionName, sectionFields]) =>
            renderSection(sectionName, sectionFields)
          )
        )}

        {/* Submit Status */}
        {submitStatus !== 'idle' && (
          <Alert 
            severity={submitStatus === 'success' ? 'success' : submitStatus === 'error' ? 'error' : 'info'}
            sx={{ marginY: 2 }}
          >
            {submitMessage}
          </Alert>
        )}

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            justifyContent: isMobile ? 'stretch' : 'flex-end',
            flexDirection: isMobile ? 'column-reverse' : 'row',
            marginTop: 3,
            position: isMobile && mobileFullscreen ? 'sticky' : 'static',
            bottom: isMobile && mobileFullscreen ? 0 : 'auto',
            backgroundColor: isMobile && mobileFullscreen ? theme.palette.background.paper : 'transparent',
            padding: isMobile && mobileFullscreen ? 2 : 0,
            marginLeft: isMobile && mobileFullscreen ? -1 : 0,
            marginRight: isMobile && mobileFullscreen ? -1 : 0,
            boxShadow: isMobile && mobileFullscreen ? theme.shadows[8] : 'none'
          }}
        >
          {onCancel && (
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={loading}
              size={isMobile ? 'large' : 'medium'}
              sx={{ minHeight: isMobile ? '48px' : 'auto' }}
            >
              {cancelLabel}
            </Button>
          )}
          
          <Button
            ref={submitButtonRef}
            type="submit"
            variant="contained"
            disabled={loading || readOnly}
            size={isMobile ? 'large' : 'medium'}
            startIcon={submitStatus === 'submitting' ? <CircularProgress size={20} /> : <SaveIcon />}
            sx={{ minHeight: isMobile ? '48px' : 'auto' }}
          >
            {submitStatus === 'submitting' ? 'Submitting...' : submitLabel}
          </Button>
        </Box>

        {/* Scroll to top FAB */}
        {isMobile && (
          <Fab
            color="primary"
            size="small"
            aria-label="scroll to top"
            onClick={scrollToTop}
            sx={{
              position: 'fixed',
              bottom: 100,
              right: 16,
              zIndex: theme.zIndex.speedDial
            }}
          >
            <ScrollUpIcon />
          </Fab>
        )}

        {/* Touch hint for mobile */}
        {isMobile && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              opacity: 0.5,
              animation: 'fadeInOut 3s infinite'
            }}
          >
            <Chip
              icon={<TouchIcon />}
              label="Tap to interact"
              size="small"
              variant="outlined"
            />
          </Box>
        )}

        {/* Loading backdrop */}
        <Backdrop open={submitStatus === 'submitting'} sx={{ zIndex: theme.zIndex.modal }}>
          <CircularProgress color="primary" />
        </Backdrop>

        {/* Success snackbar */}
        <Snackbar
          open={submitStatus === 'success'}
          autoHideDuration={3000}
          onClose={() => setSubmitStatus('idle')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" onClose={() => setSubmitStatus('idle')}>
            {submitMessage}
          </Alert>
        </Snackbar>

        {/* CSS for animations */}
        <style>{`
          @keyframes fadeInOut {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 0.8; }
          }
        `}</style>
      </Box>
    </LocalizationProvider>
  );
};

export default ResponsiveForm;