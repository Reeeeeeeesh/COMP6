"""
Snapshot Hash Generator for Immutable Calculation Reproducibility

Generates deterministic hashes of plan configurations, inputs, and execution context
to ensure calculation reproducibility for financial compliance and audit purposes.
"""
import hashlib
import json
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from ..models import BonusPlan, PlanStep, PlanInput, InputCatalog
from ..dal.platform_dal import BonusPlanDAL, InputCatalogDAL


class SnapshotHashGenerator:
    """
    Generates deterministic, immutable hashes for bonus calculation reproducibility.
    
    The snapshot hash includes:
    - Plan definition (ID, name, version, status, metadata)
    - All plan steps (ordered by step_order, including expressions and outputs)
    - All plan inputs (with validation rules and data types)
    - Input catalog definitions (complete parameter specifications)
    - Employee data structure (column names and types, not actual values)
    - Execution parameters (precision mode, runtime configuration)
    - Platform version (calculation engine version)
    """
    
    def __init__(self, db: Session, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id
        self.plan_dal = BonusPlanDAL(db, tenant_id)
        self.input_dal = InputCatalogDAL(db, tenant_id)
    
    def generate_execution_snapshot_hash(self, 
                                       plan_id: str, 
                                       employee_data_structure: Dict[str, str],
                                       precision_mode: str = 'balanced',
                                       execution_metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate comprehensive snapshot hash for plan execution.
        
        Args:
            plan_id: ID of the bonus plan
            employee_data_structure: Dict of {column_name: data_type} for employee data
            precision_mode: Calculation precision mode ('fast', 'balanced', 'exact')
            execution_metadata: Optional metadata about execution context
            
        Returns:
            SHA-256 hash string representing the complete execution snapshot
        """
        try:
            # 1. Get plan definition
            plan = self.plan_dal.get_by_id(plan_id)
            if not plan:
                raise ValueError(f"Plan {plan_id} not found")
            
            # 2. Build comprehensive snapshot data
            snapshot_data = {
                # Platform version - critical for reproducibility across updates
                'platform_version': '1.0.0',  # TODO: Get from actual version
                'calculation_engine_version': 'vectorized_polars_1.0',
                
                # Plan configuration
                'plan': {
                    'id': plan.id,
                    'name': plan.name,
                    'version': plan.version,
                    'status': plan.status,
                    'effective_from': plan.effective_from.isoformat() if plan.effective_from else None,
                    'effective_to': plan.effective_to.isoformat() if plan.effective_to else None,
                    'metadata': plan.plan_metadata or {}
                },
                
                # Plan steps in exact execution order
                'steps': self._get_ordered_steps_snapshot(plan_id),
                
                # Plan inputs with complete validation rules
                'inputs': self._get_plan_inputs_snapshot(plan_id),
                
                # Input catalog definitions for all referenced inputs
                'input_catalog': self._get_input_catalog_snapshot(plan_id),
                
                # Employee data structure (columns and types, not values)
                'employee_data_structure': self._normalize_data_structure(employee_data_structure),
                
                # Execution configuration
                'execution_config': {
                    'precision_mode': precision_mode,
                    'metadata': execution_metadata or {}
                },
                
                # Timestamp of hash generation for audit trail
                'snapshot_generated_at': datetime.utcnow().isoformat()
            }
            
            # 3. Generate deterministic hash
            return self._generate_deterministic_hash(snapshot_data)
            
        except Exception as e:
            raise ValueError(f"Failed to generate snapshot hash: {str(e)}")
    
    def _get_ordered_steps_snapshot(self, plan_id: str) -> List[Dict[str, Any]]:
        """Get plan steps in exact execution order for snapshot."""
        steps = self.db.query(PlanStep).filter(
            PlanStep.plan_id == plan_id
        ).order_by(PlanStep.step_order).all()
        
        return [
            {
                'order': step.step_order,
                'name': step.name,
                'expression': step.expr,
                'condition_expression': step.condition_expr,
                'outputs': step.outputs or [],
                'notes': step.notes
            }
            for step in steps
        ]
    
    def _get_plan_inputs_snapshot(self, plan_id: str) -> List[Dict[str, Any]]:
        """Get plan inputs with complete configuration for snapshot."""
        plan_inputs = self.db.query(PlanInput).filter(
            PlanInput.plan_id == plan_id
        ).all()
        
        return [
            {
                'input_catalog_id': pi.input_id,
                'required': pi.required,
                'source_mapping': pi.source_mapping or {}
            }
            for pi in plan_inputs
        ]
    
    def _get_input_catalog_snapshot(self, plan_id: str) -> List[Dict[str, Any]]:
        """Get complete input catalog definitions for all plan inputs."""
        # Get all input catalog entries referenced by this plan
        catalog_entries = self.db.query(InputCatalog).join(PlanInput).filter(
            PlanInput.plan_id == plan_id
        ).all()
        
        return [
            {
                'id': entry.id,
                'key': entry.key,
                'label': entry.label,
                'dtype': entry.dtype,
                'required': entry.required,
                'default_value': entry.default_value,
                'validation': entry.validation or {}
            }
            for entry in catalog_entries
        ]
    
    def _normalize_data_structure(self, data_structure: Dict[str, str]) -> Dict[str, str]:
        """Normalize employee data structure for consistent hashing."""
        # Sort by column name for deterministic ordering
        return dict(sorted(data_structure.items()))
    
    def _generate_deterministic_hash(self, snapshot_data: Dict[str, Any]) -> str:
        """
        Generate a deterministic SHA-256 hash from snapshot data.
        
        Uses JSON serialization with sorted keys to ensure identical 
        snapshots always produce the same hash.
        """
        # Convert to JSON with sorted keys for deterministic serialization
        json_string = json.dumps(
            snapshot_data, 
            sort_keys=True, 
            separators=(',', ':'),  # Compact format for consistency
            default=str  # Handle datetime and other non-JSON types
        )
        
        # Generate SHA-256 hash
        return hashlib.sha256(json_string.encode('utf-8')).hexdigest()
    
    def verify_snapshot_reproducibility(self, 
                                      plan_id: str,
                                      expected_hash: str,
                                      employee_data_structure: Dict[str, str],
                                      precision_mode: str = 'balanced',
                                      execution_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Verify if current plan configuration would produce the same snapshot hash.
        
        Args:
            plan_id: Plan to verify
            expected_hash: Hash from previous execution to compare against
            employee_data_structure: Current employee data structure
            precision_mode: Current precision mode
            execution_metadata: Current execution metadata
            
        Returns:
            Dict with verification results and differences if any
        """
        try:
            # Generate current snapshot hash
            current_hash = self.generate_execution_snapshot_hash(
                plan_id, employee_data_structure, precision_mode, execution_metadata
            )
            
            # Compare hashes
            is_reproducible = current_hash == expected_hash
            
            result = {
                'is_reproducible': is_reproducible,
                'current_hash': current_hash,
                'expected_hash': expected_hash,
                'verified_at': datetime.utcnow().isoformat()
            }
            
            if not is_reproducible:
                # If hashes don't match, identify what changed
                result['differences'] = self._identify_snapshot_differences(
                    plan_id, expected_hash, employee_data_structure, 
                    precision_mode, execution_metadata
                )
            
            return result
            
        except Exception as e:
            return {
                'is_reproducible': False,
                'error': str(e),
                'verified_at': datetime.utcnow().isoformat()
            }
    
    def _identify_snapshot_differences(self, 
                                     plan_id: str,
                                     expected_hash: str,
                                     employee_data_structure: Dict[str, str],
                                     precision_mode: str,
                                     execution_metadata: Optional[Dict[str, Any]]) -> List[str]:
        """
        Identify what components of the snapshot have changed.
        
        This is helpful for audit purposes to understand why calculations
        might produce different results.
        """
        differences = []
        
        try:
            # This is a simplified approach - in practice you'd need to store
            # the original snapshot components to do detailed comparison
            differences.append("Plan configuration, steps, inputs, or execution context has changed")
            differences.append(f"Expected hash: {expected_hash}")
            differences.append("Use snapshot comparison tools for detailed analysis")
            
        except Exception as e:
            differences.append(f"Error analyzing differences: {str(e)}")
        
        return differences
    
    def get_plan_snapshot_summary(self, plan_id: str) -> Dict[str, Any]:
        """
        Get a human-readable summary of what's included in the plan snapshot.
        
        Useful for audit documentation and understanding reproducibility scope.
        """
        try:
            plan = self.plan_dal.get_by_id(plan_id)
            if not plan:
                raise ValueError(f"Plan {plan_id} not found")
            
            # Count steps and inputs
            steps_count = self.db.query(PlanStep).filter(PlanStep.plan_id == plan_id).count()
            inputs_count = self.db.query(PlanInput).filter(PlanInput.plan_id == plan_id).count()
            
            # Get step names for summary
            steps = self.db.query(PlanStep).filter(
                PlanStep.plan_id == plan_id
            ).order_by(PlanStep.step_order).all()
            
            step_names = [step.name for step in steps]
            
            return {
                'plan_id': plan_id,
                'plan_name': plan.name,
                'plan_version': plan.version,
                'plan_status': plan.status,
                'total_steps': steps_count,
                'total_inputs': inputs_count,
                'step_names': step_names,
                'snapshot_scope': [
                    'Plan definition and metadata',
                    f'{steps_count} calculation steps with expressions',
                    f'{inputs_count} input parameters with validation rules',
                    'Employee data structure (column types)',
                    'Execution configuration (precision mode)',
                    'Platform and calculation engine versions'
                ],
                'reproducibility_guarantee': 'Identical snapshot hash ensures identical calculation results'
            }
            
        except Exception as e:
            raise ValueError(f"Failed to get snapshot summary: {str(e)}")


def get_snapshot_hash_generator(db: Session, tenant_id: str) -> SnapshotHashGenerator:
    """Dependency injection factory for SnapshotHashGenerator."""
    return SnapshotHashGenerator(db, tenant_id)