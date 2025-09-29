from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, Float, JSON, Numeric, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
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
    payout_generated = Column(Boolean, nullable=False, default=False)
    
    # Relationships
    employee_data = relationship("EmployeeData", back_populates="calculation_results")
    batch_result = relationship("BatchCalculationResult", back_populates="employee_results")
    payout_legs = relationship("PayoutLeg", back_populates="employee_result", cascade="all, delete-orphan")

    def has_payouts(self) -> bool:
        return bool(self.payout_legs)

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
    
    # File storage and integrity columns
    bytes_hash = Column(String, nullable=True, index=True)  # SHA-256 checksum for file integrity
    storage_path = Column(String, nullable=True, index=True)  # Path to stored file
    lineage_metadata = Column(JSON, nullable=True, default=lambda: {})  # File lineage tracking
    
    created_at = Column(DateTime, nullable=False, default=func.now())
    
    # Relationships
    employee_rows = relationship("EmployeeRow", back_populates="upload", cascade="all, delete-orphan")
    plan_runs = relationship("PlanRun", back_populates="upload")
    
    def verify_file_integrity(self, file_store) -> bool:
        """
        Verify file integrity using stored checksum.
        
        Args:
            file_store: FileStore instance for verification
            
        Returns:
            bool: True if file integrity is verified, False otherwise
        """
        if not self.bytes_hash or not self.storage_path:
            return False
        
        try:
            return file_store.verify_checksum(self.storage_path, self.bytes_hash)
        except Exception:
            return False
    
    def get_lineage_info(self) -> dict:
        """
        Get file lineage information.
        
        Returns:
            dict: Lineage metadata with processing history
        """
        return self.lineage_metadata or {}
    
    def update_lineage(self, event_type: str, details: dict):
        """
        Update file lineage with new event.
        
        Args:
            event_type: Type of lineage event (e.g., 'upload', 'validation', 'processing')
            details: Event details to record
        """
        if not self.lineage_metadata:
            self.lineage_metadata = {"events": []}
        
        if "events" not in self.lineage_metadata:
            self.lineage_metadata["events"] = []
        
        self.lineage_metadata["events"].append({
            "type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details
        })


# ==============================================
# Connector Models
# ==============================================

class ConnectorConfig(Base):
    """External connector configuration (HRIS/Payroll/DWH)."""
    __tablename__ = "connector_config"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    connector_type = Column(String, nullable=False, index=True)  # hris, payroll, dwh
    system_name = Column(String, nullable=False, index=True)     # workday, adp, snowflake
    config_json = Column(JSON, nullable=False, default=lambda: {})
    enabled = Column(Boolean, nullable=False, default=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    tenant = relationship("Tenant")
    creator = relationship("User")
    runs = relationship("ConnectorRun", back_populates="config", cascade="all, delete-orphan")

    def is_enabled(self) -> bool:
        return bool(self.enabled)

    def get_decrypted_config(self) -> Dict[str, Any]:
        # Placeholder for secret management integration; returns config_json as-is
        return self.config_json or {}

    def get_last_successful_run(self):
        if not self.runs:
            return None
        completed = [r for r in self.runs if r.status == 'completed']
        return sorted(completed, key=lambda r: r.finished_at or r.started_at)[-1] if completed else None


class ConnectorRun(Base):
    """Connector run execution record for extracts and deliveries."""
    __tablename__ = "connector_run"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    config_id = Column(String, ForeignKey("connector_config.id"), nullable=False, index=True)
    run_type = Column(String, nullable=False)  # extract, deliver
    status = Column(String, nullable=False, default='running')  # running, completed, failed
    started_at = Column(DateTime, nullable=False, default=func.now())
    finished_at = Column(DateTime, nullable=True)
    records_processed = Column(Integer, nullable=True)
    output_file_id = Column(String, ForeignKey("platform_uploads.id"), nullable=True)
    error_message = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)

    config = relationship("ConnectorConfig", back_populates="runs")
    output_file = relationship("PlatformUpload")


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


# ==============================================
# Team RAF Models
# ==============================================

class RAFConfig(Base):
    """Configuration for team RAF calculation."""
    __tablename__ = "raf_config"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    cycle = Column(String, nullable=False)  # e.g., "2025", "2025-Q2"
    method = Column(String, nullable=False)  # "CAGR_3Y", "AVG_YOY_3Y"
    include_perf_fees = Column(Boolean, nullable=False, default=False)
    const_currency = Column(Boolean, nullable=False, default=False)
    cap_factor = Column(Float, nullable=True)  # Upper limit for RAF factor
    floor_factor = Column(Float, nullable=True)  # Lower limit for RAF factor
    weight_pct = Column(Float, nullable=False, default=100.0)  # Weight percentage in calculation
    status = Column(String, nullable=False, default="draft")  # draft, approved, locked
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    approved_by = Column(String, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rationale = Column(Text, nullable=True)  # Approval rationale
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
    
    # Relationships
    team = relationship("Team", backref="raf_configs")
    creator = relationship("User", foreign_keys=[created_by])
    approver = relationship("User", foreign_keys=[approved_by])
    snapshots = relationship("RAFSnapshot", back_populates="config", cascade="all, delete-orphan")
    
    __table_args__ = (
        # Ensure only one active config per team and cycle
        {'schema': None},
    )


class RAFSnapshot(Base):
    """Immutable snapshot of RAF calculation for audit and evidence."""
    __tablename__ = "raf_snapshot"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    config_id = Column(String, ForeignKey("raf_config.id"), nullable=False)
    cycle = Column(String, nullable=False)
    method = Column(String, nullable=False)  # "CAGR_3Y", "AVG_YOY_3Y"
    computed_factor = Column(Float, nullable=False)
    adjustments_json = Column(JSON, nullable=True)  # Detailed calculation steps
    inputs_hash = Column(String, nullable=False, index=True)  # Hash of input data for reproducibility
    cap_applied = Column(Boolean, nullable=False, default=False)
    floor_applied = Column(Boolean, nullable=False, default=False)
    approver_ids = Column(JSON, nullable=True)  # List of approver user IDs
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    
    # Relationships
    team = relationship("Team", backref="raf_snapshots")
    config = relationship("RAFConfig", back_populates="snapshots")
    
    __table_args__ = (
        # Ensure only one approved snapshot per team and cycle
        {'schema': None},
    )
    
    def verify_calculation(self, team_raf_service):
        """
        Verify that the calculation is reproducible with current inputs.
        
        Args:
            team_raf_service: Service for recalculating RAF
            
        Returns:
            bool: True if calculation is reproducible, False otherwise
        """
        try:
            recalculated = team_raf_service.recalculate_from_snapshot(self)
            return abs(recalculated - self.computed_factor) < 0.0001
        except Exception:
            return False


class TeamRevenueData(Base):
    """Detailed team revenue data for RAF calculations."""
    __tablename__ = "team_revenue_data"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    fiscal_year = Column(Integer, nullable=False)
    reported_revenue = Column(Float, nullable=False)
    organic_revenue = Column(Float, nullable=True)  # Excluding acquisitions
    currency = Column(String, nullable=False)
    perf_fee_component = Column(Float, nullable=True)  # Performance fee portion
    notes = Column(Text, nullable=True)
    file_id = Column(String, nullable=True)  # Reference to source file
    created_at = Column(DateTime, nullable=False, default=func.now())
    
    # Relationships
    team = relationship("Team", backref="revenue_data")
    
    __table_args__ = (
        # Ensure only one revenue entry per team and fiscal year
        {'schema': None},
    )


class OrgMembership(Base):
    """Employee-team membership tracking."""
    __tablename__ = "org_membership"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    employee_id = Column(String, nullable=False, index=True)
    team_code = Column(String, nullable=False, index=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)  # Null means currently active
    created_at = Column(DateTime, nullable=False, default=func.now())
    
    def is_active(self, reference_date=None):
        """
        Check if membership is active at reference date.
        
        Args:
            reference_date: Date to check against (default: current date)
            
        Returns:
            bool: True if membership is active, False otherwise
        """
        if reference_date is None:
            reference_date = datetime.utcnow()
            
        return (self.start_date <= reference_date and 
                (self.end_date is None or reference_date <= self.end_date))


class FXRate(Base):
    """Foreign exchange rates for currency conversion."""
    __tablename__ = "fx_rates"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    from_currency = Column(String(3), nullable=False, index=True)  # ISO 4217 code (e.g., 'EUR')
    to_currency = Column(String(3), nullable=False, index=True)    # ISO 4217 code (e.g., 'USD')
    fiscal_year = Column(Integer, nullable=False, index=True)       # Year the rate applies to
    rate = Column(Float, nullable=False)                           # Exchange rate (1 from_currency = rate * to_currency)
    source = Column(String, nullable=True)                         # Rate source (e.g., 'ECB', 'Reuters', 'Manual')
    effective_date = Column(DateTime, nullable=True)               # Date when rate was effective
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        # Ensure only one rate per currency pair per fiscal year
        {'schema': None},
    )


# ==============================================
# Evidence Pack Models
# ==============================================

class EvidencePack(Base):
    """Evidence pack metadata for audit and compliance purposes."""
    __tablename__ = "evidence_packs"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    plan_run_id = Column(String, ForeignKey("plan_runs.id"), nullable=False, index=True)
    pack_filename = Column(String, nullable=False)
    pack_checksum = Column(String, nullable=False, index=True)  # SHA-256 checksum of the ZIP file
    file_size = Column(Integer, nullable=False)
    storage_path = Column(String, nullable=False)  # Path to stored ZIP file
    
    # Pack metadata
    pack_version = Column(String, nullable=False, default="1.1")
    compliance_standards = Column(JSON, nullable=False, default=lambda: ["SOX", "MiFID II", "GDPR"])
    audit_requirements = Column(JSON, nullable=False, default=lambda: ["reproducibility", "data_lineage", "approval_trail"])
    
    # Content summary
    contents_summary = Column(JSON, nullable=False, default=lambda: {})  # Summary of what's included
    
    # Generation metadata
    generated_by = Column(String, ForeignKey("users.id"), nullable=True)
    generated_at = Column(DateTime, nullable=False, default=func.now())
    
    # Verification status
    verified_at = Column(DateTime, nullable=True)
    verification_status = Column(String, nullable=True)  # "pending", "verified", "failed"
    verification_notes = Column(JSON, nullable=True)
    
    # Retention and lifecycle
    expires_at = Column(DateTime, nullable=True)  # When pack can be deleted
    archived_at = Column(DateTime, nullable=True)
    
    # Relationships
    plan_run = relationship("PlanRun", backref="evidence_packs")
    generator = relationship("User", foreign_keys=[generated_by])
    
    __table_args__ = (
        {'schema': None},
    )
    
    def is_verified(self) -> bool:
        """Check if evidence pack has been verified."""
        return self.verification_status == "verified"
    
    def is_expired(self) -> bool:
        """Check if evidence pack has expired."""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    def get_retention_days_remaining(self) -> Optional[int]:
        """Get number of days until pack expires."""
        if not self.expires_at:
            return None
        delta = self.expires_at - datetime.utcnow()
        return max(0, delta.days)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "plan_run_id": self.plan_run_id,
            "pack_filename": self.pack_filename,
            "pack_checksum": self.pack_checksum,
            "file_size": self.file_size,
            "pack_version": self.pack_version,
            "compliance_standards": self.compliance_standards,
            "contents_summary": self.contents_summary,
            "generated_at": self.generated_at.isoformat() if self.generated_at else None,
            "generated_by": self.generated_by,
            "verification_status": self.verification_status,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "retention_days_remaining": self.get_retention_days_remaining()
        }


# ==============================================
# Payout Policy, Payout Legs, and Exceptions
# ==============================================

class PayoutPolicy(Base):
    """Defines how bonuses are split into payout/vesting legs."""
    __tablename__ = "payout_policy"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    cycle = Column(String, nullable=False, index=True)  # e.g., "2025" or "2025-Q4"
    population = Column(String, nullable=False, index=True)  # 'MRT' or 'non-MRT'
    rules_json = Column(JSON, nullable=False)  # { tranches: [{pct, instrument, grant_offset_days, vest_offset_days, retention_offset_days, currency}] }
    version = Column(Integer, nullable=False, default=1)
    status = Column(String, nullable=False, default="draft")  # draft, pending_approval, active, archived
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    approved_by = Column(String, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())

    creator = relationship("User", foreign_keys=[created_by])
    approver = relationship("User", foreign_keys=[approved_by])

    __table_args__ = (
        Index("ix_payout_policy_cycle_population", "cycle", "population"),
    )

    def is_active(self) -> bool:
        return self.status == "active"

    def validate_tranches(self) -> bool:
        """Validate that tranche percentages sum to 100 and fields are present."""
        try:
            tranches: List[Dict[str, Any]] = (self.rules_json or {}).get("tranches", [])
            pct_sum = sum(float(t.get("percentage", 0)) for t in tranches)
            # Allow tiny floating error
            return abs(pct_sum - 100.0) < 1e-6 and all("instrument" in t for t in tranches)
        except Exception:
            return False


class PayoutLeg(Base):
    """Single payout/vesting leg created from an employee's final bonus."""
    __tablename__ = "payout_legs"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    employee_calculation_result_id = Column(String, ForeignKey("employee_calculation_results.id"), nullable=False, index=True)
    leg_number = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False)
    instrument = Column(String, nullable=False)  # cash, fund_units, phantom
    grant_date = Column(DateTime, nullable=True)
    vest_date = Column(DateTime, nullable=True)
    retention_end_date = Column(DateTime, nullable=True)
    currency = Column(String, nullable=True)
    policy_version = Column(Integer, nullable=True)
    status = Column(String, nullable=False, default="pending")  # pending, granted, vested, cancelled, exported
    created_at = Column(DateTime, nullable=False, default=func.now())

    employee_result = relationship("EmployeeCalculationResult", back_populates="payout_legs")
    # Amendments relationship added for malus/clawback tracking
    amendments = relationship("PayoutLegAmendment", back_populates="original_leg", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_payout_legs_emp_result", "employee_calculation_result_id"),
        Index("ix_payout_legs_status", "status"),
        Index("ix_payout_legs_grant_date", "grant_date"),
    )

    def has_amendments(self) -> bool:
        return bool(self.amendments)

    def get_current_amount(self) -> float:
        """Return latest adjusted amount if amended, else original amount."""
        if not self.amendments:
            return float(self.amount or 0)
        # Use the latest amendment by created_at
        latest = sorted(self.amendments, key=lambda a: a.created_at or datetime.utcnow())[-1]
        return float(latest.adjusted_amount)


class ExceptionEvent(Base):
    """Structured exception record for batch calculation, team RAF, and validations."""
    __tablename__ = "exception_events"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    source = Column(String, nullable=False, index=True)  # batch_calculation, team_raf, validation
    reference_id = Column(String, nullable=True, index=True)  # e.g., batch_result_id, employee_result_id
    exception_code = Column(String, nullable=False, index=True)
    severity = Column(String, nullable=False, default="warning")  # warning, error, critical
    status = Column(String, nullable=False, default="open")  # open, acknowledged, resolved
    context_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    resolved_by = Column(String, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)

    resolver = relationship("User", foreign_keys=[resolved_by])

    __table_args__ = (
        Index("ix_exception_source_ref", "source", "reference_id"),
        Index("ix_exception_status", "status"),
        Index("ix_exception_severity", "severity"),
    )


# ==============================================
# Risk Events (Malus/Clawback) and Amendments
# ==============================================

class RiskEvent(Base):
    """Risk event for malus/clawback decisions affecting payouts."""
    __tablename__ = "risk_events"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    employee_id = Column(String, nullable=False, index=True)
    cycle = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False)  # conduct_breach, risk_threshold, manual_adjustment
    occurred_at = Column(DateTime, nullable=False, default=func.now())
    decision = Column(String, nullable=False)  # malus, clawback, waive
    amount_or_percentage = Column(Float, nullable=False)
    is_percentage = Column(Boolean, nullable=False, default=False)
    currency = Column(String, nullable=True)
    rationale = Column(Text, nullable=True)
    approver_id = Column(String, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    status = Column(String, nullable=False, default="pending")  # pending, approved, applied
    created_at = Column(DateTime, nullable=False, default=func.now())

    approver = relationship("User")
    amendments = relationship("PayoutLegAmendment", back_populates="risk_event")

    VALID_EVENT_TYPES = {"conduct_breach", "risk_threshold", "manual_adjustment"}
    VALID_DECISIONS = {"malus", "clawback", "waive"}
    VALID_STATUSES = {"pending", "approved", "applied"}

    def is_valid(self) -> bool:
        if self.event_type not in self.VALID_EVENT_TYPES:
            return False
        if self.decision not in self.VALID_DECISIONS:
            return False
        if self.status not in self.VALID_STATUSES:
            return False
        if self.is_percentage and not (0 <= float(self.amount_or_percentage) <= 100):
            return False
        return True


class PayoutLegAmendment(Base):
    """Amendments to payout legs due to malus or clawback events."""
    __tablename__ = "payout_leg_amendments"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    original_leg_id = Column(String, ForeignKey("payout_legs.id"), nullable=False, index=True)
    risk_event_id = Column(String, ForeignKey("risk_events.id"), nullable=False)
    amendment_type = Column(String, nullable=False)  # malus_reduction, clawback_recovery
    original_amount = Column(Float, nullable=False)
    adjusted_amount = Column(Float, nullable=False)
    effective_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())

    original_leg = relationship("PayoutLeg", back_populates="amendments")
    risk_event = relationship("RiskEvent", back_populates="amendments")

    VALID_AMENDMENT_TYPES = {"malus_reduction", "clawback_recovery"}

    def is_valid(self) -> bool:
        if self.amendment_type not in self.VALID_AMENDMENT_TYPES:
            return False
        try:
            return float(self.adjusted_amount) >= 0
        except Exception:
            return False
