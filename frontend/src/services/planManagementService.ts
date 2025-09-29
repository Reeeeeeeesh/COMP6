/**
 * Plan Management Service - API integration for bonus plan operations
 * Follows established service pattern for consistent API communication
 */

import { API_BASE_URL as BASE_URL } from '../config';
import { apiClient } from './apiClient';

const API_BASE_URL = `${BASE_URL}/api/v1/plan-management`;

// Core Types
export interface BonusPlan {
  id: string;
  name: string;
  version: number;
  status: 'draft' | 'approved' | 'locked' | 'archived';
  effective_from?: string;
  effective_to?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
  locked_by?: string;
  locked_at?: string;
}

export interface PlanStep {
  id: string;
  plan_id: string;
  name: string;
  step_order: number;
  expression: string;
  outputs: string[];
  description?: string;
  created_at: string;
}

export interface PlanInput {
  id: string;
  plan_id: string;
  input_catalog_id: string;
  name: string;
  data_type: string;
  validation_rules: any;
  created_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  tenant_id?: string;
}

export interface ExpressionValidation {
  valid: boolean;
  error?: string;
  variables: string[];
  syntax_tree?: any;
}

export interface WorkflowStatus {
  plan_id: string;
  current_status: string;
  possible_transitions: string[];
  workflow_history: Array<{
    action: string;
    performed_by: string;
    timestamp: string;
    notes?: string;
  }>;
}

// Plan Management APIs
export const getPlans = async (status?: string): Promise<BonusPlan[]> => {
  const url = status ? `${API_BASE_URL}/plans?status=${status}` : `${API_BASE_URL}/plans`;
  const response = await apiClient.get(url);
  const result: ApiResponse<{ plans?: BonusPlan[] }> = response.data;

  if (!result.success && !result.data?.plans) {
    throw new Error(result.message || 'Failed to fetch plans');
  }

  return result.data?.plans ?? [];
};

export const getPlan = async (planId: string): Promise<BonusPlan> => {
  const response = await apiClient.get(`${API_BASE_URL}/plans/${planId}`);
  const result: ApiResponse<{ plan?: BonusPlan }> = response.data;

  const plan = result.data?.plan;
  if (!plan) {
    throw new Error(result.message || 'Failed to fetch plan');
  }

  return plan;
};

export const createPlan = async (planData: Partial<BonusPlan>): Promise<BonusPlan> => {
  // Add required fields that the backend expects
  const createData = {
    ...planData,
    version: 1, // New plans start at version 1
    tenant_id: 'default', // Use default tenant for now
    status: planData.status || 'draft'
  };

  const response = await apiClient.post(`${API_BASE_URL}/plans`, createData);
  const result: ApiResponse<{ plan?: BonusPlan }> = response.data;

  const plan = result.data?.plan;
  if (!plan) {
    throw new Error(result.message || 'Failed to create plan');
  }

  return plan;
};

export const updatePlan = async (planId: string, planData: Partial<BonusPlan>): Promise<BonusPlan> => {
  const response = await apiClient.put(`${API_BASE_URL}/plans/${planId}`, planData);
  const result: ApiResponse<{ plan?: BonusPlan }> = response.data;

  const plan = result.data?.plan;
  if (!plan) {
    throw new Error(result.message || 'Failed to update plan');
  }

  return plan;
};

// Plan Steps APIs
export const getPlanSteps = async (planId: string): Promise<PlanStep[]> => {
  const response = await apiClient.get(`${API_BASE_URL}/plans/${planId}/steps`);
  const result: ApiResponse<{ steps?: PlanStep[] }> = response.data;

  if (!result.success && !result.data?.steps) {
    throw new Error(result.message || 'Failed to fetch plan steps');
  }

  return result.data?.steps ?? [];
};

export const createPlanStep = async (planId: string, stepData: Partial<PlanStep>): Promise<PlanStep> => {
  const response = await apiClient.post(`${API_BASE_URL}/plans/${planId}/steps`, stepData);
  const result: ApiResponse<{ step?: PlanStep }> = response.data;

  const step = result.data?.step;
  if (!step) {
    throw new Error(result.message || 'Failed to create plan step');
  }

  return step;
};

export const updatePlanStep = async (stepId: string, stepData: Partial<PlanStep>): Promise<PlanStep> => {
  const response = await apiClient.put(`${API_BASE_URL}/steps/${stepId}`, stepData);
  const result: ApiResponse<{ step?: PlanStep }> = response.data;

  const step = result.data?.step;
  if (!step) {
    throw new Error(result.message || 'Failed to update plan step');
  }

  return step;
};

export const deletePlanStep = async (stepId: string): Promise<void> => {
  const response = await apiClient.delete(`${API_BASE_URL}/steps/${stepId}`);
  const result: ApiResponse = response.data;
  if (!result.success) {
    throw new Error(result.message || 'Failed to delete plan step');
  }
};

// Expression Validation APIs
export const validateExpression = async (planId: string, expression: string, stepOrder?: number): Promise<ExpressionValidation> => {
  const response = await apiClient.post(
    `${API_BASE_URL}/plans/${planId}/validate-expression`,
    { expression, step_order: stepOrder }
  );
  const result: ApiResponse<ExpressionValidation> = response.data;

  if (!result.data) {
    throw new Error(result.message || 'Failed to validate expression');
  }

  return {
    ...result.data,
    valid: Boolean(result.data.valid),
    variables: result.data.variables || [],
  };
};

// Workflow APIs  
export const approvePlan = async (planId: string, userId: string, notes?: string): Promise<any> => {
  const response = await apiClient.post(`${API_BASE_URL}/plans/${planId}/approve?user_id=${userId}`, { notes });
  const result: ApiResponse = response.data;
  if (!result.success) {
    throw new Error(result.message || 'Failed to approve plan');
  }
  return result.data;
};

export const lockPlan = async (planId: string, userId: string, notes?: string): Promise<any> => {
  const response = await apiClient.post(`${API_BASE_URL}/plans/${planId}/lock?user_id=${userId}`, { notes });
  const result: ApiResponse = response.data;
  if (!result.success) {
    throw new Error(result.message || 'Failed to lock plan');
  }
  return result.data;
};

export const getWorkflowStatus = async (planId: string): Promise<WorkflowStatus> => {
  const response = await apiClient.get(`${API_BASE_URL}/plans/${planId}/workflow-status`);
  const result: ApiResponse<WorkflowStatus> = response.data;
  if (!result.success) {
    throw new Error(result.message || 'Failed to get workflow status');
  }
  return result.data;
};

// ================================
// Plan Execution with Tape
// ================================

export interface StepResult {
  step_name: string;
  value: {
    value: string;
    type: string;
  };
  created_at: string;
}

export interface CalculationTape {
  plan_id: string;
  run_id: string;
  calculation_tape: Record<string, StepResult[]>;
  total_employees: number;
  total_steps: number;
}

export const executePlanWithTape = async (planId: string, precisionMode: string = 'balanced', uploadId?: string): Promise<any> => {
  const url = new URL(`${API_BASE_URL}/plans/${planId}/execute-with-tape`);
  url.searchParams.append('precision_mode', precisionMode);
  if (uploadId) {
    url.searchParams.append('upload_id', uploadId);
  }
  const response = await apiClient.post(url.toString());
  const result: ApiResponse = response.data;
  if (!result.success) {
    throw new Error(result.message || 'Failed to execute plan with tape');
  }
  return result.data;
};

export const getCalculationTape = async (planId: string, runId: string, employeeRef?: string): Promise<CalculationTape> => {
  const url = new URL(`${API_BASE_URL}/plans/${planId}/runs/${runId}/calculation-tape`);
  if (employeeRef) {
    url.searchParams.append('employee_ref', employeeRef);
  }
  const response = await apiClient.get(url.toString());
  const result: ApiResponse<CalculationTape> = response.data;
  if (!result.success) {
    throw new Error(result.message || 'Failed to get calculation tape');
  }
  return result.data;
};

export const getStepResults = async (planId: string, runId: string, stepName: string): Promise<any> => {
  const response = await apiClient.get(`${API_BASE_URL}/plans/${planId}/runs/${runId}/step-results/${stepName}`);
  const result: ApiResponse = response.data;
  if (!result.success) {
    throw new Error(result.message || 'Failed to get step results');
  }
  return result.data;
};

// Snapshot Hash & Reproducibility
export interface SnapshotSummary {
  plan_id: string;
  plan_name: string;
  plan_version: number;
  plan_status: string;
  total_steps: number;
  total_inputs: number;
  step_names: string[];
  snapshot_scope: string[];
  reproducibility_guarantee: string;
}

export interface ReproducibilityVerification {
  is_reproducible: boolean;
  current_hash: string;
  expected_hash: string;
  verified_at: string;
  differences?: string[];
}

export interface SnapshotHashInfo {
  run_id: string;
  plan_id: string;
  snapshot_hash: string;
  started_at: string;
  finished_at?: string;
  status: string;
  reproducibility_guaranteed: boolean;
}

export const getSnapshotSummary = async (planId: string): Promise<SnapshotSummary> => {
  const response = await apiClient.get(`${API_BASE_URL}/plans/${planId}/snapshot-summary`);
  const result: ApiResponse<SnapshotSummary> = response.data;
  if (!result.success) {
    throw new Error(result.message || 'Failed to get snapshot summary');
  }
  return result.data;
};

export const verifyReproducibility = async (planId: string, expectedHash: string, precisionMode: string = 'balanced'): Promise<ReproducibilityVerification> => {
  const url = new URL(`${API_BASE_URL}/plans/${planId}/verify-reproducibility`);
  url.searchParams.append('expected_hash', expectedHash);
  url.searchParams.append('precision_mode', precisionMode);
  const response = await apiClient.post(url.toString());
  const result: ApiResponse<ReproducibilityVerification> = response.data;
  if (!result.success) {
    throw new Error(result.message || 'Failed to verify reproducibility');
  }
  return result.data;
};

export const getRunSnapshotHash = async (runId: string): Promise<SnapshotHashInfo> => {
  const response = await apiClient.get(`${API_BASE_URL}/runs/${runId}/snapshot-hash`);
  const result: ApiResponse<SnapshotHashInfo> = response.data;
  if (!result.success) {
    throw new Error(result.message || 'Failed to get snapshot hash');
  }
  return result.data;
};
