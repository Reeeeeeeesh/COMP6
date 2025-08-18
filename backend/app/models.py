from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, Float, JSON, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta
import uuid

from .database import Base

class Session(Base):
    """Session model for managing anonymous user sessions"""
    __tablename__ = "sessions"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    expires_at = Column(DateTime, nullable=False, default=lambda: datetime.utcnow() + timedelta(hours=24))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    batch_uploads = relationship("BatchUpload", back_populates="session", cascade="all, delete-orphan")
    batch_scenarios = relationship("BatchScenario", back_populates="session", cascade="all, delete-orphan")

class BatchUpload(Base):
    """Model for tracking batch file uploads"""
    __tablename__ = "batch_uploads"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="uploaded")  # uploaded, processing, completed, failed
    total_rows = Column(Integer)
    processed_rows = Column(Integer, default=0)
    failed_rows = Column(Integer, default=0)
    error_message = Column(Text)
    calculation_parameters = Column(JSON)  # Store global calculation parameters
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    session = relationship("Session", back_populates="batch_uploads")
    employee_data = relationship("EmployeeData", back_populates="batch_upload", cascade="all, delete-orphan")
    calculation_results = relationship("BatchCalculationResult", back_populates="batch_upload", cascade="all, delete-orphan")

class EmployeeData(Base):
    """Model for storing employee data from batch uploads"""
    __tablename__ = "employee_data"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    batch_upload_id = Column(String, ForeignKey("batch_uploads.id"), nullable=False)
    row_number = Column(Integer, nullable=False)
    
    # Employee information
    employee_id = Column(String)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String)
    department = Column(String)
    position = Column(String)
    salary = Column(Float)
    hire_date = Column(DateTime)
    
    # Additional data stored as JSON for flexibility
    additional_data = Column(JSON)
    
    # Validation status
    is_valid = Column(Boolean, default=True)
    validation_errors = Column(JSON)
    
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    batch_upload = relationship("BatchUpload", back_populates="employee_data")
    calculation_results = relationship("EmployeeCalculationResult", back_populates="employee_data", cascade="all, delete-orphan")

class BatchScenario(Base):
    """Model for storing batch calculation scenarios"""
    __tablename__ = "batch_scenarios"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    
    # Calculation parameters stored as JSON
    parameters = Column(JSON, nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    session = relationship("Session", back_populates="batch_scenarios")
    calculation_results = relationship("BatchCalculationResult", back_populates="scenario", cascade="all, delete-orphan")
    audit_logs = relationship("ScenarioAuditLog", back_populates="scenario", cascade="all, delete-orphan")

class BatchCalculationResult(Base):
    """Model for storing batch calculation results"""
    __tablename__ = "batch_calculation_results"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    batch_upload_id = Column(String, ForeignKey("batch_uploads.id"), nullable=False)
    scenario_id = Column(String, ForeignKey("batch_scenarios.id"), nullable=True)
    
    # Calculation summary
    total_employees = Column(Integer, nullable=False)
    total_base_salary = Column(Float, nullable=False)
    total_bonus_amount = Column(Float, nullable=False)
    total_bonus_pool = Column(Float, nullable=False)
    average_bonus = Column(Float)
    average_bonus_percentage = Column(Float)
    
    # Metadata
    calculated_at = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
    calculation_parameters = Column(JSON)
    
    # Relationships
    batch_upload = relationship("BatchUpload", back_populates="calculation_results")
    scenario = relationship("BatchScenario", back_populates="calculation_results")
    employee_results = relationship("EmployeeCalculationResult", back_populates="batch_result", cascade="all, delete-orphan")

class EmployeeCalculationResult(Base):
    """Model for storing individual employee calculation results"""
    __tablename__ = "employee_calculation_results"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    employee_data_id = Column(String, ForeignKey("employee_data.id"), nullable=False)
    batch_result_id = Column(String, ForeignKey("batch_calculation_results.id"), nullable=False)
    
    # Calculation results
    base_salary = Column(Float, nullable=False)
    bonus_percentage = Column(Float, nullable=False)
    bonus_amount = Column(Float, nullable=False)
    total_compensation = Column(Float, nullable=False)
    
    # Calculation breakdown stored as JSON
    calculation_breakdown = Column(JSON)
    
    # Metadata
    calculated_at = Column(DateTime, default=func.now())
    
    # Relationships
    employee_data = relationship("EmployeeData", back_populates="calculation_results")
    batch_result = relationship("BatchCalculationResult", back_populates="employee_results")

class ImportTemplate(Base):
    """Model for storing CSV import templates"""
    __tablename__ = "import_templates"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text)


class ParameterPreset(Base):
    """Model for storing calculation parameter presets"""
    __tablename__ = "parameter_presets"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    parameters = Column(JSON, nullable=False)  # Store the parameter configuration
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class ScenarioAuditLog(Base):
    """Model for auditing scenario changes"""
    __tablename__ = "scenario_audit_log"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    scenario_id = Column(String, ForeignKey("batch_scenarios.id"), nullable=False)
    action = Column(String, nullable=False)  # created, updated, deleted, calculated
    
    # Change details
    old_values = Column(JSON)
    new_values = Column(JSON)
    
    # Metadata
    timestamp = Column(DateTime, default=func.now())
    
    # Relationships
    scenario = relationship("BatchScenario", back_populates="audit_logs")


# ==============================================
# Revenue Banding Models
# ==============================================

class Team(Base):
    """Team entity used for revenue banding and grouping."""
    __tablename__ = "teams"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, unique=True, index=True)
    division = Column(String, nullable=True)
    peer_group = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    revenue_history = relationship(
        "TeamRevenueHistory",
        back_populates="team",
        cascade="all, delete-orphan",
    )


class TeamRevenueHistory(Base):
    """Normalized annual revenue series per team (one row per fiscal year)."""
    __tablename__ = "team_revenue_history"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String, ForeignKey("teams.id"), nullable=False, index=True)
    fiscal_year = Column(Integer, nullable=False)
    revenue = Column(Float, nullable=False)
    currency = Column(String, nullable=True)
    is_adjusted = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    team = relationship("Team", back_populates="revenue_history")


class RevenueBandConfig(Base):
    """Configuration for revenue banding thresholds, weights, and multipliers."""
    __tablename__ = "revenue_band_configs"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, unique=True, index=True)
    # Flexible settings blob to hold weights, thresholds, multipliers, etc.
    settings = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==============================================
# Platform Transformation Models (Multi-Tenant)
# ==============================================

class Tenant(Base):
    """Multi-tenant organization model for platform transformation."""
    __tablename__ = "tenants"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, nullable=False, default=True)
    tenant_metadata = Column(JSON, nullable=False, default=lambda: {})
    
    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    input_catalog = relationship("InputCatalog", back_populates="tenant", cascade="all, delete-orphan")
    bonus_plans = relationship("BonusPlan", back_populates="tenant", cascade="all, delete-orphan")


class User(Base):
    """Platform user model with role-based access control."""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    display_name = Column(String)
    role = Column(String, nullable=False, default="readonly")  # admin, hr, manager, auditor, readonly
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    created_plans = relationship("BonusPlan", foreign_keys="BonusPlan.created_by", back_populates="creator")
    locked_plans = relationship("BonusPlan", foreign_keys="BonusPlan.locked_by", back_populates="locker")
    audit_events = relationship("AuditEvent", back_populates="actor")
    
    # Unique constraint on tenant + email
    __table_args__ = (
        {'schema': None},  # Will be set to 'comp' schema in production
    )


class InputCatalog(Base):
    """Catalog of input parameters for bonus calculations."""
    __tablename__ = "input_catalog"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    key = Column(String, nullable=False)  # e.g., 'employee_score', 'aum', 'fund_return'
    label = Column(String, nullable=False)
    dtype = Column(String, nullable=False)  # decimal, int, text, date, bool
    required = Column(Boolean, nullable=False, default=False)
    default_value = Column(JSON)
    validation = Column(JSON, nullable=False, default=lambda: {})
    created_at = Column(DateTime, nullable=False, default=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="input_catalog")
    plan_inputs = relationship("PlanInput", back_populates="input_definition")
    
    # Unique constraint on tenant + key
    __table_args__ = (
        {'schema': None},
    )


class BonusPlan(Base):
    """Configurable bonus calculation plans."""
    __tablename__ = "bonus_plans"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String, nullable=False)  # e.g., "2025 Analyst Bonus Plan"
    version = Column(Integer, nullable=False)  # immutable after lock
    status = Column(String, nullable=False, default="draft")  # draft, approved, locked, archived
    effective_from = Column(DateTime)
    effective_to = Column(DateTime)
    notes = Column(Text)
    plan_metadata = Column(JSON, nullable=False, default=lambda: {})
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, nullable=False, default=func.now())
    locked_by = Column(String, ForeignKey("users.id"))
    locked_at = Column(DateTime)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="bonus_plans")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_plans")
    locker = relationship("User", foreign_keys=[locked_by], back_populates="locked_plans")
    plan_inputs = relationship("PlanInput", back_populates="plan", cascade="all, delete-orphan")
    plan_steps = relationship("PlanStep", back_populates="plan", cascade="all, delete-orphan")
    bonus_pools = relationship("BonusPool", back_populates="plan", cascade="all, delete-orphan")
    plan_runs = relationship("PlanRun", back_populates="plan")
    
    # Unique constraint on tenant + name + version
    __table_args__ = (
        {'schema': None},
    )


class PlanInput(Base):
    """Input parameters associated with a bonus plan."""
    __tablename__ = "plan_inputs"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    plan_id = Column(String, ForeignKey("bonus_plans.id"), nullable=False, index=True)
    input_id = Column(String, ForeignKey("input_catalog.id"), nullable=False)
    required = Column(Boolean, nullable=False, default=True)
    source_mapping = Column(JSON, nullable=False, default=lambda: {})  # CSV column names, transforms
    
    # Relationships
    plan = relationship("BonusPlan", back_populates="plan_inputs")
    input_definition = relationship("InputCatalog", back_populates="plan_inputs")


class PlanStep(Base):
    """Individual calculation steps within a bonus plan."""
    __tablename__ = "plan_steps"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    plan_id = Column(String, ForeignKey("bonus_plans.id"), nullable=False, index=True)
    step_order = Column(Integer, nullable=False)
    name = Column(String, nullable=False)  # e.g., "performance_multiplier"
    expr = Column(Text, nullable=False)  # DSL or CEL/JSONLogic string
    condition_expr = Column(Text)  # optional IF guard
    outputs = Column(JSON, nullable=False, default=lambda: [])  # which variables this step defines
    notes = Column(Text)
    
    # Relationships
    plan = relationship("BonusPlan", back_populates="plan_steps")
    
    # Unique constraint on plan + step_order
    __table_args__ = (
        {'schema': None},
    )


class BonusPool(Base):
    """Bonus pool definitions for plans."""
    __tablename__ = "bonus_pools"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    plan_id = Column(String, ForeignKey("bonus_plans.id"), nullable=False, index=True)
    currency = Column(String(3), nullable=False)
    amount = Column(Numeric(38, 10), nullable=False)  # High precision for financial calculations
    allocation_rules = Column(JSON, nullable=False, default=lambda: [])
    created_at = Column(DateTime, nullable=False, default=func.now())
    
    # Relationships
    plan = relationship("BonusPlan", back_populates="bonus_pools")


class PlatformUpload(Base):
    """Enhanced upload tracking for platform transformation."""
    __tablename__ = "platform_uploads"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    created_by = Column(String, ForeignKey("users.id"))
    filename = Column(String, nullable=False)
    status = Column(String, nullable=False, default="received")  # received, processing, failed, ready
    file_size = Column(Integer)
    upload_metadata = Column(JSON, nullable=False, default=lambda: {})
    created_at = Column(DateTime, nullable=False, default=func.now())
    
    # Relationships
    employee_rows = relationship("EmployeeRow", back_populates="upload", cascade="all, delete-orphan")
    plan_runs = relationship("PlanRun", back_populates="upload")


class EmployeeRow(Base):
    """Employee data rows from platform uploads."""
    __tablename__ = "employee_rows"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    upload_id = Column(String, ForeignKey("platform_uploads.id"), nullable=False, index=True)
    employee_ref = Column(String, nullable=False)  # external id or HR id
    raw = Column(JSON, nullable=False)  # raw mapped fields as JSON
    created_at = Column(DateTime, nullable=False, default=func.now())
    
    # Relationships
    upload = relationship("PlatformUpload", back_populates="employee_rows")


class PlanRun(Base):
    """Execution runs of bonus plans."""
    __tablename__ = "plan_runs"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    plan_id = Column(String, ForeignKey("bonus_plans.id"), nullable=False, index=True)
    upload_id = Column(String, ForeignKey("platform_uploads.id"))
    scenario_name = Column(String)
    approvals_state = Column(JSON, nullable=False, default=lambda: {"state": "draft", "history": []})
    snapshot_hash = Column(String, nullable=False)  # hash of plan+steps+inputs+funcs
    started_at = Column(DateTime, nullable=False, default=func.now())
    finished_at = Column(DateTime)
    status = Column(String, nullable=False, default="draft")  # draft, manager_approved, hr_approved, finance_approved, finalized, failed
    
    # Relationships
    plan = relationship("BonusPlan", back_populates="plan_runs")
    upload = relationship("PlatformUpload", back_populates="plan_runs")
    step_results = relationship("RunStepResult", back_populates="run", cascade="all, delete-orphan")
    totals = relationship("RunTotals", back_populates="run", uselist=False, cascade="all, delete-orphan")


class RunStepResult(Base):
    """Results of individual calculation steps per employee."""
    __tablename__ = "run_step_results"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String, ForeignKey("plan_runs.id"), nullable=False, index=True)
    employee_ref = Column(String, nullable=False)
    step_name = Column(String, nullable=False)
    value = Column(JSON, nullable=False)  # store numeric as string inside JSON for precision
    created_at = Column(DateTime, nullable=False, default=func.now())
    
    # Relationships
    run = relationship("PlanRun", back_populates="step_results")


class RunTotals(Base):
    """Aggregated totals for plan runs."""
    __tablename__ = "run_totals"
    
    run_id = Column(String, ForeignKey("plan_runs.id"), primary_key=True)
    totals = Column(JSON, nullable=False, default=lambda: {})  # aggregated metrics, pool usage, etc.
    
    # Relationships
    run = relationship("PlanRun", back_populates="totals")


class AuditEvent(Base):
    """Comprehensive audit trail for platform actions."""
    __tablename__ = "audit_events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)  # Use bigserial equivalent
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    actor_user_id = Column(String, ForeignKey("users.id"))
    action = Column(String, nullable=False)  # 'plan.create', 'run.finalize', etc.
    entity = Column(String, nullable=False)  # 'bonus_plan', 'plan_run', 'upload', ...
    entity_id = Column(String, nullable=False)
    before = Column(JSON)
    after = Column(JSON)
    at = Column(DateTime, nullable=False, default=func.now())
    signature = Column(String)  # optional tamper-evident chain
    
    # Relationships
    actor = relationship("User", back_populates="audit_events")
