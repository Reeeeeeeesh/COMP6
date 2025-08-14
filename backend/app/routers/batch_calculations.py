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
    prefix="/api/v1/batch-calculations",
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
        # Update status to indicate processing will start
        batch_upload.status = "processing"
        db.commit()
        
        # Create a background task wrapper that creates its own database session
        def background_calculation_task():
            """Background task wrapper that creates its own database session"""
            import asyncio
            from ..database import SessionLocal
            task_db = SessionLocal()
            try:
                logger.info(f"=== BACKGROUND TASK STARTED for upload {upload_id} ===")
                logger.info(f"Parameters: {parameters}")
                logger.info(f"Create scenario: {create_scenario}")
                logger.info(f"Scenario name: {scenario_name}")
                
                calculation_service = BatchCalculationService(task_db)
                logger.info("BatchCalculationService created, calling calculate_batch...")
                
                # Run the async function in a new event loop
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    batch_result, employee_results = loop.run_until_complete(
                        calculation_service.calculate_batch(
                            upload_id,
                            parameters,
                            create_scenario,
                            scenario_name
                        )
                    )
                    logger.info(f"=== BACKGROUND CALCULATION COMPLETED for upload {upload_id} ===")
                    logger.info(f"Batch result ID: {batch_result.id if batch_result else 'None'}")
                    logger.info(f"Employee results count: {len(employee_results) if employee_results else 0}")
                finally:
                    loop.close()
            except Exception as e:
                logger.exception(f"=== BACKGROUND CALCULATION FAILED for upload {upload_id} ===")
                logger.exception(f"Error details: {str(e)}")
                # The calculate_batch method already handles updating the status to failed
            finally:
                logger.info(f"=== BACKGROUND TASK CLEANUP for upload {upload_id} ===")
                task_db.close()
        
        # Start calculation in background task
        background_tasks.add_task(background_calculation_task)
        
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


@router.get("/uploads/{upload_id}/results", response_model=ApiResponse)
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

    return ApiResponse(
        success=True,
        message=f"Found {len(results)} results for upload {upload_id}",
        data=results
    )


@router.get("/results/{result_id}", response_model=ApiResponse)
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

    return ApiResponse(
        success=True,
        message="Batch calculation result retrieved successfully",
        data=result
    )


@router.get("/results/{result_id}/employees", response_model=ApiResponse)
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

    return ApiResponse(
        success=True,
        message=f"Found {len(employee_results)} employee results",
        data=employee_results
    )


@router.get("/results/{result_id}/summary", response_model=ApiResponse)
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
    
    return ApiResponse(
        success=True,
        message="Batch calculation summary retrieved successfully",
        data={
            "total_employees": total_employees,
            "total_base_salary": total_base_salary,
            "total_bonus_amount": total_bonus_amount,
            "average_bonus_percentage": average_bonus_percentage,
            "bonus_percentage_distribution": bonus_pct_ranges,
            "department_statistics": departments,
            "calculation_parameters": result.calculation_parameters
        }
    )


@router.get("/results/{result_id}/distribution", response_model=ApiResponse)
async def get_bonus_distribution_analysis(
    result_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed bonus distribution analysis for visualization.
    
    Args:
        result_id: ID of the batch calculation result
        
    Returns:
        Dictionary with detailed distribution statistics for charts
    """
    # Check if batch calculation result exists
    result = db.query(BatchCalculationResult).filter(
        BatchCalculationResult.id == result_id
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail=f"Batch calculation result with ID {result_id} not found")
    
    # Get employee results with employee data
    employee_results = db.query(EmployeeCalculationResult).options(
        sqlalchemy.orm.joinedload(EmployeeCalculationResult.employee_data)
    ).filter(
        EmployeeCalculationResult.batch_result_id == result_id
    ).all()
    
    # Calculate salary range distribution
    salary_ranges = {
        "$0-$50k": {"count": 0, "total_bonus": 0, "avg_bonus_pct": 0, "employees": []},
        "$50k-$75k": {"count": 0, "total_bonus": 0, "avg_bonus_pct": 0, "employees": []},
        "$75k-$100k": {"count": 0, "total_bonus": 0, "avg_bonus_pct": 0, "employees": []},
        "$100k-$150k": {"count": 0, "total_bonus": 0, "avg_bonus_pct": 0, "employees": []},
        "$150k-$200k": {"count": 0, "total_bonus": 0, "avg_bonus_pct": 0, "employees": []},
        "$200k+": {"count": 0, "total_bonus": 0, "avg_bonus_pct": 0, "employees": []}
    }
    
    # Calculate bonus percentage ranges with more granularity
    bonus_percentage_ranges = {
        "0-2%": {"count": 0, "employees": []},
        "2-5%": {"count": 0, "employees": []},
        "5-10%": {"count": 0, "employees": []},
        "10-15%": {"count": 0, "employees": []},
        "15-20%": {"count": 0, "employees": []},
        "20-25%": {"count": 0, "employees": []},
        "25-30%": {"count": 0, "employees": []},
        "30%+": {"count": 0, "employees": []}
    }
    
    # Enhanced department statistics
    departments = {}
    
    for er in employee_results:
        employee_info = {
            "id": er.employee_data.employee_id,
            "name": f"{er.employee_data.first_name} {er.employee_data.last_name}",
            "department": er.employee_data.department,
            "salary": er.base_salary,
            "bonus_amount": er.bonus_amount,
            "bonus_percentage": er.bonus_percentage
        }
        
        # Categorize by salary range
        salary = er.base_salary
        if salary < 50000:
            range_key = "$0-$50k"
        elif salary < 75000:
            range_key = "$50k-$75k"
        elif salary < 100000:
            range_key = "$75k-$100k"
        elif salary < 150000:
            range_key = "$100k-$150k"
        elif salary < 200000:
            range_key = "$150k-$200k"
        else:
            range_key = "$200k+"
        
        salary_ranges[range_key]["count"] += 1
        salary_ranges[range_key]["total_bonus"] += er.bonus_amount
        salary_ranges[range_key]["employees"].append(employee_info)
        
        # Categorize by bonus percentage
        bonus_pct = er.bonus_percentage * 100
        if bonus_pct < 2:
            pct_key = "0-2%"
        elif bonus_pct < 5:
            pct_key = "2-5%"
        elif bonus_pct < 10:
            pct_key = "5-10%"
        elif bonus_pct < 15:
            pct_key = "10-15%"
        elif bonus_pct < 20:
            pct_key = "15-20%"
        elif bonus_pct < 25:
            pct_key = "20-25%"
        elif bonus_pct < 30:
            pct_key = "25-30%"
        else:
            pct_key = "30%+"
        
        bonus_percentage_ranges[pct_key]["count"] += 1
        bonus_percentage_ranges[pct_key]["employees"].append(employee_info)
        
        # Enhanced department statistics
        dept = er.employee_data.department or "Unknown"
        if dept not in departments:
            departments[dept] = {
                "count": 0,
                "total_base_salary": 0,
                "total_bonus": 0,
                "average_bonus_pct": 0,
                "employees": [],
                "salary_distribution": {},
                "bonus_pct_distribution": {}
            }
        
        departments[dept]["count"] += 1
        departments[dept]["total_base_salary"] += er.base_salary
        departments[dept]["total_bonus"] += er.bonus_amount
        departments[dept]["employees"].append(employee_info)
    
    # Calculate averages for salary ranges
    for range_key in salary_ranges:
        if salary_ranges[range_key]["count"] > 0:
            total_salary = sum(emp["salary"] for emp in salary_ranges[range_key]["employees"])
            salary_ranges[range_key]["avg_bonus_pct"] = (
                salary_ranges[range_key]["total_bonus"] / total_salary if total_salary > 0 else 0
            )
    
    # Calculate averages for departments
    for dept in departments:
        if departments[dept]["total_base_salary"] > 0:
            departments[dept]["average_bonus_pct"] = (
                departments[dept]["total_bonus"] / departments[dept]["total_base_salary"]
            )
    
    # Format data for charts
    salary_range_chart_data = [
        {
            "range": range_key,
            "count": data["count"],
            "totalBonus": data["total_bonus"],
            "avgBonusPct": data["avg_bonus_pct"] * 100,
            "employees": data["employees"]
        }
        for range_key, data in salary_ranges.items()
        if data["count"] > 0
    ]
    
    bonus_pct_chart_data = [
        {
            "range": range_key,
            "count": data["count"],
            "employees": data["employees"]
        }
        for range_key, data in bonus_percentage_ranges.items()
        if data["count"] > 0
    ]
    
    department_chart_data = [
        {
            "department": dept,
            "count": data["count"],
            "totalBonus": data["total_bonus"],
            "avgBonusPct": data["average_bonus_pct"] * 100,
            "employees": data["employees"]
        }
        for dept, data in departments.items()
    ]
    
    return ApiResponse(
        success=True,
        message="Bonus distribution analysis retrieved successfully",
        data={
            "salary_range_distribution": salary_range_chart_data,
            "bonus_percentage_distribution": bonus_pct_chart_data,
            "department_distribution": department_chart_data,
            "total_employees": len(employee_results),
            "calculation_parameters": result.calculation_parameters
        }
    )


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
