"""
Dashboard Service

This service provides data aggregation and analytics for the dashboard.
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, text

from ..models import (
    BatchUpload, 
    EmployeeData, 
    BatchCalculationResult, 
    BatchScenario
)
from ..dal.batch_upload_dal import BatchUploadDAL

logger = logging.getLogger(__name__)


class DashboardService:
    """Service for dashboard data aggregation and analytics"""
    
    def __init__(self, db: Session):
        self.db = db
        self.batch_dal = BatchUploadDAL(db)
    
    def get_dashboard_summary(self, session_id: str, days: int = 30) -> Dict[str, Any]:
        """
        Get comprehensive dashboard summary for a session.
        
        Args:
            session_id: Session ID to filter data
            days: Number of days to look back for recent activity
            
        Returns:
            Dictionary containing dashboard summary data
        """
        try:
            # Calculate date range
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get basic metrics
            total_employees = self._get_total_employees_processed(session_id)
            total_uploads = self._get_total_uploads(session_id)
            recent_uploads = self._get_recent_uploads(session_id, start_date)
            
            # Get bonus statistics
            bonus_stats = self._get_bonus_statistics(session_id)
            
            # Get department breakdown
            department_breakdown = self._get_department_breakdown(session_id)
            
            # Get recent activity
            recent_activity = self._get_recent_activity(session_id, start_date)
            
            # Get calculation trends
            calculation_trends = self._get_calculation_trends(session_id, days)
            
            # Get top performing departments
            top_departments = self._get_top_departments(session_id)
            
            return {
                'summary': {
                    'total_employees_processed': total_employees,
                    'total_uploads': total_uploads,
                    'recent_uploads_count': len(recent_uploads),
                    'average_bonus_amount': bonus_stats.get('average_bonus', 0),
                    'total_bonus_pool': bonus_stats.get('total_bonus_pool', 0),
                    'last_updated': datetime.utcnow().isoformat()
                },
                'bonus_statistics': bonus_stats,
                'department_breakdown': department_breakdown,
                'recent_activity': recent_activity,
                'calculation_trends': calculation_trends,
                'top_departments': top_departments,
                'recent_uploads': recent_uploads
            }
            
        except Exception as e:
            logger.error(f"Error getting dashboard summary: {str(e)}")
            raise
    
    def _get_total_employees_processed(self, session_id: str) -> int:
        """Get total number of employees processed"""
        try:
            return self.db.query(EmployeeData).join(BatchUpload).filter(
                BatchUpload.session_id == session_id
            ).count()
        except Exception as e:
            logger.error(f"Error getting total employees: {str(e)}")
            return 0
    
    def _get_total_uploads(self, session_id: str) -> int:
        """Get total number of uploads"""
        try:
            return self.db.query(BatchUpload).filter(
                BatchUpload.session_id == session_id
            ).count()
        except Exception as e:
            logger.error(f"Error getting total uploads: {str(e)}")
            return 0
    
    def _get_recent_uploads(self, session_id: str, start_date: datetime) -> List[Dict[str, Any]]:
        """Get recent uploads with summary information"""
        try:
            uploads = self.db.query(BatchUpload).filter(
                and_(
                    BatchUpload.session_id == session_id,
                    BatchUpload.created_at >= start_date
                )
            ).order_by(BatchUpload.created_at.desc()).limit(10).all()
            
            recent_uploads = []
            for upload in uploads:
                # Get calculation results for this upload
                calc_results = self.db.query(BatchCalculationResult).filter(
                    BatchCalculationResult.batch_upload_id == upload.id
                ).first()
                
                upload_data = {
                    'id': upload.id,
                    'filename': upload.original_filename,
                    'status': upload.status,
                    'total_rows': upload.total_rows or 0,
                    'processed_rows': upload.processed_rows,
                    'failed_rows': upload.failed_rows,
                    'created_at': upload.created_at.isoformat(),
                    'has_calculations': calc_results is not None
                }
                
                if calc_results:
                    upload_data['calculation_id'] = calc_results.id
                    upload_data['avg_bonus'] = calc_results.average_bonus
                    upload_data['total_bonus_pool'] = calc_results.total_bonus_pool
                
                recent_uploads.append(upload_data)
            
            return recent_uploads
            
        except Exception as e:
            logger.error(f"Error getting recent uploads: {str(e)}")
            return []
    
    def _get_bonus_statistics(self, session_id: str) -> Dict[str, Any]:
        """Get bonus statistics across all calculations"""
        try:
            # Get all calculation results for this session
            results = self.db.query(BatchCalculationResult).join(BatchUpload).filter(
                BatchUpload.session_id == session_id
            ).all()
            
            if not results:
                return {
                    'total_bonus_pool': 0,
                    'average_bonus': 0,
                    'median_bonus': 0,
                    'min_bonus': 0,
                    'max_bonus': 0,
                    'total_calculations': 0
                }
            
            # Aggregate statistics
            total_bonus_pool = sum(result.total_bonus_pool or 0 for result in results)
            total_employees = sum(result.total_employees or 0 for result in results)
            
            # Calculate averages
            avg_bonus = total_bonus_pool / total_employees if total_employees > 0 else 0
            
            # Get min/max from results
            bonus_amounts = [result.average_bonus or 0 for result in results if result.average_bonus]
            min_bonus = min(bonus_amounts) if bonus_amounts else 0
            max_bonus = max(bonus_amounts) if bonus_amounts else 0
            
            return {
                'total_bonus_pool': round(total_bonus_pool, 2),
                'average_bonus': round(avg_bonus, 2),
                'median_bonus': round(sum(bonus_amounts) / len(bonus_amounts), 2) if bonus_amounts else 0,
                'min_bonus': round(min_bonus, 2),
                'max_bonus': round(max_bonus, 2),
                'total_calculations': len(results)
            }
            
        except Exception as e:
            logger.error(f"Error getting bonus statistics: {str(e)}")
            return {
                'total_bonus_pool': 0,
                'average_bonus': 0,
                'median_bonus': 0,
                'min_bonus': 0,
                'max_bonus': 0,
                'total_calculations': 0
            }
    
    def _get_department_breakdown(self, session_id: str) -> List[Dict[str, Any]]:
        """Get department breakdown with employee counts and average bonuses"""
        try:
            # Query for department statistics
            dept_stats = self.db.query(
                EmployeeData.department,
                func.count(EmployeeData.id).label('employee_count'),
                func.avg(EmployeeData.salary).label('avg_salary')
            ).join(BatchUpload).filter(
                BatchUpload.session_id == session_id
            ).group_by(EmployeeData.department).all()
            
            department_breakdown = []
            for dept, count, avg_salary in dept_stats:
                department_breakdown.append({
                    'department': dept or 'Unknown',
                    'employee_count': count,
                    'avg_salary': round(avg_salary or 0, 2),
                    'percentage': 0  # Will be calculated after we have totals
                })
            
            # Calculate percentages
            total_employees = sum(dept['employee_count'] for dept in department_breakdown)
            if total_employees > 0:
                for dept in department_breakdown:
                    dept['percentage'] = round((dept['employee_count'] / total_employees) * 100, 1)
            
            return sorted(department_breakdown, key=lambda x: x['employee_count'], reverse=True)
            
        except Exception as e:
            logger.error(f"Error getting department breakdown: {str(e)}")
            return []
    
    def _get_recent_activity(self, session_id: str, start_date: datetime) -> List[Dict[str, Any]]:
        """Get recent activity timeline"""
        try:
            activities = []
            
            # Get recent uploads
            recent_uploads = self.db.query(BatchUpload).filter(
                and_(
                    BatchUpload.session_id == session_id,
                    BatchUpload.created_at >= start_date
                )
            ).order_by(BatchUpload.created_at.desc()).limit(20).all()
            
            for upload in recent_uploads:
                activities.append({
                    'id': f"upload_{upload.id}",
                    'type': 'upload',
                    'title': f"File uploaded: {upload.original_filename}",
                    'description': f"Processed {upload.processed_rows} employees",
                    'timestamp': upload.created_at.isoformat(),
                    'status': upload.status
                })
            
            # Get recent calculations
            recent_calculations = self.db.query(BatchCalculationResult).join(BatchUpload).filter(
                and_(
                    BatchUpload.session_id == session_id,
                    BatchCalculationResult.created_at >= start_date
                )
            ).order_by(BatchCalculationResult.created_at.desc()).limit(20).all()
            
            for calc in recent_calculations:
                activities.append({
                    'id': f"calc_{calc.id}",
                    'type': 'calculation',
                    'title': f"Bonus calculation completed",
                    'description': f"Calculated bonuses for {calc.total_employees} employees",
                    'timestamp': calc.created_at.isoformat(),
                    'status': 'completed'
                })
            
            # Sort by timestamp
            activities.sort(key=lambda x: x['timestamp'], reverse=True)
            
            return activities[:10]  # Return most recent 10
            
        except Exception as e:
            logger.error(f"Error getting recent activity: {str(e)}")
            return []
    
    def _get_calculation_trends(self, session_id: str, days: int) -> List[Dict[str, Any]]:
        """Get calculation trends over time"""
        try:
            # Get calculations from the last N days
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Query calculations grouped by date
            calculations = self.db.query(
                func.date(BatchCalculationResult.created_at).label('date'),
                func.count(BatchCalculationResult.id).label('calculation_count'),
                func.sum(BatchCalculationResult.total_employees).label('total_employees'),
                func.avg(BatchCalculationResult.average_bonus).label('avg_bonus')
            ).join(BatchUpload).filter(
                and_(
                    BatchUpload.session_id == session_id,
                    BatchCalculationResult.created_at >= start_date
                )
            ).group_by(func.date(BatchCalculationResult.created_at)).all()
            
            trends = []
            for date, count, employees, avg_bonus in calculations:
                trends.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'calculation_count': count,
                    'total_employees': employees or 0,
                    'average_bonus': round(avg_bonus or 0, 2)
                })
            
            return sorted(trends, key=lambda x: x['date'])
            
        except Exception as e:
            logger.error(f"Error getting calculation trends: {str(e)}")
            return []
    
    def _get_top_departments(self, session_id: str) -> List[Dict[str, Any]]:
        """Get top performing departments by bonus amount"""
        try:
            # This is a simplified version - in a real implementation,
            # you'd need to join with actual bonus calculation results
            dept_stats = self.db.query(
                EmployeeData.department,
                func.count(EmployeeData.id).label('employee_count'),
                func.avg(EmployeeData.salary).label('avg_salary'),
                func.sum(EmployeeData.salary).label('total_salary')
            ).join(BatchUpload).filter(
                BatchUpload.session_id == session_id
            ).group_by(EmployeeData.department).order_by(
                func.avg(EmployeeData.salary).desc()
            ).limit(5).all()
            
            top_departments = []
            for dept, count, avg_salary, total_salary in dept_stats:
                top_departments.append({
                    'department': dept or 'Unknown',
                    'employee_count': count,
                    'avg_salary': round(avg_salary or 0, 2),
                    'total_salary': round(total_salary or 0, 2),
                    'estimated_bonus': round((avg_salary or 0) * 0.15, 2)  # Rough estimate
                })
            
            return top_departments
            
        except Exception as e:
            logger.error(f"Error getting top departments: {str(e)}")
            return []
    
    def get_bonus_distribution(self, session_id: str) -> List[Dict[str, Any]]:
        """Get bonus distribution data for charts"""
        try:
            # Get all calculation results for this session
            results = self.db.query(BatchCalculationResult).join(BatchUpload).filter(
                BatchUpload.session_id == session_id
            ).all()
            
            if not results:
                return []
            
            # Create distribution buckets
            distribution = []
            for result in results:
                if result.average_bonus:
                    # Create salary/bonus buckets
                    avg_bonus = result.average_bonus
                    if avg_bonus < 5000:
                        bucket = '< $5K'
                    elif avg_bonus < 10000:
                        bucket = '$5K - $10K'
                    elif avg_bonus < 20000:
                        bucket = '$10K - $20K'
                    elif avg_bonus < 50000:
                        bucket = '$20K - $50K'
                    else:
                        bucket = '> $50K'
                    
                    distribution.append({
                        'range': bucket,
                        'count': result.total_employees or 0,
                        'avg_bonus': round(avg_bonus, 2)
                    })
            
            return distribution
            
        except Exception as e:
            logger.error(f"Error getting bonus distribution: {str(e)}")
            return []