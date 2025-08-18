"""
Plan Management Service for bonus plan and step operations.
Provides business logic for plan CRUD, step management, and validation.
"""
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..dal.platform_dal import BonusPlanDAL, InputCatalogDAL, AuditEventDAL
from ..models import BonusPlan, PlanStep, PlanInput, InputCatalog
from ..schemas import (
    BonusPlanResponse, BonusPlanUpdate,
    PlanStepCreate, PlanStepResponse, PlanStepUpdate,
    PlanInputCreate, PlanInputResponse
)
from ..expression_engine.dsl_parser import SafeDSLParser, ExpressionSecurityError, ExpressionValidationError
from .plan_dependency_validator import PlanDependencyValidator
from .vectorized_plan_executor import VectorizedPlanExecutor

logger = logging.getLogger(__name__)

class PlanManagementService:
    """Service for managing bonus plans, steps, and inputs."""
    
    def __init__(self, db: Session, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id
        self.plan_dal = BonusPlanDAL(db, tenant_id)
        self.input_catalog_dal = InputCatalogDAL(db, tenant_id)
        self.audit_dal = AuditEventDAL(db, tenant_id)
    
    # ================================
    # Bonus Plan Operations
    # ================================
    
    def get_plans(self, status_filter: Optional[str] = None,
                  include_steps: bool = False, 
                  include_inputs: bool = False) -> List[Dict[str, Any]]:
        """Get bonus plans with optional filtering and related data."""
        plans = self.plan_dal.get_by_tenant(status=status_filter)
        
        result = []
        for plan in plans:
            plan_data = BonusPlanResponse.model_validate(plan).model_dump()
            
            # Include steps if requested
            if include_steps:
                steps = self._get_plan_steps_data(plan.id)
                plan_data['steps'] = steps
            
            # Include inputs if requested  
            if include_inputs:
                inputs = self._get_plan_inputs_data(plan.id)
                plan_data['inputs'] = inputs
            
            result.append(plan_data)
        
        return result
    
    def get_plan(self, plan_id: str, include_steps: bool = False,
                 include_inputs: bool = False) -> Optional[Dict[str, Any]]:
        """Get a specific bonus plan with optional related data."""
        plan = self.plan_dal.get_by_id(plan_id)
        if not plan or plan.tenant_id != self.tenant_id:
            return None
        
        plan_data = BonusPlanResponse.model_validate(plan).model_dump()
        
        # Include steps if requested
        if include_steps:
            steps = self._get_plan_steps_data(plan_id)
            plan_data['steps'] = steps
        
        # Include inputs if requested
        if include_inputs:
            inputs = self._get_plan_inputs_data(plan_id)
            plan_data['inputs'] = inputs
        
        return plan_data
    
    def update_plan(self, plan_id: str, plan_data: BonusPlanUpdate, 
                   updated_by: Optional[str] = None) -> Optional[BonusPlanResponse]:
        """Update a bonus plan (only if not locked)."""
        try:
            plan = self.plan_dal.get_by_id(plan_id)
            if not plan or plan.tenant_id != self.tenant_id:
                return None
            
            # Check if plan is locked
            if plan.status == "locked":
                raise ValueError("Cannot update locked plan")
            
            # Store old values for audit
            old_values = {
                'name': plan.name,
                'status': plan.status,
                'effective_from': plan.effective_from.isoformat() if plan.effective_from else None,
                'effective_to': plan.effective_to.isoformat() if plan.effective_to else None,
                'notes': plan.notes,
                'plan_metadata': plan.plan_metadata
            }
            
            # Apply updates
            update_fields = {}
            if plan_data.name is not None:
                update_fields['name'] = plan_data.name
            if plan_data.status is not None:
                # Validate status transition
                if not self._is_valid_status_transition(plan.status, plan_data.status):
                    raise ValueError(f"Invalid status transition from {plan.status} to {plan_data.status}")
                update_fields['status'] = plan_data.status
            if plan_data.effective_from is not None:
                update_fields['effective_from'] = plan_data.effective_from
            if plan_data.effective_to is not None:
                update_fields['effective_to'] = plan_data.effective_to
            if plan_data.notes is not None:
                update_fields['notes'] = plan_data.notes
            if plan_data.plan_metadata is not None:
                update_fields['plan_metadata'] = plan_data.plan_metadata
            
            # Apply updates to model
            for field, value in update_fields.items():
                setattr(plan, field, value)
            
            self.db.commit()
            
            # Log update
            new_values = {
                'name': plan.name,
                'status': plan.status,
                'effective_from': plan.effective_from.isoformat() if plan.effective_from else None,
                'effective_to': plan.effective_to.isoformat() if plan.effective_to else None,
                'notes': plan.notes,
                'plan_metadata': plan.plan_metadata
            }
            
            self.audit_dal.log_event(
                action='plan.update',
                entity='bonus_plan',
                entity_id=plan_id,
                actor_user_id=updated_by,
                before=old_values,
                after=new_values
            )
            
            return BonusPlanResponse.model_validate(plan)
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    # ================================
    # Plan Step Operations
    # ================================
    
    def create_plan_step(self, plan_id: str, step_data: PlanStepCreate, 
                        created_by: Optional[str] = None) -> PlanStepResponse:
        """Create a new calculation step for a bonus plan."""
        try:
            # Verify plan exists and is not locked
            plan = self.plan_dal.get_by_id(plan_id)
            if not plan or plan.tenant_id != self.tenant_id:
                raise ValueError("Plan not found")
            
            if plan.status == "locked":
                raise ValueError("Cannot add steps to locked plan")
            
            # Create plan step
            step = PlanStep(
                plan_id=plan_id,
                step_order=step_data.step_order,
                name=step_data.name,
                expr=step_data.expr,
                condition_expr=step_data.condition_expr,
                outputs=step_data.outputs,
                notes=step_data.notes
            )
            
            self.db.add(step)
            self.db.commit()
            self.db.refresh(step)
            
            # Log creation
            self.audit_dal.log_event(
                action='step.create',
                entity='plan_step',
                entity_id=step.id,
                actor_user_id=created_by,
                after={
                    'plan_id': plan_id,
                    'step_order': step.step_order,
                    'name': step.name,
                    'expr': step.expr[:100] + '...' if len(step.expr) > 100 else step.expr
                }
            )
            
            return PlanStepResponse.model_validate(step)
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_plan_steps(self, plan_id: str) -> List[PlanStepResponse]:
        """Get all calculation steps for a plan, ordered by step_order."""
        # Verify plan access
        plan = self.plan_dal.get_by_id(plan_id)
        if not plan or plan.tenant_id != self.tenant_id:
            return []
        
        steps = self.db.query(PlanStep).filter(
            PlanStep.plan_id == plan_id
        ).order_by(PlanStep.step_order).all()
        
        return [PlanStepResponse.model_validate(step) for step in steps]
    
    def get_plan_step(self, step_id: str) -> Optional[PlanStepResponse]:
        """Get a specific plan step."""
        step = self.db.query(PlanStep).filter(PlanStep.id == step_id).first()
        if not step:
            return None
        
        # Verify tenant access via plan
        plan = self.plan_dal.get_by_id(step.plan_id)
        if not plan or plan.tenant_id != self.tenant_id:
            return None
        
        return PlanStepResponse.model_validate(step)
    
    def update_plan_step(self, step_id: str, step_data: PlanStepUpdate,
                        updated_by: Optional[str] = None) -> Optional[PlanStepResponse]:
        """Update a plan step (only if plan is not locked)."""
        try:
            step = self.db.query(PlanStep).filter(PlanStep.id == step_id).first()
            if not step:
                return None
            
            # Verify plan access and lock status
            plan = self.plan_dal.get_by_id(step.plan_id)
            if not plan or plan.tenant_id != self.tenant_id:
                return None
            
            if plan.status == "locked":
                raise ValueError("Cannot update steps in locked plan")
            
            # Store old values for audit
            old_values = {
                'step_order': step.step_order,
                'name': step.name,
                'expr': step.expr[:100] + '...' if len(step.expr) > 100 else step.expr,
                'condition_expr': step.condition_expr,
                'outputs': step.outputs,
                'notes': step.notes
            }
            
            # Apply updates
            update_fields = {}
            if step_data.step_order is not None:
                update_fields['step_order'] = step_data.step_order
            if step_data.name is not None:
                update_fields['name'] = step_data.name
            if step_data.expr is not None:
                update_fields['expr'] = step_data.expr
            if step_data.condition_expr is not None:
                update_fields['condition_expr'] = step_data.condition_expr
            if step_data.outputs is not None:
                update_fields['outputs'] = step_data.outputs
            if step_data.notes is not None:
                update_fields['notes'] = step_data.notes
            
            # Apply updates to model
            for field, value in update_fields.items():
                setattr(step, field, value)
            
            self.db.commit()
            
            # Log update
            new_values = {
                'step_order': step.step_order,
                'name': step.name,
                'expr': step.expr[:100] + '...' if len(step.expr) > 100 else step.expr,
                'condition_expr': step.condition_expr,
                'outputs': step.outputs,
                'notes': step.notes
            }
            
            self.audit_dal.log_event(
                action='step.update',
                entity='plan_step',
                entity_id=step_id,
                actor_user_id=updated_by,
                before=old_values,
                after=new_values
            )
            
            return PlanStepResponse.model_validate(step)
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def delete_plan_step(self, step_id: str, deleted_by: Optional[str] = None) -> bool:
        """Delete a plan step (only if plan is not locked)."""
        try:
            step = self.db.query(PlanStep).filter(PlanStep.id == step_id).first()
            if not step:
                return False
            
            # Verify plan access and lock status
            plan = self.plan_dal.get_by_id(step.plan_id)
            if not plan or plan.tenant_id != self.tenant_id:
                return False
            
            if plan.status == "locked":
                raise ValueError("Cannot delete steps from locked plan")
            
            # Store values for audit
            old_values = {
                'plan_id': step.plan_id,
                'step_order': step.step_order,
                'name': step.name
            }
            
            # Delete the step
            self.db.delete(step)
            self.db.commit()
            
            # Log deletion
            self.audit_dal.log_event(
                action='step.delete',
                entity='plan_step',
                entity_id=step_id,
                actor_user_id=deleted_by,
                before=old_values
            )
            
            return True
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    # ================================
    # Plan Input Operations
    # ================================
    
    def add_plan_input(self, plan_id: str, input_data: PlanInputCreate,
                      added_by: Optional[str] = None) -> PlanInputResponse:
        """Add an input parameter to a bonus plan."""
        try:
            # Verify plan exists and is not locked
            plan = self.plan_dal.get_by_id(plan_id)
            if not plan or plan.tenant_id != self.tenant_id:
                raise ValueError("Plan not found")
            
            if plan.status == "locked":
                raise ValueError("Cannot add inputs to locked plan")
            
            # Verify input exists in catalog
            input_def = self.input_catalog_dal.get_by_id(input_data.input_id)
            if not input_def or input_def.tenant_id != self.tenant_id:
                raise ValueError("Input definition not found")
            
            # Check if input is already associated with plan
            existing = self.db.query(PlanInput).filter(
                and_(PlanInput.plan_id == plan_id, PlanInput.input_id == input_data.input_id)
            ).first()
            
            if existing:
                raise ValueError("Input already associated with plan")
            
            # Create plan input
            plan_input = PlanInput(
                plan_id=plan_id,
                input_id=input_data.input_id,
                required=input_data.required,
                source_mapping=input_data.source_mapping
            )
            
            self.db.add(plan_input)
            self.db.commit()
            self.db.refresh(plan_input)
            
            # Log creation
            self.audit_dal.log_event(
                action='plan_input.create',
                entity='plan_input',
                entity_id=plan_input.id,
                actor_user_id=added_by,
                after={
                    'plan_id': plan_id,
                    'input_key': input_def.key,
                    'required': plan_input.required
                }
            )
            
            return PlanInputResponse.model_validate(plan_input)
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_plan_inputs(self, plan_id: str) -> List[Dict[str, Any]]:
        """Get all input parameters for a plan with input catalog details."""
        # Verify plan access
        plan = self.plan_dal.get_by_id(plan_id)
        if not plan or plan.tenant_id != self.tenant_id:
            return []
        
        # Join plan_inputs with input_catalog to get full details
        plan_inputs = self.db.query(PlanInput, InputCatalog).join(
            InputCatalog, PlanInput.input_id == InputCatalog.id
        ).filter(PlanInput.plan_id == plan_id).all()
        
        result = []
        for plan_input, input_catalog in plan_inputs:
            input_data = PlanInputResponse.model_validate(plan_input).model_dump()
            input_data['input_definition'] = {
                'key': input_catalog.key,
                'label': input_catalog.label,
                'dtype': input_catalog.dtype,
                'required': input_catalog.required,
                'default_value': input_catalog.default_value,
                'validation': input_catalog.validation
            }
            result.append(input_data)
        
        return result
    
    def remove_plan_input(self, input_id: str, removed_by: Optional[str] = None) -> bool:
        """Remove an input parameter from a bonus plan."""
        try:
            plan_input = self.db.query(PlanInput).filter(PlanInput.id == input_id).first()
            if not plan_input:
                return False
            
            # Verify plan access and lock status
            plan = self.plan_dal.get_by_id(plan_input.plan_id)
            if not plan or plan.tenant_id != self.tenant_id:
                return False
            
            if plan.status == "locked":
                raise ValueError("Cannot remove inputs from locked plan")
            
            # Get input definition for audit
            input_def = self.input_catalog_dal.get_by_id(plan_input.input_id)
            
            # Store values for audit
            old_values = {
                'plan_id': plan_input.plan_id,
                'input_key': input_def.key if input_def else 'unknown',
                'required': plan_input.required
            }
            
            # Delete the plan input
            self.db.delete(plan_input)
            self.db.commit()
            
            # Log removal
            self.audit_dal.log_event(
                action='plan_input.remove',
                entity='plan_input',
                entity_id=input_id,
                actor_user_id=removed_by,
                before=old_values
            )
            
            return True
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    # ================================
    # Plan Validation and Utilities
    # ================================
    
    def validate_plan(self, plan_id: str) -> Dict[str, Any]:
        """Validate a bonus plan's structure and dependencies."""
        plan = self.plan_dal.get_by_id(plan_id)
        if not plan or plan.tenant_id != self.tenant_id:
            return {"valid": False, "errors": ["Plan not found"]}
        
        errors = []
        warnings = []
        
        # Get plan steps and inputs
        steps = self.get_plan_steps(plan_id)
        inputs = self.get_plan_inputs(plan_id)
        
        # Validate step ordering
        step_orders = [step.step_order for step in steps]
        if len(set(step_orders)) != len(step_orders):
            errors.append("Duplicate step order numbers found")
        
        if step_orders and (min(step_orders) != 1 or max(step_orders) != len(step_orders)):
            warnings.append("Step ordering should be consecutive starting from 1")
        
        # Validate that required inputs exist
        required_inputs = [inp for inp in inputs if inp['required']]
        if not required_inputs:
            warnings.append("No required inputs defined")
        
        # Enhanced expression validation using SafeDSLParser
        parser = SafeDSLParser()
        available_variables = {inp['name'] for inp in inputs}
        
        # Add outputs from previous steps as available variables for later steps
        step_outputs = set()
        
        for step in sorted(steps, key=lambda s: s.order):
            if not step.expr.strip():
                errors.append(f"Step '{step.name}' has empty expression")
                continue
            
            try:
                # Validate expression syntax and security
                validation_result = parser.validate_expression(
                    step.expr, 
                    available_variables | step_outputs
                )
                
                if not validation_result.get('valid', False):
                    errors.append(f"Step '{step.name}' expression error: {validation_result.get('error', 'Unknown error')}")
                else:
                    # Add this step's outputs for future steps
                    step_outputs.update(step.outputs)
                    
            except (ExpressionSecurityError, ExpressionValidationError) as e:
                errors.append(f"Step '{step.name}' expression error: {e}")
            except Exception as e:
                logger.error(f"Unexpected error validating expression for step {step.name}: {e}")
                errors.append(f"Step '{step.name}' expression validation failed unexpectedly")
        
        # Validate step outputs don't conflict
        output_vars = []
        for step in steps:
            for output in step.outputs:
                if output in output_vars:
                    errors.append(f"Variable '{output}' is defined by multiple steps")
                output_vars.append(output)
        
        # Enhanced dependency validation using DAG analysis
        dependency_result = self.validate_plan_dependencies(plan_id)
        
        # Merge dependency validation results
        if not dependency_result.get('valid', True):
            # Add dependency-specific errors
            if dependency_result.get('has_cycles', False):
                for cycle in dependency_result.get('dependency_cycles', []):
                    cycle_names = ' -> '.join(cycle['cycle_names'])
                    errors.append(f"Circular dependency detected: {cycle_names}")
            
            for undef_var in dependency_result.get('undefined_variables', []):
                errors.append(f"Variable '{undef_var['variable']}' used by step '{undef_var['referenced_by_step']}' is not defined")
            
            for multi_def in dependency_result.get('multiply_defined_variables', []):
                step_names = ', '.join(multi_def['defined_by_steps'])
                errors.append(f"Variable '{multi_def['variable']}' is defined by multiple steps: {step_names}")
        
        # Add dependency analysis warnings
        if dependency_result.get('ordering_changed', False):
            current_order = ', '.join(dependency_result.get('current_ordering', []))
            suggested_order = ', '.join(dependency_result.get('suggested_ordering', []))
            warnings.append(f"Step ordering could be optimized. Current: [{current_order}] -> Suggested: [{suggested_order}]")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "steps_count": len(steps),
            "inputs_count": len(inputs),
            "required_inputs_count": len(required_inputs),
            "dependency_analysis": dependency_result
        }
    
    def validate_plan_dependencies(self, plan_id: str) -> Dict[str, Any]:
        """
        Validate plan dependencies using DAG analysis.
        
        Args:
            plan_id: ID of the plan to validate
            
        Returns:
            Dictionary containing comprehensive dependency analysis
        """
        try:
            # Get plan data
            steps_data = self._get_plan_steps_data(plan_id)
            inputs_data = self._get_plan_inputs_data(plan_id)
            
            if not steps_data:
                return {
                    'valid': True,
                    'has_cycles': False,
                    'undefined_variables': [],
                    'dependency_cycles': [],
                    'current_ordering': [],
                    'suggested_ordering': [],
                    'ordering_changed': False,
                    'analysis_summary': {
                        'total_steps': 0,
                        'total_inputs': len(inputs_data),
                        'total_variables_defined': 0,
                        'total_dependencies': 0
                    }
                }
            
            # Initialize dependency validator
            parser = SafeDSLParser()
            validator = PlanDependencyValidator(parser)
            
            # Run dependency validation
            result = validator.validate_dependencies(steps_data, inputs_data)
            
            return result
            
        except Exception as e:
            logger.error(f"Error validating plan dependencies for plan {plan_id}: {e}")
            return {
                'valid': False,
                'error': f"Dependency validation failed: {e}",
                'has_cycles': None,
                'undefined_variables': [],
                'dependency_cycles': [],
                'current_ordering': [],
                'suggested_ordering': [],
                'ordering_changed': False
            }
    
    def execute_plan(self, plan_id: str, input_values: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a bonus plan with provided input values.
        
        Args:
            plan_id: ID of the plan to execute
            input_values: Dictionary of input variable name -> value mappings
            
        Returns:
            Dictionary containing execution results and step-by-step outputs
        """
        # Get the plan and its components
        plan = self.plan_dal.get_by_id(plan_id)
        if not plan:
            raise ValueError(f"Plan {plan_id} not found")
        
        if plan.status != "approved":
            raise ValueError(f"Cannot execute plan in status '{plan.status}'. Plan must be approved.")
        
        steps = self._get_plan_steps_data(plan_id)
        inputs = self._get_plan_inputs_data(plan_id)
        
        # Validate that we have all required inputs
        required_inputs = [inp['name'] for inp in inputs if inp.get('required', True)]
        missing_inputs = [name for name in required_inputs if name not in input_values]
        if missing_inputs:
            raise ValueError(f"Missing required inputs: {', '.join(missing_inputs)}")
        
        # Execute steps in order
        parser = SafeDSLParser()
        execution_context = dict(input_values)  # Start with input values
        step_results = {}
        
        try:
            for step in sorted(steps, key=lambda s: s['order']):
                step_name = step['name']
                step_expr = step['expr']
                
                logger.info(f"Executing step '{step_name}': {step_expr}")
                
                # Execute the expression
                result = parser.evaluate(step_expr, execution_context)
                
                # Store the result for this step
                step_results[step_name] = {
                    'expression': step_expr,
                    'result': result,
                    'outputs': {}
                }
                
                # Add step outputs to execution context for future steps
                for output_name in step.get('outputs', []):
                    execution_context[output_name] = result
                    step_results[step_name]['outputs'][output_name] = result
                
                logger.info(f"Step '{step_name}' completed: {result}")
            
            return {
                'success': True,
                'plan_id': plan_id,
                'input_values': input_values,
                'step_results': step_results,
                'final_context': execution_context
            }
            
        except Exception as e:
            logger.error(f"Plan execution failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'plan_id': plan_id,
                'step_results': step_results
            }
    
    def execute_plan_vectorized(self, 
                               plan_id: str, 
                               employee_data, 
                               precision_mode: str = 'balanced') -> Dict[str, Any]:
        """
        Execute a bonus plan on a batch of employees using vectorized operations.
        
        Args:
            plan_id: ID of the plan to execute
            employee_data: Polars DataFrame or list of dicts with employee data
            precision_mode: 'fast', 'balanced', or 'exact'
            
        Returns:
            Dictionary containing vectorized execution results and performance metrics
        """
        import polars as pl
        
        try:
            # Get the plan and validate it exists and can be executed
            plan = self.plan_dal.get_by_id(plan_id)
            if not plan:
                raise ValueError(f"Plan {plan_id} not found")
            
            if plan.status != "approved":
                raise ValueError(f"Cannot execute plan in status '{plan.status}'. Plan must be approved.")
            
            # Get plan components
            steps_data = self._get_plan_steps_data(plan_id)
            inputs_data = self._get_plan_inputs_data(plan_id)
            
            if not steps_data:
                return {
                    'success': False,
                    'error': 'Plan has no steps to execute',
                    'plan_id': plan_id
                }
            
            # Convert employee_data to Polars DataFrame if needed
            if isinstance(employee_data, list):
                df = pl.DataFrame(employee_data)
            elif hasattr(employee_data, 'to_pandas'):
                # Handle pandas DataFrame
                df = pl.from_pandas(employee_data.to_pandas())
            else:
                df = employee_data  # Assume it's already a Polars DataFrame
            
            if df.height == 0:
                return {
                    'success': False,
                    'error': 'No employee data provided',
                    'plan_id': plan_id
                }
            
            # Initialize vectorized executor
            executor = VectorizedPlanExecutor(precision_mode=precision_mode)
            
            # Execute the plan
            result = executor.execute_plan_vectorized(plan_id, steps_data, inputs_data, df)
            
            # Add plan metadata to result
            if result['success']:
                result.update({
                    'plan_name': plan.name,
                    'plan_version': plan.version,
                    'plan_status': plan.status,
                    'employees_processed': result['rows_processed']
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Vectorized plan execution failed for plan {plan_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'plan_id': plan_id
            }
    
    def reorder_plan_steps(self, plan_id: str, step_order: List[Dict[str, Any]],
                          reordered_by: Optional[str] = None) -> List[PlanStepResponse]:
        """Reorder plan steps (only if plan is not locked)."""
        try:
            # Verify plan exists and is not locked
            plan = self.plan_dal.get_by_id(plan_id)
            if not plan or plan.tenant_id != self.tenant_id:
                raise ValueError("Plan not found")
            
            if plan.status == "locked":
                raise ValueError("Cannot reorder steps in locked plan")
            
            # Validate step_order structure
            if not isinstance(step_order, list):
                raise ValueError("step_order must be a list")
            
            step_updates = {}
            for item in step_order:
                if not isinstance(item, dict) or 'step_id' not in item or 'order' not in item:
                    raise ValueError("Each item must have 'step_id' and 'order' fields")
                step_updates[item['step_id']] = item['order']
            
            # Get existing steps
            steps = self.db.query(PlanStep).filter(PlanStep.plan_id == plan_id).all()
            
            # Verify all steps are accounted for
            existing_step_ids = {step.id for step in steps}
            provided_step_ids = set(step_updates.keys())
            
            if existing_step_ids != provided_step_ids:
                raise ValueError("Must provide order for all existing steps")
            
            # Apply new ordering
            for step in steps:
                if step.id in step_updates:
                    step.step_order = step_updates[step.id]
            
            self.db.commit()
            
            # Log reordering
            self.audit_dal.log_event(
                action='steps.reorder',
                entity='bonus_plan',
                entity_id=plan_id,
                actor_user_id=reordered_by,
                after={'reordered_steps': len(steps)}
            )
            
            # Return reordered steps
            return self.get_plan_steps(plan_id)
            
        except Exception as e:
            self.db.rollback()
            raise e

    def execute_plan_with_tape(self, plan_id: str, employee_data_df, 
                              precision_mode: str = 'balanced', upload_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Execute a bonus plan with step-level result persistence for calculation transparency.
        Creates a PlanRun record and captures step-by-step results.
        """
        from ..models import PlanRun
        from .vectorized_plan_executor import VectorizedPlanExecutor
        from .snapshot_hash_generator import get_snapshot_hash_generator
        import uuid
        from datetime import datetime
        
        try:
            # Verify plan exists and belongs to tenant
            plan = self.plan_dal.get_by_id(plan_id)
            if not plan or plan.tenant_id != self.tenant_id:
                raise ValueError("Plan not found")
            
            # Get plan data for execution
            steps_data = self._get_plan_steps_data(plan_id)
            inputs_data = self._get_plan_inputs_data(plan_id)
            
            if not steps_data:
                raise ValueError("Plan has no steps to execute")
            
            # Generate snapshot hash for reproducibility guarantee
            hash_generator = get_snapshot_hash_generator(self.db, self.tenant_id)
            employee_data_structure = {col: str(dtype) for col, dtype in employee_data_df.dtypes}
            execution_metadata = {'upload_id': upload_id} if upload_id else {}
            
            snapshot_hash = hash_generator.generate_execution_snapshot_hash(
                plan_id=plan_id,
                employee_data_structure=employee_data_structure,
                precision_mode=precision_mode,
                execution_metadata=execution_metadata
            )
            
            # Create PlanRun record with snapshot hash
            run_id = str(uuid.uuid4())
            plan_run = PlanRun(
                id=run_id,
                plan_id=plan_id,
                upload_id=upload_id,
                tenant_id=self.tenant_id,
                snapshot_hash=snapshot_hash,
                started_at=datetime.utcnow(),
                status="running"
            )
            
            self.db.add(plan_run)
            self.db.flush()  # Get the run_id
            
            # Execute plan with step persistence enabled
            executor = VectorizedPlanExecutor(precision_mode=precision_mode)
            result = executor.execute_plan_vectorized(
                plan_id, steps_data, inputs_data, employee_data_df,
                db_session=self.db,  # Enable step persistence
                run_id=run_id
            )
            
            # Update run status based on execution result
            plan_run.finished_at = datetime.utcnow()
            plan_run.status = "completed" if result['success'] else "failed"
            
            if result['success']:
                # Add run metadata to result
                result.update({
                    'run_id': run_id,
                    'plan_name': plan.name,
                    'plan_version': plan.version,
                    'plan_status': plan.status,
                    'employees_processed': result['rows_processed'],
                    'step_results_persisted': True,
                    'snapshot_hash': snapshot_hash,
                    'reproducibility_guaranteed': True
                })
            
            self.db.commit()
            
            # Log execution with audit trail
            self.audit_dal.log_event(
                action='plan.execute_with_tape',
                entity='bonus_plan',
                entity_id=plan_id,
                after={
                    'run_id': run_id,
                    'precision_mode': precision_mode,
                    'success': result['success'],
                    'rows_processed': result.get('rows_processed', 0)
                }
            )
            
            return result
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Plan execution with tape failed for plan {plan_id}: {e}")
            
            # Update run status to failed if run was created
            if 'run_id' in locals():
                try:
                    failed_run = self.db.query(PlanRun).filter(PlanRun.id == run_id).first()
                    if failed_run:
                        failed_run.status = "failed"
                        failed_run.finished_at = datetime.utcnow()
                        self.db.commit()
                except:
                    pass  # Don't fail on cleanup
            
            return {
                'success': False,
                'error': str(e),
                'plan_id': plan_id
            }
    
    # ================================
    # Helper Methods
    # ================================
    
    def _get_plan_steps_data(self, plan_id: str) -> List[Dict[str, Any]]:
        """Get plan steps data for inclusion in plan response."""
        steps = self.get_plan_steps(plan_id)
        return [step.model_dump() for step in steps]
    
    def _get_plan_inputs_data(self, plan_id: str) -> List[Dict[str, Any]]:
        """Get plan inputs data for inclusion in plan response."""
        return self.get_plan_inputs(plan_id)
    
    def _is_valid_status_transition(self, current_status: str, new_status: str) -> bool:
        """Validate bonus plan status transitions."""
        valid_transitions = {
            'draft': ['approved', 'archived'],
            'approved': ['locked', 'draft', 'archived'],
            'locked': ['archived'],  # Locked plans can only be archived
            'archived': []  # Archived plans cannot change status
        }
        
        return new_status in valid_transitions.get(current_status, [])


def get_plan_management_service(db: Session, tenant_id: str) -> PlanManagementService:
    """Factory function to create PlanManagementService."""
    return PlanManagementService(db, tenant_id)