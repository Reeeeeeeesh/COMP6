"""
Core Calculation Engine for Bonus Calculator

This module implements the core bonus calculation logic that will be used
across all modules (batch processing, individual calculator, and scenario playground).

Formula: FinalBonus = BaseSalary × TargetBonusPct × (InvestmentWeight × InvestmentScoreMultiplier + QualitativeWeight × QualScoreMultiplier) × RAF

Key Components:
- Target bonus calculation
- Weighted performance scores
- RAF calculation with sensitivity and clamping
- Cap application logic (3x Base Salary and MRT Cap)
"""

from typing import Dict, Optional, Union
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
import logging

logger = logging.getLogger(__name__)


@dataclass
class CalculationInputs:
    """Input parameters for bonus calculation."""
    base_salary: float
    target_bonus_pct: float
    investment_weight: float
    investment_score_multiplier: float
    qualitative_weight: float
    qual_score_multiplier: float
    raf: float
    is_mrt: bool = False
    mrt_cap_pct: Optional[float] = None
    # Bonus pool parameters
    use_bonus_pool_limit: bool = False
    total_bonus_pool: Optional[float] = None
    total_calculated_bonuses: Optional[float] = None


@dataclass
class CalculationResult:
    """Result of bonus calculation with all intermediate steps."""
    target_bonus: float
    weighted_performance: float
    pre_raf_bonus: float
    initial_bonus: float
    base_salary_cap: float
    mrt_cap: Optional[float]
    final_bonus: float
    cap_applied: Optional[str]
    calculation_steps: Dict[str, float]
    # Bonus pool scaling information
    pool_scaling_applied: bool = False
    pool_scaling_factor: Optional[float] = None
    pre_scaling_bonus: Optional[float] = None


class ValidationError(Exception):
    """Raised when input validation fails."""
    pass


class CalculationEngine:
    """Core calculation engine for bonus calculations."""
    
    # Constants
    BASE_SALARY_CAP_MULTIPLIER = 3.0
    PRECISION_DECIMAL_PLACES = 2
    
    @staticmethod
    def validate_inputs(inputs: CalculationInputs) -> None:
        """
        Validate calculation inputs.
        
        Args:
            inputs: CalculationInputs object to validate
            
        Raises:
            ValidationError: If any input is invalid
        """
        if inputs.base_salary <= 0:
            raise ValidationError("Base salary must be positive")
            
        if inputs.target_bonus_pct < 0:
            raise ValidationError("Target bonus percentage must be non-negative")
            
        if not (0 <= inputs.investment_weight <= 1):
            raise ValidationError("Investment weight must be between 0 and 1")
            
        if not (0 <= inputs.qualitative_weight <= 1):
            raise ValidationError("Qualitative weight must be between 0 and 1")
            
        # Weights should sum to 1 (with small tolerance for floating point)
        weight_sum = inputs.investment_weight + inputs.qualitative_weight
        if abs(weight_sum - 1.0) > 0.001:
            raise ValidationError(f"Investment and qualitative weights must sum to 1.0, got {weight_sum}")
            
        if inputs.investment_score_multiplier < 0:
            raise ValidationError("Investment score multiplier must be non-negative")
            
        if inputs.qual_score_multiplier < 0:
            raise ValidationError("Qualitative score multiplier must be non-negative")
            
        if inputs.raf < 0:
            raise ValidationError("RAF must be non-negative")
            
        if inputs.is_mrt and (inputs.mrt_cap_pct is None or inputs.mrt_cap_pct <= 0):
            raise ValidationError("MRT cap percentage must be positive when is_mrt is True")
    
    @staticmethod
    def _round_currency(amount: float) -> float:
        """Round amount to 2 decimal places using banker's rounding."""
        decimal_amount = Decimal(str(amount))
        rounded = decimal_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return float(rounded)
    
    @classmethod
    def calculate_target_bonus(cls, base_salary: float, target_bonus_pct: float) -> float:
        """
        Calculate target bonus amount.
        
        Args:
            base_salary: Employee's base salary
            target_bonus_pct: Target bonus percentage (0-1)
            
        Returns:
            Target bonus amount
        """
        target_bonus = base_salary * target_bonus_pct
        return cls._round_currency(target_bonus)
    
    @classmethod
    def calculate_weighted_performance(
        cls,
        investment_weight: float,
        investment_score_multiplier: float,
        qualitative_weight: float,
        qual_score_multiplier: float
    ) -> float:
        """
        Calculate weighted performance score.
        
        Args:
            investment_weight: Weight for investment component (0-1)
            investment_score_multiplier: Investment score multiplier
            qualitative_weight: Weight for qualitative component (0-1)
            qual_score_multiplier: Qualitative score multiplier
            
        Returns:
            Weighted performance score
        """
        weighted_performance = (
            investment_weight * investment_score_multiplier +
            qualitative_weight * qual_score_multiplier
        )
        return weighted_performance
    
    @classmethod
    def calculate_pre_raf_bonus(cls, target_bonus: float, weighted_performance: float) -> float:
        """
        Calculate bonus amount before RAF application.
        
        Args:
            target_bonus: Target bonus amount
            weighted_performance: Weighted performance score
            
        Returns:
            Pre-RAF bonus amount
        """
        pre_raf_bonus = target_bonus * weighted_performance
        return cls._round_currency(pre_raf_bonus)
    
    @classmethod
    def apply_raf(cls, pre_raf_bonus: float, raf: float) -> float:
        """
        Apply Risk Adjustment Factor (RAF) to bonus.
        
        Args:
            pre_raf_bonus: Bonus amount before RAF
            raf: Risk Adjustment Factor
            
        Returns:
            Bonus amount after RAF application
        """
        initial_bonus = pre_raf_bonus * raf
        return cls._round_currency(initial_bonus)
    
    @classmethod
    def calculate_caps(
        cls,
        base_salary: float,
        is_mrt: bool = False,
        mrt_cap_pct: Optional[float] = None
    ) -> tuple[float, Optional[float]]:
        """
        Calculate applicable caps.
        
        Args:
            base_salary: Employee's base salary
            is_mrt: Whether employee is Material Risk Taker
            mrt_cap_pct: MRT cap percentage (required if is_mrt is True)
            
        Returns:
            Tuple of (base_salary_cap, mrt_cap)
        """
        base_salary_cap = cls._round_currency(base_salary * cls.BASE_SALARY_CAP_MULTIPLIER)
        
        mrt_cap = None
        if is_mrt and mrt_cap_pct is not None:
            mrt_cap = cls._round_currency(base_salary * mrt_cap_pct)
            
        return base_salary_cap, mrt_cap
    
    @classmethod
    def apply_bonus_pool_limit(
        cls,
        bonus: float,
        use_bonus_pool_limit: bool = False,
        total_bonus_pool: Optional[float] = None,
        total_calculated_bonuses: Optional[float] = None
    ) -> tuple[float, bool, Optional[float]]:
        """
        Apply bonus pool limit scaling if needed.
        
        Args:
            bonus: Bonus amount to potentially scale
            use_bonus_pool_limit: Whether to apply bonus pool limit
            total_bonus_pool: Total bonus pool amount
            total_calculated_bonuses: Sum of all calculated bonuses before scaling
            
        Returns:
            Tuple of (scaled_bonus, scaling_applied, scaling_factor)
        """
        # If bonus pool limit is not enabled or missing required values, return original bonus
        if not use_bonus_pool_limit or total_bonus_pool is None or total_calculated_bonuses is None or total_calculated_bonuses <= 0:
            return bonus, False, None
        
        # Calculate scaling factor
        scaling_factor = min(1.0, total_bonus_pool / total_calculated_bonuses)
        
        # If scaling factor is 1 or greater, no scaling needed
        if scaling_factor >= 1.0:
            return bonus, False, None
        
        # Apply scaling factor to bonus
        scaled_bonus = cls._round_currency(bonus * scaling_factor)
        
        return scaled_bonus, True, scaling_factor
    
    @classmethod
    def apply_caps(
        cls,
        initial_bonus: float,
        base_salary_cap: float,
        mrt_cap: Optional[float] = None
    ) -> tuple[float, Optional[str]]:
        """
        Apply caps to bonus amount.
        
        Args:
            initial_bonus: Bonus amount before caps
            base_salary_cap: 3x base salary cap
            mrt_cap: MRT cap (if applicable)
            
        Returns:
            Tuple of (final_bonus, cap_applied)
        """
        # Determine which cap applies
        applicable_caps = [base_salary_cap]
        if mrt_cap is not None:
            applicable_caps.append(mrt_cap)
        
        # Apply the most restrictive cap
        effective_cap = min(applicable_caps)
        final_bonus = min(initial_bonus, effective_cap)
        
        # Determine which cap was applied (if any)
        cap_applied = None
        if final_bonus < initial_bonus:
            if final_bonus == base_salary_cap and (mrt_cap is None or base_salary_cap <= mrt_cap):
                cap_applied = "3x_base"
            elif mrt_cap is not None and final_bonus == mrt_cap:
                cap_applied = "mrt"
        
        return cls._round_currency(final_bonus), cap_applied
    
    @classmethod
    def calculate_final_bonus(cls, inputs: CalculationInputs) -> CalculationResult:
        """
        Calculate the final bonus with all intermediate steps.
        
        Args:
            inputs: CalculationInputs object with all required parameters
            
        Returns:
            CalculationResult object with final bonus and all intermediate calculations
            
        Raises:
            ValidationError: If input validation fails
        """
        # Validate inputs
        cls.validate_inputs(inputs)
        
        try:
            # Step 1: Calculate target bonus
            target_bonus = cls.calculate_target_bonus(
                inputs.base_salary, 
                inputs.target_bonus_pct
            )
            
            # Step 2: Calculate weighted performance
            weighted_performance = cls.calculate_weighted_performance(
                inputs.investment_weight,
                inputs.investment_score_multiplier,
                inputs.qualitative_weight,
                inputs.qual_score_multiplier
            )
            
            # Step 3: Calculate pre-RAF bonus
            pre_raf_bonus = cls.calculate_pre_raf_bonus(target_bonus, weighted_performance)
            
            # Step 4: Apply RAF
            initial_bonus = cls.apply_raf(pre_raf_bonus, inputs.raf)
            
            # Step 5: Calculate caps
            base_salary_cap, mrt_cap = cls.calculate_caps(
                inputs.base_salary,
                inputs.is_mrt,
                inputs.mrt_cap_pct
            )
            
            # Step 6: Apply caps
            capped_bonus, cap_applied = cls.apply_caps(initial_bonus, base_salary_cap, mrt_cap)
            
            # Step 7: Apply bonus pool limit if enabled
            final_bonus, pool_scaling_applied, pool_scaling_factor = cls.apply_bonus_pool_limit(
                capped_bonus,
                inputs.use_bonus_pool_limit,
                inputs.total_bonus_pool,
                inputs.total_calculated_bonuses
            )
            
            # Create calculation steps for audit trail
            calculation_steps = {
                "base_salary": inputs.base_salary,
                "target_bonus_pct": inputs.target_bonus_pct,
                "investment_weight": inputs.investment_weight,
                "investment_score_multiplier": inputs.investment_score_multiplier,
                "qualitative_weight": inputs.qualitative_weight,
                "qual_score_multiplier": inputs.qual_score_multiplier,
                "raf": inputs.raf,
                "target_bonus": target_bonus,
                "weighted_performance": weighted_performance,
                "pre_raf_bonus": pre_raf_bonus,
                "initial_bonus": initial_bonus,
                "capped_bonus": capped_bonus,
                "final_bonus": final_bonus
            }
            
            # Add pool scaling info to calculation steps if applied
            if pool_scaling_applied and pool_scaling_factor is not None:
                calculation_steps["pool_scaling_factor"] = pool_scaling_factor
                if inputs.total_bonus_pool is not None:
                    calculation_steps["total_bonus_pool"] = inputs.total_bonus_pool
                if inputs.total_calculated_bonuses is not None:
                    calculation_steps["total_calculated_bonuses"] = inputs.total_calculated_bonuses
            
            return CalculationResult(
                target_bonus=target_bonus,
                weighted_performance=weighted_performance,
                pre_raf_bonus=pre_raf_bonus,
                initial_bonus=initial_bonus,
                base_salary_cap=base_salary_cap,
                mrt_cap=mrt_cap,
                final_bonus=final_bonus,
                cap_applied=cap_applied,
                pool_scaling_applied=pool_scaling_applied,
                pool_scaling_factor=pool_scaling_factor,
                pre_scaling_bonus=capped_bonus if pool_scaling_applied else None,
                calculation_steps=calculation_steps
            )
            
        except Exception as e:
            logger.error(f"Calculation error: {str(e)}")
            raise ValidationError(f"Calculation failed: {str(e)}")


# Convenience function for simple calculations
def calculate_bonus(
    base_salary: float,
    target_bonus_pct: float,
    investment_weight: float,
    investment_score_multiplier: float,
    qualitative_weight: float,
    qual_score_multiplier: float,
    raf: float,
    is_mrt: bool = False,
    mrt_cap_pct: Optional[float] = None,
    use_bonus_pool_limit: bool = False,
    total_bonus_pool: Optional[float] = None,
    total_calculated_bonuses: Optional[float] = None
) -> CalculationResult:
    """
    Convenience function for bonus calculation.
    
    Args:
        base_salary: Employee's base salary
        target_bonus_pct: Target bonus percentage (0-1)
        investment_weight: Weight for investment component (0-1)
        investment_score_multiplier: Investment score multiplier
        qualitative_weight: Weight for qualitative component (0-1)
        qual_score_multiplier: Qualitative score multiplier
        raf: Risk Adjustment Factor
        is_mrt: Whether employee is Material Risk Taker
        mrt_cap_pct: MRT cap percentage (required if is_mrt is True)
        use_bonus_pool_limit: Whether to apply bonus pool limit
        total_bonus_pool: Total bonus pool amount
        total_calculated_bonuses: Sum of all calculated bonuses before scaling
        
    Returns:
        CalculationResult object with final bonus and all intermediate calculations
    """
    inputs = CalculationInputs(
        base_salary=base_salary,
        target_bonus_pct=target_bonus_pct,
        investment_weight=investment_weight,
        investment_score_multiplier=investment_score_multiplier,
        qualitative_weight=qualitative_weight,
        qual_score_multiplier=qual_score_multiplier,
        raf=raf,
        is_mrt=is_mrt,
        mrt_cap_pct=mrt_cap_pct,
        use_bonus_pool_limit=use_bonus_pool_limit,
        total_bonus_pool=total_bonus_pool,
        total_calculated_bonuses=total_calculated_bonuses
    )
    
    return CalculationEngine.calculate_final_bonus(inputs)
