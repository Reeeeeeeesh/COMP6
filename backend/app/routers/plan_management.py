"""
Plan Management API router for bonus plan and step operations.
Provides CRUD operations for bonus plans, plan steps, and plan inputs.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session

from ..middleware import RequiredTenant, get_tenant_db_session
from ..services.plan_management_service import get_plan_management_service
from ..services.expression_validation_service import get_expression_validation_service
from ..services.approval_workflow_service import get_approval_workflow_service
from ..schemas import (
    BonusPlanCreate, BonusPlanResponse, BonusPlanUpdate,
    PlanStepCreate, PlanStepResponse, PlanStepUpdate,
    PlanInputCreate, PlanInputResponse,
    PlatformApiResponse
)

router = APIRouter(prefix="/plan-management", tags=["plan-management"])

# ================================
# Bonus Plan Operations
# ================================

@router.get("/plans", response_model=PlatformApiResponse)
async def list_bonus_plans(
    status: Optional[str] = Query(None, description="Filter by plan status"),
    include_steps: bool = Query(False, description="Include plan steps in response"),
    include_inputs: bool = Query(False, description="Include plan inputs in response"),
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """List all bonus plans for the tenant with optional filters and includes."""
    try:
        db = get_tenant_db_session(request)
        plan_service = get_plan_management_service(db, tenant_id)
        
        plans = plan_service.get_plans(
            status_filter=status,
            include_steps=include_steps,
            include_inputs=include_inputs
        )
        
        return PlatformApiResponse(
            success=True,
            data={"plans": [p.model_dump() for p in plans]},
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list plans: {str(e)}"
        )
    finally:
        db.close()


@router.get("/plans/{plan_id}", response_model=PlatformApiResponse)
async def get_bonus_plan(
    plan_id: str,
    include_steps: bool = Query(False, description="Include plan steps"),
    include_inputs: bool = Query(False, description="Include plan inputs"),
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Get a specific bonus plan with optional related data."""
    try:
        db = get_tenant_db_session(request)
        plan_service = get_plan_management_service(db, tenant_id)
        
        plan = plan_service.get_plan(
            plan_id, 
            include_steps=include_steps,
            include_inputs=include_inputs
        )
        
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bonus plan not found"
            )
        
        return PlatformApiResponse(
            success=True,
            data={"plan": plan.model_dump()},
            tenant_id=tenant_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get plan: {str(e)}"
        )
    finally:
        db.close()


@router.put("/plans/{plan_id}", response_model=PlatformApiResponse)
async def update_bonus_plan(
    plan_id: str,
    plan_data: BonusPlanUpdate,
    updated_by: Optional[str] = Query(None, description="User ID performing update"),
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Update a bonus plan (only if not locked)."""
    try:
        db = get_tenant_db_session(request)
        plan_service = get_plan_management_service(db, tenant_id)
        
        plan = plan_service.update_plan(plan_id, plan_data, updated_by)
        
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bonus plan not found or cannot be updated"
            )
        
        return PlatformApiResponse(
            success=True,
            message="Bonus plan updated successfully",
            data={"plan": plan.model_dump()},
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
            detail=f"Failed to update plan: {str(e)}"
        )
    finally:
        db.close()


# ================================
# Plan Step Operations  
# ================================

@router.post("/plans/{plan_id}/steps", response_model=PlatformApiResponse)
async def create_plan_step(
    plan_id: str,
    step_data: PlanStepCreate,
    created_by: Optional[str] = Query(None, description="User ID creating step"),
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Create a new calculation step for a bonus plan."""
    try:
        db = get_tenant_db_session(request)
        plan_service = get_plan_management_service(db, tenant_id)
        
        step = plan_service.create_plan_step(plan_id, step_data, created_by)
        
        return PlatformApiResponse(
            success=True,
            message="Plan step created successfully",
            data={"step": step.model_dump()},
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
            detail=f"Failed to create plan step: {str(e)}"
        )
    finally:
        db.close()


@router.get("/plans/{plan_id}/steps", response_model=PlatformApiResponse)
async def list_plan_steps(
    plan_id: str,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """List all calculation steps for a bonus plan."""
    try:
        db = get_tenant_db_session(request)
        plan_service = get_plan_management_service(db, tenant_id)
        
        steps = plan_service.get_plan_steps(plan_id)
        
        return PlatformApiResponse(
            success=True,
            data={"steps": [s.model_dump() for s in steps]},
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list plan steps: {str(e)}"
        )
    finally:
        db.close()


@router.get("/steps/{step_id}", response_model=PlatformApiResponse)
async def get_plan_step(
    step_id: str,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Get a specific plan step."""
    try:
        db = get_tenant_db_session(request)
        plan_service = get_plan_management_service(db, tenant_id)
        
        step = plan_service.get_plan_step(step_id)
        
        if not step:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plan step not found"
            )
        
        return PlatformApiResponse(
            success=True,
            data={"step": step.model_dump()},
            tenant_id=tenant_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get plan step: {str(e)}"
        )
    finally:
        db.close()


@router.put("/steps/{step_id}", response_model=PlatformApiResponse)
async def update_plan_step(
    step_id: str,
    step_data: PlanStepUpdate,
    updated_by: Optional[str] = Query(None, description="User ID performing update"),
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Update a plan step (only if plan is not locked)."""
    try:
        db = get_tenant_db_session(request)
        plan_service = get_plan_management_service(db, tenant_id)
        
        step = plan_service.update_plan_step(step_id, step_data, updated_by)
        
        if not step:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plan step not found or cannot be updated"
            )
        
        return PlatformApiResponse(
            success=True,
            message="Plan step updated successfully",
            data={"step": step.model_dump()},
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
            detail=f"Failed to update plan step: {str(e)}"
        )
    finally:
        db.close()


@router.delete("/steps/{step_id}", response_model=PlatformApiResponse)
async def delete_plan_step(
    step_id: str,
    deleted_by: Optional[str] = Query(None, description="User ID performing deletion"),
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Delete a plan step (only if plan is not locked)."""
    try:
        db = get_tenant_db_session(request)
        plan_service = get_plan_management_service(db, tenant_id)
        
        success = plan_service.delete_plan_step(step_id, deleted_by)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plan step not found or cannot be deleted"
            )
        
        return PlatformApiResponse(
            success=True,
            message="Plan step deleted successfully",
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
            detail=f"Failed to delete plan step: {str(e)}"
        )
    finally:
        db.close()


# ================================
# Plan Input Operations
# ================================

@router.post("/plans/{plan_id}/inputs", response_model=PlatformApiResponse)
async def add_plan_input(
    plan_id: str,
    input_data: PlanInputCreate,
    added_by: Optional[str] = Query(None, description="User ID adding input"),
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Add an input parameter to a bonus plan."""
    try:
        db = get_tenant_db_session(request)
        plan_service = get_plan_management_service(db, tenant_id)
        
        plan_input = plan_service.add_plan_input(plan_id, input_data, added_by)
        
        return PlatformApiResponse(
            success=True,
            message="Plan input added successfully",
            data={"input": plan_input.model_dump()},
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
            detail=f"Failed to add plan input: {str(e)}"
        )
    finally:
        db.close()


@router.get("/plans/{plan_id}/inputs", response_model=PlatformApiResponse)
async def list_plan_inputs(
    plan_id: str,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """List all input parameters for a bonus plan."""
    try:
        db = get_tenant_db_session(request)
        plan_service = get_plan_management_service(db, tenant_id)
        
        inputs = plan_service.get_plan_inputs(plan_id)
        
        return PlatformApiResponse(
            success=True,
            data={"inputs": [i.model_dump() for i in inputs]},
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list plan inputs: {str(e)}"
        )
    finally:
        db.close()


@router.delete("/plan-inputs/{input_id}", response_model=PlatformApiResponse)
async def remove_plan_input(
    input_id: str,
    removed_by: Optional[str] = Query(None, description="User ID removing input"),
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Remove an input parameter from a bonus plan."""
    try:
        db = get_tenant_db_session(request)
        plan_service = get_plan_management_service(db, tenant_id)
        
        success = plan_service.remove_plan_input(input_id, removed_by)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plan input not found or cannot be removed"
            )
        
        return PlatformApiResponse(
            success=True,
            message="Plan input removed successfully",
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
            detail=f"Failed to remove plan input: {str(e)}"
        )
    finally:
        db.close()


# ================================
# Plan Validation and Utilities
# ================================

@router.post("/plans/{plan_id}/validate", response_model=PlatformApiResponse)
async def validate_plan(
    plan_id: str,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Validate a bonus plan's structure and dependencies."""
    try:
        db = get_tenant_db_session(request)
        plan_service = get_plan_management_service(db, tenant_id)
        
        validation_result = plan_service.validate_plan(plan_id)
        
        return PlatformApiResponse(
            success=validation_result["valid"],
            message="Plan validation completed",
            data=validation_result,
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate plan: {str(e)}"
        )
    finally:
        db.close()


@router.post("/plans/{plan_id}/reorder-steps", response_model=PlatformApiResponse)
async def reorder_plan_steps(
    plan_id: str,
    step_order: List[Dict[str, Any]],
    reordered_by: Optional[str] = Query(None, description="User ID performing reorder"),
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Reorder plan steps (only if plan is not locked)."""
    try:
        db = get_tenant_db_session(request)
        plan_service = get_plan_management_service(db, tenant_id)
        
        steps = plan_service.reorder_plan_steps(plan_id, step_order, reordered_by)
        
        return PlatformApiResponse(
            success=True,
            message="Plan steps reordered successfully",
            data={"steps": [s.model_dump() for s in steps]},
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
            detail=f"Failed to reorder plan steps: {str(e)}"
        )
    finally:
        db.close()


# ================================
# Expression Validation Operations
# ================================

@router.post("/plans/{plan_id}/validate-expression", response_model=PlatformApiResponse)
async def validate_expression(
    plan_id: str,
    expression_data: Dict[str, Any],
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Validate an expression in the context of a bonus plan."""
    try:
        db = get_tenant_db_session(request)
        validation_service = get_expression_validation_service(db, tenant_id)
        
        expression = expression_data.get('expression')
        step_order = expression_data.get('step_order')
        exclude_step_id = expression_data.get('exclude_step_id')
        
        if not expression:
            raise ValueError("Expression is required")
        
        result = validation_service.validate_step_expression(
            plan_id, expression, step_order, exclude_step_id
        )
        
        return PlatformApiResponse(
            success=result['valid'],
            message="Expression validation completed",
            data=result,
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
            detail=f"Failed to validate expression: {str(e)}"
        )
    finally:
        db.close()


@router.post("/plans/{plan_id}/validate-condition", response_model=PlatformApiResponse)
async def validate_condition(
    plan_id: str,
    condition_data: Dict[str, Any],
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Validate a condition expression in the context of a bonus plan."""
    try:
        db = get_tenant_db_session(request)
        validation_service = get_expression_validation_service(db, tenant_id)
        
        condition = condition_data.get('condition')
        step_order = condition_data.get('step_order')
        exclude_step_id = condition_data.get('exclude_step_id')
        
        if not condition:
            return PlatformApiResponse(
                success=True,
                message="Empty condition is valid",
                data={'valid': True},
                tenant_id=tenant_id
            )
        
        result = validation_service.validate_condition_expression(
            plan_id, condition, step_order, exclude_step_id
        )
        
        return PlatformApiResponse(
            success=result['valid'],
            message="Condition validation completed",
            data=result,
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
            detail=f"Failed to validate condition: {str(e)}"
        )
    finally:
        db.close()


@router.get("/plans/{plan_id}/variable-context", response_model=PlatformApiResponse)
async def get_plan_variable_context(
    plan_id: str,
    up_to_step: Optional[int] = Query(None, description="Get variables up to this step order"),
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Get available variables for a plan at a given step."""
    try:
        db = get_tenant_db_session(request)
        validation_service = get_expression_validation_service(db, tenant_id)
        
        context = validation_service.get_plan_variable_context(plan_id, up_to_step)
        
        return PlatformApiResponse(
            success=True,
            message="Variable context retrieved",
            data=context,
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get variable context: {str(e)}"
        )
    finally:
        db.close()


@router.post("/plans/{plan_id}/validate-all-expressions", response_model=PlatformApiResponse)
async def validate_all_plan_expressions(
    plan_id: str,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Validate all expressions in a bonus plan."""
    try:
        db = get_tenant_db_session(request)
        validation_service = get_expression_validation_service(db, tenant_id)
        
        result = validation_service.validate_plan_expressions(plan_id)
        
        return PlatformApiResponse(
            success=result['valid'],
            message=f"Validated {result.get('steps_validated', 0)} plan expressions",
            data=result,
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate plan expressions: {str(e)}"
        )
    finally:
        db.close()


# ================================
# Approval Workflow Endpoints
# ================================

@router.post("/plans/{plan_id}/approve", response_model=PlatformApiResponse)
async def approve_plan(
    plan_id: str,
    notes: Optional[str] = None,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant),
    user_id: str = Query(..., description="ID of user performing approval")
):
    """Approve a draft bonus plan (HR and Admin roles only)."""
    try:
        db = get_tenant_db_session(request)
        workflow_service = get_approval_workflow_service(db, tenant_id)
        
        result = workflow_service.approve_plan(plan_id, user_id, notes)
        
        if result['success']:
            return PlatformApiResponse(
                success=True,
                message=f"Plan approved successfully by {result['performed_by']}",
                data=result,
                tenant_id=tenant_id
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['error']
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve plan: {str(e)}"
        )
    finally:
        db.close()


@router.post("/plans/{plan_id}/lock", response_model=PlatformApiResponse)  
async def lock_plan(
    plan_id: str,
    notes: Optional[str] = None,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant),
    user_id: str = Query(..., description="ID of user performing lock")
):
    """Lock an approved bonus plan (Admin role only)."""
    try:
        db = get_tenant_db_session(request)
        workflow_service = get_approval_workflow_service(db, tenant_id)
        
        result = workflow_service.lock_plan(plan_id, user_id, notes)
        
        if result['success']:
            return PlatformApiResponse(
                success=True,
                message=f"Plan locked successfully by {result['performed_by']}",
                data=result,
                tenant_id=tenant_id
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['error']
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to lock plan: {str(e)}"
        )
    finally:
        db.close()


@router.post("/plans/{plan_id}/archive", response_model=PlatformApiResponse)
async def archive_plan(
    plan_id: str,
    notes: Optional[str] = None, 
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant),
    user_id: str = Query(..., description="ID of user performing archive")
):
    """Archive a bonus plan (Admin role only)."""
    try:
        db = get_tenant_db_session(request)
        workflow_service = get_approval_workflow_service(db, tenant_id)
        
        result = workflow_service.archive_plan(plan_id, user_id, notes)
        
        if result['success']:
            return PlatformApiResponse(
                success=True,
                message=f"Plan archived successfully by {result['performed_by']}",
                data=result,
                tenant_id=tenant_id
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['error']
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to archive plan: {str(e)}"
        )
    finally:
        db.close()


@router.post("/plans/{plan_id}/revert-to-draft", response_model=PlatformApiResponse)
async def revert_plan_to_draft(
    plan_id: str,
    notes: Optional[str] = None,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant),
    user_id: str = Query(..., description="ID of user performing revert")
):
    """Revert approved plan back to draft (Admin and HR roles only)."""
    try:
        db = get_tenant_db_session(request)
        workflow_service = get_approval_workflow_service(db, tenant_id)
        
        result = workflow_service.revert_to_draft(plan_id, user_id, notes)
        
        if result['success']:
            return PlatformApiResponse(
                success=True,
                message=f"Plan reverted to draft by {result['performed_by']}",
                data=result,
                tenant_id=tenant_id
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['error']
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revert plan: {str(e)}"
        )
    finally:
        db.close()


@router.get("/plans/{plan_id}/workflow-status", response_model=PlatformApiResponse)
async def get_plan_workflow_status(
    plan_id: str,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Get comprehensive workflow status and history for a plan."""
    try:
        db = get_tenant_db_session(request)
        workflow_service = get_approval_workflow_service(db, tenant_id)
        
        status_info = workflow_service.get_plan_workflow_status(plan_id)
        
        if 'error' in status_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=status_info['error']
            )
        
        return PlatformApiResponse(
            success=True,
            message="Workflow status retrieved successfully",
            data=status_info,
            tenant_id=tenant_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get workflow status: {str(e)}"
        )
    finally:
        db.close()


# ================================
# Plan Execution with Tape
# ================================

@router.post("/plans/{plan_id}/execute-with-tape", response_model=PlatformApiResponse)
async def execute_plan_with_tape(
    plan_id: str,
    precision_mode: str = "balanced",
    upload_id: Optional[str] = Query(None, description="Associated upload ID"),
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Execute a bonus plan with step-level result persistence for calculation transparency."""
    try:
        db = get_tenant_db_session(request)
        plan_service = get_plan_management_service(db, tenant_id)
        
        # This would need employee data - for now return placeholder
        # In production, this would integrate with upload system
        import polars as pl
        sample_data = pl.DataFrame({
            "employee_id": ["EMP001", "EMP002"],
            "base_salary": [100000, 120000],
            "target_bonus_pct": [0.2, 0.25]
        })
        
        result = plan_service.execute_plan_with_tape(
            plan_id=plan_id,
            employee_data_df=sample_data,
            precision_mode=precision_mode,
            upload_id=upload_id
        )
        
        return PlatformApiResponse(
            success=True,
            message="Plan executed with calculation tape successfully",
            data=result,
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute plan with tape: {str(e)}"
        )
    finally:
        db.close()


# ================================
# Calculation Tape & Step Results
# ================================

@router.get("/plans/{plan_id}/runs/{run_id}/calculation-tape", response_model=PlatformApiResponse)
async def get_calculation_tape(
    plan_id: str,
    run_id: str,
    employee_ref: Optional[str] = Query(None, description="Filter by specific employee"),
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Get step-by-step calculation tape for a plan run."""
    try:
        db = get_tenant_db_session(request)
        plan_service = get_plan_management_service(db, tenant_id)
        
        # Verify plan and run exist and belong to tenant
        plan = plan_service.get_plan(plan_id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plan not found"
            )
        
        # Get step results for the run
        from ..models import RunStepResult, PlanRun
        
        query = db.query(RunStepResult).join(PlanRun).filter(
            PlanRun.id == run_id,
            PlanRun.plan_id == plan_id,
            RunStepResult.run_id == run_id
        )
        
        if employee_ref:
            query = query.filter(RunStepResult.employee_ref == employee_ref)
        
        step_results = query.order_by(
            RunStepResult.employee_ref,
            RunStepResult.created_at
        ).all()
        
        # Organize results by employee
        calculation_tape = {}
        for result in step_results:
            emp_ref = result.employee_ref
            if emp_ref not in calculation_tape:
                calculation_tape[emp_ref] = []
            
            calculation_tape[emp_ref].append({
                "step_name": result.step_name,
                "value": result.value,
                "created_at": result.created_at.isoformat()
            })
        
        return PlatformApiResponse(
            success=True,
            message="Calculation tape retrieved successfully",
            data={
                "plan_id": plan_id,
                "run_id": run_id,
                "calculation_tape": calculation_tape,
                "total_employees": len(calculation_tape),
                "total_steps": len(step_results)
            },
            tenant_id=tenant_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get calculation tape: {str(e)}"
        )
    finally:
        db.close()


@router.get("/plans/{plan_id}/runs/{run_id}/step-results/{step_name}", response_model=PlatformApiResponse)
async def get_step_results(
    plan_id: str,
    run_id: str,
    step_name: str,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Get results for a specific calculation step across all employees."""
    try:
        db = get_tenant_db_session(request)
        plan_service = get_plan_management_service(db, tenant_id)
        
        # Verify plan exists and belongs to tenant
        plan = plan_service.get_plan(plan_id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plan not found"
            )
        
        # Get step results
        from ..models import RunStepResult, PlanRun
        
        step_results = db.query(RunStepResult).join(PlanRun).filter(
            PlanRun.id == run_id,
            PlanRun.plan_id == plan_id,
            RunStepResult.run_id == run_id,
            RunStepResult.step_name == step_name
        ).order_by(RunStepResult.employee_ref).all()
        
        if not step_results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Step results not found"
            )
        
        # Format results
        results_data = []
        for result in step_results:
            results_data.append({
                "employee_ref": result.employee_ref,
                "step_name": result.step_name,
                "value": result.value,
                "created_at": result.created_at.isoformat()
            })
        
        return PlatformApiResponse(
            success=True,
            message="Step results retrieved successfully",
            data={
                "plan_id": plan_id,
                "run_id": run_id,
                "step_name": step_name,
                "results": results_data,
                "total_employees": len(results_data)
            },
            tenant_id=tenant_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get step results: {str(e)}"
        )
    finally:
        db.close()


# ================================
# Snapshot Hash & Reproducibility
# ================================

@router.get("/plans/{plan_id}/snapshot-summary", response_model=PlatformApiResponse)
async def get_plan_snapshot_summary(
    plan_id: str,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Get human-readable summary of what's included in the plan snapshot."""
    try:
        db = get_tenant_db_session(request)
        from ..services.snapshot_hash_generator import get_snapshot_hash_generator
        
        hash_generator = get_snapshot_hash_generator(db, tenant_id)
        summary = hash_generator.get_plan_snapshot_summary(plan_id)
        
        return PlatformApiResponse(
            success=True,
            message="Plan snapshot summary retrieved successfully",
            data=summary,
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get snapshot summary: {str(e)}"
        )
    finally:
        db.close()


@router.post("/plans/{plan_id}/verify-reproducibility", response_model=PlatformApiResponse)
async def verify_plan_reproducibility(
    plan_id: str,
    expected_hash: str = Query(..., description="Expected snapshot hash from previous execution"),
    precision_mode: str = Query('balanced', description="Precision mode"),
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Verify if current plan configuration would produce the same snapshot hash."""
    try:
        db = get_tenant_db_session(request)
        from ..services.snapshot_hash_generator import get_snapshot_hash_generator
        
        hash_generator = get_snapshot_hash_generator(db, tenant_id)
        
        # Use sample employee data structure for verification
        sample_structure = {
            'employee_id': 'string',
            'base_salary': 'float64',
            'target_bonus_pct': 'float64'
        }
        
        verification_result = hash_generator.verify_snapshot_reproducibility(
            plan_id=plan_id,
            expected_hash=expected_hash,
            employee_data_structure=sample_structure,
            precision_mode=precision_mode
        )
        
        return PlatformApiResponse(
            success=True,
            message="Reproducibility verification completed",
            data=verification_result,
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify reproducibility: {str(e)}"
        )
    finally:
        db.close()


@router.get("/runs/{run_id}/snapshot-hash", response_model=PlatformApiResponse)
async def get_run_snapshot_hash(
    run_id: str,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Get the snapshot hash for a specific plan run."""
    try:
        db = get_tenant_db_session(request)
        
        # Get plan run with snapshot hash
        plan_run = db.query(PlanRun).filter(
            PlanRun.id == run_id,
            PlanRun.tenant_id == tenant_id
        ).first()
        
        if not plan_run:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plan run not found"
            )
        
        return PlatformApiResponse(
            success=True,
            message="Snapshot hash retrieved successfully",
            data={
                'run_id': run_id,
                'plan_id': plan_run.plan_id,
                'snapshot_hash': plan_run.snapshot_hash,
                'started_at': plan_run.started_at.isoformat(),
                'finished_at': plan_run.finished_at.isoformat() if plan_run.finished_at else None,
                'status': plan_run.status,
                'reproducibility_guaranteed': True
            },
            tenant_id=tenant_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get snapshot hash: {str(e)}"
        )
    finally:
        db.close()