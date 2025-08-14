import axios from 'axios';
import { API_BASE_URL } from '../config';
import { calculateBonus } from '../utils/calculationEngine';

// Define employee type to fix type errors
interface Employee {
  id: string;
  name: string;
  base_salary: number;
  raf?: number;
  is_mrt: boolean;
}

// Define calculation result type
interface EmployeeCalculationResult {
  employee_id: string;
  employee_name: string;
  base_salary: number;
  raf: number;
  is_mrt: boolean;
  final_bonus: number;
  calculation_details: any;
}

/**
 * Trigger a batch calculation for the specified upload
 * @param uploadId ID of the batch upload to calculate
 * @param parameters Optional calculation parameters
 * @param createScenario Whether to create a scenario for this calculation
 * @param scenarioName Name of the scenario (required if createScenario is true)
 * @returns Promise with the API response
 */
export const triggerBatchCalculation = async (
  uploadId: string,
  parameters?: any,
  createScenario: boolean = false,
  scenarioName?: string
) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/batch-calculations/uploads/${uploadId}/calculate`,
      parameters,
      {
        params: {
          create_scenario: createScenario,
          scenario_name: scenarioName,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error triggering batch calculation with all endpoints:', error);
    throw error;
  }
};

/**
 * Get batch upload status
 * @param uploadId ID of the batch upload
 * @returns Promise with the batch upload status
 */
export const getBatchUploadStatus = async (uploadId: string) => {
  try {
    const endpoint = `${API_BASE_URL}/api/v1/batch/uploads/${uploadId}`;
    console.log('=== getBatchUploadStatus CALLED ===');
    console.log('Endpoint:', endpoint);
    console.log('Upload ID:', uploadId);
    
    const response = await axios.get(endpoint);
    
    console.log('=== BATCH UPLOAD STATUS RESPONSE ===');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
    // Handle ApiResponse format
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }
    
    console.warn('Unexpected response format from getBatchUploadStatus:', response.data);
    return null;
  } catch (error) {
    console.error('Error fetching batch upload status:', error);
    throw error;
  }
};

/**
 * Get all calculation results for a batch upload
 * @param uploadId ID of the batch upload
 * @returns Promise with the list of batch calculation results
 */
export const getBatchCalculationResults = async (uploadId: string) => {
  try {
    const endpoint = `${API_BASE_URL}/api/v1/batch-calculations/uploads/${uploadId}/results`;
    console.log('=== getBatchCalculationResults CALLED ===');
    console.log('Endpoint:', endpoint);
    console.log('Upload ID:', uploadId);
    
    const response = await axios.get(endpoint);
    
    // Log the raw response for debugging
    console.log('=== RAW API RESPONSE ===');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    console.log('Response data type:', typeof response.data);
    console.log('Response data is array:', Array.isArray(response.data));
    
    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    console.warn('Unexpected response format from getBatchCalculationResults:', response.data);
    return [];
  } catch (error) {
    console.error('Error fetching batch calculation results:', error);
    throw error;
  }
};

/**
 * Get a specific batch calculation result
 * @param resultId ID of the batch calculation result
 * @returns Promise with the batch calculation result
 */
export const getBatchCalculationResult = async (resultId: string) => {
  try {
    const endpoint = `${API_BASE_URL}/api/v1/batch-calculations/results/${resultId}`;
    const response = await axios.get(endpoint);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching batch calculation result:', error);
    throw error;
  }
};

/**
 * Get employee calculation results for a batch calculation
 * @param resultId ID of the batch calculation result
 * @param page Page number (1-based)
 * @param pageSize Number of results per page
 * @param sortBy Field to sort by
 * @param sortOrder Sort order (asc or desc)
 * @param filterDept Filter by department
 * @param search Search term for employee name or ID
 * @returns Promise with the list of employee calculation results
 */
export const getEmployeeCalculationResults = async (
  resultId: string,
  page: number = 1,
  pageSize: number = 100,
  sortBy: string = 'last_name',
  sortOrder: string = 'asc',
  filterDept?: string,
  search?: string
) => {
  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    sort_by: sortBy,
    sort_order: sortOrder
  });
  
  if (filterDept) {
    params.append('filter_dept', filterDept);
  }
  
  if (search) {
    params.append('search', search);
  }
  
  const queryString = params.toString();
  
  const endpoint = `${API_BASE_URL}/api/v1/batch-calculations/results/${resultId}/employees?${queryString}`;
  try {
    const response = await axios.get(endpoint);
    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    console.warn('Unexpected response format from getEmployeeCalculationResults:', response.data);
    return [];
  } catch (error) {
    console.error('Error fetching employee results:', error);
    throw error;
  }
};

/**
 * Get summary statistics for a batch calculation
 * @param resultId ID of the batch calculation result
 * @returns Promise with the summary statistics
 */
export const getBatchCalculationSummary = async (resultId: string) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/batch-calculations/results/${resultId}/summary`
    );
    
    // Make sure we're returning the data from the API response
    return response.data.data;
  } catch (error) {
    console.error('Error fetching batch calculation summary:', error);
    throw error;
  }
};

/**
 * Export calculation results to a file
 * @param resultId ID of the batch calculation result
 * @param format Export format (csv or xlsx)
 * @param includeBreakdown Whether to include calculation breakdown
 * @returns Promise with the API response containing download URL
 */
export const exportCalculationResults = async (
  resultId: string,
  format: 'csv' | 'xlsx' = 'csv',
  includeBreakdown: boolean = false
) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/batch-calculations/results/${resultId}/export`,
      {
        format,
        include_breakdown: includeBreakdown
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error exporting calculation results:', error);
    throw error;
  }
};

/**
 * Get detailed bonus distribution analysis for visualization
 * @param resultId ID of the batch calculation result
 * @returns Promise with detailed distribution statistics for charts
 */
export const getBonusDistributionAnalysis = async (resultId: string) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/batch-calculations/results/${resultId}/distribution`
    );
    return response.data.data;
  } catch (error) {
    console.error('Error fetching bonus distribution analysis:', error);
    throw error;
  }
};

/**
 * Update batch parameters for a batch upload
 * @param uploadId ID of the batch upload
 * @param parameters Batch calculation parameters
 * @returns Promise with the updated batch upload
 */
export const updateBatchParameters = async (uploadId: string, parameters: any) => {
  try {
    console.log('=== UPDATING BATCH PARAMETERS ===');
    console.log('Upload ID:', uploadId);
    console.log('Parameters:', parameters);
    
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/batch/uploads/${uploadId}/parameters`,
      parameters,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Update batch parameters response:', response.data);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to update batch parameters');
    }
  } catch (error) {
    console.error('Error updating batch parameters:', error);
    throw error;
  }
};
