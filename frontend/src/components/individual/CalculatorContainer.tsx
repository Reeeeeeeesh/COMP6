import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getBatchCalculationResult } from '../../services/batchCalculationService';
import { DataTransferService } from '../../services/individualCalculatorService';
import EmployeeSelector from './EmployeeSelector';
import IndividualCalculator from './IndividualCalculator';
import { BatchParameters } from '../batch/BatchParameterConfig';
import { NavigationBreadcrumb, BreadcrumbItem } from '../common/NavigationBreadcrumb';

// Define EmployeeData interface if not imported from types
interface EmployeeData {
  id?: string;
  employee_data?: {
    employee_id?: string;
    first_name?: string;
    last_name?: string;
    department?: string;
    title?: string;
    base_salary?: number;
    target_bonus_pct?: number;
    investment_score?: number;
    qualitative_score?: number;
    raf?: number;
    is_mrt?: boolean;
  };
  batch_result_id?: string;
  calculation_result?: any;
}

interface CalculatorContainerProps {
  // Optional props for future extensibility
}

export const CalculatorContainer: React.FC<CalculatorContainerProps> = () => {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract employee ID and uploadId from query string if present
  const queryParams = new URLSearchParams(location.search);
  const employeeId = queryParams.get('employee');
  const uploadId = queryParams.get('uploadId');
  
  // Store the batch result data and parameters
  const [batchResultData, setBatchResultData] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(null);
  const [parameters, setParameters] = useState<BatchParameters | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch batch result data when component mounts
  useEffect(() => {
    const fetchBatchResult = async () => {
      if (!resultId) {
        setError('No batch result ID provided');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const result = await getBatchCalculationResult(resultId);
        console.log('Batch result response in component:', result);
        
        if (result && result.success) {
          // If result is successful and has data
          if (result.data) {
            setBatchResultData(result.data);
            // Extract parameters from batch result
            if (result.data.parameters) {
              setParameters(result.data.parameters);
            }
          } else {
            setError('No data found in batch result');
          }
        } else {
          // Handle error response
          setError(result?.error || 'Failed to fetch batch result');
        }
      } catch (err: any) {
        console.error('Error fetching batch result:', err);
        setError(err.message || 'An error occurred while fetching batch result');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBatchResult();
  }, [resultId]);
  
  // Fetch and select employee if employeeId is provided in URL
  useEffect(() => {
    const fetchEmployeeById = async () => {
      if (!resultId || !employeeId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // First get all employees for this batch result
        const employeesResult = await DataTransferService.getEmployeesFromBatchResult(resultId);
        
        if (employeesResult.success && employeesResult.data) {
          // Find the employee with the matching ID
          const employee = employeesResult.data.find((emp: EmployeeData) => emp.id === employeeId);
          
          if (employee) {
            // Select this employee
            await handleEmployeeSelect(employee);
          }
        }
      } catch (err: any) {
        console.error('Error fetching employee by ID:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmployeeById();
  }, [resultId, employeeId]);
  
  // Handle employee selection
  const handleEmployeeSelect = async (employee: EmployeeData) => {
    if (!employee) {
      setError('Invalid employee data');
      return;
    }

    try {
      // Set loading state and clear any previous errors
      setLoading(true);
      setError(null);
      
      // Create a copy of the employee data to avoid reference issues
      let employeeWithDetails = { ...employee };
      
      // Validate employee data has required fields
      if (!employeeWithDetails.employee_data?.employee_id) {
        console.warn('Employee data missing employee_id');
      }
      
      // Fetch detailed employee calculation result if employee ID is available
      if (employee.id) {
        // Employee calculation details are already included in the batch results data
        // No need to make additional API calls for individual employee details
        console.log('Using employee data from batch results, no additional API call needed');
      } else {
        console.warn('No employee ID available for fetching detailed results');
      }
      
      // Set the selected employee with whatever data we have
      setSelectedEmployee(employeeWithDetails);
      
      // Update URL to include employee ID for bookmarking/sharing
      if (resultId && employee.id) {
        const queryParams = new URLSearchParams();
        queryParams.set('employee', employee.id);
        if (uploadId) {
          queryParams.set('uploadId', uploadId);
        }
        navigate(`/calculator/${resultId}?${queryParams.toString()}`, { replace: true });
      }
      
      // Return success for chaining
      return true;
    } catch (err: any) {
      console.error('Error selecting employee:', err);
      setError(`Failed to select employee: ${err.message || 'Unknown error'}`);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Handle navigation back to batch results
  const handleBackToBatch = () => {
    if (uploadId && resultId) {
      navigate(`/batch/${uploadId}/results/${resultId}`);
    } else {
      navigate('/batch');
    }
  };
  
  // Handle clearing selected employee
  const handleClearSelection = () => {
    setSelectedEmployee(null);
  };
  
  // Build breadcrumb items dynamically based on context
  const buildBreadcrumbItems = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/' },
    ];

    if (uploadId) {
      items.push({ label: 'Batch Upload', path: '/batch' });
      if (resultId) {
        items.push({ 
          label: 'Batch Results', 
          onClick: handleBackToBatch 
        });
      }
    } else {
      items.push({ label: 'Batch Results', path: '/batch' });
    }

    items.push({ 
      label: selectedEmployee 
        ? `Calculator - ${selectedEmployee.employee_data?.first_name} ${selectedEmployee.employee_data?.last_name}` 
        : 'Individual Calculator', 
      isActive: true 
    });

    return items;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Navigation breadcrumbs */}
      <NavigationBreadcrumb 
        items={buildBreadcrumbItems()} 
        className="mb-6" 
      />
      
      {/* Main content */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Individual Compensation Calculator</h1>
          <p className="text-gray-600 mt-2">
            Calculate and adjust compensation for individual employees from batch results.
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Return to Home
            </button>
          </div>
        ) : (
          <div className="p-6">
            {selectedEmployee ? (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    Employee: {selectedEmployee.employee_data?.first_name} {selectedEmployee.employee_data?.last_name}
                  </h2>
                  <div className="flex items-center space-x-3">
                    {batchResultData && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Batch:</span> {batchResultData.name || batchResultData.id || 'Unknown'}
                      </div>
                    )}
                    <button
                      onClick={handleClearSelection}
                      className="px-3 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Select Different Employee
                    </button>
                  </div>
                </div>
                
                <IndividualCalculator 
                  employeeData={selectedEmployee}
                  initialParameters={parameters}
                  batchResultId={resultId || ''}
                  batchName={batchResultData?.name}
                />
              </div>
            ) : (
              <EmployeeSelector 
                batchResultId={resultId || ''}
                onEmployeeSelect={handleEmployeeSelect}
                batchName={batchResultData?.name}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalculatorContainer;
