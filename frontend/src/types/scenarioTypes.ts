/**
 * Scenario Types - Comprehensive type definitions for scenario analysis and comparison
 * Supports what-if modeling, side-by-side comparisons, versioning, and advanced analytics
 */

export type ScenarioStatus = 'draft' | 'active' | 'archived' | 'template';
export type ComparisonMode = 'side-by-side' | 'overlay' | 'table' | 'chart';
export type CalculationMode = 'realtime' | 'batch' | 'scheduled';
export type ScenarioType = 'base' | 'optimistic' | 'pessimistic' | 'custom';

export interface Scenario {
  id: string;
  name: string;
  description: string;
  type: ScenarioType;
  status: ScenarioStatus;
  
  // Plan Association
  planId: string;
  planName: string;
  planVersion: number;
  
  // Parameters and Variables
  parameters: ScenarioParameter[];
  variables: ScenarioVariable[];
  constraints: ScenarioConstraint[];
  
  // Results
  results: ScenarioResults | null;
  calculationStatus: 'pending' | 'running' | 'completed' | 'failed';
  calculationProgress?: number;
  
  // Metadata
  tags: string[];
  category: string;
  priority: 'low' | 'normal' | 'high';
  
  // Collaboration
  createdBy: string;
  createdByName: string;
  sharedWith: string[];
  isPublic: boolean;
  
  // Versioning
  version: number;
  baseScenarioId?: string;
  parentScenarioId?: string;
  childScenarios: string[];
  
  // Timing
  createdAt: string;
  updatedAt: string;
  lastCalculatedAt?: string;
  
  // Comparison
  comparisonBaseline?: string;
  comparisonNotes?: string;
}

export interface ScenarioParameter {
  id: string;
  name: string;
  label: string;
  type: 'number' | 'percentage' | 'currency' | 'date' | 'boolean' | 'select' | 'range';
  
  // Value
  value: any;
  originalValue?: any;
  
  // Configuration
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  unit?: string;
  format?: string;
  
  // Metadata
  description?: string;
  category?: string;
  isVariable: boolean;
  
  // Sensitivity Analysis
  sensitivityRange?: {
    min: number;
    max: number;
    steps: number;
  };
}

export interface ScenarioVariable {
  id: string;
  name: string;
  label: string;
  expression: string;
  dependencies: string[];
  
  // Configuration
  type: 'calculated' | 'derived' | 'input';
  outputFormat: {
    type: 'currency' | 'percentage' | 'number' | 'text';
    precision?: number;
    prefix?: string;
    suffix?: string;
  };
  
  // Metadata
  description?: string;
  category?: string;
}

export interface ScenarioConstraint {
  id: string;
  name: string;
  expression: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  isActive: boolean;
}

export interface ScenarioResults {
  id: string;
  scenarioId: string;
  
  // Calculation Details
  calculatedAt: string;
  calculationTime: number;
  recordsProcessed: number;
  
  // Summary Metrics
  summary: ResultSummary;
  
  // Detailed Results
  employeeResults: EmployeeResult[];
  aggregateResults: AggregateResult[];
  
  // Comparison Data
  comparisonMetrics?: ComparisonMetrics;
  
  // Statistical Analysis
  statistics: ResultStatistics;
  
  // Validation
  validationResults: ValidationResult[];
  
  // Metadata
  version: string;
  dataHash: string;
}

export interface ResultSummary {
  totalPayout: number;
  averagePayout: number;
  medianPayout: number;
  employeeCount: number;
  costIncrease?: number;
  costIncreasePercentage?: number;
  
  // Breakdown by Category
  payoutByLevel: Record<string, number>;
  payoutByDepartment: Record<string, number>;
  payoutByRegion: Record<string, number>;
  
  // Key Metrics
  topPerformers: number;
  lowPerformers: number;
  atTargetPerformers: number;
}

export interface EmployeeResult {
  employeeId: string;
  employeeName: string;
  department: string;
  level: string;
  region?: string;
  
  // Calculation Results
  basePayout: number;
  finalPayout: number;
  adjustments: Record<string, number>;
  
  // Performance Metrics
  performance: number;
  rank?: number;
  percentile?: number;
  
  // Comparison
  changeFromBaseline?: number;
  changeFromBaselinePercent?: number;
  
  // Details
  calculationDetails: Record<string, any>;
  appliedRules: string[];
}

export interface AggregateResult {
  groupBy: string;
  groupValue: string;
  employeeCount: number;
  totalPayout: number;
  averagePayout: number;
  medianPayout: number;
  standardDeviation: number;
  
  // Distribution
  distribution: {
    min: number;
    max: number;
    q1: number;
    q2: number;
    q3: number;
  };
}

export interface ComparisonMetrics {
  baselineScenarioId: string;
  
  // Overall Comparison
  totalCostDifference: number;
  totalCostDifferencePercent: number;
  averagePayoutDifference: number;
  averagePayoutDifferencePercent: number;
  
  // Employee Impact
  employeesWithIncrease: number;
  employeesWithDecrease: number;
  employeesUnchanged: number;
  
  // Distribution Changes
  payoutDistributionShift: Record<string, number>;
  
  // Statistical Significance
  statisticalSignificance: number;
  confidenceLevel: number;
}

export interface ResultStatistics {
  mean: number;
  median: number;
  mode: number;
  standardDeviation: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  
  // Percentiles
  percentiles: Record<string, number>;
  
  // Distribution
  histogram: HistogramBin[];
  
  // Outliers
  outliers: OutlierData[];
}

export interface HistogramBin {
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface OutlierData {
  employeeId: string;
  value: number;
  standardDeviations: number;
  isHigh: boolean;
}

export interface ValidationResult {
  id: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  affectedEmployees?: string[];
  suggestedAction?: string;
}

// Scenario Comparison
export interface ScenarioComparison {
  id: string;
  name: string;
  description: string;
  scenarios: string[];
  
  // Configuration
  comparisonMode: ComparisonMode;
  baselineScenario: string;
  metrics: string[];
  
  // Results
  comparisonResults: ComparisonResults | null;
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isShared: boolean;
}

export interface ComparisonResults {
  scenarios: ScenarioComparisonData[];
  summary: ComparisonSummary;
  insights: ComparisonInsight[];
  recommendations: ComparisonRecommendation[];
}

export interface ScenarioComparisonData {
  scenarioId: string;
  scenarioName: string;
  results: ScenarioResults;
  
  // Relative Metrics
  relativeToBaseline: {
    costDifference: number;
    costDifferencePercent: number;
    employeeImpact: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
}

export interface ComparisonSummary {
  bestScenario: string;
  worstScenario: string;
  mostCostEffective: string;
  highestEmployeeSatisfaction: string;
  
  // Range Analysis
  costRange: {
    min: number;
    max: number;
    spread: number;
  };
  
  // Risk Analysis
  riskAssessment: Record<string, 'low' | 'medium' | 'high'>;
}

export interface ComparisonInsight {
  type: 'cost' | 'performance' | 'distribution' | 'risk' | 'fairness';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  affectedScenarios: string[];
}

export interface ComparisonRecommendation {
  type: 'optimization' | 'adjustment' | 'alternative' | 'caution';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedBenefit: string;
  implementationEffort: 'low' | 'medium' | 'high';
  scenarioId?: string;
}

// Sensitivity Analysis
export interface SensitivityAnalysis {
  id: string;
  scenarioId: string;
  parameterId: string;
  parameterName: string;
  
  // Analysis Configuration
  baseValue: number;
  valueRange: {
    min: number;
    max: number;
    steps: number;
  };
  
  // Results
  results: SensitivityResult[];
  
  // Insights
  elasticity: number;
  breakEvenPoint?: number;
  optimalValue?: number;
  
  // Metadata
  calculatedAt: string;
  calculationTime: number;
}

export interface SensitivityResult {
  parameterValue: number;
  totalCost: number;
  averagePayout: number;
  employeeImpact: number;
  
  // Relative to Base
  costChange: number;
  costChangePercent: number;
}

// API Request/Response Types
export interface CreateScenarioRequest {
  name: string;
  description: string;
  type: ScenarioType;
  planId: string;
  parameters: Omit<ScenarioParameter, 'id'>[];
  variables: Omit<ScenarioVariable, 'id'>[];
  constraints: Omit<ScenarioConstraint, 'id'>[];
  tags?: string[];
  category?: string;
  baseScenarioId?: string;
}

export interface UpdateScenarioRequest {
  name?: string;
  description?: string;
  parameters?: ScenarioParameter[];
  variables?: ScenarioVariable[];
  constraints?: ScenarioConstraint[];
  tags?: string[];
  category?: string;
}

export interface CalculateScenarioRequest {
  scenarioId: string;
  mode: CalculationMode;
  options?: {
    includeDetails: boolean;
    includeStatistics: boolean;
    includeValidation: boolean;
  };
}

export interface CreateComparisonRequest {
  name: string;
  description: string;
  scenarios: string[];
  baselineScenario: string;
  comparisonMode: ComparisonMode;
  metrics: string[];
}

// UI State Types
export interface ScenarioPlaygroundState {
  scenarios: Scenario[];
  activeScenario: Scenario | null;
  comparisonMode: boolean;
  selectedScenarios: string[];
  
  // UI State
  loading: boolean;
  calculating: boolean;
  error: string | null;
  
  // View Configuration
  viewMode: 'editor' | 'comparison' | 'analysis';
  splitView: boolean;
  selectedTab: number;
  
  // Filters
  filters: ScenarioFilters;
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface ScenarioFilters {
  status?: ScenarioStatus[];
  type?: ScenarioType[];
  planId?: string;
  createdBy?: string[];
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

// Analytics and Insights
export interface ScenarioAnalytics {
  totalScenarios: number;
  activeScenarios: number;
  totalCalculations: number;
  averageCalculationTime: number;
  
  // Usage Patterns
  mostUsedPlans: Array<{
    planId: string;
    planName: string;
    scenarioCount: number;
  }>;
  
  mostUsedParameters: Array<{
    parameterName: string;
    usageCount: number;
    averageValue: number;
  }>;
  
  // Performance Trends
  calculationTrends: Array<{
    date: string;
    calculations: number;
    averageTime: number;
  }>;
  
  // Cost Analysis
  costDistribution: {
    min: number;
    max: number;
    average: number;
    median: number;
    percentiles: Record<string, number>;
  };
}