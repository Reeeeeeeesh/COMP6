import React, { useState, useEffect } from 'react';
import { BatchParameters } from '../batch/BatchParameterConfig';
import { calculateBonus } from '../../utils/calculationEngine';

// Define types locally if not imported from types
interface EmployeeData {
  id?: string;
  employee_data?: {
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
  batch_result_id?: string;
  calculation_result?: any;
}

interface CalculationResult {
  baseSalary?: number;
  targetBonus?: number;
  investmentComponent?: number;
  qualitativeComponent?: number;
  combinedScore?: number;
  rafApplied?: number;
  finalBonus?: number;
  cappingApplied?: boolean;
  cappingReason?: string;
}

interface IndividualCalculatorProps {
  employeeData: EmployeeData;
  initialParameters: BatchParameters | null;
  batchResultId: string;
  batchName?: string; // Optional batch name for display purposes
}

export const IndividualCalculator: React.FC<IndividualCalculatorProps> = ({
  employeeData,
  initialParameters,
  batchResultId,
  batchName
}) => {
  // Ensure default parameters are valid
  const defaultParameters: BatchParameters = {
    targetBonusPct: 0.15,
    investmentWeight: 0.6,
    qualitativeWeight: 0.4,
    investmentScoreMultiplier: 1.0,
    qualScoreMultiplier: 1.0,
    raf: 1.0,
    rafSensitivity: 0.2,
    rafLowerClamp: 0,
    rafUpperClamp: 1.5,
    mrtCapPct: 2.0,
    useDirectRaf: true,
    baseSalaryCapMultiplier: 3.0
  };
  
  // Validate and fix initial parameters if needed
  const validatedInitialParams = initialParameters ? {
    ...initialParameters,
    // Ensure investment weight is between 0 and 1
    investmentWeight: Math.max(0, Math.min(1, initialParameters.investmentWeight || 0.6)),
    // Ensure qualitative weight is between 0 and 1 and weights sum to 1
    qualitativeWeight: initialParameters.investmentWeight !== undefined ? 
      Math.max(0, Math.min(1, 1 - initialParameters.investmentWeight)) : 0.4
  } : defaultParameters;
  
  const [parameters, setParameters] = useState<BatchParameters>(validatedInitialParams);
  
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Array<{type: 'warning' | 'info' | 'error', message: string}>>([]);
  
  // Initialize with existing calculation result if available
  useEffect(() => {
    // Reset calculation result when employee data changes
    setCalculationResult(null);
    setError(null);
    
    if (employeeData.calculation_result) {
      // Use existing calculation result if available
      setCalculationResult(employeeData.calculation_result);
    } else {
      // Trigger initial calculation with a slight delay to ensure component is mounted
      setTimeout(() => {
        handleCalculate();
      }, 100);
    }
  }, [employeeData]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Use batchResultId and batchName for tracking and display purposes
  useEffect(() => {
    if (batchResultId) {
      console.log(`Calculator initialized with batch result ID: ${batchResultId}`);
      // This could be used for API calls or tracking in the future
    }
  }, [batchResultId]);
  
  // Handle parameter change
  const handleParameterChange = (field: keyof BatchParameters, value: number | boolean) => {
    setParameters(prev => {
      const newParams = { ...prev };
      
      // Handle numeric values with constraints
      if (typeof value === 'number') {
        if (field === 'investmentWeight') {
          // Constrain investment weight between 0 and 1
          const constrainedValue = Math.max(0, Math.min(1, value));
          newParams.investmentWeight = constrainedValue;
          // Adjust qualitative weight to maintain sum of 1
          newParams.qualitativeWeight = 1 - constrainedValue;
        } else if (field === 'qualitativeWeight') {
          // Constrain qualitative weight between 0 and 1
          const constrainedValue = Math.max(0, Math.min(1, value));
          newParams.qualitativeWeight = constrainedValue;
          // Adjust investment weight to maintain sum of 1
          newParams.investmentWeight = 1 - constrainedValue;
        } else {
          // For other numeric fields, just set the value as a number
          (newParams as any)[field] = value;
        }
      } else {
        // For boolean fields, set as boolean
        (newParams as any)[field] = value;
      }
      
      return newParams;
    });
  };
  
  // Real-time calculation when parameters change
  useEffect(() => {
    // Add a slight delay to avoid excessive calculations during rapid parameter changes
    const timeoutId = setTimeout(() => {
      handleCalculate();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [parameters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate alerts based on calculation results
  const generateAlerts = (result: any, _inputs: any) => {
    const newAlerts: Array<{type: 'warning' | 'info' | 'error', message: string}> = [];
    
    if (result.cappingApplied) {
      if (result.cappingReason?.includes('MRT')) {
        newAlerts.push({
          type: 'warning',
          message: 'MRT regulatory cap has been applied - bonus reduced to comply with regulations'
        });
      } else if (result.cappingReason?.includes('salary')) {
        newAlerts.push({
          type: 'warning',
          message: 'General salary cap applied - bonus exceeds maximum allowed multiple of base salary'
        });
      }
    }
    
    // High bonus percentage warning
    const bonusPercentage = (result.finalBonus / result.baseSalary) * 100;
    if (bonusPercentage > 150) {
      newAlerts.push({
        type: 'info',
        message: `High bonus ratio: ${bonusPercentage.toFixed(0)}% of base salary`
      });
    }
    
    // Low performance warning
    if (result.combinedScore < 0.8) {
      newAlerts.push({
        type: 'info',
        message: 'Below-target performance detected - bonus reduced accordingly'
      });
    }
    
    // High performance recognition
    if (result.combinedScore > 1.5) {
      newAlerts.push({
        type: 'info',
        message: 'Exceptional performance - bonus increased significantly'
      });
    }
    
    // RAF impact alert
    if (result.rafApplied < 0.8) {
      newAlerts.push({
        type: 'warning',
        message: 'Significant RAF reduction applied due to company/team performance'
      });
    } else if (result.rafApplied > 1.2) {
      newAlerts.push({
        type: 'info',
        message: 'RAF boost applied due to strong company/team performance'
      });
    }
    
    setAlerts(newAlerts);
  };

  // Export calculation results to CSV
  const exportToCSV = () => {
    if (!calculationResult || !employeeData.employee_data) return;
    
    const csvContent = [
      ['Field', 'Value'],
      ['Employee ID', employeeData.employee_data.employee_id || ''],
      ['Employee Name', `${employeeData.employee_data.first_name || ''} ${employeeData.employee_data.last_name || ''}`],
      ['Department', employeeData.employee_data.department || ''],
      ['Position', employeeData.employee_data.position || ''],
      ['Base Salary', `£${calculationResult.baseSalary?.toLocaleString() || '0'}`],
      ['Target Bonus %', `${((parameters.targetBonusPct || 0.15) * 100).toFixed(1)}%`],
      ['Target Bonus Amount', `£${calculationResult.targetBonus?.toLocaleString() || '0'}`],
      ['Investment Weight', `${((parameters.investmentWeight || 0.6) * 100).toFixed(1)}%`],
      ['Qualitative Weight', `${((parameters.qualitativeWeight || 0.4) * 100).toFixed(1)}%`],
      ['Investment Component', `£${calculationResult.investmentComponent?.toLocaleString() || '0'}`],
      ['Qualitative Component', `£${calculationResult.qualitativeComponent?.toLocaleString() || '0'}`],
      ['Combined Performance Score', calculationResult.combinedScore?.toFixed(3) || '0'],
      ['RAF', `${parameters.raf || 1.0}`],
      ['Capping Applied', calculationResult.cappingApplied ? 'Yes' : 'No'],
      ['Capping Reason', calculationResult.cappingReason || 'N/A'],
      ['FINAL BONUS', `£${calculationResult.finalBonus?.toLocaleString() || '0'}`],
      ['Bonus as % of Salary', `${calculationResult.finalBonus && calculationResult.baseSalary ? 
        ((calculationResult.finalBonus / calculationResult.baseSalary) * 100).toFixed(1) : '0.0'}%`],
      ['Calculation Date', new Date().toLocaleString()]
    ].map(row => `"${row[0]}","${row[1]}"`).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bonus_calculation_${employeeData.employee_data.employee_id || 'employee'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // Handle calculation
  const handleCalculate = () => {
    try {
      setIsCalculating(true);
      setError(null);
      
      // Extract employee data
      const salary = employeeData?.employee_data?.salary || 0;
      const investmentScore = parseFloat(employeeData?.employee_data?.additional_data?.investment_score || '0');
      const qualitativeScore = parseFloat(employeeData?.employee_data?.additional_data?.qualitative_score || '0');
      const rafValue = employeeData?.employee_data?.additional_data?.raf 
        ? parseFloat(employeeData.employee_data.additional_data.raf) 
        : parameters.raf;
      
      // Check if we have the required data
      if (!salary) {
        throw new Error('Employee salary is required for calculation');
      }
      
      // Ensure weights are valid and sum to 1
      let investmentWeight = Math.max(0, Math.min(1, parameters.investmentWeight));
      let qualitativeWeight = Math.max(0, Math.min(1, parameters.qualitativeWeight));
      
      // If weights don't sum to 1, adjust them
      const weightSum = investmentWeight + qualitativeWeight;
      if (Math.abs(weightSum - 1.0) > 0.001 && weightSum > 0) {
        investmentWeight = investmentWeight / weightSum;
        qualitativeWeight = qualitativeWeight / weightSum;
      }
      
      // Prepare calculation inputs with defaults for missing values
      const calculationInputs = {
        baseSalary: salary,
        targetBonusPct: parameters.targetBonusPct || 0.15,
        investmentWeight: investmentWeight,
        qualitativeWeight: qualitativeWeight,
        investmentScore: investmentScore || 1.0,
        qualitativeScore: qualitativeScore || 1.0,
        raf: parameters.useDirectRaf && rafValue ? rafValue : (parameters.raf || 1.0),
        isMRT: employeeData?.employee_data?.additional_data?.is_mrt === 'true',
        mrtCapPct: parameters.mrtCapPct || 2.0,
        baseSalaryCapMultiplier: parameters.baseSalaryCapMultiplier || 3.0
      };
      
      console.log('Calculation inputs:', calculationInputs);
      
      // Perform calculation
      const result = calculateBonus(
        calculationInputs.baseSalary,
        calculationInputs.targetBonusPct,
        calculationInputs.investmentWeight,
        calculationInputs.investmentScore,
        calculationInputs.qualitativeWeight,
        calculationInputs.qualitativeScore,
        calculationInputs.raf,
        calculationInputs.isMRT,
        calculationInputs.mrtCapPct
      );
      
      console.log('Calculation result:', result);
      setCalculationResult(result);
      
      // Generate alerts based on calculation results
      generateAlerts(result, calculationInputs);
    } catch (err: any) {
      console.error('Calculation error:', err);
      setError(err.message || 'An error occurred during calculation');
      // Set a default calculation result to prevent rendering errors
      setCalculationResult(null);
    } finally {
      setIsCalculating(false);
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Loading indicator */}
      {loading && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-700 font-medium">Loading calculation data...</p>
          </div>
        </div>
      )}
      
      {/* Employee Information */}
      <div className="bg-white rounded-lg shadow p-6 lg:col-span-1">
        <h3 className="text-lg font-semibold mb-4">Employee Information</h3>
        
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">ID</p>
            <p className="font-medium">{employeeData.employee_data?.employee_id || 'N/A'}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium">
              {employeeData.employee_data?.first_name} {employeeData.employee_data?.last_name}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Department</p>
            <p className="font-medium">{employeeData.employee_data?.department || 'N/A'}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Position</p>
            <p className="font-medium">{employeeData.employee_data?.position || 'N/A'}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Base Salary</p>
            <p className="font-medium">
              {employeeData.employee_data?.salary 
                ? `£${employeeData.employee_data.salary.toLocaleString()}`
                : 'N/A'
              }
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Investment Score</p>
            <p className="font-medium">
              {employeeData.employee_data?.additional_data?.investment_score || 'N/A'}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Qualitative Score</p>
            <p className="font-medium">
              {employeeData.employee_data?.additional_data?.qualitative_score || 'N/A'}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">RAF</p>
            <div className="bg-gray-50 p-3 rounded mb-2">
              <span className="text-sm text-gray-600">Employee RAF: </span>
              <span className="font-medium text-purple-600">
                {employeeData.employee_data?.additional_data?.raf || (parameters.raf || 1.0).toFixed(2)}
              </span>
              <span className="text-xs text-gray-500 ml-2">
                {employeeData.employee_data?.additional_data?.raf ? '(from employee data)' : '(using default)'}
              </span>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Material Risk Taker</p>
            <p className="font-medium">
              {employeeData.employee_data?.additional_data?.is_mrt === 'true' ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Calculation Parameters */}
      <div className="bg-white rounded-lg shadow p-6 lg:col-span-1">
        <h3 className="text-lg font-semibold mb-4">Calculation Parameters</h3>
        
        <div className="space-y-6">
          {/* Target Bonus Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <label className="block mb-2 text-sm font-semibold text-gray-800">Target Bonus Percentage</label>
            <p className="text-xs text-gray-600 mb-3">The baseline bonus as a percentage of base salary</p>
            <div className="flex items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={parameters.targetBonusPct || 0.15}
                onChange={(e) => handleParameterChange('targetBonusPct', Number(e.target.value))}
                className="w-full mr-4"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={((parameters.targetBonusPct || 0.15) * 100).toFixed(0)}
                onChange={(e) => handleParameterChange('targetBonusPct', Number(e.target.value) / 100)}
                className="w-20 p-2 border rounded text-right text-gray-800"
              />
              <span className="ml-2 text-sm font-medium">%</span>
            </div>
          </div>
          
          {/* Performance Weights Section */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Performance Component Weights</h4>
            <p className="text-xs text-gray-600 mb-4">How much each performance area contributes to the final bonus</p>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Investment Performance Weight</label>
                <p className="text-xs text-gray-500 mb-2">Relative weight of investment performance (0-100%)</p>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={parameters.investmentWeight || 0.6}
                    onChange={(e) => handleParameterChange('investmentWeight', Number(e.target.value))}
                    className="w-full mr-4"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={((parameters.investmentWeight || 0.6) * 100).toFixed(0)}
                    onChange={(e) => handleParameterChange('investmentWeight', Number(e.target.value) / 100)}
                    className="w-20 p-2 border rounded text-right text-gray-800"
                  />
                  <span className="ml-2 text-sm font-medium">%</span>
                </div>
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Qualitative Performance Weight</label>
                <p className="text-xs text-gray-500 mb-2">Relative weight of qualitative performance (0-100%)</p>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={parameters.qualitativeWeight || 0.4}
                    onChange={(e) => handleParameterChange('qualitativeWeight', Number(e.target.value))}
                    className="w-full mr-4"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={((parameters.qualitativeWeight || 0.4) * 100).toFixed(0)}
                    onChange={(e) => handleParameterChange('qualitativeWeight', Number(e.target.value) / 100)}
                    className="w-20 p-2 border rounded text-right text-gray-800"
                  />
                  <span className="ml-2 text-sm font-medium">%</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Performance Multipliers Section */}
          <div className="bg-amber-50 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Performance Score Adjustments</h4>
            <p className="text-xs text-gray-600 mb-4">Adjust individual performance scores up or down</p>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Investment Performance Multiplier</label>
                <p className="text-xs text-gray-500 mb-2">Multiplier applied to investment performance score</p>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={parameters.investmentScoreMultiplier || 1.0}
                    onChange={(e) => handleParameterChange('investmentScoreMultiplier', Number(e.target.value))}
                    className="w-full mr-4"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={(parameters.investmentScoreMultiplier || 1.0).toFixed(1)}
                    onChange={(e) => handleParameterChange('investmentScoreMultiplier', Number(e.target.value))}
                    className="w-20 p-2 border rounded text-right text-gray-800"
                  />
                  <span className="ml-2 text-sm font-medium">×</span>
                </div>
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Qualitative Performance Multiplier</label>
                <p className="text-xs text-gray-500 mb-2">Multiplier applied to qualitative performance score</p>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={parameters.qualScoreMultiplier || 1.0}
                    onChange={(e) => handleParameterChange('qualScoreMultiplier', Number(e.target.value))}
                    className="w-full mr-4"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={(parameters.qualScoreMultiplier || 1.0).toFixed(1)}
                    onChange={(e) => handleParameterChange('qualScoreMultiplier', Number(e.target.value))}
                    className="w-20 p-2 border rounded text-right text-gray-800"
                  />
                  <span className="ml-2 text-sm font-medium">×</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Revenue Adjustment Factor Section */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Revenue Adjustment Factor (RAF)</h4>
            <p className="text-xs text-gray-600 mb-4">Global adjustment based on company/team revenue performance</p>
            
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">Use Employee-Specific RAF</label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={parameters.useDirectRaf || true}
                  onChange={(e) => handleParameterChange('useDirectRaf', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">
                  Use RAF from employee data if available
                </span>
              </div>
            </div>
            
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Default RAF Value</label>
              <p className="text-xs text-gray-500 mb-2">Revenue adjustment factor (1.0 = no adjustment)</p>
              <div className="flex items-center">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={parameters.raf || 1.0}
                  onChange={(e) => handleParameterChange('raf', Number(e.target.value))}
                  className="w-full mr-4"
                  disabled={parameters.useDirectRaf && !!employeeData.employee_data?.additional_data?.raf}
                />
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={(parameters.raf || 1.0).toFixed(1)}
                  onChange={(e) => handleParameterChange('raf', Number(e.target.value))}
                  className="w-20 p-2 border rounded text-right text-gray-800"
                  disabled={parameters.useDirectRaf && !!employeeData.employee_data?.additional_data?.raf}
                />
                <span className="ml-2 text-sm font-medium">×</span>
              </div>
            </div>
          </div>
          
          {/* Regulatory Caps Section */}
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Regulatory Caps & Limits</h4>
            <p className="text-xs text-gray-600 mb-4">Compliance limits for bonus payments</p>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Material Risk Taker (MRT) Cap</label>
                <p className="text-xs text-gray-500 mb-2">Maximum bonus for MRT employees as % of base salary</p>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={parameters.mrtCapPct || 2.0}
                    onChange={(e) => handleParameterChange('mrtCapPct', Number(e.target.value))}
                    className="w-full mr-4"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={((parameters.mrtCapPct || 2.0) * 100).toFixed(0)}
                    onChange={(e) => handleParameterChange('mrtCapPct', Number(e.target.value) / 100)}
                    className="w-20 p-2 border rounded text-right text-gray-800"
                  />
                  <span className="ml-2 text-sm font-medium">%</span>
                </div>
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">General Bonus Cap</label>
                <p className="text-xs text-gray-500 mb-2">Maximum bonus for all employees as multiple of base salary</p>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={parameters.baseSalaryCapMultiplier || 3.0}
                    onChange={(e) => handleParameterChange('baseSalaryCapMultiplier', Number(e.target.value))}
                    className="w-full mr-4"
                  />
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={(parameters.baseSalaryCapMultiplier || 3.0).toFixed(1)}
                    onChange={(e) => handleParameterChange('baseSalaryCapMultiplier', Number(e.target.value))}
                    className="w-20 p-2 border rounded text-right text-gray-800"
                  />
                  <span className="ml-2 text-sm font-medium">×</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <button
              onClick={handleCalculate}
              disabled={isCalculating}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCalculating ? 'Calculating...' : 'Calculate Bonus'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Calculation Results */}
      <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Calculation Results</h3>
          {batchName && (
            <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
              Batch: {batchName}
            </div>
          )}
        </div>
        
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        ) : isCalculating ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : calculationResult ? (
          <div className="space-y-6">
            {/* Alerts Panel */}
            {alerts.length > 0 && (
              <div className="space-y-2">
                {alerts.map((alert, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border ${
                      alert.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                      alert.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                      'bg-blue-50 border-blue-200 text-blue-800'
                    }`}
                  >
                    <div className="flex items-start">
                      <span className="mr-2 text-sm font-semibold">
                        {alert.type === 'error' ? '⚠️' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
                      </span>
                      <span className="text-sm">{alert.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Final Bonus Display with Export Button */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-bold text-blue-800">
                    £{calculationResult?.finalBonus?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}
                  </h4>
                  <p className="text-sm text-blue-600">Final Bonus Amount</p>
                </div>
                <button
                  onClick={exportToCSV}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center"
                  title="Export calculation details to CSV"
                >
                  <span className="mr-2">📊</span>
                  Export CSV
                </button>
              </div>
            </div>
            
            {/* Enhanced Calculation Breakdown */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-md font-semibold text-gray-800 mb-4">Detailed Calculation Breakdown</h4>
              
              {/* Step 1: Base Information */}
              <div className="mb-4 p-3 bg-white rounded border-l-4 border-blue-500">
                <h5 className="text-sm font-semibold text-blue-700 mb-2">Step 1: Base Information</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Salary</span>
                    <span className="font-medium">£{calculationResult?.baseSalary?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Target Bonus Rate</span>
                    <div className="space-y-1">
                      <span className="text-sm text-gray-600">Target Bonus %: </span>
                      <span className="font-medium">{((parameters.targetBonusPct || 0.15) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  {calculationResult.targetBonus && (
                    <div>
                      <span className="text-sm text-gray-600">Target Bonus Amount: </span>
                      <span className="font-medium">£{calculationResult.targetBonus.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Performance Components */}
              <div className="mb-4 p-3 bg-white rounded border-l-4 border-green-500">
                <h5 className="text-sm font-semibold text-green-700 mb-2">Step 2: Performance Components</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Investment Weight</span>
                    <span className="font-medium">{((parameters.investmentWeight || 0.6) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Investment Component</span>
                    <span className="font-medium">£{calculationResult?.investmentComponent?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Qualitative Weight</span>
                    <span className="font-medium">{((parameters.qualitativeWeight || 0.4) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Qualitative Component</span>
                    <span className="font-medium">£{calculationResult?.qualitativeComponent?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-2">
                    <span className="text-gray-700 font-medium">Combined Performance Score</span>
                    <span className="font-semibold">{calculationResult?.combinedScore?.toFixed(3) || '0.000'}×</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Revenue Adjustment */}
              <div className="mb-4 p-3 bg-white rounded border-l-4 border-purple-500">
                <h5 className="text-sm font-semibold text-purple-700 mb-2">Step 3: Revenue Adjustment Factor (RAF)</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">RAF Applied</span>
                    <span className="font-medium">{calculationResult?.rafApplied?.toFixed(3) || '1.000'}×</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pre-RAF Bonus</span>
                    <span className="font-medium">£{((calculationResult?.targetBonus || 0) * (calculationResult?.combinedScore || 1)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-2">
                    <span className="text-gray-700 font-medium">Post-RAF Bonus</span>
                    <span className="font-semibold">£{(((calculationResult?.targetBonus || 0) * (calculationResult?.combinedScore || 1)) * (calculationResult?.rafApplied || 1)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Step 4: Regulatory Caps */}
              <div className="mb-4 p-3 bg-white rounded border-l-4 border-red-500">
                <h5 className="text-sm font-semibold text-red-700 mb-2">Step 4: Regulatory Caps & Final Result</h5>
                <div className="space-y-1 text-sm">
                  {calculationResult?.cappingApplied ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Uncapped Bonus</span>
                        <span className="font-medium">£{(((calculationResult?.targetBonus || 0) * (calculationResult?.combinedScore || 1)) * (calculationResult?.rafApplied || 1)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-600 font-medium">Cap Applied</span>
                        <span className="text-amber-600 font-medium">{calculationResult?.cappingReason || 'Cap applied'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-green-600">No caps applied</span>
                      <span className="text-green-600">✓</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1 mt-2 bg-blue-50 px-2 py-1 rounded">
                    <span className="text-gray-800 font-bold">FINAL BONUS</span>
                    <span className="font-bold text-blue-700">£{calculationResult?.finalBonus?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bonus as % of Salary</span>
                    <span className="font-semibold">
                      {calculationResult?.finalBonus && calculationResult?.baseSalary ? 
                        ((calculationResult.finalBonus / calculationResult.baseSalary) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 text-gray-500">
            <p>Click "Calculate Bonus" to see results</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndividualCalculator;
