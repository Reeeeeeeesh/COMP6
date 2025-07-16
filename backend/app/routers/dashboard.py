"""
Dashboard API Endpoints

This module provides REST API endpoints for dashboard data and analytics.
"""

import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.dashboard_service import DashboardService
from ..schemas import ApiResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=ApiResponse)
async def get_dashboard_summary(
    session_id: str = Query(..., description="Session ID to filter data"),
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive dashboard summary.
    
    Args:
        session_id: Session ID to filter data
        days: Number of days to look back for recent activity
        db: Database session
        
    Returns:
        ApiResponse with dashboard summary data
    """
    try:
        dashboard_service = DashboardService(db)
        summary = dashboard_service.get_dashboard_summary(session_id, days)
        
        return ApiResponse(
            success=True,
            message="Dashboard summary retrieved successfully",
            data=summary
        )
        
    except Exception as e:
        logger.error(f"Error getting dashboard summary for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get dashboard summary: {str(e)}"
        )


@router.get("/metrics", response_model=ApiResponse)
async def get_key_metrics(
    session_id: str = Query(..., description="Session ID to filter data"),
    db: Session = Depends(get_db)
):
    """
    Get key metrics for dashboard cards.
    
    Args:
        session_id: Session ID to filter data
        db: Database session
        
    Returns:
        ApiResponse with key metrics
    """
    try:
        dashboard_service = DashboardService(db)
        summary = dashboard_service.get_dashboard_summary(session_id, 30)
        
        # Extract just the key metrics
        metrics = {
            'total_employees': summary['summary']['total_employees_processed'],
            'total_uploads': summary['summary']['total_uploads'],
            'recent_uploads': summary['summary']['recent_uploads_count'],
            'average_bonus': summary['summary']['average_bonus_amount'],
            'total_bonus_pool': summary['summary']['total_bonus_pool'],
            'total_calculations': summary['bonus_statistics']['total_calculations']
        }
        
        return ApiResponse(
            success=True,
            message="Key metrics retrieved successfully",
            data=metrics
        )
        
    except Exception as e:
        logger.error(f"Error getting key metrics for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get key metrics: {str(e)}"
        )


@router.get("/departments", response_model=ApiResponse)
async def get_department_breakdown(
    session_id: str = Query(..., description="Session ID to filter data"),
    db: Session = Depends(get_db)
):
    """
    Get department breakdown for charts.
    
    Args:
        session_id: Session ID to filter data
        db: Database session
        
    Returns:
        ApiResponse with department breakdown data
    """
    try:
        dashboard_service = DashboardService(db)
        summary = dashboard_service.get_dashboard_summary(session_id, 30)
        
        return ApiResponse(
            success=True,
            message="Department breakdown retrieved successfully",
            data={
                'departments': summary['department_breakdown'],
                'top_departments': summary['top_departments']
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting department breakdown for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get department breakdown: {str(e)}"
        )


@router.get("/trends", response_model=ApiResponse)
async def get_calculation_trends(
    session_id: str = Query(..., description="Session ID to filter data"),
    days: int = Query(30, ge=7, le=365, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """
    Get calculation trends over time.
    
    Args:
        session_id: Session ID to filter data
        days: Number of days to look back
        db: Database session
        
    Returns:
        ApiResponse with trends data
    """
    try:
        dashboard_service = DashboardService(db)
        summary = dashboard_service.get_dashboard_summary(session_id, days)
        
        return ApiResponse(
            success=True,
            message="Calculation trends retrieved successfully",
            data={
                'trends': summary['calculation_trends'],
                'period_days': days
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting calculation trends for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get calculation trends: {str(e)}"
        )


@router.get("/activity", response_model=ApiResponse)
async def get_recent_activity(
    session_id: str = Query(..., description="Session ID to filter data"),
    days: int = Query(7, ge=1, le=30, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """
    Get recent activity timeline.
    
    Args:
        session_id: Session ID to filter data
        days: Number of days to look back
        db: Database session
        
    Returns:
        ApiResponse with recent activity data
    """
    try:
        dashboard_service = DashboardService(db)
        summary = dashboard_service.get_dashboard_summary(session_id, days)
        
        return ApiResponse(
            success=True,
            message="Recent activity retrieved successfully",
            data={
                'activities': summary['recent_activity'],
                'recent_uploads': summary['recent_uploads']
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting recent activity for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get recent activity: {str(e)}"
        )


@router.get("/bonus-distribution", response_model=ApiResponse)
async def get_bonus_distribution(
    session_id: str = Query(..., description="Session ID to filter data"),
    db: Session = Depends(get_db)
):
    """
    Get bonus distribution data for charts.
    
    Args:
        session_id: Session ID to filter data
        db: Database session
        
    Returns:
        ApiResponse with bonus distribution data
    """
    try:
        dashboard_service = DashboardService(db)
        distribution = dashboard_service.get_bonus_distribution(session_id)
        
        return ApiResponse(
            success=True,
            message="Bonus distribution retrieved successfully",
            data={
                'distribution': distribution
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting bonus distribution for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get bonus distribution: {str(e)}"
        )


@router.get("/statistics", response_model=ApiResponse)
async def get_bonus_statistics(
    session_id: str = Query(..., description="Session ID to filter data"),
    db: Session = Depends(get_db)
):
    """
    Get detailed bonus statistics.
    
    Args:
        session_id: Session ID to filter data
        db: Database session
        
    Returns:
        ApiResponse with bonus statistics
    """
    try:
        dashboard_service = DashboardService(db)
        summary = dashboard_service.get_dashboard_summary(session_id, 30)
        
        return ApiResponse(
            success=True,
            message="Bonus statistics retrieved successfully",
            data=summary['bonus_statistics']
        )
        
    except Exception as e:
        logger.error(f"Error getting bonus statistics for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get bonus statistics: {str(e)}"
        )