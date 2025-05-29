/**
 * Validation and Error Handling Utilities for Calculation Engine (TypeScript/Frontend Version)
 * 
 * This module provides comprehensive validation utilities and error handling
 * for the bonus calculation engine, mirroring the backend Python implementation.
 */

import { CalculationInputs, ValidationError } from './calculationEngine'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface CalculationResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  context?: string
  warnings?: string[]
  timestamp?: string
  inputs?: Record<string, any>
}

export class InputValidator {
  // Validation constants
  private static readonly MIN_SALARY = 0.01
  private static readonly MAX_SALARY = 10_000_000.0 // 10M max salary
  private static readonly MIN_PERCENTAGE = 0.0
  private static readonly MAX_PERCENTAGE = 10.0 // 1000% max bonus
  private static readonly MIN_WEIGHT = 0.0
  private static readonly MAX_WEIGHT = 1.0
  private static readonly MIN_MULTIPLIER = 0.0
  private static readonly MAX_MULTIPLIER = 10.0 // 10x max multiplier
  private static readonly MIN_RAF = 0.0
  private static readonly MAX_RAF = 2.0 // 200% max RAF

  static validateSalary(salary: string | number): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Convert to number
      let salaryNum: number
      if (typeof salary === 'string') {
        salaryNum = parseFloat(salary.replace(/[,$]/g, ''))
      } else {
        salaryNum = salary
      }

      if (isNaN(salaryNum)) {
        errors.push('Base salary must be a valid number')
        return { isValid: false, errors, warnings }
      }

      // Check range
      if (salaryNum <= 0) {
        errors.push('Base salary must be positive')
      } else if (salaryNum < this.MIN_SALARY) {
        errors.push(`Base salary must be at least $${this.MIN_SALARY.toFixed(2)}`)
      } else if (salaryNum > this.MAX_SALARY) {
        warnings.push(`Base salary of $${salaryNum.toLocaleString()} is unusually high (max recommended: $${this.MAX_SALARY.toLocaleString()})`)
      }

      // Check for reasonable values
      if (this.MIN_SALARY <= salaryNum && salaryNum <= 1000) {
        warnings.push('Base salary appears to be very low')
      } else if (salaryNum > 1_000_000) {
        warnings.push('Base salary appears to be very high')
      }
    } catch (error) {
      errors.push('Base salary must be a valid number')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  static validatePercentage(percentage: string | number, fieldName: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Convert to number
      let percentageNum: number
      if (typeof percentage === 'string') {
        percentageNum = parseFloat(percentage.replace(/[%,]/g, ''))
        // If it looks like a percentage (>1), convert to decimal
        if (percentageNum > 1) {
          percentageNum = percentageNum / 100
        }
      } else {
        percentageNum = percentage
      }

      if (isNaN(percentageNum)) {
        errors.push(`${fieldName} must be a valid number`)
        return { isValid: false, errors, warnings }
      }

      // Check range
      if (percentageNum < this.MIN_PERCENTAGE) {
        errors.push(`${fieldName} must be non-negative`)
      } else if (percentageNum > this.MAX_PERCENTAGE) {
        errors.push(`${fieldName} cannot exceed ${this.MAX_PERCENTAGE * 100}%`)
      }

      // Check for reasonable values
      if (percentageNum > 2.0) { // 200%
        warnings.push(`${fieldName} of ${(percentageNum * 100).toFixed(1)}% is unusually high`)
      }
    } catch (error) {
      errors.push(`${fieldName} must be a valid number`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  static validateWeight(weight: string | number, fieldName: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Convert to number
      let weightNum: number
      if (typeof weight === 'string') {
        weightNum = parseFloat(weight.replace(/[%,]/g, ''))
        // If it looks like a percentage (>1), convert to decimal
        if (weightNum > 1) {
          weightNum = weightNum / 100
        }
      } else {
        weightNum = weight
      }

      if (isNaN(weightNum)) {
        errors.push(`${fieldName} must be a valid number`)
        return { isValid: false, errors, warnings }
      }

      // Check range
      if (weightNum < this.MIN_WEIGHT) {
        errors.push(`${fieldName} must be non-negative`)
      } else if (weightNum > this.MAX_WEIGHT) {
        errors.push(`${fieldName} cannot exceed 100%`)
      }
    } catch (error) {
      errors.push(`${fieldName} must be a valid number`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  static validateMultiplier(multiplier: string | number, fieldName: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Convert to number
      let multiplierNum: number
      if (typeof multiplier === 'string') {
        multiplierNum = parseFloat(multiplier.replace(/,/g, ''))
      } else {
        multiplierNum = multiplier
      }

      if (isNaN(multiplierNum)) {
        errors.push(`${fieldName} must be a valid number`)
        return { isValid: false, errors, warnings }
      }

      // Check range
      if (multiplierNum < this.MIN_MULTIPLIER) {
        errors.push(`${fieldName} must be non-negative`)
      } else if (multiplierNum > this.MAX_MULTIPLIER) {
        errors.push(`${fieldName} cannot exceed ${this.MAX_MULTIPLIER}`)
      }

      // Check for reasonable values
      if (multiplierNum > 3.0) {
        warnings.push(`${fieldName} of ${multiplierNum} is unusually high`)
      }
    } catch (error) {
      errors.push(`${fieldName} must be a valid number`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  static validateRaf(raf: string | number): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Convert to number
      let rafNum: number
      if (typeof raf === 'string') {
        rafNum = parseFloat(raf.replace(/,/g, ''))
      } else {
        rafNum = raf
      }

      if (isNaN(rafNum)) {
        errors.push('RAF must be a valid number')
        return { isValid: false, errors, warnings }
      }

      // Check range
      if (rafNum < this.MIN_RAF) {
        errors.push('RAF must be non-negative')
      } else if (rafNum > this.MAX_RAF) {
        errors.push(`RAF cannot exceed ${this.MAX_RAF}`)
      }

      // Check for reasonable values
      if (rafNum > 1.5) {
        warnings.push(`RAF of ${rafNum} is unusually high`)
      } else if (rafNum < 0.5) {
        warnings.push(`RAF of ${rafNum} is unusually low`)
      }
    } catch (error) {
      errors.push('RAF must be a valid number')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  static validateWeightsSum(investmentWeight: number, qualitativeWeight: number): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    const weightSum = investmentWeight + qualitativeWeight
    const tolerance = 0.001

    if (Math.abs(weightSum - 1.0) > tolerance) {
      errors.push(`Investment and qualitative weights must sum to 1.0, got ${weightSum.toFixed(3)}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  static validateCalculationInputs(inputs: Record<string, any>): ValidationResult {
    const allErrors: string[] = []
    const allWarnings: string[] = []

    // Validate individual fields
    const validations = [
      this.validateSalary(inputs.baseSalary || 0),
      this.validatePercentage(inputs.targetBonusPct || 0, 'Target bonus percentage'),
      this.validateWeight(inputs.investmentWeight || 0, 'Investment weight'),
      this.validateWeight(inputs.qualitativeWeight || 0, 'Qualitative weight'),
      this.validateMultiplier(inputs.investmentScoreMultiplier || 0, 'Investment score multiplier'),
      this.validateMultiplier(inputs.qualScoreMultiplier || 0, 'Qualitative score multiplier'),
      this.validateRaf(inputs.raf || 0),
    ]

    // MRT-specific validation
    if (inputs.isMrt) {
      const mrtCapValidation = this.validatePercentage(
        inputs.mrtCapPct || 0,
        'MRT cap percentage'
      )
      validations.push(mrtCapValidation)
    }

    // Collect all errors and warnings
    for (const validation of validations) {
      allErrors.push(...validation.errors)
      allWarnings.push(...validation.warnings)
    }

    // Validate weights sum (only if individual weights are valid)
    try {
      const invWeight = parseFloat(inputs.investmentWeight || 0)
      const qualWeight = parseFloat(inputs.qualitativeWeight || 0)
      if (!isNaN(invWeight) && !isNaN(qualWeight)) {
        const weightsValidation = this.validateWeightsSum(invWeight, qualWeight)
        allErrors.push(...weightsValidation.errors)
        allWarnings.push(...weightsValidation.warnings)
      }
    } catch (error) {
      // Individual weight validation will catch this
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    }
  }
}

export class CalculationErrorHandler {
  static handleValidationError(error: ValidationError, context: string = ''): CalculationResponse {
    console.warn(`Validation error in ${context}:`, error.message)

    return {
      success: false,
      error: 'validation_error',
      message: error.message,
      context,
      timestamp: new Date().toISOString(),
    }
  }

  static handleCalculationError(
    error: Error,
    inputs: Record<string, any>,
    context: string = ''
  ): CalculationResponse {
    console.error(`Calculation error in ${context}:`, error)

    return {
      success: false,
      error: 'calculation_error',
      message: `Calculation failed: ${error.message}`,
      context,
      inputs,
      timestamp: new Date().toISOString(),
    }
  }

  static createSuccessResponse<T>(result: T, warnings?: string[]): CalculationResponse<T> {
    const response: CalculationResponse<T> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }

    if (warnings && warnings.length > 0) {
      response.warnings = warnings
    }

    return response
  }
}

export async function safeCalculateBonus(inputsDict: Record<string, any>): Promise<CalculationResponse> {
  try {
    // Validate inputs
    const validationResult = InputValidator.validateCalculationInputs(inputsDict)

    if (!validationResult.isValid) {
      return CalculationErrorHandler.handleValidationError(
        new ValidationError(validationResult.errors.join('; ')),
        'input_validation'
      )
    }

    // Convert to CalculationInputs object
    const calculationInputs: CalculationInputs = {
      baseSalary: parseFloat(inputsDict.baseSalary),
      targetBonusPct: parseFloat(inputsDict.targetBonusPct),
      investmentWeight: parseFloat(inputsDict.investmentWeight),
      investmentScoreMultiplier: parseFloat(inputsDict.investmentScoreMultiplier),
      qualitativeWeight: parseFloat(inputsDict.qualitativeWeight),
      qualScoreMultiplier: parseFloat(inputsDict.qualScoreMultiplier),
      raf: parseFloat(inputsDict.raf),
      isMrt: inputsDict.isMrt || false,
      mrt_cap_pct: inputsDict.mrtCapPct ? parseFloat(inputsDict.mrtCapPct) : undefined,
    }

    // Perform calculation
    const { CalculationEngine } = await import('./calculationEngine')
    const result = CalculationEngine.calculateFinalBonus(calculationInputs)

    // Return success response with warnings if any
    return CalculationErrorHandler.createSuccessResponse(
      result,
      validationResult.warnings.length > 0 ? validationResult.warnings : undefined
    )
  } catch (error) {
    if (error instanceof ValidationError) {
      return CalculationErrorHandler.handleValidationError(error, 'calculation')
    } else {
      return CalculationErrorHandler.handleCalculationError(
        error as Error,
        inputsDict,
        'calculation'
      )
    }
  }
}

// Utility functions for common validation scenarios
export function validateEmployeeData(employeeData: Record<string, any>): ValidationResult {
  const requiredFields = ['baseSalary', 'targetBonusPct']
  const errors: string[] = []
  const warnings: string[] = []

  // Check required fields
  for (const field of requiredFields) {
    if (!(field in employeeData) || employeeData[field] == null) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  // Validate present fields
  if (errors.length === 0) {
    // Only validate if required fields are present
    const validationResult = InputValidator.validateCalculationInputs(employeeData)
    errors.push(...validationResult.errors)
    warnings.push(...validationResult.warnings)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}
