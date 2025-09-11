/**
 * Plan Studio Types - Comprehensive type definitions for compensation plan management
 * Supports plan creation, versioning, collaboration, and template system
 */

export type PlanStatus = 'draft' | 'testing' | 'active' | 'inactive' | 'archived';
export type PlanType = 'commission' | 'bonus' | 'incentive' | 'hybrid';
export type CollaboratorRole = 'owner' | 'editor' | 'viewer' | 'approver';
export type ValidationLevel = 'error' | 'warning' | 'info';

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  type: PlanType;
  category: string;
  tags: string[];
  structure: PlanStructure;
  defaultSettings: PlanSettings;
  previewImage?: string;
  usageCount: number;
  rating: number;
  createdBy: string;
  createdAt: string;
  isBuiltIn: boolean;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  type: PlanType;
  status: PlanStatus;
  version: number;
  templateId?: string;
  
  // Plan Structure
  structure: PlanStructure;
  settings: PlanSettings;
  
  // Collaboration
  collaborators: PlanCollaborator[];
  sharedWith: string[];
  
  // Metadata
  tags: string[];
  category: string;
  
  // Audit Trail
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  
  // Validation
  validationResults: PlanValidationResult[];
  
  // Version History
  versionHistory: PlanVersion[];
  
  // Usage Statistics
  usageStats: PlanUsageStats;
}

export interface PlanStructure {
  fields: PlanField[];
  calculations: PlanCalculation[];
  conditions: PlanCondition[];
  outputs: PlanOutput[];
}

export interface PlanField {
  id: string;
  name: string;
  label: string;
  type: 'number' | 'text' | 'date' | 'boolean' | 'select' | 'calculated';
  required: boolean;
  defaultValue?: any;
  validation?: FieldValidation;
  description?: string;
  displayOrder: number;
}

export interface PlanCalculation {
  id: string;
  name: string;
  expression: string;
  description: string;
  dependencies: string[];
  outputType: 'number' | 'boolean' | 'text';
  order: number;
}

export interface PlanCondition {
  id: string;
  name: string;
  expression: string;
  description: string;
  type: 'filter' | 'validation' | 'eligibility';
}

export interface PlanOutput {
  id: string;
  name: string;
  label: string;
  calculationId: string;
  format: OutputFormat;
  displayOrder: number;
}

export interface PlanSettings {
  timezone: string;
  currency: string;
  decimalPlaces: number;
  roundingMethod: 'up' | 'down' | 'nearest';
  dateFormat: string;
  enableAuditLog: boolean;
  allowCollaboration: boolean;
  autoSave: boolean;
}

export interface PlanCollaborator {
  userId: string;
  userEmail: string;
  userName: string;
  role: CollaboratorRole;
  addedAt: string;
  addedBy: string;
  permissions: CollaboratorPermission[];
}

export interface CollaboratorPermission {
  resource: string;
  actions: string[];
}

export interface PlanVersion {
  version: number;
  name: string;
  description: string;
  changes: PlanChange[];
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

export interface PlanChange {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'modified' | 'removed';
}

export interface PlanValidationResult {
  id: string;
  level: ValidationLevel;
  message: string;
  field?: string;
  calculationId?: string;
  suggestion?: string;
}

export interface PlanUsageStats {
  totalExecutions: number;
  lastExecuted?: string;
  averageExecutionTime: number;
  errorRate: number;
  mostUsedBy: string[];
}

export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  customRules?: ValidationRule[];
}

export interface ValidationRule {
  id: string;
  expression: string;
  message: string;
  level: ValidationLevel;
}

export interface OutputFormat {
  type: 'currency' | 'percentage' | 'number' | 'text';
  precision?: number;
  prefix?: string;
  suffix?: string;
  showThousandsSeparator?: boolean;
}

// API Response Types
export interface PlanListResponse {
  plans: Plan[];
  total: number;
  page: number;
  pageSize: number;
  filters?: PlanFilters;
}

export interface PlanFilters {
  status?: PlanStatus[];
  type?: PlanType[];
  tags?: string[];
  createdBy?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface PlanCreateRequest {
  name: string;
  description: string;
  type: PlanType;
  templateId?: string;
  structure?: Partial<PlanStructure>;
  settings?: Partial<PlanSettings>;
  tags?: string[];
  category?: string;
}

export interface PlanUpdateRequest {
  name?: string;
  description?: string;
  structure?: Partial<PlanStructure>;
  settings?: Partial<PlanSettings>;
  tags?: string[];
  category?: string;
  versionName?: string;
  versionDescription?: string;
}

// UI State Types
export interface PlanStudioState {
  currentPlan: Plan | null;
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  validationErrors: PlanValidationResult[];
  collaborators: PlanCollaborator[];
  selectedVersion?: number;
}

export interface PlanLibraryState {
  plans: Plan[];
  templates: PlanTemplate[];
  loading: boolean;
  error: string | null;
  filters: PlanFilters;
  sortBy: 'name' | 'updatedAt' | 'createdAt' | 'status';
  sortOrder: 'asc' | 'desc';
  selectedPlans: string[];
}