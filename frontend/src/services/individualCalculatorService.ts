import { API_BASE_URL as BASE_URL } from '../config';
import { EmployeeData } from '../types/employeeTypes';

// Define API response interface
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Data Transfer Service for Individual Calculator
 * Handles the transfer of employee data from batch results to individual calculator
 */
export class DataTransferService {
  /**
   * Get employees from a batch calculation result with proper API path handling
   * 
   * @param batchResultId ID of the batch calculation result
   * @returns Promise with employee data
   */
  static async getEmployeesFromBatchResult(batchResultId: string): Promise<ApiResponse<EmployeeData[]>> {
    if (!batchResultId) {
      console.error('Invalid batch result ID provided');
      return {
        success: false,
        message: 'Invalid batch result ID provided'
      };
    }

    // Use the correct API paths based on backend router configuration
    const endpointsToTry = [
      `${BASE_URL}/api/v1/batch-calculations/results/${batchResultId}/employees`,
      `${BASE_URL}/api/batch-calculations/results/${batchResultId}/employees`
    ];
    
    let lastError = null;
    
    for (const endpoint of endpointsToTry) {
      try {
        console.log('Fetching employees from batch result:', endpoint);
        
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'No error details available');
          lastError = `${response.status} ${response.statusText}: ${errorText}`;
          console.warn(`Endpoint ${endpoint} failed: ${lastError}`);
          continue; // Try next endpoint
        }
        
        const data = await response.json();
        
        // Process and validate the employee data
        let employeeData: EmployeeData[] = [];
        
        // Handle array response (most likely format from backend)
        if (Array.isArray(data)) {
          employeeData = this.processEmployeeData(data);
          console.log(`Successfully fetched ${employeeData.length} employees from ${endpoint}`);
        } else {
          console.warn(`Unexpected response format from ${endpoint}`, data);
          employeeData = [];
        }
        
        // Return the processed data
        return {
          success: true,
          data: employeeData
        };
      } catch (error: any) {
        lastError = error.message || 'Unknown error';
        console.error(`Error fetching from ${endpoint}:`, error);
        // Continue to next endpoint
      }
    }
    
    // If all endpoints fail, return error with the last error message
    console.error('All employee data endpoints failed. Last error:', lastError);
    return {
      success: false,
      message: `Failed to fetch employee data: ${lastError || 'Unknown error'}`
    };
  }

  /**
   * Process and validate employee data to ensure compatibility with the individual calculator
   * 
   * @param data Raw employee data from API
   * @returns Processed and validated employee data
   */
  static processEmployeeData(data: any[]): EmployeeData[] {
    if (!Array.isArray(data)) {
      console.warn('Expected array of employee data but received:', typeof data);
      return [];
    }
    
    return data.map((employee, index) => {
      // Create a standardized employee object based on EmployeeCalculationResult structure
      const processedEmployee: EmployeeData = {
        id: employee.id || `emp-result-${index}`,
                 employee_data: {
           employee_id: employee.employee_data?.employee_id || '',
           first_name: employee.employee_data?.first_name || '',
           last_name: employee.employee_data?.last_name || '',
           department: employee.employee_data?.department || '',
           position: employee.employee_data?.position || '',
           salary: employee.base_salary || employee.employee_data?.salary || 0
         },
        batch_result_id: employee.batch_result_id || '',
        calculation_result: {
          bonus_amount: employee.bonus_amount || 0,
          bonus_percentage: employee.bonus_percentage || 0,
          total_compensation: employee.total_compensation || 0,
          calculation_breakdown: employee.calculation_breakdown || null,
          calculated_at: employee.calculated_at || new Date().toISOString()
        }
      };
      
      return processedEmployee;
    }).filter(employee => {
      // Filter out invalid employees
      const isValid = !!employee.employee_data?.employee_id;
      if (!isValid) {
        console.warn('Filtered out invalid employee data:', employee);
      }
      return isValid;
    });
  }

  /**
   * Transfer employee data from batch result to individual calculator
   * This method handles the complete data transfer flow with validation and error handling
   * 
   * @param batchResultId ID of the batch calculation result
   * @param employeeId Optional specific employee ID to transfer
   * @returns Promise with transfer result
   */
  static async transferEmployeeData(batchResultId: string, employeeId?: string): Promise<ApiResponse<EmployeeData | EmployeeData[]>> {
    try {
      // Get all employees from batch result
      const result = await this.getEmployeesFromBatchResult(batchResultId);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          message: result.message || 'Failed to fetch employee data for transfer'
        };
      }

      // If specific employee ID is requested, find and return that employee
      if (employeeId) {
        const employee = result.data.find((emp: EmployeeData) => emp.id === employeeId);
        
        if (!employee) {
          return {
            success: false,
            message: `Employee with ID ${employeeId} not found in batch result`
          };
        }

        // Validate employee data integrity
        const validationResult = this.validateEmployeeDataIntegrity(employee);
        if (!validationResult.isValid) {
          return {
            success: false,
            message: `Employee data validation failed: ${validationResult.errors.join(', ')}`
          };
        }

        return {
          success: true,
          data: employee,
          message: 'Employee data transferred successfully'
        };
      }

      // Return all employees
      return {
        success: true,
        data: result.data,
        message: `${result.data.length} employees transferred successfully`
      };
    } catch (error: any) {
      console.error('Error in data transfer:', error);
      return {
        success: false,
        message: `Data transfer failed: ${error.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Validate employee data integrity for individual calculator
   * 
   * @param employee Employee data to validate
   * @returns Validation result with errors
   */
  static validateEmployeeDataIntegrity(employee: EmployeeData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!employee.employee_data?.employee_id) {
      errors.push('Missing employee ID');
    }

    if (!employee.employee_data?.first_name && !employee.employee_data?.last_name) {
      errors.push('Missing employee name');
    }

         if (employee.employee_data?.salary === undefined || employee.employee_data.salary <= 0) {
       errors.push('Invalid salary');
     }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Legacy exports for backward compatibility
export const getEmployeesFromBatchResult = DataTransferService.getEmployeesFromBatchResult.bind(DataTransferService);

/**
 * Get detailed calculation result for a specific employee
 * 
 * @param employeeResultId ID of the employee calculation result
 * @returns Promise with detailed calculation result
 */
export const getEmployeeCalculationResult = async (_employeeResultId: string): Promise<ApiResponse> => {
  // This endpoint doesn't exist in current backend - employee details are included in the batch results
  // For now, return a placeholder response
  console.warn('getEmployeeCalculationResult called but endpoint not available in current backend');
  return {
    success: false,
    message: 'Employee calculation details are included in batch results'
  };
};

/**
 * Calculate bonus for an individual employee with custom parameters
 * 
 * @param employeeId ID of the employee
 * @param parameters Calculation parameters
 * @returns Promise with calculation result
 */
export const calculateIndividualBonus = async (_employeeId: string, _parameters: any): Promise<ApiResponse> => {
  // These endpoints don't exist in current backend - individual calculations are handled in frontend
  console.warn('calculateIndividualBonus called but endpoint not available in current backend');
  return {
    success: false,
    message: 'Individual calculations are handled in frontend calculation engine'
  };
};

/**
 * Save individual calculation result
 * 
 * @param employeeId ID of the employee
 * @param calculationResult Calculation result to save
 * @param parameters Parameters used for calculation
 * @returns Promise with save result
 */
export const saveCalculationResults = async (
  _employeeId: string,
  _calculationResult: any,
  _parameters: any
): Promise<ApiResponse> => {
  // This endpoint doesn't exist in current backend - saving is not implemented yet
  console.warn('saveIndividualCalculation called but endpoint not available in current backend');
  return {
    success: false,
    message: 'Individual calculation saving not implemented in current backend'
  };
};
