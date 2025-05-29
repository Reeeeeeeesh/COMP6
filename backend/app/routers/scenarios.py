"""
Scenario Management API Endpoints

This module provides REST API endpoints for managing persistent scenarios
including full CRUD operations, scenario comparison, and audit functionality.
"""

import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session

from ..database import get_db
from ..dal.scenario_dal import ScenarioDAL
from ..dal.batch_upload_dal import BatchUploadDAL
from ..schemas import (
    ApiResponse, 
    BatchScenarioCreate, 
    BatchScenarioUpdate, 
    BatchScenarioResponse,
    BatchParameters
)
from ..models import BatchUpload, EmployeeData, BatchCalculationResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/scenarios", tags=["scenarios"])


@router.post("", response_model=ApiResponse)
async def create_scenario(
    scenario_data: BatchScenarioCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new persistent scenario.
    
    Args:
        scenario_data: Scenario creation data
        db: Database session
        
    Returns:
        ApiResponse with created scenario details
    """
    try:
        scenario_dal = ScenarioDAL(db)
        scenario = scenario_dal.create_with_audit(scenario_data)
        
        return ApiResponse(
            success=True,
            message=f"Scenario '{scenario.name}' created successfully",
            data={
                "id": scenario.id,
                "name": scenario.name,
                "description": scenario.description,
                "parameters": scenario.parameters,
                "session_id": scenario.session_id,
                "created_at": scenario.created_at.isoformat(),
                "updated_at": scenario.updated_at.isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error creating scenario: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create scenario: {str(e)}"
        )


@router.post("/from-batch", response_model=ApiResponse)
async def create_scenario_from_batch(
    batch_upload_id: str = Body(..., embed=True),
    scenario_name: Optional[str] = Body(None, embed=True),
    scenario_description: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db)
):
    """
    Create a new scenario from a completed batch upload.
    
    Args:
        batch_upload_id: ID of the batch upload to use as data source
        scenario_name: Optional name for the scenario
        scenario_description: Optional description for the scenario
        db: Database session
        
    Returns:
        ApiResponse with scenario creation details
    """
    try:
        # Verify batch upload exists and is completed
        batch_dal = BatchUploadDAL(db)
        batch_upload = batch_dal.get(batch_upload_id)
        
        if not batch_upload:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Batch upload {batch_upload_id} not found"
            )
        
        if batch_upload.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Batch upload must be completed to create scenario. Current status: {batch_upload.status}"
            )
        
        # Get employee data from the batch
        employees = db.query(EmployeeData).filter(
            EmployeeData.batch_upload_id == batch_upload_id
        ).all()
        
        if not employees:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No employee data found for this batch upload"
            )
        
        # Create scenario parameters from batch upload
        scenario_parameters = batch_upload.calculation_parameters or {}
        scenario_parameters["source_batch_id"] = batch_upload_id
        scenario_parameters["employee_count"] = len(employees)
        
        # Create persistent scenario
        scenario_data = BatchScenarioCreate(
            session_id=batch_upload.session_id,
            name=scenario_name or f"Scenario from {batch_upload.original_filename}",
            description=scenario_description or f"Scenario created from batch upload: {batch_upload.original_filename} ({len(employees)} employees)",
            parameters=scenario_parameters
        )
        
        scenario_dal = ScenarioDAL(db)
        scenario = scenario_dal.create_with_audit(scenario_data)
        
        return ApiResponse(
            success=True,
            message=f"Scenario created successfully with {len(employees)} employees",
            data={
                "id": scenario.id,
                "name": scenario.name,
                "description": scenario.description,
                "parameters": scenario.parameters,
                "session_id": scenario.session_id,
                "source_batch_id": batch_upload_id,
                "employee_count": len(employees),
                "created_at": scenario.created_at.isoformat(),
                "updated_at": scenario.updated_at.isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating scenario from batch {batch_upload_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create scenario: {str(e)}"
        )


@router.get("", response_model=ApiResponse)
async def list_scenarios(
    session_id: str = Query(..., description="Session ID to filter scenarios"),
    name_filter: Optional[str] = Query(None, description="Filter scenarios by name (partial match)"),
    has_calculations: Optional[bool] = Query(None, description="Filter scenarios with/without calculation results"),
    limit: Optional[int] = Query(50, description="Maximum number of scenarios to return"),
    db: Session = Depends(get_db)
):
    """
    List scenarios for a session with optional filters.
    
    Args:
        session_id: Session ID to filter scenarios
        name_filter: Optional name filter (partial match)
        has_calculations: Filter scenarios with/without calculation results
        limit: Maximum number of scenarios to return
        db: Database session
        
    Returns:
        ApiResponse with list of scenarios
    """
    try:
        scenario_dal = ScenarioDAL(db)
        scenarios = scenario_dal.search_scenarios(
            session_id=session_id,
            name_filter=name_filter,
            has_calculations=has_calculations,
            limit=limit
        )
        
        scenario_list = []
        for scenario in scenarios:
            # Check if scenario has calculation results
            has_results = db.query(BatchCalculationResult).filter(
                BatchCalculationResult.scenario_id == scenario.id
            ).first() is not None
            
            scenario_info = {
                "id": scenario.id,
                "name": scenario.name,
                "description": scenario.description,
                "parameters": scenario.parameters,
                "session_id": scenario.session_id,
                "has_calculation_results": has_results,
                "created_at": scenario.created_at.isoformat(),
                "updated_at": scenario.updated_at.isoformat()
            }
            scenario_list.append(scenario_info)
        
        return ApiResponse(
            success=True,
            message=f"Found {len(scenario_list)} scenarios",
            data={
                "scenarios": scenario_list,
                "session_id": session_id,
                "total_count": len(scenario_list)
            }
        )
        
    except Exception as e:
        logger.error(f"Error listing scenarios for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list scenarios: {str(e)}"
        )


@router.get("/{scenario_id}", response_model=ApiResponse)
async def get_scenario(
    scenario_id: str,
    include_audit_log: bool = Query(False, description="Include scenario audit history"),
    db: Session = Depends(get_db)
):
    """
    Get a scenario by ID with optional audit history.
    
    Args:
        scenario_id: ID of the scenario
        include_audit_log: Whether to include audit history
        db: Database session
        
    Returns:
        ApiResponse with scenario data
    """
    try:
        scenario_dal = ScenarioDAL(db)
        scenario = scenario_dal.get(scenario_id)
        
        if not scenario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scenario {scenario_id} not found"
            )
        
        # Check if scenario has calculation results
        calculation_results = db.query(BatchCalculationResult).filter(
            BatchCalculationResult.scenario_id == scenario_id
        ).all()
        
        scenario_data = {
            "id": scenario.id,
            "name": scenario.name,
            "description": scenario.description,
            "parameters": scenario.parameters,
            "session_id": scenario.session_id,
            "has_calculation_results": len(calculation_results) > 0,
            "calculation_count": len(calculation_results),
            "created_at": scenario.created_at.isoformat(),
            "updated_at": scenario.updated_at.isoformat()
        }
        
        if include_audit_log:
            audit_logs = scenario_dal.get_audit_history(scenario_id, limit=20)
            scenario_data["audit_history"] = [
                {
                    "id": log.id,
                    "action": log.action,
                    "old_values": log.old_values,
                    "new_values": log.new_values,
                    "timestamp": log.timestamp.isoformat()
                }
                for log in audit_logs
            ]
        
        return ApiResponse(
            success=True,
            message=f"Retrieved scenario '{scenario.name}'",
            data=scenario_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving scenario {scenario_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve scenario: {str(e)}"
        )


@router.put("/{scenario_id}", response_model=ApiResponse)
async def update_scenario(
    scenario_id: str,
    update_data: BatchScenarioUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a scenario.
    
    Args:
        scenario_id: ID of the scenario to update
        update_data: Update data
        db: Database session
        
    Returns:
        ApiResponse with updated scenario details
    """
    try:
        scenario_dal = ScenarioDAL(db)
        updated_scenario = scenario_dal.update_with_audit(scenario_id, update_data)
        
        if not updated_scenario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scenario {scenario_id} not found"
            )
        
        return ApiResponse(
            success=True,
            message=f"Scenario '{updated_scenario.name}' updated successfully",
            data={
                "id": updated_scenario.id,
                "name": updated_scenario.name,
                "description": updated_scenario.description,
                "parameters": updated_scenario.parameters,
                "session_id": updated_scenario.session_id,
                "created_at": updated_scenario.created_at.isoformat(),
                "updated_at": updated_scenario.updated_at.isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating scenario {scenario_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update scenario: {str(e)}"
        )


@router.delete("/{scenario_id}", response_model=ApiResponse)
async def delete_scenario(
    scenario_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete a scenario.
    
    Args:
        scenario_id: ID of the scenario to delete
        db: Database session
        
    Returns:
        ApiResponse confirming deletion
    """
    try:
        scenario_dal = ScenarioDAL(db)
        
        # Get scenario name before deletion for response
        scenario = scenario_dal.get(scenario_id)
        if not scenario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scenario {scenario_id} not found"
            )
        
        scenario_name = scenario.name
        deleted = scenario_dal.delete_with_audit(scenario_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scenario {scenario_id} not found"
            )
        
        return ApiResponse(
            success=True,
            message=f"Scenario '{scenario_name}' deleted successfully",
            data={"deleted_scenario_id": scenario_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting scenario {scenario_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete scenario: {str(e)}"
        )


@router.post("/{scenario_id}/duplicate", response_model=ApiResponse)
async def duplicate_scenario(
    scenario_id: str,
    new_name: str = Body(..., embed=True),
    new_description: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db)
):
    """
    Create a duplicate of an existing scenario.
    
    Args:
        scenario_id: ID of the scenario to duplicate
        new_name: Name for the new scenario
        new_description: Optional description for the new scenario
        db: Database session
        
    Returns:
        ApiResponse with duplicated scenario details
    """
    try:
        scenario_dal = ScenarioDAL(db)
        duplicate = scenario_dal.duplicate_scenario(scenario_id, new_name, new_description)
        
        if not duplicate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scenario {scenario_id} not found"
            )
        
        return ApiResponse(
            success=True,
            message=f"Scenario duplicated successfully as '{duplicate.name}'",
            data={
                "id": duplicate.id,
                "name": duplicate.name,
                "description": duplicate.description,
                "parameters": duplicate.parameters,
                "session_id": duplicate.session_id,
                "duplicated_from": scenario_id,
                "created_at": duplicate.created_at.isoformat(),
                "updated_at": duplicate.updated_at.isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error duplicating scenario {scenario_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to duplicate scenario: {str(e)}"
        )


@router.get("/{scenario_id}/audit-history", response_model=ApiResponse)
async def get_scenario_audit_history(
    scenario_id: str,
    limit: int = Query(50, description="Maximum number of audit entries to return"),
    db: Session = Depends(get_db)
):
    """
    Get audit history for a scenario.
    
    Args:
        scenario_id: ID of the scenario
        limit: Maximum number of audit entries to return
        db: Database session
        
    Returns:
        ApiResponse with audit history
    """
    try:
        scenario_dal = ScenarioDAL(db)
        
        # Verify scenario exists
        scenario = scenario_dal.get(scenario_id)
        if not scenario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scenario {scenario_id} not found"
            )
        
        audit_logs = scenario_dal.get_audit_history(scenario_id, limit)
        
        audit_history = [
            {
                "id": log.id,
                "action": log.action,
                "old_values": log.old_values,
                "new_values": log.new_values,
                "timestamp": log.timestamp.isoformat()
            }
            for log in audit_logs
        ]
        
        return ApiResponse(
            success=True,
            message=f"Retrieved audit history for scenario '{scenario.name}'",
            data={
                "scenario_id": scenario_id,
                "scenario_name": scenario.name,
                "audit_history": audit_history,
                "total_entries": len(audit_history)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting audit history for scenario {scenario_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get audit history: {str(e)}"
        )


@router.get("/sources/batches", response_model=ApiResponse)
async def get_available_batch_sources(
    session_id: str = Query(..., description="Session ID to filter batches"),
    db: Session = Depends(get_db)
):
    """
    Get available completed batch uploads that can be used as scenario data sources.
    
    Args:
        session_id: Session ID to filter batches
        db: Database session
        
    Returns:
        ApiResponse with available batch sources
    """
    try:
        batch_dal = BatchUploadDAL(db)
        uploads = batch_dal.get_by_session(session_id)
        
        # Filter to only completed uploads with employee data
        available_sources = []
        for upload in uploads:
            if upload.status == "completed":
                # Check if upload has employee data
                employee_count = db.query(EmployeeData).filter(
                    EmployeeData.batch_upload_id == upload.id
                ).count()
                
                if employee_count > 0:
                    available_sources.append({
                        "id": upload.id,
                        "filename": upload.original_filename,
                        "upload_date": upload.created_at.isoformat(),
                        "employee_count": employee_count,
                        "file_size": upload.file_size,
                        "has_calculation_results": upload.calculation_parameters is not None
                    })
        
        return ApiResponse(
            success=True,
            message=f"Found {len(available_sources)} available batch sources",
            data={
                "sources": available_sources,
                "session_id": session_id
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting available batch sources for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get available sources: {str(e)}"
        ) 