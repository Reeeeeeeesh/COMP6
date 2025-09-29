/**
 * Team RAF Service - API integration for Revenue Adjustment Factor operations
 * Provides functions for creating, previewing, approving RAF configurations
 * and managing team revenue history data.
 */

import { apiClient } from './apiClient';

// ================================
// TypeScript Interfaces
// ================================

export type RAFMethod = 'CAGR_3Y' | 'AVG_YOY_3Y';

export type RAFStatus = 'draft' | 'approved' | 'locked';

export interface RAFConfigBase {
  team_id: string;
  cycle: string;
  method: RAFMethod;
  include_perf_fees: boolean;
  const_currency: boolean;
  cap_factor?: number;
  floor_factor?: number;
  weight_pct: number;
}

export interface RAFConfigCreate extends RAFConfigBase {}

export interface RAFConfigUpdate {
  method?: RAFMethod;
  include_perf_fees?: boolean;
  const_currency?: boolean;
  cap_factor?: number;
  floor_factor?: number;
  weight_pct?: number;
}

export interface RAFConfigResponse extends RAFConfigBase {
  id: string;
  status: RAFStatus;
  created_by: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  rationale?: string;
}

export interface RAFStatusResponse {
  team_id: string;
  cycle: string;
  has_config: boolean;
  config_id?: string;
  status?: RAFStatus;
  method?: RAFMethod;
  include_perf_fees?: boolean;
  const_currency?: boolean;
  cap_factor?: number;
  floor_factor?: number;
  weight_pct?: number;
  created_by?: string;
  created_at?: string;
  approved_by?: string;
  approved_at?: string;
  rationale?: string;
  has_snapshot?: boolean;
  snapshot_id?: string;
  computed_factor?: number;
  inputs_hash?: string;
  cap_applied?: boolean;
  floor_applied?: boolean;
}

export interface RAFPreviewRequest {
  config_id: string;
}

export interface RAFPreviewResponse {
  config_id: string;
  team_id: string;
  cycle: string;
  method: RAFMethod;
  computed_factor: number;
  original_factor: number;
  cap_applied: boolean;
  floor_applied: boolean;
  explanation_tape: Record<string, any>;
  weight_pct: number;
  status: RAFStatus;
  inputs_hash?: string;
}

export interface RAFApprovalRequest {
  rationale: string;
  approver_id?: string;
}

export interface RAFHistoryEvent {
  event: string;
  timestamp: string;
  user_id: string;
  user_email: string;
  details: Record<string, any>;
}

export interface RAFHistoryResponse {
  team_id: string;
  cycle: string;
  has_config: boolean;
  config_id?: string;
  status?: RAFStatus;
  history: RAFHistoryEvent[];
}

export interface TeamRevenueHistoryRow {
  team_code: string;
  fiscal_year: number;
  reported_revenue: number;
  organic_revenue?: number;
  currency: string;
  perf_fee_component?: number;
  notes?: string;
}

export interface TeamRevenueHistoryImport {
  team_id: string;
  file_id?: string;
  rows?: TeamRevenueHistoryRow[];
}

export interface TeamRevenueDataResponse {
  id: string;
  team_id: string;
  fiscal_year: number;
  reported_revenue: number;
  organic_revenue?: number;
  currency: string;
  perf_fee_component?: number;
  notes?: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  division?: string;
  peer_group?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface FileUploadResponse {
  team_id: string;
  filename: string;
  rows_processed: number;
  total_rows: number;
}

// ================================
// Service Functions
// ================================

/**
 * Create a new RAF configuration for a team
 */
export async function createRAFConfig(
  teamId: string,
  cycle: string,
  config: Omit<RAFConfigCreate, 'team_id' | 'cycle'>
): Promise<RAFConfigResponse> {
  try {
    const configData: RAFConfigCreate = {
      team_id: teamId,
      cycle,
      ...config
    };

    const response = await apiClient.post<RAFConfigResponse>(
      `/api/v1/teams/${teamId}/raf/config`,
      configData
    );

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Failed to create RAF configuration: ${response.statusText}`);
    }

    return response.data;
  } catch (error: any) {
    console.error('Error creating RAF configuration:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to create RAF configuration'
    );
  }
}

/**
 * Get RAF status for a team and cycle
 */
export async function getRAFStatus(
  teamId: string,
  cycle: string
): Promise<RAFStatusResponse> {
  try {
    const response = await apiClient.get<RAFStatusResponse>(
      `/api/v1/teams/${teamId}/raf/${cycle}`
    );

    if (response.status !== 200) {
      throw new Error(`Failed to get RAF status: ${response.statusText}`);
    }

    return response.data;
  } catch (error: any) {
    console.error('Error getting RAF status:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to get RAF status'
    );
  }
}

/**
 * Preview RAF calculation
 */
export async function previewRAF(
  teamId: string,
  cycle: string,
  configId: string
): Promise<RAFPreviewResponse> {
  try {
    const request: RAFPreviewRequest = { config_id: configId };
    
    const response = await apiClient.post<RAFPreviewResponse>(
      `/api/v1/teams/${teamId}/raf/${cycle}/preview`,
      request
    );

    if (response.status !== 200) {
      throw new Error(`Failed to preview RAF: ${response.statusText}`);
    }

    return response.data;
  } catch (error: any) {
    console.error('Error previewing RAF:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to preview RAF calculation'
    );
  }
}

/**
 * Approve RAF configuration
 */
export async function approveRAF(
  teamId: string,
  cycle: string,
  rationale: string,
  approverId?: string
): Promise<ApiResponse> {
  try {
    const request: RAFApprovalRequest = {
      rationale,
      ...(approverId && { approver_id: approverId })
    };

    const response = await apiClient.post<ApiResponse>(
      `/api/v1/teams/${teamId}/raf/${cycle}/approve`,
      request
    );

    if (response.status !== 200) {
      throw new Error(`Failed to approve RAF: ${response.statusText}`);
    }

    return response.data;
  } catch (error: any) {
    console.error('Error approving RAF:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to approve RAF configuration'
    );
  }
}

/**
 * Get RAF approval history
 */
export async function getRAFHistory(
  teamId: string,
  cycle: string
): Promise<RAFHistoryResponse> {
  try {
    const response = await apiClient.get<RAFHistoryResponse>(
      `/api/v1/teams/${teamId}/raf/${cycle}/history`
    );

    if (response.status !== 200) {
      throw new Error(`Failed to get RAF history: ${response.statusText}`);
    }

    return response.data;
  } catch (error: any) {
    console.error('Error getting RAF history:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to get RAF history'
    );
  }
}

/**
 * Upload team revenue history CSV file
 */
export async function uploadTeamRevenueHistory(
  file: File,
  teamId: string
): Promise<ApiResponse<FileUploadResponse>> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('team_id', teamId);

    const response = await apiClient.post<ApiResponse<FileUploadResponse>>(
      '/api/v1/teams/revenue-history/import',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(`Failed to upload team revenue history: ${response.statusText}`);
    }

    return response.data;
  } catch (error: any) {
    console.error('Error uploading team revenue history:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to upload team revenue history'
    );
  }
}

/**
 * Get team revenue history template
 */
export async function getRevenueHistoryTemplate(): Promise<ApiResponse<{ template: string; filename: string; content_type: string }>> {
  try {
    const response = await apiClient.get<ApiResponse<{ template: string; filename: string; content_type: string }>>(
      '/api/v1/teams/revenue-history/template'
    );

    if (response.status !== 200) {
      throw new Error(`Failed to get revenue history template: ${response.statusText}`);
    }

    return response.data;
  } catch (error: any) {
    console.error('Error getting revenue history template:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to get revenue history template'
    );
  }
}

/**
 * Get all approved RAF factors for a cycle
 */
export async function getTeamRAFFactors(cycle: string): Promise<Record<string, number>> {
  try {
    const response = await apiClient.get<Record<string, number>>(
      `/api/v1/teams/raf/factors/${cycle}`
    );

    if (response.status !== 200) {
      throw new Error(`Failed to get team RAF factors: ${response.statusText}`);
    }

    return response.data;
  } catch (error: any) {
    console.error('Error getting team RAF factors:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to get team RAF factors'
    );
  }
}

/**
 * Update RAF configuration
 */
export async function updateRAFConfig(
  teamId: string,
  configId: string,
  updates: RAFConfigUpdate
): Promise<RAFConfigResponse> {
  try {
    const response = await apiClient.patch<RAFConfigResponse>(
      `/api/v1/teams/${teamId}/raf/config/${configId}`,
      updates
    );

    if (response.status !== 200) {
      throw new Error(`Failed to update RAF configuration: ${response.statusText}`);
    }

    return response.data;
  } catch (error: any) {
    console.error('Error updating RAF configuration:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to update RAF configuration'
    );
  }
}

/**
 * Delete RAF configuration
 */
export async function deleteRAFConfig(
  teamId: string,
  configId: string
): Promise<ApiResponse> {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/teams/${teamId}/raf/config/${configId}`
    );

    if (response.status !== 200) {
      throw new Error(`Failed to delete RAF configuration: ${response.statusText}`);
    }

    return response.data;
  } catch (error: any) {
    console.error('Error deleting RAF configuration:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to delete RAF configuration'
    );
  }
}

/**
 * Get list of all teams (for team selector)
 * Note: This is a placeholder - actual endpoint may need to be added to backend
 */
export async function getTeams(): Promise<Team[]> {
  try {
    // For now, we'll use a mock API call since the teams endpoint might not exist yet
    // In a real implementation, this would be something like:
    // const response = await apiClient.get<Team[]>('/api/v1/teams');
    
    // Mock data for development
    const mockTeams: Team[] = [
      { id: '1', name: 'Equity Trading', division: 'Trading', peer_group: 'Trading Teams', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      { id: '2', name: 'Fixed Income', division: 'Trading', peer_group: 'Trading Teams', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      { id: '3', name: 'Derivatives', division: 'Trading', peer_group: 'Trading Teams', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      { id: '4', name: 'Investment Banking', division: 'Banking', peer_group: 'Banking Teams', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      { id: '5', name: 'Asset Management', division: 'Management', peer_group: 'Management Teams', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ];
    
    return mockTeams;
  } catch (error: any) {
    console.error('Error getting teams:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to get teams'
    );
  }
}

export default {
  createRAFConfig,
  getRAFStatus,
  previewRAF,
  approveRAF,
  getRAFHistory,
  uploadTeamRevenueHistory,
  getRevenueHistoryTemplate,
  getTeamRAFFactors,
  updateRAFConfig,
  deleteRAFConfig,
  getTeams,
};