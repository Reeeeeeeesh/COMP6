/**
 * Bonus Statement Service - API integration for individual bonus statement generation
 * Task 20: Professional PDF and XLSX statement download capabilities
 */

import { API_BASE_URL as BASE_URL } from '../config';

const API_BASE_URL = `${BASE_URL}/api/v1/bonus-statements`;

// Core Types
export interface BonusStatementRequest {
  employee_ref: string;
  format: 'pdf' | 'xlsx';
  include_calculation_steps?: boolean;
  company_name?: string;
  statement_date?: string;
}

export interface AvailableEmployee {
  employee_ref: string;
  first_name: string;
  last_name: string;
  department?: string;
  position?: string;
  bonus_amount: number;
}

export interface BulkGenerationResult {
  run_id: string;
  format: string;
  total_requested: number;
  successful_count: number;
  failed_count: number;
  results: Array<{
    success: boolean;
    employee_ref: string;
    filename?: string;
    file_size_bytes?: number;
    error?: string;
  }>;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
  tenant_id?: string;
}

// ================================
// Statement Generation Functions
// ================================

export const generateBonusStatement = async (
  runId: string,
  employeeRef: string,
  statementRequest: BonusStatementRequest
): Promise<any> => {
  const response = await fetch(
    `${API_BASE_URL}/runs/${runId}/employees/${employeeRef}/generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(statementRequest),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to generate statement: ${response.status} ${response.statusText}`);
  }

  const result: ApiResponse = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to generate bonus statement');
  }

  return result.data;
};

export const downloadBonusStatement = async (
  runId: string,
  employeeRef: string,
  format: 'pdf' | 'xlsx',
  options: {
    include_calculation_steps?: boolean;
    company_name?: string;
  } = {}
): Promise<Blob> => {
  const url = new URL(`${API_BASE_URL}/runs/${runId}/employees/${employeeRef}/download`);
  url.searchParams.append('format', format);
  
  if (options.include_calculation_steps !== undefined) {
    url.searchParams.append('include_calculation_steps', String(options.include_calculation_steps));
  }
  
  if (options.company_name) {
    url.searchParams.append('company_name', options.company_name);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to download statement: ${response.status} ${response.statusText}`);
  }

  return response.blob();
};

export const getAvailableEmployeesForStatements = async (runId: string): Promise<AvailableEmployee[]> => {
  const response = await fetch(`${API_BASE_URL}/runs/${runId}/available-employees`);

  if (!response.ok) {
    throw new Error(`Failed to get available employees: ${response.status} ${response.statusText}`);
  }

  const result: ApiResponse<{ employees: AvailableEmployee[] }> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to get available employees');
  }

  return result.data.employees;
};

export const bulkGenerateStatements = async (
  runId: string,
  format: 'pdf' | 'xlsx',
  options: {
    include_calculation_steps?: boolean;
    company_name?: string;
    employee_refs?: string[];
  } = {}
): Promise<BulkGenerationResult> => {
  const url = new URL(`${API_BASE_URL}/runs/${runId}/bulk-generate`);
  url.searchParams.append('format', format);
  
  if (options.include_calculation_steps !== undefined) {
    url.searchParams.append('include_calculation_steps', String(options.include_calculation_steps));
  }
  
  if (options.company_name) {
    url.searchParams.append('company_name', options.company_name);
  }

  const body = options.employee_refs ? { employee_refs: options.employee_refs } : {};

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to bulk generate statements: ${response.status} ${response.statusText}`);
  }

  const result: ApiResponse<BulkGenerationResult> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to bulk generate statements');
  }

  return result.data;
};

// ================================
// Utility Functions
// ================================

export const triggerDownload = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const downloadStatementWithTrigger = async (
  runId: string,
  employeeRef: string,
  format: 'pdf' | 'xlsx',
  options: {
    include_calculation_steps?: boolean;
    company_name?: string;
  } = {}
): Promise<void> => {
  const blob = await downloadBonusStatement(runId, employeeRef, format, options);
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `bonus_statement_${employeeRef}_${timestamp}.${format}`;
  triggerDownload(blob, filename);
};