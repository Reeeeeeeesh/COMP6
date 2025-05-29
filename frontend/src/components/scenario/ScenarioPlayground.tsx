import React, { useState, useCallback } from 'react';
import { DataSourceSelector } from './DataSourceSelector';
import { ScenarioParameterPanel } from './ScenarioParameterPanel';
import { ScenarioResultsPanel } from './ScenarioResultsPanel';
import { ScenarioManager } from './ScenarioManager';
import { ScenarioComparison } from './ScenarioComparison';
import { ScenarioVisualization } from './ScenarioVisualization';
import { ScenarioSummary } from './ScenarioSummary';
import { ScenarioExport } from './ScenarioExport';
import { IndividualCalculator } from '../individual/IndividualCalculator';
import { NavigationHeader } from '../common/NavigationHeader';
import { BatchParameters } from '../batch/BatchParameterConfig';
import { API_BASE_URL } from '../../config';
import { ScenarioData as SavedScenarioData } from '../../services/scenarioService';

interface BatchSource {
  id: string;
  filename: string;
  upload_date: string;
  employee_count: number;
  file_size: number;
  has_calculation_results: boolean;
}

interface EmployeeData {
  id: string;
  employee_data: {
    employee_id?: string;
    first_name?: string;
    last_name?: string;
    department?: string;
    position?: string;
    salary?: number;
    additional_data?: {
      investment_score?: string;
      qualitative_score?: string;
      raf?: string;
      is_mrt?: string;
      [key: string]: string | undefined;
    };
  };
  batch_upload_id: string;
  calculation_result?: any;
}

interface ScenarioData {
  id: string;
  source_batch_id: string;
  source_type: string;
  scenario_name: string;
  employee_count: number;
  created_from?: {
    batch_filename: string;
    upload_date: string;
    total_employees: number;
  };
  parameters: BatchParameters;
  employees?: EmployeeData[];
  session_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface ScenarioPlaygroundProps {
  sessionId: string;
  onError?: (error: string) => void;
}

export const ScenarioPlayground: React.FC<ScenarioPlaygroundProps> = ({
  sessionId,
  onError
}) => {
  const [currentStep, setCurrentStep] = useState<'select-source' | 'loading-scenario' | 'playground' | 'manage-scenarios' | 'compare-scenarios'>('select-source');
  const [activeTab, setActiveTab] = useState<'parameters' | 'visualizations' | 'summary' | 'export'>('parameters');
  const [selectedSource, setSelectedSource] = useState<{ type: 'batch', id: string, data: BatchSource } | null>(null);
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(null);
  const [currentParameters, setCurrentParameters] = useState<BatchParameters | null>(null);
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<any>(null);
  const [originalSummary, setOriginalSummary] = useState<any>(null);
  const [calculationTime, setCalculationTime] = useState<number>(0);

  // Handle source selection from DataSourceSelector
  const handleSourceSelect = useCallback(async (source: { type: 'batch', id: string, data: BatchSource }) => {
    try {
      setCurrentStep('loading-scenario');
      setSelectedSource(source);
      setError(null);
      setLoading(true);

      console.log('Creating scenario from batch:', source.id);
      
      // Create JSON payload for the request
      const requestData = {
        batch_upload_id: source.id,
        scenario_name: `Scenario from ${source.data.filename}`
      };
      
      const response = await fetch(`${API_BASE_URL}/api/v1/scenarios/from-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        let errorMessage = `Failed to create scenario: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch (e) {
          // If we can't parse the error response as JSON, use the status text
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Scenario creation result:', result);

      if (result.success) {
        const scenario = result.data as any; // Backend response has different structure
        
        // Ensure created_from is properly populated
        const baseScenario: ScenarioData = {
          id: scenario.id,
          source_batch_id: scenario.source_batch_id,
          source_type: 'batch',
          scenario_name: scenario.name || `Scenario from ${source.data.filename}`,
          employee_count: scenario.employee_count,
          parameters: scenario.parameters,
          session_id: scenario.session_id,
          created_at: scenario.created_at,
          updated_at: scenario.updated_at,
          created_from: scenario.created_from || {
            batch_filename: source.data.filename,
            upload_date: source.data.upload_date,
            total_employees: source.data.employee_count
          }
        };
        
        // Fetch employee data from the source batch
        const employeesResponse = await fetch(`${API_BASE_URL}/api/v1/batch/uploads/${scenario.source_batch_id}/data?page=1&page_size=500`);
        
        console.log('Employee fetch response status:', employeesResponse.status);
        console.log('Employee fetch URL:', `${API_BASE_URL}/api/v1/batch/uploads/${scenario.source_batch_id}/data?page=1&page_size=500`);
        
        if (!employeesResponse.ok) {
          console.error('Employee fetch failed with status:', employeesResponse.status);
          const errorText = await employeesResponse.text();
          console.error('Employee fetch error response:', errorText);
          
          // Still try to continue without employee data
          const fallbackScenario: ScenarioData = {
            ...baseScenario,
            employees: []
          };
          setScenarioData(fallbackScenario);
          setCurrentParameters(fallbackScenario.parameters);
          setCurrentStep('playground');
          return;
        }
        
        const employeesResult = await employeesResponse.json();
        console.log('Employee fetch result:', employeesResult);
        
        if (employeesResult.success) {
          // Transform employee data to match expected structure
          const transformedEmployees: EmployeeData[] = (employeesResult.data.employees || []).map((emp: any) => ({
            id: emp.id,
            employee_data: {
              employee_id: emp.employee_id,
              first_name: emp.first_name,
              last_name: emp.last_name,
              department: emp.department,
              position: emp.position,
              salary: emp.salary,
              additional_data: emp.additional_data
            },
            batch_upload_id: emp.batch_upload_id,
            calculation_result: emp.calculation_result
          }));

          // Combine scenario data with transformed employee data
          const completeScenario: ScenarioData = {
            ...baseScenario,
            employees: transformedEmployees
          };
          
          console.log('Complete scenario with employees:', completeScenario);
          console.log('Employee count:', completeScenario.employees?.length || 0);
          
          // Debug: Log the structure of the first employee to understand the data format
          if (completeScenario.employees && completeScenario.employees.length > 0) {
            console.log('First transformed employee structure:', JSON.stringify(completeScenario.employees[0], null, 2));
            console.log('Employee data keys:', Object.keys(completeScenario.employees[0]));
            if (completeScenario.employees[0].employee_data) {
              console.log('Employee_data keys:', Object.keys(completeScenario.employees[0].employee_data));
            } else {
              console.log('employee_data is undefined or null');
            }
          }
          
          setScenarioData(completeScenario);
          setCurrentParameters(completeScenario.parameters);
          
          // Select first employee by default
          if (completeScenario.employees && completeScenario.employees.length > 0) {
            setSelectedEmployee(completeScenario.employees[0]);
            console.log('Selected first employee:', completeScenario.employees[0]);
          } else {
            console.log('No employees found or employees array is empty');
          }
        } else {
          // Fallback: create scenario without employee data for now
          console.log('Failed to fetch employees, using fallback:', employeesResult);
          const fallbackScenario: ScenarioData = {
            ...baseScenario,
            employees: []
          };
          setScenarioData(fallbackScenario);
          setCurrentParameters(fallbackScenario.parameters);
        }
        
        setCurrentStep('playground');
      } else {
        throw new Error(result.error || 'Failed to create scenario');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create scenario';
      console.error('Error creating scenario:', err);
      setError(errorMessage);
      onError?.(errorMessage);
      setCurrentStep('select-source');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Handle parameter changes with recalculation state
  const handleParameterChange = useCallback((newParameters: BatchParameters) => {
    setIsRecalculating(true);
    setCurrentParameters(newParameters);
    
    // Reset recalculating state after a brief delay to allow the results panel to finish
    setTimeout(() => {
      setIsRecalculating(false);
    }, 100);
  }, []);

  // Handle employee selection
  const handleEmployeeSelect = useCallback((employee: EmployeeData) => {
    setSelectedEmployee(employee);
  }, []);

  // Reset to source selection
  const handleReset = useCallback(() => {
    setCurrentStep('select-source');
    setSelectedSource(null);
    setScenarioData(null);
    setSelectedEmployee(null);
    setCurrentParameters(null);
    setError(null);
  }, []);

  // Error handling
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  // Handle loading a saved scenario
  const handleLoadScenario = useCallback(async (savedScenario: SavedScenarioData) => {
    try {
      setError(null);
      
      // Transform employees if they exist and need transformation
      let transformedEmployees: EmployeeData[] = [];
      if (savedScenario.employees && savedScenario.employees.length > 0) {
        transformedEmployees = savedScenario.employees.map((emp: any) => {
          // Check if already in correct format
          if (emp.employee_data) {
            return emp as EmployeeData;
          }
          // Transform flat structure to nested
          return {
            id: emp.id,
            employee_data: {
              employee_id: emp.employee_id,
              first_name: emp.first_name,
              last_name: emp.last_name,
              department: emp.department,
              position: emp.position,
              salary: emp.salary,
              additional_data: emp.additional_data
            },
            batch_upload_id: emp.batch_upload_id,
            calculation_result: emp.calculation_result
          } as EmployeeData;
        });
      }
      
      // Convert the saved scenario data to the expected format
      const convertedScenario: ScenarioData = {
        id: savedScenario.id,
        source_batch_id: savedScenario.source_batch_id || savedScenario.id,
        source_type: 'saved_scenario',
        scenario_name: savedScenario.name,
        employee_count: savedScenario.employee_count || 0,
        created_from: savedScenario.created_from || {
          batch_filename: savedScenario.name,
          upload_date: savedScenario.created_at,
          total_employees: savedScenario.employee_count || 0
        },
        parameters: savedScenario.parameters as BatchParameters,
        employees: transformedEmployees,
        session_id: savedScenario.session_id,
        created_at: savedScenario.created_at,
        updated_at: savedScenario.updated_at
      };
      
      setScenarioData(convertedScenario);
      setCurrentParameters(savedScenario.parameters as BatchParameters);
      
      // If we have employees, select the first one
      if (convertedScenario.employees && convertedScenario.employees.length > 0) {
        setSelectedEmployee(convertedScenario.employees[0]);
      }
      
      setCurrentStep('playground');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load scenario';
      console.error('Error loading scenario:', err);
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [onError]);

  // Handle saving the current scenario
  const handleSaveComplete = useCallback((savedScenario: SavedScenarioData) => {
    // Update the current scenario data with the saved scenario info
    if (scenarioData) {
      setScenarioData({
        ...scenarioData,
        id: savedScenario.id,
        scenario_name: savedScenario.name,
        session_id: savedScenario.session_id,
        created_at: savedScenario.created_at,
        updated_at: savedScenario.updated_at
      });
    }
  }, [scenarioData]);

  // Navigate to scenario management
  const handleManageScenarios = useCallback(() => {
    setCurrentStep('manage-scenarios');
  }, []);

  // Navigate to scenario comparison
  const handleCompareScenarios = useCallback(() => {
    setCurrentStep('compare-scenarios');
  }, []);

  // Return to playground from scenario management or comparison
  const handleBackToPlayground = useCallback(() => {
    if (scenarioData) {
      setCurrentStep('playground');
    } else {
      setCurrentStep('select-source');
    }
  }, [scenarioData]);

  // Handle summary data updates from ScenarioResultsPanel
  const handleSummaryUpdate = useCallback((current: any, original: any, calcTime: number) => {
    console.log('=== SUMMARY UPDATE DEBUG ===');
    console.log('Current summary data:', JSON.stringify(current, null, 2));
    console.log('Current summary keys:', current ? Object.keys(current) : 'null');
    console.log('Original summary data:', JSON.stringify(original, null, 2));
    console.log('Calculation time:', calcTime);
    console.log('=== END SUMMARY DEBUG ===');
    
    setCurrentSummary(current);
    setOriginalSummary(original);
    setCalculationTime(calcTime);
  }, []);

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'select-source':
        return (
          <div className="space-y-6">
            {/* Navigation between data sources and saved scenarios */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Create or Load Scenario</h2>
                <div className="flex space-x-3">
                  <button
                    onClick={handleManageScenarios}
                    className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                  >
                    Manage Saved Scenarios
                  </button>
                </div>
              </div>
              <p className="text-gray-600 mt-2">
                Choose a data source to create a new scenario or manage your saved scenarios.
              </p>
            </div>
            <DataSourceSelector
              sessionId={sessionId}
              onSourceSelect={handleSourceSelect}
              onError={handleError}
            />
          </div>
        );

      case 'manage-scenarios':
        return (
          <div className="space-y-6">
            {/* Navigation header for scenario management */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Saved Scenarios</h2>
                  <p className="text-gray-600 mt-2">
                    Load existing scenarios or save your current parameter configuration.
                  </p>
                </div>
                <button
                  onClick={handleBackToPlayground}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  {scenarioData ? 'Back to Playground' : 'Back to Data Sources'}
                </button>
              </div>
            </div>
            <ScenarioManager
              sessionId={sessionId}
              currentParameters={currentParameters || undefined}
              onLoadScenario={handleLoadScenario}
              onSaveComplete={handleSaveComplete}
              onCompareScenarios={handleCompareScenarios}
            />
          </div>
        );

      case 'loading-scenario':
        return (
          <div className="p-6 border rounded-lg bg-white shadow">
            <h2 className="text-xl font-bold mb-4">Creating Scenario</h2>
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-700 font-medium">
                Loading {selectedSource?.data.employee_count.toLocaleString()} employees into scenario...
              </span>
            </div>
          </div>
        );

      case 'playground':
        if (!scenarioData || !currentParameters) {
          return (
            <div className="p-6 border rounded-lg bg-white shadow">
              <h2 className="text-xl font-bold mb-4">Error</h2>
              <p className="text-red-600">Scenario data is incomplete. Please try again.</p>
              <button
                onClick={handleReset}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Start Over
              </button>
            </div>
          );
        }

        // Only require selectedEmployee if there are employees
        const hasEmployees = scenarioData.employees && scenarioData.employees.length > 0;
        if (hasEmployees && !selectedEmployee) {
          return (
            <div className="p-6 border rounded-lg bg-white shadow">
              <h2 className="text-xl font-bold mb-4">Loading Employees</h2>
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-700 font-medium">
                  Loading employee data...
                </span>
              </div>
            </div>
          );
        }

        // Tab configuration
        const tabs = [
          { id: 'parameters', label: 'Parameters & Analysis', icon: '⚙️' },
          { id: 'visualizations', label: 'Visualizations', icon: '📊' },
          { id: 'summary', label: 'Enhanced Summary', icon: '📋' },
          { id: 'export', label: 'Export & Reports', icon: '📤' }
        ];

        return (
          <div className="space-y-6">
            {/* Scenario Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">Scenario Playground</h1>
                  <p className="text-gray-600">{scenarioData.scenario_name || 'Unnamed Scenario'}</p>
                  <div className="mt-2 text-sm text-gray-500">
                    <span>Source: {scenarioData.created_from?.batch_filename || 'Unknown'}</span>
                    <span className="mx-2">•</span>
                    <span>{scenarioData.employee_count?.toLocaleString() || '0'} employees</span>
                    <span className="mx-2">•</span>
                    <span>Created from batch uploaded {scenarioData.created_from?.upload_date ? new Date(scenarioData.created_from.upload_date).toLocaleDateString() : 'Unknown date'}</span>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleManageScenarios}
                    className="px-4 py-2 text-green-600 border border-green-600 rounded hover:bg-green-50 transition-colors"
                  >
                    Manage Scenarios
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                  >
                    New Scenario
                  </button>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'parameters' && (
                  <div className="space-y-6">
                    {/* Global Parameter Adjustment Panel */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-800">Parameter Configuration</h3>
                      <ScenarioParameterPanel
                        initialParameters={scenarioData.parameters}
                        onChange={handleParameterChange}
                        employeeCount={scenarioData.employee_count}
                      />
                    </div>

                    {/* Impact Assessment and Summary Statistics */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-800">Impact Assessment</h3>
                      <ScenarioResultsPanel
                        employees={scenarioData.employees || []}
                        currentParameters={currentParameters}
                        originalParameters={scenarioData.parameters}
                        isCalculating={isRecalculating}
                        onSummaryUpdate={handleSummaryUpdate}
                      />
                    </div>

                    {/* Employee Selector */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-800">Employee Details</h3>
                      <p className="text-gray-600 mb-4">
                        Choose an employee to see detailed calculation breakdown with current parameters.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                        {(scenarioData.employees || []).map((employee) => {
                          // Add defensive checks for employee data structure
                          const employeeData = employee.employee_data || {};
                          const firstName = employeeData.first_name || '';
                          const lastName = employeeData.last_name || '';
                          const employeeId = employeeData.employee_id || employee.id || 'N/A';
                          const department = employeeData.department || 'N/A';
                          const position = employeeData.position || 'N/A';
                          const salary = employeeData.salary || 0;

                          return (
                            <div
                              key={employee.id}
                              className={`p-3 border rounded cursor-pointer transition-colors ${
                                selectedEmployee?.id === employee.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              onClick={() => handleEmployeeSelect(employee)}
                            >
                              <div className="font-medium text-gray-800">
                                {firstName} {lastName}
                              </div>
                              <div className="text-sm text-gray-600">
                                ID: {employeeId}
                              </div>
                              <div className="text-sm text-gray-600">
                                {department} • {position}
                              </div>
                              <div className="text-sm font-medium text-gray-700">
                                £{salary.toLocaleString()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Individual Calculator for Selected Employee */}
                    {selectedEmployee && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">
                          Detailed Calculation: {selectedEmployee.employee_data?.first_name || ''} {selectedEmployee.employee_data?.last_name || ''}
                        </h3>
                        <p className="text-gray-600 mb-4">
                          This shows the detailed calculation breakdown for the selected employee using current parameters.
                        </p>
                        <IndividualCalculator
                          employeeData={selectedEmployee}
                          initialParameters={currentParameters}
                          batchResultId={scenarioData.source_batch_id}
                          batchName={scenarioData.scenario_name}
                        />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'visualizations' && currentSummary && (
                  <ScenarioVisualization
                    scenarioResults={currentSummary}
                    title={`${scenarioData.scenario_name} - Visualizations`}
                  />
                )}

                {activeTab === 'summary' && currentSummary && (
                  <ScenarioSummary
                    currentSummary={currentSummary}
                    originalSummary={originalSummary}
                    title={`${scenarioData.scenario_name} - Enhanced Summary`}
                    showComparison={!!originalSummary}
                    calculationTime={calculationTime}
                  />
                )}

                {activeTab === 'export' && currentSummary && (
                  <ScenarioExport
                    scenarioName={scenarioData.scenario_name}
                    employees={scenarioData.employees || []}
                    currentSummary={currentSummary}
                    originalSummary={originalSummary}
                    currentParameters={currentParameters}
                    originalParameters={scenarioData.parameters}
                    onExportComplete={(format, filename) => {
                      console.log(`Exported ${format}: ${filename}`);
                      // Could add toast notification here
                    }}
                  />
                )}

                {/* Show loading state for visualization tabs */}
                {(activeTab === 'visualizations' || activeTab === 'summary' || activeTab === 'export') && !currentSummary && (
                  <div className="flex items-center justify-center p-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-600">Calculating scenario data...</p>
                      <p className="text-sm text-gray-500 mt-2">Please wait while we process the calculations</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'compare-scenarios':
        return (
          <div className="space-y-6">
            {/* Scenario Comparison Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Compare Scenarios</h2>
                  <p className="text-gray-600 mt-2">
                    Compare multiple scenarios side by side to analyze parameter differences and impact.
                  </p>
                </div>
                <button
                  onClick={handleBackToPlayground}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Back to Playground
                </button>
              </div>
            </div>
            <ScenarioComparison
              sessionId={sessionId}
              onError={handleError}
              onBack={handleBackToPlayground}
            />
          </div>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div>
      <NavigationHeader title="Scenario Playground" />
      <div className="container mx-auto px-4 py-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {renderCurrentStep()}
      </div>
    </div>
  );
}; 