// Shared TypeScript types for the Bonus Calculator application

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  salary: number;
  hireDate: Date;
}

export interface BonusCalculation {
  id: string;
  employeeId: string;
  calculationType: 'batch' | 'realtime' | 'scenario';
  baseAmount: number;
  bonusPercentage: number;
  bonusAmount: number;
  totalAmount: number;
  calculatedAt: Date;
  parameters: Record<string, any>;
}

export interface BatchProcessing {
  id: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  createdAt: Date;
  completedAt?: Date;
  results?: BonusCalculation[];
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// CALCULATION ENGINE TYPES
// ============================================================================

/**
 * Input parameters for bonus calculation
 */
export interface CalculationInputs {
  baseSalary: number
  targetBonusPct: number
  investmentWeight: number
  investmentScoreMultiplier: number
  qualitativeWeight: number
  qualScoreMultiplier: number
  raf: number
  isMrt?: boolean
  mrt_cap_pct?: number
}

/**
 * Result of bonus calculation with detailed breakdown
 */
export interface CalculationResult {
  finalBonus: number
  targetBonus: number
  investmentComponent: number
  qualitativeComponent: number
  combinedScore: number
  preRafBonus: number
  isCapped: boolean
  capAmount?: number
  breakdown: CalculationBreakdown
}

/**
 * Detailed breakdown of calculation steps
 */
export interface CalculationBreakdown {
  baseSalary: number
  targetBonusPct: number
  targetBonus: number
  investmentWeight: number
  investmentScoreMultiplier: number
  investmentComponent: number
  qualitativeWeight: number
  qualScoreMultiplier: number
  qualitativeComponent: number
  combinedScore: number
  preRafBonus: number
  raf: number
  postRafBonus: number
  isMrt: boolean
  mrtCapPct?: number
  capAmount?: number
  isCapped: boolean
  finalBonus: number
}

/**
 * Validation result for input validation
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Structured response for calculation operations
 */
export interface CalculationResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  context?: string
  warnings?: string[]
  timestamp?: string
}

/**
 * Employee data for batch calculations
 */
export interface EmployeeCalculationData {
  employeeId: string
  name?: string
  baseSalary: number
  targetBonusPct: number
  investmentWeight?: number
  investmentScoreMultiplier?: number
  qualitativeWeight?: number
  qualScoreMultiplier?: number
  raf?: number
  isMrt?: boolean
  mrtCapPct?: number
}

/**
 * Batch calculation scenario
 */
export interface BatchCalculationScenario {
  scenarioId: string
  name: string
  description?: string
  defaultInvestmentWeight: number
  defaultQualitativeWeight: number
  defaultRaf: number
  employees: EmployeeCalculationData[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Result of batch calculation
 */
export interface BatchCalculationResult {
  scenarioId: string
  totalEmployees: number
  successfulCalculations: number
  failedCalculations: number
  totalBonusAmount: number
  averageBonus: number
  results: Array<{
    employeeId: string
    success: boolean
    calculation?: CalculationResult
    error?: string
  }>
  warnings: string[]
  calculatedAt: Date
}

// ============================================================================
// CALCULATION ENGINE ERROR TYPES
// ============================================================================

/**
 * Custom error for validation failures
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Custom error for calculation failures
 */
export class CalculationError extends Error {
  constructor(message: string, public inputs?: any) {
    super(message)
    this.name = 'CalculationError'
  }
}
