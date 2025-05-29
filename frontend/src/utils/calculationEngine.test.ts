/**
 * Unit tests for the Core Calculation Engine (TypeScript/Frontend Version)
 * 
 * These tests mirror the Python backend tests to ensure calculation consistency
 * between frontend and backend implementations.
 */

import { describe, it, expect } from 'vitest'
import {
  CalculationEngine,
  CalculationInputs,
  calculateBonus,
} from './calculationEngine'

describe('CalculationEngine', () => {
  describe('input validation through calculateFinalBonus', () => {
    it('should handle valid inputs without throwing', () => {
      const inputs: CalculationInputs = {
        baseSalary: 100000.0,
        targetBonusPct: 0.20,
        investmentWeight: 0.6,
        investmentScoreMultiplier: 1.2,
        qualitativeWeight: 0.4,
        qualScoreMultiplier: 0.8,
        raf: 0.95,
      }
      
      expect(() => CalculationEngine.calculateFinalBonus(inputs)).not.toThrow()
    })

    it('should handle edge case inputs gracefully', () => {
      const inputs: CalculationInputs = {
        baseSalary: 100000.0,
        targetBonusPct: 0.20,
        investmentWeight: 0.7, // Sum = 1.1 (will be auto-corrected)
        investmentScoreMultiplier: 1.2,
        qualitativeWeight: 0.4,
        qualScoreMultiplier: 0.8,
        raf: 0.95,
      }
      
      // Should not throw but auto-correct the weights
      expect(() => CalculationEngine.calculateFinalBonus(inputs)).not.toThrow()
    })

    it('should handle MRT inputs correctly', () => {
      const inputs: CalculationInputs = {
        baseSalary: 100000.0,
        targetBonusPct: 0.20,
        investmentWeight: 0.6,
        investmentScoreMultiplier: 1.2,
        qualitativeWeight: 0.4,
        qualScoreMultiplier: 0.8,
        raf: 0.95,
        isMrt: true,
        mrt_cap_pct: 1.5,
      }
      
      expect(() => CalculationEngine.calculateFinalBonus(inputs)).not.toThrow()
    })
  })

  describe('calculation methods', () => {
    it('should calculate target bonus correctly', () => {
      const result = CalculationEngine.calculateTargetBonus(100000.0, 0.20)
      expect(result).toBe(20000.0)
      
      // Test rounding
      const result2 = CalculationEngine.calculateTargetBonus(100000.0, 0.2333)
      expect(result2).toBe(23330.0)
    })

    it('should calculate weighted performance correctly', () => {
      const result = CalculationEngine.calculateWeightedPerformance(
        0.6, // investmentWeight
        1.2, // investmentScoreMultiplier
        0.4, // qualitativeWeight
        0.8  // qualScoreMultiplier
      )
      
      const expected = 0.6 * 1.2 + 0.4 * 0.8 // 0.72 + 0.32 = 1.04
      expect(result).toBe(expected)
    })

    it('should calculate pre-RAF bonus correctly', () => {
      const result = CalculationEngine.calculatePreRafBonus(20000.0, 1.04)
      expect(result).toBe(20800.0)
    })

    it('should apply RAF correctly', () => {
      const result = CalculationEngine.applyRaf(20800.0, 0.95)
      expect(result).toBe(19760.0)
    })

    it('should calculate caps for non-MRT employee', () => {
      const [baseCap, mrtCap] = CalculationEngine.calculateCaps(100000.0, false)
      expect(baseCap).toBe(300000.0)
      expect(mrtCap).toBeNull()
    })

    it('should calculate caps for MRT employee', () => {
      const [baseCap, mrtCap] = CalculationEngine.calculateCaps(100000.0, true, 1.5)
      expect(baseCap).toBe(300000.0)
      expect(mrtCap).toBe(150000.0)
    })

    it('should apply caps correctly when no cap is hit', () => {
      const [finalBonus, capApplied] = CalculationEngine.applyCaps(
        19760.0, // initialBonus
        300000.0, // baseSalaryCap
        150000.0  // mrtCap
      )
      
      expect(finalBonus).toBe(19760.0)
      expect(capApplied).toBeNull()
    })

    it('should apply base salary cap correctly', () => {
      const [finalBonus, capApplied] = CalculationEngine.applyCaps(
        350000.0, // initialBonus
        300000.0, // baseSalaryCap
        400000.0  // mrtCap
      )
      
      expect(finalBonus).toBe(300000.0)
      expect(capApplied).toBe('3x_base')
    })

    it('should apply MRT cap correctly', () => {
      const [finalBonus, capApplied] = CalculationEngine.applyCaps(
        200000.0, // initialBonus
        300000.0, // baseSalaryCap
        150000.0  // mrtCap
      )
      
      expect(finalBonus).toBe(150000.0)
      expect(capApplied).toBe('mrt')
    })
  })

  describe('calculateFinalBonus', () => {
    it('should calculate final bonus for basic scenario', () => {
      const inputs: CalculationInputs = {
        baseSalary: 100000.0,
        targetBonusPct: 0.20,
        investmentWeight: 0.6,
        investmentScoreMultiplier: 1.2,
        qualitativeWeight: 0.4,
        qualScoreMultiplier: 0.8,
        raf: 0.95,
      }
      
      const result = CalculationEngine.calculateFinalBonus(inputs)
      
      expect(result.targetBonus).toBe(20000.0)
      expect(result.weightedPerformance).toBe(1.04)
      expect(result.preRafBonus).toBe(20800.0)
      expect(result.initialBonus).toBe(19760.0)
      expect(result.baseSalaryCap).toBe(300000.0)
      expect(result.mrtCap).toBeNull()
      expect(result.finalBonus).toBe(19760.0)
      expect(result.capApplied).toBeNull()
    })

    it('should calculate final bonus with MRT cap applied', () => {
      const inputs: CalculationInputs = {
        baseSalary: 100000.0,
        targetBonusPct: 2.0, // High bonus to trigger cap
        investmentWeight: 0.6,
        investmentScoreMultiplier: 2.0,
        qualitativeWeight: 0.4,
        qualScoreMultiplier: 2.0,
        raf: 1.0,
        isMrt: true,
        mrt_cap_pct: 1.5,
      }
      
      const result = CalculationEngine.calculateFinalBonus(inputs)
      
      // Should hit MRT cap of 150k
      expect(result.finalBonus).toBe(150000.0)
      expect(result.capApplied).toBe('mrt')
      expect(result.mrtCap).toBe(150000.0)
    })

    it('should calculate final bonus with 3x base salary cap applied', () => {
      const inputs: CalculationInputs = {
        baseSalary: 100000.0,
        targetBonusPct: 4.0, // Very high bonus to trigger cap
        investmentWeight: 0.6,
        investmentScoreMultiplier: 2.0,
        qualitativeWeight: 0.4,
        qualScoreMultiplier: 2.0,
        raf: 1.0,
        isMrt: true,
        mrt_cap_pct: 5.0, // Higher than 3x base
      }
      
      const result = CalculationEngine.calculateFinalBonus(inputs)
      
      // Should hit 3x base salary cap of 300k
      expect(result.finalBonus).toBe(300000.0)
      expect(result.capApplied).toBe('3x_base')
    })
  })

  describe('convenience function', () => {
    it('should work with calculateBonus function', () => {
      const result = calculateBonus(
        100000.0, // baseSalary
        0.20,     // targetBonusPct
        0.6,      // investmentWeight
        1.2,      // investmentScoreMultiplier
        0.4,      // qualitativeWeight
        0.8,      // qualScoreMultiplier
        0.95      // raf
      )
      
      expect(result).toBeInstanceOf(Object)
      expect(result.finalBonus).toBe(19760.0)
    })
  })

  describe('rounding precision', () => {
    it('should round all monetary values to 2 decimal places', () => {
      const inputs: CalculationInputs = {
        baseSalary: 100000.0,
        targetBonusPct: 0.2333, // Results in non-round numbers
        investmentWeight: 0.6,
        investmentScoreMultiplier: 1.2345,
        qualitativeWeight: 0.4,
        qualScoreMultiplier: 0.8765,
        raf: 0.9876,
      }
      
      const result = CalculationEngine.calculateFinalBonus(inputs)
      
      // All monetary values should be rounded to 2 decimal places
      expect(result.targetBonus).toBe(Math.round(result.targetBonus * 100) / 100)
      expect(result.preRafBonus).toBe(Math.round(result.preRafBonus * 100) / 100)
      expect(result.initialBonus).toBe(Math.round(result.initialBonus * 100) / 100)
      expect(result.finalBonus).toBe(Math.round(result.finalBonus * 100) / 100)
    })
  })
})

describe('Truth Table Scenarios', () => {
  it('should handle high performance scenario without caps', () => {
    const inputs: CalculationInputs = {
      baseSalary: 80000.0,
      targetBonusPct: 0.25,
      investmentWeight: 0.7,
      investmentScoreMultiplier: 1.5,
      qualitativeWeight: 0.3,
      qualScoreMultiplier: 1.3,
      raf: 1.0,
    }
    
    const result = CalculationEngine.calculateFinalBonus(inputs)
    
    // Expected: 80000 * 0.25 * (0.7*1.5 + 0.3*1.3) * 1.0
    // = 20000 * (1.05 + 0.39) * 1.0 = 20000 * 1.44 = 28800
    expect(result.finalBonus).toBe(28800.0)
    expect(result.capApplied).toBeNull()
  })

  it('should handle low performance scenario', () => {
    const inputs: CalculationInputs = {
      baseSalary: 120000.0,
      targetBonusPct: 0.30,
      investmentWeight: 0.6,
      investmentScoreMultiplier: 0.5,
      qualitativeWeight: 0.4,
      qualScoreMultiplier: 0.6,
      raf: 0.8,
    }
    
    const result = CalculationEngine.calculateFinalBonus(inputs)
    
    // Expected: 120000 * 0.30 * (0.6*0.5 + 0.4*0.6) * 0.8
    // = 36000 * (0.3 + 0.24) * 0.8 = 36000 * 0.54 * 0.8 = 15552
    expect(result.finalBonus).toBe(15552.0)
  })

  it('should handle zero performance scenario', () => {
    const inputs: CalculationInputs = {
      baseSalary: 100000.0,
      targetBonusPct: 0.20,
      investmentWeight: 0.5,
      investmentScoreMultiplier: 0.0,
      qualitativeWeight: 0.5,
      qualScoreMultiplier: 0.0,
      raf: 1.0,
    }
    
    const result = CalculationEngine.calculateFinalBonus(inputs)
    
    // Expected: 100000 * 0.20 * (0.5*0.0 + 0.5*0.0) * 1.0 = 0
    expect(result.finalBonus).toBe(0.0)
  })
})

describe('Edge Cases', () => {
  it('should handle zero RAF', () => {
    const inputs: CalculationInputs = {
      baseSalary: 100000.0,
      targetBonusPct: 0.20,
      investmentWeight: 0.6,
      investmentScoreMultiplier: 1.2,
      qualitativeWeight: 0.4,
      qualScoreMultiplier: 0.8,
      raf: 0.0,
    }
    
    const result = CalculationEngine.calculateFinalBonus(inputs)
    expect(result.finalBonus).toBe(0.0)
  })

  it('should handle very high multipliers triggering caps', () => {
    const inputs: CalculationInputs = {
      baseSalary: 50000.0,
      targetBonusPct: 0.50,
      investmentWeight: 0.5,
      investmentScoreMultiplier: 10.0,
      qualitativeWeight: 0.5,
      qualScoreMultiplier: 10.0,
      raf: 1.0,
    }
    
    const result = CalculationEngine.calculateFinalBonus(inputs)
    
    // Should hit 3x base salary cap
    expect(result.finalBonus).toBe(150000.0) // 3 * 50000
    expect(result.capApplied).toBe('3x_base')
  })

  it('should handle minimal values', () => {
    const inputs: CalculationInputs = {
      baseSalary: 1.0,
      targetBonusPct: 0.01,
      investmentWeight: 1.0,
      investmentScoreMultiplier: 0.01,
      qualitativeWeight: 0.0,
      qualScoreMultiplier: 0.0,
      raf: 0.01,
    }
    
    const result = CalculationEngine.calculateFinalBonus(inputs)
    
    // Expected: 1.0 * 0.01 * (1.0*0.01 + 0.0*0.0) * 0.01 = 0.01 * 0.01 * 0.01 = 0.000001
    // Rounded to 2 decimal places = 0.00
    expect(result.finalBonus).toBe(0.0)
  })
})
