import { API_BASE_URL } from '../config';

export interface DashboardSummary {
  summary: {
    total_employees_processed: number;
    total_uploads: number;
    recent_uploads_count: number;
    average_bonus_amount: number;
    total_bonus_pool: number;
    last_updated: string;
  };
  bonus_statistics: {
    total_bonus_pool: number;
    average_bonus: number;
    median_bonus: number;
    min_bonus: number;
    max_bonus: number;
    total_calculations: number;
  };
  department_breakdown: DepartmentBreakdown[];
  recent_activity: ActivityItem[];
  calculation_trends: TrendItem[];
  top_departments: TopDepartment[];
  recent_uploads: RecentUpload[];
}

export interface DepartmentBreakdown {
  department: string;
  employee_count: number;
  avg_salary: number;
  percentage: number;
}

export interface ActivityItem {
  id: string;
  type: 'upload' | 'calculation';
  title: string;
  description: string;
  timestamp: string;
  status: string;
}

export interface TrendItem {
  date: string;
  calculation_count: number;
  total_employees: number;
  average_bonus: number;
}

export interface TopDepartment {
  department: string;
  employee_count: number;
  avg_salary: number;
  total_salary: number;
  estimated_bonus: number;
}

export interface RecentUpload {
  id: string;
  filename: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  failed_rows: number;
  created_at: string;
  has_calculations: boolean;
  calculation_id?: string;
  avg_bonus?: number;
  total_bonus_pool?: number;
}

export interface KeyMetrics {
  total_employees: number;
  total_uploads: number;
  recent_uploads: number;
  average_bonus: number;
  total_bonus_pool: number;
  total_calculations: number;
}

export interface BonusDistribution {
  distribution: {
    range: string;
    count: number;
    avg_bonus: number;
  }[];
}

class DashboardService {
  private baseUrl = `${API_BASE_URL}/api/v1/dashboard`;

  async getDashboardSummary(sessionId: string, days: number = 30): Promise<DashboardSummary> {
    const response = await fetch(`${this.baseUrl}/summary?session_id=${sessionId}&days=${days}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard summary: ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get dashboard summary');
    }
    
    return result.data;
  }

  async getKeyMetrics(sessionId: string): Promise<KeyMetrics> {
    const response = await fetch(`${this.baseUrl}/metrics?session_id=${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch key metrics: ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get key metrics');
    }
    
    return result.data;
  }

  async getDepartmentBreakdown(sessionId: string): Promise<{
    departments: DepartmentBreakdown[];
    top_departments: TopDepartment[];
  }> {
    const response = await fetch(`${this.baseUrl}/departments?session_id=${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch department breakdown: ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get department breakdown');
    }
    
    return result.data;
  }

  async getCalculationTrends(sessionId: string, days: number = 30): Promise<{
    trends: TrendItem[];
    period_days: number;
  }> {
    const response = await fetch(`${this.baseUrl}/trends?session_id=${sessionId}&days=${days}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch calculation trends: ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get calculation trends');
    }
    
    return result.data;
  }

  async getRecentActivity(sessionId: string, days: number = 7): Promise<{
    activities: ActivityItem[];
    recent_uploads: RecentUpload[];
  }> {
    const response = await fetch(`${this.baseUrl}/activity?session_id=${sessionId}&days=${days}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch recent activity: ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get recent activity');
    }
    
    return result.data;
  }

  async getBonusDistribution(sessionId: string): Promise<BonusDistribution> {
    const response = await fetch(`${this.baseUrl}/bonus-distribution?session_id=${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch bonus distribution: ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get bonus distribution');
    }
    
    return result.data;
  }

  async getBonusStatistics(sessionId: string): Promise<DashboardSummary['bonus_statistics']> {
    const response = await fetch(`${this.baseUrl}/statistics?session_id=${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch bonus statistics: ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get bonus statistics');
    }
    
    return result.data;
  }
}

export const dashboardService = new DashboardService();