import { apiClient } from './apiClient';

export interface PayrollExportResult {
  success: boolean;
  filename: string;
  download_url: string;
  checksum_sha256: string;
  exported_count: number;
}

export const payrollService = {
  async exportPayroll(batchResultId: string, payDate: string): Promise<PayrollExportResult> {
    const res = await apiClient.post(`/api/v1/payroll/export/${batchResultId}?pay_date=${encodeURIComponent(payDate)}`);
    return (res.data as any).data as PayrollExportResult;
  },

  async previewPayroll(batchResultId: string, payDate: string): Promise<{ count: number; total_cash: number; pay_date: string }> {
    const res = await apiClient.get(`/api/v1/payroll/preview/${batchResultId}?pay_date=${encodeURIComponent(payDate)}`);
    return (res.data as any).data as any;
  },

  async getPayrollExports(): Promise<any[]> {
    const res = await apiClient.get('/api/v1/payroll/exports');
    return (res.data as any).data as any[];
  },

  async downloadPayrollFile(downloadUrl: string): Promise<void> {
    // For now, navigate browser to the download URL
    window.location.href = downloadUrl;
  },
};

export default payrollService;

