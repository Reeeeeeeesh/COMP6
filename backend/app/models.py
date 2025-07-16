from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, Float, JSON
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
    
    # Column mapping stored as JSON
    column_mapping = Column(JSON, nullable=False)
    
    # Template metadata
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
