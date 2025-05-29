from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime

# Base schemas
class SessionBase(BaseModel):
    pass

class SessionCreate(SessionBase):
    pass

class SessionResponse(SessionBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    expires_at: datetime
    created_at: datetime
    updated_at: datetime

# Batch Upload schemas
class BatchParameters(BaseModel):
    """Schema for batch calculation parameters"""
    targetBonusPct: float
    investmentWeight: float
    qualitativeWeight: float
    investmentScoreMultiplier: float
    qualScoreMultiplier: float
    raf: float
    rafSensitivity: Optional[float] = None
    rafLowerClamp: Optional[float] = None
    rafUpperClamp: Optional[float] = None
    mrtCapPct: float
    useDirectRaf: bool
    baseSalaryCapMultiplier: Optional[float] = None
    # Bonus pool parameters
    totalBonusPool: Optional[float] = None
    useBonusPoolLimit: Optional[bool] = False


class ParameterPresetBase(BaseModel):
    name: str
    description: Optional[str] = None
    parameters: BatchParameters
    is_default: bool = False


class ParameterPresetCreate(ParameterPresetBase):
    pass


class ParameterPresetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parameters: Optional[BatchParameters] = None
    is_default: Optional[bool] = None


class ParameterPreset(ParameterPresetBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class BatchUploadBase(BaseModel):
    filename: str
    original_filename: str
    file_size: int
    calculation_parameters: Optional[BatchParameters] = None

class BatchUploadCreate(BatchUploadBase):
    session_id: str

class BatchUploadUpdate(BaseModel):
    status: Optional[str] = None
    total_rows: Optional[int] = None
    processed_rows: Optional[int] = None
    failed_rows: Optional[int] = None
    error_message: Optional[str] = None
    calculation_parameters: Optional[BatchParameters] = None

class BatchUploadResponse(BatchUploadBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    session_id: str
    status: str
    total_rows: Optional[int] = None
    processed_rows: int
    failed_rows: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# Employee Data schemas
class EmployeeDataBase(BaseModel):
    employee_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    salary: Optional[float] = None
    hire_date: Optional[datetime] = None
    additional_data: Optional[Dict[str, Any]] = None

class EmployeeDataCreate(EmployeeDataBase):
    batch_upload_id: str
    row_number: int

class EmployeeDataResponse(EmployeeDataBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    batch_upload_id: str
    row_number: int
    is_valid: bool
    validation_errors: Optional[Dict[str, Any]] = None
    created_at: datetime

# Batch Scenario schemas
class BatchScenarioBase(BaseModel):
    name: str
    description: Optional[str] = None
    parameters: Dict[str, Any]

class BatchScenarioCreate(BatchScenarioBase):
    session_id: str

class BatchScenarioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

class BatchScenarioResponse(BatchScenarioBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    session_id: str
    created_at: datetime
    updated_at: datetime

# Calculation Result schemas
class EmployeeCalculationResultBase(BaseModel):
    base_salary: float
    bonus_percentage: float
    bonus_amount: float
    total_compensation: float
    calculation_breakdown: Optional[Dict[str, Any]] = None

class EmployeeCalculationResultCreate(EmployeeCalculationResultBase):
    employee_data_id: str
    batch_result_id: str

class EmployeeCalculationResultResponse(EmployeeCalculationResultBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    employee_data_id: str
    batch_result_id: str
    calculated_at: datetime
    employee_data: Optional[EmployeeDataResponse] = None

class BatchCalculationResultBase(BaseModel):
    total_employees: int
    total_base_salary: float
    total_bonus_amount: float
    average_bonus_percentage: Optional[float] = None
    calculation_parameters: Optional[Dict[str, Any]] = None

class BatchCalculationResultCreate(BatchCalculationResultBase):
    batch_upload_id: str
    scenario_id: Optional[str] = None

class BatchCalculationResultResponse(BatchCalculationResultBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    batch_upload_id: str
    scenario_id: Optional[str] = None
    calculated_at: datetime
    employee_results: List[EmployeeCalculationResultResponse] = []

# Import Template schemas
class ImportTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    column_mapping: Dict[str, str]

class ImportTemplateCreate(ImportTemplateBase):
    is_default: bool = False

class ImportTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    column_mapping: Optional[Dict[str, str]] = None
    is_default: Optional[bool] = None

class ImportTemplateResponse(ImportTemplateBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

# Scenario Audit Log schemas
class ScenarioAuditLogBase(BaseModel):
    action: str
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None

class ScenarioAuditLogCreate(ScenarioAuditLogBase):
    scenario_id: str

class ScenarioAuditLogResponse(ScenarioAuditLogBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    scenario_id: str
    timestamp: datetime

# API Response wrapper
class ApiResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    data: Optional[Any] = None
    error: Optional[str] = None
