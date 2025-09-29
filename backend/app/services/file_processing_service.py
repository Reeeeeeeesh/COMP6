"""
File Processing Service for Batch Upload Module

This service handles CSV file parsing, validation, and data extraction
for the bonus calculator batch processing functionality.
Enhanced with file storage system integration and lineage tracking.
"""

import csv
import io
import logging
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass
from pathlib import Path
import chardet
import pandas as pd
from sqlalchemy.orm import Session

from ..models import BatchUpload, EmployeeData, PlatformUpload, AuditEvent, TeamRevenueData, OrgMembership, Team
from ..dal.batch_upload_dal import BatchUploadDAL
from ..dal.team_raf_dal import TeamRevenueDataDAL, OrgMembershipDAL
from ..schemas import EmployeeDataCreate
from ..storage.file_store import FileStore, LocalFileStore, FileStorageError
from ..feature_flags import get_feature_flags

logger = logging.getLogger(__name__)


@dataclass
class FileValidationResult:
    """Result of file validation process."""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    total_rows: int
    column_headers: List[str]
    sample_data: List[Dict[str, Any]]


@dataclass
class ColumnInfo:
    """Information about a CSV column."""
    name: str
    data_type: str
    sample_values: List[str]
    null_count: int
    unique_count: int


class FileProcessingService:
    """Service for processing uploaded CSV files."""
    
    # Supported file formats
    SUPPORTED_EXTENSIONS = {'.csv', '.txt'}
    
    # Maximum file size (10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024
    
    # Maximum number of rows to process
    MAX_ROWS = 10000
    
    # Required columns for employee data
    REQUIRED_COLUMNS = {'employee_id', 'base_salary'}
    
    # Optional columns that can be mapped
    OPTIONAL_COLUMNS = {
        'first_name', 'last_name', 'email', 'department', 'position',
        'hire_date', 'target_bonus_pct', 'investment_weight', 'qualitative_weight',
        'investment_score_multiplier', 'qual_score_multiplier', 'raf',
        'is_mrt', 'mrt_cap_pct'
    }
    
    def __init__(self, db: Session, file_store: Optional[FileStore] = None):
        self.db = db
        self.batch_upload_dal = BatchUploadDAL(db)
        self.file_store = file_store or LocalFileStore()
        self.feature_flags = get_feature_flags()
    
    def validate_file(self, file_content: bytes, filename: str) -> FileValidationResult:
        """
        Validate uploaded file format, size, and basic structure.
        
        Args:
            file_content: Raw file content as bytes
            filename: Original filename
            
        Returns:
            FileValidationResult with validation status and details
        """
        errors = []
        warnings = []
        
        try:
            # Check file extension
            file_path = Path(filename)
            if file_path.suffix.lower() not in self.SUPPORTED_EXTENSIONS:
                errors.append(f"Unsupported file format. Supported formats: {', '.join(self.SUPPORTED_EXTENSIONS)}")
                return FileValidationResult(
                    is_valid=False,
                    errors=errors,
                    warnings=warnings,
                    total_rows=0,
                    column_headers=[],
                    sample_data=[]
                )
            
            # Check file size
            if len(file_content) > self.MAX_FILE_SIZE:
                errors.append(f"File size exceeds maximum limit of {self.MAX_FILE_SIZE / (1024*1024):.1f}MB")
                return FileValidationResult(
                    is_valid=False,
                    errors=errors,
                    warnings=warnings,
                    total_rows=0,
                    column_headers=[],
                    sample_data=[]
                )
            
            # Detect encoding
            encoding_result = chardet.detect(file_content)
            encoding = encoding_result.get('encoding', 'utf-8')
            confidence = encoding_result.get('confidence', 0)
            
            if confidence < 0.7:
                warnings.append(f"File encoding detection confidence is low ({confidence:.2f}). Using {encoding}")
            
            # Decode file content
            try:
                text_content = file_content.decode(encoding)
            except UnicodeDecodeError:
                # Fallback to utf-8 with error handling
                text_content = file_content.decode('utf-8', errors='replace')
                warnings.append("Some characters could not be decoded properly")
            
            # Parse CSV
            csv_reader = csv.reader(io.StringIO(text_content))
            rows = list(csv_reader)
            
            if not rows:
                errors.append("File is empty")
                return FileValidationResult(
                    is_valid=False,
                    errors=errors,
                    warnings=warnings,
                    total_rows=0,
                    column_headers=[],
                    sample_data=[]
                )
            
            # Extract headers
            headers = [col.strip().lower().replace(' ', '_') for col in rows[0]]
            data_rows = rows[1:]
            
            # Check for duplicate headers
            if len(headers) != len(set(headers)):
                errors.append("Duplicate column headers found")
            
            # Check for empty headers
            if any(not header for header in headers):
                errors.append("Empty column headers found")
            
            # Temporarily disable strict column checking to allow for mapping
            # header_set = set(headers)
            # missing_required = self.REQUIRED_COLUMNS - header_set
            # if missing_required:
            #     errors.append(f"Missing required columns: {', '.join(missing_required)}")
            
            # Check row count
            total_rows = len(data_rows)
            if total_rows == 0:
                errors.append("No data rows found")
            elif total_rows > self.MAX_ROWS:
                errors.append(f"File contains {total_rows} rows, maximum allowed is {self.MAX_ROWS}")
            
            # Validate data consistency
            if data_rows:
                expected_columns = len(headers)
                inconsistent_rows = []
                
                for i, row in enumerate(data_rows[:100], 2):  # Check first 100 rows
                    if len(row) != expected_columns:
                        inconsistent_rows.append(i)
                
                if inconsistent_rows:
                    if len(inconsistent_rows) <= 5:
                        errors.append(f"Inconsistent column count in rows: {', '.join(map(str, inconsistent_rows))}")
                    else:
                        errors.append(f"Inconsistent column count in {len(inconsistent_rows)} rows")
            
            # Generate sample data (first 5 rows)
            sample_data = []
            for row in data_rows[:5]:
                if len(row) == len(headers):
                    sample_data.append(dict(zip(headers, row)))
            
            # Additional warnings
            if total_rows > 1000:
                warnings.append(f"Large file with {total_rows} rows may take longer to process")
            
            return FileValidationResult(
                is_valid=len(errors) == 0,
                errors=errors,
                warnings=warnings,
                total_rows=total_rows,
                column_headers=headers,
                sample_data=sample_data
            )
            
        except Exception as e:
            logger.error(f"Error validating file {filename}: {str(e)}")
            errors.append(f"File validation failed: {str(e)}")
            return FileValidationResult(
                is_valid=False,
                errors=errors,
                warnings=warnings,
                total_rows=0,
                column_headers=[],
                sample_data=[]
            )
    
    def analyze_columns(self, file_content: bytes, filename: str) -> Dict[str, ColumnInfo]:
        """
        Analyze CSV columns to provide detailed information about data types and content.
        
        Args:
            file_content: Raw file content as bytes
            filename: Original filename
            
        Returns:
            Dictionary mapping column names to ColumnInfo objects
        """
        try:
            # Detect encoding
            encoding_result = chardet.detect(file_content)
            encoding = encoding_result.get('encoding', 'utf-8')
            
            # Use pandas for better data type detection
            df = pd.read_csv(io.BytesIO(file_content), encoding=encoding, nrows=1000)
            
            # Normalize column names
            df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]
            
            column_info = {}
            
            for col in df.columns:
                # Get sample values (non-null, first 5)
                non_null_values = df[col].dropna()
                sample_values = non_null_values.head(5).astype(str).tolist()
                
                # Determine data type
                if pd.api.types.is_numeric_dtype(df[col]):
                    if pd.api.types.is_integer_dtype(df[col]):
                        data_type = 'integer'
                    else:
                        data_type = 'float'
                elif pd.api.types.is_datetime64_any_dtype(df[col]):
                    data_type = 'datetime'
                elif pd.api.types.is_bool_dtype(df[col]):
                    data_type = 'boolean'
                else:
                    data_type = 'string'
                
                column_info[col] = ColumnInfo(
                    name=col,
                    data_type=data_type,
                    sample_values=sample_values,
                    null_count=int(df[col].isnull().sum()),
                    unique_count=int(df[col].nunique())
                )
            
            return column_info
            
        except Exception as e:
            logger.error(f"Error analyzing columns for {filename}: {str(e)}")
            return {}
    
    def process_file(self, upload_id: str, file_content: bytes) -> Tuple[bool, str]:
        """
        Process uploaded file and store employee data in database.
        
        Args:
            upload_id: ID of the batch upload record
            file_content: Raw file content as bytes
            
        Returns:
            Tuple of (success, message)
        """
        try:
            # Get upload record
            upload = self.batch_upload_dal.get(upload_id)
            if not upload:
                return False, "Upload record not found"
            
            # Update status to processing
            self.batch_upload_dal.update_status(upload_id, "processing")
            
            # Validate file
            validation_result = self.validate_file(file_content, upload.original_filename)
            
            if not validation_result.is_valid:
                error_message = "; ".join(validation_result.errors)
                self.batch_upload_dal.mark_as_failed(upload_id, error_message)
                return False, error_message
            
            # Detect encoding and parse CSV
            # file_content is provided as bytes; earlier code mistakenly referenced
            # an undefined variable `content_bytes`, which caused processing to fail
            # and left no rows for column mapping. Use the actual bytes from
            # the upload request.
            encoding_result = chardet.detect(file_content)
            encoding = encoding_result.get('encoding', 'utf-8')
            text_content = file_content.decode(encoding, errors='replace')
            
            csv_reader = csv.DictReader(io.StringIO(text_content))
            
            # Normalize field names
            csv_reader.fieldnames = [name.strip().lower().replace(' ', '_') for name in csv_reader.fieldnames]
            
            # Process rows in batches for better performance
            processed_count = 0
            failed_count = 0
            batch_size = 50  # Process in smaller batches
            employee_records = []
            
            logger.info(f"Starting to process {validation_result.total_rows} rows for upload {upload_id}")
            
            for row_number, row in enumerate(csv_reader, 1):
                try:
                    # Create employee data record (without committing)
                    employee_data = self._create_employee_record_batch(upload_id, row_number, row)
                    employee_records.append(employee_data)
                    processed_count += 1
                    
                    # Batch insert and update progress every batch_size rows
                    if len(employee_records) >= batch_size or row_number == validation_result.total_rows:
                        # Batch insert records
                        self.db.add_all(employee_records)
                        self.db.commit()
                        logger.info(f"Committed batch of {len(employee_records)} records")
                        employee_records = []  # Clear batch
                        
                        # Update progress
                        self.batch_upload_dal.update_progress(
                            upload_id, 
                            validation_result.total_rows, 
                            processed_count, 
                            failed_count
                        )
                        logger.info(f"Progress: {processed_count}/{validation_result.total_rows} rows processed")
                        
                except Exception as e:
                    logger.warning(f"Failed to process row {row_number} in upload {upload_id}: {str(e)}")
                    failed_count += 1
                    
                    # Stop if too many failures
                    if failed_count > validation_result.total_rows * 0.1:  # 10% failure threshold
                        error_message = f"Too many failed rows ({failed_count}), stopping processing"
                        self.batch_upload_dal.mark_as_failed(upload_id, error_message)
                        return False, error_message
            
            # Commit any remaining records
            if employee_records:
                self.db.add_all(employee_records)
                self.db.commit()
                logger.info(f"Committed final batch of {len(employee_records)} records")
            
            # Final progress update
            self.batch_upload_dal.update_progress(
                upload_id, 
                validation_result.total_rows, 
                processed_count, 
                failed_count
            )
            
            # Mark as completed
            self.batch_upload_dal.mark_as_completed(upload_id)
            logger.info(f"File processing completed for upload {upload_id}: {processed_count} processed, {failed_count} failed")
            
            success_message = f"Successfully processed {processed_count} rows"
            if failed_count > 0:
                success_message += f" ({failed_count} rows failed)"
            
            return True, success_message
            
        except Exception as e:
            logger.error(f"Error processing file for upload {upload_id}: {str(e)}")
            self.batch_upload_dal.mark_as_failed(upload_id, str(e))
            return False, str(e)
    
    def _create_employee_record(self, upload_id: str, row_number: int, row_data: Dict[str, str]) -> EmployeeData:
        """
        Create an EmployeeData record from CSV row data.
        
        Args:
            upload_id: ID of the batch upload
            row_number: Row number in the CSV file
            row_data: Dictionary of column values
            
        Returns:
            Created EmployeeData instance
        """
        # Extract standard fields
        employee_data = {
            'batch_upload_id': upload_id,
            'row_number': row_number,
            'employee_id': row_data.get('employee_id', '').strip(),
            'first_name': row_data.get('first_name', '').strip() or None,
            'last_name': row_data.get('last_name', '').strip() or None,
            'email': row_data.get('email', '').strip() or None,
            'department': row_data.get('department', '').strip() or None,
            'position': row_data.get('position', '').strip() or None,
        }
        
        # Handle salary
        try:
            salary_str = row_data.get('base_salary', '').strip().replace(',', '').replace('$', '')
            employee_data['salary'] = float(salary_str) if salary_str else None
        except ValueError:
            employee_data['salary'] = None
        
        # Handle hire date
        hire_date_str = row_data.get('hire_date', '').strip()
        if hire_date_str:
            try:
                employee_data['hire_date'] = pd.to_datetime(hire_date_str).to_pydatetime()
            except:
                employee_data['hire_date'] = None
        else:
            employee_data['hire_date'] = None
        
        # Store additional data as JSON
        additional_data = {}
        for key, value in row_data.items():
            if key not in {'employee_id', 'first_name', 'last_name', 'email', 
                          'department', 'position', 'base_salary', 'hire_date'}:
                if value and value.strip():
                    additional_data[key] = value.strip()
        
        employee_data['additional_data'] = additional_data if additional_data else None
        
        # Enhanced validation using validation_utils
        from ..validation_utils import validate_employee_data
        
        # Prepare data for validation
        validation_data = {
            'base_salary': employee_data['salary'],
            'employee_id': employee_data['employee_id']
        }
        
        # Add additional data for validation if present
        if additional_data:
            for key, value in additional_data.items():
                try:
                    # Try to convert numeric values
                    if key in ['target_bonus_pct', 'investment_weight', 'qualitative_weight', 
                              'investment_score_multiplier', 'qual_score_multiplier', 'raf', 'mrt_cap_pct']:
                        validation_data[key] = float(value) if value else None
                    elif key == 'is_mrt':
                        validation_data[key] = value.lower() in ['true', '1', 'yes', 'y'] if value else False
                    else:
                        validation_data[key] = value
                except (ValueError, AttributeError):
                    validation_data[key] = value
        
        # Perform comprehensive validation
        validation_result = validate_employee_data(
            validation_data, 
            row_number=row_number, 
            employee_id=employee_data['employee_id']
        )
        
        # Combine errors and warnings
        all_messages = validation_result.errors + validation_result.warnings
        
        employee_data['is_valid'] = validation_result.is_valid
        employee_data['validation_errors'] = all_messages if all_messages else None
        
        # Create database record
        employee = EmployeeData(**employee_data)
        self.db.add(employee)
        self.db.commit()
        self.db.refresh(employee)
        
        return employee
    
    def _create_employee_record_batch(self, upload_id: str, row_number: int, row_data: Dict[str, str]) -> EmployeeData:
        """
        Create an EmployeeData record from CSV row data (for batch processing - no individual commit).
        
        Args:
            upload_id: ID of the batch upload
            row_number: Row number in the CSV file
            row_data: Dictionary of column values
            
        Returns:
            Created EmployeeData instance (not yet committed)
        """
        # Extract standard fields
        employee_data = {
            'batch_upload_id': upload_id,
            'row_number': row_number,
            'employee_id': row_data.get('employee_id', '').strip(),
            'first_name': row_data.get('first_name', '').strip() or None,
            'last_name': row_data.get('last_name', '').strip() or None,
            'email': row_data.get('email', '').strip() or None,
            'department': row_data.get('department', '').strip() or None,
            'position': row_data.get('position', '').strip() or None,
        }
        
        # Handle salary
        try:
            salary_str = row_data.get('base_salary', '').strip().replace(',', '').replace('$', '')
            employee_data['salary'] = float(salary_str) if salary_str else None
        except ValueError:
            employee_data['salary'] = None
        
        # Handle hire date
        hire_date_str = row_data.get('hire_date', '').strip()
        if hire_date_str:
            try:
                import pandas as pd
                employee_data['hire_date'] = pd.to_datetime(hire_date_str).to_pydatetime()
            except:
                employee_data['hire_date'] = None
        else:
            employee_data['hire_date'] = None
        
        # Store additional data as JSON
        additional_data = {}
        for key, value in row_data.items():
            if key not in {'employee_id', 'first_name', 'last_name', 'email', 
                          'department', 'position', 'base_salary', 'hire_date'}:
                if value and value.strip():
                    additional_data[key] = value.strip()
        
        employee_data['additional_data'] = additional_data if additional_data else None
        
        # Simplified validation for batch processing
        validation_data = {
            'base_salary': employee_data['salary'],
            'employee_id': employee_data['employee_id']
        }
        
        # Basic validation - employee_id and salary are required
        is_valid = bool(employee_data['employee_id'] and employee_data['salary'] and employee_data['salary'] > 0)
        validation_errors = []
        
        if not employee_data['employee_id']:
            validation_errors.append("Missing employee_id")
        if not employee_data['salary'] or employee_data['salary'] <= 0:
            validation_errors.append("Missing or invalid base_salary")
        
        employee_data['is_valid'] = is_valid
        employee_data['validation_errors'] = validation_errors if validation_errors else None
        
        # Create database record (but don't commit yet)
        employee = EmployeeData(**employee_data)
        
        return employee
    
    def get_template_csv(self, template_type: str = "standard") -> str:
        """
        Generate a CSV template for employee data upload.
        
        Args:
            template_type: Type of template to generate
            
        Returns:
            CSV template as string
        """
        if template_type == "standard":
            headers = [
                'employee_id', 'first_name', 'last_name', 'email', 'department',
                'position', 'base_salary', 'hire_date', 'target_bonus_pct',
                'investment_weight', 'qualitative_weight', 'investment_score_multiplier',
                'qual_score_multiplier', 'raf', 'is_mrt', 'mrt_cap_pct'
            ]
            
            sample_data = [
                ['EMP001', 'John', 'Doe', 'john.doe@company.com', 'Engineering',
                 'Senior Developer', '75000', '2020-01-15', '0.15',
                 '0.6', '0.4', '1.2', '1.1', '1.0', 'false', ''],
                ['EMP002', 'Jane', 'Smith', 'jane.smith@company.com', 'Sales',
                 'Sales Manager', '85000', '2019-03-10', '0.20',
                 '0.7', '0.3', '1.5', '1.3', '1.0', 'true', '2.5']
            ]
        else:
            # Minimal template
            headers = ['employee_id', 'base_salary']
            sample_data = [
                ['EMP001', '75000'],
                ['EMP002', '85000']
            ]
        
        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerows(sample_data)
        
        return output.getvalue()
    
    def process_platform_upload(self, tenant_id: str, file_content: Union[bytes, io.BytesIO], 
                               filename: str, created_by: Optional[str] = None, 
                               metadata: Optional[Dict] = None) -> Tuple[bool, str, Optional[str]]:
        """
        Process platform upload with enhanced file storage and lineage tracking.
        
        Args:
            tenant_id: Tenant identifier
            file_content: File content as bytes or BytesIO
            filename: Original filename
            created_by: User ID who created the upload
            metadata: Additional metadata to store
            
        Returns:
            Tuple of (success, message, upload_id)
        """
        try:
            # Check if enhanced file storage is enabled
            if not self.feature_flags.enhanced_file_storage_enabled():
                logger.warning("Enhanced file storage is disabled, falling back to legacy processing")
                # Could fall back to legacy method here
                return False, "Enhanced file storage not enabled", None
            
            # Convert BytesIO to bytes if needed
            if hasattr(file_content, 'read'):
                file_content.seek(0)
                content_bytes = file_content.read()
            else:
                content_bytes = file_content
            
            # Validate file first
            validation_result = self.validate_file(content_bytes, filename)
            if not validation_result.is_valid:
                error_message = "; ".join(validation_result.errors)
                logger.error(f"File validation failed for {filename}: {error_message}")
                return False, error_message, None
            
            # Store file using enhanced storage system
            storage_result = self.file_store.save_file(
                tenant_id=tenant_id,
                file_content=content_bytes,
                filename=filename,
                metadata={
                    **(metadata or {}),
                    "created_by": created_by,
                    "validation_result": {
                        "total_rows": validation_result.total_rows,
                        "column_headers": validation_result.column_headers,
                        "warnings": validation_result.warnings
                    }
                }
            )
            
            # Create platform upload record
            upload = PlatformUpload(
                tenant_id=tenant_id,
                created_by=created_by,
                filename=filename,
                status="received",
                file_size=storage_result.file_size,
                upload_metadata=metadata or {},
                bytes_hash=storage_result.bytes_hash,
                storage_path=storage_result.storage_path,
                lineage_metadata={"events": []}
            )
            
            # Add initial lineage event
            upload.update_lineage("upload", {
                "original_filename": filename,
                "file_size": storage_result.file_size,
                "checksum": storage_result.bytes_hash,
                "created_by": created_by,
                "validation_summary": {
                    "total_rows": validation_result.total_rows,
                    "column_count": len(validation_result.column_headers),
                    "warnings_count": len(validation_result.warnings)
                }
            })
            
            # Save to database
            self.db.add(upload)
            self.db.commit()
            self.db.refresh(upload)
            
            # Create audit event
            if self.feature_flags.audit_logging_enabled():
                audit_event = AuditEvent(
                    tenant_id=tenant_id,
                    actor_user_id=created_by,
                    action="file_upload",
                    entity="platform_upload",
                    entity_id=upload.id,
                    after={
                        "filename": filename,
                        "file_size": storage_result.file_size,
                        "checksum": storage_result.bytes_hash,
                        "storage_path": storage_result.storage_path
                    }
                )
                self.db.add(audit_event)
                self.db.commit()
            
            logger.info(f"Platform upload processed successfully: {upload.id} (checksum: {storage_result.bytes_hash[:16]}...)")
            
            return True, f"File uploaded successfully. Checksum: {storage_result.bytes_hash}", upload.id
            
        except FileStorageError as e:
            logger.error(f"File storage error for {filename}: {str(e)}")
            return False, f"File storage failed: {str(e)}", None
        except Exception as e:
            logger.error(f"Error processing platform upload {filename}: {str(e)}")
            self.db.rollback()
            return False, f"Processing failed: {str(e)}", None
    
    def get_file_lineage(self, upload_id: str) -> Optional[Dict]:
        """
        Retrieve complete file lineage information for an upload.
        
        Args:
            upload_id: Platform upload ID
            
        Returns:
            Dict with complete lineage information or None if not found
        """
        try:
            upload = self.db.query(PlatformUpload).filter(PlatformUpload.id == upload_id).first()
            if not upload:
                return None
            
            lineage_info = upload.get_lineage_info()
            
            # Add current file status
            file_exists = self.file_store.file_exists(upload.storage_path) if upload.storage_path else False
            
            return {
                "upload_id": upload.id,
                "tenant_id": upload.tenant_id,
                "filename": upload.filename,
                "status": upload.status,
                "file_size": upload.file_size,
                "checksum": upload.bytes_hash,
                "storage_path": upload.storage_path,
                "file_exists": file_exists,
                "created_at": upload.created_at.isoformat() if upload.created_at else None,
                "created_by": upload.created_by,
                "upload_metadata": upload.upload_metadata,
                "lineage_events": lineage_info.get("events", []),
                "integrity_verified": upload.verify_file_integrity(self.file_store) if upload.bytes_hash and upload.storage_path else None
            }
            
        except Exception as e:
            logger.error(f"Error retrieving file lineage for {upload_id}: {str(e)}")
            return None
    
    def verify_file_integrity(self, upload_id: str) -> Dict[str, Any]:
        """
        Verify file integrity for a platform upload.
        
        Args:
            upload_id: Platform upload ID
            
        Returns:
            Dict with verification results
        """
        try:
            upload = self.db.query(PlatformUpload).filter(PlatformUpload.id == upload_id).first()
            if not upload:
                return {"success": False, "error": "Upload not found"}
            
            if not upload.bytes_hash or not upload.storage_path:
                return {"success": False, "error": "No checksum or storage path available"}
            
            # Verify checksum
            is_valid = upload.verify_file_integrity(self.file_store)
            
            # Update lineage with verification event
            upload.update_lineage("integrity_check", {
                "verified": is_valid,
                "checksum": upload.bytes_hash,
                "storage_path": upload.storage_path
            })
            
            self.db.commit()
            
            return {
                "success": True,
                "verified": is_valid,
                "checksum": upload.bytes_hash,
                "storage_path": upload.storage_path,
                "file_exists": self.file_store.file_exists(upload.storage_path)
            }
            
        except Exception as e:
            logger.error(f"Error verifying file integrity for {upload_id}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def add_processing_event(self, upload_id: str, event_type: str, details: Dict):
        """
        Add a processing event to the file lineage.
        
        Args:
            upload_id: Platform upload ID
            event_type: Type of processing event
            details: Event details
        """
        try:
            upload = self.db.query(PlatformUpload).filter(PlatformUpload.id == upload_id).first()
            if upload:
                upload.update_lineage(event_type, details)
                self.db.commit()
                logger.debug(f"Added lineage event {event_type} to upload {upload_id}")
        except Exception as e:
            logger.error(f"Error adding processing event to {upload_id}: {str(e)}")
    
    def process_team_revenue_history_csv(self, tenant_id: str, file_content: Union[bytes, io.BytesIO], 
                                       filename: str, created_by: Optional[str] = None) -> Tuple[bool, str, List[TeamRevenueData]]:
        """
        Process team revenue history CSV file and create TeamRevenueData records.
        Enhanced with file storage, lineage tracking, and audit events.
        
        Args:
            tenant_id: Tenant identifier
            file_content: Raw CSV file content as bytes or BytesIO
            filename: Original filename
            created_by: User ID who uploaded the file
            
        Returns:
            Tuple of (success, message, created_records)
        """
        try:
            # Convert BytesIO to bytes if needed
            if hasattr(file_content, 'read'):
                file_content.seek(0)
                content_bytes = file_content.read()
            else:
                content_bytes = file_content

            # Validate file format
            validation_result = self.validate_file(content_bytes, filename)
            if not validation_result.is_valid:
                error_message = "; ".join(validation_result.errors)
                return False, error_message, []

            # Store file using enhanced storage system if enabled
            upload_record = None
            if self.feature_flags.enhanced_file_storage_enabled():
                try:
                    storage_result = self.file_store.save_file(
                        tenant_id=tenant_id,
                        file_content=content_bytes,
                        filename=filename,
                        metadata={
                            "created_by": created_by,
                            "file_type": "team_revenue_history",
                            "validation_result": {
                                "total_rows": validation_result.total_rows,
                                "column_headers": validation_result.column_headers
                            }
                        }
                    )
                    
                    # Create platform upload record for lineage
                    upload_record = PlatformUpload(
                        tenant_id=tenant_id,
                        created_by=created_by,
                        filename=filename,
                        status="processing",
                        file_size=storage_result.file_size,
                        upload_metadata={"file_type": "team_revenue_history"},
                        bytes_hash=storage_result.bytes_hash,
                        storage_path=storage_result.storage_path,
                        lineage_metadata={"events": []}
                    )
                    
                    # Add upload lineage event
                    upload_record.update_lineage("upload", {
                        "original_filename": filename,
                        "file_size": storage_result.file_size,
                        "checksum": storage_result.bytes_hash,
                        "created_by": created_by,
                        "file_type": "team_revenue_history"
                    })
                    
                    self.db.add(upload_record)
                    self.db.flush()  # Get ID without committing
                    
                except Exception as e:
                    logger.warning(f"File storage failed for {filename}: {str(e)}, proceeding without storage")
            
            # Expected columns for team revenue history
            required_columns = {'team_code', 'fiscal_year', 'reported_revenue', 'currency'}
            optional_columns = {'organic_revenue', 'perf_fee_component', 'notes'}
            
            # Check if required columns are present
            header_set = set(validation_result.column_headers)
            missing_columns = required_columns - header_set
            if missing_columns:
                return False, f"Missing required columns: {', '.join(missing_columns)}", []
            
            # Detect encoding and parse CSV
            encoding_result = chardet.detect(content_bytes)
            encoding = encoding_result.get('encoding', 'utf-8')
            text_content = content_bytes.decode(encoding, errors='replace')
            
            # Use pandas for better data parsing
            df = pd.read_csv(io.StringIO(text_content))
            df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]
            
            # Validate data
            errors = []
            warnings = []
            created_records = []
            
            # Get team revenue data DAL
            revenue_dal = TeamRevenueDataDAL(self.db)
            
            # Add validation lineage event
            if upload_record:
                upload_record.update_lineage("validation", {
                    "total_rows": validation_result.total_rows,
                    "required_columns": list(required_columns),
                    "optional_columns": list(optional_columns),
                    "column_headers": validation_result.column_headers
                })
            
            for index, row in df.iterrows():
                try:
                    # Validate required fields
                    team_code = str(row['team_code']).strip() if pd.notna(row['team_code']) else None
                    if not team_code:
                        errors.append(f"Row {index + 2}: Missing team_code")
                        continue
                    
                    # Get or create team
                    team = self.db.query(Team).filter(Team.name == team_code).first()
                    if not team:
                        # Create team if it doesn't exist
                        team = Team(name=team_code)
                        self.db.add(team)
                        self.db.flush()  # Get the ID without committing
                        logger.info(f"Created new team: {team_code}")
                    
                    # Validate fiscal year
                    try:
                        fiscal_year = int(row['fiscal_year'])
                        if fiscal_year < 2000 or fiscal_year > 2050:
                            errors.append(f"Row {index + 2}: Invalid fiscal year {fiscal_year}")
                            continue
                    except (ValueError, TypeError):
                        errors.append(f"Row {index + 2}: Invalid fiscal year format")
                        continue
                    
                    # Validate reported revenue
                    try:
                        reported_revenue = float(row['reported_revenue'])
                        if reported_revenue < 0:
                            errors.append(f"Row {index + 2}: Reported revenue cannot be negative")
                            continue
                    except (ValueError, TypeError):
                        errors.append(f"Row {index + 2}: Invalid reported revenue format")
                        continue
                    
                    # Enhanced currency validation (ISO 4217)
                    currency = str(row['currency']).strip().upper() if pd.notna(row['currency']) else 'USD'
                    valid_currencies = {'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'HKD', 'SGD', 'CNY'}
                    if currency not in valid_currencies:
                        warnings.append(f"Row {index + 2}: Unrecognized currency code '{currency}', proceeding anyway")
                    if len(currency) != 3:
                        warnings.append(f"Row {index + 2}: Invalid currency code format '{currency}', using USD")
                        currency = 'USD'
                    
                    # Optional fields
                    organic_revenue = None
                    if 'organic_revenue' in df.columns and pd.notna(row['organic_revenue']):
                        try:
                            organic_revenue = float(row['organic_revenue'])
                        except (ValueError, TypeError):
                            warnings.append(f"Row {index + 2}: Invalid organic revenue format")
                    
                    perf_fee_component = None
                    if 'perf_fee_component' in df.columns and pd.notna(row['perf_fee_component']):
                        try:
                            perf_fee_component = float(row['perf_fee_component'])
                        except (ValueError, TypeError):
                            warnings.append(f"Row {index + 2}: Invalid performance fee component format")
                    
                    notes = None
                    if 'notes' in df.columns and pd.notna(row['notes']):
                        notes = str(row['notes']).strip()
                    
                    # Check for existing record
                    existing = revenue_dal.get_by_team_and_year(team.id, fiscal_year)
                    if existing:
                        warnings.append(f"Row {index + 2}: Revenue data for {team_code} {fiscal_year} already exists, skipping")
                        continue
                    
                    # Create revenue data record
                    revenue_data = TeamRevenueData(
                        team_id=team.id,
                        fiscal_year=fiscal_year,
                        reported_revenue=reported_revenue,
                        organic_revenue=organic_revenue,
                        currency=currency,
                        perf_fee_component=perf_fee_component,
                        notes=notes,
                        file_id=upload_record.id if upload_record else None
                    )
                    
                    self.db.add(revenue_data)
                    created_records.append(revenue_data)
                    
                except Exception as e:
                    errors.append(f"Row {index + 2}: Error processing row - {str(e)}")
                    continue
            
            # Commit all changes if no critical errors
            if errors:
                self.db.rollback()
                # Update upload status if exists
                if upload_record:
                    upload_record.status = "failed"
                    upload_record.update_lineage("processing_failed", {
                        "error_count": len(errors),
                        "errors": errors[:5]  # First 5 errors
                    })
                    self.db.commit()
                return False, f"Processing failed with {len(errors)} errors: {'; '.join(errors[:5])}", []
            
            self.db.commit()
            
            # Refresh records to get IDs
            for record in created_records:
                self.db.refresh(record)
            
            # Update upload status and lineage
            if upload_record:
                upload_record.status = "ready"
                upload_record.update_lineage("import_completed", {
                    "records_created": len(created_records),
                    "warnings_count": len(warnings),
                    "teams_processed": len(set(r.team_id for r in created_records))
                })
                self.db.commit()
            
            # Create audit event if enabled
            if self.feature_flags.audit_logging_enabled():
                audit_event = AuditEvent(
                    tenant_id=tenant_id,
                    actor_user_id=created_by,
                    action="team_revenue_import",
                    entity="team_revenue_data",
                    entity_id=upload_record.id if upload_record else None,
                    after={
                        "filename": filename,
                        "records_created": len(created_records),
                        "teams_affected": len(set(r.team_id for r in created_records)),
                        "checksum": upload_record.bytes_hash if upload_record else None
                    }
                )
                self.db.add(audit_event)
                self.db.commit()
            
            message = f"Successfully processed {len(created_records)} revenue records"
            if warnings:
                message += f" with {len(warnings)} warnings"
            
            logger.info(f"Team revenue history CSV processed: {message}")
            return True, message, created_records
            
        except Exception as e:
            logger.error(f"Error processing team revenue history CSV: {str(e)}")
            self.db.rollback()
            
            # Update upload status if exists
            if 'upload_record' in locals() and upload_record:
                try:
                    upload_record.status = "failed"
                    upload_record.update_lineage("processing_error", {
                        "error": str(e),
                        "error_type": type(e).__name__
                    })
                    self.db.commit()
                except Exception as commit_error:
                    logger.error(f"Failed to update upload status: {str(commit_error)}")
            
            return False, f"Processing failed: {str(e)}", []
    
    def process_org_membership_csv(self, tenant_id: str, file_content: Union[bytes, io.BytesIO], 
                                 filename: str, created_by: Optional[str] = None) -> Tuple[bool, str, List[OrgMembership]]:
        """
        Process organization membership CSV file and create OrgMembership records.
        Enhanced with file storage, lineage tracking, and audit events.
        
        Args:
            tenant_id: Tenant identifier
            file_content: Raw CSV file content as bytes or BytesIO
            filename: Original filename
            created_by: User ID who uploaded the file
            
        Returns:
            Tuple of (success, message, created_records)
        """
        try:
            # Convert BytesIO to bytes if needed
            if hasattr(file_content, 'read'):
                file_content.seek(0)
                content_bytes = file_content.read()
            else:
                content_bytes = file_content

            # Validate file format
            validation_result = self.validate_file(content_bytes, filename)
            if not validation_result.is_valid:
                error_message = "; ".join(validation_result.errors)
                return False, error_message, []

            # Store file using enhanced storage system if enabled
            upload_record = None
            if self.feature_flags.enhanced_file_storage_enabled():
                try:
                    storage_result = self.file_store.save_file(
                        tenant_id=tenant_id,
                        file_content=content_bytes,
                        filename=filename,
                        metadata={
                            "created_by": created_by,
                            "file_type": "org_membership",
                            "validation_result": {
                                "total_rows": validation_result.total_rows,
                                "column_headers": validation_result.column_headers
                            }
                        }
                    )
                    
                    # Create platform upload record for lineage
                    upload_record = PlatformUpload(
                        tenant_id=tenant_id,
                        created_by=created_by,
                        filename=filename,
                        status="processing",
                        file_size=storage_result.file_size,
                        upload_metadata={"file_type": "org_membership"},
                        bytes_hash=storage_result.bytes_hash,
                        storage_path=storage_result.storage_path,
                        lineage_metadata={"events": []}
                    )
                    
                    # Add upload lineage event
                    upload_record.update_lineage("upload", {
                        "original_filename": filename,
                        "file_size": storage_result.file_size,
                        "checksum": storage_result.bytes_hash,
                        "created_by": created_by,
                        "file_type": "org_membership"
                    })
                    
                    self.db.add(upload_record)
                    self.db.flush()  # Get ID without committing
                    
                except Exception as e:
                    logger.warning(f"File storage failed for {filename}: {str(e)}, proceeding without storage")
            
            # Expected columns for org membership
            required_columns = {'employee_id', 'team_code', 'start_date'}
            optional_columns = {'end_date'}
            
            # Check if required columns are present
            header_set = set(validation_result.column_headers)
            missing_columns = required_columns - header_set
            if missing_columns:
                return False, f"Missing required columns: {', '.join(missing_columns)}", []
            
            # Detect encoding and parse CSV
            encoding_result = chardet.detect(content_bytes)
            encoding = encoding_result.get('encoding', 'utf-8')
            text_content = content_bytes.decode(encoding, errors='replace')
            
            # Use pandas for better data parsing
            df = pd.read_csv(io.StringIO(text_content))
            df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]
            
            # Validate data
            errors = []
            warnings = []
            created_records = []
            
            # Get org membership DAL
            membership_dal = OrgMembershipDAL(self.db)
            
            # Add validation lineage event
            if upload_record:
                upload_record.update_lineage("validation", {
                    "total_rows": validation_result.total_rows,
                    "required_columns": list(required_columns),
                    "optional_columns": list(optional_columns),
                    "column_headers": validation_result.column_headers
                })
            
            for index, row in df.iterrows():
                try:
                    # Validate required fields
                    employee_id = str(row['employee_id']).strip() if pd.notna(row['employee_id']) else None
                    if not employee_id:
                        errors.append(f"Row {index + 2}: Missing employee_id")
                        continue
                    
                    team_code = str(row['team_code']).strip() if pd.notna(row['team_code']) else None
                    if not team_code:
                        errors.append(f"Row {index + 2}: Missing team_code")
                        continue
                    
                    # Parse start date
                    try:
                        start_date = pd.to_datetime(row['start_date']).to_pydatetime()
                    except (ValueError, TypeError):
                        errors.append(f"Row {index + 2}: Invalid start_date format")
                        continue
                    
                    # Parse end date (optional)
                    end_date = None
                    if 'end_date' in df.columns and pd.notna(row['end_date']):
                        try:
                            end_date = pd.to_datetime(row['end_date']).to_pydatetime()
                            # Validate date range
                            if end_date <= start_date:
                                errors.append(f"Row {index + 2}: End date must be after start date")
                                continue
                        except (ValueError, TypeError):
                            warnings.append(f"Row {index + 2}: Invalid end_date format, treating as ongoing")
                    
                    # Check for existing active membership
                    existing = membership_dal.get_active_membership(employee_id)
                    if existing:
                        warnings.append(f"Row {index + 2}: Employee {employee_id} already has active membership, skipping")
                        continue
                    
                    # Create membership record
                    membership = OrgMembership(
                        employee_id=employee_id,
                        team_code=team_code,
                        start_date=start_date,
                        end_date=end_date
                    )
                    
                    self.db.add(membership)
                    created_records.append(membership)
                    
                except Exception as e:
                    errors.append(f"Row {index + 2}: Error processing row - {str(e)}")
                    continue
            
            # Commit all changes if no critical errors
            if errors:
                self.db.rollback()
                # Update upload status if exists
                if upload_record:
                    upload_record.status = "failed"
                    upload_record.update_lineage("processing_failed", {
                        "error_count": len(errors),
                        "errors": errors[:5]  # First 5 errors
                    })
                    self.db.commit()
                return False, f"Processing failed with {len(errors)} errors: {'; '.join(errors[:5])}", []
            
            self.db.commit()
            
            # Refresh records to get IDs
            for record in created_records:
                self.db.refresh(record)
            
            # Update upload status and lineage
            if upload_record:
                upload_record.status = "ready"
                upload_record.update_lineage("import_completed", {
                    "records_created": len(created_records),
                    "warnings_count": len(warnings),
                    "employees_processed": len(set(r.employee_id for r in created_records))
                })
                self.db.commit()
            
            # Create audit event if enabled
            if self.feature_flags.audit_logging_enabled():
                audit_event = AuditEvent(
                    tenant_id=tenant_id,
                    actor_user_id=created_by,
                    action="org_membership_import",
                    entity="org_membership",
                    entity_id=upload_record.id if upload_record else None,
                    after={
                        "filename": filename,
                        "records_created": len(created_records),
                        "employees_affected": len(set(r.employee_id for r in created_records)),
                        "checksum": upload_record.bytes_hash if upload_record else None
                    }
                )
                self.db.add(audit_event)
                self.db.commit()
            
            message = f"Successfully processed {len(created_records)} membership records"
            if warnings:
                message += f" with {len(warnings)} warnings"
            
            logger.info(f"Organization membership CSV processed: {message}")
            return True, message, created_records
            
        except Exception as e:
            logger.error(f"Error processing organization membership CSV: {str(e)}")
            self.db.rollback()
            
            # Update upload status if exists
            if 'upload_record' in locals() and upload_record:
                try:
                    upload_record.status = "failed"
                    upload_record.update_lineage("processing_error", {
                        "error": str(e),
                        "error_type": type(e).__name__
                    })
                    self.db.commit()
                except Exception as commit_error:
                    logger.error(f"Failed to update upload status: {str(commit_error)}")
            
            return False, f"Processing failed: {str(e)}", []
    
    def get_team_revenue_history_template(self) -> str:
        """
        Generate a CSV template for team revenue history import.
        
        Returns:
            CSV template as string
        """
        headers = [
            'team_code', 'fiscal_year', 'reported_revenue', 'organic_revenue',
            'currency', 'perf_fee_component', 'notes'
        ]
        
        sample_data = [
            ['TEAM001', '2025', '10000000', '9500000', 'USD', '500000', 'Annual revenue for 2025'],
            ['TEAM001', '2024', '9500000', '9000000', 'USD', '500000', 'Annual revenue for 2024'],
            ['TEAM001', '2023', '9000000', '8500000', 'USD', '500000', 'Annual revenue for 2023'],
            ['TEAM001', '2022', '8500000', '8000000', 'USD', '500000', 'Annual revenue for 2022'],
            ['TEAM002', '2025', '12000000', '11500000', 'USD', '600000', 'Annual revenue for 2025'],
            ['TEAM002', '2024', '11000000', '10500000', 'USD', '550000', 'Annual revenue for 2024']
        ]
        
        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerows(sample_data)
        
        return output.getvalue()
    
    def get_org_membership_template(self) -> str:
        """
        Generate a CSV template for organization membership import.
        
        Returns:
            CSV template as string
        """
        headers = [
            'employee_id', 'team_code', 'start_date', 'end_date'
        ]
        
        sample_data = [
            ['EMP001', 'TEAM001', '2024-01-01', ''],
            ['EMP002', 'TEAM001', '2024-01-01', '2024-06-30'],
            ['EMP002', 'TEAM002', '2024-07-01', ''],
            ['EMP003', 'TEAM002', '2024-01-01', ''],
            ['EMP004', 'TEAM003', '2024-03-01', '']
        ]
        
        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerows(sample_data)
        
        return output.getvalue()
