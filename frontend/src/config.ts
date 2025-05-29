/**
 * Application configuration
 */

// API base URL
export const API_BASE_URL = 'http://localhost:8000';

// Default pagination settings
export const DEFAULT_PAGE_SIZE = 10;

// File upload settings
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = ['.csv'];

// Calculation settings
export const DEFAULT_TARGET_BONUS_PCT = 0.15; // 15%
export const DEFAULT_INVESTMENT_WEIGHT = 0.7; // 70%
export const DEFAULT_QUALITATIVE_WEIGHT = 0.3; // 30%
export const DEFAULT_RAF = 1.0;
export const DEFAULT_MRT_CAP_PCT = 2.0; // 200%
