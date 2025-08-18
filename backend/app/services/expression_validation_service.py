"""
Expression Validation Service for Plan Step Expressions
Integrates DSL parser with plan management for comprehensive validation.
"""
import logging
from typing import Dict, List, Any, Set, Optional
from sqlalchemy.orm import Session

from ..expression_engine import SafeDSLParser, ExpressionValidationError, ExpressionSecurityError
from ..dal.platform_dal import BonusPlanDAL, InputCatalogDAL
from ..models import PlanStep

logger = logging.getLogger(__name__)

class ExpressionValidationService:
    """Service for validating bonus plan expressions in context."""
    
    def __init__(self, db: Session, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id
        self.plan_dal = BonusPlanDAL(db, tenant_id)
        self.input_catalog_dal = InputCatalogDAL(db, tenant_id)
        self.parser = SafeDSLParser()
    
    def validate_step_expression(self, plan_id: str, expression: str, 
                                step_order: int = None,
                                exclude_step_id: str = None) -> Dict[str, Any]:
        """Validate an expression in the context of a bonus plan."""
        try:
            # Get available variables for this plan at this step order
            available_variables = self._get_available_variables(plan_id, step_order, exclude_step_id)
            
            # Validate the expression
            validation_result = self.parser.validate_expression(expression, available_variables)
            
            if not validation_result['valid']:
                return validation_result
            
            # Additional business logic validation
            business_validation = self._validate_business_rules(
                plan_id, expression, validation_result
            )
            
            if not business_validation['valid']:
                return business_validation
            
            # Get expression complexity and info
            expression_info = self.parser.get_expression_info(expression)
            
            return {
                'valid': True,
                'variables_used': validation_result['variables_used'],
                'functions_used': validation_result['functions_used'],
                'expression_info': expression_info,
                'available_variables': list(available_variables)
            }
            
        except Exception as e:
            logger.error(f"Expression validation failed: {e}")
            return {
                'valid': False,
                'error': f"Validation error: {e}",
                'error_type': 'ValidationError'
            }
    
    def validate_condition_expression(self, plan_id: str, condition: str,
                                    step_order: int = None,
                                    exclude_step_id: str = None) -> Dict[str, Any]:
        """Validate a condition expression (must return boolean)."""
        if not condition or not condition.strip():
            return {'valid': True}  # Empty condition is valid (no condition)
        
        # First validate as regular expression
        result = self.validate_step_expression(plan_id, condition, step_order, exclude_step_id)
        
        if not result['valid']:
            return result
        
        # Additional validation for conditions
        try:
            # Check if expression likely returns boolean
            if not self._is_likely_boolean_expression(condition):
                logger.warning(f"Condition expression may not return boolean: {condition}")
                # Don't fail validation, just warn
        except Exception as e:
            logger.warning(f"Could not validate condition return type: {e}")
        
        return result
    
    def get_plan_variable_context(self, plan_id: str, up_to_step: int = None) -> Dict[str, Any]:
        """Get all available variables for a plan up to a certain step."""
        try:
            available_vars = self._get_available_variables(plan_id, up_to_step)
            input_vars = self._get_input_variables(plan_id)
            output_vars = self._get_output_variables(plan_id, up_to_step)
            
            return {
                'total_variables': list(available_vars),
                'input_variables': input_vars,
                'output_variables': output_vars,
                'step_count': len(output_vars)
            }
            
        except Exception as e:
            logger.error(f"Failed to get variable context: {e}")
            return {
                'total_variables': [],
                'input_variables': {},
                'output_variables': {},
                'step_count': 0,
                'error': str(e)
            }
    
    def validate_plan_expressions(self, plan_id: str) -> Dict[str, Any]:
        """Validate all expressions in a bonus plan."""
        try:
            plan = self.plan_dal.get_by_id(plan_id)
            if not plan or plan.tenant_id != self.tenant_id:
                return {'valid': False, 'error': 'Plan not found'}
            
            # Get all steps ordered by step_order
            steps = self.db.query(PlanStep).filter(
                PlanStep.plan_id == plan_id
            ).order_by(PlanStep.step_order).all()
            
            validation_results = []
            overall_valid = True
            
            for step in steps:
                # Validate main expression
                expr_result = self.validate_step_expression(
                    plan_id, step.expr, step.step_order, step.id
                )
                
                step_result = {
                    'step_id': step.id,
                    'step_name': step.name,
                    'step_order': step.step_order,
                    'expression_valid': expr_result['valid'],
                    'expression_error': expr_result.get('error'),
                    'variables_used': expr_result.get('variables_used', []),
                    'functions_used': expr_result.get('functions_used', [])
                }
                
                if not expr_result['valid']:
                    overall_valid = False
                
                # Validate condition expression if present
                if step.condition_expr:
                    cond_result = self.validate_condition_expression(
                        plan_id, step.condition_expr, step.step_order, step.id
                    )
                    step_result.update({
                        'condition_valid': cond_result['valid'],
                        'condition_error': cond_result.get('error'),
                        'condition_variables': cond_result.get('variables_used', [])
                    })
                    
                    if not cond_result['valid']:
                        overall_valid = False
                else:
                    step_result.update({
                        'condition_valid': True,
                        'condition_error': None,
                        'condition_variables': []
                    })
                
                validation_results.append(step_result)
            
            return {
                'valid': overall_valid,
                'steps_validated': len(steps),
                'step_results': validation_results,
                'plan_context': self.get_plan_variable_context(plan_id)
            }
            
        except Exception as e:
            logger.error(f"Plan expression validation failed: {e}")
            return {
                'valid': False,
                'error': f"Validation failed: {e}",
                'steps_validated': 0,
                'step_results': []
            }
    
    def _get_available_variables(self, plan_id: str, step_order: int = None, 
                               exclude_step_id: str = None) -> Set[str]:
        """Get all variables available at a given step in a plan."""
        variables = set()
        
        # Add input variables
        input_vars = self._get_input_variables(plan_id)
        variables.update(input_vars.keys())
        
        # Add output variables from previous steps
        if step_order is not None:
            output_vars = self._get_output_variables(plan_id, step_order - 1, exclude_step_id)
            variables.update(output_vars.keys())
        else:
            # If no step order specified, include all output variables
            output_vars = self._get_output_variables(plan_id, None, exclude_step_id)
            variables.update(output_vars.keys())
        
        return variables
    
    def _get_input_variables(self, plan_id: str) -> Dict[str, Dict[str, Any]]:
        """Get input variables defined for a plan."""
        input_vars = {}
        
        try:
            # Get plan inputs with catalog details
            from ..services.plan_management_service import get_plan_management_service
            plan_service = get_plan_management_service(self.db, self.tenant_id)
            plan_inputs = plan_service.get_plan_inputs(plan_id)
            
            for plan_input in plan_inputs:
                input_def = plan_input.get('input_definition', {})
                key = input_def.get('key')
                if key:
                    input_vars[key] = {
                        'type': input_def.get('dtype', 'unknown'),
                        'required': input_def.get('required', False),
                        'source': 'input_catalog'
                    }
        except Exception as e:
            logger.error(f"Failed to get input variables: {e}")
        
        return input_vars
    
    def _get_output_variables(self, plan_id: str, max_step_order: int = None,
                            exclude_step_id: str = None) -> Dict[str, Dict[str, Any]]:
        """Get output variables from plan steps up to a certain order."""
        output_vars = {}
        
        try:
            query = self.db.query(PlanStep).filter(PlanStep.plan_id == plan_id)
            
            if max_step_order is not None:
                query = query.filter(PlanStep.step_order <= max_step_order)
            
            if exclude_step_id:
                query = query.filter(PlanStep.id != exclude_step_id)
            
            steps = query.order_by(PlanStep.step_order).all()
            
            for step in steps:
                for output in step.outputs or []:
                    output_vars[output] = {
                        'type': 'calculated',
                        'source': 'step_output',
                        'step_name': step.name,
                        'step_order': step.step_order
                    }
        except Exception as e:
            logger.error(f"Failed to get output variables: {e}")
        
        return output_vars
    
    def _validate_business_rules(self, plan_id: str, expression: str, 
                               validation_result: Dict[str, Any]) -> Dict[str, Any]:
        """Apply business-specific validation rules."""
        try:
            # Rule: Don't allow recursive variable definitions
            # (This is handled by step ordering, but double-check)
            
            # Rule: Ensure numeric operations make sense
            variables_used = validation_result.get('variables_used', [])
            functions_used = validation_result.get('functions_used', [])
            
            # Rule: Warn about potentially expensive operations
            if 'pow' in functions_used and '**' in expression:
                logger.warning(f"Expression uses potentially expensive power operation: {expression}")
            
            # Rule: Validate that financial calculations use appropriate precision
            if any(var in variables_used for var in ['base_salary', 'bonus', 'total_compensation']):
                if 'Decimal' not in functions_used and 'float' in functions_used:
                    logger.warning("Financial calculation should use Decimal for precision")
            
            return {'valid': True}
            
        except Exception as e:
            logger.error(f"Business rule validation failed: {e}")
            return {
                'valid': False,
                'error': f"Business rule validation failed: {e}",
                'error_type': 'BusinessRuleError'
            }
    
    def _is_likely_boolean_expression(self, expression: str) -> bool:
        """Check if an expression is likely to return a boolean value."""
        # Simple heuristics - not perfect but helpful
        boolean_indicators = [
            ' > ', ' < ', ' >= ', ' <= ', ' == ', ' != ',
            ' and ', ' or ', ' not ', ' in ', ' is ',
            'True', 'False'
        ]
        
        return any(indicator in expression for indicator in boolean_indicators)


def get_expression_validation_service(db: Session, tenant_id: str) -> ExpressionValidationService:
    """Factory function to create ExpressionValidationService."""
    return ExpressionValidationService(db, tenant_id)