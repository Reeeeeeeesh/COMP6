"""
Executive Reporting Service for dynamic pool analysis, trends, and executive summaries.
Task 21: Build dynamic reporting system (pool vs target, trends) for fund management executives.
"""
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, text
from collections import defaultdict
import calendar

from ..models import (
    PlanRun, BonusPlan, RunTotals, RunStepResult, 
    BatchCalculationResult, EmployeeCalculationResult, EmployeeData, BatchUpload
)
from ..schemas import (
    PoolVsTargetAnalysis, TrendDataPoint, ExecutiveSummary, 
    ReportingFilters, DynamicReportRequest
)

logger = logging.getLogger(__name__)


class ExecutiveReportingService:
    """Service for generating executive-level reporting and analytics."""
    
    def __init__(self, db: Session, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id
    
    def generate_dynamic_report(self, request: DynamicReportRequest) -> Dict[str, Any]:
        """
        Generate dynamic reports based on request type and filters.
        
        Args:
            request: Report request with type, filters, and options
            
        Returns:
            Dictionary containing requested report data
        """
        try:
            start_time = datetime.utcnow()
            
            if request.report_type == 'pool_analysis':
                data = self._generate_pool_analysis(request.filters, request.include_details)
            elif request.report_type == 'trends':
                data = self._generate_trend_analysis(request.filters, request.grouping)
            elif request.report_type == 'executive_summary':
                data = self._generate_executive_summary(request.filters)
            elif request.report_type == 'combined':
                data = self._generate_combined_report(request.filters, request.grouping, request.include_details)
            else:
                raise ValueError(f"Unsupported report type: {request.report_type}")
            
            generation_time = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                'success': True,
                'report_type': request.report_type,
                'filters_applied': request.filters.model_dump(),
                'data': data,
                'generation_time_seconds': generation_time,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Dynamic report generation failed: {e}")
            generation_time = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                'success': False,
                'report_type': request.report_type,
                'error': str(e),
                'generation_time_seconds': generation_time
            }
    
    def _generate_pool_analysis(self, filters: ReportingFilters, include_details: bool = False) -> Dict[str, Any]:
        """Generate pool vs target analysis for all plans."""
        
        # Base query for plan runs with bonus calculations
        query = self.db.query(PlanRun).join(BonusPlan).filter(
            PlanRun.tenant_id == self.tenant_id,
            PlanRun.status == 'completed'
        )
        
        # Apply filters
        query = self._apply_date_filters(query, filters, PlanRun.finished_at)
        
        if filters.plan_ids:
            query = query.filter(PlanRun.plan_id.in_(filters.plan_ids))
        
        plan_runs = query.all()
        
        pool_analyses = []
        total_target_pool = 0
        total_actual_pool = 0
        
        for run in plan_runs:
            try:
                # Get calculation results for this run via upload
                if run.upload_id:
                    calc_result = self.db.query(BatchCalculationResult).filter(
                        BatchCalculationResult.batch_upload_id == run.upload_id
                    ).first()
                    
                    if calc_result:
                        actual_pool = calc_result.total_bonus_pool or 0
                        
                        # Calculate employee count for this run
                        employee_count = self.db.query(EmployeeCalculationResult).join(EmployeeData).filter(
                            EmployeeData.batch_upload_id == run.upload_id
                        ).count()
                        
                        # Determine target pool (from plan configuration or calculation parameters)
                        # For now, use a reasonable target calculation
                        target_pool = None
                        pool_utilization = 0
                        variance = None
                        status = "no_target"
                        
                        if target_pool:
                            pool_utilization = actual_pool / target_pool if target_pool > 0 else 0
                            variance = actual_pool - target_pool
                            
                            if abs(variance) / target_pool <= 0.05:  # Within 5%
                                status = "on_target"
                            elif variance > 0:
                                status = "over_target"
                            else:
                                status = "under_target"
                        
                        analysis = PoolVsTargetAnalysis(
                            plan_id=run.plan_id,
                            plan_name=run.plan.name,
                            target_pool=target_pool,
                            actual_pool=actual_pool,
                            pool_utilization=pool_utilization,
                            employee_count=employee_count,
                            avg_bonus_per_employee=actual_pool / employee_count if employee_count > 0 else 0,
                            variance_from_target=variance,
                            status=status,
                            last_calculated=run.finished_at or run.started_at
                        )
                        
                        pool_analyses.append(analysis.model_dump())
                        
                        if target_pool:
                            total_target_pool += target_pool
                        total_actual_pool += actual_pool
                
            except Exception as e:
                logger.warning(f"Failed to analyze pool for run {run.id}: {e}")
                continue
        
        # Calculate overall metrics
        overall_utilization = total_actual_pool / total_target_pool if total_target_pool > 0 else 0
        
        result = {
            'analyses': pool_analyses,
            'summary': {
                'total_plans_analyzed': len(pool_analyses),
                'total_target_pool': total_target_pool,
                'total_actual_pool': total_actual_pool,
                'overall_pool_utilization': overall_utilization,
                'plans_over_target': len([a for a in pool_analyses if a['status'] == 'over_target']),
                'plans_under_target': len([a for a in pool_analyses if a['status'] == 'under_target']),
                'plans_on_target': len([a for a in pool_analyses if a['status'] == 'on_target'])
            }
        }
        
        if include_details:
            result['detailed_breakdown'] = self._get_detailed_pool_breakdown(pool_analyses)
        
        return result
    
    def _generate_trend_analysis(self, filters: ReportingFilters, grouping: str = 'month') -> Dict[str, Any]:
        """Generate trend analysis with historical patterns."""
        
        # Get date range for trend analysis
        end_date = filters.date_to or datetime.utcnow()
        start_date = filters.date_from or (end_date - timedelta(days=365))  # Default 1 year
        
        # Query plan runs in date range
        query = self.db.query(PlanRun).join(BonusPlan).filter(
            PlanRun.tenant_id == self.tenant_id,
            PlanRun.status == 'completed',
            PlanRun.finished_at >= start_date,
            PlanRun.finished_at <= end_date
        )
        
        if filters.plan_ids:
            query = query.filter(PlanRun.plan_id.in_(filters.plan_ids))
        
        plan_runs = query.order_by(PlanRun.finished_at).all()
        
        # Group data by time period
        period_data = defaultdict(list)
        
        for run in plan_runs:
            try:
                period_key = self._get_period_key(run.finished_at or run.started_at, grouping)
                
                # Get calculation data
                if run.upload_id:
                    calc_result = self.db.query(BatchCalculationResult).filter(
                        BatchCalculationResult.batch_upload_id == run.upload_id
                    ).first()
                    
                    if calc_result:
                        employee_count = self.db.query(EmployeeCalculationResult).join(EmployeeData).filter(
                            EmployeeData.batch_upload_id == run.upload_id
                        ).count()
                        
                        period_data[period_key].append({
                            'run_id': run.id,
                            'plan_name': run.plan.name,
                            'bonus_pool': calc_result.total_bonus_pool or 0,
                            'employee_count': employee_count,
                            'avg_bonus': (calc_result.total_bonus_pool or 0) / employee_count if employee_count > 0 else 0,
                            'calculation_date': run.finished_at or run.started_at
                        })
                        
            except Exception as e:
                logger.warning(f"Failed to process run {run.id} for trends: {e}")
                continue
        
        # Calculate trend metrics
        trend_metrics = []
        sorted_periods = sorted(period_data.keys())
        
        for i, period in enumerate(sorted_periods):
            period_runs = period_data[period]
            
            # Aggregate metrics for this period
            total_pool = sum(run_data['bonus_pool'] for run_data in period_runs)
            total_employees = sum(run_data['employee_count'] for run_data in period_runs)
            avg_bonus = total_pool / total_employees if total_employees > 0 else 0
            
            # Calculate period-over-period change
            previous_value = None
            change_percentage = None
            
            if i > 0:
                prev_period_runs = period_data[sorted_periods[i-1]]
                prev_total_pool = sum(run_data['bonus_pool'] for run_data in prev_period_runs)
                
                if prev_total_pool > 0:
                    change_percentage = ((total_pool - prev_total_pool) / prev_total_pool) * 100
                    previous_value = prev_total_pool
            
            # Add trend data points
            trend_metrics.extend([
                TrendDataPoint(
                    period=period,
                    metric_name='total_bonus_pool',
                    value=total_pool,
                    comparison_value=previous_value,
                    change_percentage=change_percentage
                ).model_dump(),
                TrendDataPoint(
                    period=period,
                    metric_name='average_bonus_per_employee',
                    value=avg_bonus,
                    comparison_value=None,  # Could calculate if needed
                    change_percentage=None
                ).model_dump(),
                TrendDataPoint(
                    period=period,
                    metric_name='employees_processed',
                    value=total_employees,
                    comparison_value=None,
                    change_percentage=None
                ).model_dump()
            ])
        
        return {
            'trend_data': trend_metrics,
            'period_summary': {
                period: {
                    'runs_count': len(runs),
                    'total_bonus_pool': sum(r['bonus_pool'] for r in runs),
                    'total_employees': sum(r['employee_count'] for r in runs),
                    'avg_bonus_per_employee': sum(r['bonus_pool'] for r in runs) / sum(r['employee_count'] for r in runs) if sum(r['employee_count'] for r in runs) > 0 else 0
                }
                for period, runs in period_data.items()
            },
            'analysis_period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'grouping': grouping,
                'total_periods': len(sorted_periods)
            }
        }
    
    def _generate_executive_summary(self, filters: ReportingFilters) -> ExecutiveSummary:
        """Generate comprehensive executive summary."""
        
        # Get date range
        end_date = filters.date_to or datetime.utcnow()
        start_date = filters.date_from or (end_date - timedelta(days=90))  # Default 3 months
        
        # Query completed plan runs
        query = self.db.query(PlanRun).join(BonusPlan).filter(
            PlanRun.tenant_id == self.tenant_id,
            PlanRun.status == 'completed'
        )
        
        query = self._apply_date_filters(query, filters, PlanRun.finished_at)
        
        if filters.plan_ids:
            query = query.filter(PlanRun.plan_id.in_(filters.plan_ids))
        
        plan_runs = query.all()
        
        # Aggregate executive metrics
        total_plans_executed = len(plan_runs)
        total_employees_processed = 0
        total_bonus_pool_distributed = 0
        bonus_percentages = []
        plan_performance = []
        
        for run in plan_runs:
            try:
                if run.upload_id:
                    calc_result = self.db.query(BatchCalculationResult).filter(
                        BatchCalculationResult.batch_upload_id == run.upload_id
                    ).first()
                    
                    if calc_result:
                        # Get employee results for this run
                        employee_results = self.db.query(EmployeeCalculationResult).join(EmployeeData).filter(
                            EmployeeData.batch_upload_id == run.upload_id
                        ).all()
                        
                        run_employee_count = len(employee_results)
                        run_bonus_pool = calc_result.total_bonus_pool or 0
                        
                        total_employees_processed += run_employee_count
                        total_bonus_pool_distributed += run_bonus_pool
                        
                        # Collect bonus percentages for average calculation
                        for emp_result in employee_results:
                            bonus_percentages.append(emp_result.bonus_percentage)
                        
                        # Track plan performance
                        plan_performance.append({
                            'plan_id': run.plan_id,
                            'plan_name': run.plan.name,
                            'employee_count': run_employee_count,
                            'bonus_pool': run_bonus_pool,
                            'avg_bonus_per_employee': run_bonus_pool / run_employee_count if run_employee_count > 0 else 0,
                            'execution_date': run.finished_at or run.started_at
                        })
                        
            except Exception as e:
                logger.warning(f"Failed to process run {run.id} for executive summary: {e}")
                continue
        
        # Calculate aggregated metrics
        average_bonus_percentage = sum(bonus_percentages) / len(bonus_percentages) if bonus_percentages else 0
        
        # Generate pool vs target summary
        pool_analysis = self._generate_pool_analysis(filters, include_details=False)
        pool_vs_target_summary = pool_analysis.get('summary', {})
        
        # Generate trending metrics (last 6 months)
        trend_filters = ReportingFilters(
            tenant_id=self.tenant_id,
            date_from=end_date - timedelta(days=180),
            date_to=end_date,
            plan_ids=filters.plan_ids
        )
        trend_data = self._generate_trend_analysis(trend_filters, 'month')
        trending_metrics = trend_data.get('trend_data', [])
        
        # Get top performing plans (by bonus pool size)
        top_performing_plans = sorted(
            plan_performance, 
            key=lambda x: x['bonus_pool'], 
            reverse=True
        )[:5]
        
        summary = ExecutiveSummary(
            tenant_id=self.tenant_id,
            reporting_period=f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            total_plans_executed=total_plans_executed,
            total_employees_processed=total_employees_processed,
            total_bonus_pool_distributed=total_bonus_pool_distributed,
            average_bonus_percentage=average_bonus_percentage,
            pool_vs_target_summary=pool_vs_target_summary,
            trending_metrics=trending_metrics[:12],  # Last 12 data points
            top_performing_plans=top_performing_plans,
            generated_at=datetime.utcnow()
        )
        
        return summary.model_dump()
    
    def _generate_combined_report(self, filters: ReportingFilters, grouping: str, include_details: bool) -> Dict[str, Any]:
        """Generate comprehensive combined report with all analytics."""
        
        pool_analysis = self._generate_pool_analysis(filters, include_details)
        trend_analysis = self._generate_trend_analysis(filters, grouping)  
        executive_summary = self._generate_executive_summary(filters)
        
        return {
            'pool_analysis': pool_analysis,
            'trend_analysis': trend_analysis,
            'executive_summary': executive_summary,
            'report_scope': {
                'filters_applied': filters.model_dump(),
                'grouping': grouping,
                'include_details': include_details
            }
        }
    
    def _apply_date_filters(self, query, filters: ReportingFilters, date_column) -> Any:
        """Apply date range filters to a query."""
        if filters.date_from:
            query = query.filter(date_column >= filters.date_from)
        if filters.date_to:
            query = query.filter(date_column <= filters.date_to)
        return query
    
    def _get_period_key(self, date: datetime, grouping: str) -> str:
        """Generate period key for time-based grouping."""
        if grouping == 'day':
            return date.strftime('%Y-%m-%d')
        elif grouping == 'week':
            year, week, _ = date.isocalendar()
            return f"{year}-W{week:02d}"
        elif grouping == 'month':
            return date.strftime('%Y-%m')
        elif grouping == 'quarter':
            quarter = (date.month - 1) // 3 + 1
            return f"{date.year}-Q{quarter}"
        else:
            return date.strftime('%Y-%m')  # Default to month
    
    def _get_detailed_pool_breakdown(self, pool_analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate detailed breakdown for pool analysis."""
        
        # Group by status
        by_status = defaultdict(list)
        for analysis in pool_analyses:
            by_status[analysis['status']].append(analysis)
        
        # Calculate statistics
        breakdown = {}
        for status, analyses in by_status.items():
            total_actual = sum(a['actual_pool'] for a in analyses)
            total_target = sum(a.get('target_pool', 0) or 0 for a in analyses)
            employee_count = sum(a['employee_count'] for a in analyses)
            
            breakdown[status] = {
                'plan_count': len(analyses),
                'total_actual_pool': total_actual,
                'total_target_pool': total_target,
                'total_employees': employee_count,
                'avg_pool_size': total_actual / len(analyses) if analyses else 0,
                'plans': analyses
            }
        
        return breakdown
    
    def get_plan_performance_metrics(self, plan_id: str, days: int = 90) -> Dict[str, Any]:
        """Get performance metrics for a specific plan over time."""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get plan runs for this plan
            plan_runs = self.db.query(PlanRun).filter(
                PlanRun.plan_id == plan_id,
                PlanRun.tenant_id == self.tenant_id,
                PlanRun.status == 'completed',
                PlanRun.finished_at >= start_date
            ).order_by(PlanRun.finished_at).all()
            
            if not plan_runs:
                return {
                    'plan_id': plan_id,
                    'metrics': [],
                    'summary': {'total_runs': 0, 'message': 'No completed runs found in date range'}
                }
            
            metrics = []
            total_pool = 0
            total_employees = 0
            
            for run in plan_runs:
                if run.upload_id:
                    calc_result = self.db.query(BatchCalculationResult).filter(
                        BatchCalculationResult.batch_upload_id == run.upload_id
                    ).first()
                    
                    if calc_result:
                        employee_count = self.db.query(EmployeeCalculationResult).join(EmployeeData).filter(
                            EmployeeData.batch_upload_id == run.upload_id
                        ).count()
                        
                        run_pool = calc_result.total_bonus_pool or 0
                        total_pool += run_pool
                        total_employees += employee_count
                        
                        metrics.append({
                            'run_id': run.id,
                            'execution_date': (run.finished_at or run.started_at).isoformat(),
                            'bonus_pool': run_pool,
                            'employee_count': employee_count,
                            'avg_bonus_per_employee': run_pool / employee_count if employee_count > 0 else 0
                        })
            
            return {
                'plan_id': plan_id,
                'plan_name': plan_runs[0].plan.name if plan_runs else 'Unknown',
                'analysis_period': f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
                'metrics': metrics,
                'summary': {
                    'total_runs': len(metrics),
                    'total_bonus_pool': total_pool,
                    'total_employees': total_employees,
                    'avg_bonus_per_employee': total_pool / total_employees if total_employees > 0 else 0,
                    'avg_pool_per_run': total_pool / len(metrics) if metrics else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get plan performance metrics for {plan_id}: {e}")
            return {
                'plan_id': plan_id,
                'error': str(e),
                'metrics': [],
                'summary': {'total_runs': 0}
            }


def get_executive_reporting_service(db: Session, tenant_id: str) -> ExecutiveReportingService:
    """Factory function to create ExecutiveReportingService."""
    return ExecutiveReportingService(db, tenant_id)