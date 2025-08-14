import { BatchParameters } from '../components/batch/BatchParameterConfig';

export interface ParameterPreset {
  id: string;
  name: string;
  description?: string;
  parameters: BatchParameters;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

import { API_BASE_URL as BASE_URL } from '../config';

const API_BASE_URL = `${BASE_URL}/api/v1/parameter-presets`;

/**
 * Fetch all parameter presets
 */
export const getParameterPresets = async (): Promise<ParameterPreset[]> => {
  const response = await fetch(`${API_BASE_URL}/`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch presets: ${response.status} ${response.statusText}`);
  }
  
  const data: ApiResponse<ParameterPreset[]> = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch parameter presets');
  }
  
  return data.data;
};

/**
 * Get a specific parameter preset by ID
 */
export const getParameterPreset = async (presetId: string): Promise<ParameterPreset> => {
  const response = await fetch(`${API_BASE_URL}/${presetId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch preset: ${response.status} ${response.statusText}`);
  }
  
  const data: ApiResponse<ParameterPreset> = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch parameter preset');
  }
  
  return data.data;
};

/**
 * Get the default parameter preset
 */
export const getDefaultParameterPreset = async (): Promise<ParameterPreset> => {
  const endpoint = `${API_BASE_URL}/default`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch default preset: ${response.status} ${response.statusText}`);
  }
  const data: ApiResponse<ParameterPreset> = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch default parameter preset');
  }
  return data.data;
};

/**
 * Create a fallback parameter preset with default values
 */
const createFallbackPreset = (): ParameterPreset => {
  console.log('Creating fallback parameter preset');
  return {
    id: 'default-fallback',
    name: 'Standard Configuration',
    description: 'Default parameters for standard bonus calculations',
    parameters: {
      targetBonusPct: 0.15,
      investmentWeight: 0.6,
      qualitativeWeight: 0.4,
      investmentScoreMultiplier: 1.0,
      qualScoreMultiplier: 1.0,
      raf: 1.0,
      rafSensitivity: 0.2,
      rafLowerClamp: 0,
      rafUpperClamp: 1.5,
      mrtCapPct: 2.0,
      useDirectRaf: true,
      baseSalaryCapMultiplier: 3.0
    },
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

/**
 * Create a new parameter preset
 */
export const createParameterPreset = async (preset: {
  name: string;
  description?: string;
  parameters: BatchParameters;
  is_default?: boolean;
}): Promise<ParameterPreset> => {
  const response = await fetch(`${API_BASE_URL}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(preset)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create preset: ${response.status} ${response.statusText}`);
  }
  
  const data: ApiResponse<ParameterPreset> = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to create parameter preset');
  }
  
  return data.data;
};

/**
 * Update an existing parameter preset
 */
export const updateParameterPreset = async (
  presetId: string,
  updates: {
    name?: string;
    description?: string;
    parameters?: BatchParameters;
    is_default?: boolean;
  }
): Promise<ParameterPreset> => {
  const response = await fetch(`${API_BASE_URL}/${presetId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update preset: ${response.status} ${response.statusText}`);
  }
  
  const data: ApiResponse<ParameterPreset> = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to update parameter preset');
  }
  
  return data.data;
};

/**
 * Delete a parameter preset
 */
export const deleteParameterPreset = async (presetId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/${presetId}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete preset: ${response.status} ${response.statusText}`);
  }
  
  const data: ApiResponse = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to delete parameter preset');
  }
};
