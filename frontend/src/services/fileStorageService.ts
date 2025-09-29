/**
 * File Storage Service for interacting with enhanced file storage APIs.
 * Provides functions for checksum verification, lineage tracking, and file integrity checks.
 */

import { apiClient } from './apiClient';

// Types for file storage responses
export interface FileChecksumResponse {
  upload_id: string;
  checksum: string;
  verified: boolean;
  storage_path: string;
  file_exists: boolean;
}

export interface LineageEvent {
  type: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface FileLineageResponse {
  upload_id: string;
  tenant_id: string;
  filename: string;
  status: string;
  file_size: number;
  checksum: string;
  storage_path: string;
  file_exists: boolean;
  created_at: string;
  created_by: string;
  upload_metadata: Record<string, any>;
  lineage_events: LineageEvent[];
  integrity_verified: boolean | null;
}

export interface FileVerificationResponse {
  upload_id: string;
  verified: boolean;
  checksum: string;
  file_exists: boolean;
}

export interface FileUploadResponse {
  upload_id: string;
}

export interface FileStatusResponse {
  upload_id: string;
  filename: string;
  status: string;
  file_size: number;
  created_at: string;
  created_by: string;
  has_checksum: boolean;
  has_storage_path: boolean;
}

// Error handling
export class FileStorageError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'FileStorageError';
  }
}

/**
 * Get SHA-256 checksum and verification status for an uploaded file
 */
export async function getFileChecksum(uploadId: string): Promise<FileChecksumResponse> {
  try {
    const response = await apiClient.get(`/api/v1/platform/uploads/${uploadId}/checksum`);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new FileStorageError(
        response.data.message || 'Failed to get file checksum',
        response.status,
        response.data
      );
    }
  } catch (error: any) {
    if (error instanceof FileStorageError) {
      throw error;
    }
    
    const statusCode = error.response?.status || 500;
    let message = error.response?.data?.detail || error.message || 'Failed to get file checksum';
    if (statusCode === 404) {
      message = 'Checksum not available for this upload';
    }
    
    throw new FileStorageError(message, statusCode, error.response?.data);
  }
}

/**
 * Get complete file lineage information including processing history
 */
export async function getFileLineage(uploadId: string): Promise<FileLineageResponse> {
  try {
    const response = await apiClient.get(`/api/v1/platform/uploads/${uploadId}/lineage`);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new FileStorageError(
        response.data.message || 'Failed to get file lineage',
        response.status,
        response.data
      );
    }
  } catch (error: any) {
    if (error instanceof FileStorageError) {
      throw error;
    }
    
    const statusCode = error.response?.status || 500;
    let message = error.response?.data?.detail || error.message || 'Failed to get file lineage';
    if (statusCode === 404) {
      message = 'File lineage not available for this upload';
    }
    
    throw new FileStorageError(message, statusCode, error.response?.data);
  }
}

/**
 * Verify file integrity using stored SHA-256 checksum
 */
export async function verifyFileIntegrity(uploadId: string, expectedHash?: string): Promise<FileVerificationResponse> {
  try {
    const response = await apiClient.post(`/api/v1/platform/uploads/${uploadId}/verify`);
    
    if (response.data.success) {
      const result = response.data.data;
      
      // If expected hash is provided, compare it
      if (expectedHash && result.checksum !== expectedHash) {
        throw new FileStorageError(
          `Checksum mismatch: expected ${expectedHash}, got ${result.checksum}`,
          400,
          { expected: expectedHash, actual: result.checksum }
        );
      }
      
      return result;
    } else {
      throw new FileStorageError(
        response.data.message || 'Failed to verify file integrity',
        response.status,
        response.data
      );
    }
  } catch (error: any) {
    if (error instanceof FileStorageError) {
      throw error;
    }
    
    const statusCode = error.response?.status || 500;
    let message = error.response?.data?.detail || error.message || 'Failed to verify file integrity';
    if (statusCode === 404) {
      message = 'Verification unavailable for this upload';
    }
    
    throw new FileStorageError(message, statusCode, error.response?.data);
  }
}

/**
 * Upload file with enhanced storage features
 */
export async function uploadFileEnhanced(file: File, metadata?: Record<string, any>): Promise<FileUploadResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata) {
      // Add metadata as form fields if needed
      Object.entries(metadata).forEach(([key, value]) => {
        formData.append(`metadata_${key}`, String(value));
      });
    }
    
    const response = await apiClient.post('/api/v1/platform/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new FileStorageError(
        response.data.message || 'Failed to upload file',
        response.status,
        response.data
      );
    }
  } catch (error: any) {
    if (error instanceof FileStorageError) {
      throw error;
    }
    
    const statusCode = error.response?.status || 500;
    const message = error.response?.data?.detail || error.message || 'Failed to upload file';
    
    throw new FileStorageError(message, statusCode, error.response?.data);
  }
}

/**
 * Get upload status and basic information
 */
export async function getUploadStatus(uploadId: string): Promise<FileStatusResponse> {
  try {
    const response = await apiClient.get(`/api/v1/platform/uploads/${uploadId}/status`);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new FileStorageError(
        response.data.message || 'Failed to get upload status',
        response.status,
        response.data
      );
    }
  } catch (error: any) {
    if (error instanceof FileStorageError) {
      throw error;
    }
    
    const statusCode = error.response?.status || 500;
    const message = error.response?.data?.detail || error.message || 'Failed to get upload status';
    
    throw new FileStorageError(message, statusCode, error.response?.data);
  }
}

/**
 * Helper function to format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Helper function to format checksum for display
 */
export function formatChecksum(checksum: string, length: number = 16): string {
  if (!checksum) return '';
  
  if (checksum.length <= length) {
    return checksum;
  }
  
  return `${checksum.substring(0, length)}...`;
}

/**
 * Helper function to get lineage event type display name
 */
export function getLineageEventDisplayName(eventType: string): string {
  const displayNames: Record<string, string> = {
    'upload': 'File Uploaded',
    'validation': 'File Validated',
    'processing': 'File Processed',
    'integrity_check': 'Integrity Check',
    'manual_verification': 'Manual Verification',
    'error': 'Error Occurred',
    'transformation': 'Data Transformation',
    'analysis': 'Data Analysis'
  };
  
  return displayNames[eventType] || eventType.charAt(0).toUpperCase() + eventType.slice(1);
}

/**
 * Helper function to determine if lineage event is critical
 */
export function isLineageEventCritical(eventType: string): boolean {
  const criticalEvents = ['error', 'integrity_check', 'manual_verification'];
  return criticalEvents.includes(eventType);
}

/**
 * Helper function to get verification status color
 */
export function getVerificationStatusColor(verified: boolean | null): string {
  if (verified === null) return 'gray';
  return verified ? 'green' : 'red';
}

/**
 * Helper function to get verification status text
 */
export function getVerificationStatusText(verified: boolean | null): string {
  if (verified === null) return 'Not Verified';
  return verified ? 'Verified' : 'Verification Failed';
}

/**
 * Utility to create a loading state object for UI components
 */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  data: any;
}

export function createLoadingState<T>(initialData?: T): LoadingState {
  return {
    isLoading: false,
    error: null,
    data: initialData || null
  };
}

/**
 * Hook-like utility for managing async operations with loading states
 */
export async function withLoadingState<T>(
  operation: () => Promise<T>,
  setState: (state: LoadingState) => void
): Promise<T | null> {
  setState({ isLoading: true, error: null, data: null });
  
  try {
    const result = await operation();
    setState({ isLoading: false, error: null, data: result });
    return result;
  } catch (error: any) {
    const errorMessage = error instanceof FileStorageError 
      ? error.message 
      : 'An unexpected error occurred';
    
    setState({ isLoading: false, error: errorMessage, data: null });
    return null;
  }
}
