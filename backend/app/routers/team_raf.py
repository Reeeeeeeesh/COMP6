"""
Team RAF API router for managing team Revenue Adjustment Factor operations.

Provides endpoints for creating, previewing, approving, and retrieving RAF configurations,
as well as importing team revenue history data.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body, Query, Path
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import logging

from ..database import get_db
from ..models import User
from ..rbac.permissions import require_permission, require_role, can_approve_raf
from ..dal.platform_dal import AuditEventDAL
from ..schemas import (
    RAFMethod, RAFConfigCreate, RAFConfigResponse, RAFPreviewRequest, RAFPreviewResponse,
    RAFApprovalRequest, RAFStatusResponse, RAFHistoryResponse, TeamRevenueHistoryImport,
    TeamRevenueHistoryRow, TeamRevenueDataResponse, OrgMembershipCreate, ApiResponse
)
from ..services.team_raf_service import get_team_raf_service
from ..services.file_processing_service import FileProcessingService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/teams",
    tags=["team-raf"],
    responses={404: {"description": "Not found"}},
)


@router.post("/{team_id}/raf/config", response_model=RAFConfigResponse)
async def create_raf_config(
    team_id: str,
    config: RAFConfigCreate,
    current_user: User = Depends(require_role(['admin', 'hr'])),
    db: Session = Depends(get_db)
):
    """
    Create a new RAF configuration for a team.
    
    Requires admin or hr role for RAF configuration creation.
    """
    try:
        # Validate team_id in path matches team_id in request body
        if team_id != config.team_id:
            raise HTTPException(
                status_code=400,
                detail="Team ID in path must match team ID in request body"
            )
        
        raf_service = get_team_raf_service(db)
        result = raf_service.create_raf_config(
            team_id=team_id,
            cycle=config.cycle,
            method=config.method,
            options={
                "include_perf_fees": config.include_perf_fees,
                "const_currency": config.const_currency,
                "cap_factor": config.cap_factor,
                "floor_factor": config.floor_factor,
                "weight_pct": config.weight_pct
            },
            created_by=current_user.id
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to create RAF configuration")
            )
        
        # Get the created configuration
        config_id = result.get("config_id")
        created_config = raf_service.raf_config_dal.get_by_id(config_id)
        
        # Add audit logging
        try:
            audit_dal = AuditEventDAL(db)
            audit_dal.log_event(
                action="raf_config_created",
                entity="raf_config",
                entity_id=config_id,
                actor_user_id=current_user.id,
                after={
                    "team_id": team_id,
                    "cycle": config.cycle,
                    "method": config.method,
                    "created_by": current_user.id
                }
            )
            db.commit()
        except Exception as audit_error:
            logger.warning(f"Failed to create audit event for RAF config creation: {audit_error}")
        
        return created_config
        
    except ValueError as e:
        logger.error(f"Validation error creating RAF config: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating RAF config: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{team_id}/raf/{cycle}", response_model=RAFStatusResponse)
async def get_raf_status(
    team_id: str,
    cycle: str,
    current_user: User = Depends(require_role(['admin', 'hr'])),
    db: Session = Depends(get_db)
):
    """
    Get the current status of a team's RAF configuration for a specific cycle.
    
    Requires 'raf_operations.read' permission.
    """
    try:
        raf_service = get_team_raf_service(db)
        result = raf_service.get_raf_status(team_id, cycle)
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting RAF status: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{team_id}/raf/{cycle}/preview", response_model=RAFPreviewResponse)
async def preview_raf(
    team_id: str,
    cycle: str,
    request: RAFPreviewRequest,
    current_user: User = Depends(require_role(['admin', 'hr'])),
    db: Session = Depends(get_db)
):
    """
    Preview RAF calculation based on current configuration.
    
    Requires 'raf_operations.read' permission.
    """
    try:
        raf_service = get_team_raf_service(db)
        
        # Validate that the config belongs to the team and cycle
        config = raf_service.raf_config_dal.get_by_id(request.config_id)
        if not config or config.team_id != team_id or config.cycle != cycle:
            raise HTTPException(
                status_code=404,
                detail="RAF configuration not found for specified team and cycle"
            )
        
        result = raf_service.preview_raf(request.config_id)
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to preview RAF calculation")
            )
        
        return result
        
    except ValueError as e:
        logger.error(f"Validation error previewing RAF: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error previewing RAF: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{team_id}/raf/{cycle}/approve", response_model=ApiResponse)
async def approve_raf(
    team_id: str,
    cycle: str,
    request: RAFApprovalRequest,
    current_user: User = Depends(require_role(['admin', 'hr'])),
    db: Session = Depends(get_db)
):
    """
    Approve a RAF configuration and create an immutable snapshot.
    
    Requires admin or hr role with maker-checker enforcement.
    """
    try:
        raf_service = get_team_raf_service(db)
        
        # Get the configuration for this team and cycle
        config = raf_service.raf_config_dal.get_by_team_and_cycle(team_id, cycle)
        if not config:
            raise HTTPException(
                status_code=404,
                detail="RAF configuration not found for specified team and cycle"
            )
        
        # Check maker-checker separation
        if config.created_by == current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Cannot approve your own RAF configuration (maker-checker separation required)"
            )
        
        # Store config state before approval for audit
        config_before = {
            "status": config.status,
            "approved_by": config.approved_by,
            "approved_at": config.approved_at.isoformat() if config.approved_at else None,
            "rationale": config.rationale
        }
        
        result = raf_service.approve_raf_config(
            config_id=config.id,
            approver_id=current_user.id,
            rationale=request.rationale
        )
        
        # Add audit logging
        try:
            audit_dal = AuditEventDAL(db)
            audit_dal.log_event(
                action="raf_config_approved",
                entity="raf_config",
                entity_id=config.id,
                actor_user_id=current_user.id,
                before=config_before,
                after={
                    "status": "approved",
                    "approved_by": current_user.id,
                    "approved_at": result.get("approved_at"),
                    "rationale": request.rationale,
                    "computed_factor": result.get("computed_factor"),
                    "snapshot_id": result.get("snapshot_id")
                }
            )
            db.commit()
        except Exception as audit_error:
            logger.warning(f"Failed to create audit event for RAF approval: {audit_error}")
        
        return {
            "success": True,
            "message": "RAF configuration approved successfully",
            "data": {
                "config_id": config.id,
                "snapshot_id": result.get("snapshot_id"),
                "team_id": team_id,
                "cycle": cycle,
                "computed_factor": result.get("computed_factor"),
                "approved_by": current_user.id,
                "approved_at": result.get("approved_at")
            }
        }
        
    except ValueError as e:
        logger.error(f"Validation error approving RAF: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error approving RAF: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{team_id}/raf/{cycle}/history", response_model=RAFHistoryResponse)
async def get_raf_history(
    team_id: str,
    cycle: str,
    current_user: User = Depends(require_role(['admin', 'hr'])),
    db: Session = Depends(get_db)
):
    """
    Get the approval history for a RAF configuration.
    
    Requires 'raf_operations.read' permission.
    """
    try:
        raf_service = get_team_raf_service(db)
        result = raf_service.get_raf_history(team_id, cycle)
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting RAF history: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/revenue-history/import", response_model=ApiResponse)
async def import_team_revenue_history(
    file: UploadFile = File(...),
    team_id: str = Form(...),
    current_user: User = Depends(require_role(['admin', 'hr'])),
    db: Session = Depends(get_db)
):
    """
    Import team revenue history from CSV file.
    
    Requires 'raf_operations.import' permission.
    """
    try:
        # Read file content
        file_content = await file.read()
        
        # Process the file
        file_service = FileProcessingService(db)
        
        # Validate file format
        validation_result = file_service.validate_file(file_content, file.filename)
        if not validation_result.is_valid:
            error_message = "; ".join(validation_result.errors)
            raise HTTPException(status_code=400, detail=error_message)
        
        # Process the CSV file to extract team revenue data
        process_result = file_service.process_team_revenue_history_csv(
            file_content=file_content,
            filename=file.filename,
            team_id=team_id,
            created_by=current_user.id
        )
        
        if not process_result[0]:
            raise HTTPException(status_code=400, detail=process_result[1])
        
        created_records = process_result[2]
        
        return {
            "success": True,
            "message": process_result[1],
            "data": {
                "team_id": team_id,
                "filename": file.filename,
                "rows_processed": len(created_records),
                "total_rows": validation_result.total_rows
            }
        }
        
    except ValueError as e:
        logger.error(f"Validation error importing team revenue history: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error importing team revenue history: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/raf/factors/{cycle}", response_model=Dict[str, float])
async def get_team_raf_factors(
    cycle: str,
    current_user: User = Depends(require_permission("raf_operations", "read")),
    db: Session = Depends(get_db)
):
    """
    Get all approved RAF factors for a cycle.
    
    Requires 'raf_operations.read' permission.
    """
    try:
        raf_service = get_team_raf_service(db)
        result = raf_service.get_team_raf_factors(cycle)
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting team RAF factors: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/revenue-history/template", response_model=ApiResponse)
async def get_revenue_history_template(
    current_user: User = Depends(require_permission("raf_operations", "read")),
    db: Session = Depends(get_db)
):
    """
    Get a template CSV file for team revenue history import.
    
    Requires 'raf_operations.read' permission.
    """
    try:
        # Generate template CSV using file processing service
        file_service = FileProcessingService(db)
        template = file_service.get_team_revenue_history_template()
        
        return {
            "success": True,
            "message": "Team revenue history template generated",
            "data": {
                "template": template,
                "filename": "team_revenue_history_template.csv",
                "content_type": "text/csv"
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating revenue history template: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/org-membership/import", response_model=ApiResponse)
async def import_org_membership(
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("raf_operations", "import")),
    db: Session = Depends(get_db)
):
    """
    Import organization membership from CSV file.
    
    Requires 'raf_operations.import' permission.
    """
    try:
        # Read file content
        file_content = await file.read()
        
        # Process the file
        file_service = FileProcessingService(db)
        
        # Validate file format
        validation_result = file_service.validate_file(file_content, file.filename)
        if not validation_result.is_valid:
            error_message = "; ".join(validation_result.errors)
            raise HTTPException(status_code=400, detail=error_message)
        
        # Process the CSV file to extract organization membership data
        process_result = file_service.process_org_membership_csv(
            file_content=file_content,
            filename=file.filename,
            created_by=current_user.id
        )
        
        if not process_result[0]:
            raise HTTPException(status_code=400, detail=process_result[1])
        
        created_records = process_result[2]
        
        return {
            "success": True,
            "message": process_result[1],
            "data": {
                "filename": file.filename,
                "rows_processed": len(created_records),
                "total_rows": validation_result.total_rows
            }
        }
        
    except ValueError as e:
        logger.error(f"Validation error importing organization membership: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error importing organization membership: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/org-membership/template", response_model=ApiResponse)
async def get_org_membership_template(
    current_user: User = Depends(require_permission("raf_operations", "read")),
    db: Session = Depends(get_db)
):
    """
    Get a template CSV file for organization membership import.
    
    Requires 'raf_operations.read' permission.
    """
    try:
        # Generate template CSV using file processing service
        file_service = FileProcessingService(db)
        template = file_service.get_org_membership_template()
        
        return {
            "success": True,
            "message": "Organization membership template generated",
            "data": {
                "template": template,
                "filename": "org_membership_template.csv",
                "content_type": "text/csv"
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating org membership template: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
