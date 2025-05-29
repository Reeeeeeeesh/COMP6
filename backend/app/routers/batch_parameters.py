"""
Batch Parameters API Endpoints

This module provides REST API endpoints for managing batch calculation parameters.
"""

import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..dal.batch_upload_dal import BatchUploadDAL
from ..schemas import (
    ApiResponse, BatchUploadResponse, BatchUploadUpdate,
    BatchParameters
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/batch", tags=["batch-parameters"])


@router.put("/uploads/{upload_id}/parameters", response_model=ApiResponse)
async def update_batch_parameters(
    upload_id: str,
    parameters: BatchParameters,
    db: Session = Depends(get_db)
):
    """
    Update calculation parameters for a batch upload.
    
    Args:
        upload_id: ID of the batch upload
        parameters: Calculation parameters
        db: Database session
        
    Returns:
        ApiResponse with updated batch upload
    """
    try:
        # Get batch upload
        batch_dal = BatchUploadDAL(db)
        upload = batch_dal.get(upload_id)
        
        if not upload:
            return ApiResponse(
                success=False,
                message="Upload not found",
                error="Batch upload with the specified ID was not found"
            )
        
        # Validate parameters
        try:
            # Validate weights sum to 1
            weight_sum = parameters.investmentWeight + parameters.qualitativeWeight
            if abs(weight_sum - 1.0) > 0.001:
                return ApiResponse(
                    success=False,
                    message="Invalid parameters",
                    error=f"Investment and qualitative weights must sum to 1.0, got {weight_sum}"
                )
                
            # Validate non-negative values
            if parameters.targetBonusPct < 0:
                return ApiResponse(
                    success=False,
                    message="Invalid parameters",
                    error="Target bonus percentage must be non-negative"
                )
                
            if parameters.investmentScoreMultiplier < 0:
                return ApiResponse(
                    success=False,
                    message="Invalid parameters",
                    error="Investment score multiplier must be non-negative"
                )
                
            if parameters.qualScoreMultiplier < 0:
                return ApiResponse(
                    success=False,
                    message="Invalid parameters",
                    error="Qualitative score multiplier must be non-negative"
                )
                
            if parameters.raf < 0:
                return ApiResponse(
                    success=False,
                    message="Invalid parameters",
                    error="RAF must be non-negative"
                )
                
            if parameters.mrtCapPct < 0:
                return ApiResponse(
                    success=False,
                    message="Invalid parameters",
                    error="MRT cap percentage must be non-negative"
                )
                
            if parameters.baseSalaryCapMultiplier is not None and parameters.baseSalaryCapMultiplier < 1:
                return ApiResponse(
                    success=False,
                    message="Invalid parameters",
                    error="Base salary cap multiplier must be at least 1"
                )
        except Exception as e:
            return ApiResponse(
                success=False,
                message="Parameter validation failed",
                error=str(e)
            )
        
        # Update batch upload with calculation parameters
        updated_upload = batch_dal.update_calculation_parameters(upload_id, parameters.model_dump())
        
        return ApiResponse(
            success=True,
            message="Calculation parameters updated successfully",
            data=BatchUploadResponse.model_validate(updated_upload)
        )
        
    except Exception as e:
        logger.error(f"Error updating calculation parameters for upload {upload_id}: {str(e)}")
        return ApiResponse(
            success=False,
            message="Failed to update calculation parameters",
            error=str(e)
        )


@router.get("/uploads/{upload_id}/parameters", response_model=ApiResponse)
async def get_batch_parameters(
    upload_id: str,
    db: Session = Depends(get_db)
):
    """
    Get calculation parameters for a batch upload.
    
    Args:
        upload_id: ID of the batch upload
        db: Database session
        
    Returns:
        ApiResponse with batch parameters
    """
    try:
        # Get batch upload
        batch_dal = BatchUploadDAL(db)
        upload = batch_dal.get(upload_id)
        
        if not upload:
            return ApiResponse(
                success=False,
                message="Upload not found",
                error="Batch upload with the specified ID was not found"
            )
        
        # Return parameters
        return ApiResponse(
            success=True,
            message="Calculation parameters retrieved successfully",
            data={
                "upload_id": upload_id,
                "parameters": upload.calculation_parameters
            }
        )
        
    except Exception as e:
        logger.error(f"Error retrieving calculation parameters for upload {upload_id}: {str(e)}")
        return ApiResponse(
            success=False,
            message="Failed to retrieve calculation parameters",
            error=str(e)
        )
