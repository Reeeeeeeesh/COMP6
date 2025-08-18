"""
Executive Reporting API Endpoints

Task 21: Dynamic reporting system for pool vs target analysis, trends, and executive summaries.
Provides REST API endpoints for executive-level analytics and reporting.
"""

import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.executive_reporting_service import get_executive_reporting_service
from ..schemas import (
    PlatformApiResponse, DynamicReportRequest, ReportingFilters,
    PoolVsTargetAnalysis, TrendDataPoint, ExecutiveSummary
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/executive-reporting", tags=["executive-reporting"])


@router.post("/dynamic-report", response_model=PlatformApiResponse)
async def generate_dynamic_report(
    request: DynamicReportRequest,
    tenant_id: str = Query(..., description="Tenant ID for multi-tenant isolation"),
    db: Session = Depends(get_db)
):
    """
    Generate dynamic reports based on request type and filters.
    
    Args:
        request: Report request with type, filters, and options
        tenant_id: Tenant ID for data isolation
        db: Database session
        
    Returns:
        PlatformApiResponse with generated report data
    """
    try:
        reporting_service = get_executive_reporting_service(db, tenant_id)
        report_data = reporting_service.generate_dynamic_report(request)
        
        return PlatformApiResponse(
            success=True,
            message=f"Dynamic {request.report_type} report generated successfully",
            data=report_data,
            tenant_id=tenant_id
        )
        
    except Exception as e:
        logger.error(f"Error generating dynamic report for tenant {tenant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate dynamic report: {str(e)}"
        )


@router.get("/pool-analysis", response_model=PlatformApiResponse)
async def get_pool_analysis(
    tenant_id: str = Query(..., description="Tenant ID for multi-tenant isolation"),
    date_from: Optional[str] = Query(None, description="Start date filter (ISO format)"),
    date_to: Optional[str] = Query(None, description="End date filter (ISO format)"),
    plan_ids: Optional[str] = Query(None, description="Comma-separated plan IDs to filter"),
    include_details: bool = Query(False, description="Include detailed breakdown"),
    db: Session = Depends(get_db)
):
    """
    Get pool vs target analysis for all plans.
    
    Args:
        tenant_id: Tenant ID for data isolation
        date_from: Start date filter (ISO format)
        date_to: End date filter (ISO format)
        plan_ids: Comma-separated plan IDs to filter
        include_details: Include detailed breakdown
        db: Database session
        
    Returns:
        PlatformApiResponse with pool analysis data
    """
    try:
        from datetime import datetime
        
        # Parse filters
        filters = ReportingFilters(
            tenant_id=tenant_id,
            date_from=datetime.fromisoformat(date_from) if date_from else None,
            date_to=datetime.fromisoformat(date_to) if date_to else None,
            plan_ids=plan_ids.split(',') if plan_ids else None
        )
        
        request = DynamicReportRequest(
            report_type='pool_analysis',
            filters=filters,
            include_details=include_details
        )
        
        reporting_service = get_executive_reporting_service(db, tenant_id)
        report_data = reporting_service.generate_dynamic_report(request)
        
        return PlatformApiResponse(
            success=True,
            message="Pool analysis retrieved successfully",
            data=report_data,
            tenant_id=tenant_id
        )
        
    except ValueError as e:
        logger.warning(f"Invalid parameters for pool analysis: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid parameters: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error getting pool analysis for tenant {tenant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get pool analysis: {str(e)}"
        )


@router.get("/trends", response_model=PlatformApiResponse)
async def get_trend_analysis(
    tenant_id: str = Query(..., description="Tenant ID for multi-tenant isolation"),
    date_from: Optional[str] = Query(None, description="Start date filter (ISO format)"),
    date_to: Optional[str] = Query(None, description="End date filter (ISO format)"),
    plan_ids: Optional[str] = Query(None, description="Comma-separated plan IDs to filter"),
    grouping: str = Query("month", description="Time grouping: day, week, month, quarter"),
    db: Session = Depends(get_db)
):
    """
    Get trend analysis with historical patterns.
    
    Args:
        tenant_id: Tenant ID for data isolation
        date_from: Start date filter (ISO format)
        date_to: End date filter (ISO format)
        plan_ids: Comma-separated plan IDs to filter
        grouping: Time grouping for trends
        db: Database session
        
    Returns:
        PlatformApiResponse with trend analysis data
    """
    try:
        from datetime import datetime
        
        # Validate grouping
        valid_groupings = ['day', 'week', 'month', 'quarter']
        if grouping not in valid_groupings:
            raise ValueError(f"Grouping must be one of: {valid_groupings}")
        
        # Parse filters
        filters = ReportingFilters(
            tenant_id=tenant_id,
            date_from=datetime.fromisoformat(date_from) if date_from else None,
            date_to=datetime.fromisoformat(date_to) if date_to else None,
            plan_ids=plan_ids.split(',') if plan_ids else None
        )
        
        request = DynamicReportRequest(
            report_type='trends',
            filters=filters,
            grouping=grouping
        )
        
        reporting_service = get_executive_reporting_service(db, tenant_id)
        report_data = reporting_service.generate_dynamic_report(request)
        
        return PlatformApiResponse(
            success=True,
            message="Trend analysis retrieved successfully",
            data=report_data,
            tenant_id=tenant_id
        )
        
    except ValueError as e:
        logger.warning(f"Invalid parameters for trend analysis: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid parameters: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error getting trend analysis for tenant {tenant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get trend analysis: {str(e)}"
        )


@router.get("/executive-summary", response_model=PlatformApiResponse)
async def get_executive_summary(
    tenant_id: str = Query(..., description="Tenant ID for multi-tenant isolation"),
    date_from: Optional[str] = Query(None, description="Start date filter (ISO format)"),
    date_to: Optional[str] = Query(None, description="End date filter (ISO format)"),
    plan_ids: Optional[str] = Query(None, description="Comma-separated plan IDs to filter"),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive executive summary.
    
    Args:
        tenant_id: Tenant ID for data isolation
        date_from: Start date filter (ISO format)
        date_to: End date filter (ISO format)  
        plan_ids: Comma-separated plan IDs to filter
        db: Database session
        
    Returns:
        PlatformApiResponse with executive summary data
    """
    try:
        from datetime import datetime
        
        # Parse filters
        filters = ReportingFilters(
            tenant_id=tenant_id,
            date_from=datetime.fromisoformat(date_from) if date_from else None,
            date_to=datetime.fromisoformat(date_to) if date_to else None,
            plan_ids=plan_ids.split(',') if plan_ids else None
        )
        
        request = DynamicReportRequest(
            report_type='executive_summary',
            filters=filters
        )
        
        reporting_service = get_executive_reporting_service(db, tenant_id)
        report_data = reporting_service.generate_dynamic_report(request)
        
        return PlatformApiResponse(
            success=True,
            message="Executive summary retrieved successfully",
            data=report_data,
            tenant_id=tenant_id
        )
        
    except ValueError as e:
        logger.warning(f"Invalid parameters for executive summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid parameters: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error getting executive summary for tenant {tenant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get executive summary: {str(e)}"
        )


@router.get("/combined-report", response_model=PlatformApiResponse)
async def get_combined_report(
    tenant_id: str = Query(..., description="Tenant ID for multi-tenant isolation"),
    date_from: Optional[str] = Query(None, description="Start date filter (ISO format)"),
    date_to: Optional[str] = Query(None, description="End date filter (ISO format)"),
    plan_ids: Optional[str] = Query(None, description="Comma-separated plan IDs to filter"),
    grouping: str = Query("month", description="Time grouping: day, week, month, quarter"),
    include_details: bool = Query(False, description="Include detailed breakdown"),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive combined report with all analytics.
    
    Args:
        tenant_id: Tenant ID for data isolation
        date_from: Start date filter (ISO format)
        date_to: End date filter (ISO format)
        plan_ids: Comma-separated plan IDs to filter
        grouping: Time grouping for trends
        include_details: Include detailed breakdown
        db: Database session
        
    Returns:
        PlatformApiResponse with combined report data
    """
    try:
        from datetime import datetime
        
        # Validate grouping
        valid_groupings = ['day', 'week', 'month', 'quarter']
        if grouping not in valid_groupings:
            raise ValueError(f"Grouping must be one of: {valid_groupings}")
        
        # Parse filters
        filters = ReportingFilters(
            tenant_id=tenant_id,
            date_from=datetime.fromisoformat(date_from) if date_from else None,
            date_to=datetime.fromisoformat(date_to) if date_to else None,
            plan_ids=plan_ids.split(',') if plan_ids else None
        )
        
        request = DynamicReportRequest(
            report_type='combined',
            filters=filters,
            grouping=grouping,
            include_details=include_details
        )
        
        reporting_service = get_executive_reporting_service(db, tenant_id)
        report_data = reporting_service.generate_dynamic_report(request)
        
        return PlatformApiResponse(
            success=True,
            message="Combined report retrieved successfully",
            data=report_data,
            tenant_id=tenant_id
        )
        
    except ValueError as e:
        logger.warning(f"Invalid parameters for combined report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid parameters: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error getting combined report for tenant {tenant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get combined report: {str(e)}"
        )


@router.get("/plan-performance/{plan_id}", response_model=PlatformApiResponse)
async def get_plan_performance_metrics(
    plan_id: str,
    tenant_id: str = Query(..., description="Tenant ID for multi-tenant isolation"),
    days: int = Query(90, ge=7, le=365, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """
    Get performance metrics for a specific plan over time.
    
    Args:
        plan_id: ID of the plan to analyze
        tenant_id: Tenant ID for data isolation
        days: Number of days to look back
        db: Database session
        
    Returns:
        PlatformApiResponse with plan performance metrics
    """
    try:
        reporting_service = get_executive_reporting_service(db, tenant_id)
        metrics = reporting_service.get_plan_performance_metrics(plan_id, days)
        
        return PlatformApiResponse(
            success=True,
            message=f"Plan performance metrics retrieved successfully for plan {plan_id}",
            data=metrics,
            tenant_id=tenant_id
        )
        
    except Exception as e:
        logger.error(f"Error getting plan performance metrics for {plan_id} (tenant {tenant_id}): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get plan performance metrics: {str(e)}"
        )