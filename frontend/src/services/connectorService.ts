import { apiRequest, ApiResponse } from './apiClient';

export const createConnectorConfig = (config: any): Promise<ApiResponse> =>
  apiRequest.post(`/api/v1/connectors/config`, config);

export const getConnectors = (): Promise<ApiResponse> =>
  apiRequest.get(`/api/v1/connectors`);

export const testConnector = (configId: string): Promise<ApiResponse> =>
  apiRequest.post(`/api/v1/connectors/${configId}/test`, {});

export const runConnector = (configId: string, dataType: string, filters?: any): Promise<ApiResponse> =>
  apiRequest.post(`/api/v1/connectors/${configId}/run`, { data_type: dataType, filters });

export const getConnectorRuns = (configId: string): Promise<ApiResponse> =>
  apiRequest.get(`/api/v1/connectors/${configId}/runs`);

