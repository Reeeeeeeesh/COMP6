import axios from 'axios';
import { API_BASE_URL } from '../config';

// Executive KPI Interfaces
export interface ExecutiveKPI {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  target: number;
  unit: 'currency' | 'percentage' | 'number';
  trend: 'up' | 'down' | 'stable';
  status: 'excellent' | 'good' | 'warning' | 'critical';
  category: 'financial' | 'operational' | 'strategic' | 'people';
  description: string;
  actionItems: string[];
  confidenceLevel: number;
  lastUpdated: string;
}

export interface ExecutiveInsight {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: 'opportunity' | 'risk' | 'performance' | 'compliance';
  urgency: 'immediate' | 'short-term' | 'long-term';
  recommendations: string[];
  dataSupport: {
    metrics: Record<string, number>;
    trends: number[];
    projections?: number[];
    affectedEntities?: string[];
  };
  confidence: number;
  createdAt: string;
}

export interface StrategicMetric {
  name: string;
  value: number;
  benchmark: number;
  industry: number;
  trend: number[];
  forecast: number[];
  variance: number;
  performanceScore: number;
  weight: number;
}

export interface DecisionSupport {
  id: string;
  scenario: string;
  description: string;
  impact: number;
  probability: number;
  timeframe: string;
  recommendation: string;
  riskLevel: 'low' | 'medium' | 'high';
  alternativeActions: string[];
  expectedOutcomes: {
    best: number;
    expected: number;
    worst: number;
  };
  dependencies: string[];
}

export interface CompensationAnalytics {
  totalCompensationCost: number;
  averageCostPerEmployee: number;
  costVarianceFromBudget: number;
  budgetUtilization: number;
  payEquityScore: number;
  marketCompetitiveness: number;
  retentionImpactScore: number;
  performanceAlignment: number;
}

export interface BudgetForecast {
  period: string;
  budgetedAmount: number;
  actualAmount: number;
  forecastedAmount: number;
  variance: number;
  variancePercentage: number;
  riskFactors: string[];
  confidenceLevel: number;
}

export interface BenchmarkComparison {
  metric: string;
  companyValue: number;
  industryMedian: number;
  industryTop25: number;
  industryTop10: number;
  percentile: number;
  competitivePosition: 'leading' | 'competitive' | 'lagging';
  gapAnalysis: {
    toMedian: number;
    toTop25: number;
    toTop10: number;
  };
}

export interface RiskAssessment {
  id: string;
  riskType: 'financial' | 'operational' | 'compliance' | 'strategic';
  description: string;
  probability: number;
  impact: number;
  riskScore: number;
  status: 'monitoring' | 'mitigating' | 'escalated';
  mitigationActions: string[];
  owner: string;
  dueDate: string;
  trends: number[];
}

export interface ExecutiveDashboardData {
  kpis: ExecutiveKPI[];
  insights: ExecutiveInsight[];
  strategicMetrics: StrategicMetric[];
  decisionSupport: DecisionSupport[];
  compensationAnalytics: CompensationAnalytics;
  budgetForecast: BudgetForecast[];
  benchmarkComparisons: BenchmarkComparison[];
  riskAssessments: RiskAssessment[];
  lastUpdated: string;
  dataQualityScore: number;
}

export interface ExecutiveDashboardFilters {
  timeframe: '7d' | '30d' | '90d' | '1y' | 'custom';
  customDateRange?: {
    startDate: string;
    endDate: string;
  };
  departments?: string[];
  regions?: string[];
  employeeLevels?: string[];
  kpiCategories?: string[];
  insightTypes?: string[];
  riskLevels?: string[];
}

export interface ExecutiveAlerts {
  id: string;
  type: 'threshold' | 'anomaly' | 'compliance' | 'target';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metrics: string[];
  triggeredAt: string;
  isRead: boolean;
  actions?: string[];
}

class ExecutiveDashboardService {
  private baseUrl = `${API_BASE_URL}/api/v2/executive-dashboard`;

  /**
   * Get comprehensive executive dashboard data
   * @param filters Dashboard filters
   * @returns Promise with executive dashboard data
   */
  async getDashboardData(filters: ExecutiveDashboardFilters): Promise<ExecutiveDashboardData> {
    try {
      const response = await axios.post(`${this.baseUrl}/data`, filters, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get executive dashboard data');
      }
    } catch (error) {
      console.error('Error getting executive dashboard data:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get dashboard data: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Get executive KPIs with trend analysis
   * @param filters KPI filters
   * @returns Promise with KPI data
   */
  async getExecutiveKPIs(filters: ExecutiveDashboardFilters): Promise<ExecutiveKPI[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/kpis`, filters, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get executive KPIs');
      }
    } catch (error) {
      console.error('Error getting executive KPIs:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get KPIs: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Get strategic insights and recommendations
   * @param filters Insight filters
   * @returns Promise with executive insights
   */
  async getStrategicInsights(filters: ExecutiveDashboardFilters): Promise<ExecutiveInsight[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/insights`, filters, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get strategic insights');
      }
    } catch (error) {
      console.error('Error getting strategic insights:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get insights: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Get compensation analytics summary
   * @param filters Analytics filters
   * @returns Promise with compensation analytics
   */
  async getCompensationAnalytics(filters: ExecutiveDashboardFilters): Promise<CompensationAnalytics> {
    try {
      const response = await axios.post(`${this.baseUrl}/compensation-analytics`, filters, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get compensation analytics');
      }
    } catch (error) {
      console.error('Error getting compensation analytics:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get compensation analytics: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Get budget forecast and variance analysis
   * @param timeframe Forecast timeframe
   * @returns Promise with budget forecast data
   */
  async getBudgetForecast(timeframe: string): Promise<BudgetForecast[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/budget-forecast`, {
        params: { timeframe },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get budget forecast');
      }
    } catch (error) {
      console.error('Error getting budget forecast:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get budget forecast: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Get industry benchmark comparisons
   * @param industry Industry identifier
   * @param region Region identifier
   * @returns Promise with benchmark data
   */
  async getBenchmarkComparisons(industry?: string, region?: string): Promise<BenchmarkComparison[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/benchmarks`, {
        params: { industry, region },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get benchmark comparisons');
      }
    } catch (error) {
      console.error('Error getting benchmark comparisons:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get benchmarks: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Get risk assessments and monitoring
   * @param riskTypes Array of risk types to filter
   * @returns Promise with risk assessment data
   */
  async getRiskAssessments(riskTypes?: string[]): Promise<RiskAssessment[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/risks`, {
        params: { riskTypes: riskTypes?.join(',') },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get risk assessments');
      }
    } catch (error) {
      console.error('Error getting risk assessments:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get risks: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Get decision support recommendations
   * @param context Decision context or scenario
   * @returns Promise with decision support data
   */
  async getDecisionSupport(context?: string): Promise<DecisionSupport[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/decision-support`, {
        params: { context },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get decision support');
      }
    } catch (error) {
      console.error('Error getting decision support:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get decision support: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Get executive alerts and notifications
   * @param severity Filter by severity level
   * @param unreadOnly Show only unread alerts
   * @returns Promise with executive alerts
   */
  async getExecutiveAlerts(severity?: string, unreadOnly = false): Promise<ExecutiveAlerts[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/alerts`, {
        params: { severity, unreadOnly },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get executive alerts');
      }
    } catch (error) {
      console.error('Error getting executive alerts:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get alerts: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Mark alert as read
   * @param alertId Alert ID to mark as read
   * @returns Promise with confirmation
   */
  async markAlertAsRead(alertId: string): Promise<void> {
    try {
      const response = await axios.patch(`${this.baseUrl}/alerts/${alertId}/read`, {}, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to mark alert as read');
      }
    } catch (error) {
      console.error('Error marking alert as read:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to mark alert as read: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Export executive dashboard data
   * @param format Export format
   * @param filters Dashboard filters
   * @param includeDetails Include detailed data
   * @returns Promise with export URL and filename
   */
  async exportDashboardData(
    format: 'pdf' | 'xlsx' | 'pptx' | 'json',
    filters: ExecutiveDashboardFilters,
    includeDetails = true
  ): Promise<{ downloadUrl: string; filename: string }> {
    try {
      const response = await axios.post(`${this.baseUrl}/export`, {
        format,
        filters,
        includeDetails
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to export dashboard data');
      }
    } catch (error) {
      console.error('Error exporting dashboard data:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to export data: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Subscribe to real-time dashboard updates
   * @param callback Function to call when data updates
   * @param filters Dashboard filters for updates
   * @returns Unsubscribe function
   */
  subscribeToUpdates(
    callback: (data: Partial<ExecutiveDashboardData>) => void,
    filters: ExecutiveDashboardFilters
  ): () => void {
    // In a real implementation, this would set up WebSocket or SSE connection
    const interval = setInterval(async () => {
      try {
        const data = await this.getDashboardData(filters);
        callback(data);
      } catch (error) {
        console.error('Error in real-time update:', error);
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }

  /**
   * Get data quality metrics
   * @returns Promise with data quality information
   */
  async getDataQuality(): Promise<{
    overallScore: number;
    completeness: number;
    accuracy: number;
    timeliness: number;
    consistency: number;
    issues: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      affectedMetrics: string[];
    }>;
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/data-quality`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get data quality metrics');
      }
    } catch (error) {
      console.error('Error getting data quality:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get data quality: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }
}

export const executiveDashboardService = new ExecutiveDashboardService();