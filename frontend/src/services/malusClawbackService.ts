import { apiRequest, ApiResponse } from './apiClient';

export interface RiskEventPayload {
  employee_id: string;
  cycle: string;
  event_type: 'conduct_breach' | 'risk_threshold' | 'manual_adjustment';
  decision: 'malus' | 'clawback' | 'waive';
  amount_or_percentage: number;
  is_percentage?: boolean;
  currency?: string;
  occurred_at?: string;
  rationale?: string;
}

export const createRiskEvent = (payload: RiskEventPayload): Promise<ApiResponse> =>
  apiRequest.post(`/api/v1/risk-events/`, payload);

export const getRiskEvents = (employeeId: string, cycle: string): Promise<ApiResponse> =>
  apiRequest.get(`/api/v1/risk-events/${employeeId}/${cycle}`);

export const approveRiskEvent = (eventId: string, rationale?: string): Promise<ApiResponse> =>
  apiRequest.post(`/api/v1/risk-events/${eventId}/approve`, { rationale });

export const applyMalus = (employeeId: string, details: { cycle: string; amount_or_percentage: number; is_percentage?: boolean; currency?: string; rationale?: string; }): Promise<ApiResponse> =>
  apiRequest.post(`/api/v1/risk-events/employees/${employeeId}/malus`, details);

export const applyClawback = (employeeId: string, details: { cycle: string; amount_or_percentage: number; is_percentage?: boolean; currency?: string; rationale?: string; }): Promise<ApiResponse> =>
  apiRequest.post(`/api/v1/risk-events/employees/${employeeId}/clawback`, details);

export const restateStatement = (employeeId: string, cycle: string): Promise<ApiResponse> =>
  apiRequest.post(`/api/v1/risk-events/employees/${employeeId}/restate-statement`, { cycle });

