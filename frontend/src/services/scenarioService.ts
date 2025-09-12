import axios from 'axios';
import { API_BASE_URL } from '../config';
import {
  Scenario,
  ScenarioResults,
  ScenarioComparison,
  ComparisonResults,
  SensitivityAnalysis,
  ScenarioAnalytics,
  CreateScenarioRequest,
  UpdateScenarioRequest,
  CalculateScenarioRequest,
  CreateComparisonRequest,
  ScenarioStatus,
  CalculationMode,
  ComparisonMode
} from '../types/scenarioTypes';

export interface BatchSource {
  id: string;
  filename: string;
  upload_date: string;
  employee_count: number;
  file_size: number;
  has_calculation_results: boolean;
}

export interface ScenarioCreateRequest {
  batch_upload_id: string;
  scenario_name?: string;
  scenario_description?: string;
}

export interface ScenarioCreateData {
  session_id: string;
  name: string;
  description?: string;
  parameters: Record<string, any>;
}

export interface ScenarioUpdateData {
  name?: string;
  description?: string;
  parameters?: Record<string, any>;
}

export interface ScenarioData {
  id: string;
  name: string;
  description?: string;
  parameters: Record<string, any>;
  session_id: string;
  has_calculation_results?: boolean;
  calculation_count?: number;
  created_at: string;
  updated_at: string;
  audit_history?: AuditLogEntry[];
  // For backward compatibility with legacy temporary scenarios
  source_batch_id?: string;
  source_type?: string;
  scenario_name?: string;
  employee_count?: number;
  created_from?: {
    batch_filename: string;
    upload_date: string;
    total_employees: number;
  };
  employees?: any[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  timestamp: string;
}

export interface ScenarioListResponse {
  scenarios: ScenarioData[];
  session_id: string;
  total_count: number;
}

/**
 * Get available batch sources for creating scenarios
 * @param sessionId Session ID to filter batch sources
 * @returns Promise with available batch sources
 */
export const getAvailableBatchSources = async (sessionId: string): Promise<BatchSource[]> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/scenarios/sources/batches`,
      {
        params: { session_id: sessionId },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('Available batch sources response:', response.data);
    
    if (response.data.success) {
      return response.data.data.sources || [];
    } else {
      throw new Error(response.data.error || 'Failed to fetch batch sources');
    }
  } catch (error) {
    console.error('Error fetching available batch sources:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch batch sources: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Create a new persistent scenario
 * @param scenarioData Scenario creation data
 * @returns Promise with created scenario data
 */
export const createScenario = async (scenarioData: ScenarioCreateData): Promise<ScenarioData> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/scenarios`,
      scenarioData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('Create scenario response:', response.data);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to create scenario');
    }
  } catch (error) {
    console.error('Error creating scenario:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to create scenario: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Create a new scenario from a batch upload
 * @param createRequest Scenario creation request
 * @returns Promise with created scenario data
 */
export const createScenarioFromBatch = async (createRequest: ScenarioCreateRequest): Promise<ScenarioData> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/scenarios/from-batch`,
      createRequest,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('Create scenario from batch response:', response.data);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to create scenario from batch');
    }
  } catch (error) {
    console.error('Error creating scenario from batch:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to create scenario from batch: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * List scenarios for a session with optional filters
 * @param sessionId Session ID to filter scenarios
 * @param nameFilter Optional name filter (partial match)
 * @param hasCalculations Filter scenarios with/without calculation results
 * @param limit Maximum number of scenarios to return
 * @returns Promise with list of scenarios
 */
export const listScenarios = async (
  sessionId: string,
  nameFilter?: string,
  hasCalculations?: boolean,
  limit?: number
): Promise<ScenarioListResponse> => {
  try {
    const params: Record<string, any> = { session_id: sessionId };
    if (nameFilter) params.name_filter = nameFilter;
    if (hasCalculations !== undefined) params.has_calculations = hasCalculations;
    if (limit) params.limit = limit;

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/scenarios`,
      {
        params,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('List scenarios response:', response.data);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to list scenarios');
    }
  } catch (error) {
    console.error('Error listing scenarios:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to list scenarios: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Get a scenario by ID with optional audit history
 * @param scenarioId ID of the scenario to retrieve
 * @param includeAuditLog Whether to include audit history
 * @returns Promise with scenario data
 */
export const getScenario = async (scenarioId: string, includeAuditLog?: boolean): Promise<ScenarioData> => {
  try {
    const params: Record<string, any> = {};
    if (includeAuditLog) params.include_audit_log = true;

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/scenarios/${scenarioId}`,
      {
        params,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('Get scenario response:', response.data);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to get scenario');
    }
  } catch (error) {
    console.error('Error getting scenario:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to get scenario: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Update a scenario
 * @param scenarioId ID of the scenario to update
 * @param updateData Update data
 * @returns Promise with updated scenario data
 */
export const updateScenario = async (scenarioId: string, updateData: ScenarioUpdateData): Promise<ScenarioData> => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/scenarios/${scenarioId}`,
      updateData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('Update scenario response:', response.data);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to update scenario');
    }
  } catch (error) {
    console.error('Error updating scenario:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to update scenario: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Delete a scenario
 * @param scenarioId ID of the scenario to delete
 * @returns Promise with deletion confirmation
 */
export const deleteScenario = async (scenarioId: string): Promise<{ deleted_scenario_id: string }> => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/api/v1/scenarios/${scenarioId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('Delete scenario response:', response.data);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to delete scenario');
    }
  } catch (error) {
    console.error('Error deleting scenario:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to delete scenario: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Duplicate a scenario
 * @param scenarioId ID of the scenario to duplicate
 * @param newName Name for the new scenario
 * @param newDescription Optional description for the new scenario
 * @returns Promise with duplicated scenario data
 */
export const duplicateScenario = async (
  scenarioId: string,
  newName: string,
  newDescription?: string
): Promise<ScenarioData> => {
  try {
    const requestData: { new_name: string; new_description?: string } = { new_name: newName };
    if (newDescription) requestData.new_description = newDescription;

    const response = await axios.post(
      `${API_BASE_URL}/api/v1/scenarios/${scenarioId}/duplicate`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('Duplicate scenario response:', response.data);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to duplicate scenario');
    }
  } catch (error) {
    console.error('Error duplicating scenario:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to duplicate scenario: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Get audit history for a scenario
 * @param scenarioId ID of the scenario
 * @param limit Maximum number of audit entries to return
 * @returns Promise with audit history
 */
export const getScenarioAuditHistory = async (
  scenarioId: string,
  limit?: number
): Promise<{ scenario_id: string; scenario_name: string; audit_history: AuditLogEntry[]; total_entries: number }> => {
  try {
    const params: Record<string, any> = {};
    if (limit) params.limit = limit;

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/scenarios/${scenarioId}/audit-history`,
      {
        params,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('Get scenario audit history response:', response.data);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to get scenario audit history');
    }
  } catch (error) {
    console.error('Error getting scenario audit history:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to get scenario audit history: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

// ====================================================================
// ENHANCED SCENARIO SERVICE - Comprehensive Scenario Management
// ====================================================================

/**
 * Create a comprehensive scenario with advanced features
 * @param request Comprehensive scenario creation request
 * @returns Promise with created scenario
 */
export const createComprehensiveScenario = async (request: CreateScenarioRequest): Promise<Scenario> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v2/scenarios`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to create comprehensive scenario');
    }
  } catch (error) {
    console.error('Error creating comprehensive scenario:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to create scenario: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Update a comprehensive scenario
 * @param scenarioId Scenario ID
 * @param request Update request data
 * @returns Promise with updated scenario
 */
export const updateComprehensiveScenario = async (
  scenarioId: string, 
  request: UpdateScenarioRequest
): Promise<Scenario> => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/api/v2/scenarios/${scenarioId}`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to update comprehensive scenario');
    }
  } catch (error) {
    console.error('Error updating comprehensive scenario:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to update scenario: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Get comprehensive scenario with full details
 * @param scenarioId Scenario ID
 * @returns Promise with comprehensive scenario data
 */
export const getComprehensiveScenario = async (scenarioId: string): Promise<Scenario> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/v2/scenarios/${scenarioId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to get comprehensive scenario');
    }
  } catch (error) {
    console.error('Error getting comprehensive scenario:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to get scenario: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * List comprehensive scenarios with advanced filtering
 * @param planId Plan ID to filter by
 * @param status Status filter
 * @param createdBy User filter
 * @param tags Tag filter
 * @param limit Maximum results
 * @param offset Pagination offset
 * @returns Promise with filtered scenarios
 */
export const listComprehensiveScenarios = async (
  planId?: string,
  status?: ScenarioStatus[],
  createdBy?: string,
  tags?: string[],
  limit: number = 50,
  offset: number = 0
): Promise<{ scenarios: Scenario[]; total: number }> => {
  try {
    const params: Record<string, any> = { limit, offset };
    if (planId) params.plan_id = planId;
    if (status) params.status = status;
    if (createdBy) params.created_by = createdBy;
    if (tags) params.tags = tags;

    const response = await axios.get(
      `${API_BASE_URL}/api/v2/scenarios`,
      {
        params,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to list comprehensive scenarios');
    }
  } catch (error) {
    console.error('Error listing comprehensive scenarios:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to list scenarios: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Calculate scenario with comprehensive options
 * @param request Calculation request
 * @returns Promise with calculation results
 */
export const calculateScenario = async (request: CalculateScenarioRequest): Promise<ScenarioResults> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v2/scenarios/${request.scenarioId}/calculate`,
      {
        mode: request.mode,
        options: request.options
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to calculate scenario');
    }
  } catch (error) {
    console.error('Error calculating scenario:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to calculate scenario: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Get calculation status for a scenario
 * @param scenarioId Scenario ID
 * @returns Promise with calculation status
 */
export const getCalculationStatus = async (scenarioId: string): Promise<{
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message?: string;
}> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/v2/scenarios/${scenarioId}/calculation-status`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to get calculation status');
    }
  } catch (error) {
    console.error('Error getting calculation status:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to get calculation status: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Clone scenario with modifications
 * @param scenarioId Source scenario ID
 * @param name New scenario name
 * @param description New scenario description
 * @param parameterOverrides Parameter overrides for the clone
 * @returns Promise with cloned scenario
 */
export const cloneScenario = async (
  scenarioId: string,
  name: string,
  description: string,
  parameterOverrides?: Record<string, any>
): Promise<Scenario> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v2/scenarios/${scenarioId}/clone`,
      {
        name,
        description,
        parameter_overrides: parameterOverrides
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to clone scenario');
    }
  } catch (error) {
    console.error('Error cloning scenario:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to clone scenario: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

// ====================================================================
// SCENARIO COMPARISON SERVICE
// ====================================================================

/**
 * Create scenario comparison
 * @param request Comparison creation request
 * @returns Promise with created comparison
 */
export const createScenarioComparison = async (request: CreateComparisonRequest): Promise<ScenarioComparison> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v2/scenario-comparisons`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to create scenario comparison');
    }
  } catch (error) {
    console.error('Error creating scenario comparison:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to create comparison: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Execute scenario comparison
 * @param comparisonId Comparison ID
 * @returns Promise with comparison results
 */
export const executeScenarioComparison = async (comparisonId: string): Promise<ComparisonResults> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v2/scenario-comparisons/${comparisonId}/execute`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to execute scenario comparison');
    }
  } catch (error) {
    console.error('Error executing scenario comparison:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to execute comparison: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Get scenario comparison results
 * @param comparisonId Comparison ID
 * @returns Promise with comparison results
 */
export const getComparisonResults = async (comparisonId: string): Promise<ComparisonResults> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/v2/scenario-comparisons/${comparisonId}/results`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to get comparison results');
    }
  } catch (error) {
    console.error('Error getting comparison results:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to get comparison results: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

// ====================================================================
// SENSITIVITY ANALYSIS SERVICE
// ====================================================================

/**
 * Run sensitivity analysis on scenario parameter
 * @param scenarioId Scenario ID
 * @param parameterId Parameter ID to analyze
 * @param valueRange Value range for analysis
 * @returns Promise with sensitivity analysis results
 */
export const runSensitivityAnalysis = async (
  scenarioId: string,
  parameterId: string,
  valueRange: { min: number; max: number; steps: number }
): Promise<SensitivityAnalysis> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v2/scenarios/${scenarioId}/sensitivity-analysis`,
      {
        parameter_id: parameterId,
        value_range: valueRange
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to run sensitivity analysis');
    }
  } catch (error) {
    console.error('Error running sensitivity analysis:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to run sensitivity analysis: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Get sensitivity analysis results
 * @param analysisId Analysis ID
 * @returns Promise with sensitivity analysis results
 */
export const getSensitivityAnalysis = async (analysisId: string): Promise<SensitivityAnalysis> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/v2/sensitivity-analysis/${analysisId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to get sensitivity analysis');
    }
  } catch (error) {
    console.error('Error getting sensitivity analysis:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to get sensitivity analysis: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

// ====================================================================
// ANALYTICS AND INSIGHTS SERVICE
// ====================================================================

/**
 * Get comprehensive scenario analytics
 * @param planId Optional plan ID filter
 * @param dateRange Optional date range filter
 * @returns Promise with scenario analytics
 */
export const getScenarioAnalytics = async (
  planId?: string,
  dateRange?: { start: string; end: string }
): Promise<ScenarioAnalytics> => {
  try {
    const params: Record<string, any> = {};
    if (planId) params.plan_id = planId;
    if (dateRange) params.date_range = dateRange;

    const response = await axios.get(
      `${API_BASE_URL}/api/v2/scenario-analytics`,
      {
        params,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to get scenario analytics');
    }
  } catch (error) {
    console.error('Error getting scenario analytics:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to get scenario analytics: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Export scenario data in various formats
 * @param scenarioId Scenario ID
 * @param format Export format ('csv', 'xlsx', 'json', 'pdf')
 * @param includeDetails Whether to include detailed results
 * @returns Promise with export data or file URL
 */
export const exportScenario = async (
  scenarioId: string,
  format: 'csv' | 'xlsx' | 'json' | 'pdf',
  includeDetails: boolean = true
): Promise<{ downloadUrl: string; filename: string }> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v2/scenarios/${scenarioId}/export`,
      {
        format,
        include_details: includeDetails
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to export scenario');
    }
  } catch (error) {
    console.error('Error exporting scenario:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to export scenario: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Share scenario with users or make public
 * @param scenarioId Scenario ID
 * @param shareWith Array of user IDs to share with
 * @param isPublic Whether to make publicly accessible
 * @returns Promise with share confirmation
 */
export const shareScenario = async (
  scenarioId: string,
  shareWith: string[],
  isPublic: boolean = false
): Promise<{ shared_with: string[]; is_public: boolean; share_url?: string }> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v2/scenarios/${scenarioId}/share`,
      {
        share_with: shareWith,
        is_public: isPublic
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to share scenario');
    }
  } catch (error) {
    console.error('Error sharing scenario:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to share scenario: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

// ====================================================================
// VALIDATION AND RECOMMENDATIONS
// ====================================================================

/**
 * Validate scenario configuration
 * @param scenarioId Scenario ID
 * @returns Promise with validation results
 */
export const validateScenario = async (scenarioId: string): Promise<{
  isValid: boolean;
  errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>;
  warnings: Array<{ field: string; message: string; suggestion?: string }>;
}> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v2/scenarios/${scenarioId}/validate`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to validate scenario');
    }
  } catch (error) {
    console.error('Error validating scenario:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to validate scenario: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
};

/**
 * Get optimization recommendations for scenario
 * @param scenarioId Scenario ID
 * @param optimizationGoal Goal for optimization ('cost', 'fairness', 'performance')
 * @returns Promise with optimization recommendations
 */
export const getOptimizationRecommendations = async (
  scenarioId: string,
  optimizationGoal: 'cost' | 'fairness' | 'performance'
): Promise<{
  recommendations: Array<{
    type: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    estimatedImpact: string;
    parameters: Record<string, any>;
  }>;
  estimatedImprovement: number;
}> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v2/scenarios/${scenarioId}/optimize`,
      {
        optimization_goal: optimizationGoal
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Failed to get optimization recommendations');
    }
  } catch (error) {
    console.error('Error getting optimization recommendations:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to get optimization recommendations: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
}; 