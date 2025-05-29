"""
Validation and Error Handling Utilities for Calculation Engine

This module provides comprehensive validation utilities and error handling
for the bonus calculation engine, ensuring data integrity and meaningful
error messages across all calculation scenarios.
"""

from typing import Dict, List, Optional, Union, Any
from decimal import Decimal, InvalidOperation
import logging
from dataclasses import dataclass

from .calculation_engine import CalculationInputs, ValidationError

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of input validation."""
    is_valid: bool
    errors: List[str]
    warnings: List[str]


class InputValidator:
    """Comprehensive input validation for calculation engine."""
    
    # Validation constants
    MIN_SALARY = 0.01
    MAX_SALARY = 10_000_000.0  # 10M max salary
    MIN_PERCENTAGE = 0.0
    MAX_PERCENTAGE = 10.0  # 1000% max bonus
    MIN_WEIGHT = 0.0
    MAX_WEIGHT = 1.0
    MIN_MULTIPLIER = 0.0
    MAX_MULTIPLIER = 10.0  # 10x max multiplier
    MIN_RAF = 0.0
    MAX_RAF = 2.0  # 200% max RAF
    MIN_MRT_CAP = 0.01
    MAX_MRT_CAP = 10.0  # 1000% max MRT cap
    
    @classmethod
    def validate_salary(cls, salary: Union[float, int, str]) -> ValidationResult:
        """Validate base salary input."""
        errors = []
        warnings = []
        
        try:
            # Convert to float
            if isinstance(salary, str):
                salary = float(salary.replace(',', '').replace('$', ''))
            salary = float(salary)
            
            # Check range
            if salary <= 0:
                errors.append("Base salary must be positive")
            elif salary < cls.MIN_SALARY:
                errors.append(f"Base salary must be at least ${cls.MIN_SALARY:,.2f}")
            elif salary > cls.MAX_SALARY:
                warnings.append(f"Base salary of ${salary:,.2f} is unusually high (max recommended: ${cls.MAX_SALARY:,.2f})")
            
            # Check for reasonable values
            if cls.MIN_SALARY <= salary <= 1000:
                warnings.append("Base salary appears to be very low")
            elif salary > 1_000_000:
                warnings.append("Base salary appears to be very high")
                
        except (ValueError, TypeError, InvalidOperation):
            errors.append("Base salary must be a valid number")
            
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    @classmethod
    def validate_percentage(cls, percentage: Union[float, int, str], field_name: str) -> ValidationResult:
        """Validate percentage inputs (bonus %, MRT cap %)."""
        errors = []
        warnings = []
        
        try:
            # Convert to float
            if isinstance(percentage, str):
                percentage = float(percentage.replace('%', '').replace(',', ''))
                # If it looks like a percentage (>1), convert to decimal
                if percentage > 1:
                    percentage = percentage / 100
            percentage = float(percentage)
            
            # Check range
            if percentage < cls.MIN_PERCENTAGE:
                errors.append(f"{field_name} must be non-negative")
            elif percentage > cls.MAX_PERCENTAGE:
                errors.append(f"{field_name} cannot exceed {cls.MAX_PERCENTAGE * 100:.0f}%")
            
            # Check for reasonable values
            if percentage > 2.0:  # 200%
                warnings.append(f"{field_name} of {percentage * 100:.1f}% is unusually high")
                
        except (ValueError, TypeError, InvalidOperation):
            errors.append(f"{field_name} must be a valid number")
            
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    @classmethod
    def validate_weight(cls, weight: Union[float, int, str], field_name: str) -> ValidationResult:
        """Validate weight inputs (investment weight, qualitative weight)."""
        errors = []
        warnings = []
        
        try:
            # Convert to float
            if isinstance(weight, str):
                weight = float(weight.replace('%', '').replace(',', ''))
                # If it looks like a percentage (>1), convert to decimal
                if weight > 1:
                    weight = weight / 100
            weight = float(weight)
            
            # Check range
            if weight < cls.MIN_WEIGHT:
                errors.append(f"{field_name} must be non-negative")
            elif weight > cls.MAX_WEIGHT:
                errors.append(f"{field_name} cannot exceed 100%")
                
        except (ValueError, TypeError, InvalidOperation):
            errors.append(f"{field_name} must be a valid number")
            
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    @classmethod
    def validate_multiplier(cls, multiplier: Union[float, int, str], field_name: str) -> ValidationResult:
        """Validate score multiplier inputs."""
        errors = []
        warnings = []
        
        try:
            # Convert to float
            if isinstance(multiplier, str):
                multiplier = float(multiplier.replace(',', ''))
            multiplier = float(multiplier)
            
            # Check range
            if multiplier < cls.MIN_MULTIPLIER:
                errors.append(f"{field_name} must be non-negative")
            elif multiplier > cls.MAX_MULTIPLIER:
                errors.append(f"{field_name} cannot exceed {cls.MAX_MULTIPLIER}")
            
            # Check for reasonable values
            if multiplier > 3.0:
                warnings.append(f"{field_name} of {multiplier} is unusually high")
                
        except (ValueError, TypeError, InvalidOperation):
            errors.append(f"{field_name} must be a valid number")
            
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    @classmethod
    def validate_raf(cls, raf: Union[float, int, str]) -> ValidationResult:
        """Validate Risk Adjustment Factor."""
        errors = []
        warnings = []
        
        try:
            # Convert to float
            if isinstance(raf, str):
                raf = float(raf.replace(',', ''))
            raf = float(raf)
            
            # Check range
            if raf < cls.MIN_RAF:
                errors.append("RAF must be non-negative")
            elif raf > cls.MAX_RAF:
                errors.append(f"RAF cannot exceed {cls.MAX_RAF}")
            
            # Check for reasonable values
            if raf > 1.5:
                warnings.append(f"RAF of {raf} is unusually high")
            elif raf < 0.5:
                warnings.append(f"RAF of {raf} is unusually low")
                
        except (ValueError, TypeError, InvalidOperation):
            errors.append("RAF must be a valid number")
            
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    @classmethod
    def validate_weights_sum(cls, investment_weight: float, qualitative_weight: float) -> ValidationResult:
        """Validate that weights sum to 1.0."""
        errors = []
        warnings = []
        
        weight_sum = investment_weight + qualitative_weight
        tolerance = 0.001
        
        if abs(weight_sum - 1.0) > tolerance:
            errors.append(f"Investment and qualitative weights must sum to 1.0, got {weight_sum:.3f}")
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    @classmethod
    def validate_calculation_inputs(cls, inputs: Dict[str, Any]) -> ValidationResult:
        """Comprehensive validation of all calculation inputs."""
        all_errors = []
        all_warnings = []
        
        # Validate individual fields
        validations = [
            cls.validate_salary(inputs.get('base_salary', 0)),
            cls.validate_percentage(inputs.get('target_bonus_pct', 0), 'Target bonus percentage'),
            cls.validate_weight(inputs.get('investment_weight', 0), 'Investment weight'),
            cls.validate_weight(inputs.get('qualitative_weight', 0), 'Qualitative weight'),
            cls.validate_multiplier(inputs.get('investment_score_multiplier', 0), 'Investment score multiplier'),
            cls.validate_multiplier(inputs.get('qual_score_multiplier', 0), 'Qualitative score multiplier'),
            cls.validate_raf(inputs.get('raf', 0)),
        ]
        
        # MRT-specific validation
        if inputs.get('is_mrt', False):
            mrt_cap_validation = cls.validate_percentage(
                inputs.get('mrt_cap_pct', 0), 
                'MRT cap percentage'
            )
            validations.append(mrt_cap_validation)
        
        # Collect all errors and warnings
        for validation in validations:
            all_errors.extend(validation.errors)
            all_warnings.extend(validation.warnings)
        
        # Validate weights sum (only if individual weights are valid)
        try:
            inv_weight = float(inputs.get('investment_weight', 0))
            qual_weight = float(inputs.get('qualitative_weight', 0))
            weights_validation = cls.validate_weights_sum(inv_weight, qual_weight)
            all_errors.extend(weights_validation.errors)
            all_warnings.extend(weights_validation.warnings)
        except (ValueError, TypeError):
            pass  # Individual weight validation will catch this
        
        return ValidationResult(
            is_valid=len(all_errors) == 0,
            errors=all_errors,
            warnings=all_warnings
        )


class CalculationErrorHandler:
    """Error handling utilities for calculation operations."""
    
    @staticmethod
    def handle_validation_error(error: ValidationError, context: str = "") -> Dict[str, Any]:
        """Handle validation errors and return structured error response."""
        logger.warning(f"Validation error in {context}: {str(error)}")
        
        return {
            "success": False,
            "error": "validation_error",
            "message": str(error),
            "context": context,
            "timestamp": logger.handlers[0].formatter.formatTime(logger.makeRecord(
                logger.name, logging.WARNING, "", 0, "", (), None
            )) if logger.handlers else None
        }
    
    @staticmethod
    def handle_calculation_error(error: Exception, inputs: Dict[str, Any], context: str = "") -> Dict[str, Any]:
        """Handle calculation errors and return structured error response."""
        logger.error(f"Calculation error in {context}: {str(error)}", exc_info=True)
        
        return {
            "success": False,
            "error": "calculation_error",
            "message": f"Calculation failed: {str(error)}",
            "context": context,
            "inputs": inputs,
            "timestamp": logger.handlers[0].formatter.formatTime(logger.makeRecord(
                logger.name, logging.ERROR, "", 0, "", (), None
            )) if logger.handlers else None
        }
    
    @staticmethod
    def create_success_response(result: Any, warnings: List[str] = None) -> Dict[str, Any]:
        """Create structured success response."""
        response = {
            "success": True,
            "data": result,
            "timestamp": logger.handlers[0].formatter.formatTime(logger.makeRecord(
                logger.name, logging.INFO, "", 0, "", (), None
            )) if logger.handlers else None
        }
        
        if warnings:
            response["warnings"] = warnings
            
        return response


def safe_calculate_bonus(inputs_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Safely calculate bonus with comprehensive validation and error handling.
    
    Args:
        inputs_dict: Dictionary containing calculation inputs
        
    Returns:
        Structured response with success/error status and data/error details
    """
    try:
        # Validate inputs
        validation_result = InputValidator.validate_calculation_inputs(inputs_dict)
        
        if not validation_result.is_valid:
            return CalculationErrorHandler.handle_validation_error(
                ValidationError("; ".join(validation_result.errors)),
                "input_validation"
            )
        
        # Convert to CalculationInputs object
        calculation_inputs = CalculationInputs(
            base_salary=float(inputs_dict['base_salary']),
            target_bonus_pct=float(inputs_dict['target_bonus_pct']),
            investment_weight=float(inputs_dict['investment_weight']),
            investment_score_multiplier=float(inputs_dict['investment_score_multiplier']),
            qualitative_weight=float(inputs_dict['qualitative_weight']),
            qual_score_multiplier=float(inputs_dict['qual_score_multiplier']),
            raf=float(inputs_dict['raf']),
            is_mrt=inputs_dict.get('is_mrt', False),
            mrt_cap_pct=float(inputs_dict['mrt_cap_pct']) if inputs_dict.get('mrt_cap_pct') else None
        )
        
        # Perform calculation
        from .calculation_engine import CalculationEngine
        result = CalculationEngine.calculate_final_bonus(calculation_inputs)
        
        # Return success response with warnings if any
        return CalculationErrorHandler.create_success_response(
            result.__dict__,
            validation_result.warnings if validation_result.warnings else None
        )
        
    except ValidationError as e:
        return CalculationErrorHandler.handle_validation_error(e, "calculation")
    except Exception as e:
        return CalculationErrorHandler.handle_calculation_error(e, inputs_dict, "calculation")


# Utility functions for common validation scenarios
def validate_employee_data(employee_data: Dict[str, Any]) -> ValidationResult:
    """Validate employee data for batch processing."""
    required_fields = ['base_salary', 'target_bonus_pct']
    optional_fields = ['investment_weight', 'qualitative_weight', 'investment_score_multiplier', 
                      'qual_score_multiplier', 'raf', 'is_mrt', 'mrt_cap_pct']
    
    errors = []
    warnings = []
    
    # Check required fields
    for field in required_fields:
        if field not in employee_data or employee_data[field] is None:
            errors.append(f"Missing required field: {field}")
    
    # Validate present fields
    if len(errors) == 0:  # Only validate if required fields are present
        validation_result = InputValidator.validate_calculation_inputs(employee_data)
        errors.extend(validation_result.errors)
        warnings.extend(validation_result.warnings)
    
    return ValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings
    )
