import axios from 'axios';
import { API_BASE_URL } from '../config';

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