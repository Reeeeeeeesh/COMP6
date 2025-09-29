/**
 * Application configuration
 */

// API base URL
// - If VITE_API_URL is provided, use it (e.g., http://localhost:8000)
// - Otherwise default to an empty string so calls use relative paths like
//   `/api/v1/...` which Vite will proxy to the backend (avoids CORS in dev)
export const API_BASE_URL = (import.meta as any)?.env?.VITE_API_URL
  ? String((import.meta as any).env.VITE_API_URL).replace(/\/$/, '')
  : '';

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

// Feature flags for gating incomplete UI routes
// These flags control which features are available based on backend endpoint availability
export const FEATURES = {
  // Approval workflows - depends on /api/approvals, /api/approval-templates, /api/approval-notifications
  approvals: true,
  
  // Legacy Plan Studio - depends on /api/plans, /api/plan-templates
  planStudioLegacy: true,
  
  // Scenario V2 features - depends on /api/v2/scenarios, /api/v2/scenario-comparisons, etc.
  scenarioV2: true,
  
  // Executive Dashboard V2 - depends on /api/v2/executive-dashboard
  execDashboardV2: true,
} as const;

// Type for feature flag keys
export type FeatureFlag = keyof typeof FEATURES;

// Helper function to check if a feature is enabled
export const isFeatureEnabled = (feature: FeatureFlag): boolean => {
  return FEATURES[feature];
};
