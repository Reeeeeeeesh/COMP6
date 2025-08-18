/**
 * Column Mapping Service - API integration for intelligent CSV column mapping
 * Provides auto-detection and intelligent suggestions for column mapping
 */

import { API_BASE_URL as BASE_URL } from '../config';

const API_BASE_URL = `${BASE_URL}/api/v1/column-mapping`;

// Core Types
export interface ColumnSuggestion {
  csv_column: string;
  system_field: string;
  confidence: number;
  reasoning: string;
  match_type: 'exact' | 'fuzzy_name' | 'content_pattern' | 'alias';
}

export interface MappingAnalysis {
  suggestions: ColumnSuggestion[];
  required_fields_coverage: Record<string, string | null>;
  unmapped_csv_columns: string[];
  confidence_score: number;
  recommended_mapping: Record<string, string>;
}

export interface SystemFieldInfo {
  description: string;
  aliases: string[];
  expected_type: string[];
  required: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

// Column Mapping Analysis
export const analyzeColumnMapping = async (
  columns: Record<string, any>
): Promise<MappingAnalysis> => {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ columns }),
  });

  if (!response.ok) {
    throw new Error(`Failed to analyze column mapping: ${response.status} ${response.statusText}`);
  }

  const result: MappingAnalysis = await response.json();
  return result;
};

// Field Suggestions for Specific Column
export const getFieldSuggestions = async (
  csvColumn: string,
  columnData: any
): Promise<ColumnSuggestion[]> => {
  const response = await fetch(`${API_BASE_URL}/field-suggestions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      csv_column: csvColumn,
      column_data: columnData,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get field suggestions: ${response.status} ${response.statusText}`);
  }

  const result: ColumnSuggestion[] = await response.json();
  return result;
};

// System Fields Information
export const getSystemFields = async (): Promise<Record<string, SystemFieldInfo>> => {
  const response = await fetch(`${API_BASE_URL}/system-fields`);

  if (!response.ok) {
    throw new Error(`Failed to get system fields: ${response.status} ${response.statusText}`);
  }

  const result: ApiResponse<Record<string, SystemFieldInfo>> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to get system fields');
  }

  return result.data;
};

// Utility Functions
export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.9) return 'success';
  if (confidence >= 0.7) return 'info';
  if (confidence >= 0.5) return 'warning';
  return 'error';
};

export const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 0.9) return 'Excellent';
  if (confidence >= 0.7) return 'Good';
  if (confidence >= 0.5) return 'Fair';
  return 'Poor';
};

export const getMatchTypeIcon = (matchType: string): string => {
  switch (matchType) {
    case 'exact': return '🎯';
    case 'fuzzy_name': return '🔍';
    case 'alias': return '🔗';
    case 'content_pattern': return '📊';
    default: return '❓';
  }
};