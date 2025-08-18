"""
Input Catalog Service for managing configurable bonus calculation parameters.
Provides business logic for parameter definitions, validation, and defaults.
"""
import logging
from typing import List, Optional, Dict, Any, Tuple
from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session

from ..dal.platform_dal import InputCatalogDAL, AuditEventDAL
from ..models import InputCatalog
from ..schemas import InputCatalogCreate, InputCatalogResponse, InputCatalogUpdate

logger = logging.getLogger(__name__)

class InputCatalogService:
    """Service for managing input parameter catalog."""
    
    def __init__(self, db: Session, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id
        self.input_dal = InputCatalogDAL(db, tenant_id)
        self.audit_dal = AuditEventDAL(db, tenant_id)
    
    def create_input_definition(self, input_data: InputCatalogCreate) -> InputCatalogResponse:
        """Create a new input parameter definition."""
        try:
            # Validate that key is unique within tenant
            existing = self.input_dal.get_by_key(input_data.key)
            if existing:
                raise ValueError(f"Input key '{input_data.key}' already exists")
            
            # Validate data type
            if input_data.dtype not in ["decimal", "int", "text", "date", "bool"]:
                raise ValueError(f"Invalid data type: {input_data.dtype}")
            
            # Validate default value matches data type
            if input_data.default_value is not None:
                self._validate_value_type(input_data.default_value, input_data.dtype)
            
            # Create input definition
            input_def = self.input_dal.create({
                'tenant_id': self.tenant_id,
                'key': input_data.key,
                'label': input_data.label,
                'dtype': input_data.dtype,
                'required': input_data.required,
                'default_value': input_data.default_value,
                'validation': input_data.validation
            })
            
            # Log creation
            self.audit_dal.log_event(
                action='input.create',
                entity='input_catalog',
                entity_id=input_def.id,
                after={
                    'key': input_def.key,
                    'label': input_def.label,
                    'dtype': input_def.dtype,
                    'required': input_def.required
                }
            )
            
            return InputCatalogResponse.model_validate(input_def)
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_input_definitions(self, required_only: Optional[bool] = None, 
                            dtype: Optional[str] = None) -> List[InputCatalogResponse]:
        """Get input parameter definitions with optional filters."""
        if required_only is not None:
            if required_only:
                inputs = self.input_dal.get_required_inputs()
            else:
                # Get all inputs, then filter out required ones
                all_inputs = self.input_dal.get_by_tenant()
                inputs = [i for i in all_inputs if not i.required]
        else:
            inputs = self.input_dal.get_by_tenant()
        
        # Apply data type filter if provided
        if dtype:
            inputs = [i for i in inputs if i.dtype == dtype]
        
        return [InputCatalogResponse.model_validate(i) for i in inputs]
    
    def get_input_definition(self, input_id: str) -> Optional[InputCatalogResponse]:
        """Get a specific input parameter definition."""
        input_def = self.input_dal.get_by_id(input_id)
        if input_def and input_def.tenant_id == self.tenant_id:
            return InputCatalogResponse.model_validate(input_def)
        return None
    
    def update_input_definition(self, input_id: str, 
                              input_data: InputCatalogUpdate) -> Optional[InputCatalogResponse]:
        """Update an input parameter definition."""
        try:
            input_def = self.input_dal.get_by_id(input_id)
            if not input_def or input_def.tenant_id != self.tenant_id:
                return None
            
            # Store old values for audit
            old_values = {
                'label': input_def.label,
                'dtype': input_def.dtype,
                'required': input_def.required,
                'default_value': input_def.default_value,
                'validation': input_def.validation
            }
            
            # Update fields
            update_data = {}
            if input_data.label is not None:
                update_data['label'] = input_data.label
            if input_data.dtype is not None:
                if input_data.dtype not in ["decimal", "int", "text", "date", "bool"]:
                    raise ValueError(f"Invalid data type: {input_data.dtype}")
                update_data['dtype'] = input_data.dtype
            if input_data.required is not None:
                update_data['required'] = input_data.required
            if input_data.default_value is not None:
                # Validate default value against (potentially new) data type
                dtype = input_data.dtype or input_def.dtype
                self._validate_value_type(input_data.default_value, dtype)
                update_data['default_value'] = input_data.default_value
            if input_data.validation is not None:
                update_data['validation'] = input_data.validation
            
            # Apply updates
            for field, value in update_data.items():
                setattr(input_def, field, value)
            
            self.db.commit()
            
            # Log update
            new_values = {
                'label': input_def.label,
                'dtype': input_def.dtype,
                'required': input_def.required,
                'default_value': input_def.default_value,
                'validation': input_def.validation
            }
            
            self.audit_dal.log_event(
                action='input.update',
                entity='input_catalog',
                entity_id=input_def.id,
                before=old_values,
                after=new_values
            )
            
            return InputCatalogResponse.model_validate(input_def)
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def delete_input_definition(self, input_id: str) -> bool:
        """Delete an input parameter definition."""
        try:
            input_def = self.input_dal.get_by_id(input_id)
            if not input_def or input_def.tenant_id != self.tenant_id:
                return False
            
            # Check if input is used in any plans
            # TODO: Add check when plan_inputs relationships are implemented
            
            # Store values for audit
            old_values = {
                'key': input_def.key,
                'label': input_def.label,
                'dtype': input_def.dtype,
                'required': input_def.required
            }
            
            # Delete the input definition
            self.input_dal.delete(input_def)
            
            # Log deletion
            self.audit_dal.log_event(
                action='input.delete',
                entity='input_catalog',
                entity_id=input_id,
                before=old_values
            )
            
            return True
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def validate_input_values(self, input_values: Dict[str, Any]) -> Dict[str, Any]:
        """Validate input values against their definitions."""
        result = {
            'valid': True,
            'errors': {},
            'validated_values': {}
        }
        
        # Get all input definitions for tenant
        input_defs = {i.key: i for i in self.input_dal.get_by_tenant()}
        
        # Check required inputs
        required_inputs = {key: i for key, i in input_defs.items() if i.required}
        missing_required = set(required_inputs.keys()) - set(input_values.keys())
        
        if missing_required:
            result['valid'] = False
            for key in missing_required:
                result['errors'][key] = f"Required input '{key}' is missing"
        
        # Validate provided values
        for key, value in input_values.items():
            if key not in input_defs:
                result['errors'][key] = f"Unknown input key '{key}'"
                result['valid'] = False
                continue
            
            input_def = input_defs[key]
            
            try:
                # Type validation and conversion
                validated_value = self._validate_and_convert_value(value, input_def.dtype)
                
                # Apply custom validation rules
                validation_error = self._apply_validation_rules(validated_value, input_def.validation)
                if validation_error:
                    result['errors'][key] = validation_error
                    result['valid'] = False
                else:
                    result['validated_values'][key] = validated_value
                    
            except ValueError as e:
                result['errors'][key] = str(e)
                result['valid'] = False
        
        return result
    
    def create_default_input_catalog(self) -> List[InputCatalogResponse]:
        """Create default input catalog entries for common bonus parameters."""
        default_inputs = [
            {
                'key': 'base_salary',
                'label': 'Base Salary',
                'dtype': 'decimal',
                'required': True,
                'validation': {'min': 0, 'max': 10000000}
            },
            {
                'key': 'target_bonus_pct',
                'label': 'Target Bonus Percentage',
                'dtype': 'decimal',
                'required': False,
                'default_value': 0.25,
                'validation': {'min': 0, 'max': 5.0}
            },
            {
                'key': 'performance_score',
                'label': 'Performance Score',
                'dtype': 'decimal',
                'required': False,
                'validation': {'min': 0, 'max': 10.0}
            },
            {
                'key': 'aum',
                'label': 'Assets Under Management',
                'dtype': 'decimal',
                'required': False,
                'validation': {'min': 0}
            },
            {
                'key': 'fund_return',
                'label': 'Fund Return %',
                'dtype': 'decimal',
                'required': False,
                'validation': {'min': -100, 'max': 1000}
            },
            {
                'key': 'years_of_service',
                'label': 'Years of Service',
                'dtype': 'int',
                'required': False,
                'validation': {'min': 0, 'max': 50}
            },
            {
                'key': 'department',
                'label': 'Department',
                'dtype': 'text',
                'required': True,
                'validation': {}
            },
            {
                'key': 'hire_date',
                'label': 'Hire Date',
                'dtype': 'date',
                'required': False,
                'validation': {}
            },
            {
                'key': 'is_key_employee',
                'label': 'Key Employee Status',
                'dtype': 'bool',
                'required': False,
                'default_value': False,
                'validation': {}
            }
        ]
        
        created_inputs = []
        
        for input_spec in default_inputs:
            try:
                # Check if already exists
                existing = self.input_dal.get_by_key(input_spec['key'])
                if existing:
                    logger.info(f"Default input '{input_spec['key']}' already exists, skipping")
                    continue
                
                # Create input definition
                input_data = InputCatalogCreate(
                    tenant_id=self.tenant_id,
                    **input_spec
                )
                
                input_def = self.create_input_definition(input_data)
                created_inputs.append(input_def)
                logger.info(f"Created default input: {input_spec['key']}")
                
            except Exception as e:
                logger.error(f"Failed to create default input '{input_spec['key']}': {e}")
        
        return created_inputs
    
    def _validate_value_type(self, value: Any, dtype: str) -> None:
        """Validate that a value matches the expected data type."""
        if value is None:
            return
        
        try:
            if dtype == "decimal":
                Decimal(str(value))
            elif dtype == "int":
                int(value)
            elif dtype == "text":
                str(value)
            elif dtype == "date":
                if isinstance(value, str):
                    datetime.fromisoformat(value.replace('Z', '+00:00'))
                elif not isinstance(value, datetime):
                    raise ValueError("Date must be datetime object or ISO string")
            elif dtype == "bool":
                if not isinstance(value, bool):
                    raise ValueError("Boolean value required")
        except (ValueError, TypeError):
            raise ValueError(f"Value {value} is not valid for type {dtype}")
    
    def _validate_and_convert_value(self, value: Any, dtype: str) -> Any:
        """Validate and convert value to the appropriate type."""
        if value is None:
            return None
        
        if dtype == "decimal":
            return Decimal(str(value))
        elif dtype == "int":
            return int(value)
        elif dtype == "text":
            return str(value)
        elif dtype == "date":
            if isinstance(value, str):
                return datetime.fromisoformat(value.replace('Z', '+00:00'))
            elif isinstance(value, datetime):
                return value
            else:
                raise ValueError("Date must be datetime object or ISO string")
        elif dtype == "bool":
            if isinstance(value, bool):
                return value
            elif isinstance(value, str):
                return value.lower() in ('true', '1', 'yes', 'on')
            elif isinstance(value, (int, float)):
                return bool(value)
            else:
                raise ValueError("Cannot convert to boolean")
        else:
            raise ValueError(f"Unknown data type: {dtype}")
    
    def _apply_validation_rules(self, value: Any, validation: Dict[str, Any]) -> Optional[str]:
        """Apply custom validation rules to a value."""
        if not validation:
            return None
        
        try:
            # Numeric range validation
            if 'min' in validation and value < validation['min']:
                return f"Value must be >= {validation['min']}"
            if 'max' in validation and value > validation['max']:
                return f"Value must be <= {validation['max']}"
            
            # String length validation
            if 'min_length' in validation and len(str(value)) < validation['min_length']:
                return f"Value must be at least {validation['min_length']} characters"
            if 'max_length' in validation and len(str(value)) > validation['max_length']:
                return f"Value must be no more than {validation['max_length']} characters"
            
            # Pattern validation
            if 'pattern' in validation:
                import re
                if not re.match(validation['pattern'], str(value)):
                    return f"Value does not match required pattern: {validation['pattern']}"
            
            # Enum validation
            if 'enum' in validation and value not in validation['enum']:
                return f"Value must be one of: {', '.join(validation['enum'])}"
            
            return None
            
        except Exception as e:
            return f"Validation error: {str(e)}"


def get_input_catalog_service(db: Session, tenant_id: str) -> InputCatalogService:
    """Factory function to create InputCatalogService."""
    return InputCatalogService(db, tenant_id)