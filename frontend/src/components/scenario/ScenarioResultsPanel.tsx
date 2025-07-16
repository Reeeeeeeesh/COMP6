import React, { useState, useEffect, useMemo } from 'react';
import { BatchParameters } from '../batch/BatchParameterConfig';
import { calculateBonus } from '../../utils/calculationEngine';

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

interface ScenarioResultsPanelProps {
  employees: EmployeeData[];
  currentParameters: BatchParameters;
  originalParameters: BatchParameters;
  isCalculating?: boolean;
  onSummaryUpdate?: (currentSummary: CalculationSummary, originalSummary: CalculationSummary | null, calculationTime: number) => void;
}

interface CalculationSummary {
  totalEmployees: number;
  totalBonusPool: number;
  avgBonusAmount: number;
  avgBonusPercentage: number;
  medianBonusAmount: number;
  cappedEmployees: number;
  mrtEmployees: number;
  mrtCappedEmployees: number;
  departmentBreakdown: Record<string, {
    count: number;
    totalBonus: number;
    avgBonus: number;
    avgSalary: number;
  }>;
  bonusDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
}

export const ScenarioResultsPanel: React.FC<ScenarioResultsPanelProps> = ({
  employees,
  currentParameters,
  originalParameters,
  isCalculating = false,
  onSummaryUpdate
}) => {
  const [currentSummary, setCurrentSummary] = useState<CalculationSummary | null>(null);
  const [originalSummary, setOriginalSummary] = useState<CalculationSummary | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const [lastCalculationTime, setLastCalculationTime] = useState<number | null>(null);

  // Calculate summary statistics for a given set of parameters
  const calculateSummary = useMemo(() => {
    return (employees: EmployeeData[], parameters: BatchParameters): CalculationSummary => {
      const startTime = performance.now();
      
      // Batch process employees in chunks for better performance
      const chunkSize = 1000;
      const chunks = [];
      for (let i = 0; i < employees.length; i += chunkSize) {
        chunks.push(employees.slice(i, i + chunkSize));
      }
      
      let allCalculations: any[] = [];
      
      // Process each chunk
      chunks.forEach((chunk, chunkIndex) => {
        const chunkCalculations = chunk.map(employee => {
          const salary = employee.employee_data?.salary || 0;
          const investmentScore = parseFloat(employee.employee_data?.additional_data?.investment_score || '1');
          const qualitativeScore = parseFloat(employee.employee_data?.additional_data?.qualitative_score || '1');
          const rafValue = employee.employee_data?.additional_data?.raf 
            ? parseFloat(employee.employee_data.additional_data.raf) 
            : parameters.raf;
          const isMRT = employee.employee_data?.additional_data?.is_mrt === 'true';

          if (!salary) return null;

          try {
            const result = calculateBonus(
              salary,
              parameters.targetBonusPct,
              parameters.investmentWeight,
              investmentScore * (parameters.investmentScoreMultiplier || 1),
              parameters.qualitativeWeight,
              qualitativeScore * (parameters.qualScoreMultiplier || 1),
              parameters.useDirectRaf && rafValue ? rafValue : parameters.raf,
              isMRT,
              parameters.mrtCapPct
            );

            return {
              employee,
              result,
              salary,
              isMRT,
              department: employee.employee_data?.department || 'Unknown'
            };
          } catch (error) {
            console.error('Error calculating bonus for employee:', employee.employee_data?.employee_id, error);
            return null;
          }
        }).filter(Boolean);
        
        allCalculations = allCalculations.concat(chunkCalculations);
        
        // Update progress for large datasets
        if (employees.length > 5000) {
          const progress = ((chunkIndex + 1) / chunks.length) * 100;
          setCalculationProgress(progress);
        }
      });

      const calculations = allCalculations;
      const endTime = performance.now();
      setLastCalculationTime(endTime - startTime);

      const totalEmployees = calculations.length;
      const totalBonusPool = calculations.reduce((sum, calc) => sum + (calc!.result.finalBonus || 0), 0);
      const bonusAmounts = calculations.map(calc => calc!.result.finalBonus || 0).sort((a, b) => a - b);
             const cappedEmployees = calculations.filter(calc => calc!.result.capApplied !== null).length;
       const mrtEmployees = calculations.filter(calc => calc!.isMRT).length;
       const mrtCappedEmployees = calculations.filter(calc => calc!.isMRT && calc!.result.capApplied !== null).length;

      // Department breakdown
      const departmentBreakdown: Record<string, {count: number; totalBonus: number; avgBonus: number; avgSalary: number;}> = {};
      calculations.forEach(calc => {
        const dept = calc!.department;
        if (!departmentBreakdown[dept]) {
          departmentBreakdown[dept] = { count: 0, totalBonus: 0, avgBonus: 0, avgSalary: 0 };
        }
        departmentBreakdown[dept].count += 1;
        departmentBreakdown[dept].totalBonus += calc!.result.finalBonus || 0;
      });

      // Calculate averages for departments
      Object.keys(departmentBreakdown).forEach(dept => {
        const deptCalcs = calculations.filter(calc => calc!.department === dept);
        departmentBreakdown[dept].avgBonus = departmentBreakdown[dept].totalBonus / departmentBreakdown[dept].count;
        departmentBreakdown[dept].avgSalary = deptCalcs.reduce((sum, calc) => sum + calc!.salary, 0) / deptCalcs.length;
      });

      // Bonus distribution ranges
      const ranges = [
        { min: 0, max: 10000, label: '£0 - £10k' },
        { min: 10000, max: 25000, label: '£10k - £25k' },
        { min: 25000, max: 50000, label: '£25k - £50k' },
        { min: 50000, max: 100000, label: '£50k - £100k' },
        { min: 100000, max: Infinity, label: '£100k+' }
      ];

      const bonusDistribution = ranges.map(range => {
        const count = bonusAmounts.filter(amount => amount >= range.min && amount < range.max).length;
        return {
          range: range.label,
          count,
          percentage: (count / totalEmployees) * 100
        };
      });

      return {
        totalEmployees,
        totalBonusPool,
        avgBonusAmount: totalBonusPool / totalEmployees,
        avgBonusPercentage: calculations.reduce((sum, calc) => 
          sum + ((calc!.result.finalBonus || 0) / calc!.salary * 100), 0) / totalEmployees,
        medianBonusAmount: bonusAmounts[Math.floor(bonusAmounts.length / 2)] || 0,
        cappedEmployees,
        mrtEmployees,
        mrtCappedEmployees,
        departmentBreakdown,
        bonusDistribution
      };
    };
  }, []);

  // Calculate current summary when parameters change
  useEffect(() => {
    if (employees.length === 0) return;

    setCalculating(true);
    setCalculationProgress(0);
    
    // Use setTimeout to make calculation asynchronous and show loading state
    const timeoutId = setTimeout(() => {
      try {
        const summary = calculateSummary(employees, currentParameters);
        setCurrentSummary(summary);
      } catch (error) {
        console.error('Error calculating current summary:', error);
      } finally {
        setCalculating(false);
        setCalculationProgress(100);
      }
    }, 50); // Shorter delay for more responsive feel

    return () => clearTimeout(timeoutId);
  }, [employees, currentParameters, calculateSummary]);

  // Calculate original summary once
  useEffect(() => {
    if (employees.length === 0 || originalSummary) return;

    try {
      const summary = calculateSummary(employees, originalParameters);
      setOriginalSummary(summary);
    } catch (error) {
      console.error('Error calculating original summary:', error);
    }
  }, [employees, originalParameters, calculateSummary, originalSummary]);

  // Call onSummaryUpdate when both summaries are available
  useEffect(() => {
    if (currentSummary && onSummaryUpdate) {
      onSummaryUpdate(currentSummary, originalSummary, lastCalculationTime || 0);
    }
  }, [currentSummary, originalSummary, lastCalculationTime, onSummaryUpdate]);

  // Impact calculations
  const impact = useMemo(() => {
    if (!currentSummary || !originalSummary) return null;

    return {
      bonusPoolChange: currentSummary.totalBonusPool - originalSummary.totalBonusPool,
      bonusPoolChangePercent: ((currentSummary.totalBonusPool - originalSummary.totalBonusPool) / originalSummary.totalBonusPool) * 100,
      avgBonusChange: currentSummary.avgBonusAmount - originalSummary.avgBonusAmount,
      avgBonusChangePercent: ((currentSummary.avgBonusAmount - originalSummary.avgBonusAmount) / originalSummary.avgBonusAmount) * 100,
      cappedEmployeesChange: currentSummary.cappedEmployees - originalSummary.cappedEmployees,
      mrtCappedChange: currentSummary.mrtCappedEmployees - originalSummary.mrtCappedEmployees
    };
  }, [currentSummary, originalSummary]);

  if (calculating || isCalculating) {
    const isLargeDataset = employees.length > 5000;
    
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recalculating Bonuses</h3>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-gray-700 font-medium mb-2">
              Processing {employees.length.toLocaleString()} employees...
            </div>
            
            {isLargeDataset && calculationProgress > 0 && (
              <div className="w-64 mx-auto">
                <div className="bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${calculationProgress}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-500">
                  {calculationProgress.toFixed(0)}% complete
                </div>
              </div>
            )}
            
            {lastCalculationTime && (
              <div className="text-xs text-gray-400 mt-2">
                Last calculation: {lastCalculationTime.toFixed(0)}ms
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentSummary || !originalSummary) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center">No calculation results available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Impact Summary */}
      {impact && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Impact Assessment</h3>
            {lastCalculationTime && (
              <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                Calculated in {lastCalculationTime.toFixed(0)}ms
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-600 font-medium">Total Bonus Pool</div>
              <div className="text-2xl font-bold text-blue-800">
                £{currentSummary.totalBonusPool.toLocaleString()}
              </div>
              <div className={`text-sm ${impact.bonusPoolChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {impact.bonusPoolChange >= 0 ? '+' : ''}£{Math.abs(impact.bonusPoolChange).toLocaleString()}
                <span className="ml-1">
                  ({impact.bonusPoolChangePercent >= 0 ? '+' : ''}{impact.bonusPoolChangePercent.toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 font-medium">Average Bonus</div>
              <div className="text-2xl font-bold text-green-800">
                £{currentSummary.avgBonusAmount.toLocaleString()}
              </div>
              <div className={`text-sm ${impact.avgBonusChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {impact.avgBonusChange >= 0 ? '+' : ''}£{Math.abs(impact.avgBonusChange).toLocaleString()}
                <span className="ml-1">
                  ({impact.avgBonusChangePercent >= 0 ? '+' : ''}{impact.avgBonusChangePercent.toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="text-sm text-amber-600 font-medium">Capped Employees</div>
              <div className="text-2xl font-bold text-amber-800">
                {currentSummary.cappedEmployees}
              </div>
              <div className={`text-sm ${impact.cappedEmployeesChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {impact.cappedEmployeesChange >= 0 ? '+' : ''}{impact.cappedEmployeesChange}
                <span className="ml-1">employees</span>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-sm text-red-600 font-medium">MRT Capped</div>
              <div className="text-2xl font-bold text-red-800">
                {currentSummary.mrtCappedEmployees}
              </div>
              <div className={`text-sm ${impact.mrtCappedChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {impact.mrtCappedChange >= 0 ? '+' : ''}{impact.mrtCappedChange}
                <span className="ml-1">MRT employees</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Current Scenario Statistics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Basic Stats */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Basic Statistics</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Employees</span>
                <span className="font-medium">{currentSummary.totalEmployees.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Median Bonus</span>
                <span className="font-medium">£{currentSummary.medianBonusAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Bonus %</span>
                <span className="font-medium">{currentSummary.avgBonusPercentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">MRT Employees</span>
                <span className="font-medium">{currentSummary.mrtEmployees}</span>
              </div>
            </div>
          </div>

          {/* Bonus Distribution */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Bonus Distribution</h4>
            <div className="space-y-2 text-sm">
              {currentSummary.bonusDistribution.map((range, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-gray-600">{range.range}</span>
                  <span className="font-medium">
                    {range.count} ({range.percentage.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Department Breakdown */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Top Departments</h4>
            <div className="space-y-2 text-sm">
              {Object.entries(currentSummary.departmentBreakdown)
                .sort((a, b) => b[1].totalBonus - a[1].totalBonus)
                .slice(0, 5)
                .map(([dept, stats]) => (
                  <div key={dept}>
                    <div className="flex justify-between">
                      <span className="text-gray-600 truncate">{dept}</span>
                      <span className="font-medium">{stats.count}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Avg: £{stats.avgBonus.toLocaleString()}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Before vs. After Comparison</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Metric</th>
                <th className="text-right py-2">Original</th>
                <th className="text-right py-2">Current</th>
                <th className="text-right py-2">Change</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Total Bonus Pool</td>
                <td className="py-2 text-right">£{originalSummary.totalBonusPool.toLocaleString()}</td>
                <td className="py-2 text-right">£{currentSummary.totalBonusPool.toLocaleString()}</td>
                <td className={`py-2 text-right ${impact?.bonusPoolChange && impact.bonusPoolChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {impact?.bonusPoolChange && impact.bonusPoolChange >= 0 ? '+' : ''}£{Math.abs(impact?.bonusPoolChange || 0).toLocaleString()}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Average Bonus</td>
                <td className="py-2 text-right">£{originalSummary.avgBonusAmount.toLocaleString()}</td>
                <td className="py-2 text-right">£{currentSummary.avgBonusAmount.toLocaleString()}</td>
                <td className={`py-2 text-right ${impact?.avgBonusChange && impact.avgBonusChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {impact?.avgBonusChange && impact.avgBonusChange >= 0 ? '+' : ''}£{Math.abs(impact?.avgBonusChange || 0).toLocaleString()}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Median Bonus</td>
                <td className="py-2 text-right">£{originalSummary.medianBonusAmount.toLocaleString()}</td>
                <td className="py-2 text-right">£{currentSummary.medianBonusAmount.toLocaleString()}</td>
                <td className={`py-2 text-right ${(currentSummary.medianBonusAmount - originalSummary.medianBonusAmount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(currentSummary.medianBonusAmount - originalSummary.medianBonusAmount) >= 0 ? '+' : ''}£{Math.abs(currentSummary.medianBonusAmount - originalSummary.medianBonusAmount).toLocaleString()}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Capped Employees</td>
                <td className="py-2 text-right">{originalSummary.cappedEmployees}</td>
                <td className="py-2 text-right">{currentSummary.cappedEmployees}</td>
                <td className={`py-2 text-right ${impact?.cappedEmployeesChange && impact.cappedEmployeesChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {impact?.cappedEmployeesChange && impact.cappedEmployeesChange >= 0 ? '+' : ''}{impact?.cappedEmployeesChange || 0}
                </td>
              </tr>
              <tr>
                <td className="py-2">MRT Capped</td>
                <td className="py-2 text-right">{originalSummary.mrtCappedEmployees}</td>
                <td className="py-2 text-right">{currentSummary.mrtCappedEmployees}</td>
                <td className={`py-2 text-right ${impact?.mrtCappedChange && impact.mrtCappedChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {impact?.mrtCappedChange && impact.mrtCappedChange >= 0 ? '+' : ''}{impact?.mrtCappedChange || 0}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}; 