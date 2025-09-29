"""
Batch Calculation Service

This module implements the service for processing batch calculations.
It handles the calculation of bonuses for all employees in a batch upload,
applying global parameters and storing results in the database.
"""

from typing import Dict, Any, List, Optional, Tuple, Union
from datetime import datetime
from sqlalchemy.orm import Session
import logging
import asyncio

from ..models import BatchUpload, EmployeeData, BatchCalculationResult, EmployeeCalculationResult, BatchScenario, PlanRun
from ..schemas import BatchParameters, BatchCalculationResultCreate, EmployeeCalculationResultCreate
from ..calculation_engine import CalculationEngine, CalculationInputs, CalculationResult, ValidationError
from .revenue_banding_service import RevenueBandingService
from .team_raf_service import get_team_raf_service
from .calculation_dispatcher import CalculationDispatcher
from ..rbac.decorators import audit_action, require_permission

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
        self.calculation_engine = CalculationEngine()  # Keep for backwards compatibility
        self.calculation_dispatcher = CalculationDispatcher(db)  # New dispatcher for strangler pattern
    
    def _execute_calculation(self, calculation_inputs, tenant_id: str = None, user_id: str = None):
        """
        Execute calculation using the dispatcher for strangler pattern routing.
        
        Args:
            calculation_inputs: Calculation inputs for the engine
            tenant_id: Tenant ID for routing decisions
            user_id: User ID for audit logging
            
        Returns:
            Calculation result
        """
        try:
            # Convert calculation_inputs to the format expected by dispatcher
            employee_data = [{
                "base_salary": calculation_inputs.base_salary,
                "target_bonus_pct": calculation_inputs.target_bonus_pct,
                "investment_weight": calculation_inputs.investment_weight,
                "qualitative_weight": calculation_inputs.qualitative_weight,
                "investment_score_multiplier": calculation_inputs.investment_score_multiplier,
                "qual_score_multiplier": calculation_inputs.qual_score_multiplier,
                "raf": calculation_inputs.raf,
                "is_mrt": calculation_inputs.is_mrt,
                "mrt_cap_pct": calculation_inputs.mrt_cap_pct
            }]
            
            parameters = {
                "base_salary_cap": calculation_inputs.base_salary_cap,
                "total_bonus_pool": getattr(calculation_inputs, 'total_bonus_pool', None),
                "total_calculated_bonuses": getattr(calculation_inputs, 'total_calculated_bonuses', None),
                "use_bonus_pool_limit": getattr(calculation_inputs, 'use_bonus_pool_limit', False)
            }
            
            # Execute through dispatcher
            dispatcher_result = self.calculation_dispatcher.execute_calculation(
                plan_id=None,  # Could be extracted from calculation_inputs if available
                tenant_id=tenant_id,
                employee_data=employee_data,
                parameters=parameters,
                user_id=user_id
            )
            
            # If dispatcher execution was successful, extract results
            if dispatcher_result.success:
                # Convert dispatcher results back to legacy CalculationResult format
                results = dispatcher_result.results
                if isinstance(results, dict) and 'calculations' in results:
                    # Assume single employee calculation
                    calc_data = results['calculations'][0] if results['calculations'] else {}
                    
                    # Create CalculationResult compatible object
                    # This is a simplified conversion - adjust based on actual result structure
                    return CalculationResult(
                        target_bonus=calc_data.get('target_bonus', 0),
                        weighted_performance=calc_data.get('weighted_performance', 0),
                        pre_raf_bonus=calc_data.get('pre_raf_bonus', 0),
                        initial_bonus=calc_data.get('initial_bonus', 0),
                        base_salary_cap=calc_data.get('base_salary_cap', 0),
                        mrt_cap=calc_data.get('mrt_cap', 0),
                        final_bonus=calc_data.get('final_bonus', 0),
                        cap_applied=calc_data.get('cap_applied', False),
                        calculation_steps=calc_data.get('calculation_steps', {})
                    )
                else:
                    # Fallback to legacy engine if result format unexpected
                    logger.warning("Unexpected dispatcher result format, falling back to legacy engine")
                    return self.calculation_engine.calculate_final_bonus(calculation_inputs)
            else:
                # Dispatcher failed, fallback to legacy engine
                logger.warning(f"Dispatcher execution failed: {dispatcher_result.error}, falling back to legacy engine")
                return self.calculation_engine.calculate_final_bonus(calculation_inputs)
                
        except Exception as e:
            # Any error with dispatcher, fallback to legacy engine
            logger.error(f"Error using calculation dispatcher: {str(e)}, falling back to legacy engine")
            return self.calculation_engine.calculate_final_bonus(calculation_inputs)
    
    async def calculate_batch(
        self, 
        batch_upload_id: str, 
        parameters: Union[BatchParameters, Dict[str, Any]] = None,
        create_scenario: bool = False,
        scenario_name: str = None
    ) -> Tuple[BatchCalculationResult, List[EmployeeCalculationResult]]:
        """
        Calculate bonuses for all employees in a batch.
        
        Args:
            batch_upload_id: ID of the batch upload
            parameters: Calculation parameters - either BatchParameters (legacy) or CategoryBasedBatchParameters dict (new) 
                       (optional, will use parameters from batch upload if not provided)
            create_scenario: Whether to create a scenario for this calculation
            scenario_name: Name of the scenario (required if create_scenario is True)
            
        Returns:
            Tuple of (batch_calculation_result, employee_calculation_results)
            
        Raises:
            ValueError: If batch upload not found or parameters not provided
        """
        logger.info(f"=== STARTING BATCH CALCULATION FOR UPLOAD {batch_upload_id} ===")
        
        try:
            # Get batch upload
            batch_upload = self.db.query(BatchUpload).filter(BatchUpload.id == batch_upload_id).first()
            if not batch_upload:
                logger.error(f"Batch upload with ID {batch_upload_id} not found")
                raise ValueError(f"Batch upload with ID {batch_upload_id} not found")
            
            logger.info(f"Found batch upload: {batch_upload.original_filename}")
            
            # Get parameters from batch upload if not provided
            if parameters is None:
                if batch_upload.calculation_parameters is None:
                    logger.error("No calculation parameters provided and none found in batch upload")
                    raise ValueError("No calculation parameters provided and none found in batch upload")
                parameters = BatchParameters(**batch_upload.calculation_parameters)
            
            # Determine if we're using category-based parameters or legacy parameters
            is_category_based = isinstance(parameters, dict) and parameters.get('useCategoryBased', False)
            
            if is_category_based:
                logger.info("Using category-based parameters")
                logger.info(f"Category parameters: {parameters}")
                # Store the raw category-based parameters for later use
                category_based_params = parameters
                # Extract default parameters for legacy compatibility in some places
                legacy_parameters = BatchParameters(**parameters['defaultParameters'])
            else:
                logger.info("Using legacy universal parameters")
                # Convert BatchParameters to dict format for compatibility
                if isinstance(parameters, BatchParameters):
                    legacy_parameters = parameters
                    logger.info(f"Using parameters: {parameters.dict()}")
                else:
                    # It's a dict but not category-based, convert to BatchParameters
                    legacy_parameters = BatchParameters(**parameters)
                    logger.info(f"Using parameters: {legacy_parameters.dict()}")
                
                # Create category-based structure for universal application
                category_based_params = {
                    'useCategoryBased': False,
                    'defaultParameters': legacy_parameters.dict() if hasattr(legacy_parameters, 'dict') else legacy_parameters
                }
            
            # Update batch upload status
            batch_upload.status = "processing"
            batch_upload.processed_rows = 0
            self.db.commit()
            logger.info("Updated batch upload status to 'processing'")

            # Generate snapshot hash before execution if possible
            try:
                from .snapshot_hash_generator import get_snapshot_hash_generator
                gen = get_snapshot_hash_generator(self.db, tenant_id=None)
                # Derive a simple employee_data_structure from first valid row
                sample = self.db.query(EmployeeData).filter(
                    EmployeeData.batch_upload_id == batch_upload_id
                ).first()
                structure = {}
                if sample:
                    # Basic columns we know
                    structure = {
                        'employee_id': 'string', 'first_name': 'string', 'last_name': 'string',
                        'email': 'string', 'department': 'string', 'position': 'string',
                        'salary': 'number', 'hire_date': 'date'
                    }
                    if sample.additional_data:
                        for k in sample.additional_data.keys():
                            structure.setdefault(k, 'string')
                execution_meta = {
                    'cycle': (category_based_params['defaultParameters'].get('cycle')
                              if is_category_based else legacy_parameters.dict().get('cycle')),
                    'upload_ids': []
                }
                snapshot_hash = gen.generate_execution_snapshot_hash(
                    plan_id=None or 'legacy-batch',
                    employee_data_structure=structure,
                    precision_mode='balanced',
                    execution_metadata=execution_meta
                )
                logger.info(f"Generated execution snapshot hash: {snapshot_hash}")

                # Attempt to store on related PlanRun if any (best-effort)
                plan_run = self.db.query(PlanRun).filter(PlanRun.upload_id == batch_upload_id).first()
                if plan_run:
                    plan_run.snapshot_hash = snapshot_hash
                    self.db.commit()
            except Exception as e:
                logger.warning(f"Snapshot hash generation skipped: {e}")
            
            # Create scenario if requested
            scenario_id = None
            if create_scenario:
                if not scenario_name:
                    scenario_name = f"Batch {batch_upload_id[:8]} - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
                
                # Persist parameters safely regardless of input type
                params_for_persistence: Dict[str, Any]
                if is_category_based:
                    params_for_persistence = category_based_params  # already a dict
                else:
                    params_for_persistence = (
                        legacy_parameters.dict() if hasattr(legacy_parameters, 'dict') else legacy_parameters  # type: ignore
                    )

                scenario = BatchScenario(
                    session_id=batch_upload.session_id,
                    name=scenario_name,
                    parameters=params_for_persistence
                )
                self.db.add(scenario)
                self.db.commit()
                scenario_id = scenario.id
                logger.info(f"Created scenario: {scenario_name}")
            
            # Get all employee data for this batch
            logger.info(f"=== QUERYING EMPLOYEE DATA for batch {batch_upload_id} ===")
            employee_data = self.db.query(EmployeeData).filter(
                EmployeeData.batch_upload_id == batch_upload_id,
                EmployeeData.is_valid == True
            ).all()
            
            logger.info(f"Query returned {len(employee_data)} employees")
            
            if not employee_data:
                logger.error(f"=== NO VALID EMPLOYEE DATA FOUND for batch upload {batch_upload_id} ===")
                raise ValueError(f"No valid employee data found for batch upload {batch_upload_id}")
                
            logger.info(f"=== FOUND {len(employee_data)} VALID EMPLOYEES TO PROCESS ===")
            
            # Check if bonus pool limit is enabled
            if is_category_based:
                # For category-based parameters, bonus pool is in the default parameters
                use_bonus_pool_limit = category_based_params['defaultParameters'].get('useBonusPoolLimit', False)
                total_bonus_pool = category_based_params['defaultParameters'].get('totalBonusPool')
                use_row_overrides = category_based_params['defaultParameters'].get('useRowValuesWhenPresent', False)
                use_direct_raf = category_based_params['defaultParameters'].get('useDirectRaf', True)
                use_team_raf = category_based_params['defaultParameters'].get('useTeamRAF', False)
                cycle = category_based_params['defaultParameters'].get('cycle')
            else:
                # For legacy parameters
                use_bonus_pool_limit = legacy_parameters.dict().get('useBonusPoolLimit', False)
                total_bonus_pool = legacy_parameters.dict().get('totalBonusPool')
                use_row_overrides = legacy_parameters.dict().get('useRowValuesWhenPresent', False)
                use_direct_raf = legacy_parameters.dict().get('useDirectRaf', True)
                use_team_raf = getattr(legacy_parameters, 'useTeamRAF', False)
                cycle = getattr(legacy_parameters, 'cycle', None)
            
            # If bonus pool limit is enabled but no pool amount is set, disable it
            if use_bonus_pool_limit and (total_bonus_pool is None or total_bonus_pool <= 0):
                logger.warning("Bonus pool limit is enabled but no valid pool amount is set. Disabling bonus pool limit.")
                use_bonus_pool_limit = False
                total_bonus_pool = None
                
            # Get team RAF factors if enabled
            team_raf_factors = {}
            team_raf_weight_pct = 0.25  # Default weight percentage for team RAF
            employee_team_mapping = {}
            
            if use_team_raf and cycle:
                try:
                    # Get team RAF service
                    raf_service = get_team_raf_service(self.db)
                    
                    # Get all approved RAF factors for the cycle
                    team_raf_factors = raf_service.get_team_raf_factors(cycle)
                    
                    if not team_raf_factors:
                        logger.warning(f"Team RAF is enabled but no approved RAF factors found for cycle {cycle}")
                    else:
                        logger.info(f"Loaded {len(team_raf_factors)} team RAF factors for cycle {cycle}")
                        
                        # Get weight percentage from service
                        team_raf_weight_pct = raf_service.get_team_raf_weight_percentage(cycle)
                    
                    # Get employee-team mappings using service
                    employee_team_mapping = raf_service.get_employee_team_mapping()
                    
                    if not employee_team_mapping:
                        logger.warning("Team RAF is enabled but no employee-team mappings found")
                    else:
                        logger.info(f"Loaded {len(employee_team_mapping)} employee-team mappings")
                        
                        # Validate that all teams have approved RAF snapshots
                        is_valid, missing_teams = raf_service.validate_team_raf_coverage(cycle, employee_team_mapping)
                        
                        if not is_valid:
                            missing_teams_str = ", ".join(sorted(missing_teams))
                            raise ValidationError(
                                f"Team RAF is enabled but the following teams lack approved RAF snapshots for cycle {cycle}: {missing_teams_str}. "
                                "All teams with employees must have approved RAF configurations before running batch calculations."
                            )
                    
                except Exception as e:
                    logger.error(f"Error loading team RAF factors: {str(e)}")
                    # Re-raise ValidationError to block execution as required
                    if isinstance(e, ValidationError):
                        raise
                    # Continue without team RAF if there's a different error
            
            # Create batch calculation result
            # Use the same safe-serialized parameters for the batch result
            result_params_for_persistence: Dict[str, Any]
            if is_category_based:
                result_params_for_persistence = category_based_params
            else:
                result_params_for_persistence = (
                    legacy_parameters.dict() if hasattr(legacy_parameters, 'dict') else legacy_parameters  # type: ignore
                )

            batch_result = BatchCalculationResult(
                batch_upload_id=batch_upload_id,
                scenario_id=scenario_id,
                total_employees=len(employee_data),
                total_base_salary=0,
                total_bonus_amount=0,
                total_bonus_pool=0.0,
                average_bonus_percentage=0,
                calculation_parameters=result_params_for_persistence
            )
            self.db.add(batch_result)
            self.db.commit()
            logger.info(f"Created batch calculation result with ID: {batch_result.id}")
            
            # Optionally compute revenue band multiplier once per batch (if enabled)
            team_multiplier: float = 1.0
            band_snapshot: Dict[str, Any] = {}
            if (is_category_based and category_based_params.get('defaultParameters', {}).get('useRevenueBanding')) or (
                not is_category_based and getattr(legacy_parameters, 'useRevenueBanding', False)
            ):
                try:
                    # Determine team/config IDs from parameters
                    if is_category_based:
                        default_params = category_based_params.get('defaultParameters', {})
                        team_id = default_params.get('teamId')
                        config_id = default_params.get('bandConfigId')
                    else:
                        team_id = getattr(legacy_parameters, 'teamId', None)
                        config_id = getattr(legacy_parameters, 'bandConfigId', None)

                    if team_id:
                        band_service = RevenueBandingService(self.db)
                        band_result = band_service.preview_team_band(team_id=team_id, config_id=config_id)
                        team_multiplier = float(band_result.multiplier)
                        band_snapshot = {
                            'band': band_result.band,
                            'multiplier': band_result.multiplier,
                            'composite_score': band_result.composite_score,
                            'team_id': band_result.team_id,
                            'config_id': band_result.config_id,
                        }
                        logger.info(f"Applying revenue band multiplier {team_multiplier} (band {band_result.band})")
                except Exception as e:
                    logger.error(f"Failed to compute revenue banding multiplier: {str(e)}. Proceeding without banding.")
                    team_multiplier = 1.0
                    band_snapshot = {}

            # Process employees in chunks to avoid memory issues
            chunk_size = 100
            total_base_salary = 0
            pre_scaling_bonus_total = 0
            capped_count = 0
            
            # First pass: Calculate initial bonuses without pool limit to get total
            initial_results = []
            initial_calculation_inputs = []
            
            logger.info("Starting first pass calculation...")
            
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
                    
                    # Row-level overrides from additional_data
                    raf_override = None
                    is_mrt = False
                    row_target_bonus_pct = None
                    row_inv_weight = None
                    row_qual_weight = None
                    row_inv_mult = None
                    row_qual_mult = None
                    row_mrt_cap_pct = None

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

                        # Only parse row-level overrides when enabled
                        if use_row_overrides:
                            def _to_float(value):
                                try:
                                    if isinstance(value, str):
                                        v = value.strip().replace('%', '')
                                        return float(v)
                                    return float(value)
                                except Exception:
                                    return None

                            row_target_bonus_pct = _to_float(employee.additional_data.get('target_bonus_pct'))
                            # Interpret >1 as percent form (e.g., 20 => 0.20)
                            if row_target_bonus_pct is not None and row_target_bonus_pct > 1:
                                row_target_bonus_pct = row_target_bonus_pct / 100.0

                            row_inv_weight = _to_float(employee.additional_data.get('investment_weight'))
                            row_qual_weight = _to_float(employee.additional_data.get('qualitative_weight'))

                            row_inv_mult = _to_float(employee.additional_data.get('investment_score_multiplier'))
                            row_qual_mult = _to_float(employee.additional_data.get('qual_score_multiplier'))

                            row_mrt_cap_pct = _to_float(employee.additional_data.get('mrt_cap_pct'))
                            if row_mrt_cap_pct is not None and row_mrt_cap_pct > 1:
                                row_mrt_cap_pct = row_mrt_cap_pct / 100.0

                    # Prepare calculation inputs for first pass (without pool limit)
                    if is_category_based:
                        # Use category-aware parameter resolution
                        calculation_inputs = self.calculation_engine.create_calculation_inputs_from_category_params(
                            category_based_params=category_based_params,
                            base_salary=base_salary,
                            employee_department=employee.department,
                            employee_position=employee.position,
                            is_mrt=is_mrt,
                            raf_override=raf_override if (raf_override is not None and use_direct_raf) else None,
                            use_bonus_pool_limit=False  # First pass without pool limit
                        )
                        # Apply row-level overrides to calculation inputs if enabled
                        if use_row_overrides:
                            if row_target_bonus_pct is not None:
                                calculation_inputs.target_bonus_pct = row_target_bonus_pct
                            # Weights: if provided, normalize if needed
                            inv_w = calculation_inputs.investment_weight
                            qual_w = calculation_inputs.qualitative_weight
                            if row_inv_weight is not None:
                                inv_w = row_inv_weight
                            if row_qual_weight is not None:
                                qual_w = row_qual_weight
                            total_w = (inv_w or 0) + (qual_w or 0)
                            if row_inv_weight is not None or row_qual_weight is not None:
                                if total_w > 0 and abs(total_w - 1.0) > 0.001:
                                    inv_w = inv_w / total_w
                                    qual_w = qual_w / total_w
                                calculation_inputs.investment_weight = inv_w
                                calculation_inputs.qualitative_weight = qual_w
                            if row_inv_mult is not None:
                                calculation_inputs.investment_score_multiplier = row_inv_mult
                            if row_qual_mult is not None:
                                calculation_inputs.qual_score_multiplier = row_qual_mult
                            if is_mrt and row_mrt_cap_pct is not None:
                                calculation_inputs.mrt_cap_pct = row_mrt_cap_pct
                    else:
                        # Use legacy universal parameters
                        # Start with configured parameters
                        target_bonus_pct = legacy_parameters.targetBonusPct
                        inv_weight = legacy_parameters.investmentWeight
                        qual_weight = legacy_parameters.qualitativeWeight
                        inv_mult = legacy_parameters.investmentScoreMultiplier
                        qual_mult = legacy_parameters.qualScoreMultiplier
                        mrt_cap_pct = legacy_parameters.mrtCapPct if is_mrt else None

                        # Apply row-level overrides if enabled
                        if use_row_overrides:
                            if row_target_bonus_pct is not None:
                                target_bonus_pct = row_target_bonus_pct
                            if row_inv_weight is not None:
                                inv_weight = row_inv_weight
                            if row_qual_weight is not None:
                                qual_weight = row_qual_weight
                            # Normalize weights if they were overridden and don't sum to 1
                            if (row_inv_weight is not None) or (row_qual_weight is not None):
                                total_w = (inv_weight or 0) + (qual_weight or 0)
                                if total_w > 0 and abs(total_w - 1.0) > 0.001:
                                    inv_weight = inv_weight / total_w
                                    qual_weight = qual_weight / total_w
                            if row_inv_mult is not None:
                                inv_mult = row_inv_mult
                            if row_qual_mult is not None:
                                qual_mult = row_qual_mult
                            if is_mrt and row_mrt_cap_pct is not None:
                                mrt_cap_pct = row_mrt_cap_pct

                        calculation_inputs = CalculationInputs(
                            base_salary=base_salary,
                            target_bonus_pct=target_bonus_pct,
                            investment_weight=inv_weight,
                            investment_score_multiplier=inv_mult,
                            qualitative_weight=qual_weight,
                            qual_score_multiplier=qual_mult,
                            raf=(raf_override if (raf_override is not None and use_direct_raf) else legacy_parameters.raf),
                            is_mrt=is_mrt,
                            mrt_cap_pct=mrt_cap_pct,
                            # No bonus pool limit for first pass
                            use_bonus_pool_limit=False
                        )
                    
                    # Store calculation inputs for potential second pass
                    initial_calculation_inputs.append((employee.id, calculation_inputs))
                    
                    # Calculate initial bonus (without pool limit) using dispatcher
                    result = self._execute_calculation(calculation_inputs, tenant_id=getattr(batch_upload, 'tenant_id', None))
                    
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
                        logger.info(f"Processed {i + 1} of {len(employee_data)} employees")
                        
                        # Allow other tasks to run
                        await asyncio.sleep(0)
                    
                except ValidationError as e:
                    logger.error(f"Validation error for employee {employee.id}: {str(e)}")
                    continue
                except Exception as e:
                    logger.error(f"Error calculating bonus for employee {employee.id}: {str(e)}")
                    continue
            
            logger.info(f"First pass completed. Processed {len(initial_results)} employees successfully")
            
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
            
            logger.info("Starting second pass calculation...")
            
            for employee_id, initial_result in initial_results:
                try:
                    # Get the employee data
                    employee = next((e for e in employee_data if e.id == employee_id), None)
                    if not employee:
                        continue
                    
                    base_salary = float(employee.salary) if employee.salary is not None else 0
                    
                    # Apply team multiplier after caps and before any pool scaling
                    final_result = initial_result
                    if pool_scaling_applied:
                        # Get the original calculation inputs
                        _, calculation_inputs = next((item for item in initial_calculation_inputs if item[0] == employee_id), (None, None))
                        if calculation_inputs:
                            # Update inputs with pool limit parameters
                            calculation_inputs.use_bonus_pool_limit = True
                            calculation_inputs.total_bonus_pool = total_bonus_pool
                            calculation_inputs.total_calculated_bonuses = pre_scaling_bonus_total
                            
                            # Recalculate with pool limit using dispatcher
                            final_result = self._execute_calculation(calculation_inputs, tenant_id=getattr(batch_upload, 'tenant_id', None))
                    
                    # Apply team RAF factor if enabled
                    team_raf_factor = 1.0
                    team_id = None
                    
                    if use_team_raf and employee_team_mapping and team_raf_factors:
                        # Get employee ID from the employee data
                        employee_id_value = getattr(employee, 'employee_id', None)
                        if employee_id_value and employee_id_value in employee_team_mapping:
                            # Get team ID directly from mapping
                            team_id = employee_team_mapping[employee_id_value]
                            
                            # Get RAF factor for this team
                            team_raf_factor = team_raf_factors.get(team_id, 1.0)
                    
                    # Apply team RAF before revenue banding
                    if use_team_raf and team_raf_factor != 1.0:
                        # Calculate weighted RAF factor based on weight percentage
                        weighted_team_raf = 1.0 + ((team_raf_factor - 1.0) * team_raf_weight_pct)
                        
                        # Apply weighted team RAF factor
                        adjusted_bonus = final_result.final_bonus * weighted_team_raf
                        
                        # Rebuild calculation result with team RAF applied
                        final_result = CalculationResult(
                            target_bonus=final_result.target_bonus,
                            weighted_performance=final_result.weighted_performance,
                            pre_raf_bonus=final_result.pre_raf_bonus,
                            initial_bonus=final_result.initial_bonus,
                            base_salary_cap=final_result.base_salary_cap,
                            mrt_cap=final_result.mrt_cap,
                            final_bonus=adjusted_bonus,
                            cap_applied=final_result.cap_applied,
                            calculation_steps={
                                **final_result.calculation_steps, 
                                'team_raf': {
                                    'team_id': team_id,
                                    'factor': team_raf_factor,
                                    'weight_pct': team_raf_weight_pct * 100,  # Convert back to percentage for display
                                    'weighted_factor': weighted_team_raf,
                                    'pre_team_raf_bonus': final_result.final_bonus,
                                    'post_team_raf_bonus': adjusted_bonus,
                                    'approved': True  # Since we only load approved snapshots
                                }
                            },
                            pool_scaling_applied=getattr(final_result, 'pool_scaling_applied', False),
                            pool_scaling_factor=getattr(final_result, 'pool_scaling_factor', 1.0),
                            pre_scaling_bonus=getattr(final_result, 'pre_scaling_bonus', 0.0),
                        )

                    # Apply team multiplier (banding) on the final capped (and possibly pool-scaled) bonus
                    if team_multiplier != 1.0:
                        adjusted_bonus = final_result.final_bonus * team_multiplier
                        # Rebuild a CalculationResult-like object with adjusted bonus and step note
                        final_result = CalculationResult(
                            target_bonus=final_result.target_bonus,
                            weighted_performance=final_result.weighted_performance,
                            pre_raf_bonus=final_result.pre_raf_bonus,
                            initial_bonus=final_result.initial_bonus,
                            base_salary_cap=final_result.base_salary_cap,
                            mrt_cap=final_result.mrt_cap,
                            final_bonus=adjusted_bonus,
                            cap_applied=final_result.cap_applied,
                            calculation_steps={**final_result.calculation_steps, 'team_multiplier': team_multiplier},
                            pool_scaling_applied=getattr(final_result, 'pool_scaling_applied', False),
                            pool_scaling_factor=getattr(final_result, 'pool_scaling_factor', 1.0),
                            pre_scaling_bonus=getattr(final_result, 'pre_scaling_bonus', 0.0),
                        )
                    
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
            
            logger.info(f"Second pass completed. Created {len(employee_results)} employee results")
            
            # Update batch calculation result with summary statistics
            average_bonus_pct = total_bonus_amount / total_base_salary if total_base_salary > 0 else 0
            
            batch_result.total_base_salary = total_base_salary
            # Apply team multiplier to aggregate if it was used and pool scaling was not recomputed
            if team_multiplier != 1.0:
                total_bonus_amount = total_bonus_amount * team_multiplier
            batch_result.total_bonus_amount = total_bonus_amount
            batch_result.total_bonus_pool = total_bonus_pool if total_bonus_pool is not None else total_bonus_amount
            batch_result.average_bonus_percentage = average_bonus_pct * (team_multiplier if team_multiplier != 1.0 else 1.0)
            
            # Add bonus pool information to batch result parameters
            if is_category_based:
                parameters_dict = category_based_params.copy()
            else:
                parameters_dict = legacy_parameters.dict() if hasattr(legacy_parameters, 'dict') else legacy_parameters
            
            parameters_dict.update({
                'bonus_pool_limit': total_bonus_pool,
                'bonus_pool_scaling_applied': pool_scaling_applied,
                'bonus_pool_scaling_factor': pool_scaling_factor,
                'pre_scaling_bonus_total': pre_scaling_bonus_total
            })
            
            # Add revenue banding info if available
            if band_snapshot:
                parameters_dict.update({'revenue_banding': band_snapshot})
            
            # Add team RAF info if available
            if use_team_raf and team_raf_factors:
                parameters_dict.update({
                    'team_raf': {
                        'enabled': True,
                        'cycle': cycle,
                        'teams_with_raf': list(team_raf_factors.keys()),
                        'weight_pct': team_raf_weight_pct * 100  # Convert to percentage for display
                    }
                })
            
            batch_result.calculation_parameters = parameters_dict
            
            # Update batch upload status
            batch_upload.status = "completed"
            batch_upload.processed_rows = len(employee_data)
            
            # Final commit
            self.db.commit()

            # Run exception detection
            try:
                exception_service = ExceptionRegisterService(self.db)
                exception_summary = exception_service.bulk_process_batch(batch_result.id, cycle)
                logger.info(f"Exception summary for batch {batch_result.id}: {exception_summary}")
            except Exception as e:
                logger.error(f"Exception detection failed: {e}")

            # Auto payout splitting if an active policy exists for the cycle
            try:
                params_dict = batch_result.calculation_parameters or {}
                population = params_dict.get('population', 'non-MRT')
                from ..models import PayoutPolicy
                policy = (
                    self.db.query(PayoutPolicy)
                    .filter(PayoutPolicy.cycle == (cycle or ''), PayoutPolicy.population == population, PayoutPolicy.status == 'active')
                    .order_by(PayoutPolicy.version.desc())
                    .first()
                )
                if policy:
                    splitter = PayoutSplitterService(self.db)
                    stats = splitter.split_batch_payouts(user=None, batch_result_id=batch_result.id, policy_id=policy.id)
                    logger.info(f"Payout splitting completed for batch {batch_result.id}: {stats}")
                else:
                    logger.info("No active payout policy; skipping payout split")
            except Exception as e:
                logger.error(f"Payout splitting failed: {e}")
            
            logger.info(f"=== BATCH CALCULATION COMPLETED SUCCESSFULLY ===")
            logger.info(f"Total base salary: ${total_base_salary:,.2f}")
            logger.info(f"Total bonus amount: ${total_bonus_amount:,.2f}")
            logger.info(f"Average bonus percentage: {average_bonus_pct:.2%}")
            logger.info(f"Employee results created: {len(employee_results)}")
            
            return batch_result, employee_results
            
        except Exception as e:
            # Log the full exception details
            logger.exception(f"CRITICAL ERROR in batch calculation for upload {batch_upload_id}: {str(e)}")
            
            # Try to update the batch upload status to failed
            try:
                batch_upload = self.db.query(BatchUpload).filter(BatchUpload.id == batch_upload_id).first()
                if batch_upload:
                    batch_upload.status = "failed"
                    batch_upload.error_message = str(e)
                    self.db.commit()
                    logger.info(f"Updated batch upload status to 'failed' with error: {str(e)}")
            except Exception as commit_error:
                logger.error(f"Failed to update batch upload status to failed: {str(commit_error)}")
                self.db.rollback()
            
            # Re-raise the exception so the background task framework can handle it
            raise
    
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

    def get_batch_summary_with_exceptions(self, batch_result_id: str) -> Dict[str, Any]:
        """Return enhanced summary including exception counts and payout status."""
        result = self.db.query(BatchCalculationResult).filter(BatchCalculationResult.id == batch_result_id).first()
        if not result:
            raise ValueError("Batch result not found")

        exception_service = ExceptionRegisterService(self.db)
        exceptions = exception_service.get_batch_exceptions(batch_result_id)

        # Payout status
        from ..dal.payout_dal import PayoutLegDAL
        leg_dal = PayoutLegDAL(self.db)
        legs = leg_dal.get_by_batch_result(batch_result_id)
        payout_generated = len(legs) > 0

        return {
            'id': result.id,
            'total_employees': result.total_employees,
            'total_bonus_amount': result.total_bonus_amount,
            'pool_scaling': {
                'applied': bool((result.calculation_parameters or {}).get('bonus_pool_scaling_applied')),
                'factor': (result.calculation_parameters or {}).get('bonus_pool_scaling_factor')
            },
            'exceptions': {
                'count': len(exceptions),
                'by_severity': self._group_exceptions_by_severity(exceptions)
            },
            'payout': {
                'generated': payout_generated,
                'legs_count': len(legs)
            },
            'team_raf': (result.calculation_parameters or {}).get('team_raf', {})
        }

    def _group_exceptions_by_severity(self, exceptions: List[Dict[str, Any]]) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for e in exceptions:
            sev = getattr(e, 'severity', 'warning')
            counts[sev] = counts.get(sev, 0) + 1
        return counts
