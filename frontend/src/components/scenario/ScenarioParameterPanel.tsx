import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BatchParameters } from '../batch/BatchParameterConfig';

interface ScenarioParameterPanelProps {
  initialParameters: BatchParameters;
  onChange: (parameters: BatchParameters) => void;
  employeeCount?: number;
}

// Default values for optional parameters
const defaultParameters: BatchParameters = {
  targetBonusPct: 0.15,
  investmentWeight: 0.6,
  qualitativeWeight: 0.4,
  investmentScoreMultiplier: 1.0,
  qualScoreMultiplier: 1.0,
  raf: 1.0,
  rafSensitivity: 0.2,
  rafLowerClamp: 0.0,
  rafUpperClamp: 1.5,
  mrtCapPct: 2.0,
  useDirectRaf: true,
  baseSalaryCapMultiplier: 3.0,
  totalBonusPool: 1000000,
  useBonusPoolLimit: false
};

export const ScenarioParameterPanel: React.FC<ScenarioParameterPanelProps> = ({
  initialParameters,
  onChange,
  employeeCount = 0
}) => {
  // Merge initial parameters with defaults to ensure all fields are available
  const [parameters, setParameters] = useState<BatchParameters>(() => ({
    ...defaultParameters,
    ...initialParameters
  } as BatchParameters));

  // State for validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Debouncing state and refs
  const [isChanging, setIsChanging] = useState(false);
  const debounceTimeoutRef = useRef<number | null>(null);
  const lastValidParametersRef = useRef<BatchParameters>(parameters);

  // Validation effect - runs whenever parameters change
  useEffect(() => {
    const newErrors: Record<string, string> = {};
    
    // Validate target bonus percentage is between 0 and 1
    if (parameters.targetBonusPct < 0 || parameters.targetBonusPct > 1) {
      newErrors.targetBonusPct = 'Target bonus percentage must be between 0% and 100%';
    }
    
    // Validate weights sum to 1.0 (100%)
    const weightSum = parameters.investmentWeight + parameters.qualitativeWeight;
    if (Math.abs(weightSum - 1.0) > 0.001) {
      newErrors.weights = `Investment and qualitative weights must sum to 100%. Current sum: ${(weightSum * 100).toFixed(1)}%`;
    }
    
    // Validate individual weights are between 0 and 1
    if (parameters.investmentWeight < 0 || parameters.investmentWeight > 1) {
      newErrors.investmentWeight = 'Investment weight must be between 0% and 100%';
    }
    
    if (parameters.qualitativeWeight < 0 || parameters.qualitativeWeight > 1) {
      newErrors.qualitativeWeight = 'Qualitative weight must be between 0% and 100%';
    }
    
    // Validate multipliers are positive
    if (parameters.investmentScoreMultiplier <= 0) {
      newErrors.investmentScoreMultiplier = 'Investment score multiplier must be positive';
    }
    
    if (parameters.qualScoreMultiplier <= 0) {
      newErrors.qualScoreMultiplier = 'Qualitative score multiplier must be positive';
    }
    
    // Validate RAF is non-negative
    if (parameters.raf < 0) {
      newErrors.raf = 'RAF must be non-negative';
    }
    
    // Validate RAF sensitivity is within reasonable bounds
    if (parameters.rafSensitivity !== undefined && (parameters.rafSensitivity < 0 || parameters.rafSensitivity > 1)) {
      newErrors.rafSensitivity = 'RAF sensitivity must be between 0 and 1';
    }
    
    // Validate bonus pool amount if limit is enabled
    if (parameters.useBonusPoolLimit && (parameters.totalBonusPool === undefined || parameters.totalBonusPool <= 0)) {
      newErrors.totalBonusPool = 'Bonus pool amount must be positive when limit is enabled';
    }
    
    // Validate RAF bounds
    if (parameters.rafLowerClamp !== undefined && parameters.rafUpperClamp !== undefined && 
        parameters.rafLowerClamp > parameters.rafUpperClamp) {
      newErrors.rafBounds = 'RAF lower clamp must be less than or equal to upper clamp';
    }
    
    // Validate MRT cap percentage is reasonable
    if (parameters.mrtCapPct < 0) {
      newErrors.mrtCapPct = 'MRT cap percentage cannot be negative';
    } else if (parameters.mrtCapPct > 5) {
      newErrors.mrtCapPct = 'MRT cap percentage exceeds recommended maximum (5.0)';
    }
    
    // Validate base salary cap multiplier
    if (parameters.baseSalaryCapMultiplier !== undefined) {
      if (parameters.baseSalaryCapMultiplier <= 0) {
        newErrors.baseSalaryCapMultiplier = 'Base salary cap multiplier must be positive';
      } else if (parameters.baseSalaryCapMultiplier < 1) {
        newErrors.baseSalaryCapMultiplier = 'Base salary cap multiplier must be at least 1';
      } else if (parameters.baseSalaryCapMultiplier > 10) {
        newErrors.baseSalaryCapMultiplier = 'Base salary cap multiplier exceeds recommended maximum (10.0)';
      }
    }
    
    setErrors(newErrors);
    
    // If parameters are valid, update the last valid parameters
    if (Object.keys(newErrors).length === 0) {
      lastValidParametersRef.current = parameters;
    }
  }, [parameters]);

  // Debounced parameter change effect - only call onChange after user stops adjusting
  useEffect(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Set changing state to true to show loading indicator
    setIsChanging(true);
    
    // Set new timeout for debounced update
    debounceTimeoutRef.current = setTimeout(() => {
      // Only trigger onChange if parameters are valid
      if (Object.keys(errors).length === 0) {
        onChange(lastValidParametersRef.current);
      }
      setIsChanging(false);
    }, 300); // 300ms debounce delay
    
    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [parameters, errors, onChange]);

  const handleChange = useCallback((field: keyof BatchParameters, value: number | boolean) => {
    setParameters(prev => {
      const updated = { ...prev };

      if (typeof value === 'number') {
        if (field === 'investmentWeight') {
          // Constrain investment weight between 0 and 1
          const constrainedValue = Math.max(0, Math.min(1, value));
          updated.investmentWeight = constrainedValue;
          // Adjust qualitative weight to maintain sum of 1
          updated.qualitativeWeight = 1 - constrainedValue;
        } else if (field === 'qualitativeWeight') {
          // Constrain qualitative weight between 0 and 1
          const constrainedValue = Math.max(0, Math.min(1, value));
          updated.qualitativeWeight = constrainedValue;
          // Adjust investment weight to maintain sum of 1
          updated.investmentWeight = 1 - constrainedValue;
        } else {
          // For other numeric fields, set the value
          (updated as any)[field] = value;
        }
      } else {
        // For boolean fields
        (updated as any)[field] = value;
      }

      return updated;
    });
  }, []);

  // Helper function to get input class with error styling
  const getInputClassName = (fieldName: string, baseClass: string = "") => {
    const hasError = errors[fieldName];
    const errorClass = hasError ? "border-red-300 bg-red-50" : "border-gray-300";
    return `${baseClass} ${errorClass}`.trim();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Scenario Parameters</h2>
          <p className="text-gray-600">
            Adjust global parameters to see real-time impact on {employeeCount.toLocaleString()} employees
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {Object.keys(errors).length > 0 && (
            <div className="text-sm bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-200">
              ⚠️ {Object.keys(errors).length} Error{Object.keys(errors).length !== 1 ? 's' : ''}
            </div>
          )}
          {isChanging ? (
            <div className="text-sm bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200 flex items-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b border-amber-600 mr-2"></div>
              Updating...
            </div>
          ) : (
            <div className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200">
              ✓ Live Calculations
            </div>
          )}
        </div>
      </div>

      {/* Error summary */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Parameter Validation Issues:</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {Object.entries(errors).map(([key, error]) => (
                    <li key={key}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Weights Section */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-bold mb-3 text-green-800">Performance Component Weights</h3>
          <p className="text-xs text-green-700 mb-4">How much each performance area contributes to bonuses</p>
          
          {/* Weight sum validation warning */}
          {errors.weights && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 font-medium">⚠️ {errors.weights}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Investment Performance Weight
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={parameters.investmentWeight || 0.6}
                  onChange={(e) => handleChange('investmentWeight', Number(e.target.value))}
                  className={getInputClassName('investmentWeight', 'flex-1')}
                />
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round((parameters.investmentWeight || 0.6) * 100)}
                    onChange={(e) => handleChange('investmentWeight', Number(e.target.value) / 100)}
                    className={getInputClassName('investmentWeight', 'w-16 px-2 py-1 border rounded text-center text-sm')}
                  />
                  <span className="text-sm font-medium">%</span>
                </div>
              </div>
              {errors.investmentWeight && (
                <p className="text-red-500 text-sm mt-1">{errors.investmentWeight}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Qualitative Performance Weight
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={parameters.qualitativeWeight || 0.4}
                  onChange={(e) => handleChange('qualitativeWeight', Number(e.target.value))}
                  className={getInputClassName('qualitativeWeight', 'flex-1')}
                />
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round((parameters.qualitativeWeight || 0.4) * 100)}
                    onChange={(e) => handleChange('qualitativeWeight', Number(e.target.value) / 100)}
                    className={getInputClassName('qualitativeWeight', 'w-16 px-2 py-1 border rounded text-center text-sm')}
                  />
                  <span className="text-sm font-medium">%</span>
                </div>
              </div>
              {errors.qualitativeWeight && (
                <p className="text-red-500 text-sm mt-1">{errors.qualitativeWeight}</p>
              )}
            </div>
          </div>
        </div>

        {/* RAF Settings Section */}
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="font-bold mb-3 text-purple-800">Revenue Adjustment Factor (RAF)</h3>
          <p className="text-xs text-purple-700 mb-4">Global adjustment based on company performance</p>
          
          {/* RAF bounds validation warning */}
          {errors.rafBounds && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 font-medium">⚠️ {errors.rafBounds}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default RAF Value
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={parameters.raf || 1.0}
                  onChange={(e) => handleChange('raf', Number(e.target.value))}
                  className={getInputClassName('raf', 'flex-1')}
                />
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.01"
                    value={(parameters.raf || 1.0).toFixed(2)}
                    onChange={(e) => handleChange('raf', Number(e.target.value))}
                    className={getInputClassName('raf', 'w-20 px-2 py-1 border rounded text-center text-sm')}
                  />
                  <span className="text-sm font-medium">×</span>
                </div>
              </div>
              {errors.raf && (
                <p className="text-red-500 text-sm mt-1">{errors.raf}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RAF Sensitivity Factor
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={parameters.rafSensitivity || 0.2}
                  onChange={(e) => handleChange('rafSensitivity', Number(e.target.value))}
                  className={getInputClassName('rafSensitivity', 'flex-1')}
                />
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={(parameters.rafSensitivity || 0.2).toFixed(2)}
                    onChange={(e) => handleChange('rafSensitivity', Number(e.target.value))}
                    className={getInputClassName('rafSensitivity', 'w-20 px-2 py-1 border rounded text-center text-sm')}
                  />
                </div>
              </div>
              {errors.rafSensitivity && (
                <p className="text-red-500 text-sm mt-1">{errors.rafSensitivity}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RAF Lower Clamp
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={(parameters.rafLowerClamp || 0.0).toFixed(2)}
                  onChange={(e) => handleChange('rafLowerClamp', Number(e.target.value))}
                  className={getInputClassName('rafLowerClamp', 'w-full px-2 py-1 border rounded text-center text-sm')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RAF Upper Clamp
                </label>
                <input
                  type="number"
                  min="1"
                  max="3"
                  step="0.01"
                  value={(parameters.rafUpperClamp || 1.5).toFixed(2)}
                  onChange={(e) => handleChange('rafUpperClamp', Number(e.target.value))}
                  className={getInputClassName('rafUpperClamp', 'w-full px-2 py-1 border rounded text-center text-sm')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory Caps Section */}
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h3 className="font-bold mb-3 text-red-800">Regulatory Caps & Limits</h3>
          <p className="text-xs text-red-700 mb-4">Compliance limits for bonus payments</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MRT Cap Percentage
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={parameters.mrtCapPct || 2.0}
                  onChange={(e) => handleChange('mrtCapPct', Number(e.target.value))}
                  className={getInputClassName('mrtCapPct', 'flex-1')}
                />
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="10"
                    value={Math.round((parameters.mrtCapPct || 2.0) * 100)}
                    onChange={(e) => handleChange('mrtCapPct', Number(e.target.value) / 100)}
                    className={getInputClassName('mrtCapPct', 'w-20 px-2 py-1 border rounded text-center text-sm')}
                  />
                  <span className="text-sm font-medium">%</span>
                </div>
              </div>
              {errors.mrtCapPct && (
                <p className="text-red-500 text-sm mt-1">{errors.mrtCapPct}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                General Bonus Cap
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={parameters.baseSalaryCapMultiplier || 3.0}
                  onChange={(e) => handleChange('baseSalaryCapMultiplier', Number(e.target.value))}
                  className={getInputClassName('baseSalaryCapMultiplier', 'flex-1')}
                />
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={(parameters.baseSalaryCapMultiplier || 3.0).toFixed(1)}
                    onChange={(e) => handleChange('baseSalaryCapMultiplier', Number(e.target.value))}
                    className={getInputClassName('baseSalaryCapMultiplier', 'w-20 px-2 py-1 border rounded text-center text-sm')}
                  />
                  <span className="text-sm font-medium">× salary</span>
                </div>
              </div>
              {errors.baseSalaryCapMultiplier && (
                <p className="text-red-500 text-sm mt-1">{errors.baseSalaryCapMultiplier}</p>
              )}
            </div>
          </div>
        </div>

        {/* Bonus Targeting Section */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-bold mb-3 text-blue-800">Bonus Targeting</h3>
          <p className="text-xs text-blue-700 mb-4">Target bonus levels and multipliers</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Bonus Percentage
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={parameters.targetBonusPct || 0.15}
                  onChange={(e) => handleChange('targetBonusPct', Number(e.target.value))}
                  className={getInputClassName('targetBonusPct', 'flex-1')}
                />
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round((parameters.targetBonusPct || 0.15) * 100)}
                    onChange={(e) => handleChange('targetBonusPct', Number(e.target.value) / 100)}
                    className={getInputClassName('targetBonusPct', 'w-16 px-2 py-1 border rounded text-center text-sm')}
                  />
                  <span className="text-sm font-medium">%</span>
                </div>
              </div>
              {errors.targetBonusPct && (
                <p className="text-red-500 text-sm mt-1">{errors.targetBonusPct}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Investment Multiplier
                </label>
                <input
                  type="number"
                  min="0"
                  max="3"
                  step="0.1"
                  value={(parameters.investmentScoreMultiplier || 1.0).toFixed(1)}
                  onChange={(e) => handleChange('investmentScoreMultiplier', Number(e.target.value))}
                  className={getInputClassName('investmentScoreMultiplier', 'w-full px-2 py-1 border rounded text-center text-sm')}
                />
                {errors.investmentScoreMultiplier && (
                  <p className="text-red-500 text-sm mt-1">{errors.investmentScoreMultiplier}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qualitative Multiplier
                </label>
                <input
                  type="number"
                  min="0"
                  max="3"
                  step="0.1"
                  value={(parameters.qualScoreMultiplier || 1.0).toFixed(1)}
                  onChange={(e) => handleChange('qualScoreMultiplier', Number(e.target.value))}
                  className={getInputClassName('qualScoreMultiplier', 'w-full px-2 py-1 border rounded text-center text-sm')}
                />
                {errors.qualScoreMultiplier && (
                  <p className="text-red-500 text-sm mt-1">{errors.qualScoreMultiplier}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useDirectRaf"
                checked={parameters.useDirectRaf || true}
                onChange={(e) => handleChange('useDirectRaf', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="useDirectRaf" className="text-sm text-gray-700">
                Use employee-specific RAF when available
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 