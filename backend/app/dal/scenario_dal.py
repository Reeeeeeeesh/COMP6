"""
Data Access Layer for Batch Scenarios

This module provides data access layer operations for managing batch calculation scenarios
including CRUD operations, auditing, and scenario management functionality.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from .base import BaseDAL
from ..models import BatchScenario, ScenarioAuditLog, BatchCalculationResult
from ..schemas import BatchScenarioCreate, BatchScenarioUpdate

logger = logging.getLogger(__name__)


class ScenarioDAL(BaseDAL[BatchScenario]):
    """Data Access Layer for Batch Scenarios"""
    
    def __init__(self, db: Session):
        super().__init__(BatchScenario, db)
    
    def create_with_audit(self, obj_in: BatchScenarioCreate) -> BatchScenario:
        """
        Create a new scenario with audit logging.
        
        Args:
            obj_in: Scenario creation data
            
        Returns:
            Created scenario
        """
        # Convert Pydantic model to dict for BaseDAL.create
        scenario_data = obj_in.model_dump()
        scenario = self.create(scenario_data)
        self._create_audit_log(
            scenario_id=scenario.id,
            action="created",
            new_values=scenario_data
        )
        return scenario
    
    def update(self, id: str, obj_in: BatchScenarioUpdate) -> Optional[BatchScenario]:
        """
        Update a scenario by ID.
        
        Args:
            id: Scenario ID
            obj_in: Update data
            
        Returns:
            Updated scenario or None if not found
        """
        db_obj = self.get(id)
        if not db_obj:
            return None
        
        # Convert Pydantic model to dict and filter out None values
        update_data = obj_in.model_dump(exclude_unset=True)
        
        # Use base class update method
        return super().update(db_obj, update_data)
    
    def update_with_audit(self, id: str, obj_in: BatchScenarioUpdate, old_scenario: Optional[BatchScenario] = None) -> Optional[BatchScenario]:
        """
        Update a scenario with audit logging.
        
        Args:
            id: Scenario ID
            obj_in: Update data
            old_scenario: Optional existing scenario (to avoid extra query)
            
        Returns:
            Updated scenario or None if not found
        """
        if old_scenario is None:
            old_scenario = self.get(id)
        
        if not old_scenario:
            return None
        
        # Store old values for audit
        old_values = {
            "name": old_scenario.name,
            "description": old_scenario.description,
            "parameters": old_scenario.parameters
        }
        
        updated_scenario = self.update(id, obj_in)
        
        if updated_scenario:
            # Only log changes that actually occurred
            new_values = {}
            if obj_in.name is not None and obj_in.name != old_scenario.name:
                new_values["name"] = obj_in.name
            if obj_in.description is not None and obj_in.description != old_scenario.description:
                new_values["description"] = obj_in.description
            if obj_in.parameters is not None and obj_in.parameters != old_scenario.parameters:
                new_values["parameters"] = obj_in.parameters
            
            if new_values:  # Only log if there were actual changes
                self._create_audit_log(
                    scenario_id=id,
                    action="updated",
                    old_values=old_values,
                    new_values=new_values
                )
        
        return updated_scenario
    
    def delete_with_audit(self, id: str) -> bool:
        """
        Delete a scenario with audit logging.
        
        Args:
            id: Scenario ID
            
        Returns:
            True if deleted, False if not found
        """
        scenario = self.get(id)
        if not scenario:
            return False
        
        # Store scenario data for audit before deletion
        old_values = {
            "name": scenario.name,
            "description": scenario.description,
            "parameters": scenario.parameters
        }
        
        self._create_audit_log(
            scenario_id=id,
            action="deleted",
            old_values=old_values
        )
        
        return self.delete(id)
    
    def get_by_session(self, session_id: str, limit: Optional[int] = None) -> List[BatchScenario]:
        """
        Get all scenarios for a session.
        
        Args:
            session_id: Session ID
            limit: Optional limit on number of results
            
        Returns:
            List of scenarios for the session
        """
        query = self.db.query(self.model).filter(self.model.session_id == session_id)
        query = query.order_by(desc(self.model.updated_at))
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    def search_scenarios(
        self,
        session_id: str,
        name_filter: Optional[str] = None,
        has_calculations: Optional[bool] = None,
        created_after: Optional[datetime] = None,
        limit: Optional[int] = None
    ) -> List[BatchScenario]:
        """
        Search scenarios with various filters.
        
        Args:
            session_id: Session ID
            name_filter: Optional name filter (partial match)
            has_calculations: Filter scenarios with/without calculation results
            created_after: Filter scenarios created after this date
            limit: Optional limit on number of results
            
        Returns:
            List of filtered scenarios
        """
        query = self.db.query(self.model).filter(self.model.session_id == session_id)
        
        if name_filter:
            query = query.filter(self.model.name.ilike(f"%{name_filter}%"))
        
        if created_after:
            query = query.filter(self.model.created_at >= created_after)
        
        if has_calculations is not None:
            if has_calculations:
                query = query.join(BatchCalculationResult).filter(
                    BatchCalculationResult.scenario_id == self.model.id
                )
            else:
                query = query.outerjoin(BatchCalculationResult).filter(
                    BatchCalculationResult.scenario_id.is_(None)
                )
        
        query = query.order_by(desc(self.model.updated_at))
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    def duplicate_scenario(self, scenario_id: str, new_name: str, new_description: Optional[str] = None) -> Optional[BatchScenario]:
        """
        Create a duplicate of an existing scenario.
        
        Args:
            scenario_id: ID of scenario to duplicate
            new_name: Name for the new scenario
            new_description: Optional description for the new scenario
            
        Returns:
            New scenario or None if original not found
        """
        original = self.get(scenario_id)
        if not original:
            return None
        
        duplicate_data = BatchScenarioCreate(
            session_id=original.session_id,
            name=new_name,
            description=new_description or f"Copy of {original.name}",
            parameters=original.parameters
        )
        
        duplicate = self.create_with_audit(duplicate_data)
        
        # Log the duplication action
        self._create_audit_log(
            scenario_id=duplicate.id,
            action="duplicated",
            new_values={
                "duplicated_from": scenario_id,
                "original_name": original.name
            }
        )
        
        return duplicate
    
    def log_calculation(self, scenario_id: str, calculation_details: Dict[str, Any]) -> None:
        """
        Log when a calculation is performed on a scenario.
        
        Args:
            scenario_id: Scenario ID
            calculation_details: Details about the calculation performed
        """
        self._create_audit_log(
            scenario_id=scenario_id,
            action="calculated",
            new_values=calculation_details
        )
    
    def get_audit_history(self, scenario_id: str, limit: Optional[int] = None) -> List[ScenarioAuditLog]:
        """
        Get audit history for a scenario.
        
        Args:
            scenario_id: Scenario ID
            limit: Optional limit on number of results
            
        Returns:
            List of audit log entries
        """
        query = self.db.query(ScenarioAuditLog).filter(
            ScenarioAuditLog.scenario_id == scenario_id
        ).order_by(desc(ScenarioAuditLog.timestamp))
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    def _create_audit_log(
        self,
        scenario_id: str,
        action: str,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None
    ) -> ScenarioAuditLog:
        """
        Create an audit log entry.
        
        Args:
            scenario_id: Scenario ID
            action: Action performed (created, updated, deleted, calculated, duplicated)
            old_values: Previous values (for updates/deletes)
            new_values: New values (for creates/updates)
            
        Returns:
            Created audit log entry
        """
        audit_log = ScenarioAuditLog(
            scenario_id=scenario_id,
            action=action,
            old_values=old_values,
            new_values=new_values
        )
        
        self.db.add(audit_log)
        self.db.commit()
        
        logger.info(f"Audit log created: scenario={scenario_id}, action={action}")
        
        return audit_log 