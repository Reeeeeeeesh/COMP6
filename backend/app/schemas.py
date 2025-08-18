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
