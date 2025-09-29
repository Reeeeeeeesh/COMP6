import { apiClient } from './apiClient';

export type ExceptionSeverity = 'warning' | 'error' | 'critical';
export type ExceptionStatus = 'open' | 'acknowledged' | 'resolved';

export interface ExceptionEvent {
  id: string;
  source: string;
  reference_id?: string;
  exception_code: string;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  context?: Record<string, any>;
  created_at: string;
  resolved_by?: string;
  resolved_at?: string;
}

export const exceptionService = {
  async getExceptions(filters: { source?: string; severity?: ExceptionSeverity; status?: ExceptionStatus; from?: string; to?: string } = {}): Promise<ExceptionEvent[]> {
    const params = new URLSearchParams();
    if (filters.source) params.set('source', filters.source);
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.status) params.set('status', filters.status);
    if (filters.from) params.set('date_from', filters.from);
    if (filters.to) params.set('date_to', filters.to);
    const res = await apiClient.get(`/api/v1/exceptions?${params.toString()}`);
    return (res.data as any).data as ExceptionEvent[];
  },

  async getBatchExceptions(batchResultId: string): Promise<ExceptionEvent[]> {
    const res = await apiClient.get(`/api/v1/batch-results/${batchResultId}/exceptions`);
    return (res.data as any).data as ExceptionEvent[];
  },

  async resolveException(exceptionId: string, notes?: string): Promise<void> {
    await apiClient.post(`/api/v1/exceptions/${exceptionId}/resolve`, { notes });
  },

  async getExceptionSummary(): Promise<Record<string, number>> {
    const res = await apiClient.get('/api/v1/exceptions/summary');
    return (res.data as any).data as Record<string, number>;
  },

  async bulkResolveExceptions(exceptionIds: string[], notes?: string): Promise<void> {
    // Optional bulk endpoint; for now, resolve sequentially
    for (const id of exceptionIds) {
      await this.resolveException(id, notes);
    }
  },

  formatSeverity(sev: ExceptionSeverity): string {
    return sev.charAt(0).toUpperCase() + sev.slice(1);
  },

  formatStatus(st: ExceptionStatus): string {
    return st.charAt(0).toUpperCase() + st.slice(1);
  },
};

export default exceptionService;

