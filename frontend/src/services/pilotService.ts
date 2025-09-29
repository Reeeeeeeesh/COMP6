import { apiRequest, ApiResponse } from './apiClient';

export const setupPilot = (config: any): Promise<ApiResponse> =>
  apiRequest.post(`/api/v1/pilot/setup`, config);

export const executePilot = (pilotId: string, referenceData: any): Promise<ApiResponse> =>
  apiRequest.post(`/api/v1/pilot/${pilotId}/execute`, referenceData);

export const getPilotStatus = (pilotId: string): Promise<ApiResponse> =>
  apiRequest.get(`/api/v1/pilot/${pilotId}/status`);

export const reconcileVariance = (pilotId: string, tolerance_pct: number): Promise<ApiResponse> =>
  apiRequest.post(`/api/v1/pilot/${pilotId}/reconcile`, { tolerance_pct });

export const approvePilot = (pilotId: string): Promise<ApiResponse> =>
  apiRequest.post(`/api/v1/pilot/${pilotId}/approve`, {});

