"""
Batch Processing API Endpoints

This module provides REST API endpoints for batch file upload,
processing, and management functionality.
"""

import logging
import tempfile
import os
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.file_processing_service import FileProcessingService
from ..dal.batch_upload_dal import BatchUploadDAL
from ..schemas import (
    ApiResponse, BatchUploadResponse, BatchUploadCreate,
    EmployeeDataResponse, BatchParameters
)
from ..models import EmployeeData

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/batch", tags=["batch"])


@router.post("/file", response_model=ApiResponse)
async def upload_batch_file(
    session_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a CSV file for batch processing.
    
    Args:
        session_id: Session ID for the upload
        file: Uploaded CSV file
        db: Database session
        
    Returns:
        ApiResponse with upload details
    """
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        # Read file content
        file_content = await file.read()
        
        if not file_content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty file provided"
            )
        
        # Initialize services
        file_service = FileProcessingService(db)
        batch_dal = BatchUploadDAL(db)
        
        # Validate file format and content
        validation_result = file_service.validate_file(file_content, file.filename)
        
        if not validation_result.is_valid:
            return ApiResponse(
                success=False,
                message="File validation failed",
                error="; ".join(validation_result.errors),
                data={
                    "errors": validation_result.errors,
                    "warnings": validation_result.warnings
                }
            )
        
        # Create batch upload record
        upload = batch_dal.create_batch_upload(
            session_id=session_id,
            filename=f"upload_{batch_dal.db.query(batch_dal.model).count() + 1}_{file.filename}",
            original_filename=file.filename,
            file_size=len(file_content)
        )
        
        # Save file temporarily and process
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
            
            # Process file in background (for now, process synchronously)
            success, message = file_service.process_file(upload.id, file_content)
            
            # Clean up temp file
            os.unlink(temp_file_path)
            
            if not success:
                return ApiResponse(
                    success=False,
                    message="File processing failed",
                    error=message
                )
            
            # Get updated upload record
            updated_upload = batch_dal.get(upload.id)
            
            return ApiResponse(
                success=True,
                message="File uploaded and processed successfully",
                data={
                    "upload": BatchUploadResponse.model_validate(updated_upload),
                    "validation_warnings": validation_result.warnings,
                    "processing_message": message
                }
            )
            
        except Exception as e:
            # Clean up on error
            if 'temp_file_path' in locals():
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
            
            # Mark upload as failed if upload was created
            if 'upload' in locals() and 'batch_dal' in locals():
                try:
                    batch_dal.mark_as_failed(upload.id, str(e))
                except Exception as mark_error:
                    logger.error(f"Error marking upload as failed: {str(mark_error)}")
            
            # Return error response instead of raising exception
            return ApiResponse(
                success=False,
                message="File upload failed",
                error=str(e)
            )
        
    except HTTPException as http_ex:
        # Convert HTTPException to ApiResponse
        return ApiResponse(
            success=False,
            message="Upload failed",
            error=http_ex.detail
        )
    except Exception as e:
        logger.error(f"Error uploading batch file: {str(e)}")
        # Return structured error response
        return ApiResponse(
            success=False,
            message="Upload failed",
            error=f"Failed to upload file: {str(e)}"
        )


@router.get("/uploads/{upload_id}/columns", response_model=ApiResponse)
async def get_upload_columns(
    upload_id: str,
    db: Session = Depends(get_db)
):
    """
    Get column information for an uploaded file.
    
    Args:
        upload_id: ID of the batch upload
        db: Database session
        
    Returns:
        ApiResponse with column information
    """
    try:
        batch_dal = BatchUploadDAL(db)
        upload = batch_dal.get(upload_id)
        
        if not upload:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload not found"
            )
        
        # Get sample employee data to determine columns
        sample_employees = db.query(EmployeeData).filter(
            EmployeeData.batch_upload_id == upload_id
        ).limit(5).all()
        
        if not sample_employees:
            return ApiResponse(
                success=True,
                message="No data available yet",
                data={
                    "columns": [],
                    "sample_data": [],
                    "total_rows": 0
                }
            )
        
        # Extract column information
        columns = []
        sample_data = []
        
        for employee in sample_employees:
            # Convert to dict for analysis
            emp_dict = {
                'employee_id': employee.employee_id,
                'first_name': employee.first_name,
                'last_name': employee.last_name,
                'email': employee.email,
                'department': employee.department,
                'position': employee.position,
                'base_salary': employee.salary,  # Map salary to base_salary for frontend consistency
                'hire_date': employee.hire_date.isoformat() if employee.hire_date else None
            }
            
            # Add additional data
            if employee.additional_data:
                emp_dict.update(employee.additional_data)
            
            sample_data.append(emp_dict)
        
        # Get unique column names
        all_columns = set()
        for data in sample_data:
            all_columns.update(data.keys())
        
        # Create column info
        for col_name in sorted(all_columns):
            # Analyze column values
            values = [str(data.get(col_name, '')) for data in sample_data if data.get(col_name) is not None]
            
            columns.append({
                'name': col_name,
                'data_type': _infer_data_type(values),
                'sample_values': values[:3],  # First 3 non-null values
                'has_data': len(values) > 0
            })
        
        return ApiResponse(
            success=True,
            message="Column information retrieved successfully",
            data={
                'upload_id': upload_id,
                'columns': columns,
                'sample_data': sample_data,
                'total_rows': upload.total_rows or len(sample_data),
                'processed_rows': upload.processed_rows,
                'failed_rows': upload.failed_rows,
                'status': upload.status
            }
        )
        
    except HTTPException as http_ex:
        # Convert HTTPException to ApiResponse
        return ApiResponse(
            success=False,
            message="Failed to get column information",
            error=http_ex.detail
        )
    except Exception as e:
        logger.error(f"Error getting columns for upload {upload_id}: {str(e)}")
        # Return structured error response
        return ApiResponse(
            success=False,
            message="Failed to get column information",
            error=str(e)
        )


@router.get("/uploads/{upload_id}/data", response_model=ApiResponse)
async def get_upload_data(
    upload_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Number of records per page"),
    db: Session = Depends(get_db)
):
    """
    Get paginated employee data for an upload.
    
    Args:
        upload_id: ID of the batch upload
        page: Page number (1-based)
        page_size: Number of records per page
        db: Database session
        
    Returns:
        ApiResponse with paginated employee data
    """
    try:
        batch_dal = BatchUploadDAL(db)
        upload = batch_dal.get(upload_id)
        
        if not upload:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload not found"
            )
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Get total count
        total_count = db.query(EmployeeData).filter(
            EmployeeData.batch_upload_id == upload_id
        ).count()
        
        # Get paginated data
        employees = db.query(EmployeeData).filter(
            EmployeeData.batch_upload_id == upload_id
        ).order_by(EmployeeData.row_number).offset(offset).limit(page_size).all()
        
        # Convert to response format
        employee_data = []
        for emp in employees:
            emp_dict = EmployeeDataResponse.model_validate(emp).model_dump()
            employee_data.append(emp_dict)
        
        # Calculate pagination info
        total_pages = (total_count + page_size - 1) // page_size
        
        return ApiResponse(
            success=True,
            message="Employee data retrieved successfully",
            data={
                'upload_id': upload_id,
                'employees': employee_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': total_pages,
                    'has_next': page < total_pages,
                    'has_prev': page > 1
                },
                'upload_status': upload.status
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting data for upload {upload_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get upload data: {str(e)}"
        )


@router.get("/uploads/{upload_id}", response_model=ApiResponse)
async def get_upload_status(
    upload_id: str,
    db: Session = Depends(get_db)
):
    """
    Get status and details of a batch upload.
    
    Args:
        upload_id: ID of the batch upload
        db: Database session
        
    Returns:
        ApiResponse with upload status
    """
    try:
        batch_dal = BatchUploadDAL(db)
        upload = batch_dal.get(upload_id)
        
        if not upload:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload not found"
            )
        
        return ApiResponse(
            success=True,
            message="Upload status retrieved successfully",
            data=BatchUploadResponse.model_validate(upload)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting upload status {upload_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get upload status: {str(e)}"
        )


@router.get("/uploads", response_model=ApiResponse)
async def list_uploads(
    session_id: str = Query(..., description="Session ID to filter uploads"),
    db: Session = Depends(get_db)
):
    """
    List all uploads for a session.
    
    Args:
        session_id: Session ID to filter uploads
        db: Database session
        
    Returns:
        ApiResponse with list of uploads
    """
    try:
        batch_dal = BatchUploadDAL(db)
        uploads = batch_dal.get_by_session(session_id)
        
        upload_data = []
        for upload in uploads:
            upload_data.append(BatchUploadResponse.model_validate(upload))
        
        return ApiResponse(
            success=True,
            message=f"Found {len(upload_data)} uploads",
            data={
                'uploads': upload_data,
                'session_id': session_id
            }
        )
        
    except Exception as e:
        logger.error(f"Error listing uploads for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list uploads: {str(e)}"
        )


@router.put("/uploads/{upload_id}/parameters", response_model=ApiResponse)
async def update_batch_parameters(
    upload_id: str,
    parameters: BatchParameters,
    db: Session = Depends(get_db)
):
    """
    Update calculation parameters for a batch upload.
    
    Args:
        upload_id: Batch upload ID
        parameters: Calculation parameters to apply
        db: Database session
        
    Returns:
        ApiResponse confirming parameter update
    """
    try:
        logger.info(f"Updating parameters for batch upload: {upload_id}")
        logger.info(f"Parameters: {parameters.dict()}")
        
        # Get the batch upload DAL
        batch_dal = BatchUploadDAL(db)
        
        # Check if upload exists
        upload = batch_dal.get(upload_id)
        if not upload:
            logger.error(f"Batch upload not found: {upload_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Batch upload not found: {upload_id}"
            )
        
        # Update the parameters
        upload.calculation_parameters = parameters.dict()
        db.commit()
        db.refresh(upload)
        
        logger.info(f"Successfully updated parameters for upload: {upload_id}")
        
        return ApiResponse(
            success=True,
            data={"upload_id": upload_id, "parameters_updated": True},
            message="Batch parameters updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating batch parameters: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update batch parameters: {str(e)}"
        )


@router.get("/template/{file_format}", response_class=PlainTextResponse)
async def download_template(
    file_format: str = "csv",
    template_type: str = Query("standard", description="Template type: standard or minimal")
):
    """
    Download a CSV template for batch upload.
    
    Args:
        file_format: File format (currently only 'csv' supported)
        template_type: Type of template (standard or minimal)
        
    Returns:
        CSV template file
    """
    try:
        if file_format.lower() != "csv":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only CSV format is supported"
            )
        
        if template_type not in ["standard", "minimal"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Template type must be 'standard' or 'minimal'"
            )
        
        # Create a temporary database session for the service
        from ..database import SessionLocal
        db = SessionLocal()
        
        try:
            file_service = FileProcessingService(db)
            template_content = file_service.get_template_csv(template_type)
            
            return PlainTextResponse(
                content=template_content,
                headers={
                    "Content-Disposition": f"attachment; filename=employee_template_{template_type}.csv"
                }
            )
        finally:
            db.close()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate template: {str(e)}"
        )


def _infer_data_type(values: List[str]) -> str:
    """
    Infer data type from sample values.
    
    Args:
        values: List of string values
        
    Returns:
        Inferred data type
    """
    if not values:
        return "string"
    
    # Check if all values are numeric
    numeric_count = 0
    integer_count = 0
    
    for value in values:
        if value.strip():
            try:
                float_val = float(value.replace(',', '').replace('$', ''))
                numeric_count += 1
                if float_val.is_integer():
                    integer_count += 1
            except ValueError:
                pass
    
    if numeric_count == len(values):
        if integer_count == len(values):
            return "integer"
        else:
            return "float"
    
    # Check for boolean values
    bool_values = {'true', 'false', 'yes', 'no', '1', '0'}
    if all(value.lower().strip() in bool_values for value in values if value.strip()):
        return "boolean"
    
    # Check for date patterns
    date_patterns = ['-', '/', '.']
    if any(pattern in value for value in values for pattern in date_patterns):
        return "date"
    
    return "string"
