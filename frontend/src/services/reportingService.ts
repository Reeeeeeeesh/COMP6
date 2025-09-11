import { apiClient } from './apiClient';

export interface Report {
  id: string;
  name: string;
  description: string;
  type: 'standard' | 'custom' | 'scheduled';
  category: string;
  status: 'draft' | 'active' | 'archived';
  lastGenerated: string;
  createdBy: string;
  isShared: boolean;
  exportFormats: ExportFormat[];
  schedule?: ReportSchedule;
  parameters: ReportParameter[];
  sections?: ReportSection[];
  filters?: ReportFilter[];
  layout?: ReportLayout;
  styling?: ReportStyling;
}

export interface ExportFormat {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  enabled: boolean;
  options: ExportOptions;
}

export interface ExportOptions {
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'letter' | 'legal';
  includeCharts?: boolean;
  includeExecutiveSummary?: boolean;
  compression?: 'none' | 'low' | 'medium' | 'high';
  watermark?: string;
  password?: string;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  enabled: boolean;
  nextRun: string;
  recipients: string[];
  deliveryMethod: 'email' | 'ftp' | 'api' | 'download';
  timezone: string;
  runTime: string; // HH:MM format
  weekdays?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
}

export interface ReportParameter {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'multiselect';
  value: any;
  options?: string[];
  required: boolean;
  validation?: {
    min?: number | string;
    max?: number | string;
    pattern?: string;
    customValidator?: string;
  };
}

export interface ReportSection {
  id: string;
  type: 'table' | 'chart' | 'metric' | 'text' | 'image' | 'summary';
  title: string;
  dataSource: string;
  configuration: any;
  position: { x: number; y: number; width: number; height: number; };
  permissions?: {
    viewRoles: string[];
    editRoles: string[];
  };
}

export interface ReportFilter {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  label: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
}

export interface ReportLayout {
  orientation: 'portrait' | 'landscape';
  pageSize: 'a4' | 'letter' | 'legal';
  margins: { top: number; right: number; bottom: number; left: number; };
  columns: number;
  header: { enabled: boolean; content: string; height: number; };
  footer: { enabled: boolean; content: string; height: number; };
}

export interface ReportStyling {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: number;
  includeLogo: boolean;
  logoUrl?: string;
  theme: 'light' | 'dark' | 'corporate';
  customCss?: string;
}

export interface ExportJob {
  id: string;
  reportId: string;
  reportName: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  requestedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  error?: string;
  fileSize?: number;
  expiresAt?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnailUrl?: string;
  sections: ReportSection[];
  defaultParameters: ReportParameter[];
  tags: string[];
  popularity: number;
  createdBy: string;
}

export interface ReportAnalytics {
  reportId: string;
  views: number;
  exports: number;
  lastAccessed: string;
  popularFormats: { format: string; count: number; }[];
  averageGenerationTime: number;
  errorRate: number;
  userEngagement: {
    totalUsers: number;
    regularUsers: number;
    timeSpent: number;
  };
}

// Main Reporting Service Class
export class ReportingService {
  private baseURL = '/api/reports';

  // Report Management
  async getReports(filters?: {
    type?: Report['type'];
    category?: string;
    status?: Report['status'];
    createdBy?: string;
  }): Promise<Report[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const response = await apiClient.get(`${this.baseURL}?${params.toString()}`);
    return response.data;
  }

  async getReport(reportId: string): Promise<Report> {
    const response = await apiClient.get(`${this.baseURL}/${reportId}`);
    return response.data;
  }

  async createReport(report: Omit<Report, 'id' | 'lastGenerated' | 'createdBy'>): Promise<Report> {
    const response = await apiClient.post(this.baseURL, report);
    return response.data;
  }

  async updateReport(reportId: string, report: Partial<Report>): Promise<Report> {
    const response = await apiClient.put(`${this.baseURL}/${reportId}`, report);
    return response.data;
  }

  async deleteReport(reportId: string): Promise<void> {
    await apiClient.delete(`${this.baseURL}/${reportId}`);
  }

  async duplicateReport(reportId: string, newName?: string): Promise<Report> {
    const response = await apiClient.post(`${this.baseURL}/${reportId}/duplicate`, {
      name: newName
    });
    return response.data;
  }

  // Report Generation and Export
  async generateReport(reportId: string, parameters?: Record<string, any>): Promise<any> {
    const response = await apiClient.post(`${this.baseURL}/${reportId}/generate`, {
      parameters
    });
    return response.data;
  }

  async exportReport(
    reportId: string, 
    format: 'pdf' | 'excel' | 'csv' | 'json',
    options?: ExportOptions,
    parameters?: Record<string, any>
  ): Promise<ExportJob> {
    const response = await apiClient.post(`${this.baseURL}/${reportId}/export`, {
      format,
      options,
      parameters
    });
    return response.data;
  }

  async getExportJobs(filters?: {
    reportId?: string;
    status?: ExportJob['status'];
    format?: string;
  }): Promise<ExportJob[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const response = await apiClient.get(`${this.baseURL}/exports?${params.toString()}`);
    return response.data;
  }

  async getExportJob(jobId: string): Promise<ExportJob> {
    const response = await apiClient.get(`${this.baseURL}/exports/${jobId}`);
    return response.data;
  }

  async cancelExportJob(jobId: string): Promise<void> {
    await apiClient.post(`${this.baseURL}/exports/${jobId}/cancel`);
  }

  async downloadExport(jobId: string): Promise<Blob> {
    const response = await apiClient.get(`${this.baseURL}/exports/${jobId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Schedule Management
  async createSchedule(reportId: string, schedule: ReportSchedule): Promise<ReportSchedule> {
    const response = await apiClient.post(`${this.baseURL}/${reportId}/schedule`, schedule);
    return response.data;
  }

  async updateSchedule(reportId: string, schedule: Partial<ReportSchedule>): Promise<ReportSchedule> {
    const response = await apiClient.put(`${this.baseURL}/${reportId}/schedule`, schedule);
    return response.data;
  }

  async deleteSchedule(reportId: string): Promise<void> {
    await apiClient.delete(`${this.baseURL}/${reportId}/schedule`);
  }

  async getScheduledReports(): Promise<Report[]> {
    const response = await apiClient.get(`${this.baseURL}/scheduled`);
    return response.data;
  }

  // Templates
  async getTemplates(category?: string): Promise<ReportTemplate[]> {
    const params = category ? `?category=${category}` : '';
    const response = await apiClient.get(`${this.baseURL}/templates${params}`);
    return response.data;
  }

  async getTemplate(templateId: string): Promise<ReportTemplate> {
    const response = await apiClient.get(`${this.baseURL}/templates/${templateId}`);
    return response.data;
  }

  async createFromTemplate(templateId: string, reportData: {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
  }): Promise<Report> {
    const response = await apiClient.post(`${this.baseURL}/templates/${templateId}/create`, reportData);
    return response.data;
  }

  async saveAsTemplate(reportId: string, templateData: {
    name: string;
    description: string;
    category: string;
    tags?: string[];
  }): Promise<ReportTemplate> {
    const response = await apiClient.post(`${this.baseURL}/${reportId}/save-as-template`, templateData);
    return response.data;
  }

  // Analytics and Insights
  async getReportAnalytics(reportId: string): Promise<ReportAnalytics> {
    const response = await apiClient.get(`${this.baseURL}/${reportId}/analytics`);
    return response.data;
  }

  async getReportingDashboardData(): Promise<{
    totalReports: number;
    activeReports: number;
    scheduledReports: number;
    recentExports: ExportJob[];
    popularReports: Report[];
    systemHealth: {
      averageGenerationTime: number;
      successRate: number;
      queueLength: number;
    };
  }> {
    const response = await apiClient.get(`${this.baseURL}/dashboard`);
    return response.data;
  }

  // Sharing and Permissions
  async shareReport(reportId: string, shareData: {
    recipients: string[];
    permissions: 'view' | 'edit';
    message?: string;
    expiresAt?: string;
  }): Promise<{ shareId: string; shareUrl: string; }> {
    const response = await apiClient.post(`${this.baseURL}/${reportId}/share`, shareData);
    return response.data;
  }

  async getSharedReports(): Promise<Report[]> {
    const response = await apiClient.get(`${this.baseURL}/shared`);
    return response.data;
  }

  async updateReportPermissions(reportId: string, permissions: {
    viewRoles: string[];
    editRoles: string[];
    isPublic: boolean;
  }): Promise<void> {
    await apiClient.put(`${this.baseURL}/${reportId}/permissions`, permissions);
  }

  // Data Source Integration
  async getDataSources(): Promise<{
    id: string;
    name: string;
    type: string;
    description: string;
    fields: Array<{
      name: string;
      type: string;
      description: string;
    }>;
    lastUpdated: string;
  }[]> {
    const response = await apiClient.get(`${this.baseURL}/datasources`);
    return response.data;
  }

  async validateReportData(reportId: string): Promise<{
    isValid: boolean;
    errors: Array<{
      section: string;
      field: string;
      error: string;
    }>;
    warnings: Array<{
      section: string;
      field: string;
      warning: string;
    }>;
  }> {
    const response = await apiClient.post(`${this.baseURL}/${reportId}/validate`);
    return response.data;
  }

  // Utility Methods
  async previewReport(reportId: string, parameters?: Record<string, any>): Promise<{
    html: string;
    metadata: {
      pageCount: number;
      generationTime: number;
      dataPoints: number;
    };
  }> {
    const response = await apiClient.post(`${this.baseURL}/${reportId}/preview`, {
      parameters
    });
    return response.data;
  }

  async getReportHistory(reportId: string, limit = 10): Promise<Array<{
    version: number;
    createdAt: string;
    createdBy: string;
    changes: string[];
    isActive: boolean;
  }>> {
    const response = await apiClient.get(`${this.baseURL}/${reportId}/history?limit=${limit}`);
    return response.data;
  }

  async restoreReportVersion(reportId: string, version: number): Promise<Report> {
    const response = await apiClient.post(`${this.baseURL}/${reportId}/restore/${version}`);
    return response.data;
  }

  // Bulk Operations
  async bulkExport(reportIds: string[], format: string, options?: ExportOptions): Promise<{
    batchId: string;
    jobs: ExportJob[];
  }> {
    const response = await apiClient.post(`${this.baseURL}/bulk-export`, {
      reportIds,
      format,
      options
    });
    return response.data;
  }

  async bulkDelete(reportIds: string[]): Promise<{
    deleted: string[];
    failed: Array<{ id: string; error: string; }>;
  }> {
    const response = await apiClient.post(`${this.baseURL}/bulk-delete`, {
      reportIds
    });
    return response.data;
  }

  async bulkUpdateStatus(reportIds: string[], status: Report['status']): Promise<{
    updated: string[];
    failed: Array<{ id: string; error: string; }>;
  }> {
    const response = await apiClient.post(`${this.baseURL}/bulk-update-status`, {
      reportIds,
      status
    });
    return response.data;
  }
}

// Create singleton instance
export const reportingService = new ReportingService();

// Export utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getExportStatusColor = (status: ExportJob['status']): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status) {
    case 'completed': return 'success';
    case 'processing': return 'info';
    case 'pending': return 'warning';
    case 'failed': return 'error';
    case 'cancelled': return 'default';
    default: return 'default';
  }
};

export const estimateExportTime = (reportType: string, format: string, dataSize: number): number => {
  // Estimation logic in seconds
  let baseTime = 10; // Base 10 seconds
  
  // Format multipliers
  const formatMultipliers: Record<string, number> = {
    'csv': 1,
    'excel': 1.5,
    'pdf': 2,
    'json': 0.8
  };
  
  // Report type multipliers
  const typeMultipliers: Record<string, number> = {
    'standard': 1,
    'custom': 1.3,
    'scheduled': 0.9
  };
  
  // Data size impact (assumes dataSize is number of records)
  const dataSizeMultiplier = Math.max(1, Math.log10(dataSize || 1) / 3);
  
  return Math.round(
    baseTime * 
    (formatMultipliers[format] || 1) * 
    (typeMultipliers[reportType] || 1) * 
    dataSizeMultiplier
  );
};

// Export default service instance
export default reportingService;