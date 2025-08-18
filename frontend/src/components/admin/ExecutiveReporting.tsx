import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
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
  AreaChart,
  Area
} from 'recharts';
import { NavigationHeader } from '../common/NavigationHeader';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorDisplay } from '../common/ErrorDisplay';
import {
  executiveReportingService,
  ExecutiveSummary,
  PoolAnalysisData,
  TrendAnalysisData
} from '../../services/executiveReportingService';
import { parseApiError } from '../../utils/errorHandling';

interface ExecutiveReportingProps {
  tenantId: string;
}

export const ExecutiveReporting: React.FC<ExecutiveReportingProps> = ({ tenantId }) => {
  const [poolAnalysis, setPoolAnalysis] = useState<PoolAnalysisData | null>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysisData | null>(null);
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'pool_analysis' | 'trends' | 'summary'>('overview');
  const [dateFilter, setDateFilter] = useState({
    dateFrom: '',
    dateTo: ''
  });
  const [grouping, setGrouping] = useState<'month' | 'quarter' | 'week'>('month');

  const loadReportingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filterOptions = {
        dateFrom: dateFilter.dateFrom || undefined,
        dateTo: dateFilter.dateTo || undefined
      };

      const [poolData, trendData, summaryData] = await Promise.all([
        executiveReportingService.getPoolAnalysis(tenantId, { ...filterOptions, includeDetails: true }),
        executiveReportingService.getTrendAnalysis(tenantId, { ...filterOptions, grouping }),
        executiveReportingService.getExecutiveSummary(tenantId, filterOptions)
      ]);

      setPoolAnalysis(poolData);
      setTrendAnalysis(trendData);
      setExecutiveSummary(summaryData);
    } catch (err) {
      console.error('Error loading executive reporting data:', err);
      const parsed = parseApiError(err);
      setError(parsed.summary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadReportingData();
    }
  }, [tenantId, dateFilter, grouping]);

  const handleRefresh = () => {
    loadReportingData();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${typeof entry.value === 'number' && entry.dataKey.includes('pool') ? formatCurrency(entry.value) : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_target':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'over_target':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'under_target':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Target className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'on_target': return 'bg-green-100 text-green-800';
      case 'over_target': return 'bg-yellow-100 text-yellow-800';
      case 'under_target': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <div>
        <NavigationHeader title="Executive Reporting" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorDisplay 
            errors={[{ message: error, severity: 'error', suggestions: [] }]}
            title="Executive Reporting Error"
            showContext={false}
          />
          <div className="mt-4">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader title="Executive Reporting" />
      
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              <span className="gradient-text">Executive Reporting</span>
            </h1>
            <p className="text-lg text-gray-600">
              Pool vs target analysis, trends, and performance insights
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">Date Range:</label>
            </div>
            <input
              type="date"
              value={dateFilter.dateFrom}
              onChange={(e) => setDateFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateFilter.dateTo}
              onChange={(e) => setDateFilter(prev => ({ ...prev, dateTo: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Grouping:</label>
              <select
                value={grouping}
                onChange={(e) => setGrouping(e.target.value as 'month' | 'quarter' | 'week')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="quarter">Quarterly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'pool_analysis', label: 'Pool Analysis', icon: Target },
            { key: 'trends', label: 'Trends', icon: TrendingUp },
            { key: 'summary', label: 'Executive Summary', icon: Users }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedView(tab.key as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                selectedView === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div>
            {/* Overview Tab */}
            {selectedView === 'overview' && executiveSummary && (
              <div className="space-y-8">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Plans Executed</p>
                        <p className="text-3xl font-bold text-gray-900">{executiveSummary.total_plans_executed}</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Employees Processed</p>
                        <p className="text-3xl font-bold text-gray-900">{executiveSummary.total_employees_processed.toLocaleString()}</p>
                      </div>
                      <Users className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Bonus Pool</p>
                        <p className="text-3xl font-bold text-gray-900">{formatCurrency(executiveSummary.total_bonus_pool_distributed)}</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Bonus %</p>
                        <p className="text-3xl font-bold text-gray-900">{formatPercentage(executiveSummary.average_bonus_percentage)}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-orange-600" />
                    </div>
                  </div>
                </div>

                {/* Executive Performance Chart */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Top Plans Performance Overview</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={executiveSummary.top_performing_plans.slice(0, 10)} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="plan_name" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          fontSize={12}
                        />
                        <YAxis tickFormatter={(value: any) => formatCurrency(value)} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="bonus_pool" fill="#3B82F6" />
                        <Bar dataKey="avg_bonus_per_employee" fill="#10B981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Performing Plans */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Top Performing Plans</h3>
                  <div className="space-y-3">
                    {executiveSummary.top_performing_plans.slice(0, 5).map((plan, index) => (
                      <div key={plan.plan_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{plan.plan_name}</p>
                            <p className="text-sm text-gray-600">{plan.employee_count} employees</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{formatCurrency(plan.bonus_pool)}</p>
                          <p className="text-sm text-gray-600">{formatCurrency(plan.avg_bonus_per_employee)} avg</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Pool Analysis Tab */}
            {selectedView === 'pool_analysis' && poolAnalysis && (
              <div className="space-y-8">
                {/* Pool Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Total Plans Analyzed</h3>
                    <p className="text-3xl font-bold text-blue-600">{poolAnalysis.summary.total_plans_analyzed}</p>
                  </div>
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Pool Utilization</h3>
                    <p className="text-3xl font-bold text-purple-600">
                      {formatPercentage(poolAnalysis.summary.overall_pool_utilization)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Total Distributed</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(poolAnalysis.summary.total_actual_pool)}
                    </p>
                  </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Pool Status Distribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-600">{poolAnalysis.summary.plans_on_target}</p>
                      <p className="text-sm text-green-700">On Target</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-yellow-600">{poolAnalysis.summary.plans_over_target}</p>
                      <p className="text-sm text-yellow-700">Over Target</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-red-600">{poolAnalysis.summary.plans_under_target}</p>
                      <p className="text-sm text-red-700">Under Target</p>
                    </div>
                  </div>
                </div>

                {/* Pool Analysis Chart */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Pool Utilization by Plan</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={poolAnalysis.analyses} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="plan_name" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          fontSize={12}
                        />
                        <YAxis tickFormatter={(value: any) => formatPercentage(value)} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="pool_utilization" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pool Performance Pie Chart */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Pool Performance Distribution</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'On Target', value: poolAnalysis.summary.plans_on_target, color: '#10B981' },
                            { name: 'Over Target', value: poolAnalysis.summary.plans_over_target, color: '#F59E0B' },
                            { name: 'Under Target', value: poolAnalysis.summary.plans_under_target, color: '#EF4444' }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { name: 'On Target', value: poolAnalysis.summary.plans_on_target, color: '#10B981' },
                            { name: 'Over Target', value: poolAnalysis.summary.plans_over_target, color: '#F59E0B' },
                            { name: 'Under Target', value: poolAnalysis.summary.plans_under_target, color: '#EF4444' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Detailed Plan Analysis */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Plan Performance Details</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pool Utilization</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Pool</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employees</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Bonus</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {poolAnalysis.analyses.map((analysis) => (
                          <tr key={analysis.plan_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-sm font-medium text-gray-900">{analysis.plan_name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(analysis.status)}
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(analysis.status)}`}>
                                  {analysis.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatPercentage(analysis.pool_utilization)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(analysis.actual_pool)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {analysis.employee_count.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(analysis.avg_bonus_per_employee)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Trends Tab */}
            {selectedView === 'trends' && trendAnalysis && (
              <div className="space-y-8">
                {/* Bonus Pool Trends Chart */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Bonus Pool Trends Over Time</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart 
                        data={trendAnalysis.trend_data.filter(t => t.metric_name === 'total_bonus_pool')} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" fontSize={12} />
                        <YAxis tickFormatter={(value: any) => formatCurrency(value)} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#3B82F6" 
                          fill="#3B82F6" 
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Employee Count Trends */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Employee Processing Trends</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={trendAnalysis.trend_data.filter(t => t.metric_name === 'employees_processed')} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" fontSize={12} />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#10B981" 
                          strokeWidth={3}
                          dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Average Bonus Trends */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Average Bonus Per Employee Trends</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={trendAnalysis.trend_data.filter(t => t.metric_name === 'average_bonus_per_employee')} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" fontSize={12} />
                        <YAxis tickFormatter={(value: any) => formatCurrency(value)} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" fill="#8B5CF6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Trend Analysis Data</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Period Summary */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Period Summary</h4>
                      <div className="space-y-3">
                        {Object.entries(trendAnalysis.period_summary).map(([period, data]) => (
                          <div key={period} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-900">{period}</span>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">{data.runs_count} runs</p>
                              <p className="font-medium text-gray-900">{formatCurrency(data.total_bonus_pool)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Analysis Period Info */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Analysis Period</h4>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Start Date:</span>
                            <span className="text-sm font-medium text-gray-900">
                              {new Date(trendAnalysis.analysis_period.start_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">End Date:</span>
                            <span className="text-sm font-medium text-gray-900">
                              {new Date(trendAnalysis.analysis_period.end_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Grouping:</span>
                            <span className="text-sm font-medium text-gray-900 capitalize">{trendAnalysis.analysis_period.grouping}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Periods:</span>
                            <span className="text-sm font-medium text-gray-900">{trendAnalysis.analysis_period.total_periods}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Executive Summary Tab */}
            {selectedView === 'summary' && executiveSummary && (
              <div className="space-y-8">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Executive Summary</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Summary Metrics</h4>
                      <dl className="space-y-3">
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Reporting Period:</dt>
                          <dd className="text-sm font-medium text-gray-900">{executiveSummary.reporting_period}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Total Plans Executed:</dt>
                          <dd className="text-sm font-medium text-gray-900">{executiveSummary.total_plans_executed}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Total Employees:</dt>
                          <dd className="text-sm font-medium text-gray-900">{executiveSummary.total_employees_processed.toLocaleString()}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Total Distributed:</dt>
                          <dd className="text-sm font-medium text-gray-900">{formatCurrency(executiveSummary.total_bonus_pool_distributed)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Average Bonus %:</dt>
                          <dd className="text-sm font-medium text-gray-900">{formatPercentage(executiveSummary.average_bonus_percentage)}</dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Pool vs Target Summary</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(executiveSummary.pool_vs_target_summary, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};