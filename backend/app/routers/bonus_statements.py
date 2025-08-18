"""
Bonus Statement API router for generating individual employee statements.
Task 20: Professional PDF and XLSX bonus statement generation.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session

from ..middleware import RequiredTenant, get_tenant_db_session
from ..services.bonus_statement_service import get_bonus_statement_service
from ..schemas import (
    BonusStatementRequest, 
    BonusStatementResponse,
    PlatformApiResponse
)

router = APIRouter(prefix="/bonus-statements", tags=["bonus-statements"])


@router.post("/runs/{run_id}/employees/{employee_ref}/generate", response_model=PlatformApiResponse)
async def generate_bonus_statement(
    run_id: str,
    employee_ref: str,
    statement_request: BonusStatementRequest,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Generate individual bonus statement for an employee from a completed plan run."""
    try:
        db = get_tenant_db_session(request)
        statement_service = get_bonus_statement_service(db, tenant_id)
        
        # Generate statement
        result = statement_service.generate_statement(run_id, employee_ref, statement_request)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Statement generation failed')
            )
        
        # Prepare response data (excluding file_bytes for JSON response)
        response_data = {
            key: value for key, value in result.items() 
            if key != 'file_bytes'
        }
        response_data['download_url'] = f"/api/v1/bonus-statements/runs/{run_id}/employees/{employee_ref}/download?format={statement_request.format}"
        
        return PlatformApiResponse(
            success=True,
            message="Bonus statement generated successfully",
            data=response_data,
            tenant_id=tenant_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate bonus statement: {str(e)}"
        )
    finally:
        db.close()


@router.get("/runs/{run_id}/employees/{employee_ref}/download")
async def download_bonus_statement(
    run_id: str,
    employee_ref: str,
    format: str,
    include_calculation_steps: bool = True,
    company_name: str = "Fund Management Company",
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Download generated bonus statement file."""
    try:
        db = get_tenant_db_session(request)
        statement_service = get_bonus_statement_service(db, tenant_id)
        
        # Create statement request
        statement_request = BonusStatementRequest(
            employee_ref=employee_ref,
            format=format,
            include_calculation_steps=include_calculation_steps,
            company_name=company_name
        )
        
        # Generate statement
        result = statement_service.generate_statement(run_id, employee_ref, statement_request)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Statement generation failed')
            )
        
        # Determine content type
        content_type = 'application/pdf' if format == 'pdf' else 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        
        # Return file as response
        return Response(
            content=result['file_bytes'],
            media_type=content_type,
            headers={
                'Content-Disposition': f'attachment; filename="{result["filename"]}"',
                'Content-Length': str(result['file_size_bytes'])
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download bonus statement: {str(e)}"
        )
    finally:
        db.close()


@router.get("/runs/{run_id}/available-employees", response_model=PlatformApiResponse)
async def get_available_employees_for_statements(
    run_id: str,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Get list of employees available for statement generation from a plan run."""
    try:
        db = get_tenant_db_session(request)
        
        # Get employees with calculation results for this run
        from ..models import RunStepResult, PlanRun, EmployeeData, EmployeeCalculationResult
        
        # Verify run exists and belongs to tenant
        plan_run = db.query(PlanRun).filter(
            PlanRun.id == run_id,
            PlanRun.tenant_id == tenant_id
        ).first()
        
        if not plan_run:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plan run not found"
            )
        
        # Get unique employee references from step results
        employee_refs = db.query(RunStepResult.employee_ref).filter(
            RunStepResult.run_id == run_id
        ).distinct().all()
        
        employee_list = []
        for (emp_ref,) in employee_refs:
            # Get employee details
            employee_data = db.query(EmployeeData).filter(
                EmployeeData.batch_upload_id == plan_run.upload_id,
                EmployeeData.employee_id == emp_ref
            ).first()
            
            if employee_data:
                # Check if calculation results exist
                calc_result = db.query(EmployeeCalculationResult).filter(
                    EmployeeCalculationResult.employee_data_id == employee_data.id
                ).first()
                
                if calc_result:
                    employee_list.append({
                        'employee_ref': emp_ref,
                        'first_name': employee_data.first_name,
                        'last_name': employee_data.last_name,
                        'department': employee_data.department,
                        'position': employee_data.position,
                        'bonus_amount': calc_result.bonus_amount
                    })
        
        return PlatformApiResponse(
            success=True,
            message="Available employees retrieved successfully",
            data={
                'run_id': run_id,
                'employees': employee_list,
                'total_count': len(employee_list)
            },
            tenant_id=tenant_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get available employees: {str(e)}"
        )
    finally:
        db.close()


@router.post("/runs/{run_id}/bulk-generate", response_model=PlatformApiResponse)
async def bulk_generate_statements(
    run_id: str,
    format: str,
    include_calculation_steps: bool = True,
    company_name: str = "Fund Management Company",
    employee_refs: Optional[List[str]] = None,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Generate bonus statements for multiple employees in bulk."""
    try:
        db = get_tenant_db_session(request)
        statement_service = get_bonus_statement_service(db, tenant_id)
        
        # Get available employees if none specified
        if not employee_refs:
            employees_response = await get_available_employees_for_statements(run_id, request, tenant_id)
            employee_refs = [emp['employee_ref'] for emp in employees_response.data['employees']]
        
        # Generate statements for all employees
        results = []
        successful_count = 0
        failed_count = 0
        
        for emp_ref in employee_refs:
            statement_request = BonusStatementRequest(
                employee_ref=emp_ref,
                format=format,
                include_calculation_steps=include_calculation_steps,
                company_name=company_name
            )
            
            result = statement_service.generate_statement(run_id, emp_ref, statement_request)
            
            # Store result metadata (without file bytes)
            result_meta = {
                key: value for key, value in result.items() 
                if key != 'file_bytes'
            }
            results.append(result_meta)
            
            if result['success']:
                successful_count += 1
            else:
                failed_count += 1
        
        return PlatformApiResponse(
            success=True,
            message=f"Bulk statement generation completed: {successful_count} successful, {failed_count} failed",
            data={
                'run_id': run_id,
                'format': format,
                'total_requested': len(employee_refs),
                'successful_count': successful_count,
                'failed_count': failed_count,
                'results': results
            },
            tenant_id=tenant_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk generate statements: {str(e)}"
        )
    finally:
        db.close()