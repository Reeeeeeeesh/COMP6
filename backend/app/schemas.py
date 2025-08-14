from pydantic import BaseModel, Field, ConfigDict, field_validator
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
    # Revenue banding (optional feature)
    useRevenueBanding: Optional[bool] = False
    teamId: Optional[str] = None
    bandConfigId: Optional[str] = None


class CategoryParameters(BaseModel):
    """Schema for category-specific parameter overrides"""
    targetBonusPct: Optional[float] = None
    investmentWeight: Optional[float] = None
    qualitativeWeight: Optional[float] = None
    investmentScoreMultiplier: Optional[float] = None
    qualScoreMultiplier: Optional[float] = None
    raf: Optional[float] = None
    rafSensitivity: Optional[float] = None
    rafLowerClamp: Optional[float] = None
    rafUpperClamp: Optional[float] = None
    mrtCapPct: Optional[float] = None
    useDirectRaf: Optional[bool] = None
    baseSalaryCapMultiplier: Optional[float] = None
    # Note: Bonus pool parameters are global only, not category-specific


class CategoryBasedBatchParameters(BaseModel):
    """Schema for category-based batch calculation parameters"""
    useCategoryBased: bool = False
    defaultParameters: BatchParameters
    departmentOverrides: Optional[Dict[str, CategoryParameters]] = None
    salaryRangeOverrides: Optional[Dict[str, CategoryParameters]] = None
    positionOverrides: Optional[Dict[str, CategoryParameters]] = None


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


# ==============================================
# Revenue Banding Schemas
# ==============================================

class TeamBase(BaseModel):
    name: str
    division: Optional[str] = None
    peer_group: Optional[str] = None


class TeamCreate(TeamBase):
    pass


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    division: Optional[str] = None
    peer_group: Optional[str] = None


class TeamResponse(TeamBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class TeamRevenueHistoryBase(BaseModel):
    fiscal_year: int
    revenue: float
    currency: Optional[str] = None
    is_adjusted: bool = False
    notes: Optional[str] = None


class TeamRevenueHistoryCreate(TeamRevenueHistoryBase):
    team_id: str


class TeamRevenueHistoryResponse(TeamRevenueHistoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    team_id: str
    created_at: datetime


class RevenueBandSettings(BaseModel):
    # Weights
    wTrend: float = 0.7
    wConsistency: float = 0.3
    wRelative: Optional[float] = None
    usePeerRelative: bool = False

    # Normalization
    trendClamp: List[float] = Field(default_factory=lambda: [-0.5, 0.5])
    sigmaMax: float = 0.6

    # Band mapping
    thresholds: Dict[str, float] = Field(
        default_factory=lambda: {"A": 80.0, "B": 65.0, "C": 50.0, "D": 35.0}
    )
    multipliers: Dict[str, float] = Field(
        default_factory=lambda: {"A": 1.5, "B": 1.2, "C": 1.0, "D": 0.7, "E": 0.4}
    )

    @field_validator("trendClamp")
    @classmethod
    def validate_trend_clamp(cls, v: List[float]) -> List[float]:
        if not isinstance(v, list) or len(v) != 2:
            raise ValueError("trendClamp must be a list of two numbers [lo, hi]")
        lo, hi = float(v[0]), float(v[1])
        if lo >= hi:
            raise ValueError("trendClamp must have lo < hi")
        return [lo, hi]

    @field_validator("sigmaMax")
    @classmethod
    def validate_sigma_max(cls, v: float) -> float:
        if float(v) <= 0:
            raise ValueError("sigmaMax must be > 0")
        return float(v)

    @field_validator("thresholds")
    @classmethod
    def validate_thresholds(cls, v: Dict[str, Any]) -> Dict[str, float]:
        required = ["A", "B", "C", "D"]
        for k in required:
            if k not in v:
                raise ValueError(f"thresholds missing key {k}")
        return {k: float(v[k]) for k in v}

    @field_validator("multipliers")
    @classmethod
    def validate_multipliers(cls, v: Dict[str, Any]) -> Dict[str, float]:
        required = ["A", "B", "C", "D", "E"]
        for k in required:
            if k not in v:
                raise ValueError(f"multipliers missing key {k}")
        mv = {k: float(v[k]) for k in v}
        for val in mv.values():
            if val <= 0:
                raise ValueError("multipliers must be > 0")
        return mv


class RevenueBandConfigBase(BaseModel):
    name: str
    settings: RevenueBandSettings


class RevenueBandConfigCreate(RevenueBandConfigBase):
    pass


class RevenueBandConfigUpdate(BaseModel):
    name: Optional[str] = None
    settings: Optional[RevenueBandSettings] = None


class RevenueBandConfigResponse(RevenueBandConfigBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class BandPreviewComponents(BaseModel):
    # Raw features
    g1: Optional[float] = None
    g2: Optional[float] = None
    g3: Optional[float] = None
    cagr: Optional[float] = None
    momentum: Optional[float] = None
    volatility: Optional[float] = None
    # Normalized scores (0-100)
    trend_score: Optional[float] = None
    consistency_score: Optional[float] = None
    relative_score: Optional[float] = None
    # Flags and notes
    used_peer_relative: bool = False
    used_robust_trend: bool = False
    confidence_penalty: Optional[float] = None


class BandPreviewResponse(BaseModel):
    """Preview of a team's revenue band and multiplier."""
    team_id: str
    config_id: Optional[str] = None
    composite_score: float
    band: str
    multiplier: float
    components: BandPreviewComponents
