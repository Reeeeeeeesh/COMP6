"""
Team RAF Service

This module provides business logic for Team RAF (Risk Adjustment Factor) operations,
including RAF calculation, validation, and integration with batch processing.
"""

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
import logging

from ..dal.team_raf_dal import RAFSnapshotDAL, RAFConfigDAL, OrgMembershipDAL
from ..models import RAFConfig, RAFSnapshot, Team

logger = logging.getLogger(__name__)


class TeamRAFService:
    """Service for Team RAF operations."""
    
    def __init__(self, db: Session):
        """
        Initialize the TeamRAFService.
        
        Args:
            db: Database session
        """
        self.db = db
        self.raf_snapshot_dal = RAFSnapshotDAL(db)
        self.raf_config_dal = RAFConfigDAL(db)
        self.org_membership_dal = OrgMembershipDAL(db)
    
    def get_team_raf_factors(self, cycle: str) -> Dict[str, float]:
        """
        Get all approved Team RAF factors for a given cycle.
        
        Args:
            cycle: The cycle to retrieve factors for (e.g., "2025", "2025-Q2")
            
        Returns:
            Dict mapping team_id to RAF factor
        """
        try:
            factors = self.raf_snapshot_dal.get_approved_snapshots(cycle)
            
            if not factors:
                logger.warning(f"No approved RAF factors found for cycle {cycle}")
            else:
                logger.info(f"Retrieved {len(factors)} approved RAF factors for cycle {cycle}")
            
            return factors
            
        except Exception as e:
            logger.error(f"Error retrieving team RAF factors for cycle {cycle}: {str(e)}")
            return {}
    
    def get_employee_team_mapping(self) -> Dict[str, str]:
        """
        Get current employee-team mapping.
        
        Returns:
            Dict mapping employee_id to team_id
        """
        try:
            mapping = self.org_membership_dal.get_employee_team_mapping()
            
            if not mapping:
                logger.warning("No employee-team mappings found")
            else:
                logger.info(f"Retrieved {len(mapping)} employee-team mappings")
            
            return mapping
            
        except Exception as e:
            logger.error(f"Error retrieving employee-team mapping: {str(e)}")
            return {}
    
    def validate_team_raf_coverage(self, cycle: str, employee_team_mapping: Dict[str, str]) -> Tuple[bool, List[str]]:
        """
        Validate that all teams in the employee mapping have approved RAF snapshots.
        
        Args:
            cycle: Cycle to validate against
            employee_team_mapping: Dict mapping employee_id to team_id
            
        Returns:
            Tuple of (is_valid, list_of_missing_teams)
        """
        try:
            # Get all approved RAF factors for the cycle
            team_raf_factors = self.get_team_raf_factors(cycle)
            
            # Get unique teams from employee mapping
            unique_teams = set(employee_team_mapping.values())
            
            # Find teams that have RAF factors
            teams_with_raf = set(team_raf_factors.keys())
            
            # Find teams without RAF factors
            teams_without_raf = unique_teams - teams_with_raf
            
            if teams_without_raf:
                logger.warning(f"Teams without RAF factors for cycle {cycle}: {list(teams_without_raf)}")
                return False, list(teams_without_raf)
            
            logger.info(f"All {len(unique_teams)} teams have approved RAF factors for cycle {cycle}")
            return True, []
            
        except Exception as e:
            logger.error(f"Error validating team RAF coverage: {str(e)}")
            return False, []
    
    def get_team_raf_weight_percentage(self, cycle: str) -> float:
        """
        Get the weight percentage for team RAF from the first available configuration.
        
        Args:
            cycle: Cycle to get weight percentage for
            
        Returns:
            Weight percentage as decimal (e.g., 0.25 for 25%)
        """
        try:
            # Get approved configs for the cycle
            approved_configs = self.raf_config_dal.get_approved_configs(cycle)
            
            if not approved_configs:
                logger.warning(f"No approved RAF configs found for cycle {cycle}, using default weight 25%")
                return 0.25  # Default 25%
            
            # Use weight from first config (assuming all configs in a cycle use same weight)
            weight_pct = approved_configs[0].weight_pct / 100.0  # Convert to decimal
            
            logger.info(f"Using team RAF weight percentage: {weight_pct * 100}%")
            return weight_pct
            
        except Exception as e:
            logger.error(f"Error retrieving team RAF weight percentage: {str(e)}")
            return 0.25  # Default fallback


def get_team_raf_service(db: Session) -> TeamRAFService:
    """
    Factory function to get a TeamRAFService instance.
    
    Args:
        db: Database session
        
    Returns:
        TeamRAFService instance
    """
    return TeamRAFService(db)