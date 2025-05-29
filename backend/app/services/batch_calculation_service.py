"""
Batch Calculation Service

This module implements the service for processing batch calculations.
It handles the calculation of bonuses for all employees in a batch upload,
applying global parameters and storing results in the database.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
import logging
import asyncio

from ..models import BatchUpload, EmployeeData, BatchCalculationResult, EmployeeCalculationResult, BatchScenario
from ..schemas import BatchParameters, BatchCalculationResultCreate, EmployeeCalculationResultCreate
from ..calculation_engine import CalculationEngine, CalculationInputs, CalculationResult, ValidationError

logger = logging.getLogger(__name__)

class BatchCalculationService:
    """Service for processing batch calculations"""
    
    def __init__(self, db: Session):
        """
        Initialize the batch calculation service.
        
        Args:
            db: Database session
        """
        self.db = db
        self.calculation_engine = CalculationEngine()
    
    async def calculate_batch(
        self, 
        batch_upload_id: str, 
        parameters: BatchParameters = None,
        create_scenario: bool = False,
        scenario_name: str = None
    ) -> Tuple[BatchCalculationResult, List[EmployeeCalculationResult]]:
        """
        Calculate bonuses for all employees in a batch.
        
        Args:
            batch_upload_id: ID of the batch upload
            parameters: Global calculation parameters (optional, will use parameters from batch upload if not provided)
            create_scenario: Whether to create a scenario for this calculation
            scenario_name: Name of the scenario (required if create_scenario is True)
            
        Returns:
            Tuple of (batch_calculation_result, employee_calculation_results)
            
        Raises:
            ValueError: If batch upload not found or parameters not provided
        """
        # Get batch upload
        batch_upload = self.db.query(BatchUpload).filter(BatchUpload.id == batch_upload_id).first()
        if not batch_upload:
            raise ValueError(f"Batch upload with ID {batch_upload_id} not found")
        
        # Get parameters from batch upload if not provided
        if parameters is None:
            if batch_upload.calculation_parameters is None:
                raise ValueError("No calculation parameters provided and none found in batch upload")
            parameters = BatchParameters(**batch_upload.calculation_parameters)
        
        # Update batch upload status
        batch_upload.status = "processing"
        batch_upload.processed_rows = 0
        self.db.commit()
        
        # Create scenario if requested
        scenario_id = None
        if create_scenario:
            if not scenario_name:
                scenario_name = f"Batch {batch_upload_id[:8]} - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
            
            scenario = BatchScenario(
                session_id=batch_upload.session_id,
                name=scenario_name,
                parameters=parameters.dict()
            )
            self.db.add(scenario)
            self.db.commit()
            scenario_id = scenario.id
        
        # Get all employee data for this batch
        employee_data = self.db.query(EmployeeData).filter(
            EmployeeData.batch_upload_id == batch_upload_id,
            EmployeeData.is_valid == True
        ).all()
        
        if not employee_data:
            raise ValueError(f"No valid employee data found for batch upload {batch_upload_id}")
            
        # Check if bonus pool limit is enabled
        use_bonus_pool_limit = parameters.dict().get('useBonusPoolLimit', False)
        total_bonus_pool = parameters.dict().get('totalBonusPool')
        
        # If bonus pool limit is enabled but no pool amount is set, disable it
        if use_bonus_pool_limit and (total_bonus_pool is None or total_bonus_pool <= 0):
            logger.warning("Bonus pool limit is enabled but no valid pool amount is set. Disabling bonus pool limit.")
            use_bonus_pool_limit = False
            total_bonus_pool = None
        
        # Create batch calculation result
        batch_result = BatchCalculationResult(
            batch_upload_id=batch_upload_id,
            scenario_id=scenario_id,
            total_employees=len(employee_data),
            total_base_salary=0,
            total_bonus_amount=0,
            average_bonus_percentage=0,
            calculation_parameters=parameters.dict()
        )
        self.db.add(batch_result)
        self.db.commit()
        
        # Process employees in chunks to avoid memory issues
        chunk_size = 100
        total_base_salary = 0
        pre_scaling_bonus_total = 0
        capped_count = 0
        
        # First pass: Calculate initial bonuses without pool limit to get total
        initial_results = []
        initial_calculation_inputs = []
        
        for i, employee in enumerate(employee_data):
            try:
                # Extract employee data and ensure it's a float
                try:
                    base_salary = float(employee.salary) if employee.salary is not None else 0
                    if base_salary <= 0:
                        logger.warning(f"Invalid base salary for employee {employee.id}: {base_salary}")
                        continue
                except (ValueError, TypeError):
                    logger.warning(f"Invalid base salary format for employee {employee.id}: {employee.salary}")
                    continue
                
                # Check if employee has RAF override in additional_data
                raf_override = None
                is_mrt = False
                
                if employee.additional_data:
                    # Get RAF override and convert to float if it's a string
                    raw_raf = employee.additional_data.get('raf')
                    if raw_raf is not None:
                        try:
                            raf_override = float(raw_raf)
                        except (ValueError, TypeError):
                            logger.warning(f"Invalid RAF override for employee {employee.id}: {raw_raf}")
                    
                    # Get MRT flag and ensure it's a boolean
                    raw_is_mrt = employee.additional_data.get('is_mrt', False)
                    is_mrt = bool(raw_is_mrt)
                
                # Prepare calculation inputs for first pass (without pool limit)
                calculation_inputs = CalculationInputs(
                    base_salary=base_salary,
                    target_bonus_pct=parameters.targetBonusPct,
                    investment_weight=parameters.investmentWeight,
                    investment_score_multiplier=parameters.investmentScoreMultiplier,
                    qualitative_weight=parameters.qualitativeWeight,
                    qual_score_multiplier=parameters.qualScoreMultiplier,
                    raf=raf_override if raf_override is not None and parameters.useDirectRaf else parameters.raf,
                    is_mrt=is_mrt,
                    mrt_cap_pct=parameters.mrtCapPct if is_mrt else None,
                    # No bonus pool limit for first pass
                    use_bonus_pool_limit=False
                )
                
                # Store calculation inputs for potential second pass
                initial_calculation_inputs.append((employee.id, calculation_inputs))
                
                # Calculate initial bonus (without pool limit)
                result = self.calculation_engine.calculate_final_bonus(calculation_inputs)
                
                # Store initial result
                initial_results.append((employee.id, result))
                
                # Update totals for first pass
                total_base_salary += base_salary
                pre_scaling_bonus_total += result.final_bonus
                if result.cap_applied:
                    capped_count += 1
                
                # Update batch upload progress periodically
                if (i + 1) % chunk_size == 0 or i == len(employee_data) - 1:
                    batch_upload.processed_rows = i + 1
                    self.db.commit()
                    
                    # Allow other tasks to run
                    await asyncio.sleep(0)
                
            except ValidationError as e:
                logger.error(f"Validation error for employee {employee.id}: {str(e)}")
                continue
            except Exception as e:
                logger.error(f"Error calculating bonus for employee {employee.id}: {str(e)}")
                continue
        
        # Check if bonus pool limit should be applied
        pool_scaling_applied = False
        pool_scaling_factor = 1.0
        total_bonus_amount = pre_scaling_bonus_total
        
        if use_bonus_pool_limit and total_bonus_pool is not None and pre_scaling_bonus_total > total_bonus_pool:
            # Bonus pool limit is enabled and total exceeds the limit, apply scaling
            pool_scaling_applied = True
            pool_scaling_factor = total_bonus_pool / pre_scaling_bonus_total
            total_bonus_amount = total_bonus_pool
            logger.info(f"Applying bonus pool limit: {total_bonus_pool} / {pre_scaling_bonus_total} = {pool_scaling_factor}")
        
        # Process final results and create employee calculation records
        employee_results = []
        
        for employee_id, initial_result in initial_results:
            try:
                # Get the employee data
                employee = next((e for e in employee_data if e.id == employee_id), None)
                if not employee:
                    continue
                
                base_salary = float(employee.salary) if employee.salary is not None else 0
                
                # If pool scaling is needed, recalculate with pool limit
                final_result = initial_result
                if pool_scaling_applied:
                    # Get the original calculation inputs
                    _, calculation_inputs = next((item for item in initial_calculation_inputs if item[0] == employee_id), (None, None))
                    if calculation_inputs:
                        # Update inputs with pool limit parameters
                        calculation_inputs.use_bonus_pool_limit = True
                        calculation_inputs.total_bonus_pool = total_bonus_pool
                        calculation_inputs.total_calculated_bonuses = pre_scaling_bonus_total
                        
                        # Recalculate with pool limit
                        final_result = self.calculation_engine.calculate_final_bonus(calculation_inputs)
                
                # Create employee calculation result
                employee_result = EmployeeCalculationResult(
                    employee_data_id=employee_id,
                    batch_result_id=batch_result.id,
                    base_salary=base_salary,
                    bonus_percentage=final_result.final_bonus / base_salary if base_salary > 0 else 0,
                    bonus_amount=final_result.final_bonus,
                    total_compensation=base_salary + final_result.final_bonus,
                    calculation_breakdown=final_result.calculation_steps
                )
                
                self.db.add(employee_result)
                employee_results.append(employee_result)
                
            except Exception as e:
                logger.error(f"Error in second pass for employee {employee_id}: {str(e)}")
                continue
        
        # Update batch calculation result with summary statistics
        average_bonus_pct = total_bonus_amount / total_base_salary if total_base_salary > 0 else 0
        
        batch_result.total_base_salary = total_base_salary
        batch_result.total_bonus_amount = total_bonus_amount
        batch_result.average_bonus_percentage = average_bonus_pct
        
        # Add bonus pool information to batch result parameters
        parameters_dict = parameters.dict()
        parameters_dict.update({
            'bonus_pool_limit': total_bonus_pool,
            'bonus_pool_scaling_applied': pool_scaling_applied,
            'bonus_pool_scaling_factor': pool_scaling_factor,
            'pre_scaling_bonus_total': pre_scaling_bonus_total
        })
        batch_result.calculation_parameters = parameters_dict
        
        # Update batch upload status
        batch_upload.status = "completed"
        batch_upload.processed_rows = len(employee_data)
        
        self.db.commit()
        
        return batch_result, employee_results
    
    def _merge_parameters(self, global_params: Dict[str, Any], individual_overrides: Dict[str, Any]) -> Dict[str, Any]:
        """
        Merge global parameters with individual overrides.
        
        Args:
            global_params: Global calculation parameters
            individual_overrides: Individual parameter overrides
            
        Returns:
            Merged parameters
        """
        result = global_params.copy()
        if individual_overrides:
            result.update(individual_overrides)
        return result
