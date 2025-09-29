from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

# Export all schemas for easier imports
__all__ = [
    # Base schemas
    "SessionBase", "SessionCreate", "SessionResponse",
    
    # Batch schemas
    "BatchParameters", "CategoryParameters", "CategoryBasedBatchParameters",
    "ParameterPresetBase", "ParameterPresetCreate", "ParameterPresetUpdate", "ParameterPreset",
    "BatchUploadBase", "BatchUploadCreate", "BatchUploadUpdate", "BatchUploadResponse",
    
    # Employee schemas
    "EmployeeDataBase", "EmployeeDataCreate", "EmployeeDataResponse",
    
    # Scenario schemas  
    "BatchScenarioBase", "BatchScenarioCreate", "BatchScenarioUpdate", "BatchScenarioResponse",
    
    # Calculation schemas
    "EmployeeCalculationResultBase", "EmployeeCalculationResultCreate", "EmployeeCalculationResultResponse",
    "BatchCalculationResultBase", "BatchCalculationResultCreate", "BatchCalculationResultResponse",
    
    # Template schemas
    "ImportTemplateBase", "ImportTemplateCreate", "ImportTemplateUpdate", "ImportTemplateResponse",
    
    # Audit schemas
    "ScenarioAuditLogBase", "ScenarioAuditLogCreate", "ScenarioAuditLogResponse",
    
    # Revenue Banding schemas
    "TeamBase", "TeamCreate", "TeamUpdate", "TeamResponse",
    "TeamRevenueHistoryBase", "TeamRevenueHistoryCreate", "TeamRevenueHistoryResponse",
    "RevenueBandSettings", "RevenueBandConfigBase", "RevenueBandConfigCreate", 
    "RevenueBandConfigUpdate", "RevenueBandConfigResponse",
    "BandPreviewComponents", "BandPreviewResponse",
    
    # Platform schemas
    "TenantBase", "TenantCreate", "TenantUpdate", "TenantResponse",
    "UserBase", "UserCreate", "UserUpdate", "UserResponse",
    "InputCatalogBase", "InputCatalogCreate", "InputCatalogUpdate", "InputCatalogResponse",
    "BonusPlanBase", "BonusPlanCreate", "BonusPlanUpdate", "BonusPlanResponse",
    "PlanStepBase", "PlanStepCreate", "PlanStepUpdate", "PlanStepResponse",
    "PlanInputBase", "PlanInputCreate", "PlanInputResponse",
    "PlanRunBase", "PlanRunCreate", "PlanRunUpdate", "PlanRunResponse",
    "AuditEventBase", "AuditEventCreate", "AuditEventResponse",
    
    # Bonus Statement schemas
    "BonusStatementRequest", "BonusStatementData", "BonusStatementResponse",
    
    # RAF schemas
    "RAFMethod", "RAFConfigBase", "RAFConfigCreate", "RAFConfigUpdate", "RAFConfigResponse",
    "RAFPreviewRequest", "RAFPreviewResponse", "RAFApprovalRequest",
    "TeamRevenueHistoryRow", "TeamRevenueHistoryImport", 
    "TeamRevenueDataBase", "TeamRevenueDataCreate", "TeamRevenueDataResponse",
    "OrgMembershipBase", "OrgMembershipCreate", "OrgMembershipResponse",
    "RAFStatusResponse", "RAFHistoryEvent", "RAFHistoryResponse",
    
    # Executive Reporting schemas
    "PoolVsTargetAnalysis", "TrendDataPoint", "ExecutiveSummary", 
    "ReportingFilters", "DynamicReportRequest",
    
    # API Response schemas
    "ApiResponse", "PlatformApiResponse",

    # Payout + Exceptions + Payroll
    "PayoutTranche", "PayoutPolicyBase", "PayoutPolicyCreate", "PayoutPolicyResponse",
    "PayoutLegBase", "PayoutLegResponse", "PayoutSummary",
    "ExceptionSeverity", "ExceptionStatus", "ExceptionEventBase", "ExceptionEventCreate", "ExceptionEventResponse",
    "PayrollExportRequest", "PayrollExportResponse"
]

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
    # When true, use row-level values from the uploaded CSV if present
    # for these fields: target_bonus_pct, investment_weight, qualitative_weight,
    # investment_score_multiplier, qual_score_multiplier, mrt_cap_pct.
    # RAF still follows useDirectRaf behavior.
    useRowValuesWhenPresent: bool = False
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
        from_attributes = True


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


# ==============================================
# Platform Transformation Schemas
# ==============================================

class TenantBase(BaseModel):
    name: str
    is_active: bool = True
    tenant_metadata: Dict[str, Any] = {}

class TenantCreate(TenantBase):
    pass

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    tenant_metadata: Optional[Dict[str, Any]] = None

class TenantResponse(TenantBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    created_at: datetime
    updated_at: datetime


class UserBase(BaseModel):
    email: str
    display_name: Optional[str] = None
    role: str = "readonly"  # admin, hr, manager, auditor, readonly
    is_active: bool = True

class UserCreate(UserBase):
    tenant_id: str

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime


class InputCatalogBase(BaseModel):
    key: str
    label: str
    dtype: str  # decimal, int, text, date, bool
    required: bool = False
    default_value: Optional[Any] = None
    validation: Dict[str, Any] = {}

class InputCatalogCreate(InputCatalogBase):
    tenant_id: str

class InputCatalogUpdate(BaseModel):
    label: Optional[str] = None
    dtype: Optional[str] = None
    required: Optional[bool] = None
    default_value: Optional[Any] = None
    validation: Optional[Dict[str, Any]] = None

class InputCatalogResponse(InputCatalogBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    tenant_id: str
    created_at: datetime


class BonusPlanBase(BaseModel):
    name: str
    version: int
    status: str = "draft"
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    notes: Optional[str] = None
    plan_metadata: Dict[str, Any] = {}

class BonusPlanCreate(BonusPlanBase):
    tenant_id: str
    created_by: Optional[str] = None

class BonusPlanUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    notes: Optional[str] = None
    plan_metadata: Optional[Dict[str, Any]] = None

class BonusPlanResponse(BonusPlanBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    tenant_id: str
    created_by: Optional[str] = None
    created_at: datetime
    locked_by: Optional[str] = None
    locked_at: Optional[datetime] = None


class PlanStepBase(BaseModel):
    step_order: int
    name: str
    expr: str
    condition_expr: Optional[str] = None
    outputs: List[str] = []
    notes: Optional[str] = None

class PlanStepCreate(PlanStepBase):
    plan_id: str

class PlanStepUpdate(BaseModel):
    step_order: Optional[int] = None
    name: Optional[str] = None
    expr: Optional[str] = None
    condition_expr: Optional[str] = None
    outputs: Optional[List[str]] = None
    notes: Optional[str] = None

class PlanStepResponse(PlanStepBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    plan_id: str


class PlanInputBase(BaseModel):
    required: bool = True
    source_mapping: Dict[str, Any] = {}

class PlanInputCreate(PlanInputBase):
    plan_id: str
    input_id: str

class PlanInputResponse(PlanInputBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    plan_id: str
    input_id: str


class PlanRunBase(BaseModel):
    scenario_name: Optional[str] = None
    approvals_state: Dict[str, Any] = {"state": "draft", "history": []}
    snapshot_hash: str
    status: str = "draft"

class PlanRunCreate(PlanRunBase):
    tenant_id: str
    plan_id: str
    upload_id: Optional[str] = None

class PlanRunUpdate(BaseModel):
    scenario_name: Optional[str] = None
    approvals_state: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    finished_at: Optional[datetime] = None

class PlanRunResponse(PlanRunBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    tenant_id: str
    plan_id: str
    upload_id: Optional[str] = None
    started_at: datetime
    finished_at: Optional[datetime] = None


class AuditEventBase(BaseModel):
    action: str
    entity: str
    entity_id: str
    before: Optional[Dict[str, Any]] = None
    after: Optional[Dict[str, Any]] = None
    signature: Optional[str] = None

class AuditEventCreate(AuditEventBase):
    tenant_id: str
    actor_user_id: Optional[str] = None

class AuditEventResponse(AuditEventBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    tenant_id: str
    actor_user_id: Optional[str] = None
    at: datetime


# Platform API responses
class PlatformApiResponse(BaseModel):
    """Enhanced API response for platform transformation."""
    success: bool
    message: Optional[str] = None
    data: Optional[Any] = None
    error: Optional[str] = None
    tenant_id: Optional[str] = None
    timestamp: datetime = datetime.utcnow()


# ================================
# Bonus Statement Schemas (Task 20)
# ================================

class BonusStatementRequest(BaseModel):
    """Request model for generating individual bonus statements."""
    employee_ref: str
    format: str = Field(..., description="Statement format: 'pdf' or 'xlsx'")
    include_calculation_steps: bool = Field(default=True, description="Include step-by-step calculation breakdown")
    company_name: Optional[str] = Field(default="Fund Management Company", description="Company name for statement header")
    statement_date: Optional[datetime] = Field(default_factory=datetime.utcnow, description="Statement generation date")
    
    @field_validator('format')
    @classmethod
    def validate_format(cls, v):
        if v.lower() not in ['pdf', 'xlsx']:
            raise ValueError("Format must be 'pdf' or 'xlsx'")
        return v.lower()

class BonusStatementData(BaseModel):
    """Comprehensive data model for bonus statement generation."""
    model_config = ConfigDict(from_attributes=True)
    
    # Employee Information
    employee_ref: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[datetime] = None
    
    # Compensation Information
    base_salary: float
    bonus_percentage: float
    bonus_amount: float
    total_compensation: float
    
    # Plan Information
    plan_name: str
    plan_version: int
    calculation_date: datetime
    
    # Statement Metadata
    statement_date: datetime
    company_name: str
    
    # Optional Calculation Steps (from Task 18)
    calculation_steps: Optional[List[Dict[str, Any]]] = None

class BonusStatementResponse(BaseModel):
    """Response model for generated bonus statements."""
    success: bool
    employee_ref: str
    format: str
    file_size_bytes: int
    generation_time_seconds: float
    download_url: Optional[str] = None
    filename: str
    message: Optional[str] = None


# ================================
# Team RAF Schemas
# ================================

class RAFMethod(str, Enum):
    """Enumeration of available RAF calculation methods."""
    CAGR_3Y = "CAGR_3Y"
    AVG_YOY_3Y = "AVG_YOY_3Y"


class RAFConfigBase(BaseModel):
    """Base schema for RAF configuration."""
    team_id: str
    cycle: str  # Can be string or int representation
    method: RAFMethod
    include_perf_fees: bool = False
    const_currency: bool = False
    cap_factor: Optional[float] = Field(None, ge=0, description="Cap factor must be >= 0")
    floor_factor: Optional[float] = Field(None, gt=0, description="Floor factor must be > 0")
    weight_pct: float = Field(100.0, gt=0, le=100, description="Weight percentage must be between 0 and 100")

    @field_validator('cap_factor')
    @classmethod
    def validate_cap_factor(cls, v):
        if v is not None and v < 0:
            raise ValueError("Cap factor must be >= 0")
        return v
    
    @field_validator('floor_factor')
    @classmethod
    def validate_floor_factor(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Floor factor must be > 0")
        return v


class RAFConfigCreate(RAFConfigBase):
    """Schema for creating a new RAF configuration."""
    pass


class RAFConfigUpdate(BaseModel):
    """Schema for updating an existing RAF configuration."""
    method: Optional[RAFMethod] = None
    include_perf_fees: Optional[bool] = None
    const_currency: Optional[bool] = None
    cap_factor: Optional[float] = Field(None, ge=0, description="Cap factor must be >= 0")
    floor_factor: Optional[float] = Field(None, gt=0, description="Floor factor must be > 0")
    weight_pct: Optional[float] = Field(None, gt=0, le=100, description="Weight percentage must be between 0 and 100")


class RAFConfigResponse(RAFConfigBase):
    """Schema for RAF configuration response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    status: str
    created_by: str
    created_at: datetime
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rationale: Optional[str] = None


class RAFPreviewRequest(BaseModel):
    """Schema for requesting a RAF calculation preview."""
    config_id: str


class RAFPreviewResponse(BaseModel):
    """Schema for RAF calculation preview response."""
    config_id: str
    team_id: str
    cycle: str
    method: RAFMethod
    computed_factor: float
    original_factor: float
    cap_applied: bool
    floor_applied: bool
    explanation_tape: Dict[str, Any]  # Changed from List to Dict as per requirements
    weight_pct: float
    status: str
    inputs_hash: Optional[str] = None


class RAFApprovalRequest(BaseModel):
    """Schema for RAF approval request."""
    rationale: str = Field(..., min_length=10, max_length=1000, description="Rationale for RAF approval")
    approver_id: Optional[str] = Field(None, description="Approver ID if not implied from context")


class TeamRevenueHistoryRow(BaseModel):
    """Schema for individual team revenue history row."""
    team_code: str
    fiscal_year: int
    reported_revenue: float
    organic_revenue: Optional[float] = None
    currency: str
    perf_fee_component: Optional[float] = None
    notes: Optional[str] = None

    @field_validator('fiscal_year')
    @classmethod
    def validate_fiscal_year(cls, v):
        if v < 1900 or v > 2100:
            raise ValueError("Fiscal year must be between 1900 and 2100")
        return v

    @field_validator('reported_revenue', 'organic_revenue', 'perf_fee_component')
    @classmethod
    def validate_revenue_fields(cls, v):
        if v is not None and v < 0:
            raise ValueError("Revenue values must be non-negative")
        return v


class TeamRevenueHistoryImport(BaseModel):
    """Schema for team revenue history CSV import."""
    team_id: str
    file_id: Optional[str] = None
    rows: Optional[List[TeamRevenueHistoryRow]] = None


class TeamRevenueDataBase(BaseModel):
    """Base schema for team revenue data."""
    fiscal_year: int
    reported_revenue: float
    organic_revenue: Optional[float] = None
    currency: str
    perf_fee_component: Optional[float] = None
    notes: Optional[str] = None


class TeamRevenueDataCreate(TeamRevenueDataBase):
    """Schema for creating team revenue data."""
    team_id: str
    file_id: Optional[str] = None


class TeamRevenueDataResponse(TeamRevenueDataBase):
    """Schema for team revenue data response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    team_id: str
    created_at: datetime


class OrgMembershipBase(BaseModel):
    """Base schema for organization membership."""
    employee_id: str
    team_code: str
    start_date: datetime
    end_date: Optional[datetime] = None


class OrgMembershipCreate(OrgMembershipBase):
    """Schema for creating organization membership."""
    pass


class OrgMembershipResponse(OrgMembershipBase):
    """Schema for organization membership response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    created_at: datetime
    is_active: bool


class RAFStatusResponse(BaseModel):
    """Schema for RAF status response."""
    team_id: str
    cycle: str
    has_config: bool
    config_id: Optional[str] = None
    status: Optional[str] = None
    method: Optional[str] = None
    include_perf_fees: Optional[bool] = None
    const_currency: Optional[bool] = None
    cap_factor: Optional[float] = None
    floor_factor: Optional[float] = None
    weight_pct: Optional[float] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rationale: Optional[str] = None
    has_snapshot: Optional[bool] = None
    snapshot_id: Optional[str] = None
    computed_factor: Optional[float] = None
    inputs_hash: Optional[str] = None
    cap_applied: Optional[bool] = None
    floor_applied: Optional[bool] = None


class RAFHistoryEvent(BaseModel):
    """Schema for RAF history event."""
    event: str
    timestamp: str
    user_id: str
    user_email: str
    details: Dict[str, Any]


class RAFHistoryResponse(BaseModel):
    """Schema for RAF history response."""
    team_id: str
    cycle: str
    has_config: bool
    config_id: Optional[str] = None
    status: Optional[str] = None
    history: List[RAFHistoryEvent] = []


# ================================
# Executive Reporting Schemas (Task 21)
# ================================

class PoolVsTargetAnalysis(BaseModel):
    """Pool vs target analysis for executive reporting."""
    plan_id: str
    plan_name: str
    target_pool: Optional[float] = None
    actual_pool: float
    pool_utilization: float  # actual / target ratio
    employee_count: int
    avg_bonus_per_employee: float
    variance_from_target: Optional[float] = None
    status: str  # over_target, under_target, on_target, no_target
    last_calculated: datetime

class TrendDataPoint(BaseModel):
    """Single data point for trend analysis."""
    period: str  # "2025-08", "Q3-2025", etc.
    metric_name: str
    value: float
    comparison_value: Optional[float] = None  # previous period
    change_percentage: Optional[float] = None

class ExecutiveSummary(BaseModel):
    """Executive summary for dynamic reporting."""
    tenant_id: str
    reporting_period: str
    total_plans_executed: int
    total_employees_processed: int
    total_bonus_pool_distributed: float
    average_bonus_percentage: float
    pool_vs_target_summary: Dict[str, Any]
    trending_metrics: List[TrendDataPoint]
    top_performing_plans: List[Dict[str, Any]]
    generated_at: datetime

class ReportingFilters(BaseModel):
    """Filters for dynamic reporting requests."""
    tenant_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    plan_ids: Optional[List[str]] = None
    department_filter: Optional[str] = None
    include_archived: bool = False
    metric_types: Optional[List[str]] = None  # pool_analysis, trends, summary

class DynamicReportRequest(BaseModel):
    """Request model for dynamic reporting."""
    report_type: str = Field(..., description="Type of report: 'pool_analysis', 'trends', 'executive_summary'")
    filters: ReportingFilters
    grouping: Optional[str] = Field(default="month", description="Time grouping: 'day', 'week', 'month', 'quarter'")
    include_details: bool = Field(default=False, description="Include detailed breakdown data")
    
    @field_validator('report_type')
    @classmethod
    def validate_report_type(cls, v):
        valid_types = ['pool_analysis', 'trends', 'executive_summary', 'combined']
        if v not in valid_types:
            raise ValueError(f"Report type must be one of: {valid_types}")
        return v


# ==============================================
# Payout Policy & Legs Schemas
# ==============================================

class PayoutTranche(BaseModel):
    percentage: float = Field(..., ge=0, le=100)
    instrument: str = Field(..., description="cash|fund_units|phantom")
    grant_offset_days: Optional[int] = 0
    vest_offset_days: Optional[int] = 0
    retention_offset_days: Optional[int] = 0
    currency: Optional[str] = None

    @field_validator('instrument')
    @classmethod
    def validate_instrument(cls, v: str):
        allowed = {'cash', 'fund_units', 'phantom'}
        if v not in allowed:
            raise ValueError(f"instrument must be one of {sorted(allowed)}")
        return v


class PayoutPolicyBase(BaseModel):
    cycle: str
    population: str  # MRT or non-MRT
    rules: Dict[str, Any] = Field(..., description="{ tranches: PayoutTranche[] }")

    @field_validator('population')
    @classmethod
    def validate_population(cls, v: str):
        allowed = {'MRT', 'non-MRT'}
        if v not in allowed:
            raise ValueError("population must be 'MRT' or 'non-MRT'")
        return v

    @field_validator('rules')
    @classmethod
    def validate_rules(cls, v: Dict[str, Any]):
        tranches = v.get('tranches', []) or []
        if not isinstance(tranches, list) or len(tranches) == 0:
            raise ValueError('rules.tranches must be a non-empty list')
        # Validate sum of percentages
        pct_sum = 0.0
        for t in tranches:
            if isinstance(t, dict):
                pct = float(t.get('percentage', 0))
            elif isinstance(t, PayoutTranche):
                pct = float(t.percentage)
            else:
                raise ValueError('invalid tranche entry')
            pct_sum += pct
        if abs(pct_sum - 100.0) > 1e-6:
            raise ValueError('tranche percentages must sum to 100')
        return v


class PayoutPolicyCreate(PayoutPolicyBase):
    version: Optional[int] = 1


class PayoutPolicyResponse(PayoutPolicyBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    version: int
    status: str
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime


class PayoutLegBase(BaseModel):
    employee_calculation_result_id: str
    leg_number: int
    amount: float
    instrument: str
    grant_date: Optional[datetime] = None
    vest_date: Optional[datetime] = None
    retention_end_date: Optional[datetime] = None
    currency: Optional[str] = None
    policy_version: Optional[int] = None
    status: str = 'pending'


class PayoutLegResponse(PayoutLegBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime


class PayoutSummary(BaseModel):
    total_amount: float
    cash_amount: float
    deferred_amount: float
    legs: List[PayoutLegResponse]
    earliest_vest: Optional[datetime] = None
    latest_vest: Optional[datetime] = None


# ==============================================
# Exception Schemas
# ==============================================

class ExceptionSeverity(str, Enum):
    warning = 'warning'
    error = 'error'
    critical = 'critical'


class ExceptionStatus(str, Enum):
    open = 'open'
    acknowledged = 'acknowledged'
    resolved = 'resolved'


class ExceptionEventBase(BaseModel):
    source: str
    reference_id: Optional[str] = None
    exception_code: str
    severity: ExceptionSeverity = ExceptionSeverity.warning
    status: ExceptionStatus = ExceptionStatus.open
    context: Optional[Dict[str, Any]] = None


class ExceptionEventCreate(ExceptionEventBase):
    pass


class ExceptionEventResponse(ExceptionEventBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None


# ==============================================
# Payroll Export Schemas
# ==============================================

class PayrollExportRequest(BaseModel):
    batch_result_id: str
    pay_date: datetime
    format: Optional[str] = 'csv'  # csv, adp, sage

    @field_validator('format')
    @classmethod
    def validate_format(cls, v: str):
        allowed = {'csv', 'adp', 'sage'}
        if v not in allowed:
            raise ValueError(f"format must be one of {sorted(allowed)}")
        return v


class PayrollExportResponse(BaseModel):
    success: bool
    filename: str
    download_url: str
    checksum_sha256: str
    exported_count: int


# ==============================================
# Connector & Pilot Schemas
# ==============================================

class ConnectorConfigCreate(BaseModel):
    connector_type: str  # hris, payroll, dwh
    system_name: str     # workday, adp, snowflake
    config: Dict[str, Any]
    enabled: bool = False

class ConnectorConfigResponse(BaseModel):
    id: str
    connector_type: str
    system_name: str
    enabled: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ConnectorRunRequest(BaseModel):
    data_type: str
    filters: Optional[Dict[str, Any]] = None

class ConnectorRunResponse(BaseModel):
    success: bool
    run_id: Optional[str]
    upload_id: Optional[str]
    message: Optional[str]

class PilotSetupRequest(BaseModel):
    pilot_id: Optional[str] = None
    config: Dict[str, Any] = {}

class PilotExecutionRequest(BaseModel):
    reference_data: Dict[str, Any]

class VarianceAnalysisResponse(BaseModel):
    within_tolerance: bool
    tolerance_pct: float

class PilotReportResponse(BaseModel):
    pilot_id: str
    status: str
    created_at: Optional[str] = None
    variance: Optional[Dict[str, Any]] = None
    results: Optional[Dict[str, Any]] = None

# ==============================================
# Malus/Clawback Schemas
# ==============================================

class RiskEventCreate(BaseModel):
    employee_id: str
    cycle: str
    event_type: str  # conduct_breach, risk_threshold, manual_adjustment
    decision: str    # malus, clawback, waive
    amount_or_percentage: float
    is_percentage: bool = False
    currency: Optional[str] = None
    occurred_at: Optional[datetime] = None
    rationale: Optional[str] = None

    @field_validator('event_type')
    @classmethod
    def _validate_event_type(cls, v: str) -> str:
        allowed = {"conduct_breach", "risk_threshold", "manual_adjustment"}
        if v not in allowed:
            raise ValueError("invalid event_type")
        return v

    @field_validator('decision')
    @classmethod
    def _validate_decision(cls, v: str) -> str:
        allowed = {"malus", "clawback", "waive"}
        if v not in allowed:
            raise ValueError("invalid decision")
        return v

    @field_validator('amount_or_percentage')
    @classmethod
    def _validate_amount(cls, v: float, info):
        is_pct = info.data.get('is_percentage', False)
        if is_pct and not (0 <= float(v) <= 100):
            raise ValueError('percentage must be between 0 and 100')
        if not is_pct and float(v) < 0:
            raise ValueError('amount must be non-negative')
        return v


class PayoutAmendmentResponse(BaseModel):
    id: str
    original_leg_id: str
    risk_event_id: str
    amendment_type: str
    original_amount: float
    adjusted_amount: float
    effective_date: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RiskEventResponse(BaseModel):
    id: str
    employee_id: str
    cycle: str
    event_type: str
    decision: str
    amount_or_percentage: float
    is_percentage: bool
    currency: Optional[str] = None
    rationale: Optional[str] = None
    approver_id: Optional[str] = None
    approved_at: Optional[datetime] = None
    status: str
    occurred_at: datetime
    created_at: datetime
    amendments: List[PayoutAmendmentResponse] = []

    model_config = ConfigDict(from_attributes=True)


class MalusRequest(BaseModel):
    cycle: str
    amount_or_percentage: float
    is_percentage: bool = True
    currency: Optional[str] = None
    rationale: Optional[str] = None

    @field_validator('amount_or_percentage')
    @classmethod
    def _validate_malus_amount(cls, v: float, info):
        if info.data.get('is_percentage', True):
            if not (0 <= float(v) <= 100):
                raise ValueError('malus percentage must be 0-100')
        else:
            if float(v) < 0:
                raise ValueError('malus amount must be non-negative')
        return v


class ClawbackRequest(BaseModel):
    cycle: str
    amount_or_percentage: float
    is_percentage: bool = False
    currency: Optional[str] = None
    rationale: Optional[str] = None

    @field_validator('amount_or_percentage')
    @classmethod
    def _validate_clawback_amount(cls, v: float, info):
        if info.data.get('is_percentage', False):
            if not (0 <= float(v) <= 100):
                raise ValueError('clawback percentage must be 0-100')
        else:
            if float(v) < 0:
                raise ValueError('clawback amount must be non-negative')
        return v


class RestatementRequest(BaseModel):
    cycle: str
    include_amendment_history: bool = True
    include_delta_summary: bool = True
