import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Upload, 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Activity,
  RefreshCw
} from 'lucide-react';
import { MetricsCard } from './MetricsCard';
import { DashboardCharts } from './DashboardCharts';
import { ActivityFeed } from './ActivityFeed';
import { NavigationHeader } from '../common/NavigationHeader';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { 
  dashboardService, 
  DashboardSummary, 
  BonusDistribution 
} from '../../services/dashboardService';
import { parseApiError } from '../../utils/errorHandling';

interface DashboardProps {
  sessionId: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ sessionId }) => {
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [bonusDistribution, setBonusDistribution] = useState<BonusDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load dashboard summary and bonus distribution in parallel
      const [summary, distribution] = await Promise.all([
        dashboardService.getDashboardSummary(sessionId, 30),
        dashboardService.getBonusDistribution(sessionId)
      ]);
      
      setDashboardData(summary);
      setBonusDistribution(distribution);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      const parsed = parseApiError(err);
      setError(parsed.summary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      loadDashboardData();
    }
  }, [sessionId]);

  const handleRefresh = () => {
    loadDashboardData();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (error) {
    return (
      <div>
        <NavigationHeader title="Dashboard" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorDisplay 
            errors={[{ message: error, severity: 'error', suggestions: [] }]}
            title="Dashboard Error"
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
      <NavigationHeader title="Dashboard" />
      
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-12">
        {/* Header with refresh button */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
              <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Overview of your bonus calculations and recent activity
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <span className="text-sm text-gray-500 font-medium">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none shadow-lg hover:shadow-xl"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="font-medium">Refresh</span>
            </button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <MetricsCard
            title="Total Employees"
            value={dashboardData?.summary.total_employees_processed || 0}
            subtitle="Processed across all uploads"
            icon={<Users className="w-6 h-6" />}
            color="blue"
            loading={loading}
          />
          
          <MetricsCard
            title="Total Uploads"
            value={dashboardData?.summary.total_uploads || 0}
            subtitle={`${dashboardData?.summary.recent_uploads_count || 0} recent uploads`}
            icon={<Upload className="w-6 h-6" />}
            color="green"
            loading={loading}
          />
          
          <MetricsCard
            title="Average Bonus"
            value={formatCurrency(dashboardData?.summary.average_bonus_amount || 0)}
            subtitle="Across all calculations"
            icon={<DollarSign className="w-6 h-6" />}
            color="purple"
            loading={loading}
          />
          
          <MetricsCard
            title="Total Bonus Pool"
            value={formatCurrency(dashboardData?.summary.total_bonus_pool || 0)}
            subtitle={`${dashboardData?.bonus_statistics.total_calculations || 0} calculations`}
            icon={<TrendingUp className="w-6 h-6" />}
            color="orange"
            loading={loading}
          />
        </div>

        {/* Charts and Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Charts Section */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <div className="animate-pulse">
                      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                      <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : dashboardData ? (
              <DashboardCharts
                departmentBreakdown={dashboardData.department_breakdown}
                calculationTrends={dashboardData.calculation_trends}
                topDepartments={dashboardData.top_departments}
                bonusDistribution={bonusDistribution?.distribution}
              />
            ) : (
              <div className="bg-white rounded-lg p-8 text-center text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No data available</p>
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <ActivityFeed
                activities={dashboardData?.recent_activity || []}
                recentUploads={dashboardData?.recent_uploads || []}
                loading={loading}
              />
            </div>
          </div>
        </div>

        {/* Bonus Statistics Summary */}
        {dashboardData && (
          <div className="mt-12 bg-white rounded-xl p-8 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              Bonus Statistics Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {formatCurrency(dashboardData.bonus_statistics.total_bonus_pool)}
                </div>
                <div className="text-sm font-medium text-blue-700">Total Pool</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {formatCurrency(dashboardData.bonus_statistics.average_bonus)}
                </div>
                <div className="text-sm font-medium text-green-700">Average</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {formatCurrency(dashboardData.bonus_statistics.median_bonus)}
                </div>
                <div className="text-sm font-medium text-purple-700">Median</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {formatCurrency(dashboardData.bonus_statistics.max_bonus)}
                </div>
                <div className="text-sm font-medium text-orange-700">Maximum</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {formatCurrency(dashboardData.bonus_statistics.min_bonus)}
                </div>
                <div className="text-sm font-medium text-red-700">Minimum</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                <div className="text-3xl font-bold text-gray-600 mb-2">
                  {dashboardData.bonus_statistics.total_calculations}
                </div>
                <div className="text-sm font-medium text-gray-700">Calculations</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};