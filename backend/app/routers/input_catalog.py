"""
Input Catalog API router for managing configurable bonus calculation parameters.
Allows tenants to define custom input parameters with validation rules.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from ..middleware import RequiredTenant, get_tenant_db_session
from ..services.input_catalog_service import get_input_catalog_service
from ..schemas import (
    InputCatalogCreate, InputCatalogResponse, InputCatalogUpdate,
    PlatformApiResponse
)

router = APIRouter(prefix="/input-catalog", tags=["input-catalog"])

@router.post("", response_model=PlatformApiResponse)
async def create_input_definition(
    input_data: InputCatalogCreate,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Create a new input parameter definition."""
    try:
        db = get_tenant_db_session(request)
        input_service = get_input_catalog_service(db, tenant_id)
        
        input_def = input_service.create_input_definition(input_data)
        
        return PlatformApiResponse(
            success=True,
            message="Input definition created successfully",
            data={"input": input_def.model_dump()},
            tenant_id=tenant_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create input definition: {str(e)}"
        )
    finally:
        db.close()


@router.get("", response_model=PlatformApiResponse)
async def list_input_definitions(
    required_only: Optional[bool] = None,
    dtype: Optional[str] = None,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """List input parameter definitions for the tenant."""
    try:
        db = get_tenant_db_session(request)
        input_service = get_input_catalog_service(db, tenant_id)
        
        inputs = input_service.get_input_definitions(
            required_only=required_only,
            dtype=dtype
        )
        
        return PlatformApiResponse(
            success=True,
            data={"inputs": [i.model_dump() for i in inputs]},
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list input definitions: {str(e)}"
        )
    finally:
        db.close()


@router.get("/{input_id}", response_model=PlatformApiResponse)
async def get_input_definition(
    input_id: str,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Get a specific input parameter definition."""
    try:
        db = get_tenant_db_session(request)
        input_service = get_input_catalog_service(db, tenant_id)
        
        input_def = input_service.get_input_definition(input_id)
        
        if not input_def:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Input definition not found"
            )
        
        return PlatformApiResponse(
            success=True,
            data={"input": input_def.model_dump()},
            tenant_id=tenant_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get input definition: {str(e)}"
        )
    finally:
        db.close()


@router.put("/{input_id}", response_model=PlatformApiResponse)
async def update_input_definition(
    input_id: str,
    input_data: InputCatalogUpdate,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Update an input parameter definition."""
    try:
        db = get_tenant_db_session(request)
        input_service = get_input_catalog_service(db, tenant_id)
        
        input_def = input_service.update_input_definition(input_id, input_data)
        
        if not input_def:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Input definition not found"
            )
        
        return PlatformApiResponse(
            success=True,
            message="Input definition updated successfully",
            data={"input": input_def.model_dump()},
            tenant_id=tenant_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update input definition: {str(e)}"
        )
    finally:
        db.close()


@router.delete("/{input_id}", response_model=PlatformApiResponse)
async def delete_input_definition(
    input_id: str,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Delete an input parameter definition."""
    try:
        db = get_tenant_db_session(request)
        input_service = get_input_catalog_service(db, tenant_id)
        
        success = input_service.delete_input_definition(input_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Input definition not found"
            )
        
        return PlatformApiResponse(
            success=True,
            message="Input definition deleted successfully",
            tenant_id=tenant_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete input definition: {str(e)}"
        )
    finally:
        db.close()


@router.post("/validate", response_model=PlatformApiResponse)
async def validate_input_values(
    input_values: Dict[str, Any],
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Validate input values against their definitions."""
    try:
        db = get_tenant_db_session(request)
        input_service = get_input_catalog_service(db, tenant_id)
        
        validation_result = input_service.validate_input_values(input_values)
        
        return PlatformApiResponse(
            success=validation_result["valid"],
            message="Validation completed",
            data=validation_result,
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate input values: {str(e)}"
        )
    finally:
        db.close()


@router.post("/defaults", response_model=PlatformApiResponse)
async def create_default_inputs(
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Create default input catalog entries for common bonus calculation parameters."""
    try:
        db = get_tenant_db_session(request)
        input_service = get_input_catalog_service(db, tenant_id)
        
        default_inputs = input_service.create_default_input_catalog()
        
        return PlatformApiResponse(
            success=True,
            message=f"Created {len(default_inputs)} default input definitions",
            data={"inputs": [i.model_dump() for i in default_inputs]},
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create default inputs: {str(e)}"
        )
    finally:
        db.close()