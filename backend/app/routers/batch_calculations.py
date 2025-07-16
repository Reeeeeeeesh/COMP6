"""
Batch Calculations Router

This module implements the API endpoints for batch calculations.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import sqlalchemy.orm
import sqlalchemy
from typing import List, Optional, Dict, Any
import logging

from ..database import get_db
from ..models import BatchUpload, BatchCalculationResult, EmployeeCalculationResult
from ..schemas import (
    BatchParameters, 
    BatchCalculationResultResponse, 
    EmployeeCalculationResultResponse,
    ApiResponse
)
from ..services.batch_calculation_service import BatchCalculationService

router = APIRouter(
    prefix="/api/batch-calculations",
    tags=["batch-calculations"],
)

logger = logging.getLogger(__name__)

@router.post("/uploads/{upload_id}/calculate", response_model=ApiResponse)
async def trigger_batch_calculation(
    upload_id: str,
    background_tasks: BackgroundTasks,
    parameters: Optional[BatchParameters] = None,
    create_scenario: bool = False,
    scenario_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Trigger a batch calculation for the specified upload.
    
    Args:
        upload_id: ID of the batch upload to calculate
        parameters: Optional calculation parameters (will use parameters from batch upload if not provided)
        create_scenario: Whether to create a scenario for this calculation
        scenario_name: Name of the scenario (required if create_scenario is True)
        
    Returns:
        ApiResponse with success status and batch calculation ID
    """
    # Check if batch upload exists
    batch_upload = db.query(BatchUpload).filter(BatchUpload.id == upload_id).first()
    if not batch_upload:
        raise HTTPException(status_code=404, detail=f"Batch upload with ID {upload_id} not found")
    
    # Check if batch upload is in a valid state
    if batch_upload.status not in ["uploaded", "completed", "failed"]:
        return ApiResponse(
            success=False,
            error=f"Batch upload is currently in {batch_upload.status} state and cannot be calculated"
        )
    
    try:
        # Initialize batch calculation service
        calculation_service = BatchCalculationService(db)
        
        # Start calculation in background task
        # Update status to indicate processing will start
        batch_upload.status = "processing"
        db.commit()
        
        background_tasks.add_task(
            calculation_service.calculate_batch,
            upload_id,
            parameters,
            create_scenario,
            scenario_name
        )
        
        return ApiResponse(
            success=True,
            message="Batch calculation started in background",
            data={"upload_id": upload_id, "status": "processing"}
        )
            
    except ValueError as e:
        logger.error(f"Validation error in batch calculation: {str(e)}")
        return ApiResponse(success=False, error=str(e))
    except Exception as e:
        logger.exception(f"Error calculating batch: {str(e)}")
        return ApiResponse(success=False, error=f"Error calculating batch: {str(e)}")


@router.get("/uploads/{upload_id}/results", response_model=List[BatchCalculationResultResponse])
async def get_batch_calculation_results(
    upload_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all calculation results for a batch upload.
    
    Args:
        upload_id: ID of the batch upload
        
    Returns:
        List of BatchCalculationResultResponse objects
    """
    # Check if batch upload exists
    batch_upload = db.query(BatchUpload).filter(BatchUpload.id == upload_id).first()
    if not batch_upload:
        raise HTTPException(status_code=404, detail=f"Batch upload with ID {upload_id} not found")
    
    # Get calculation results
    results = db.query(BatchCalculationResult).filter(
        BatchCalculationResult.batch_upload_id == upload_id
    ).all()
    
    return results


@router.get("/results/{result_id}", response_model=BatchCalculationResultResponse)
async def get_batch_calculation_result(
    result_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a specific batch calculation result.
    
    Args:
        result_id: ID of the batch calculation result
        
    Returns:
        BatchCalculationResultResponse object
    """
    # Get calculation result
    result = db.query(BatchCalculationResult).filter(
        BatchCalculationResult.id == result_id
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail=f"Batch calculation result with ID {result_id} not found")
    
    return result


@router.get("/results/{result_id}/employees", response_model=List[EmployeeCalculationResultResponse])
async def get_employee_calculation_results(
    result_id: str,
    page: int = 1,
    page_size: int = 100,
    sort_by: str = "last_name",
    sort_order: str = "asc",
    filter_dept: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get employee calculation results for a batch calculation.
    
    Args:
        result_id: ID of the batch calculation result
        page: Page number (1-based)
        page_size: Number of results per page
        sort_by: Field to sort by (last_name, first_name, department, bonus_amount, bonus_percentage)
        sort_order: Sort order (asc or desc)
        filter_dept: Filter by department
        search: Search term for employee name or ID
        
    Returns:
        List of EmployeeCalculationResultResponse objects
    """
    # Check if batch calculation result exists
    result = db.query(BatchCalculationResult).filter(
        BatchCalculationResult.id == result_id
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail=f"Batch calculation result with ID {result_id} not found")
    
    # Import needed models at the top of the function to avoid circular imports
    from ..models import EmployeeData
    
    # Build query for employee results with eager loading of employee_data
    query = db.query(EmployeeCalculationResult).options(
        sqlalchemy.orm.joinedload(EmployeeCalculationResult.employee_data)
    ).filter(
        EmployeeCalculationResult.batch_result_id == result_id
    )
    
    # Apply filters - use join instead of has() for better SQL generation
    if filter_dept or search or sort_by in ["last_name", "first_name", "department"]:
        query = query.join(EmployeeCalculationResult.employee_data)
    
    if filter_dept:
        query = query.filter(EmployeeData.department == filter_dept)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            sqlalchemy.or_(
                EmployeeData.first_name.ilike(search_term),
                EmployeeData.last_name.ilike(search_term),
                EmployeeData.employee_id.ilike(search_term)
            )
        )
    
    # Apply sorting with proper column references
    if sort_by == "last_name":
        if sort_order == "asc":
            query = query.order_by(EmployeeData.last_name.asc())
        else:
            query = query.order_by(EmployeeData.last_name.desc())
    elif sort_by == "first_name":
        if sort_order == "asc":
            query = query.order_by(EmployeeData.first_name.asc())
        else:
            query = query.order_by(EmployeeData.first_name.desc())
    elif sort_by == "department":
        if sort_order == "asc":
            query = query.order_by(EmployeeData.department.asc())
        else:
            query = query.order_by(EmployeeData.department.desc())
    elif sort_by == "bonus_amount":
        if sort_order == "asc":
            query = query.order_by(EmployeeCalculationResult.bonus_amount.asc())
        else:
            query = query.order_by(EmployeeCalculationResult.bonus_amount.desc())
    elif sort_by == "bonus_percentage":
        if sort_order == "asc":
            query = query.order_by(EmployeeCalculationResult.bonus_percentage.asc())
        else:
            query = query.order_by(EmployeeCalculationResult.bonus_percentage.desc())
    else:
        # Default sort by id to ensure consistent ordering
        query = query.order_by(EmployeeCalculationResult.id.asc())
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    employee_results = query.all()
    
    return employee_results


@router.get("/results/{result_id}/summary", response_model=Dict[str, Any])
async def get_batch_calculation_summary(
    result_id: str,
    db: Session = Depends(get_db)
):
    """
    Get summary statistics for a batch calculation.
    
    Args:
        result_id: ID of the batch calculation result
        
    Returns:
        Dictionary with summary statistics
    """
    # Check if batch calculation result exists
    result = db.query(BatchCalculationResult).filter(
        BatchCalculationResult.id == result_id
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail=f"Batch calculation result with ID {result_id} not found")
    
    # Get employee results
    employee_results = db.query(EmployeeCalculationResult).filter(
        EmployeeCalculationResult.batch_result_id == result_id
    ).all()
    
    # Calculate summary statistics
    total_employees = len(employee_results)
    total_base_salary = sum(er.base_salary for er in employee_results)
    total_bonus_amount = sum(er.bonus_amount for er in employee_results)
    average_bonus_percentage = total_bonus_amount / total_base_salary if total_base_salary > 0 else 0
    
    # Calculate distribution of bonus percentages
    bonus_pct_ranges = {
        "0-5%": 0,
        "5-10%": 0,
        "10-15%": 0,
        "15-20%": 0,
        "20-25%": 0,
        "25%+": 0
    }
    
    for er in employee_results:
        bonus_pct = er.bonus_percentage * 100  # Convert to percentage
        if bonus_pct < 5:
            bonus_pct_ranges["0-5%"] += 1
        elif bonus_pct < 10:
            bonus_pct_ranges["5-10%"] += 1
        elif bonus_pct < 15:
            bonus_pct_ranges["10-15%"] += 1
        elif bonus_pct < 20:
            bonus_pct_ranges["15-20%"] += 1
        elif bonus_pct < 25:
            bonus_pct_ranges["20-25%"] += 1
        else:
            bonus_pct_ranges["25%+"] += 1
    
    # Calculate department statistics
    departments = {}
    for er in employee_results:
        dept = er.employee_data.department or "Unknown"
        if dept not in departments:
            departments[dept] = {
                "count": 0,
                "total_base_salary": 0,
                "total_bonus": 0,
                "average_bonus_pct": 0
            }
        
        departments[dept]["count"] += 1
        departments[dept]["total_base_salary"] += er.base_salary
        departments[dept]["total_bonus"] += er.bonus_amount
    
    # Calculate average bonus percentage for each department
    for dept in departments:
        if departments[dept]["total_base_salary"] > 0:
            departments[dept]["average_bonus_pct"] = (
                departments[dept]["total_bonus"] / departments[dept]["total_base_salary"]
            )
    
    return {
        "total_employees": total_employees,
        "total_base_salary": total_base_salary,
        "total_bonus_amount": total_bonus_amount,
        "average_bonus_percentage": average_bonus_percentage,
        "bonus_percentage_distribution": bonus_pct_ranges,
        "department_statistics": departments,
        "calculation_parameters": result.calculation_parameters
    }


@router.post("/results/{result_id}/export", response_model=ApiResponse)
async def export_calculation_results(
    result_id: str,
    format: str = "csv",
    include_breakdown: bool = False,
    db: Session = Depends(get_db)
):
    """
    Export calculation results to a file.
    
    Args:
        result_id: ID of the batch calculation result
        format: Export format (csv or xlsx)
        include_breakdown: Whether to include calculation breakdown
        
    Returns:
        ApiResponse with download URL
    """
    # Check if batch calculation result exists
    result = db.query(BatchCalculationResult).filter(
        BatchCalculationResult.id == result_id
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail=f"Batch calculation result with ID {result_id} not found")
    
    # TODO: Implement export functionality
    # This would typically generate a file and return a download URL
    
    return ApiResponse(
        success=True,
        message=f"Export initiated in {format} format",
        data={"download_url": f"/api/downloads/{result_id}.{format}"}
    )
