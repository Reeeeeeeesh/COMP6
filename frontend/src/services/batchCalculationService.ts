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
    // Try different API endpoint patterns to handle potential routing mismatches
    try {
      // First try with the original endpoint
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
      console.log('Successfully triggered batch calculation with primary endpoint');
      return response.data;
    } catch (primaryError) {
      console.warn('Primary endpoint failed, trying alternative endpoint:', primaryError);
      
      // Try alternative endpoint format
      const alternativeResponse = await axios.post(
        `${API_BASE_URL}/api/v1/batch-calculations/uploads/${uploadId}/calculate`,
        parameters,
        {
          params: {
            create_scenario: createScenario,
            scenario_name: scenarioName
          }
        }
      );
      console.log('Successfully triggered batch calculation with alternative endpoint');
      return alternativeResponse.data;
    }
  } catch (error) {
    console.error('Error triggering batch calculation with all endpoints:', error);
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
    
    // Log the raw response for debugging
    console.log('Raw response from getBatchCalculationResults:', response.data);
    
    // Handle different response formats
    // 1. Direct array response
    if (Array.isArray(response.data)) {
      return response.data;
    }
    // 2. Nested in data property
    else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    // 3. Empty or unexpected format
    else {
      console.warn('Unexpected response format from getBatchCalculationResults:', response.data);
      return [];
    }
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
  // Try different endpoint patterns to handle potential routing mismatches
  const endpointsToTry = [
    `${API_BASE_URL}/api/batch-calculations/results/${resultId}`,
    `${API_BASE_URL}/api/v1/batch-calculations/results/${resultId}`,
    `${API_BASE_URL}/api/v1/batch_calculations/results/${resultId}`
  ];
  
  // Try each endpoint until one succeeds
  for (const endpoint of endpointsToTry) {
    try {
      console.log('Trying to fetch batch calculation result from:', endpoint);
      const response = await axios.get(endpoint);
      
      console.log('Batch calculation result response:', response.data);
      
      // Handle different response formats
      if (response.data && response.data.success !== undefined) {
        // First pass: Calculate bonuses for all employees without pool limit
        const employees: Employee[] = response.data.data;
        const parameters = response.data.parameters;
        const initialResults: EmployeeCalculationResult[] = employees.map((employee: Employee) => {
          try {
            const result = calculateBonus(
              employee.base_salary,
              parameters.targetBonusPct,
              parameters.investmentWeight,
              parameters.investmentScoreMultiplier,
              parameters.qualitativeWeight,
              parameters.qualScoreMultiplier,
              employee.raf || parameters.raf,
              employee.is_mrt,
              parameters.mrtCapPct
            );

            return {
              employee_id: employee.id,
              employee_name: employee.name,
              base_salary: employee.base_salary,
              raf: employee.raf || parameters.raf,
              is_mrt: employee.is_mrt,
              final_bonus: result.finalBonus,
              calculation_details: result
            };
          } catch (error) {
            console.error(`Error calculating bonus for employee ${employee.id}:`, error);
            return {
              employee_id: employee.id,
              employee_name: employee.name,
              base_salary: employee.base_salary,
              raf: employee.raf || parameters.raf,
              is_mrt: employee.is_mrt,
              final_bonus: 0,
              calculation_details: { error: error instanceof Error ? error.message : String(error) }
            };
          }
        });
        
        // Calculate total bonus pool from initial results
        const totalCalculatedBonuses = initialResults.reduce((sum: number, result: EmployeeCalculationResult) => sum + result.final_bonus, 0);
        
        // Second pass: Apply bonus pool limit if enabled
        const results = initialResults.map((initialResult: EmployeeCalculationResult) => {
          // If bonus pool limit is not enabled or the total is within the limit, return initial result
          if (!parameters.useBonusPoolLimit || !parameters.totalBonusPool || totalCalculatedBonuses <= parameters.totalBonusPool) {
            return initialResult;
          }
          
          try {
            // Recalculate with bonus pool limit
            const result = calculateBonus(
              initialResult.base_salary,
              parameters.targetBonusPct,
              parameters.investmentWeight,
              parameters.investmentScoreMultiplier,
              parameters.qualitativeWeight,
              parameters.qualScoreMultiplier,
              initialResult.raf,
              initialResult.is_mrt,
              parameters.mrtCapPct,
              parameters.useBonusPoolLimit,
              parameters.totalBonusPool,
              totalCalculatedBonuses
            );

            return {
              ...initialResult,
              final_bonus: result.finalBonus,
              calculation_details: result
            };
          } catch (error) {
            console.error(`Error applying bonus pool limit for employee ${initialResult.employee_id}:`, error);
            return initialResult;
          }
        });
        
        return {
          success: true,
          data: results
        };
      } else if (response.data && response.data.data) {
        // Nested data property
        return {
          success: true,
          data: response.data.data
        };
      } else {
        // Direct data format
        return {
          success: true,
          data: response.data
        };
      }
    } catch (error) {
      console.error(`Error fetching from ${endpoint}:`, error);
      // Continue to next endpoint
    }
  }
  
  // If all endpoints fail, return a default error response
  console.error('All batch calculation result endpoints failed');
  return {
    success: false,
    data: [],
    error: 'Failed to fetch batch calculation result from all endpoints'
  };
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
  
  // Try different endpoint patterns to handle potential routing mismatches
  const endpointsToTry = [
    `${API_BASE_URL}/api/batch-calculations/results/${resultId}/employees?${queryString}`,
    `${API_BASE_URL}/api/v1/batch-calculations/results/${resultId}/employees?${queryString}`,
    `${API_BASE_URL}/api/v1/batch/calculations/results/${resultId}/employees?${queryString}`
  ];
  
  // Try each endpoint until one succeeds
  for (const endpoint of endpointsToTry) {
    try {
      console.log('Trying to fetch employee results from:', endpoint);
      const response = await axios.get(endpoint);
      
      console.log('Employee results response:', response.data);
      
      // Handle different response formats
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else {
        console.warn('Unexpected response format from getEmployeeCalculationResults:', response.data);
        // Continue to next endpoint if response format is unexpected
        continue;
      }
    } catch (error) {
      console.error(`Error fetching from ${endpoint}:`, error);
      // Continue to next endpoint
    }
  }
  
  // If all endpoints fail, log the error and return an empty array
  console.error('All employee results endpoints failed, returning empty array');
  return [];
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

/**
 * Get the status of a batch upload
 * @param uploadId ID of the batch upload
 * @returns Promise with the batch upload status
 */
export const getBatchUploadStatus = async (uploadId: string) => {
  try {
    // The correct endpoint is /api/v1/batch/uploads/{upload_id}
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/batch/uploads/${uploadId}`
    );
    
    console.log('Batch upload status response:', response.data);
    return response.data.data || {};
  } catch (error) {
    console.error('Error fetching batch upload status:', error);
    // Return a default object to prevent errors in the UI
    return { status: 'unknown' };
  }
};
