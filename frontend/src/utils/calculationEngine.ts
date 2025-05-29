/**
 * Core Calculation Engine for Bonus Calculator (TypeScript/Frontend Version)
 * 
 * This module implements the core bonus calculation logic that mirrors
 * the backend Python implementation to ensure consistent calculations.
 * 
 * Formula: FinalBonus = BaseSalary × TargetBonusPct × (InvestmentWeight × InvestmentScoreMultiplier + QualitativeWeight × QualScoreMultiplier) × RAF
 */

export interface CalculationInputs {
  baseSalary: number;
  targetBonusPct: number;
  investmentWeight: number;
  investmentScoreMultiplier: number;
  qualitativeWeight: number;
  qualScoreMultiplier: number;
  raf: number;
  isMrt?: boolean;
  mrt_cap_pct?: number;
  // Bonus pool parameters
  useBonusPoolLimit?: boolean;
  totalBonusPool?: number;
  totalCalculatedBonuses?: number; // Sum of all calculated bonuses before scaling
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

export interface CalculationResult {
  targetBonus: number;
  weightedPerformance: number;
  preRafBonus: number;
  initialBonus: number;
  baseSalaryCap: number;
  mrtCap: number | null;
  finalBonus: number;
  capApplied: string | null;
  poolScalingApplied?: boolean;
  poolScalingFactor?: number;
  preScalingBonus?: number;
  calculationSteps: Record<string, number>;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class CalculationEngine {
  // Constants
  private static readonly BASE_SALARY_CAP_MULTIPLIER = 3.0;

  /**
   * Validate calculation inputs
   * @param inputs Calculation inputs to validate
   * @returns Validation result
   */
  private static validateInputs(inputs: CalculationInputs): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (inputs.baseSalary <= 0) {
      errors.push('Base salary must be positive');
    }

    if (inputs.targetBonusPct < 0) {
      errors.push('Target bonus percentage must be non-negative');
    }

    // Weight validation - ensure weights are between 0 and 1
    const investmentWeight = Math.max(0, Math.min(1, inputs.investmentWeight));
    const qualitativeWeight = Math.max(0, Math.min(1, inputs.qualitativeWeight));

    // Only add error if the original inputs were outside the valid range
    if (inputs.investmentWeight < 0 || inputs.investmentWeight > 1) {
      errors.push('Investment weight must be between 0 and 1');
      // Auto-correct the input for calculation
      inputs.investmentWeight = investmentWeight;
    }

    if (inputs.qualitativeWeight < 0 || inputs.qualitativeWeight > 1) {
      errors.push('Qualitative weight must be between 0 and 1');
      // Auto-correct the input for calculation
      inputs.qualitativeWeight = qualitativeWeight;
    }

    // Check if weights sum to 1.0
    const weightSum = inputs.investmentWeight + inputs.qualitativeWeight;
    if (Math.abs(weightSum - 1.0) > 0.001) {
      warnings.push(`Investment and qualitative weights should sum to 1. Current sum: ${weightSum.toFixed(2)}`);
      // Auto-adjust weights to sum to 1.0 if they're both valid but don't sum correctly
      if (errors.length === 0) {
        const adjustmentFactor = 1.0 / weightSum;
        inputs.investmentWeight *= adjustmentFactor;
        inputs.qualitativeWeight *= adjustmentFactor;
      }
    }

    if (inputs.investmentScoreMultiplier < 0) {
      errors.push('Investment score multiplier must be non-negative');
    }

    if (inputs.qualScoreMultiplier < 0) {
      errors.push('Qualitative score multiplier must be non-negative');
    }

    if (inputs.raf < 0) {
      errors.push('RAF must be non-negative');
    }

    if (inputs.isMrt && (!inputs.mrt_cap_pct || inputs.mrt_cap_pct <= 0)) {
      errors.push('MRT cap percentage must be positive when isMrt is true');
    }
    
    return {
      errors,
      warnings,
      isValid: errors.length === 0
    };
  }

  /**
   * Round amount to 2 decimal places using standard rounding
   */
  private static roundCurrency(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Calculate target bonus amount
   */
  static calculateTargetBonus(baseSalary: number, targetBonusPct: number): number {
    const targetBonus = baseSalary * targetBonusPct;
    return this.roundCurrency(targetBonus);
  }

  /**
   * Calculate weighted performance score
   */
  static calculateWeightedPerformance(
    investmentWeight: number,
    investmentScoreMultiplier: number,
    qualitativeWeight: number,
    qualScoreMultiplier: number
  ): number {
    return investmentWeight * investmentScoreMultiplier + qualitativeWeight * qualScoreMultiplier;
  }

  /**
   * Calculate bonus amount before RAF application
   */
  static calculatePreRafBonus(targetBonus: number, weightedPerformance: number): number {
    const preRafBonus = targetBonus * weightedPerformance;
    return this.roundCurrency(preRafBonus);
  }

  /**
   * Apply Risk Adjustment Factor (RAF) to bonus
   */
  static applyRaf(preRafBonus: number, raf: number): number {
    const initialBonus = preRafBonus * raf;
    return this.roundCurrency(initialBonus);
  }

  /**
   * Calculate applicable caps
   */
  static calculateCaps(
    baseSalary: number,
    isMrt: boolean = false,
    mrtCapPct?: number
  ): [number, number | null] {
    const baseSalaryCap = this.roundCurrency(baseSalary * this.BASE_SALARY_CAP_MULTIPLIER);
    
    let mrtCap: number | null = null;
    if (isMrt && mrtCapPct !== undefined) {
      mrtCap = this.roundCurrency(baseSalary * mrtCapPct);
    }
    
    return [baseSalaryCap, mrtCap];
  }

  /**
   * Apply bonus pool limit scaling if needed
   */
  static applyBonusPoolLimit(
    bonus: number,
    useBonusPoolLimit: boolean = false,
    totalBonusPool?: number,
    totalCalculatedBonuses?: number
  ): [number, boolean, number] {
    // If bonus pool limit is not enabled or missing required values, return original bonus
    if (!useBonusPoolLimit || !totalBonusPool || !totalCalculatedBonuses || totalCalculatedBonuses <= 0) {
      return [bonus, false, 1.0];
    }
    
    // Calculate scaling factor
    const scalingFactor = Math.min(1.0, totalBonusPool / totalCalculatedBonuses);
    
    // If scaling factor is 1 or greater, no scaling needed
    if (scalingFactor >= 1.0) {
      return [bonus, false, 1.0];
    }
    
    // Apply scaling factor to bonus
    const scaledBonus = this.roundCurrency(bonus * scalingFactor);
    
    return [scaledBonus, true, scalingFactor];
  }

  /**
   * Apply caps to bonus amount
   */
  static applyCaps(
    initialBonus: number,
    baseSalaryCap: number,
    mrtCap?: number | null
  ): [number, string | null] {
    // Determine which cap applies
    const applicableCaps = [baseSalaryCap];
    if (mrtCap !== null && mrtCap !== undefined) {
      applicableCaps.push(mrtCap);
    }

    // Apply the most restrictive cap
    const effectiveCap = Math.min(...applicableCaps);
    const finalBonus = Math.min(initialBonus, effectiveCap);

    // Determine which cap was applied (if any)
    let capApplied: string | null = null;
    if (finalBonus < initialBonus) {
      if (finalBonus === baseSalaryCap && (mrtCap === null || mrtCap === undefined || baseSalaryCap <= mrtCap)) {
        capApplied = '3x_base';
      } else if (mrtCap !== null && mrtCap !== undefined && finalBonus === mrtCap) {
        capApplied = 'mrt';
      }
    }

    return [this.roundCurrency(finalBonus), capApplied];
  }

  /**
   * Calculate the final bonus with all intermediate steps
   */
  static calculateFinalBonus(inputs: CalculationInputs): CalculationResult {
    // Validate inputs
    const validationResult = this.validateInputs(inputs);
    
    // If validation fails, throw the first error
    if (!validationResult.isValid) {
      throw new ValidationError(validationResult.errors[0]);
    }

    try {
      // Step 1: Calculate target bonus
      const targetBonus = this.calculateTargetBonus(inputs.baseSalary, inputs.targetBonusPct);

      // Step 2: Calculate weighted performance
      const weightedPerformance = this.calculateWeightedPerformance(
        inputs.investmentWeight,
        inputs.investmentScoreMultiplier,
        inputs.qualitativeWeight,
        inputs.qualScoreMultiplier
      );

      // Step 3: Calculate pre-RAF bonus
      const preRafBonus = this.calculatePreRafBonus(targetBonus, weightedPerformance);

      // Step 4: Apply RAF
      const initialBonus = this.applyRaf(preRafBonus, inputs.raf);

      // Step 5: Calculate caps
      const [baseSalaryCap, mrtCap] = this.calculateCaps(
        inputs.baseSalary,
        inputs.isMrt,
        inputs.mrt_cap_pct
      );

      // Step 6: Apply caps
      const [cappedBonus, capApplied] = this.applyCaps(initialBonus, baseSalaryCap, mrtCap);
      
      // Step 7: Apply bonus pool limit if enabled
      const [finalBonus, poolScalingApplied, poolScalingFactor] = this.applyBonusPoolLimit(
        cappedBonus,
        inputs.useBonusPoolLimit,
        inputs.totalBonusPool,
        inputs.totalCalculatedBonuses
      );

      // Create calculation steps for audit trail
      const calculationSteps: Record<string, number> = {
        baseSalary: inputs.baseSalary,
        targetBonusPct: inputs.targetBonusPct,
        investmentWeight: inputs.investmentWeight,
        investmentScoreMultiplier: inputs.investmentScoreMultiplier,
        qualitativeWeight: inputs.qualitativeWeight,
        qualScoreMultiplier: inputs.qualScoreMultiplier,
        raf: inputs.raf,
        targetBonus,
        weightedPerformance,
        preRafBonus,
        initialBonus,
        cappedBonus,
        finalBonus,
      };
      
      // Add pool scaling info to calculation steps if applied
      if (poolScalingApplied) {
        calculationSteps.poolScalingFactor = poolScalingFactor;
        calculationSteps.totalBonusPool = inputs.totalBonusPool || 0;
        calculationSteps.totalCalculatedBonuses = inputs.totalCalculatedBonuses || 0;
      }

      return {
        targetBonus,
        weightedPerformance,
        preRafBonus,
        initialBonus,
        baseSalaryCap,
        mrtCap,
        finalBonus,
        capApplied,
        poolScalingApplied,
        poolScalingFactor,
        preScalingBonus: cappedBonus,
        calculationSteps,
      };
    } catch (error) {
      console.error('Calculation error:', error);
      throw new ValidationError(`Calculation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Convenience function for bonus calculation
 */
export function calculateBonus(
  baseSalary: number,
  targetBonusPct: number,
  investmentWeight: number,
  investmentScoreMultiplier: number,
  qualitativeWeight: number,
  qualScoreMultiplier: number,
  raf: number,
  isMrt: boolean = false,
  mrtCapPct?: number,
  useBonusPoolLimit: boolean = false,
  totalBonusPool?: number,
  totalCalculatedBonuses?: number
): CalculationResult {
  const inputs: CalculationInputs = {
    baseSalary,
    targetBonusPct,
    investmentWeight,
    investmentScoreMultiplier,
    qualitativeWeight,
    qualScoreMultiplier,
    raf,
    isMrt,
    mrt_cap_pct: mrtCapPct,
    useBonusPoolLimit,
    totalBonusPool,
    totalCalculatedBonuses,
  };

  return CalculationEngine.calculateFinalBonus(inputs);
}
