import axios from 'axios';
import { API_BASE_URL } from '../config';

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
    // The backend expects parameters directly, not nested
    const response = await axios.post(
      `${API_BASE_URL}/api/batch-calculations/uploads/${uploadId}/calculate`,
      parameters, // Send parameters directly as the request body
      {
        params: {
          create_scenario: createScenario,
          scenario_name: scenarioName
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error triggering batch calculation:', error);
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
    const response = await axios.get(
      `${API_BASE_URL}/api/batch-calculations/uploads/${uploadId}/results`
    );
    
    // Make sure we're returning the data array from the API response
    return response.data.data || [];
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
    const response = await axios.get(
      `${API_BASE_URL}/api/batch-calculations/results/${resultId}`
    );
    
    // Make sure we're returning the data from the API response
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
  try {
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
    
    const response = await axios.get(
      `${API_BASE_URL}/api/batch-calculations/results/${resultId}/employees?${params.toString()}`
    );
    
    // Make sure we're returning the data array from the API response
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching employee calculation results:', error);
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
      `${API_BASE_URL}/api/batch-calculations/results/${resultId}/summary`
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
      `${API_BASE_URL}/api/batch-calculations/results/${resultId}/export`,
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
