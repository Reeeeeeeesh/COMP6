import React, { useState, useEffect, useCallback } from 'react';
import { ParameterPresets } from './ParameterPresets';
import { getDefaultParameterPreset } from '../../services/parameterPresetService';
import CategoryParameterConfig from './CategoryParameterConfig';
import { API_BASE_URL } from '../../config';
import { getTeams, getConfigs, previewBand, Team, RevenueBandConfig, BandPreview } from '../../services/revenueBandingService';

export interface BatchParameters {
  targetBonusPct: number;
  investmentWeight: number;
  qualitativeWeight: number;
  investmentScoreMultiplier: number;
  qualScoreMultiplier: number;
  raf: number;
  rafSensitivity?: number;
  rafLowerClamp?: number;
  rafUpperClamp?: number;
  mrtCapPct: number;
  useDirectRaf: boolean;
  baseSalaryCapMultiplier?: number;
  totalBonusPool?: number; // Optional total bonus pool amount
  useBonusPoolLimit?: boolean; // Whether to apply bonus pool limit
  // Revenue banding
  useRevenueBanding?: boolean;
  teamId?: string;
  bandConfigId?: string;
}

export interface CategoryParameters {
  targetBonusPct?: number;
  investmentWeight?: number;
  qualitativeWeight?: number;
  investmentScoreMultiplier?: number;
  qualScoreMultiplier?: number;
  raf?: number;
  rafSensitivity?: number;
  rafLowerClamp?: number;
  rafUpperClamp?: number;
  mrtCapPct?: number;
  useDirectRaf?: boolean;
  baseSalaryCapMultiplier?: number;
  // Note: Bonus pool parameters are global only, not category-specific
}

export interface CategoryBasedBatchParameters {
  useCategoryBased: boolean;
  defaultParameters: BatchParameters;
  departmentOverrides?: { [department: string]: CategoryParameters };
  salaryRangeOverrides?: { [range: string]: CategoryParameters };
  positionOverrides?: { [position: string]: CategoryParameters };
}

interface BatchParameterConfigProps {
  // Original props - updated to support both parameter types
  onSubmit?: (parameters: BatchParameters | CategoryBasedBatchParameters) => void;
  initialValues?: BatchParameters | CategoryBasedBatchParameters;
  onCancel?: () => void;
  
  // New props being passed from BatchUploadContainer
  uploadId?: string;
  onParametersChange?: (parameters: BatchParameters | CategoryBasedBatchParameters) => void;
}

const defaultParameters: BatchParameters = {
  targetBonusPct: 0.15, // 15%
  investmentWeight: 0.6, // 60%
  qualitativeWeight: 0.4, // 40%
  investmentScoreMultiplier: 1.0,
  qualScoreMultiplier: 1.0,
  raf: 1.0,
  rafSensitivity: 0.2,
  rafLowerClamp: 0,
  rafUpperClamp: 1.5,
  mrtCapPct: 2.0, // 200% of base salary
  useDirectRaf: true, // Use RAF from CSV if available
  baseSalaryCapMultiplier: 3.0, // 3x base salary cap
  totalBonusPool: 1000000, // Default £1,000,000 bonus pool
  useBonusPoolLimit: false, // Disabled by default
  useRevenueBanding: false,
  teamId: undefined,
  bandConfigId: undefined
};

export const BatchParameterConfig: React.FC<BatchParameterConfigProps> = ({ 
  onSubmit, 
  initialValues, 
  onCancel,
  uploadId: _uploadId,
  onParametersChange
}) => {
  // Determine if initial values are category-based or universal
  const isInitialCategoryBased = initialValues && 'useCategoryBased' in initialValues;
  
  const [useCategoryBased, setUseCategoryBased] = useState<boolean>(
    isInitialCategoryBased || false
  );
  
  const [universalParameters, setUniversalParameters] = useState<BatchParameters>(
    isInitialCategoryBased ? (initialValues as CategoryBasedBatchParameters).defaultParameters : (initialValues as BatchParameters) || defaultParameters
  );
  
  const [categoryBasedParameters, setCategoryBasedParameters] = useState<CategoryBasedBatchParameters>(
    isInitialCategoryBased ? (initialValues as CategoryBasedBatchParameters) : {
      useCategoryBased: false,
      defaultParameters: universalParameters,
      departmentOverrides: {},
      salaryRangeOverrides: {},
      positionOverrides: {}
    }
  );
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableCategories, setAvailableCategories] = useState<{departments: string[], positions: string[]}>({
    departments: [],
    positions: []
  });

  // Revenue banding state (lists + preview)
  const [teams, setTeams] = useState<Team[]>([])
  const [bandConfigs, setBandConfigs] = useState<RevenueBandConfig[]>([])
  const [bandPreview, setBandPreview] = useState<BandPreview | null>(null)
  const [bandLoading, setBandLoading] = useState<boolean>(false)
  const [bandError, setBandError] = useState<string | null>(null)

  // Computed property for current parameters to maintain compatibility
  const parameters = useCategoryBased ? categoryBasedParameters.defaultParameters : universalParameters;
  
  // Load default parameters or use initialValues if provided
  const loadDefaultParameters = useCallback(async () => {
    if (initialValues) {
      // Initial values are already handled in state initialization
      return;
    }
    
    try {
      const defaultPreset = await getDefaultParameterPreset();
      setUniversalParameters(defaultPreset.parameters);
      setCategoryBasedParameters(prev => ({
        ...prev,
        defaultParameters: defaultPreset.parameters
      }));
    } catch (error) {
      console.error('Failed to load default parameters:', error);
      // Keep the default parameters defined in state initialization
    }
  }, [initialValues]);

  // Load available categories from uploaded data
  const loadAvailableCategories = useCallback(async () => {
    if (!_uploadId) return;
    
    try {
      // Fetch employee data to extract unique departments and positions
      const response = await fetch(`${API_BASE_URL}/api/v1/batch/uploads/${_uploadId}/columns`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.sample_data) {
          const sampleData = result.data.sample_data;
          
          // Extract unique departments and positions
          const departments = [...new Set(
            sampleData
              .map((row: any) => row.department)
              .filter((dept: any) => dept && typeof dept === 'string')
          )] as string[];
          departments.sort();
          
          const positions = [...new Set(
            sampleData
              .map((row: any) => row.position)
              .filter((pos: any) => pos && typeof pos === 'string')
          )] as string[];
          positions.sort();
          
          setAvailableCategories({ departments, positions });
          console.log('Available categories loaded:', { departments, positions });
        }
      }
    } catch (error) {
      console.error('Failed to load available categories:', error);
    }
  }, [_uploadId]);
  
  // Initialize parameters on component mount
  useEffect(() => {
    loadDefaultParameters();
    loadAvailableCategories();
  }, [loadDefaultParameters, loadAvailableCategories]);
  
  // Validate parameters when they change
  useEffect(() => {
    const newErrors: Record<string, string> = {};
    const currentParams = useCategoryBased ? categoryBasedParameters.defaultParameters : universalParameters;
    
    // Validate target bonus percentage is between 0 and 1
    if (currentParams.targetBonusPct < 0 || currentParams.targetBonusPct > 1) {
      newErrors.targetBonusPct = 'Target bonus percentage must be between 0% and 100%';
    }
    
    // Validate weights sum to 1.0 (100%)
    const weightSum = currentParams.investmentWeight + currentParams.qualitativeWeight;
    if (Math.abs(weightSum - 1.0) > 0.001) {
      newErrors.weights = `Investment and qualitative weights must sum to 100%. Current sum: ${(weightSum * 100).toFixed(1)}%`;
    }
    
    // Validate individual weights are between 0 and 1
    if (currentParams.investmentWeight < 0 || currentParams.investmentWeight > 1) {
      newErrors.investmentWeight = 'Investment weight must be between 0% and 100%';
    }
    
    if (currentParams.qualitativeWeight < 0 || currentParams.qualitativeWeight > 1) {
      newErrors.qualitativeWeight = 'Qualitative weight must be between 0% and 100%';
    }
    
    // Validate multipliers are positive
    if (currentParams.investmentScoreMultiplier <= 0) {
      newErrors.investmentScoreMultiplier = 'Investment score multiplier must be positive';
    }
    
    if (currentParams.qualScoreMultiplier <= 0) {
      newErrors.qualScoreMultiplier = 'Qualitative score multiplier must be positive';
    }
    
    // Validate RAF is non-negative
    if (currentParams.raf < 0) {
      newErrors.raf = 'RAF must be non-negative';
    }
    
    // Validate RAF sensitivity is within reasonable bounds
    if (currentParams.rafSensitivity !== undefined && (currentParams.rafSensitivity < 0 || currentParams.rafSensitivity > 1)) {
      newErrors.rafSensitivity = 'RAF sensitivity must be between 0 and 1';
    }
    
    // Validate bonus pool amount if limit is enabled
    if (currentParams.useBonusPoolLimit && (currentParams.totalBonusPool === undefined || currentParams.totalBonusPool <= 0)) {
      newErrors.totalBonusPool = 'Bonus pool amount must be positive when limit is enabled';
    }
    
    // Validate RAF bounds
    if (currentParams.rafLowerClamp !== undefined && currentParams.rafUpperClamp !== undefined && 
        currentParams.rafLowerClamp > currentParams.rafUpperClamp) {
      newErrors.rafBounds = 'RAF lower clamp must be less than or equal to upper clamp';
    }
    
    // Validate MRT cap percentage is reasonable
    if (currentParams.mrtCapPct < 0) {
      newErrors.mrtCapPct = 'MRT cap percentage cannot be negative';
    } else if (currentParams.mrtCapPct > 5) {
      newErrors.mrtCapPct = 'MRT cap percentage exceeds recommended maximum (5.0)';
    }
    
    // Validate base salary cap multiplier
    if (currentParams.baseSalaryCapMultiplier !== undefined) {
      if (currentParams.baseSalaryCapMultiplier <= 0) {
        newErrors.baseSalaryCapMultiplier = 'Base salary cap multiplier must be positive';
      } else if (currentParams.baseSalaryCapMultiplier < 1) {
        newErrors.baseSalaryCapMultiplier = 'Base salary cap multiplier must be at least 1';
      } else if (currentParams.baseSalaryCapMultiplier > 10) {
        newErrors.baseSalaryCapMultiplier = 'Base salary cap multiplier exceeds recommended maximum (10.0)';
      }
    }

    // Revenue banding validation
    if (currentParams.useRevenueBanding) {
      if (!currentParams.teamId) {
        newErrors.teamId = 'Team is required when revenue banding is enabled';
      }
    }
    
    setErrors(newErrors);
  }, [useCategoryBased, universalParameters, categoryBasedParameters]);
  
  const handleChange = (field: keyof BatchParameters, value: number | boolean) => {
    if (useCategoryBased) {
      setCategoryBasedParameters(prev => ({
        ...prev,
        defaultParameters: {
          ...prev.defaultParameters,
          [field]: value
        }
      }));
    } else {
      setUniversalParameters(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // If changing one weight, automatically adjust the other to maintain sum of 100%
    if (field === 'investmentWeight' && typeof value === 'number') {
      const adjustedQualWeight = Math.max(0, Math.min(1, 1 - value));
      if (useCategoryBased) {
        setCategoryBasedParameters(prev => ({
          ...prev,
          defaultParameters: {
            ...prev.defaultParameters,
            investmentWeight: value,
            qualitativeWeight: adjustedQualWeight
          }
        }));
      } else {
        setUniversalParameters(prev => ({
          ...prev,
          investmentWeight: value,
          qualitativeWeight: adjustedQualWeight
        }));
      }
    } else if (field === 'qualitativeWeight' && typeof value === 'number') {
      const adjustedInvestWeight = Math.max(0, Math.min(1, 1 - value));
      if (useCategoryBased) {
        setCategoryBasedParameters(prev => ({
          ...prev,
          defaultParameters: {
            ...prev.defaultParameters,
            qualitativeWeight: value,
            investmentWeight: adjustedInvestWeight
          }
        }));
      } else {
        setUniversalParameters(prev => ({
          ...prev,
          qualitativeWeight: value,
          investmentWeight: adjustedInvestWeight
        }));
      }
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (Object.keys(errors).length === 0) {
      const currentParams = useCategoryBased ? categoryBasedParameters : universalParameters;
      
      // Use either onSubmit or onParametersChange, whichever is provided
      if (onSubmit) {
        onSubmit(currentParams);
      } else if (onParametersChange) {
        onParametersChange(currentParams);
      }
      
      console.log('Parameters applied:', currentParams);
    }
  };

  // Helper to update any parameter (number | boolean | string)
  const setParamValue = (key: keyof BatchParameters, value: any) => {
    if (useCategoryBased) {
      setCategoryBasedParameters(prev => ({
        ...prev,
        defaultParameters: {
          ...prev.defaultParameters,
          [key]: value,
        },
      }))
    } else {
      setUniversalParameters(prev => ({
        ...prev,
        [key]: value as any,
      }))
    }
  }

  // Fetch teams/configs when banding is enabled
  useEffect(() => {
    const currentParams = useCategoryBased ? categoryBasedParameters.defaultParameters : universalParameters;
    if (currentParams.useRevenueBanding) {
      (async () => {
        try {
          const [ts, cs] = await Promise.all([getTeams(), getConfigs()])
          setTeams(ts)
          setBandConfigs(cs)
        } catch (err) {
          console.error('Failed to load banding lists', err)
        }
      })()
    }
  }, [useCategoryBased, universalParameters.useRevenueBanding, categoryBasedParameters.defaultParameters.useRevenueBanding])

  // Auto-preview when enabled and teamId selected
  useEffect(() => {
    const currentParams = useCategoryBased ? categoryBasedParameters.defaultParameters : universalParameters;
    if (currentParams.useRevenueBanding && currentParams.teamId) {
      setBandLoading(true)
      setBandError(null)
      setBandPreview(null)
      previewBand(currentParams.teamId, currentParams.bandConfigId)
        .then((res) => setBandPreview(res))
        .catch((err) => setBandError(err instanceof Error ? err.message : String(err)))
        .finally(() => setBandLoading(false))
    } else {
      setBandPreview(null)
    }
  }, [useCategoryBased, universalParameters.useRevenueBanding, universalParameters.teamId, universalParameters.bandConfigId, categoryBasedParameters.defaultParameters.useRevenueBanding, categoryBasedParameters.defaultParameters.teamId, categoryBasedParameters.defaultParameters.bandConfigId])
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-2">Configure Calculation Parameters</h2>
      <p className="text-gray-700 mb-4">Adjust the parameters below to customize how bonuses are calculated.</p>
      
      {/* Parameter Mode Toggle */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-medium text-blue-900 mb-3">Parameter Configuration Mode</h3>
        <div className="flex items-center space-x-6">
          <label className="flex items-center">
            <input
              type="radio"
              checked={!useCategoryBased}
              onChange={() => {
                setUseCategoryBased(false);
                console.log('Switched to Universal Parameters mode');
              }}
              className="mr-2 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-900">Universal Parameters</span>
            <span className="ml-2 text-xs text-gray-600">(Same parameters for all employees)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              checked={useCategoryBased}
              onChange={() => {
                setUseCategoryBased(true);
                console.log('Switched to Category-Based Parameters mode');
              }}
              className="mr-2 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-900">Category-Based Parameters</span>
            <span className="ml-2 text-xs text-gray-600">(Different parameters by department/salary/position)</span>
          </label>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error summary */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Please fix the following errors before submitting:</h3>
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
        
        {/* Conditional Parameter Forms */}
        {useCategoryBased ? (
          /* Category-Based Parameter Configuration */
          <div>
            <CategoryParameterConfig
              parameters={categoryBasedParameters}
              onParametersChange={setCategoryBasedParameters}
              availableCategories={availableCategories}
            />
          </div>
        ) : (
          /* Universal Parameter Configuration */
          <div>
        {/* TARGET BONUS SECTION */}
        <div className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-3 text-blue-700">Target Bonus Percentage</h3>
          
          <div className="flex items-center mb-2">
            <div className="w-2/3">
              <label className="block mb-2 font-medium">
                <span className="text-gray-800">Base Target: </span>
                <span className="ml-2 text-xs text-gray-700 font-medium">(Recommended: 10-20%)</span>
              </label>
              <div className="flex items-center">
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={parameters.targetBonusPct}
                  onChange={(e) => handleChange('targetBonusPct', Number(e.target.value))}
                  className="w-full mr-4"
                />
                <div className="flex items-center bg-white px-3 py-2 border border-gray-300 rounded-md">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    value={(parameters.targetBonusPct * 100).toFixed(0)}
                    onChange={(e) => handleChange('targetBonusPct', Number(e.target.value) / 100)}
                    className={`w-16 text-right focus:outline-none ${errors.targetBonusPct ? 'text-red-500' : 'text-gray-800'}`}
                  />
                  <span className="ml-1 text-gray-800">%</span>
                </div>
              </div>
            </div>
            <div className="w-1/3 pl-4">
              <div className="bg-white p-3 rounded-md border border-gray-300 h-full flex flex-col justify-center">
                <p className="text-sm font-medium text-gray-700">Current Setting:</p>
                <p className="text-2xl font-bold text-blue-600">{(parameters.targetBonusPct * 100).toFixed(0)}%</p>
                <p className="text-xs text-gray-600">of base salary</p>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-gray-700 mt-1 mb-2">
            This is the standard bonus target as a percentage of base salary that will be applied to all employees.
          </p>
          {errors.targetBonusPct && (
            <p className="text-red-500 text-sm mt-1 font-medium bg-red-50 p-2 rounded">{errors.targetBonusPct}</p>
          )}
        </div>
        
        {/* PERFORMANCE WEIGHTS SECTION */}
        <div className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-3 text-blue-700">Performance Weights</h3>
          
          <div className="flex items-center mb-4 bg-blue-50 p-3 rounded-md border border-blue-100">
            <div className="mr-2 text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-blue-800 font-medium">
              These weights determine how much each performance category contributes to the final bonus calculation.
              <span className="block mt-1 font-bold">Must sum to 100%: Currently {((parameters.investmentWeight + parameters.qualitativeWeight) * 100).toFixed(0)}%</span>
            </p>
          </div>
          
          {errors.weights && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-medium">{errors.weights}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-md border border-gray-300">
              <div className="flex justify-between items-center mb-2">
                <label className="font-semibold text-gray-800">
                  Investment Performance
                </label>
                <span className="text-lg font-bold text-blue-600">{(parameters.investmentWeight * 100).toFixed(0)}%</span>
              </div>
              
              <div className="mb-2">
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={parameters.investmentWeight}
                    onChange={(e) => handleChange('investmentWeight', Number(e.target.value))}
                    className="w-full mr-2"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 px-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              
              <div className="flex items-center mt-3">
                <span className="text-sm text-gray-700 mr-2">Precise value:</span>
                <div className="flex items-center bg-gray-100 px-2 py-1 rounded">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={(parameters.investmentWeight * 100).toFixed(0)}
                    onChange={(e) => handleChange('investmentWeight', Number(e.target.value) / 100)}
                    className={`w-16 p-1 text-right bg-gray-100 focus:outline-none ${errors.investmentWeight ? 'text-red-500' : 'text-gray-800'}`}
                  />
                  <span className="ml-1">%</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-700 mt-3">
                <span className="font-medium">Recommended:</span> 60-70%
              </p>
              {errors.investmentWeight && (
                <p className="text-red-500 text-sm mt-1 font-medium">{errors.investmentWeight}</p>
              )}
            </div>
            
            <div className="bg-white p-4 rounded-md border border-gray-300">
              <div className="flex justify-between items-center mb-2">
                <label className="font-semibold text-gray-800">
                  Qualitative Performance
                </label>
                <span className="text-lg font-bold text-blue-600">{(parameters.qualitativeWeight * 100).toFixed(0)}%</span>
              </div>
              
              <div className="mb-2">
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={parameters.qualitativeWeight}
                    onChange={(e) => handleChange('qualitativeWeight', Number(e.target.value))}
                    className="w-full mr-2"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 px-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              
              <div className="flex items-center mt-3">
                <span className="text-sm text-gray-700 mr-2">Precise value:</span>
                <div className="flex items-center bg-gray-100 px-2 py-1 rounded">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={(parameters.qualitativeWeight * 100).toFixed(0)}
                    onChange={(e) => handleChange('qualitativeWeight', Number(e.target.value) / 100)}
                    className={`w-16 p-1 text-right bg-gray-100 focus:outline-none ${errors.qualitativeWeight ? 'text-red-500' : 'text-gray-800'}`}
                  />
                  <span className="ml-1">%</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-700 mt-3">
                <span className="font-medium">Recommended:</span> 30-40%
              </p>
              {errors.qualitativeWeight && (
                <p className="text-red-500 text-sm mt-1 font-medium">{errors.qualitativeWeight}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* PERFORMANCE SCORE MULTIPLIERS SECTION */}
        <div className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-3 text-blue-700">Performance Score Multipliers</h3>
          
          <div className="flex items-center mb-4 bg-yellow-50 p-3 rounded-md border border-yellow-100">
            <div className="mr-2 text-yellow-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-yellow-800">
              <span className="font-medium">What are multipliers?</span> These values adjust the impact of each performance score. 
              A multiplier of 1.0 means the score is used as-is. Values above 1.0 increase the impact, while values below 1.0 decrease it.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-md border border-gray-300">
              <div className="flex justify-between items-center mb-2">
                <label className="font-semibold text-gray-800">
                  Investment Score Multiplier
                </label>
                <span className="text-lg font-bold text-blue-600">{parameters.investmentScoreMultiplier.toFixed(2)}×</span>
              </div>
              
              <div className="mb-2">
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={parameters.investmentScoreMultiplier}
                    onChange={(e) => handleChange('investmentScoreMultiplier', Number(e.target.value))}
                    className="w-full mr-2"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 px-1">
                  <span>0.5×</span>
                  <span>1.0×</span>
                  <span>1.5×</span>
                </div>
              </div>
              
              <div className="flex items-center mt-3">
                <span className="text-sm text-gray-700 mr-2">Precise value:</span>
                <div className="flex items-center bg-gray-100 px-2 py-1 rounded">
                  <input
                    type="number"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={parameters.investmentScoreMultiplier.toFixed(2)}
                    onChange={(e) => handleChange('investmentScoreMultiplier', Number(e.target.value))}
                    className={`w-16 p-1 text-right bg-gray-100 focus:outline-none ${errors.investmentScoreMultiplier ? 'text-red-500' : 'text-gray-800'}`}
                  />
                  <span className="ml-1">×</span>
                </div>
              </div>
              
              <div className="mt-3 bg-gray-100 p-2 rounded">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Effect:</span> Investment scores will be 
                  {parameters.investmentScoreMultiplier > 1 ? 
                    <span className="text-green-600 font-medium"> increased by {((parameters.investmentScoreMultiplier - 1) * 100).toFixed(0)}%</span> : 
                    parameters.investmentScoreMultiplier < 1 ? 
                    <span className="text-red-600 font-medium"> reduced by {((1 - parameters.investmentScoreMultiplier) * 100).toFixed(0)}%</span> : 
                    <span className="text-gray-600 font-medium"> unchanged</span>}
                </p>
              </div>
              
              {errors.investmentScoreMultiplier && (
                <p className="text-red-500 text-sm mt-1 font-medium">{errors.investmentScoreMultiplier}</p>
              )}
            </div>
            
            <div className="bg-white p-4 rounded-md border border-gray-300">
              <div className="flex justify-between items-center mb-2">
                <label className="font-semibold text-gray-800">
                  Qualitative Score Multiplier
                </label>
                <span className="text-lg font-bold text-blue-600">{parameters.qualScoreMultiplier.toFixed(2)}×</span>
              </div>
              
              <div className="mb-2">
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={parameters.qualScoreMultiplier}
                    onChange={(e) => handleChange('qualScoreMultiplier', Number(e.target.value))}
                    className="w-full mr-2"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 px-1">
                  <span>0.5×</span>
                  <span>1.0×</span>
                  <span>1.5×</span>
                </div>
              </div>
              
              <div className="flex items-center mt-3">
                <span className="text-sm text-gray-700 mr-2">Precise value:</span>
                <div className="flex items-center bg-gray-100 px-2 py-1 rounded">
                  <input
                    type="number"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={parameters.qualScoreMultiplier.toFixed(2)}
                    onChange={(e) => handleChange('qualScoreMultiplier', Number(e.target.value))}
                    className={`w-16 p-1 text-right bg-gray-100 focus:outline-none ${errors.qualScoreMultiplier ? 'text-red-500' : 'text-gray-800'}`}
                  />
                  <span className="ml-1">×</span>
                </div>
              </div>
              
              <div className="mt-3 bg-gray-100 p-2 rounded">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Effect:</span> Qualitative scores will be 
                  {parameters.qualScoreMultiplier > 1 ? 
                    <span className="text-green-600 font-medium"> increased by {((parameters.qualScoreMultiplier - 1) * 100).toFixed(0)}%</span> : 
                    parameters.qualScoreMultiplier < 1 ? 
                    <span className="text-red-600 font-medium"> reduced by {((1 - parameters.qualScoreMultiplier) * 100).toFixed(0)}%</span> : 
                    <span className="text-gray-600 font-medium"> unchanged</span>}
                </p>
              </div>
              
              {errors.qualScoreMultiplier && (
                <p className="text-red-500 text-sm mt-1 font-medium">{errors.qualScoreMultiplier}</p>
              )}
            </div>
          </div>
          
          <div className="mt-4 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded border border-blue-100">
            <span className="font-medium">Recommendation:</span> Values between 0.8 and 1.2 for balanced adjustments
          </div>
        </div>
        
        {/* REVENUE ADJUSTMENT FACTOR (RAF) SECTION */}
        <div className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-3 text-blue-700">Revenue Adjustment Factor (RAF)</h3>
          
          <div className="flex items-center mb-4 bg-green-50 p-3 rounded-md border border-green-100">
            <div className="mr-2 text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-green-800 font-medium">
              RAF is used to adjust bonuses based on revenue performance. A value of 1.0 means no adjustment, values below 1.0 reduce bonuses, and values above 1.0 increase bonuses.
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-md border border-gray-300 mb-6">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="useDirectRaf"
                checked={parameters.useDirectRaf}
                onChange={(e) => handleChange('useDirectRaf', e.target.checked)}
                className="mr-3 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <label htmlFor="useDirectRaf" className="text-md font-semibold text-gray-800 block">
                  Use RAF values from input data when available
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  When checked, individual RAF values from the uploaded file will be used instead of the default
                </p>
              </div>
            </div>
            <div className="ml-8 mt-2 bg-blue-50 p-2 rounded inline-block">
              <span className="text-sm text-blue-700 font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Recommended: Use direct RAF when available for more accurate results
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-4 rounded-md border border-gray-300">
              <div className="flex justify-between items-center mb-2">
                <label className="font-semibold text-gray-800">
                  Default RAF Value
                </label>
                <span className="text-lg font-bold text-blue-600">{parameters.raf.toFixed(1)}</span>
              </div>
              
              <div className="mb-2">
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={parameters.raf}
                    onChange={(e) => handleChange('raf', Number(e.target.value))}
                    className={`w-full mr-2 ${parameters.useDirectRaf ? 'opacity-50' : ''}`}
                    disabled={parameters.useDirectRaf}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 px-1">
                  <span>0.0</span>
                  <span>1.0</span>
                  <span>2.0</span>
                </div>
              </div>
              
              <div className="flex items-center mt-3">
                <span className="text-sm text-gray-700 mr-2">Precise value:</span>
                <div className="flex items-center bg-gray-100 px-2 py-1 rounded">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={parameters.raf.toFixed(1)}
                    onChange={(e) => handleChange('raf', Number(e.target.value))}
                    className={`w-16 p-1 text-right bg-gray-100 focus:outline-none ${errors.raf ? 'text-red-500' : 'text-gray-800'} ${parameters.useDirectRaf ? 'opacity-50' : ''}`}
                    disabled={parameters.useDirectRaf}
                  />
                </div>
              </div>
              
              <div className="mt-3 bg-gray-100 p-2 rounded">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Effect:</span> This value is used when RAF is not provided in the input data
                </p>
              </div>
              
              {errors.raf && (
                <p className="text-red-500 text-sm mt-1 font-medium">{errors.raf}</p>
              )}
            </div>
            
            <div className="bg-white p-4 rounded-md border border-gray-300">
              <div className="flex justify-between items-center mb-2">
                <label className="font-semibold text-gray-800">
                  RAF Sensitivity
                </label>
                <span className="text-lg font-bold text-blue-600">{(parameters.rafSensitivity !== undefined ? parameters.rafSensitivity : 0.2).toFixed(1)}</span>
              </div>
              
              <div className="mb-2">
                <div className="flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={parameters.rafSensitivity !== undefined ? parameters.rafSensitivity : 0.2}
                    onChange={(e) => handleChange('rafSensitivity', Number(e.target.value))}
                    className={`w-full mr-2 ${parameters.useDirectRaf ? 'opacity-50' : ''}`}
                    disabled={parameters.useDirectRaf}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 px-1">
                  <span>0.0 (None)</span>
                  <span>0.5 (Medium)</span>
                  <span>1.0 (High)</span>
                </div>
              </div>
              
              <div className="flex items-center mt-3">
                <span className="text-sm text-gray-700 mr-2">Precise value:</span>
                <div className="flex items-center bg-gray-100 px-2 py-1 rounded">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={(parameters.rafSensitivity !== undefined ? parameters.rafSensitivity : 0.2).toFixed(1)}
                    onChange={(e) => handleChange('rafSensitivity', Number(e.target.value))}
                    className={`w-16 p-1 text-right bg-gray-100 focus:outline-none ${errors.rafSensitivity ? 'text-red-500' : 'text-gray-800'} ${parameters.useDirectRaf ? 'opacity-50' : ''}`}
                    disabled={parameters.useDirectRaf}
                  />
                </div>
              </div>
              
              <div className="mt-3 bg-gray-100 p-2 rounded">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Effect:</span> Controls how strongly RAF affects the final bonus amount
                </p>
              </div>
              
              {errors.rafSensitivity && (
                <p className="text-red-500 text-sm mt-1 font-medium">{errors.rafSensitivity}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-md border border-gray-300">
              <div className="flex justify-between items-center mb-2">
                <label className="font-semibold text-gray-800">
                  RAF Lower Clamp
                </label>
                <span className="text-lg font-bold text-blue-600">{(parameters.rafLowerClamp !== undefined ? parameters.rafLowerClamp : 0).toFixed(1)}</span>
              </div>
              
              <div className="flex items-center mt-3">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={(parameters.rafLowerClamp !== undefined ? parameters.rafLowerClamp : 0).toFixed(1)}
                  onChange={(e) => handleChange('rafLowerClamp', Number(e.target.value))}
                  className={`w-full p-2 border rounded ${errors.rafLowerClamp ? 'border-red-300 text-red-600' : 'border-gray-300 text-gray-800'} ${parameters.useDirectRaf ? 'opacity-50' : ''}`}
                  disabled={parameters.useDirectRaf}
                />
              </div>
              
              <div className="mt-3 bg-gray-100 p-2 rounded">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Effect:</span> Minimum RAF value that can be applied
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  <span className="font-medium">Recommended:</span> 0.0 - 0.5
                </p>
              </div>
              
              {errors.rafLowerClamp && (
                <p className="text-red-500 text-sm mt-1 font-medium">{errors.rafLowerClamp}</p>
              )}
            </div>
            
            <div className="bg-white p-4 rounded-md border border-gray-300">
              <div className="flex justify-between items-center mb-2">
                <label className="font-semibold text-gray-800">
                  RAF Upper Clamp
                </label>
                <span className="text-lg font-bold text-blue-600">{(parameters.rafUpperClamp !== undefined ? parameters.rafUpperClamp : 1.5).toFixed(1)}</span>
              </div>
              
              <div className="flex items-center mt-3">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={(parameters.rafUpperClamp !== undefined ? parameters.rafUpperClamp : 1.5).toFixed(1)}
                  onChange={(e) => handleChange('rafUpperClamp', Number(e.target.value))}
                  className={`w-full p-2 border rounded ${errors.rafUpperClamp ? 'border-red-300 text-red-600' : 'border-gray-300 text-gray-800'} ${parameters.useDirectRaf ? 'opacity-50' : ''}`}
                  disabled={parameters.useDirectRaf}
                />
              </div>
              
              <div className="mt-3 bg-gray-100 p-2 rounded">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Effect:</span> Maximum RAF value that can be applied
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  <span className="font-medium">Recommended:</span> 1.5 - 2.0
                </p>
              </div>
              
              {errors.rafUpperClamp && (
                <p className="text-red-500 text-sm mt-1 font-medium">{errors.rafUpperClamp}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* BONUS CAPPING SECTION */}
      <div className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-3 text-blue-700">Bonus Capping</h3>
        
        <div className="flex items-center mb-4 bg-green-50 p-3 rounded-md border border-green-100">
          <div className="mr-2 text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm text-green-800 font-medium">
            These settings control the maximum bonus amounts that can be awarded to employees, ensuring compliance with regulatory requirements and budget constraints.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-md border border-gray-300">
            <div className="flex justify-between items-center mb-2">
              <label className="font-semibold text-gray-800">
                Cap for Material Risk Takers
              </label>
              <span className="text-lg font-bold text-blue-600">{(parameters.mrtCapPct !== undefined ? parameters.mrtCapPct : 0)}%</span>
            </div>
            
            <div className="mb-2">
              <div className="flex items-center">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={parameters.mrtCapPct !== undefined ? parameters.mrtCapPct : 0}
                  onChange={(e) => handleChange('mrtCapPct', Number(e.target.value))}
                  className="w-full mr-2"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 px-1">
                <span>0%</span>
                <span>2.5%</span>
                <span>5.0%</span>
              </div>
            </div>
            
            <div className="flex items-center mt-3">
              <span className="text-sm text-gray-700 mr-2">Precise value:</span>
              <div className="flex items-center bg-gray-100 px-2 py-1 rounded">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={(parameters.mrtCapPct !== undefined ? parameters.mrtCapPct : 0) * 100}
                  onChange={(e) => handleChange('mrtCapPct', Number(e.target.value) / 100)}
                  className={`w-16 p-1 text-right bg-gray-100 focus:outline-none ${errors.mrtCapPct ? 'text-red-500' : 'text-gray-800'}`}
                />
                <span className="ml-1 text-gray-700">%</span>
              </div>
            </div>
            
            <div className="mt-3 bg-gray-100 p-2 rounded">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Effect:</span> Cap for Material Risk Takers as a percentage of base salary
              </p>
              <p className="text-xs text-blue-600 mt-1">
                <span className="font-medium">Recommended:</span> 1.5-3.0% (standard industry practice)
              </p>
            </div>
            
            {errors.mrtCapPct && (
              <p className="text-red-500 text-sm mt-1 font-medium">{errors.mrtCapPct}</p>
            )}
          </div>
          
          <div className="bg-white p-4 rounded-md border border-gray-300">
            <div className="flex justify-between items-center mb-2">
              <label className="font-semibold text-gray-800">
                Base Salary Cap Multiplier
              </label>
              <span className="text-lg font-bold text-blue-600">{(parameters.baseSalaryCapMultiplier !== undefined ? parameters.baseSalaryCapMultiplier : 3.0).toFixed(1)}×</span>
            </div>
            
            <div className="mb-2">
              <div className="flex items-center">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={parameters.baseSalaryCapMultiplier !== undefined ? parameters.baseSalaryCapMultiplier : 3.0}
                  onChange={(e) => handleChange('baseSalaryCapMultiplier', Number(e.target.value))}
                  className="w-full mr-2"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 px-1">
                <span>1.0×</span>
                <span>5.0×</span>
                <span>10.0×</span>
              </div>
            </div>
            
            <div className="flex items-center mt-3">
              <span className="text-sm text-gray-700 mr-2">Precise value:</span>
              <div className="flex items-center bg-gray-100 px-2 py-1 rounded">
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={parameters.baseSalaryCapMultiplier !== undefined ? parameters.baseSalaryCapMultiplier : 3.0}
                  onChange={(e) => handleChange('baseSalaryCapMultiplier', Number(e.target.value))}
                  className={`w-16 p-1 text-right bg-gray-100 focus:outline-none ${errors.baseSalaryCapMultiplier ? 'text-red-500' : 'text-gray-800'}`}
                />
                <span className="ml-1 text-gray-700">×</span>
              </div>
            </div>
            
            <div className="mt-3 bg-gray-100 p-2 rounded">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Effect:</span> Maximum bonus as a multiple of base salary
              </p>
              <p className="text-xs text-blue-600 mt-1">
                <span className="font-medium">Recommended:</span> 2.0-4.0× (standard industry practice)
              </p>
            </div>
            
            {errors.baseSalaryCapMultiplier && (
              <p className="text-red-500 text-sm mt-1 font-medium">{errors.baseSalaryCapMultiplier}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* BONUS POOL SECTION */}
      <div className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-3 text-blue-700">Bonus Pool Settings</h3>
        
        <div className="flex items-center mb-4 bg-green-50 p-3 rounded-md border border-green-100">
          <div className="mr-2 text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm text-green-800 font-medium">
            Set a total bonus pool limit to ensure the sum of all bonuses doesn't exceed your budget. Individual bonuses will be adjusted proportionally if the calculated total exceeds the pool limit.
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-md border border-gray-300 mb-6">
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="useBonusPoolLimit"
              checked={parameters.useBonusPoolLimit}
              onChange={(e) => handleChange('useBonusPoolLimit', e.target.checked)}
              className="mr-3 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <div>
              <label htmlFor="useBonusPoolLimit" className="text-md font-semibold text-gray-800 block">
                Enable Bonus Pool Limit
              </label>
              <p className="text-sm text-gray-600 mt-1">
                When enabled, all calculated bonuses will be scaled to fit within the total bonus pool
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-md border border-gray-300">
          <div className="flex justify-between items-center mb-2">
            <label className="font-semibold text-gray-800">
              Total Bonus Pool
            </label>
            <span className="text-lg font-bold text-blue-600">
              £{(parameters.totalBonusPool !== undefined ? parameters.totalBonusPool : 1000000).toLocaleString()}
            </span>
          </div>
          
          <div className="flex items-center mt-3">
            <span className="text-sm text-gray-700 mr-2">Pool amount:</span>
            <div className="flex items-center bg-gray-100 px-2 py-1 rounded flex-grow">
              <span className="text-gray-700 mr-1">£</span>
              <input
                type="number"
                min="0"
                step="10000"
                value={parameters.totalBonusPool !== undefined ? parameters.totalBonusPool : 1000000}
                onChange={(e) => handleChange('totalBonusPool', Number(e.target.value))}
                className={`w-full p-1 text-right bg-gray-100 focus:outline-none ${parameters.useBonusPoolLimit ? 'text-blue-600 font-medium' : 'text-gray-400'} ${errors.totalBonusPool ? 'text-red-500' : ''}`}
                disabled={!parameters.useBonusPoolLimit}
              />
            </div>
          </div>
          
          <div className="mt-3 bg-gray-100 p-2 rounded">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Effect:</span> {parameters.useBonusPoolLimit ? 'All bonuses will be scaled proportionally to fit within this pool amount' : 'No limit applied - bonuses will be calculated based on individual performance only'}
            </p>
          </div>
          
          {errors.totalBonusPool && (
            <p className="text-red-500 text-sm mt-1 font-medium">{errors.totalBonusPool}</p>
          )}
        </div>

        {/* REVENUE BANDING SECTION */}
        <div className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-3 text-blue-700">Revenue Banding (Team Multiplier)</h3>

          <div className="bg-white p-4 rounded-md border border-gray-300 mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useRevenueBanding"
                checked={!!parameters.useRevenueBanding}
                onChange={(e) => setParamValue('useRevenueBanding', e.target.checked)}
                className="mr-3 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <label htmlFor="useRevenueBanding" className="text-md font-semibold text-gray-800 block">
                  Use revenue banding to adjust team bonus pool
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Applies a band-based multiplier derived from 3-year revenue momentum, consistency, and optional peer context.
                </p>
              </div>
            </div>
          </div>

          {parameters.useRevenueBanding && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-md border border-gray-300">
                <label className="block text-sm font-medium text-gray-700 mb-2">Team</label>
                <select
                  className={`w-full border rounded p-2 ${errors.teamId ? 'border-red-300 text-red-600' : 'border-gray-300'}`}
                  value={parameters.teamId || ''}
                  onChange={(e) => setParamValue('teamId', e.target.value || undefined)}
                >
                  <option value="">Select a team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {errors.teamId && <p className="text-red-500 text-sm mt-1 font-medium">{errors.teamId}</p>}
              </div>

              <div className="bg-white p-4 rounded-md border border-gray-300">
                <label className="block text-sm font-medium text-gray-700 mb-2">Banding Config (optional)</label>
                <select
                  className="w-full border rounded p-2 border-gray-300"
                  value={parameters.bandConfigId || ''}
                  onChange={(e) => setParamValue('bandConfigId', e.target.value || undefined)}
                >
                  <option value="">Default configuration</option>
                  {bandConfigs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-white p-4 rounded-md border border-gray-300">
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                {bandLoading && <p className="text-sm text-gray-600">Loading preview...</p>}
                {bandError && <p className="text-sm text-red-600">{bandError}</p>}
                {!bandLoading && !bandError && bandPreview && (
                  <div className="text-sm text-gray-800">
                    <p><span className="font-medium">Band:</span> {bandPreview.band}</p>
                    <p><span className="font-medium">Multiplier:</span> {bandPreview.multiplier.toFixed(2)}×</p>
                    <p><span className="font-medium">Composite:</span> {bandPreview.composite_score.toFixed(1)}</p>
                  </div>
                )}
                {!bandLoading && !bandError && !bandPreview && (
                  <p className="text-sm text-gray-500">Select a team to see preview.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
          </div>
        )}
      
      <div className="flex justify-end mt-6 space-x-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        
        <button
          type="submit"
          className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 ${
            Object.keys(errors).length > 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={Object.keys(errors).length > 0}
        >
          Apply Parameters
        </button>
      </div>
      
      {/* Parameter Presets */}
      <ParameterPresets
        onSelectPreset={(presetParams) => {
          if (useCategoryBased) {
            setCategoryBasedParameters(prev => ({
              ...prev,
              defaultParameters: presetParams
            }));
          } else {
            setUniversalParameters(presetParams);
          }
        }}
        onSavePreset={(preset) => {
          // In a real implementation, this would save to the backend
          console.log('Saving preset:', preset);
        }}
        currentParameters={useCategoryBased ? categoryBasedParameters.defaultParameters : universalParameters}
      />
    </form>
  </div>
);
};

export default BatchParameterConfig;
