import { apiClient, ApiResponse } from './apiClient';

export interface PayoutTranche {
  percentage: number;
  instrument: 'cash' | 'fund_units' | 'phantom';
  grant_offset_days?: number;
  vest_offset_days?: number;
  retention_offset_days?: number;
  currency?: string;
}

export interface PayoutPolicyCreate {
  cycle: string;
  population: 'MRT' | 'non-MRT';
  rules: { tranches: PayoutTranche[] };
  version?: number;
}

export interface PayoutPolicy extends PayoutPolicyCreate {
  id: string;
  status: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

export interface PayoutLeg {
  id: string;
  employee_calculation_result_id: string;
  leg_number: number;
  amount: number;
  instrument: string;
  grant_date?: string;
  vest_date?: string;
  retention_end_date?: string;
  currency?: string;
  policy_version?: number;
  status: string;
  created_at: string;
}

export const payoutService = {
  async createPayoutPolicy(cycle: string, population: 'MRT' | 'non-MRT', rules: { tranches: PayoutTranche[] }): Promise<PayoutPolicy> {
    const res = await apiClient.post('/api/v1/payout-policies', { cycle, population, rules });
    if (!res.data?.success && (res as any).success === false) throw new Error((res as any).error || 'Failed to create policy');
    return (res.data as any).data as PayoutPolicy;
  },

  async getPayoutPolicies(cycle: string, population?: 'MRT' | 'non-MRT'): Promise<PayoutPolicy[]> {
    const url = population ? `/api/v1/payout-policies/${cycle}?population=${population}` : `/api/v1/payout-policies/${cycle}`;
    const res = await apiClient.get(url);
    return (res.data as any).data as PayoutPolicy[];
  },

  async triggerPayoutSplitting(batchResultId: string, policyId?: string): Promise<any> {
    const url = `/api/v1/batch-results/${batchResultId}/split-payouts${policyId ? `?policy_id=${policyId}` : ''}`;
    const res = await apiClient.post(url);
    return (res.data as any).data;
  },

  async getPayoutLegs(batchResultId: string): Promise<PayoutLeg[]> {
    const res = await apiClient.get(`/api/v1/batch-results/${batchResultId}/payout-legs`);
    return (res.data as any).data as PayoutLeg[];
  },

  async getEmployeePayoutHistory(employeeId: string): Promise<PayoutLeg[]> {
    const res = await apiClient.get(`/api/v1/employees/${employeeId}/payout-legs`);
    return (res.data as any).data as PayoutLeg[];
  },
};

export default payoutService;

