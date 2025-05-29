import React, { useState, useEffect, useMemo } from 'react';
import { 
  listScenarios, 
  getScenario,
  type ScenarioData, 
  type ScenarioListResponse 
} from '../../services/scenarioService';
import { BatchParameters } from '../batch/BatchParameterConfig';

interface ScenarioComparisonProps {
  sessionId: string;
  onError?: (error: string) => void;
  onBack?: () => void;
}

interface ParameterDifference {
  field: string;
  label: string;
  values: Record<string, number | boolean | string | undefined>;
  isDifferent: boolean;
}

export const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({
  sessionId,
  onError,
  onBack
}) => {
  const [availableScenarios, setAvailableScenarios] = useState<ScenarioData[]>([]);
  const [selectedScenarios, setSelectedScenarios] = useState<ScenarioData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available scenarios on component mount
  useEffect(() => {
    loadScenarios();
  }, [sessionId]);

  const loadScenarios = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response: ScenarioListResponse = await listScenarios(sessionId);
      setAvailableScenarios(response.scenarios);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load scenarios';
      console.error('Error loading scenarios:', err);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle scenario selection/deselection
  const handleScenarioToggle = async (scenario: ScenarioData) => {
    const isSelected = selectedScenarios.some(s => s.id === scenario.id);
    
    if (isSelected) {
      // Remove from selection
      setSelectedScenarios(prev => prev.filter(s => s.id !== scenario.id));
    } else {
      // Add to selection - limit to 4 scenarios for better UI
      if (selectedScenarios.length >= 4) {
        setError('Maximum of 4 scenarios can be compared at once');
        return;
      }
      
      setIsLoadingDetails(true);
      try {
        // Load full scenario details
        const fullScenario = await getScenario(scenario.id, false);
        setSelectedScenarios(prev => [...prev, fullScenario]);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load scenario details';
        console.error('Error loading scenario details:', err);
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoadingDetails(false);
      }
    }
  };

  // Calculate comparison metrics for each scenario
  const scenarioMetrics = useMemo(() => {
    return selectedScenarios.map(scenario => {
      const employees = scenario.employees || [];
      const totalEmployees = employees.length;
      
      if (totalEmployees === 0) {
        return {
          scenarioId: scenario.id,
          totalBonusPool: 0,
          averageBonusPerEmployee: 0,
          totalEmployees: 0,
          highestBonus: 0,
          lowestBonus: 0,
          budgetUtilization: 0
        };
      }

      // Calculate bonuses from employee data
      const bonuses = employees.map(emp => {
        const calculationResult = emp.calculation_result;
        return calculationResult?.calculated_bonus || 0;
      });

      const totalBonusPool = bonuses.reduce((sum, bonus) => sum + bonus, 0);
      const averageBonusPerEmployee = totalBonusPool / totalEmployees;
      const highestBonus = Math.max(...bonuses);
      const lowestBonus = Math.min(...bonuses);
      
      // Calculate budget utilization based on parameters
      const parameters = scenario.parameters as BatchParameters;
      const targetPool = parameters.totalBonusPool || 0;
      const budgetUtilization = targetPool > 0 ? (totalBonusPool / targetPool) * 100 : 0;

      return {
        scenarioId: scenario.id,
        totalBonusPool,
        averageBonusPerEmployee,
        totalEmployees,
        highestBonus,
        lowestBonus,
        budgetUtilization
      };
    });
  }, [selectedScenarios]);

  // Calculate parameter differences
  const parameterDifferences = useMemo(() => {
    if (selectedScenarios.length < 2) return [];

    const parameterLabels: Record<string, string> = {
      targetBonusPct: 'Target Bonus %',
      investmentWeight: 'Investment Weight',
      qualitativeWeight: 'Qualitative Weight',
      investmentScoreMultiplier: 'Investment Score Multiplier',
      qualScoreMultiplier: 'Qualitative Score Multiplier',
      raf: 'RAF',
      rafSensitivity: 'RAF Sensitivity',
      rafLowerClamp: 'RAF Lower Clamp',
      rafUpperClamp: 'RAF Upper Clamp',
      mrtCapPct: 'MRT Cap %',
      useDirectRaf: 'Use Direct RAF',
      baseSalaryCapMultiplier: 'Base Salary Cap Multiplier',
      totalBonusPool: 'Total Bonus Pool',
      useBonusPoolLimit: 'Use Bonus Pool Limit'
    };

    const differences: ParameterDifference[] = [];

    Object.keys(parameterLabels).forEach(field => {
      const values: Record<string, number | boolean | string | undefined> = {};
      let isDifferent = false;
      let firstValue: any = undefined;

      selectedScenarios.forEach(scenario => {
        const parameters = scenario.parameters as BatchParameters;
        const value = parameters[field as keyof BatchParameters];
        values[scenario.id] = value;

        if (firstValue === undefined) {
          firstValue = value;
        } else if (firstValue !== value) {
          isDifferent = true;
        }
      });

      differences.push({
        field,
        label: parameterLabels[field],
        values,
        isDifferent
      });
    });

    return differences;
  }, [selectedScenarios]);

  // Export comparison to CSV
  const exportComparison = () => {
    if (selectedScenarios.length === 0) return;

    const csvContent = generateComparisonCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `scenario_comparison_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const generateComparisonCSV = () => {
    const headers = ['Metric', ...selectedScenarios.map(s => s.name)];
    const rows = [headers.join(',')];

    // Add metric rows
    if (scenarioMetrics.length > 0) {
      rows.push(['Total Bonus Pool', ...scenarioMetrics.map(m => m.totalBonusPool.toFixed(2))].join(','));
      rows.push(['Average Bonus per Employee', ...scenarioMetrics.map(m => m.averageBonusPerEmployee.toFixed(2))].join(','));
      rows.push(['Total Employees', ...scenarioMetrics.map(m => m.totalEmployees.toString())].join(','));
      rows.push(['Highest Bonus', ...scenarioMetrics.map(m => m.highestBonus.toFixed(2))].join(','));
      rows.push(['Lowest Bonus', ...scenarioMetrics.map(m => m.lowestBonus.toFixed(2))].join(','));
      rows.push(['Budget Utilization %', ...scenarioMetrics.map(m => m.budgetUtilization.toFixed(1))].join(','));
    }

    // Add parameter differences
    rows.push(''); // Empty row
    rows.push(['Parameters', ...selectedScenarios.map(s => s.name)].join(','));
    
    parameterDifferences.forEach(diff => {
      const row: string[] = [
        diff.label,
        ...selectedScenarios.map(scenario => {
          const value = diff.values[scenario.id];
          if (typeof value === 'boolean') return value ? 'Yes' : 'No';
          if (typeof value === 'number') return value.toString();
          return value?.toString() || '';
        })
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatValue = (value: number | boolean | string | undefined, field: string) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      if (field.includes('Pct') || field.includes('Weight') || field.includes('Sensitivity')) {
        return formatPercentage(value);
      }
      if (field.includes('Pool') || field.includes('Bonus')) {
        return formatCurrency(value);
      }
      return value.toFixed(2);
    }
    return value?.toString() || '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Scenario Comparison</h2>
            <p className="text-gray-600 mt-2">
              Compare multiple scenarios side by side to analyze parameter differences and impact.
            </p>
          </div>
          <div className="flex space-x-3">
            {selectedScenarios.length > 0 && (
              <button
                onClick={exportComparison}
                className="px-4 py-2 text-green-600 border border-green-600 rounded hover:bg-green-50 transition-colors"
              >
                Export CSV
              </button>
            )}
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Scenario Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Select Scenarios to Compare (Max 4)</h3>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-700">Loading scenarios...</span>
          </div>
        ) : availableScenarios.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No scenarios found for comparison.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableScenarios.map(scenario => {
              const isSelected = selectedScenarios.some(s => s.id === scenario.id);
              return (
                <div
                  key={scenario.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleScenarioToggle(scenario)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{scenario.name}</h4>
                      {scenario.description && (
                        <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        <span>Created: {new Date(scenario.created_at).toLocaleDateString()}</span>
                        {scenario.employee_count && (
                          <>
                            <span className="mx-2">•</span>
                            <span>{scenario.employee_count} employees</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="ml-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent div onClick
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {isLoadingDetails && (
          <div className="flex items-center justify-center p-4 mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-700">Loading scenario details...</span>
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {selectedScenarios.length >= 2 && (
        <div className="space-y-6">
          {/* Key Metrics Comparison */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Key Metrics Comparison</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metric
                    </th>
                    {selectedScenarios.map(scenario => (
                      <th
                        key={scenario.id}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {scenario.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Total Bonus Pool
                    </td>
                    {scenarioMetrics.map(metrics => (
                      <td key={metrics.scenarioId} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(metrics.totalBonusPool)}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Average Bonus per Employee
                    </td>
                    {scenarioMetrics.map(metrics => (
                      <td key={metrics.scenarioId} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(metrics.averageBonusPerEmployee)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Total Employees
                    </td>
                    {scenarioMetrics.map(metrics => (
                      <td key={metrics.scenarioId} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {metrics.totalEmployees.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Highest Bonus
                    </td>
                    {scenarioMetrics.map(metrics => (
                      <td key={metrics.scenarioId} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(metrics.highestBonus)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Lowest Bonus
                    </td>
                    {scenarioMetrics.map(metrics => (
                      <td key={metrics.scenarioId} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(metrics.lowestBonus)}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Budget Utilization
                    </td>
                    {scenarioMetrics.map(metrics => (
                      <td key={metrics.scenarioId} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`${
                          metrics.budgetUtilization > 100 ? 'text-red-600' :
                          metrics.budgetUtilization > 90 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {metrics.budgetUtilization.toFixed(1)}%
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Parameter Differences */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Parameter Differences</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parameter
                    </th>
                    {selectedScenarios.map(scenario => (
                      <th
                        key={scenario.id}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {scenario.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parameterDifferences.map((diff, index) => (
                    <tr 
                      key={diff.field}
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                        diff.isDifferent ? 'border-l-4 border-yellow-400' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          {diff.label}
                          {diff.isDifferent && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Different
                            </span>
                          )}
                        </div>
                      </td>
                      {selectedScenarios.map(scenario => (
                        <td 
                          key={scenario.id} 
                          className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                            diff.isDifferent ? 'font-medium' : ''
                          }`}
                        >
                          {formatValue(diff.values[scenario.id], diff.field)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p className="flex items-center">
                <span className="inline-block w-4 h-0.5 bg-yellow-400 mr-2"></span>
                Parameters highlighted with "Different" vary between scenarios
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedScenarios.length === 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">Select at least 2 scenarios to start comparison.</p>
            <p className="text-sm text-gray-400 mt-1">
              You have selected 1 scenario. Choose one more to see the comparison.
            </p>
          </div>
        </div>
      )}

      {selectedScenarios.length === 0 && !isLoading && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">No scenarios selected for comparison.</p>
            <p className="text-sm text-gray-400 mt-1">
              Select scenarios from the list above to compare their parameters and results.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}; 