import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileUpload, type FileUploadHandle } from './FileUpload';
import { FilePreview } from './FilePreview';
import { UploadProgress } from './UploadProgress';
import { BatchParameterConfig, BatchParameters } from './BatchParameterConfig';
import ColumnMappingInterface from './ColumnMappingInterface';
import { triggerBatchCalculation, getBatchCalculationResults, getBatchUploadStatus, updateBatchParameters } from '../../services/batchCalculationService';
import { Button, CircularProgress, Box, Typography, LinearProgress, Stepper, Step, StepLabel, Alert, Chip } from '@mui/material';
import { 
  CalculateOutlined, 
  CloudUpload, 
  DataUsage, 
  Preview, 
  Save,
  CheckCircle,
  Warning,
  AutoFixHigh,
  Settings
} from '@mui/icons-material';
import { API_BASE_URL } from '../../config';
import { NavigationHeader } from '../common/NavigationHeader';
import { PersonaLayout } from '../common/PersonaLayout';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { parseApiError, ErrorItem } from '../../utils/errorHandling';
import { useUser } from '../../contexts/UserContext';
import { useTenant } from '../../contexts/TenantContext';

export interface BatchUpload {
  id: string;
  session_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  total_rows?: number;
  processed_rows: number;
  failed_rows: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ColumnInfo {
  name: string;
  data_type: string;
  sample_values: string[];
  has_data: boolean;
}

export interface UploadData {
  upload_id: string;
  columns: ColumnInfo[];
  sample_data: any[];
  total_rows: number;
  processed_rows: number;
  failed_rows: number;
  status: string;
}

// Enhanced interfaces for guided wizard
export interface MappingSuggestion {
  columnName: string;
  suggestedField: string;
  confidence: number; // 0-100
  reasoning: string;
  alternatives?: { field: string; confidence: number }[];
}

export interface DataSource {
  id: string;
  name: string;
  description?: string;
  uploadId: string;
  columnMapping: Record<string, string>;
  mappingPreset?: string;
  createdAt: Date;
  lastUsed?: Date;
  rowCount: number;
  fileInfo: {
    originalName: string;
    size: number;
    type: string;
  };
}

export interface MappingPreset {
  id: string;
  name: string;
  description: string;
  mapping: Record<string, string>;
  usage_count: number;
  created_by: string;
  tenant_id: string;
}

// Wizard step definitions as specified in implementation plan
// Canonical wizard steps used consistently across stepper, state, and rendering
export type WizardStep = 'upload-validation' | 'column-mapping' | 'data-preview' | 'save-source' | 'parameters' | 'calculating';

export interface WizardStepConfig {
  key: WizardStep;
  label: string;
  description: string;
  icon: React.ComponentType;
  optional?: boolean;
}

interface BatchUploadContainerProps {
  sessionId: string;
  onUploadComplete?: (upload: BatchUpload) => void;
  onError?: (error: string) => void;
}

// Wizard steps configuration as per implementation plan
const wizardSteps: WizardStepConfig[] = [
  {
    key: 'upload-validation',
    label: 'File Upload & Validation',
    description: 'Upload your employee data file and validate format',
    icon: CloudUpload
  },
  {
    key: 'column-mapping',
    label: 'Intelligent Column Mapping',
    description: 'AI-powered mapping of columns to system fields',
    icon: AutoFixHigh
  },
  {
    key: 'data-preview',
    label: 'Data Preview & Validation',
    description: 'Review and validate your data before processing',
    icon: Preview
  },
  {
    key: 'save-source',
    label: 'Save as Data Source',
    description: 'Save this configuration for future use',
    icon: Save
  },
  {
    key: 'parameters',
    label: 'Configure Parameters',
    description: 'Set calculation parameters and execute',
    icon: Settings,
    optional: true
  }
];

export const BatchUploadContainer: React.FC<BatchUploadContainerProps> = ({
  sessionId,
  onUploadComplete,
  onError
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { currentTenant } = useTenant();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload-validation');
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());
  const [stepData, setStepData] = useState<Record<string, any>>({});
  
  // Upload state
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  
  // AI Column mapping state
  const [mappingSuggestions, setMappingSuggestions] = useState<MappingSuggestion[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [mappingConfidence, setMappingConfidence] = useState<number>(0);
  const [availablePresets, setAvailablePresets] = useState<MappingPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isLoadingMappings, setIsLoadingMappings] = useState(false);
  
  // Data source state
  const [dataSourceName, setDataSourceName] = useState<string>('');
  const [dataSourceDescription, setDataSourceDescription] = useState<string>('');
  const [savedDataSource, setSavedDataSource] = useState<DataSource | null>(null);
  
  // Parameters and calculation state
  const [parameters, setParameters] = useState<BatchParameters | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState<number>(0);

  // Refs: upload section for scrolling and FileUpload imperative handle
  const uploadSectionRef = useRef<HTMLDivElement | null>(null);
  const mappingSectionRef = useRef<HTMLDivElement | null>(null);
  const paramsSectionRef = useRef<HTMLDivElement | null>(null);
  const globalFileInputRef = useRef<HTMLInputElement | null>(null);
  const fileUploadRef = useRef<FileUploadHandle | null>(null);
  // Ensure we only auto-open the file dialog once per page load when using ?browse=1
  const hasAutoOpenedBrowseRef = useRef<boolean>(false);

  useEffect(() => {
    // Smoothly bring the active section into view when step changes
    requestAnimationFrame(() => {
      if (currentStep === 'upload-validation') {
        uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (currentStep === 'column-mapping') {
        mappingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (currentStep === 'parameters') {
        paramsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, [currentStep]);

  // Safety net: if a later step is active but prerequisites are missing, return to upload
  useEffect(() => {
    if ((currentStep === 'column-mapping' || currentStep === 'parameters' || currentStep === 'data-preview') && !uploadData) {
      console.log('Safety net: Returning to upload-validation because uploadData is missing');
      setCurrentStep('upload-validation');
    }
    if (currentStep === 'calculating' && (!uploadData || !parameters)) {
      console.log('Safety net: Returning to upload-validation because calculation prerequisites are missing');
      setCurrentStep('upload-validation');
    }
  }, [currentStep, uploadData, parameters]);

  // If navigated with ?browse=1, auto-open the file dialog (ONCE) for clarity
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldBrowse = params.get('browse');
    const stepParam = params.get('step');
    console.log('URL params check:', { shouldBrowse, stepParam, uploadData: !!uploadData });
    
    if (!hasAutoOpenedBrowseRef.current && shouldBrowse && (shouldBrowse === '1' || shouldBrowse === 'true')) {
      console.log('Auto-opening file dialog due to browse parameter');
      setCurrentStep('upload-validation');
      setTimeout(() => {
        openUploadStepAndDialog();
      }, 0);
      // Prevent re-opening on subsequent re-renders by removing the param
      hasAutoOpenedBrowseRef.current = true;
      params.delete('browse');
      const nextSearch = params.toString();
      // Replace the URL so back button behavior remains sane
      navigate({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
    }
    // Deep-link to a specific wizard step if requested and data is present
    // TEMPORARILY DISABLED - this might be forcing parameters step
    /*
    if (stepParam) {
      if (stepParam === 'mapping' && uploadData) {
        console.log('Setting step to column-mapping due to URL parameter');
        setCurrentStep('column-mapping');
      } else if (stepParam === 'parameters' && uploadData) {
        console.log('Setting step to parameters due to URL parameter');
        setCurrentStep('parameters');
      }
    }
    */
  }, [location.search, uploadData]);

  // Navigate to the upload step and (after render) open the file dialog
  const openUploadStepAndDialog = () => {
    if (!canNavigateToStep('upload-validation')) return;
    // If we're already on the upload step, open synchronously to preserve user gesture
    if (currentStep === 'upload-validation') {
      uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      fileUploadRef.current?.open();
      return;
    }
    // Navigate to the upload step first; attempt to open immediately if ref is already mounted
    setCurrentStep('upload-validation');
    uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (fileUploadRef.current) {
      fileUploadRef.current.open();
    }
  };

  // Wizard navigation helpers
  const getCurrentStepIndex = () => {
    const idx = wizardSteps.findIndex(step => step.key === currentStep);
    return idx >= 0 ? idx : 0; // Fallback to first step to avoid blocking navigation
  };
  const isStepCompleted = (step: WizardStep) => completedSteps.has(step);
  // Check prerequisites per step to prevent confusing no-op clicks
  const stepPrereqsMet = (step: WizardStep) => {
    if (step === 'column-mapping') return !!uploadData;
    if (step === 'data-preview') return !!uploadData;
    if (step === 'parameters') return !!uploadData; // mapping is optional; parameters can still be viewed
    if (step === 'calculating') return !!uploadData && !!parameters;
    return true;
  };
  const canNavigateToStep = (step: WizardStep) => {
    const stepIndex = wizardSteps.findIndex(s => s.key === step);
    const currentIndex = getCurrentStepIndex();
    
    if (stepIndex < 0) return false;
    
    // Check if prerequisites are met first
    const prereqsMet = stepPrereqsMet(step);
    if (!prereqsMet) return false;
    
    // Allow navigation to:
    // 1. Current step (always allow re-activation of current step)
    // 2. Any previous step (go back)
    // 3. Any completed step (re-visit completed steps)
    // 4. Next immediate step (if current step is completed)
    // 5. Special case: column-mapping is always available after upload
    const isCurrentStep = step === currentStep;
    const isPreviousStep = stepIndex < currentIndex;
    const isCompletedStep = isStepCompleted(step);
    const isNextStep = stepIndex === currentIndex + 1;
    const currentStepCompleted = isStepCompleted(currentStep);
    const isColumnMappingWithUpload = step === 'column-mapping' && !!uploadData;
    
    return isCurrentStep || isPreviousStep || isCompletedStep || 
           (isNextStep && currentStepCompleted) || isColumnMappingWithUpload;
  };

  const markStepCompleted = (step: WizardStep) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  };

  const navigateToStep = (step: WizardStep) => {
    if (canNavigateToStep(step)) {
      setCurrentStep(step);
    }
  };

  // Mock AI column mapping service (in real app, this would call the backend)
  const generateColumnMappingSuggestions = async (columns: ColumnInfo[]): Promise<MappingSuggestion[]> => {
    setIsLoadingMappings(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock AI suggestions based on column names
    const suggestions: MappingSuggestion[] = columns.map(column => {
      const name = column.name.toLowerCase();
      let suggestedField = 'unknown';
      let confidence = 50;
      let reasoning = 'Based on column name analysis';

      // Simple rule-based mapping (in real app, this would be ML-based)
      if (name.includes('name') || name.includes('employee')) {
        suggestedField = 'employee_name';
        confidence = 95;
        reasoning = 'Strong match for employee name based on column header';
      } else if (name.includes('salary') || name.includes('base')) {
        suggestedField = 'base_salary';
        confidence = 90;
        reasoning = 'High confidence match for salary field';
      } else if (name.includes('department') || name.includes('dept')) {
        suggestedField = 'department';
        confidence = 85;
        reasoning = 'Department field identified from column name';
      } else if (name.includes('performance') || name.includes('rating')) {
        suggestedField = 'performance_rating';
        confidence = 80;
        reasoning = 'Performance metric detected';
      } else if (name.includes('id') || name.includes('emp')) {
        suggestedField = 'employee_id';
        confidence = 75;
        reasoning = 'Likely employee identifier';
      } else if (name.includes('date') || name.includes('hired')) {
        suggestedField = 'hire_date';
        confidence = 70;
        reasoning = 'Date field detected';
      }

      return {
        columnName: column.name,
        suggestedField,
        confidence,
        reasoning,
        alternatives: suggestedField !== 'unknown' ? [
          { field: 'skip', confidence: 10 },
          { field: 'custom', confidence: 5 }
        ] : []
      };
    });

    setIsLoadingMappings(false);
    return suggestions;
  };

  // Calculate overall mapping confidence
  const calculateMappingConfidence = (suggestions: MappingSuggestion[]): number => {
    if (suggestions.length === 0) return 0;
    const avgConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length;
    return Math.round(avgConfidence);
  };

  const handleFileSelect = useCallback(async (file: File) => {
    console.log('Starting file upload process with file:', file.name, 'size:', file.size);
    setErrors([]);
    setIsUploading(true);
    // Keep current step at 'upload-validation' while showing progress
    setUploadProgress(0);

    try {
      console.log('Creating FormData with sessionId:', sessionId);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('session_id', sessionId);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      console.log('Sending file upload request to:', `${API_BASE_URL}/api/v1/batch/file`);
      const response = await fetch(`${API_BASE_URL}/api/v1/batch/file`, {
        method: 'POST',
        body: formData,
      });
      console.log('Received response:', response.status, response.statusText);

      clearInterval(progressInterval);
      setUploadProgress(100);

      let result;
      try {
        console.log('Parsing response as JSON...');
        result = await response.json();
        console.log('Parsed JSON result:', result);
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        // Log the response text for debugging
        try {
          const responseText = await response.text();
          console.error('Response text that failed to parse:', responseText);
        } catch (textError) {
          console.error('Failed to get response text:', textError);
        }
        throw new Error(`Failed to parse server response: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(result?.error || result?.message || 'Upload failed');
      }

      if (!result.success) {
        throw new Error(result.error || 'Upload validation failed');
      }

      // Get column information
      const upload = result.data.upload;
      console.log('Fetching columns for upload ID:', upload.id);
      const columnsResponse = await fetch(`${API_BASE_URL}/api/v1/batch/uploads/${upload.id}/columns`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      // Check if the response is ok before trying to parse JSON
      if (!columnsResponse.ok) {
        console.error('Error fetching columns:', columnsResponse.status, columnsResponse.statusText);
        throw new Error(`Failed to fetch columns: ${columnsResponse.status} ${columnsResponse.statusText}`);
      }
      
      let columnsResult;
      try {
        columnsResult = await columnsResponse.json();
        console.log('Columns result:', columnsResult);
      } catch (jsonError) {
        console.error('JSON parsing error in columns response:', jsonError);
        throw new Error(`Failed to parse columns response: ${columnsResponse.status} ${columnsResponse.statusText}`);
      }

      if (columnsResult.success) {
        console.log('Upload successful, setting uploadData and advancing to column-mapping');
        setUploadData(columnsResult.data);
        // Mark upload step as completed
        setCompletedSteps(prev => new Set([...prev, 'upload-validation']));
        // FORCE advance to column mapping - this is the critical fix
        console.log('FORCING current step to column-mapping');
        setCurrentStep('column-mapping');
        onUploadComplete?.(upload);
      } else {
        throw new Error(columnsResult?.error || 'Failed to get column information');
      }

    } catch (err) {
      console.error('Error in file upload process:', err);
      const parsed = parseApiError(err);
      console.error('Setting error messages:', parsed.errors);
      setErrors(parsed.errors);
      setCurrentStep('upload-validation');
      onError?.(parsed.summary);
    } finally {
      console.log('Upload process completed (success or failure)');
      setIsUploading(false);
    }
  }, [sessionId, onUploadComplete, onError]);

  const handleReset = useCallback(() => {
    setCurrentStep('upload-validation');
    setUploadData(null);
    setUploadProgress(0);
    setIsUploading(false);
    setErrors([]);
  }, []);


  const handleParametersUpdate = useCallback(async (newParameters: BatchParameters) => {
    console.log('=== APPLYING PARAMETERS ===');
    console.log('New parameters:', newParameters);
    
    if (!uploadData) {
      console.error('No upload data available for parameter update');
      setErrors([{
        message: 'No upload data available',
        severity: 'error',
        suggestions: ['Please upload a file first before setting parameters']
      }]);
      return;
    }
    
    try {
      setErrors([]); // Clear any existing errors
      
      // Save parameters to backend
      console.log('Saving parameters to backend for upload:', uploadData.upload_id);
      const updatedUpload = await updateBatchParameters(uploadData.upload_id, newParameters);
      console.log('Parameters saved successfully:', updatedUpload);
      
      // Update local state
      setParameters(newParameters);
      
      // Show success message (optional)
      console.log('Parameters applied successfully');
      
    } catch (error) {
      console.error('Failed to save parameters:', error);
      setErrors([{
        message: 'Failed to save calculation parameters',
        severity: 'error',
        suggestions: [
          'Check your internet connection',
          'Try applying the parameters again',
          'Refresh the page if the problem persists'
        ]
      }]);
    }
  }, [uploadData]);

  const handleStartCalculation = useCallback(async () => {
    console.log('Starting calculation with:', { uploadData, parameters });
    if (!uploadData || !parameters) {
      setErrors([{
        message: 'Missing upload data or parameters',
        severity: 'error',
        suggestions: ['Please complete the file upload and parameter configuration first']
      }]);
      return;
    }

    try {
      setIsCalculating(true);
      setCurrentStep('calculating');
      setCalculationProgress(0);
      setErrors([]);

      // Simulate initial calculation progress
      const progressInterval = setInterval(() => {
        setCalculationProgress(prev => Math.min(prev + 5, 60));
      }, 300);

      // Trigger batch calculation
      console.log('=== START CALCULATION BUTTON CLICKED ===');
      console.log('Triggering batch calculation with parameters:', parameters);
      console.log('Upload ID:', uploadData.upload_id);
      console.log('API endpoint will be:', `${API_BASE_URL}/api/batch-calculations/uploads/${uploadData.upload_id}/calculate`);
      
      try {
        const result = await triggerBatchCalculation(
          uploadData.upload_id,
          parameters
        );
      
        // Log the entire result object for debugging
        console.log('=== BATCH CALCULATION API RESPONSE ===');
        console.log('Full result object:', result);
        console.log('Result structure (formatted):', JSON.stringify(result, null, 2));
        console.log('Result.success:', result.success);
        console.log('Result.data:', result.data);
        console.log('Result.data type:', typeof result.data);
        
        clearInterval(progressInterval);
        setCalculationProgress(70);

        if (result.success) {
          // Log the exact structure of result.data to see what properties are available
          console.log('Result data structure:', JSON.stringify(result.data, null, 2));
        
        // Handle different response scenarios
        if (result.data) {
          // Check for different possible property names for immediate result
          const resultId = result.data.batch_result_id || result.data.id || result.data.result_id;
          
          if (resultId) {
            // We have an immediate result ID - navigate to results page
            const resultsUrl = `/batch/${uploadData.upload_id}/results/${resultId}`;
            console.log('Calculation completed immediately, navigating to results page:', resultsUrl);
            
            // Complete the progress and navigate
            setCalculationProgress(100);
            setTimeout(() => {
              navigate(resultsUrl);
            }, 500);
          } else if (result.data.status === 'processing' || result.data.status === 'queued') {
            // The calculation is being processed asynchronously
            console.log('=== ENTERING POLLING MODE ===');
            console.log('Calculation queued for background processing. Setting up polling mechanism.');
            console.log('Status detected:', result.data.status);
            
            // Keep the current UI state (calculating)
            // Start polling for results
            let pollErrorCount = 0;
            let pollAttempts = 0;
            let isPollingActive = true; // Flag to control polling
            const maxPollAttempts = 120; // 4 minutes at 2-second intervals
            let quickFallbackTimeout: number;
            
            const pollInterval = setInterval(async () => {
              if (!isPollingActive) {
                console.log('=== POLLING STOPPED - isPollingActive is false ===');
                clearInterval(pollInterval);
                return;
              }
              try {
                console.log(`=== POLLING ATTEMPT ${pollAttempts + 1} ===`);
                console.log('Polling for calculation status...');
                pollAttempts++;
                
                // First check batch upload status to see if processing is complete
                console.log('=== CHECKING BATCH UPLOAD STATUS ===');
                console.log('Calling getBatchUploadStatus for upload_id:', uploadData.upload_id);
                const statusResult = await getBatchUploadStatus(uploadData.upload_id);
                console.log('Status result:', statusResult);
                console.log('Current status:', statusResult?.status);
                console.log('Processed rows:', statusResult?.processed_rows);
                console.log('Total rows:', statusResult?.total_rows);
                
                if (statusResult) {
                  // Update progress based on actual processing progress
                  if (statusResult.total_rows && statusResult.processed_rows) {
                    const progressPct = Math.min(95, (statusResult.processed_rows / statusResult.total_rows) * 100);
                    setCalculationProgress(progressPct);
                    console.log(`Updated progress to ${progressPct}%`);
                  }
                  
                  if (statusResult.status === 'completed') {
                    // Now check for results since processing is complete
                    console.log('=== PROCESSING COMPLETED - CHECKING FOR RESULTS ===');
                    console.log('Calling getBatchCalculationResults for upload_id:', uploadData.upload_id);
                    const currentPollResult = await getBatchCalculationResults(uploadData.upload_id);
                    console.log('Poll result:', currentPollResult);
                    console.log('Poll result type:', typeof currentPollResult);
                    console.log('Poll result is array:', Array.isArray(currentPollResult));
                    console.log('Poll result length:', currentPollResult?.length);
                    
                    if (currentPollResult && currentPollResult.length > 0) {
                      // We have results - navigate to the first/most recent one
                      console.log('Found completed calculation:', currentPollResult[0]);
                      isPollingActive = false;
                      clearInterval(pollInterval);
                      
                      // Clear the fallback timeout to prevent it from interfering
                      clearTimeout(quickFallbackTimeout);
                      
                      // Complete the progress and keep it at 100%
                      setCalculationProgress(100);
                      
                      const latestResult = currentPollResult[0];
                      const resultsUrl = `/batch/${uploadData.upload_id}/results/${latestResult.id}`;
                      console.log('Navigating to results page:', resultsUrl);
                      
                      setTimeout(() => {
                        navigate(resultsUrl);
                      }, 500); // Slightly longer delay to ensure progress shows
                      return; // Exit immediately - don't run any more polling logic
                    }
                  } else if (statusResult.status === 'failed') {
                    // Processing failed
                    console.log('=== PROCESSING FAILED ===');
                    console.log('Error message:', statusResult.error_message);
                    isPollingActive = false;
                    clearInterval(pollInterval);
                    clearTimeout(quickFallbackTimeout);
                    
                    setErrors([{
                      severity: 'error',
                      message: 'Batch calculation failed',
                      context: statusResult.error_message || 'Unknown error occurred during processing'
                    }]);
                    setIsCalculating(false);
                    return;
                  } else if (statusResult.status === 'processing') {
                    // Still processing, continue polling
                    console.log('=== STILL PROCESSING ===');
                    console.log('Continuing to poll...');
                  }
                }

                // If we've been polling for a while, be more aggressive with status checking
                if (pollAttempts > 5) { // After 10 seconds of polling, be more aggressive
                  console.log('=== AGGRESSIVE POLLING MODE ===');
                  console.log('Long polling detected, checking status with retry...');
                  
                  // Try checking status multiple times in quick succession
                  for (let retry = 0; retry < 3; retry++) {
                    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between retries
                    const retryStatusResult = await getBatchUploadStatus(uploadData.upload_id);
                    console.log(`Retry ${retry + 1} status result:`, retryStatusResult);
                    
                    if (retryStatusResult && retryStatusResult.status === 'completed') {
                      // Now check for results since processing is complete
                      console.log('=== RETRY - PROCESSING COMPLETED - CHECKING FOR RESULTS ===');
                      const retryResult = await getBatchCalculationResults(uploadData.upload_id);
                      console.log(`Retry ${retry + 1} calculation result:`, retryResult);
                      
                      if (retryResult && retryResult.length > 0) {
                        isPollingActive = false;
                        clearInterval(pollInterval);
                        const latestResult = retryResult[0];
                        console.log('Found completed calculation after retry:', latestResult);
                        
                        setCalculationProgress(100);
                        
                        const resultsUrl = `/batch/${uploadData.upload_id}/results/${latestResult.id}`;
                        console.log('Navigating to results page:', resultsUrl);
                        
                        setTimeout(() => {
                          navigate(resultsUrl);
                        }, 300);
                        return;
                      }
                    }
                  }
                }
                
                // First check the batch upload status for logging purposes
                try {
                  const uploadStatus = await getBatchUploadStatus(uploadData.upload_id);
                  console.log('Batch upload status:', uploadStatus);
                } catch (statusError) {
                  console.warn('Could not get upload status:', statusError);
                }

                // Still processing - update progress indicator more gradually ONLY if we haven't found results
                // Progress from 70% to 90% over polling attempts, leaving room for completion
                if (isPollingActive) {
                  const progressIncrement = Math.min(70 + (pollAttempts * 0.5), 90);
                  setCalculationProgress(progressIncrement);
                }
                
                // After significant polling attempts, try to find any results that might exist
                if (pollAttempts > 25) { // After 25 seconds, try to find any results
                  console.log('Extended polling - attempting to find any available results...');
                  
                  // Try to find results by checking multiple endpoints
                  try {
                    const directResults = await getBatchCalculationResults(uploadData.upload_id);
                    console.log('Direct results check:', directResults);
                    
                    // If we have ANY results, assume calculation is complete
                    if (directResults && directResults.length > 0) {
                      console.log('Found results during extended polling:', directResults);
                      isPollingActive = false;
                      clearInterval(pollInterval);
                      
                      setCalculationProgress(100);
                      
                      const resultsUrl = `/batch/${uploadData.upload_id}/results/${directResults[0].id}`;
                      console.log('Navigating to results from extended polling:', resultsUrl);
                      
                      setTimeout(() => {
                        navigate(resultsUrl);
                      }, 300);
                      return;
                    }
                  } catch (extendedError) {
                    console.warn('Extended polling error:', extendedError);
                  }
                }
              } catch (pollError) {
                console.error('Error polling for results:', pollError);
                // If polling fails, try to continue with just checking calculation results
                // This handles the case where the status endpoint might not be available
                try {
                  console.log('Attempting to check calculation results directly...');
                  const pollResult = await getBatchCalculationResults(uploadData.upload_id);
                  console.log('Direct poll result:', pollResult);

                  if (pollResult && pollResult.length > 0) {
                    // We have results - navigate to the first/most recent one
                    console.log('Found completed calculation in error recovery:', pollResult[0]);
                    isPollingActive = false;
                    clearInterval(pollInterval);
                    
                    // Complete the progress and keep it at 100%
                    setCalculationProgress(100);
                    
                    const latestResult = pollResult[0];
                    const resultsUrl = `/batch/${uploadData.upload_id}/results/${latestResult.id}`;
                    console.log('Navigating to results page from error recovery:', resultsUrl);

                    setTimeout(() => {
                      navigate(resultsUrl);
                    }, 500); // Longer delay to ensure progress shows
                    return; // Exit immediately
                  }
                } catch (directPollError) {
                  console.error('Error checking results directly:', directPollError);
                  // If both polling methods fail too many times, stop and show error
                  pollErrorCount++;
                  if (pollErrorCount > 5 || pollAttempts > maxPollAttempts) {
                    isPollingActive = false;
                    clearInterval(pollInterval);
                    setErrors([{
                      message: 'Failed to retrieve calculation results after multiple attempts',
                      severity: 'error',
                      suggestions: [
                        'Check your internet connection',
                        'Try refreshing the page',
                        'Contact support if the problem persists'
                      ]
                    }]);
                    setCurrentStep('parameters');
                    setCalculationProgress(0);
                  }
                }
              }
            }, 2000); // Poll every 2 seconds for better responsiveness

            // Add a quick fallback timeout that shows 100% after 15 seconds
            quickFallbackTimeout = setTimeout(() => {
              if (isPollingActive) {
                console.log('=== QUICK FALLBACK - SHOWING 100% PROGRESS ===');
                setCalculationProgress(100);
              }
            }, 15000); // 15 seconds - show 100% progress
            
            // Add a fallback timeout that assumes calculation is complete after 30 seconds
            setTimeout(() => {
              if (isPollingActive) {
                console.log('=== FALLBACK TIMEOUT - ASSUMING CALCULATION IS COMPLETE ===');
                isPollingActive = false;
                clearInterval(pollInterval);
                
                // Force navigation to results page
                setCalculationProgress(100);
                
                // Try to get results one more time
                getBatchCalculationResults(uploadData.upload_id).then(fallbackResults => {
                  console.log('Fallback results check:', fallbackResults);
                  
                  if (fallbackResults && fallbackResults.length > 0) {
                    const resultsUrl = `/batch/${uploadData.upload_id}/results/${fallbackResults[0].id}`;
                    console.log('Navigating to results from fallback:', resultsUrl);
                    navigate(resultsUrl);
                  } else {
                    // Navigate to general results page
                    const generalResultsUrl = `/batch/${uploadData.upload_id}/results`;
                    console.log('Navigating to general results from fallback:', generalResultsUrl);
                    navigate(generalResultsUrl);
                  }
                }).catch(fallbackError => {
                  console.error('Fallback error:', fallbackError);
                  // Still navigate to general results page
                  const generalResultsUrl = `/batch/${uploadData.upload_id}/results`;
                  console.log('Navigating to general results after fallback error:', generalResultsUrl);
                  navigate(generalResultsUrl);
                });
              }
            }, 30000); // 30 seconds - assume calculation is complete
            
            // Set a timeout to stop polling after a reasonable time (e.g., 2 minutes)
            setTimeout(() => {
              if (isPollingActive) {
                isPollingActive = false;
                clearInterval(pollInterval);
                // Only show error if we're still in progress
                if (currentStep === 'calculating') {
                  setErrors([{
                    message: 'Calculation timed out after 2 minutes',
                    severity: 'warning',
                    suggestions: [
                      'Check the results page manually - calculation may still be in progress',
                      'Try with a smaller batch size',
                      'Contact support for large datasets'
                    ]
                  }]);
                  setCurrentStep('parameters');
                  setCalculationProgress(0);
                }
              }
            }, 120000); // 2 minutes
          } else {
            // Unknown status or no useful information in the response
            console.warn('No result ID found in response. Available properties:', Object.keys(result.data));
            setErrors([{
              message: 'Unable to determine calculation status',
              severity: 'error',
              suggestions: [
                'Please try starting the calculation again',
                'Verify your data and parameters are correct'
              ]
            }]);
            setCurrentStep('parameters');
          }
        }
        } else {
          throw new Error(result.error || 'Calculation failed');
        }
      } catch (apiError) {
        console.error('API error during triggerBatchCalculation:', apiError);
        throw apiError;
      }
    } catch (err) {
      console.error('Error in calculation process:', err);
      const parsed = parseApiError(err);
      console.error('Setting error messages:', parsed.errors);
      setErrors(parsed.errors);
      setCurrentStep('parameters');
      setCalculationProgress(0);
    } finally {
      console.log('Calculation process completed (success or failure)');
      setIsCalculating(false);
    }
  }, [uploadData, parameters, navigate]);

  return (
    <PersonaLayout
      title="Guided Data Upload Wizard"
      breadcrumbs={[
        { label: 'Data Hub', path: '/batch' },
        { label: 'Upload Wizard', path: '/batch/upload' }
      ]}
      actions={
        <div className="flex items-center space-x-3">
          <Button
            variant="contained"
            color="primary"
            onClick={() => globalFileInputRef.current?.click()}
            startIcon={<CloudUpload />}
            aria-label="Browse files to upload"
          >
            Browse Files
          </Button>
          {savedDataSource && (
            <Chip 
              icon={<CheckCircle />}
              label={`Saved: ${savedDataSource.name}`}
              color="success"
              variant="outlined"
            />
          )}
        </div>
      }
    >
      
      <div className="max-w-4xl mx-auto">
        {/* Debug: Current Step Display */}
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <strong>Debug:</strong> Current Step: <code>{currentStep}</code> | Upload Data: <code>{uploadData ? 'Available' : 'None'}</code> | Completed Steps: <code>{Array.from(completedSteps).join(', ')}</code>
        </div>
        {/* Keep header CTA; remove duplicate inline CTA to reduce clutter */}
        
        {/* Enhanced Wizard Stepper */}
        <div className="mb-8">
      <Stepper 
        activeStep={getCurrentStepIndex()} 
        alternativeLabel
        nonLinear
        className="mb-6"
      >
        {wizardSteps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = isStepCompleted(step.key);
          const isCurrent = currentStep === step.key;
          const allowed = canNavigateToStep(step.key);
          const disabledHint = !stepPrereqsMet(step.key)
            ? (step.key === 'column-mapping' || step.key === 'data-preview')
              ? 'Upload a file first to map columns'
              : step.key === 'parameters'
                ? 'Upload a file before configuring parameters'
                : step.key === 'calculating'
                  ? 'Set parameters before calculating'
                  : undefined
            : undefined;
          
          return (
            <Step 
              key={step.key}
              completed={isCompleted}
              sx={{ 
                cursor: allowed ? 'pointer' : 'not-allowed',
                '& .MuiStepLabel-root': {
                  flexDirection: 'column',
                }
              }}
            >
              <button
                type="button"
                onClick={() => {
                  console.log(`Clicking step: ${step.key}, allowed: ${allowed}`);
                  if (!allowed) return;
                  if (step.key === 'upload-validation') {
                    openUploadStepAndDialog();
                  } else {
                    console.log(`Navigating to step: ${step.key}`);
                    navigateToStep(step.key);
                  }
                }}
                className={`flex flex-col items-center bg-transparent border-0 p-0 m-0 focus:outline-none ${allowed ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                title={disabledHint}
                aria-label={`Go to step: ${step.label}`}
              >
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all
                  ${isCurrent 
                        ? 'border-blue-500 bg-blue-50 text-blue-600' 
                        : isCompleted 
                          ? 'border-green-500 bg-green-50 text-green-600'
                          : 'border-gray-300 bg-gray-50 text-gray-400'
                      }
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="text-center mt-2">
                      <div className={`font-medium ${isCurrent ? 'text-blue-600' : 'text-gray-700'}`}>
                        {step.label}
                      </div>
                      <div className="text-sm text-gray-500 mt-1 max-w-32">
                        {step.description}
                      </div>
                      {step.optional && (
                        <Chip label="Optional" size="small" variant="outlined" className="mt-1" />
                      )}
                    </div>
                  </button>
                </Step>
              );
            })}
          </Stepper>

          {/* Overall Progress Indicator */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-600">
                {completedSteps.size} of {wizardSteps.length} steps completed
              </span>
            </div>
            <LinearProgress 
              variant="determinate" 
              value={(completedSteps.size / wizardSteps.length) * 100}
              className="h-2 rounded-full"
            />
            {/* Reduce duplication: keep descriptive text only; use header Browse action */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Select a CSV file to begin or replace your upload.
              </div>
            </div>
          </div>

          {/* Hidden input for header Browse action */}
          <div className="mt-4">
            <input
              ref={globalFileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  const f = files[0];
                  handleFileSelect(f);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
        </div>

      {/* Error Display */}
      {errors.length > 0 && (
        <div className="mb-6">
          <ErrorDisplay 
            errors={errors} 
            title="Issues Found"
            collapsible={true}
            showContext={true}
          />
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setErrors([])}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                setErrors([]);
                setCurrentStep('upload-validation');
                setUploadData(null);
                setUploadProgress(0);
                setIsUploading(false);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Content based on current step */}
      {(!uploadData || currentStep === 'upload-validation') && (
        <div ref={uploadSectionRef} className="mb-8" data-testid="upload-section">
          <FileUpload
            ref={fileUploadRef}
            onFileSelect={handleFileSelect}
            disabled={isUploading}
            sessionId={sessionId}
          />
          {/* Remove extra Browse button under dropzone to avoid repetition; header CTA remains */}
        </div>
      )}

      {isUploading && (
        <UploadProgress
          progress={uploadProgress}
          isComplete={uploadProgress === 100}
          fileName={uploadData?.upload_id || 'Processing...'}
        />
      )}

      {(currentStep === 'column-mapping' || (uploadData && !completedSteps.has('column-mapping') && currentStep !== 'upload-validation')) && (
        <div ref={mappingSectionRef}>
          <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded text-sm">
            <strong>Column Mapping Section FORCED ACTIVE:</strong> currentStep={currentStep}, uploadData={uploadData ? 'YES' : 'NO'}, columns={uploadData?.columns?.length || 0}
          </div>
          {uploadData ? (
            <ColumnMappingInterface
              columns={uploadData.columns}
              onMappingComplete={(mapping) => {
                console.log('Column mapping completed:', mapping);
                setColumnMapping(mapping);
                setCompletedSteps(prev => new Set([...prev, 'column-mapping']));
                setCurrentStep('parameters');
              }}
              onCancel={handleReset}
            />
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
              Please upload a file before mapping columns.
            </div>
          )}
        </div>
      )}

      {currentStep === 'parameters' && uploadData && (
        <div ref={paramsSectionRef}>
          <BatchParameterConfig 
            uploadId={uploadData.upload_id}
            onParametersChange={handleParametersUpdate}
          />
          
          <div className="mt-6 flex justify-end">
            <Button
              variant="contained"
              color="primary"
              startIcon={<CalculateOutlined />}
              onClick={handleStartCalculation}
              disabled={!parameters || isCalculating}
            >
              Start Calculation
            </Button>
          </div>
        </div>
      )}

      {currentStep === 'data-preview' && uploadData && (
        <FilePreview
          uploadData={uploadData}
          onReset={handleReset}
          onContinue={() => {
            setCurrentStep('column-mapping');
          }}
        />
      )}

      {currentStep === 'calculating' && (
        <div className="text-center py-8">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Calculating Bonuses
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Processing {uploadData?.total_rows || '...'} employee records
            </Typography>
            <Box sx={{ width: '100%', mt: 4 }}>
              <LinearProgress 
                variant="determinate" 
                value={calculationProgress} 
                sx={{ height: 10, borderRadius: 5 }} 
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {calculationProgress}% Complete
              </Typography>
            </Box>
            {calculationProgress >= 75 && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <Button 
                  variant="outlined" 
                  onClick={async () => {
                    try {
                      console.log('Manual check for results triggered');
                      
                      // Stop any ongoing polling first
                      setIsCalculating(false);
                      
                      if (!uploadData) return;
                      
                      const pollResult = await getBatchCalculationResults(uploadData.upload_id);
                      console.log('Manual poll result:', pollResult);
                      
                      if (pollResult && pollResult.length > 0) {
                        const latestResult = pollResult[0];
                        console.log('Found completed calculation manually:', latestResult);
                        
                        setCalculationProgress(100);
                        
                        const resultsUrl = `/batch/${uploadData.upload_id}/results/${latestResult.id}`;
                        console.log('Navigating to results page:', resultsUrl);
                        
                        setTimeout(() => {
                          navigate(resultsUrl);
                        }, 300);
                      } else {
                        console.log('No results found during manual check');
                        // Resume calculation state if no results found
                        setIsCalculating(true);
                      }
                    } catch (error) {
                      console.error('Error during manual check:', error);
                      // Resume calculation state on error
                      setIsCalculating(true);
                    }
                  }}
                >
                  Check Results Now
                </Button>
                <Button 
                  variant="outlined" 
                  color="secondary"
                  onClick={() => {
                    console.log('Force complete triggered - navigating to batch results page');
                    
                    if (!uploadData) return;
                    
                    // Navigate to the general batch results page
                    const batchResultsUrl = `/batch/${uploadData.upload_id}/results`;
                    console.log('Navigating to batch results page:', batchResultsUrl);
                    
                    setCalculationProgress(100);
                    setTimeout(() => {
                      navigate(batchResultsUrl);
                    }, 300);
                  }}
                >
                  View Results
                </Button>
              </div>
            )}
          </Box>
        </div>
      )}
      </div>
    </PersonaLayout>
  );
};
