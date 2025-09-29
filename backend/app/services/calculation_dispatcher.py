"""
Calculation dispatcher service implementing the strangler pattern.
Routes between legacy and new calculation engines based on feature flags.
"""

import logging
from typing import Dict, Any, Optional, Union, List
from datetime import datetime
from sqlalchemy.orm import Session

from ..feature_flags import get_feature_flags
from ..calculation_engine import CalculationEngine
from ..models import AuditEvent
from ..logging_config import pii_safe_log

logger = logging.getLogger(__name__)


class CalculationResult:
    """Standardized result format for calculation engines."""
    
    def __init__(self, 
                 success: bool,
                 results: Optional[Dict[str, Any]] = None,
                 error: Optional[str] = None,
                 engine_used: str = "unknown",
                 execution_time: float = 0.0,
                 metadata: Optional[Dict[str, Any]] = None):
        self.success = success
        self.results = results or {}
        self.error = error
        self.engine_used = engine_used
        self.execution_time = execution_time
        self.metadata = metadata or {}
        self.timestamp = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary format."""
        return {
            "success": self.success,
            "results": self.results,
            "error": self.error,
            "engine_used": self.engine_used,
            "execution_time": self.execution_time,
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat()
        }


class CalculationDispatcher:
    """
    Dispatcher that implements the strangler pattern for calculation engines.
    Routes between legacy CalculationEngine and new VectorizedPlanExecutor.
    """
    
    def __init__(self, db: Session):
        """
        Initialize calculation dispatcher.
        
        Args:
            db: Database session for audit logging
        """
        self.db = db
        self.feature_flags = get_feature_flags()
        self.legacy_engine = CalculationEngine()
        self.new_engine = None  # Will be initialized when VectorizedPlanExecutor is available
        
        # Performance tracking
        self.execution_stats = {
            "legacy_engine": {"calls": 0, "total_time": 0.0, "errors": 0},
            "new_engine": {"calls": 0, "total_time": 0.0, "errors": 0}
        }
    
    def set_new_engine(self, new_engine):
        """
        Set the new calculation engine implementation.
        
        Args:
            new_engine: Instance of VectorizedPlanExecutor or compatible engine
        """
        self.new_engine = new_engine
        logger.info("New calculation engine configured in dispatcher")
    
    def execute_calculation(self, 
                          plan_id: Optional[str] = None,
                          tenant_id: Optional[str] = None,
                          employee_data: Optional[List[Dict[str, Any]]] = None,
                          parameters: Optional[Dict[str, Any]] = None,
                          user_id: Optional[str] = None) -> CalculationResult:
        """
        Execute calculation using appropriate engine based on feature flags.
        
        Args:
            plan_id: Optional plan identifier for routing decisions
            tenant_id: Optional tenant identifier for routing decisions
            employee_data: Employee data for calculation
            parameters: Calculation parameters
            user_id: User ID for audit logging
            
        Returns:
            CalculationResult: Standardized calculation result
        """
        start_time = datetime.utcnow()
        
        try:
            # Determine which engine to use
            use_new_engine = self._should_use_new_engine(plan_id, tenant_id)
            engine_name = "new_engine" if use_new_engine else "legacy_engine"
            
            logger.info(
                f"Executing calculation with {engine_name} "
                f"(plan_id={plan_id}, tenant_id={tenant_id})"
            )
            
            # Execute calculation
            if use_new_engine and self.new_engine:
                result = self._execute_with_new_engine(
                    plan_id, employee_data, parameters, user_id
                )
            else:
                if use_new_engine and not self.new_engine:
                    logger.warning(
                        "New engine selected but not available, falling back to legacy"
                    )
                result = self._execute_with_legacy_engine(
                    plan_id, employee_data, parameters, user_id
                )
            
            # Calculate execution time
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            result.execution_time = execution_time
            
            # Update statistics
            self.execution_stats[result.engine_used]["calls"] += 1
            self.execution_stats[result.engine_used]["total_time"] += execution_time
            
            # Log successful execution
            pii_safe_log(
                logger, logging.INFO,
                "Calculation completed successfully",
                engine_used=result.engine_used,
                execution_time=execution_time,
                plan_id=plan_id,
                tenant_id=tenant_id,
                user_id=user_id
            )
            
            # Create audit event
            self._create_audit_event(
                "calculation_executed",
                user_id,
                tenant_id,
                plan_id,
                {
                    "engine_used": result.engine_used,
                    "execution_time": execution_time,
                    "success": result.success,
                    "employee_count": len(employee_data) if employee_data else 0
                }
            )
            
            return result
            
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            engine_name = "new_engine" if use_new_engine else "legacy_engine"
            
            # Update error statistics
            self.execution_stats[engine_name]["errors"] += 1
            
            logger.error(
                f"Calculation failed with {engine_name}: {str(e)}",
                extra={
                    "plan_id": plan_id,
                    "tenant_id": tenant_id,
                    "user_id": user_id,
                    "execution_time": execution_time,
                    "error": str(e)
                }
            )
            
            # Create audit event for failure
            self._create_audit_event(
                "calculation_failed",
                user_id,
                tenant_id,
                plan_id,
                {
                    "engine_used": engine_name,
                    "execution_time": execution_time,
                    "error": str(e),
                    "employee_count": len(employee_data) if employee_data else 0
                }
            )
            
            return CalculationResult(
                success=False,
                error=str(e),
                engine_used=engine_name,
                execution_time=execution_time
            )
    
    def _should_use_new_engine(self, plan_id: Optional[str], tenant_id: Optional[str]) -> bool:
        """
        Determine if new engine should be used based on feature flags.
        
        Args:
            plan_id: Plan identifier
            tenant_id: Tenant identifier
            
        Returns:
            bool: True if new engine should be used
        """
        try:
            return self.feature_flags.use_new_calculation_engine(plan_id, tenant_id)
        except Exception as e:
            logger.error(f"Error checking feature flags, defaulting to legacy engine: {str(e)}")
            return False
    
    def _execute_with_legacy_engine(self, 
                                  plan_id: Optional[str],
                                  employee_data: Optional[List[Dict[str, Any]]],
                                  parameters: Optional[Dict[str, Any]],
                                  user_id: Optional[str]) -> CalculationResult:
        """
        Execute calculation using legacy engine.
        
        Args:
            plan_id: Plan identifier
            employee_data: Employee data
            parameters: Calculation parameters
            user_id: User ID
            
        Returns:
            CalculationResult: Calculation result
        """
        try:
            # Adapt parameters for legacy engine
            legacy_params = self._adapt_parameters_for_legacy(parameters or {})
            
            # Execute with legacy engine
            # Note: This assumes the legacy CalculationEngine has a calculate method
            # Adjust based on actual legacy engine interface
            if hasattr(self.legacy_engine, 'calculate'):
                results = self.legacy_engine.calculate(employee_data or [], legacy_params)
            else:
                # Fallback for different legacy engine interface
                results = self.legacy_engine.run_calculation(employee_data or [], legacy_params)
            
            return CalculationResult(
                success=True,
                results=results,
                engine_used="legacy_engine",
                metadata={"adapter_used": "legacy_adapter"}
            )
            
        except Exception as e:
            logger.error(f"Legacy engine execution failed: {str(e)}")
            raise
    
    def _execute_with_new_engine(self, 
                               plan_id: Optional[str],
                               employee_data: Optional[List[Dict[str, Any]]],
                               parameters: Optional[Dict[str, Any]],
                               user_id: Optional[str]) -> CalculationResult:
        """
        Execute calculation using new vectorized engine.
        
        Args:
            plan_id: Plan identifier
            employee_data: Employee data
            parameters: Calculation parameters
            user_id: User ID
            
        Returns:
            CalculationResult: Calculation result
        """
        try:
            # Adapt parameters for new engine
            new_params = self._adapt_parameters_for_new(parameters or {})
            
            # Execute with new engine
            # Note: This assumes the new engine has an execute method
            # Adjust based on actual new engine interface
            if hasattr(self.new_engine, 'execute'):
                results = self.new_engine.execute(employee_data or [], new_params)
            elif hasattr(self.new_engine, 'run'):
                results = self.new_engine.run(employee_data or [], new_params)
            else:
                raise ValueError("New engine does not have expected interface")
            
            return CalculationResult(
                success=True,
                results=results,
                engine_used="new_engine",
                metadata={"adapter_used": "new_adapter"}
            )
            
        except Exception as e:
            logger.error(f"New engine execution failed: {str(e)}")
            # Attempt fallback to legacy engine if configured
            if self.feature_flags.is_flag_enabled(self.feature_flags.FeatureFlag.NEW_CALCULATION_ENGINE):
                logger.info("Attempting fallback to legacy engine")
                return self._execute_with_legacy_engine(plan_id, employee_data, parameters, user_id)
            raise
    
    def _adapt_parameters_for_legacy(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Adapt parameters for legacy engine format.
        
        Args:
            parameters: Raw parameters
            
        Returns:
            Dict adapted for legacy engine
        """
        # Transform parameters to legacy format
        # This is a placeholder - adjust based on actual legacy engine requirements
        legacy_params = parameters.copy()
        
        # Example transformations:
        # - Rename fields if needed
        # - Convert data types
        # - Add default values
        
        return legacy_params
    
    def _adapt_parameters_for_new(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Adapt parameters for new engine format.
        
        Args:
            parameters: Raw parameters
            
        Returns:
            Dict adapted for new engine
        """
        # Transform parameters to new engine format
        # This is a placeholder - adjust based on actual new engine requirements
        new_params = parameters.copy()
        
        # Example transformations:
        # - Add vectorization hints
        # - Convert to numpy arrays if needed
        # - Set performance parameters
        
        return new_params
    
    def _normalize_results(self, results: Any, engine_used: str) -> Dict[str, Any]:
        """
        Normalize results from different engines to common format.
        
        Args:
            results: Raw results from engine
            engine_used: Which engine produced the results
            
        Returns:
            Dict with normalized results
        """
        if isinstance(results, dict):
            return results
        
        # Handle different result formats
        if engine_used == "legacy_engine":
            # Legacy engine might return different format
            if hasattr(results, 'to_dict'):
                return results.to_dict()
            elif isinstance(results, list):
                return {"calculations": results}
        
        elif engine_used == "new_engine":
            # New engine might return DataFrame or numpy array
            if hasattr(results, 'to_dict'):
                return results.to_dict()
            elif hasattr(results, 'tolist'):
                return {"calculations": results.tolist()}
        
        # Fallback
        return {"raw_results": str(results)}
    
    def _create_audit_event(self, 
                          event_type: str,
                          user_id: Optional[str],
                          tenant_id: Optional[str],
                          resource_id: Optional[str],
                          event_data: Dict[str, Any]):
        """
        Create audit event for calculation execution.
        
        Args:
            event_type: Type of event
            user_id: User ID
            tenant_id: Tenant ID
            resource_id: Resource ID (plan_id)
            event_data: Additional event data
        """
        try:
            if self.feature_flags.audit_logging_enabled():
                audit_event = AuditEvent(
                    tenant_id=tenant_id,
                    actor_user_id=user_id,
                    action=event_type,
                    entity="calculation",
                    entity_id=resource_id,
                    after=event_data
                )
                
                self.db.add(audit_event)
                self.db.commit()
        except Exception as e:
            logger.error(f"Failed to create audit event: {str(e)}")
            self.db.rollback()
    
    def get_execution_stats(self) -> Dict[str, Any]:
        """
        Get execution statistics for monitoring.
        
        Returns:
            Dict with execution statistics
        """
        stats = self.execution_stats.copy()
        
        # Calculate averages
        for engine_name, engine_stats in stats.items():
            if engine_stats["calls"] > 0:
                engine_stats["avg_execution_time"] = (
                    engine_stats["total_time"] / engine_stats["calls"]
                )
                engine_stats["error_rate"] = (
                    engine_stats["errors"] / engine_stats["calls"]
                )
            else:
                engine_stats["avg_execution_time"] = 0.0
                engine_stats["error_rate"] = 0.0
        
        return {
            "statistics": stats,
            "feature_flags": self.feature_flags.get_flag_status(),
            "engines_available": {
                "legacy_engine": self.legacy_engine is not None,
                "new_engine": self.new_engine is not None
            }
        }
    
    def reset_stats(self):
        """Reset execution statistics."""
        for engine_stats in self.execution_stats.values():
            engine_stats["calls"] = 0
            engine_stats["total_time"] = 0.0
            engine_stats["errors"] = 0
        
        logger.info("Execution statistics reset")
    
    def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on both engines.
        
        Returns:
            Dict with health status
        """
        health_status = {
            "healthy": True,
            "engines": {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Check legacy engine
        try:
            # Perform basic health check on legacy engine
            if hasattr(self.legacy_engine, 'health_check'):
                legacy_health = self.legacy_engine.health_check()
            else:
                # Basic availability check
                legacy_health = {"available": self.legacy_engine is not None}
            
            health_status["engines"]["legacy_engine"] = {
                "available": True,
                "healthy": legacy_health.get("healthy", True),
                "details": legacy_health
            }
        except Exception as e:
            health_status["engines"]["legacy_engine"] = {
                "available": False,
                "healthy": False,
                "error": str(e)
            }
            health_status["healthy"] = False
        
        # Check new engine
        try:
            if self.new_engine:
                if hasattr(self.new_engine, 'health_check'):
                    new_health = self.new_engine.health_check()
                else:
                    new_health = {"available": True}
                
                health_status["engines"]["new_engine"] = {
                    "available": True,
                    "healthy": new_health.get("healthy", True),
                    "details": new_health
                }
            else:
                health_status["engines"]["new_engine"] = {
                    "available": False,
                    "healthy": False,
                    "message": "New engine not configured"
                }
        except Exception as e:
            health_status["engines"]["new_engine"] = {
                "available": False,
                "healthy": False,
                "error": str(e)
            }
            health_status["healthy"] = False
        
        return health_status
