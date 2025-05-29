/**
 * Types for employee data and calculation results
 */

export interface EmployeeDataBase {
  employee_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  department?: string;
  position?: string;
  salary?: number;
  hire_date?: string;
  additional_data?: {
    [key: string]: string;
  };
  is_valid?: boolean;
  validation_errors?: string[];
}

export interface EmployeeCalculationResultBase {
  id: string;
  employee_data_id: string;
  batch_result_id: string;
  calculated_at: string;
  calculation_parameters?: any;
  calculation_result?: any;
  calculation_breakdown?: any;
}

export interface EmployeeData {
  id: string;
  employee_data?: EmployeeDataBase;
  employee_data_id?: string;
  batch_result_id?: string;
  calculated_at?: string;
  calculation_parameters?: any;
  calculation_result?: any;
  calculation_breakdown?: any;
  calculationResult?: any;
}

export interface BatchCalculationResult {
  id: string;
  batch_upload_id: string;
  status: string;
  parameters: any;
  summary: any;
  created_at: string;
  completed_at?: string;
  employee_count?: number;
  error_message?: string;
}

export interface CalculationInputs {
  baseSalary: number;
  targetBonusPct: number;
  investmentWeight: number;
  qualitativeWeight: number;
  investmentScore: number;
  qualitativeScore: number;
  raf: number;
  isMRT?: boolean;
  mrtCapPct?: number;
  baseSalaryCapMultiplier?: number;
}

export interface CalculationResult {
  baseSalary: number;
  targetBonus: number;
  investmentComponent: number;
  qualitativeComponent: number;
  combinedScore: number;
  rafApplied: number;
  finalBonus: number;
  cappingApplied?: boolean;
  cappingReason?: string;
  warnings?: string[];
}

export interface CalculationBreakdown {
  targetBonusPct: number;
  investmentWeight: number;
  qualitativeWeight: number;
  investmentScore: number;
  qualitativeScore: number;
  investmentScoreMultiplier: number;
  qualScoreMultiplier: number;
  weightedInvestmentScore: number;
  weightedQualitativeScore: number;
  combinedScore: number;
  raf: number;
  uncappedBonus: number;
  finalBonus: number;
  cappingApplied: boolean;
  cappingReason?: string;
}
