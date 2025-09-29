/**
 * Plan Service - Comprehensive API service for compensation plan management
 * Handles CRUD operations, collaboration, versioning, and validation
 */

import { apiClient } from './apiClient';
import {
  Plan,
  PlanTemplate,
  PlanCreateRequest,
  PlanUpdateRequest,
  PlanListResponse,
  PlanFilters,
  PlanValidationResult,
  PlanCollaborator,
  CollaboratorRole,
  PlanVersion,
  PlanSettings,
  PlanStructure,
  PlanUsageStats,
  PlanCalculation,
  PlanField,
  PlanOutput,
  PlanStatus,
  PlanType,
} from '../types/planTypes';

const DEFAULT_PLAN_SETTINGS: PlanSettings = {
  timezone: 'UTC',
  currency: 'USD',
  decimalPlaces: 2,
  roundingMethod: 'nearest',
  dateFormat: 'YYYY-MM-DD',
  enableAuditLog: true,
  allowCollaboration: false,
  autoSave: false,
};

const EMPTY_STRUCTURE: PlanStructure = {
  fields: [],
  calculations: [],
  conditions: [],
  outputs: [],
};

const EMPTY_USAGE: PlanUsageStats = {
  totalExecutions: 0,
  lastExecuted: undefined,
  averageExecutionTime: 0,
  errorRate: 0,
  mostUsedBy: [],
};

const normalizeStatus = (status?: string): PlanStatus => {
  switch ((status || 'draft').toLowerCase()) {
    case 'draft':
      return 'draft';
    case 'approved':
    case 'locked':
    case 'active':
      return 'active';
    case 'archived':
      return 'archived';
    case 'inactive':
      return 'inactive';
    case 'testing':
      return 'testing';
    default:
      return 'draft';
  }
};

const normalizeType = (rawType?: string): PlanType => {
  const type = (rawType || '').toLowerCase();
  if (type === 'commission' || type === 'bonus' || type === 'incentive' || type === 'hybrid') {
    return type;
  }
  return 'bonus';
};

const mapStepsToCalculations = (steps: any[]): PlanCalculation[] =>
  Array.isArray(steps)
    ? steps.map((step, index) => ({
        id: step?.id ?? `step-${index}`,
        name: step?.name ?? `Step ${index + 1}`,
        expression: step?.expr ?? '',
        description: step?.notes ?? '',
        dependencies: [],
        outputType: 'number',
        order: step?.step_order ?? index,
      }))
    : [];

const mapStepsToOutputs = (steps: any[]): PlanOutput[] => {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.flatMap((step, stepIndex) => {
    const calculationId = step?.id ?? `step-${stepIndex}`;
    return Array.isArray(step?.outputs)
      ? step.outputs.map((outputName: string, outputIndex: number) => ({
          id: `${calculationId}-${outputName}`,
          name: outputName,
          label: outputName,
          calculationId,
          format: { type: 'number' },
          displayOrder: outputIndex,
        }))
      : [];
  });
};

const mapInputsToFields = (inputs: any[]): PlanField[] =>
  Array.isArray(inputs)
    ? inputs.map((input, index) => ({
        id: input?.id ?? `input-${index}`,
        name: input?.input_id ?? input?.id ?? `input_${index + 1}`,
        label: input?.label ?? input?.input_id ?? `Input ${index + 1}`,
        type: 'number',
        required: Boolean(input?.required),
        defaultValue: input?.source_mapping?.default ?? null,
        validation: undefined,
        description: '',
        displayOrder: index,
      }))
    : [];

const mapPlanResponse = (raw: any): Plan => {
  const planMetadata = raw?.plan_metadata ?? {};
  const steps = raw?.steps ?? [];
  const inputs = raw?.inputs ?? [];

  const structure: PlanStructure = {
    fields: mapInputsToFields(inputs),
    calculations: mapStepsToCalculations(steps),
    conditions: EMPTY_STRUCTURE.conditions,
    outputs: mapStepsToOutputs(steps),
  };

  const usage: PlanUsageStats = {
    totalExecutions: raw?.runs_count ?? 0,
    lastExecuted: raw?.last_run_at ?? undefined,
    averageExecutionTime: raw?.average_execution_time ?? 0,
    errorRate: raw?.error_rate ?? 0,
    mostUsedBy: raw?.most_used_by ?? [],
  };

  const collaborators = Array.isArray(raw?.collaborators) ? raw.collaborators : [];
  const sharedWith = Array.isArray(raw?.sharedWith) ? raw.sharedWith : [];
  const tags = Array.isArray(planMetadata?.tags) ? planMetadata.tags : [];

  return {
    id: raw?.id ?? '',
    name: raw?.name ?? '',
    description: planMetadata?.description ?? raw?.notes ?? '',
    type: normalizeType(planMetadata?.type),
    status: normalizeStatus(raw?.status),
    version: raw?.version ?? 1,
    templateId: planMetadata?.template_id,
    structure,
    settings: { ...DEFAULT_PLAN_SETTINGS, ...(raw?.settings ?? {}) },
    collaborators,
    sharedWith,
    tags,
    category: planMetadata?.category ?? 'general',
    createdBy: raw?.created_by ?? '',
    createdAt: raw?.created_at ?? new Date().toISOString(),
    updatedBy: raw?.locked_by ?? raw?.updated_by ?? raw?.created_by ?? '',
    updatedAt: raw?.locked_at ?? raw?.updated_at ?? raw?.created_at ?? new Date().toISOString(),
    validationResults: raw?.validationResults ?? [],
    versionHistory: raw?.versionHistory ?? [],
    usageStats: usage,
  };
};

const unwrapPlatformResponse = <T>(responseData: any): T => {
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    return responseData.data as T;
  }
  return responseData as T;
};

class PlanService {
  private baseUrl = '/api/v1/plans';
  private templatesUrl = '/api/plan-templates';

  // Plan CRUD Operations
  async getPlans(filters?: PlanFilters, page = 1, pageSize = 20): Promise<PlanListResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (filters) {
        if (filters.status?.length) params.append('status', filters.status.join(','));
        if (filters.type?.length) params.append('type', filters.type.join(','));
        if (filters.tags?.length) params.append('tags', filters.tags.join(','));
        if (filters.createdBy?.length) params.append('createdBy', filters.createdBy.join(','));
        if (filters.search) params.append('search', filters.search);
        if (filters.dateRange) {
          params.append('startDate', filters.dateRange.start);
          params.append('endDate', filters.dateRange.end);
        }
      }

      const response = await apiClient.get(`${this.baseUrl}?${params}`);
      const payload = unwrapPlatformResponse<{ plans?: any[] }>(response.data);
      const plans = Array.isArray(payload?.plans)
        ? payload.plans.map(mapPlanResponse)
        : [];

      return {
        plans,
        total: plans.length,
        page,
        pageSize,
        filters,
      };
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw new Error('Failed to fetch plans');
    }
  }

  async getPlan(planId: string): Promise<Plan> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${planId}`, {
        params: { include_steps: true, include_inputs: true },
      });
      const payload = unwrapPlatformResponse<{ plan?: any }>(response.data);
      if (!payload?.plan) {
        throw new Error('Plan not found');
      }
      return mapPlanResponse(payload.plan);
    } catch (error) {
      console.error('Error fetching plan:', error);
      throw new Error('Failed to fetch plan details');
    }
  }

  async createPlan(planData: PlanCreateRequest): Promise<Plan> {
    try {
      const response = await apiClient.post(this.baseUrl, planData);
      return response.data;
    } catch (error) {
      console.error('Error creating plan:', error);
      throw new Error('Failed to create plan');
    }
  }

  async updatePlan(planId: string, updates: PlanUpdateRequest): Promise<Plan> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/${planId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating plan:', error);
      throw new Error('Failed to update plan');
    }
  }

  async deletePlan(planId: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/${planId}`);
    } catch (error) {
      console.error('Error deleting plan:', error);
      throw new Error('Failed to delete plan');
    }
  }

  async duplicatePlan(planId: string, newName: string): Promise<Plan> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${planId}/duplicate`, {
        name: newName,
      });
      return response.data;
    } catch (error) {
      console.error('Error duplicating plan:', error);
      throw new Error('Failed to duplicate plan');
    }
  }

  // Plan Templates
  async getTemplates(): Promise<PlanTemplate[]> {
    try {
      const response = await apiClient.get(this.templatesUrl);
      return response.data;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw new Error('Failed to fetch plan templates');
    }
  }

  async getTemplate(templateId: string): Promise<PlanTemplate> {
    try {
      const response = await apiClient.get(`${this.templatesUrl}/${templateId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching template:', error);
      throw new Error('Failed to fetch template details');
    }
  }

  async createFromTemplate(templateId: string, planData: Partial<PlanCreateRequest>): Promise<Plan> {
    try {
      const response = await apiClient.post(`${this.templatesUrl}/${templateId}/create-plan`, planData);
      return response.data;
    } catch (error) {
      console.error('Error creating plan from template:', error);
      throw new Error('Failed to create plan from template');
    }
  }

  // Plan Validation
  async validatePlan(planId: string): Promise<PlanValidationResult[]> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${planId}/validate`);
      return response.data.validationResults || [];
    } catch (error) {
      console.error('Error validating plan:', error);
      throw new Error('Failed to validate plan');
    }
  }

  async testPlan(planId: string, testData: any): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${planId}/test`, { testData });
      return response.data;
    } catch (error) {
      console.error('Error testing plan:', error);
      throw new Error('Failed to test plan');
    }
  }

  // Version Management
  async getPlanVersions(planId: string): Promise<PlanVersion[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${planId}/versions`);
      return response.data;
    } catch (error) {
      console.error('Error fetching plan versions:', error);
      throw new Error('Failed to fetch plan versions');
    }
  }

  async createPlanVersion(planId: string, versionName: string, description?: string): Promise<PlanVersion> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${planId}/versions`, {
        name: versionName,
        description,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating plan version:', error);
      throw new Error('Failed to create plan version');
    }
  }

  async revertToVersion(planId: string, version: number): Promise<Plan> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${planId}/versions/${version}/revert`);
      return response.data;
    } catch (error) {
      console.error('Error reverting to version:', error);
      throw new Error('Failed to revert to version');
    }
  }

  // Collaboration
  async getPlanCollaborators(planId: string): Promise<PlanCollaborator[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${planId}/collaborators`);
      return response.data;
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      throw new Error('Failed to fetch plan collaborators');
    }
  }

  async addCollaborator(planId: string, email: string, role: CollaboratorRole): Promise<PlanCollaborator> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${planId}/collaborators`, {
        email,
        role,
      });
      return response.data;
    } catch (error) {
      console.error('Error adding collaborator:', error);
      throw new Error('Failed to add collaborator');
    }
  }

  async updateCollaboratorRole(planId: string, userId: string, role: CollaboratorRole): Promise<void> {
    try {
      await apiClient.put(`${this.baseUrl}/${planId}/collaborators/${userId}`, { role });
    } catch (error) {
      console.error('Error updating collaborator role:', error);
      throw new Error('Failed to update collaborator role');
    }
  }

  async removeCollaborator(planId: string, userId: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/${planId}/collaborators/${userId}`);
    } catch (error) {
      console.error('Error removing collaborator:', error);
      throw new Error('Failed to remove collaborator');
    }
  }

  // Plan Status Management
  async updatePlanStatus(planId: string, status: 'draft' | 'testing' | 'active' | 'inactive' | 'archived'): Promise<Plan> {
    try {
      const response = await apiClient.patch(`${this.baseUrl}/${planId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating plan status:', error);
      throw new Error('Failed to update plan status');
    }
  }

  async publishPlan(planId: string): Promise<Plan> {
    return this.updatePlanStatus(planId, 'active');
  }

  async archivePlan(planId: string): Promise<Plan> {
    return this.updatePlanStatus(planId, 'archived');
  }

  // Search and Discovery
  async searchPlans(query: string, filters?: Partial<PlanFilters>): Promise<Plan[]> {
    try {
      const params = new URLSearchParams({ search: query });
      
      if (filters) {
        if (filters.status?.length) params.append('status', filters.status.join(','));
        if (filters.type?.length) params.append('type', filters.type.join(','));
        if (filters.tags?.length) params.append('tags', filters.tags.join(','));
      }

      const response = await apiClient.get(`${this.baseUrl}/search?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error searching plans:', error);
      throw new Error('Failed to search plans');
    }
  }

  async getRecentPlans(limit = 5): Promise<Plan[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent plans:', error);
      throw new Error('Failed to fetch recent plans');
    }
  }

  async getSharedPlans(): Promise<Plan[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/shared`);
      return response.data;
    } catch (error) {
      console.error('Error fetching shared plans:', error);
      throw new Error('Failed to fetch shared plans');
    }
  }

  // Bulk Operations
  async bulkDelete(planIds: string[]): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/bulk`, {
        data: { planIds }
      });
    } catch (error) {
      console.error('Error bulk deleting plans:', error);
      throw new Error('Failed to delete selected plans');
    }
  }

  async bulkUpdateStatus(planIds: string[], status: 'draft' | 'testing' | 'active' | 'inactive' | 'archived'): Promise<void> {
    try {
      await apiClient.patch(`${this.baseUrl}/bulk/status`, {
        planIds,
        status
      });
    } catch (error) {
      console.error('Error bulk updating plan status:', error);
      throw new Error('Failed to update plan statuses');
    }
  }

  // Export/Import
  async exportPlan(planId: string, format: 'json' | 'yaml'): Promise<Blob> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${planId}/export?format=${format}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting plan:', error);
      throw new Error('Failed to export plan');
    }
  }

  async importPlan(file: File): Promise<Plan> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(`${this.baseUrl}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error importing plan:', error);
      throw new Error('Failed to import plan');
    }
  }
}

export const planService = new PlanService();
