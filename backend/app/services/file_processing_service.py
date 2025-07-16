"""
File Processing Service for Batch Upload Module

This service handles CSV file parsing, validation, and data extraction
for the bonus calculator batch processing functionality.
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

from ..models import BatchUpload, EmployeeData
from ..dal.batch_upload_dal import BatchUploadDAL
from ..schemas import EmployeeDataCreate

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
    
    def __init__(self, db: Session):
        self.db = db
        self.batch_upload_dal = BatchUploadDAL(db)
    
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
            
            # Check minimum required columns
            header_set = set(headers)
            missing_required = self.REQUIRED_COLUMNS - header_set
            if missing_required:
                errors.append(f"Missing required columns: {', '.join(missing_required)}")
            
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
            encoding_result = chardet.detect(file_content)
            encoding = encoding_result.get('encoding', 'utf-8')
            text_content = file_content.decode(encoding, errors='replace')
            
            csv_reader = csv.DictReader(io.StringIO(text_content))
            
            # Normalize field names
            csv_reader.fieldnames = [name.strip().lower().replace(' ', '_') for name in csv_reader.fieldnames]
            
            # Process rows
            processed_count = 0
            failed_count = 0
            
            for row_number, row in enumerate(csv_reader, 1):
                try:
                    # Create employee data record
                    employee_data = self._create_employee_record(upload_id, row_number, row)
                    processed_count += 1
                    
                    # Update progress every 100 rows
                    if processed_count % 100 == 0:
                        self.batch_upload_dal.update_progress(
                            upload_id, 
                            validation_result.total_rows, 
                            processed_count, 
                            failed_count
                        )
                        
                except Exception as e:
                    logger.warning(f"Failed to process row {row_number} in upload {upload_id}: {str(e)}")
                    failed_count += 1
                    
                    # Stop if too many failures
                    if failed_count > validation_result.total_rows * 0.1:  # 10% failure threshold
                        error_message = f"Too many failed rows ({failed_count}), stopping processing"
                        self.batch_upload_dal.mark_as_failed(upload_id, error_message)
                        return False, error_message
            
            # Final progress update
            self.batch_upload_dal.update_progress(
                upload_id, 
                validation_result.total_rows, 
                processed_count, 
                failed_count
            )
            
            # Mark as completed
            self.batch_upload_dal.mark_as_completed(upload_id)
            
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
