import { API_BASE_URL } from '../config';

export interface PoolVsTargetAnalysis {
  plan_id: string;
  plan_name: string;
  target_pool: number | null;
  actual_pool: number;
  pool_utilization: number;
  employee_count: number;
  avg_bonus_per_employee: number;
  variance_from_target: number | null;
  status: 'over_target' | 'under_target' | 'on_target' | 'no_target';
  last_calculated: string;
}

export interface TrendDataPoint {
  period: string;
  metric_name: string;
  value: number;
  comparison_value: number | null;
  change_percentage: number | null;
}

export interface ExecutiveSummary {
  tenant_id: string;
  reporting_period: string;
  total_plans_executed: number;
  total_employees_processed: number;
  total_bonus_pool_distributed: number;
  average_bonus_percentage: number;
  pool_vs_target_summary: Record<string, any>;
  trending_metrics: TrendDataPoint[];
  top_performing_plans: Record<string, any>[];
  generated_at: string;
}

export interface ReportingFilters {
  tenant_id?: string;
  date_from?: string;
  date_to?: string;
  plan_ids?: string[];
  department_filter?: string;
  include_archived?: boolean;
  metric_types?: string[];
}

export interface DynamicReportRequest {
  report_type: 'pool_analysis' | 'trends' | 'executive_summary' | 'combined';
  filters: ReportingFilters;
  grouping?: 'day' | 'week' | 'month' | 'quarter';
  include_details?: boolean;
}

export interface DynamicReportResponse {
  success: boolean;
  report_type: string;
  filters_applied: ReportingFilters;
  data: any;
  generation_time_seconds: number;
  generated_at: string;
  error?: string;
}

export interface PoolAnalysisData {
  analyses: PoolVsTargetAnalysis[];
  summary: {
    total_plans_analyzed: number;
    total_target_pool: number;
    total_actual_pool: number;
    overall_pool_utilization: number;
    plans_over_target: number;
    plans_under_target: number;
    plans_on_target: number;
  };
  detailed_breakdown?: Record<string, any>;
}

export interface TrendAnalysisData {
  trend_data: TrendDataPoint[];
  period_summary: Record<string, {
    runs_count: number;
    total_bonus_pool: number;
    total_employees: number;
    avg_bonus_per_employee: number;
  }>;
  analysis_period: {
    start_date: string;
    end_date: string;
    grouping: string;
    total_periods: number;
  };
}

export interface PlanPerformanceMetrics {
  plan_id: string;
  plan_name: string;
  analysis_period: string;
  metrics: {
    run_id: string;
    execution_date: string;
    bonus_pool: number;
    employee_count: number;
    avg_bonus_per_employee: number;
  }[];
  summary: {
    total_runs: number;
    total_bonus_pool: number;
    total_employees: number;
    avg_bonus_per_employee: number;
    avg_pool_per_run: number;
  };
}

class ExecutiveReportingService {
  private baseUrl = `${API_BASE_URL}/api/v1/executive-reporting`;

  async generateDynamicReport(
    request: DynamicReportRequest,
    tenantId: string
  ): Promise<DynamicReportResponse> {
    const response = await fetch(`${this.baseUrl}/dynamic-report?tenant_id=${tenantId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate dynamic report: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to generate dynamic report');
    }

    return result.data;
  }

  async getPoolAnalysis(
    tenantId: string,
    options: {
      dateFrom?: string;
      dateTo?: string;
      planIds?: string[];
      includeDetails?: boolean;
    } = {}
  ): Promise<PoolAnalysisData> {
    const params = new URLSearchParams({
      tenant_id: tenantId,
      include_details: options.includeDetails?.toString() || 'false',
    });

    if (options.dateFrom) params.append('date_from', options.dateFrom);
    if (options.dateTo) params.append('date_to', options.dateTo);
    if (options.planIds?.length) params.append('plan_ids', options.planIds.join(','));

    const response = await fetch(`${this.baseUrl}/pool-analysis?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch pool analysis: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get pool analysis');
    }

    return result.data.data;
  }

  async getTrendAnalysis(
    tenantId: string,
    options: {
      dateFrom?: string;
      dateTo?: string;
      planIds?: string[];
      grouping?: 'day' | 'week' | 'month' | 'quarter';
    } = {}
  ): Promise<TrendAnalysisData> {
    const params = new URLSearchParams({
      tenant_id: tenantId,
      grouping: options.grouping || 'month',
    });

    if (options.dateFrom) params.append('date_from', options.dateFrom);
    if (options.dateTo) params.append('date_to', options.dateTo);
    if (options.planIds?.length) params.append('plan_ids', options.planIds.join(','));

    const response = await fetch(`${this.baseUrl}/trends?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch trend analysis: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get trend analysis');
    }

    return result.data.data;
  }

  async getExecutiveSummary(
    tenantId: string,
    options: {
      dateFrom?: string;
      dateTo?: string;
      planIds?: string[];
    } = {}
  ): Promise<ExecutiveSummary> {
    const params = new URLSearchParams({
      tenant_id: tenantId,
    });

    if (options.dateFrom) params.append('date_from', options.dateFrom);
    if (options.dateTo) params.append('date_to', options.dateTo);
    if (options.planIds?.length) params.append('plan_ids', options.planIds.join(','));

    const response = await fetch(`${this.baseUrl}/executive-summary?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch executive summary: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get executive summary');
    }

    return result.data.data;
  }

  async getCombinedReport(
    tenantId: string,
    options: {
      dateFrom?: string;
      dateTo?: string;
      planIds?: string[];
      grouping?: 'day' | 'week' | 'month' | 'quarter';
      includeDetails?: boolean;
    } = {}
  ): Promise<{
    pool_analysis: PoolAnalysisData;
    trend_analysis: TrendAnalysisData;
    executive_summary: ExecutiveSummary;
    report_scope: any;
  }> {
    const params = new URLSearchParams({
      tenant_id: tenantId,
      grouping: options.grouping || 'month',
      include_details: options.includeDetails?.toString() || 'false',
    });

    if (options.dateFrom) params.append('date_from', options.dateFrom);
    if (options.dateTo) params.append('date_to', options.dateTo);
    if (options.planIds?.length) params.append('plan_ids', options.planIds.join(','));

    const response = await fetch(`${this.baseUrl}/combined-report?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch combined report: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get combined report');
    }

    return result.data.data;
  }

  async getPlanPerformanceMetrics(
    planId: string,
    tenantId: string,
    days: number = 90
  ): Promise<PlanPerformanceMetrics> {
    const params = new URLSearchParams({
      tenant_id: tenantId,
      days: days.toString(),
    });

    const response = await fetch(`${this.baseUrl}/plan-performance/${planId}?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch plan performance metrics: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get plan performance metrics');
    }

    return result.data;
  }
}

export const executiveReportingService = new ExecutiveReportingService();