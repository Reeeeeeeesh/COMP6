import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from './FileUpload';
import { FilePreview } from './FilePreview';
import { UploadProgress } from './UploadProgress';
import { BatchParameterConfig, BatchParameters } from './BatchParameterConfig';
import { triggerBatchCalculation, getBatchCalculationResults, getBatchUploadStatus } from '../../services/batchCalculationService';
import { Button, CircularProgress, Box, Typography, LinearProgress } from '@mui/material';
import { CalculateOutlined } from '@mui/icons-material';
import { API_BASE_URL } from '../../config';
import { NavigationHeader } from '../common/NavigationHeader';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { parseApiError, ErrorItem } from '../../utils/errorHandling';

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

interface BatchUploadContainerProps {
  sessionId: string;
  onUploadComplete?: (upload: BatchUpload) => void;
  onError?: (error: string) => void;
}

export const BatchUploadContainer: React.FC<BatchUploadContainerProps> = ({
  sessionId,
  onUploadComplete,
  onError
}) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'preview' | 'parameters' | 'calculating'>('upload');
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [parameters, setParameters] = useState<BatchParameters | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState<number>(0);

  const handleFileSelect = useCallback(async (file: File) => {
    console.log('Starting file upload process with file:', file.name, 'size:', file.size);
    setErrors([]);
    setIsUploading(true);
    setCurrentStep('processing');
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
        setUploadData(columnsResult.data);
        setCurrentStep('parameters');
        onUploadComplete?.(upload);
      } else {
        throw new Error(columnsResult?.error || 'Failed to get column information');
      }

    } catch (err) {
      console.error('Error in file upload process:', err);
      const parsed = parseApiError(err);
      console.error('Setting error messages:', parsed.errors);
      setErrors(parsed.errors);
      setCurrentStep('upload');
      onError?.(parsed.summary);
    } finally {
      console.log('Upload process completed (success or failure)');
      setIsUploading(false);
    }
  }, [sessionId, onUploadComplete, onError]);

  const handleReset = useCallback(() => {
    setCurrentStep('upload');
    setUploadData(null);
    setUploadProgress(0);
    setIsUploading(false);
    setErrors([]);
  }, []);


  const handleParametersUpdate = useCallback((newParameters: BatchParameters) => {
    setParameters(newParameters);
  }, []);

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
                
                // Always check for results on every poll attempt
                console.log('=== CHECKING FOR CALCULATION RESULTS ===');
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

                // If we've been polling for a while, be more aggressive
                if (pollAttempts > 5) { // After 10 seconds of polling, be more aggressive
                  console.log('=== AGGRESSIVE POLLING MODE ===');
                  console.log('Long polling detected, checking results directly with retry...');
                  
                  // Try multiple times in quick succession
                  for (let retry = 0; retry < 3; retry++) {
                    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between retries
                    const retryResult = await getBatchCalculationResults(uploadData.upload_id);
                    console.log(`Retry ${retry + 1} result:`, retryResult);
                    
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
    <div>
      <NavigationHeader title="Batch Processing" />
      <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Batch Processing</h2>
        </div>
        <div className="flex items-center mb-6">
          <div className={`flex items-center ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-500'}`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-current mr-2">
              <span className="text-sm font-medium">1</span>
            </div>
            <span className="font-medium">Upload File</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-4"></div>
          <div className={`flex items-center ${currentStep === 'processing' ? 'text-blue-600' : 'text-gray-500'}`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-current mr-2">
              <span className="text-sm font-medium">2</span>
            </div>
            <span className="font-medium">Processing</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-4"></div>
          <div className={`flex items-center ${currentStep === 'parameters' ? 'text-blue-600' : 'text-gray-500'}`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-current mr-2">
              <span className="text-sm font-medium">3</span>
            </div>
            <span className="font-medium">Configure Parameters</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-4"></div>
          <div className={`flex items-center ${currentStep === 'preview' ? 'text-blue-600' : 'text-gray-500'}`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-current mr-2">
              <span className="text-sm font-medium">4</span>
            </div>
            <span className="font-medium">Preview & Validate</span>
          </div>
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
                setCurrentStep('upload');
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
      {currentStep === 'upload' && (
        <FileUpload
          onFileSelect={handleFileSelect}
          disabled={isUploading}
          sessionId={sessionId}
        />
      )}

      {currentStep === 'processing' && (
        <UploadProgress
          progress={uploadProgress}
          isComplete={uploadProgress === 100}
          fileName={uploadData?.upload_id || 'Processing...'}
        />
      )}

      {currentStep === 'parameters' && uploadData && (
        <div>
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

      {currentStep === 'preview' && uploadData && (
        <FilePreview
          uploadData={uploadData}
          onReset={handleReset}
          onContinue={() => {
            setCurrentStep('parameters');
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
    </div>
  );
};
