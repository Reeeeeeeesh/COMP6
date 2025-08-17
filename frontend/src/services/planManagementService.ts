/**
 * Plan Management Service - API integration for bonus plan operations
 * Follows established service pattern for consistent API communication
 */

import { API_BASE_URL as BASE_URL } from '../config';

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
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch plans: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse<BonusPlan[]> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch plans');
  }
  
  return result.data;
};

export const getPlan = async (planId: string): Promise<BonusPlan> => {
  const response = await fetch(`${API_BASE_URL}/plans/${planId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch plan: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse<BonusPlan> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch plan');
  }
  
  return result.data;
};

export const createPlan = async (planData: Partial<BonusPlan>): Promise<BonusPlan> => {
  const response = await fetch(`${API_BASE_URL}/plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(planData),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create plan: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse<BonusPlan> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to create plan');
  }
  
  return result.data;
};

export const updatePlan = async (planId: string, planData: Partial<BonusPlan>): Promise<BonusPlan> => {
  const response = await fetch(`${API_BASE_URL}/plans/${planId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(planData),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update plan: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse<BonusPlan> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to update plan');
  }
  
  return result.data;
};

// Plan Steps APIs
export const getPlanSteps = async (planId: string): Promise<PlanStep[]> => {
  const response = await fetch(`${API_BASE_URL}/plans/${planId}/steps`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch plan steps: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse<PlanStep[]> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch plan steps');
  }
  
  return result.data;
};

export const createPlanStep = async (planId: string, stepData: Partial<PlanStep>): Promise<PlanStep> => {
  const response = await fetch(`${API_BASE_URL}/plans/${planId}/steps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(stepData),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create plan step: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse<PlanStep> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to create plan step');
  }
  
  return result.data;
};

export const updatePlanStep = async (stepId: string, stepData: Partial<PlanStep>): Promise<PlanStep> => {
  const response = await fetch(`${API_BASE_URL}/steps/${stepId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(stepData),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update plan step: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse<PlanStep> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to update plan step');
  }
  
  return result.data;
};

export const deletePlanStep = async (stepId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/steps/${stepId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete plan step: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to delete plan step');
  }
};

// Expression Validation APIs
export const validateExpression = async (planId: string, expression: string, stepOrder?: number): Promise<ExpressionValidation> => {
  const response = await fetch(`${API_BASE_URL}/plans/${planId}/validate-expression`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expression, step_order: stepOrder }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to validate expression: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse<ExpressionValidation> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to validate expression');
  }
  
  return result.data;
};

// Workflow APIs  
export const approvePlan = async (planId: string, userId: string, notes?: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/plans/${planId}/approve?user_id=${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to approve plan: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to approve plan');
  }
  
  return result.data;
};

export const lockPlan = async (planId: string, userId: string, notes?: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/plans/${planId}/lock?user_id=${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to lock plan: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to lock plan');
  }
  
  return result.data;
};

export const getWorkflowStatus = async (planId: string): Promise<WorkflowStatus> => {
  const response = await fetch(`${API_BASE_URL}/plans/${planId}/workflow-status`);
  
  if (!response.ok) {
    throw new Error(`Failed to get workflow status: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse<WorkflowStatus> = await response.json();
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

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to execute plan with tape: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse = await response.json();
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

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error(`Failed to get calculation tape: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse<CalculationTape> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to get calculation tape');
  }
  
  return result.data;
};

export const getStepResults = async (planId: string, runId: string, stepName: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/plans/${planId}/runs/${runId}/step-results/${stepName}`);
  
  if (!response.ok) {
    throw new Error(`Failed to get step results: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse = await response.json();
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
  const response = await fetch(`${API_BASE_URL}/plans/${planId}/snapshot-summary`);
  
  if (!response.ok) {
    throw new Error(`Failed to get snapshot summary: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse<SnapshotSummary> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to get snapshot summary');
  }
  
  return result.data;
};

export const verifyReproducibility = async (planId: string, expectedHash: string, precisionMode: string = 'balanced'): Promise<ReproducibilityVerification> => {
  const url = new URL(`${API_BASE_URL}/plans/${planId}/verify-reproducibility`);
  url.searchParams.append('expected_hash', expectedHash);
  url.searchParams.append('precision_mode', precisionMode);

  const response = await fetch(url.toString(), { method: 'POST' });
  
  if (!response.ok) {
    throw new Error(`Failed to verify reproducibility: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse<ReproducibilityVerification> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to verify reproducibility');
  }
  
  return result.data;
};

export const getRunSnapshotHash = async (runId: string): Promise<SnapshotHashInfo> => {
  const response = await fetch(`${API_BASE_URL}/runs/${runId}/snapshot-hash`);
  
  if (!response.ok) {
    throw new Error(`Failed to get snapshot hash: ${response.status} ${response.statusText}`);
  }
  
  const result: ApiResponse<SnapshotHashInfo> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to get snapshot hash');
  }
  
  return result.data;
};