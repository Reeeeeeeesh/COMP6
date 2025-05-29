import React from 'react';

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

interface ScenarioSummaryProps {
  currentSummary: CalculationSummary;
  originalSummary?: CalculationSummary;
  title?: string;
  showComparison?: boolean;
  calculationTime?: number;
}

interface SummaryCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'indigo';
  description?: string;
  icon?: React.ReactNode;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  color,
  description,
  icon
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800'
  };

  const changeColor = change !== undefined 
    ? change >= 0 ? 'text-green-600' : 'text-red-600'
    : '';

  return (
    <div className={`p-6 rounded-lg border-2 ${colorClasses[color]} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {icon && <div className="text-xl">{icon}</div>}
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
              {title}
            </h3>
          </div>
          <div className="text-3xl font-bold mb-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {description && (
            <p className="text-sm text-gray-600 mb-2">{description}</p>
          )}
          {change !== undefined && changeLabel && (
            <div className={`text-sm font-medium ${changeColor}`}>
              {change >= 0 ? '+' : ''}{change.toLocaleString()} {changeLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ScenarioSummary: React.FC<ScenarioSummaryProps> = ({
  currentSummary,
  originalSummary,
  title = "Scenario Summary",
  showComparison = true,
  calculationTime
}) => {
  // Calculate changes if original summary is provided
  const changes = originalSummary && showComparison ? {
    bonusPoolChange: currentSummary.totalBonusPool - originalSummary.totalBonusPool,
    avgBonusChange: currentSummary.avgBonusAmount - originalSummary.avgBonusAmount,
    cappedEmployeesChange: currentSummary.cappedEmployees - originalSummary.cappedEmployees,
    mrtCappedChange: currentSummary.mrtCappedEmployees - originalSummary.mrtCappedEmployees
  } : null;

  // Calculate percentages and ratios
  const cappedPercentage = (currentSummary.cappedEmployees / currentSummary.totalEmployees) * 100;
  const mrtPercentage = (currentSummary.mrtEmployees / currentSummary.totalEmployees) * 100;
  const mrtCappedPercentage = currentSummary.mrtEmployees > 0 
    ? (currentSummary.mrtCappedEmployees / currentSummary.mrtEmployees) * 100 
    : 0;

  // Get top departments
  const topDepartments = Object.entries(currentSummary.departmentBreakdown)
    .sort((a, b) => b[1].totalBonus - a[1].totalBonus)
    .slice(0, 5);

  // Get most common bonus range
  const mostCommonRange = currentSummary.bonusDistribution
    .reduce((prev, current) => prev.count > current.count ? prev : current);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <p className="text-gray-600 mt-2">
              Comprehensive summary of scenario results and key performance metrics.
            </p>
          </div>
          {calculationTime && (
            <div className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
              Calculated in {calculationTime.toFixed(0)}ms
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Total Bonus Pool"
          value={`£${currentSummary.totalBonusPool.toLocaleString()}`}
          change={changes?.bonusPoolChange}
          changeLabel="from original"
          color="blue"
          description="Total amount allocated across all employees"
          icon="💰"
        />
        
        <SummaryCard
          title="Average Bonus"
          value={`£${currentSummary.avgBonusAmount.toLocaleString()}`}
          change={changes?.avgBonusChange}
          changeLabel="per employee"
          color="green"
          description={`${currentSummary.avgBonusPercentage.toFixed(1)}% of average salary`}
          icon="📊"
        />
        
        <SummaryCard
          title="Capped Employees"
          value={currentSummary.cappedEmployees}
          change={changes?.cappedEmployeesChange}
          changeLabel="employees"
          color="amber"
          description={`${cappedPercentage.toFixed(1)}% of workforce`}
          icon="⚠️"
        />
        
        <SummaryCard
          title="MRT Capped"
          value={currentSummary.mrtCappedEmployees}
          change={changes?.mrtCappedChange}
          changeLabel="MRT employees"
          color="red"
          description={`${mrtCappedPercentage.toFixed(1)}% of MRT staff`}
          icon="🔒"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          title="Total Employees"
          value={currentSummary.totalEmployees}
          color="indigo"
          description="Included in calculation"
          icon="👥"
        />
        
        <SummaryCard
          title="MRT Employees"
          value={currentSummary.mrtEmployees}
          color="purple"
          description={`${mrtPercentage.toFixed(1)}% of workforce`}
          icon="🎯"
        />
        
        <SummaryCard
          title="Median Bonus"
          value={`£${currentSummary.medianBonusAmount.toLocaleString()}`}
          color="blue"
          description="Middle value in distribution"
          icon="📈"
        />
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Analysis */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Top Departments by Bonus Pool</h3>
          <div className="space-y-3">
            {topDepartments.map(([department, data], index) => {
              const percentage = (data.totalBonus / currentSummary.totalBonusPool) * 100;
              return (
                <div key={department} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{department}</div>
                      <div className="text-sm text-gray-600">
                        {data.count} employees • Avg: £{data.avgBonus.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-800">
                      £{data.totalBonus.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {percentage.toFixed(1)}% of total
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribution Analysis */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Bonus Distribution Analysis</h3>
          <div className="space-y-4">
            {/* Most Common Range */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🎯</span>
                <h4 className="font-medium text-blue-800">Most Common Range</h4>
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {mostCommonRange.range}
              </div>
              <div className="text-sm text-blue-600">
                {mostCommonRange.count} employees ({mostCommonRange.percentage.toFixed(1)}%)
              </div>
            </div>

            {/* Distribution Breakdown */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 mb-3">Complete Distribution</h4>
              {currentSummary.bonusDistribution.map((range) => (
                <div key={range.range} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{range.range}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${range.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-12 text-right">
                      {range.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Performance Indicators</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {((currentSummary.totalBonusPool / currentSummary.totalEmployees / 50000) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">
              Pool Utilization Rate
              <div className="text-xs text-gray-500 mt-1">
                (Assuming £50k avg salary)
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {(currentSummary.bonusDistribution.filter(r => r.range !== '£0 - £10k').reduce((sum, r) => sum + r.count, 0) / currentSummary.totalEmployees * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">
              Meaningful Bonus Rate
              <div className="text-xs text-gray-500 mt-1">
                (Above £10k threshold)
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-600 mb-2">
              {Object.keys(currentSummary.departmentBreakdown).length}
            </div>
            <div className="text-sm text-gray-600">
              Departments Covered
              <div className="text-xs text-gray-500 mt-1">
                Total departments
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {(100 - cappedPercentage).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">
              Uncapped Employees
              <div className="text-xs text-gray-500 mt-1">
                No bonus limitations
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 