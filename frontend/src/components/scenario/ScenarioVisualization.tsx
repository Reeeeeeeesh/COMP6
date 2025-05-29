import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

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

interface ScenarioVisualizationProps {
  scenarioResults: CalculationSummary;
  title?: string;
  showTitle?: boolean;
}

// Color palette for charts
const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'
];

export const ScenarioVisualization: React.FC<ScenarioVisualizationProps> = ({
  scenarioResults,
  title = "Scenario Visualizations",
  showTitle = true
}) => {
  // Prepare data for bonus distribution chart
  const bonusDistributionData = scenarioResults.bonusDistribution.map(item => ({
    range: item.range,
    count: item.count,
    percentage: item.percentage
  }));

  // Prepare data for department breakdown chart
  const departmentData = Object.entries(scenarioResults.departmentBreakdown)
    .sort((a, b) => b[1].totalBonus - a[1].totalBonus) // Sort by total bonus descending
    .slice(0, 10) // Show top 10 departments
    .map(([department, data]) => ({
      department: department.length > 15 ? `${department.substring(0, 15)}...` : department,
      fullDepartment: department,
      totalBonus: Math.round(data.totalBonus),
      avgBonus: Math.round(data.avgBonus),
      employeeCount: data.count,
      avgSalary: Math.round(data.avgSalary)
    }));

  // Prepare data for summary metrics comparison
  const summaryMetrics = [
    {
      metric: 'Total Employees',
      value: scenarioResults.totalEmployees,
      color: '#8884d8'
    },
    {
      metric: 'Capped Employees',
      value: scenarioResults.cappedEmployees,
      color: '#ff7c7c'
    },
    {
      metric: 'MRT Employees',
      value: scenarioResults.mrtEmployees,
      color: '#ffc658'
    },
    {
      metric: 'MRT Capped',
      value: scenarioResults.mrtCappedEmployees,
      color: '#82ca9d'
    }
  ];

  // Custom tooltip for better data display
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-800">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${typeof entry.value === 'number' 
                ? entry.value.toLocaleString() 
                : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for department breakdown
  const DepartmentTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-800">{data.fullDepartment}</p>
          <p className="text-sm text-blue-600">Total Bonus: £{data.totalBonus.toLocaleString()}</p>
          <p className="text-sm text-green-600">Average Bonus: £{data.avgBonus.toLocaleString()}</p>
          <p className="text-sm text-orange-600">Employees: {data.employeeCount}</p>
          <p className="text-sm text-purple-600">Avg Salary: £{data.avgSalary.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-600 mt-2">
            Interactive visualizations of scenario results and bonus distribution analysis.
          </p>
        </div>
      )}

      {/* Summary Metrics Bar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Employee Summary Metrics</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summaryMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="metric" 
                tick={{ fontSize: 12, fill: '#666' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12, fill: '#666' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                fill="#8884d8"
                radius={[4, 4, 0, 0]}
              >
                {summaryMetrics.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bonus Distribution Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Bonus Distribution</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div>
            <h4 className="text-md font-medium mb-2 text-gray-700">Employee Count by Bonus Range</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bonusDistributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fontSize: 11, fill: '#666' }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#666' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div>
            <h4 className="text-md font-medium mb-2 text-gray-700">Distribution Percentages</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bonusDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ range, percentage }) => 
                      percentage > 5 ? `${range} (${percentage.toFixed(1)}%)` : ''
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {bonusDistributionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Department Breakdown Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Top Departments by Bonus Pool</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={departmentData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              layout="horizontal"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#666' }} />
              <YAxis 
                type="category" 
                dataKey="department" 
                tick={{ fontSize: 11, fill: '#666' }}
                width={120}
              />
              <Tooltip content={<DepartmentTooltip />} />
              <Legend />
              <Bar 
                dataKey="totalBonus" 
                name="Total Bonus (£)" 
                fill="#8884d8" 
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Performance Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Department Performance Comparison</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={departmentData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="department" 
                tick={{ fontSize: 10, fill: '#666' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis yAxisId="bonus" orientation="left" tick={{ fontSize: 12, fill: '#666' }} />
              <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 12, fill: '#666' }} />
              <Tooltip content={<DepartmentTooltip />} />
              <Legend />
              <Line 
                yAxisId="bonus"
                type="monotone" 
                dataKey="avgBonus" 
                stroke="#8884d8" 
                strokeWidth={3}
                dot={{ fill: '#8884d8', r: 6 }}
                name="Average Bonus (£)"
              />
              <Line 
                yAxisId="count"
                type="monotone" 
                dataKey="employeeCount" 
                stroke="#82ca9d" 
                strokeWidth={3}
                dot={{ fill: '#82ca9d', r: 6 }}
                name="Employee Count"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key Statistics Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Key Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              £{scenarioResults.totalBonusPool.toLocaleString()}
            </div>
            <div className="text-sm text-blue-600 font-medium">Total Bonus Pool</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              £{scenarioResults.avgBonusAmount.toLocaleString()}
            </div>
            <div className="text-sm text-green-600 font-medium">Average Bonus</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {scenarioResults.avgBonusPercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-orange-600 font-medium">Avg Bonus %</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {((scenarioResults.cappedEmployees / scenarioResults.totalEmployees) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-red-600 font-medium">Capped Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}; 