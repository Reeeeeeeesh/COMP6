"""
Vectorized Plan Executor for high-performance batch bonus calculations.
Uses Polars DataFrames with hybrid precision strategy to maintain accuracy while achieving speed.
"""
import logging
from typing import Dict, List, Any, Optional, Union
from decimal import Decimal, ROUND_HALF_UP
import polars as pl
import time
from sqlalchemy.orm import Session

from ..expression_engine.dsl_parser import SafeDSLParser
from .plan_dependency_validator import PlanDependencyValidator
from ..models import RunStepResult

logger = logging.getLogger(__name__)


class VectorizedPlanExecutor:
    """
    High-performance vectorized plan executor using Polars DataFrames.
    
    Supports multiple precision modes:
    - 'fast': Float64 operations only (fastest, slight precision loss)
    - 'balanced': Float64 operations with Decimal final conversion (recommended)
    - 'exact': Row-by-row Decimal processing (slowest, perfect precision)
    """
    
    def __init__(self, precision_mode: str = 'balanced'):
        """
        Initialize vectorized executor.
        
        Args:
            precision_mode: 'fast', 'balanced', or 'exact'
        """
        if precision_mode not in ['fast', 'balanced', 'exact']:
            raise ValueError("precision_mode must be 'fast', 'balanced', or 'exact'")
            
        self.precision_mode = precision_mode
        self.parser = SafeDSLParser()
        self.dependency_validator = PlanDependencyValidator(self.parser)
        
        logger.info(f"VectorizedPlanExecutor initialized with precision_mode='{precision_mode}'")
    
    def execute_plan_vectorized(self, 
                               plan_id: str, 
                               steps: List[Dict[str, Any]], 
                               inputs: List[Dict[str, Any]],
                               employee_data: pl.DataFrame,
                               db_session: Optional[Session] = None,
                               run_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Execute a bonus plan on a DataFrame of employees with vectorized operations.
        
        Args:
            plan_id: ID of the plan being executed
            steps: List of plan steps (from plan management service)
            inputs: List of plan inputs (from plan management service)
            employee_data: Polars DataFrame with employee data columns
            db_session: Optional database session for step result persistence
            run_id: Optional plan run ID for linking step results (requires db_session)
            
        Returns:
            Dictionary containing execution results and performance metrics
        """
        start_time = time.time()
        
        try:
            # 1. Validate plan dependencies
            validation_result = self.dependency_validator.validate_dependencies(steps, inputs)
            if not validation_result.get('valid', False):
                raise ValueError(f"Plan validation failed: {validation_result.get('error', 'Invalid dependencies')}")
            
            # 2. Verify required input columns exist in DataFrame
            self._validate_input_columns(inputs, employee_data)
            
            # 3. Sort steps by optimal order (use suggested ordering if available)
            optimal_order = validation_result.get('suggested_ordering', [])
            if optimal_order:
                ordered_steps = self._reorder_steps_by_names(steps, optimal_order)
            else:
                ordered_steps = sorted(steps, key=lambda s: s.get('order', s.get('step_order', 0)))
            
            # 4. Choose execution strategy based on precision mode
            if self.precision_mode == 'exact':
                results_df = self._execute_exact_precision(ordered_steps, employee_data, db_session, run_id)
            else:
                results_df = self._execute_vectorized_fast(ordered_steps, employee_data, db_session, run_id)
            
            # 5. Apply precision correction for 'balanced' mode
            if self.precision_mode == 'balanced':
                results_df = self._apply_precision_correction(results_df, ordered_steps)
            
            execution_time = time.time() - start_time
            
            return {
                'success': True,
                'plan_id': plan_id,
                'precision_mode': self.precision_mode,
                'execution_time_seconds': execution_time,
                'rows_processed': results_df.height,
                'columns_added': len([step['name'] for step in ordered_steps]),
                'results_dataframe': results_df,
                'step_execution_order': [step['name'] for step in ordered_steps],
                'performance_metrics': {
                    'rows_per_second': results_df.height / execution_time if execution_time > 0 else 0,
                    'total_calculations': results_df.height * len(ordered_steps)
                }
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Vectorized plan execution failed for plan {plan_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'plan_id': plan_id,
                'execution_time_seconds': execution_time
            }
    
    def _validate_input_columns(self, inputs: List[Dict[str, Any]], df: pl.DataFrame) -> None:
        """Validate that all required input columns exist in the DataFrame."""
        required_columns = {inp['name'] for inp in inputs if inp.get('required', True)}
        available_columns = set(df.columns)
        missing_columns = required_columns - available_columns
        
        if missing_columns:
            raise ValueError(f"Missing required columns in employee data: {missing_columns}")
    
    def _reorder_steps_by_names(self, steps: List[Dict[str, Any]], name_order: List[str]) -> List[Dict[str, Any]]:
        """Reorder steps according to dependency-optimized name ordering."""
        step_by_name = {step['name']: step for step in steps}
        ordered_steps = []
        
        for name in name_order:
            if name in step_by_name:
                ordered_steps.append(step_by_name[name])
        
        # Add any remaining steps not in the ordering
        remaining_steps = [step for step in steps if step['name'] not in name_order]
        ordered_steps.extend(sorted(remaining_steps, key=lambda s: s.get('order', s.get('step_order', 0))))
        
        return ordered_steps
    
    def _execute_vectorized_fast(self, ordered_steps: List[Dict[str, Any]], df: pl.DataFrame, 
                                db_session: Optional[Session] = None, run_id: Optional[str] = None) -> pl.DataFrame:
        """Execute steps using fast Float64 vectorized operations with fallback for complex expressions."""
        result_df = df.clone()
        
        for step in ordered_steps:
            step_name = step['name']
            step_expr = step.get('expr', '')
            step_outputs = step.get('outputs', [])
            
            if not step_expr.strip():
                continue
            
            try:
                logger.debug(f"Executing vectorized step '{step_name}': {step_expr}")
                
                # Try to translate expression to Polars operations
                try:
                    polars_expr = self._translate_expression_to_polars(step_expr)
                    
                    # Add the calculated column(s)
                    if step_outputs:
                        # Use first output name as the column name
                        column_name = step_outputs[0]
                        result_df = result_df.with_columns([polars_expr.alias(column_name)])
                        
                        # If multiple outputs, duplicate the result to additional columns
                        for additional_output in step_outputs[1:]:
                            result_df = result_df.with_columns([pl.col(column_name).alias(additional_output)])
                    else:
                        # Use step name as column name if no outputs specified
                        result_df = result_df.with_columns([polars_expr.alias(step_name)])
                    
                    logger.debug(f"Step '{step_name}' executed successfully via vectorization")
                    
                    # Persist step results if session and run_id provided
                    if db_session and run_id:
                        self._persist_step_results(db_session, run_id, step_name, result_df)
                    
                except ValueError as ve:
                    # Fallback to row-by-row evaluation for complex expressions
                    if "too complex for vectorization" in str(ve):
                        logger.debug(f"Step '{step_name}' too complex for vectorization, using row-by-row fallback")
                        result_df = self._execute_step_row_by_row(result_df, step_name, step_expr, step_outputs, db_session, run_id)
                        logger.debug(f"Step '{step_name}' executed successfully via row-by-row fallback")
                        
                        # Persist step results if session and run_id provided
                        if db_session and run_id:
                            self._persist_step_results(db_session, run_id, step_name, result_df)
                    else:
                        raise ve
                
            except Exception as e:
                raise ValueError(f"Failed to execute step '{step_name}' with expression '{step_expr}': {e}")
        
        return result_df
    
    def _execute_step_row_by_row(self, df: pl.DataFrame, step_name: str, expression: str, outputs: List[str],
                                db_session: Optional[Session] = None, run_id: Optional[str] = None) -> pl.DataFrame:
        """Execute a single step using row-by-row evaluation as fallback for complex expressions."""
        # Convert DataFrame to list of dictionaries
        rows = df.to_dicts()
        
        # Process each row individually
        for row in rows:
            try:
                # Convert numeric values to appropriate types for evaluation
                evaluation_context = {}
                for key, value in row.items():
                    if isinstance(value, (int, float)) and not isinstance(value, bool):
                        evaluation_context[key] = value  # Keep as float for fast mode
                    else:
                        evaluation_context[key] = value
                
                # Evaluate expression
                result = self.parser.evaluate(expression, evaluation_context)
                
                # Convert Decimal result back to float for consistency with vectorized operations
                if hasattr(result, 'is_finite'):  # Check if it's a Decimal
                    result = float(result)
                
                # Add result to row for all output variables
                if outputs:
                    for output_name in outputs:
                        row[output_name] = result
                else:
                    row[step_name] = result
                        
            except Exception as e:
                raise ValueError(f"Row-by-row evaluation failed for step '{step_name}': {e}")
        
        # Persist step results if session and run_id provided
        if db_session and run_id:
            temp_df = pl.DataFrame(rows)
            self._persist_step_results(db_session, run_id, step_name, temp_df)
        
        # Convert back to Polars DataFrame
        return pl.DataFrame(rows)
    
    def _execute_exact_precision(self, ordered_steps: List[Dict[str, Any]], df: pl.DataFrame,
                                db_session: Optional[Session] = None, run_id: Optional[str] = None) -> pl.DataFrame:
        """Execute steps using exact Decimal precision (row-by-row processing)."""
        # Convert DataFrame to list of dictionaries for row-by-row processing
        rows = df.to_dicts()
        
        for step in ordered_steps:
            step_name = step['name']
            step_expr = step.get('expr', '')
            step_outputs = step.get('outputs', [])
            
            if not step_expr.strip():
                continue
            
            logger.debug(f"Executing exact precision step '{step_name}': {step_expr}")
            
            # Process each row individually with Decimal precision
            for row in rows:
                try:
                    # Convert row values to Decimal where appropriate
                    decimal_context = {}
                    for key, value in row.items():
                        if isinstance(value, (int, float)) and not isinstance(value, bool):
                            decimal_context[key] = Decimal(str(value))
                        else:
                            decimal_context[key] = value
                    
                    # Evaluate expression with Decimal precision
                    result = self.parser.evaluate(step_expr, decimal_context)
                    
                    # Add result to row for all output variables
                    if step_outputs:
                        for output_name in step_outputs:
                            row[output_name] = result
                    else:
                        row[step_name] = result
                        
                except Exception as e:
                    raise ValueError(f"Failed to execute step '{step_name}' for row {row.get('id', '?')}: {e}")
            
            # Persist step results if session and run_id provided
            if db_session and run_id:
                temp_df = pl.DataFrame(rows)
                self._persist_step_results(db_session, run_id, step_name, temp_df)
        
        # Convert back to Polars DataFrame
        return pl.DataFrame(rows)
    
    def _apply_precision_correction(self, df: pl.DataFrame, steps: List[Dict[str, Any]]) -> pl.DataFrame:
        """Apply Decimal precision correction to calculated columns."""
        result_df = df.clone()
        
        # Get all columns that were calculated (not original input columns)
        calculated_columns = []
        for step in steps:
            step_outputs = step.get('outputs', [])
            if step_outputs:
                calculated_columns.extend(step_outputs)
            else:
                calculated_columns.append(step['name'])
        
        # Apply Decimal precision to calculated columns
        precision_corrections = []
        for col_name in calculated_columns:
            if col_name in result_df.columns:
                # Convert to Decimal precision using string intermediate to avoid precision loss
                precision_corrections.append(
                    pl.col(col_name).cast(pl.Utf8).map_elements(
                        lambda x: float(Decimal(x).quantize(Decimal('0.00000001'), rounding=ROUND_HALF_UP))
                        if x is not None else None
                    ).alias(col_name)
                )
        
        if precision_corrections:
            result_df = result_df.with_columns(precision_corrections)
        
        return result_df
    
    def _translate_expression_to_polars(self, expression: str) -> pl.Expr:
        """
        Translate a DSL expression to a Polars expression.
        
        This is a simplified translator that handles common patterns.
        For complex expressions, falls back to row-by-row evaluation.
        """
        # Handle simple arithmetic expressions
        expression = expression.strip()
        
        # Simple binary operations
        if ' * ' in expression and expression.count(' * ') == 1:
            left, right = expression.split(' * ', 1)
            left, right = left.strip(), right.strip()
            
            # Check if both sides are simple column references or literals
            if self._is_simple_operand(left) and self._is_simple_operand(right):
                return self._operand_to_polars(left) * self._operand_to_polars(right)
        
        if ' + ' in expression and expression.count(' + ') == 1:
            left, right = expression.split(' + ', 1)
            left, right = left.strip(), right.strip()
            
            if self._is_simple_operand(left) and self._is_simple_operand(right):
                return self._operand_to_polars(left) + self._operand_to_polars(right)
        
        # Handle max function calls
        if expression.startswith('max(') and expression.endswith(')'):
            inner = expression[4:-1]  # Remove 'max(' and ')'
            if ', ' in inner:
                operands = [op.strip() for op in inner.split(', ')]
                if len(operands) == 2 and all(self._is_simple_operand(op) for op in operands):
                    return pl.max_horizontal([self._operand_to_polars(operands[0]), 
                                            self._operand_to_polars(operands[1])])
        
        # Handle min function calls
        if expression.startswith('min(') and expression.endswith(')'):
            inner = expression[4:-1]  # Remove 'min(' and ')'
            if ', ' in inner:
                operands = [op.strip() for op in inner.split(', ')]
                if len(operands) == 2 and all(self._is_simple_operand(op) for op in operands):
                    return pl.min_horizontal([self._operand_to_polars(operands[0]), 
                                            self._operand_to_polars(operands[1])])
        
        # Handle simple conditional expressions (x if condition else y)
        if ' if ' in expression and ' else ' in expression:
            parts = expression.split(' if ')
            if len(parts) == 2:
                then_part = parts[0].strip()
                condition_else_part = parts[1].split(' else ')
                if len(condition_else_part) == 2:
                    condition = condition_else_part[0].strip()
                    else_part = condition_else_part[1].strip()
                    
                    # Handle simple boolean conditions
                    if self._is_simple_condition(condition):
                        return pl.when(self._condition_to_polars(condition)) \
                                .then(self._operand_to_polars(then_part)) \
                                .otherwise(self._operand_to_polars(else_part))
        
        # For complex expressions, fall back to row-by-row evaluation
        raise ValueError(f"Expression too complex for vectorization: {expression}")
    
    def _is_simple_operand(self, operand: str) -> bool:
        """Check if an operand is simple enough for direct translation."""
        operand = operand.strip()
        
        # Numeric literals
        try:
            float(operand)
            return True
        except ValueError:
            pass
        
        # Simple column references (letters, numbers, underscores)
        if operand.replace('_', '').replace('-', '').replace('.', '').isalnum():
            return True
        
        # Simple arithmetic expressions (operand op number)
        for op in [' / ', ' * ', ' + ', ' - ']:
            if op in operand and operand.count(op) == 1:
                left, right = operand.split(op)
                left, right = left.strip(), right.strip()
                try:
                    float(right)  # Right side must be numeric
                    return self._is_simple_operand(left)
                except ValueError:
                    pass
        
        return False
    
    def _is_simple_condition(self, condition: str) -> bool:
        """Check if a condition is simple enough for direct translation."""
        condition = condition.strip()
        
        # Simple boolean column references
        if condition.replace('_', '').replace('-', '').isalnum():
            return True
        
        # Simple negation (not column_name)
        if condition.startswith('not ') and len(condition.split()) == 2:
            return self._is_simple_operand(condition[4:].strip())
        
        return False
    
    def _operand_to_polars(self, operand: str) -> pl.Expr:
        """Convert a simple operand to a Polars expression."""
        operand = operand.strip()
        
        # Numeric literals
        try:
            value = float(operand)
            return pl.lit(value)
        except ValueError:
            pass
        
        # Handle arithmetic expressions
        for op_str, op_func in [(' / ', lambda l, r: l / r), 
                               (' * ', lambda l, r: l * r),
                               (' + ', lambda l, r: l + r), 
                               (' - ', lambda l, r: l - r)]:
            if op_str in operand and operand.count(op_str) == 1:
                left, right = operand.split(op_str)
                left, right = left.strip(), right.strip()
                try:
                    right_value = float(right)
                    return op_func(self._operand_to_polars(left), right_value)
                except ValueError:
                    pass
        
        # Column references
        return pl.col(operand)
    
    def _condition_to_polars(self, condition: str) -> pl.Expr:
        """Convert a simple condition to a Polars expression."""
        condition = condition.strip()
        
        # Simple negation
        if condition.startswith('not ') and len(condition.split()) == 2:
            inner_condition = condition[4:].strip()
            return ~pl.col(inner_condition)
        
        # Simple boolean column
        return pl.col(condition)
    
    def _persist_step_results(self, db_session: Session, run_id: str, step_name: str, 
                             result_df: pl.DataFrame, employee_ref_column: str = 'employee_id') -> None:
        """
        Persist step results to the RunStepResult table for calculation transparency.
        
        Args:
            db_session: Database session for persistence
            run_id: Plan run ID to link step results
            step_name: Name of the executed step
            result_df: DataFrame containing calculated results
            employee_ref_column: Column name containing employee reference
        """
        try:
            if step_name not in result_df.columns:
                logger.warning(f"Step '{step_name}' not found in result DataFrame columns")
                return
                
            if employee_ref_column not in result_df.columns:
                logger.warning(f"Employee reference column '{employee_ref_column}' not found in DataFrame")
                return
            
            # Extract step results for each employee
            step_data = result_df.select([employee_ref_column, step_name]).to_dicts()
            
            step_results = []
            for row in step_data:
                employee_ref = str(row[employee_ref_column])
                step_value = row[step_name]
                
                # Convert value to JSON-serializable format
                if isinstance(step_value, (Decimal, float)):
                    json_value = {"value": str(step_value), "type": "numeric"}
                else:
                    json_value = {"value": step_value, "type": type(step_value).__name__}
                
                step_result = RunStepResult(
                    run_id=run_id,
                    employee_ref=employee_ref,
                    step_name=step_name,
                    value=json_value
                )
                step_results.append(step_result)
            
            # Bulk insert step results
            if step_results:
                db_session.add_all(step_results)
                db_session.flush()  # Flush without committing to maintain transaction control
                logger.debug(f"Persisted {len(step_results)} step results for step '{step_name}'")
                
        except Exception as e:
            logger.error(f"Failed to persist step results for step '{step_name}': {e}")
            # Don't raise - step result persistence failure shouldn't break calculations