import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  DepartmentBreakdown, 
  TrendItem, 
  TopDepartment 
} from '../../services/dashboardService';

interface DashboardChartsProps {
  departmentBreakdown: DepartmentBreakdown[];
  calculationTrends: TrendItem[];
  topDepartments: TopDepartment[];
  bonusDistribution?: { range: string; count: number; avg_bonus: number; }[];
}

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280'];
const GRADIENT_COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'
];

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  departmentBreakdown,
  calculationTrends,
  topDepartments,
  bonusDistribution = []
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-lg backdrop-blur-sm">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const AnimatedBar = (props: any) => {
    const { fill, ...rest } = props;
    return (
      <rect
        {...rest}
        fill={fill}
        className="transition-all duration-300 hover:opacity-80"
        style={{
          filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
        }}
      />
    );
  };

  const AnimatedLine = (props: any) => {
    const { stroke, ...rest } = props;
    return (
      <path
        {...rest}
        stroke={stroke}
        strokeWidth="3"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
        }}
      />
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Department Employee Distribution */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Employee Distribution by Department
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={departmentBreakdown}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name} (${percentage}%)`}
              outerRadius={90}
              fill="#8884d8"
              dataKey="employee_count"
              animationBegin={0}
              animationDuration={1000}
            >
              {departmentBreakdown.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Calculation Trends */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Calculation Activity Trends
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={calculationTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
              stroke="#e2e8f0"
            />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} stroke="#e2e8f0" />
            <Tooltip 
              content={<CustomTooltip />}
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <Line 
              type="monotone" 
              dataKey="calculation_count" 
              stroke="#3B82F6" 
              strokeWidth={3}
              name="Calculations"
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
              animationDuration={1500}
            />
            <Line 
              type="monotone" 
              dataKey="total_employees" 
              stroke="#10B981" 
              strokeWidth={3}
              name="Employees"
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Departments by Salary */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Top Departments by Average Salary
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={topDepartments} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              type="number" 
              tick={{ fontSize: 12, fill: '#64748b' }}
              stroke="#e2e8f0"
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <YAxis 
              dataKey="department" 
              type="category" 
              tick={{ fontSize: 12, fill: '#64748b' }}
              width={120}
              stroke="#e2e8f0"
            />
            <Tooltip 
              content={<CustomTooltip />}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Average Salary']}
            />
            <Bar 
              dataKey="avg_salary" 
              fill="url(#colorGradient)" 
              radius={[0, 4, 4, 0]}
              animationDuration={1000}
            >
              {topDepartments.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bonus Distribution */}
      {bonusDistribution.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Bonus Distribution
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={bonusDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="range" 
                tick={{ fontSize: 12, fill: '#64748b' }}
                stroke="#e2e8f0"
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#64748b' }} 
                stroke="#e2e8f0"
              />
              <Tooltip 
                content={<CustomTooltip />}
                formatter={(value: number, name: string) => {
                  if (name === 'count') {
                    return [value, 'Employees'];
                  }
                  return [`$${value.toLocaleString()}`, 'Avg Bonus'];
                }}
              />
              <Bar 
                dataKey="count" 
                fill="#F59E0B" 
                name="count" 
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
              >
                {bonusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Average Bonus Trends */}
      {calculationTrends.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Average Bonus Trends
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={calculationTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                stroke="#e2e8f0"
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#64748b' }} 
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                stroke="#e2e8f0"
              />
              <Tooltip 
                content={<CustomTooltip />}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Average Bonus']}
              />
              <Area 
                type="monotone" 
                dataKey="average_bonus" 
                stroke="#10B981" 
                fill="url(#colorGradient)" 
                fillOpacity={0.3}
                strokeWidth={3}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};