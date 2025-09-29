"""
Team RAF Data Access Layer

This module provides data access methods for Team RAF functionality,
including organization membership and RAF snapshot management.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
import logging

from ..models import RAFConfig, RAFSnapshot, OrgMembership, Team, TeamRevenueData

logger = logging.getLogger(__name__)


class OrgMembershipDAL:
    """Data Access Layer for organization membership operations."""
    
    def __init__(self, db: Session):
        """
        Initialize the OrgMembershipDAL.
        
        Args:
            db: Database session
        """
        self.db = db
    
    def get_employee_team_mapping(self, reference_date: Optional[datetime] = None) -> Dict[str, str]:
        """
        Get current employee-team mapping.
        
        Args:
            reference_date: Date to check active memberships against (default: current date)
            
        Returns:
            Dict mapping employee_id to team_id
        """
        if reference_date is None:
            reference_date = datetime.utcnow()
        
        try:
            # Get active memberships with team information
            query = self.db.query(
                OrgMembership.employee_id,
                Team.id.label('team_id')
            ).join(
                Team, Team.name == OrgMembership.team_code
            ).filter(
                OrgMembership.start_date <= reference_date,
                and_(
                    OrgMembership.end_date.is_(None),
                    OrgMembership.end_date > reference_date
                ).or_(OrgMembership.end_date.is_(None))
            )
            
            results = query.all()
            
            mapping = {}
            for employee_id, team_id in results:
                mapping[employee_id] = team_id
                
            logger.info(f"Retrieved {len(mapping)} active employee-team mappings")
            return mapping
            
        except Exception as e:
            logger.error(f"Error retrieving employee-team mapping: {str(e)}")
            return {}
    
    def get_active_memberships(self, employee_id: str, reference_date: Optional[datetime] = None) -> List[OrgMembership]:
        """
        Get active memberships for a specific employee.
        
        Args:
            employee_id: Employee ID to look up
            reference_date: Date to check active memberships against (default: current date)
            
        Returns:
            List of active OrgMembership records
        """
        if reference_date is None:
            reference_date = datetime.utcnow()
        
        try:
            memberships = self.db.query(OrgMembership).filter(
                OrgMembership.employee_id == employee_id,
                OrgMembership.start_date <= reference_date,
                and_(
                    OrgMembership.end_date.is_(None),
                    OrgMembership.end_date > reference_date
                ).or_(OrgMembership.end_date.is_(None))
            ).all()
            
            return memberships
            
        except Exception as e:
            logger.error(f"Error retrieving active memberships for employee {employee_id}: {str(e)}")
            return []
    
    def get_active_membership(self, employee_id: str, reference_date: Optional[datetime] = None) -> Optional[OrgMembership]:
        """
        Get the first active membership for a specific employee.
        
        Args:
            employee_id: Employee ID to look up
            reference_date: Date to check active memberships against (default: current date)
            
        Returns:
            First active OrgMembership record or None if no active membership
        """
        memberships = self.get_active_memberships(employee_id, reference_date)
        return memberships[0] if memberships else None
    
    def create_membership(self, employee_id: str, team_code: str, start_date: datetime, end_date: Optional[datetime] = None) -> OrgMembership:
        """
        Create a new organization membership record.
        
        Args:
            employee_id: Employee ID
            team_code: Team code
            start_date: Membership start date
            end_date: Optional membership end date
            
        Returns:
            Created OrgMembership record
        """
        try:
            membership = OrgMembership(
                employee_id=employee_id,
                team_code=team_code,
                start_date=start_date,
                end_date=end_date
            )
            
            self.db.add(membership)
            self.db.flush()  # Get the ID without committing
            
            logger.info(f"Created organization membership: employee {employee_id} -> team {team_code}")
            return membership
            
        except Exception as e:
            logger.error(f"Error creating organization membership: {str(e)}")
            raise


class RAFSnapshotDAL:
    """Data Access Layer for RAF snapshot operations."""
    
    def __init__(self, db: Session):
        """
        Initialize the RAFSnapshotDAL.
        
        Args:
            db: Database session
        """
        self.db = db
    
    def get_approved_snapshots(self, cycle: str) -> Dict[str, float]:
        """
        Get all approved RAF snapshots for a given cycle.
        
        Args:
            cycle: The cycle to retrieve snapshots for (e.g., "2025", "2025-Q2")
            
        Returns:
            Dict mapping team_id to RAF factor
        """
        try:
            # Query approved snapshots for the cycle (approved means approved_at is not null)
            snapshots = self.db.query(RAFSnapshot).filter(
                RAFSnapshot.cycle == cycle,
                RAFSnapshot.approved_at.isnot(None)
            ).all()
            
            factors = {}
            for snapshot in snapshots:
                factors[snapshot.team_id] = snapshot.computed_factor
            
            logger.info(f"Retrieved {len(factors)} approved RAF snapshots for cycle {cycle}")
            return factors
            
        except Exception as e:
            logger.error(f"Error retrieving approved RAF snapshots for cycle {cycle}: {str(e)}")
            return {}
    
    def get_snapshot_by_team_and_cycle(self, team_id: str, cycle: str, approved_only: bool = True) -> Optional[RAFSnapshot]:
        """
        Get a specific RAF snapshot by team and cycle.
        
        Args:
            team_id: Team ID
            cycle: Cycle identifier
            approved_only: Whether to only return approved snapshots (default: True)
            
        Returns:
            RAFSnapshot if found, None otherwise
        """
        try:
            query = self.db.query(RAFSnapshot).filter(
                RAFSnapshot.team_id == team_id,
                RAFSnapshot.cycle == cycle
            )
            
            if approved_only:
                query = query.filter(RAFSnapshot.approved_at.isnot(None))
            
            snapshot = query.first()
            
            status_desc = "approved" if approved_only else "any"
            if snapshot:
                logger.debug(f"Found {status_desc} RAF snapshot for team {team_id}, cycle {cycle}")
            else:
                logger.debug(f"No {status_desc} RAF snapshot found for team {team_id}, cycle {cycle}")
            
            return snapshot
            
        except Exception as e:
            logger.error(f"Error retrieving RAF snapshot for team {team_id}, cycle {cycle}: {str(e)}")
            return None
    
    def get_snapshots_by_cycle(self, cycle: str, approved_only: Optional[bool] = None) -> List[RAFSnapshot]:
        """
        Get all RAF snapshots for a given cycle.
        
        Args:
            cycle: Cycle identifier
            approved_only: Optional filter for approved snapshots only
            
        Returns:
            List of RAFSnapshot records
        """
        try:
            query = self.db.query(RAFSnapshot).filter(RAFSnapshot.cycle == cycle)
            
            if approved_only is True:
                query = query.filter(RAFSnapshot.approved_at.isnot(None))
            elif approved_only is False:
                query = query.filter(RAFSnapshot.approved_at.is_(None))
            
            snapshots = query.all()
            
            filter_desc = ""
            if approved_only is True:
                filter_desc = " (approved only)"
            elif approved_only is False:
                filter_desc = " (non-approved only)"
            
            logger.info(f"Retrieved {len(snapshots)} RAF snapshots for cycle {cycle}{filter_desc}")
            return snapshots
            
        except Exception as e:
            logger.error(f"Error retrieving RAF snapshots for cycle {cycle}: {str(e)}")
            return []
    
    def create_snapshot(self, team_id: str, config_id: str, cycle: str, method: str, 
                       computed_factor: float, adjustments_json: Optional[Dict[str, Any]] = None,
                       inputs_hash: str = "", cap_applied: bool = False, 
                       floor_applied: bool = False) -> RAFSnapshot:
        """
        Create a new RAF snapshot.
        
        Args:
            team_id: Team ID
            config_id: RAF config ID
            cycle: Cycle identifier
            method: Calculation method used
            computed_factor: Calculated RAF factor
            adjustments_json: Optional calculation details
            inputs_hash: Hash of input data
            cap_applied: Whether cap was applied
            floor_applied: Whether floor was applied
            
        Returns:
            Created RAFSnapshot record
        """
        try:
            snapshot = RAFSnapshot(
                team_id=team_id,
                config_id=config_id,
                cycle=cycle,
                method=method,
                computed_factor=computed_factor,
                adjustments_json=adjustments_json,
                inputs_hash=inputs_hash,
                cap_applied=cap_applied,
                floor_applied=floor_applied
            )
            
            self.db.add(snapshot)
            self.db.flush()  # Get the ID without committing
            
            logger.info(f"Created RAF snapshot for team {team_id}, cycle {cycle}, factor {computed_factor}")
            return snapshot
            
        except Exception as e:
            logger.error(f"Error creating RAF snapshot: {str(e)}")
            raise
    
    def approve_snapshot(self, snapshot_id: str, approver_ids: Optional[List[str]] = None) -> bool:
        """
        Approve a RAF snapshot.
        
        Args:
            snapshot_id: Snapshot ID to approve
            approver_ids: Optional list of approver user IDs
            
        Returns:
            True if approval was successful, False otherwise
        """
        try:
            snapshot = self.db.query(RAFSnapshot).filter(RAFSnapshot.id == snapshot_id).first()
            
            if not snapshot:
                logger.warning(f"RAF snapshot {snapshot_id} not found for approval")
                return False
            
            if approver_ids:
                snapshot.approver_ids = approver_ids
            snapshot.approved_at = datetime.utcnow()
            
            logger.info(f"Approved RAF snapshot {snapshot_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error approving RAF snapshot: {str(e)}")
            return False


class RAFConfigDAL:
    """Data Access Layer for RAF configuration operations."""
    
    def __init__(self, db: Session):
        """
        Initialize the RAFConfigDAL.
        
        Args:
            db: Database session
        """
        self.db = db
    
    def get_by_team_and_cycle(self, team_id: str, cycle: str) -> Optional[RAFConfig]:
        """
        Get RAF configuration by team and cycle.
        
        Args:
            team_id: Team ID
            cycle: Cycle identifier
            
        Returns:
            RAFConfig if found, None otherwise
        """
        try:
            config = self.db.query(RAFConfig).filter(
                RAFConfig.team_id == team_id,
                RAFConfig.cycle == cycle
            ).first()
            
            if config:
                logger.debug(f"Found RAF config for team {team_id}, cycle {cycle}")
            else:
                logger.debug(f"No RAF config found for team {team_id}, cycle {cycle}")
            
            return config
            
        except Exception as e:
            logger.error(f"Error retrieving RAF config for team {team_id}, cycle {cycle}: {str(e)}")
            return None
    
    def get_approved_configs(self, cycle: str) -> List[RAFConfig]:
        """
        Get all approved RAF configurations for a cycle.
        
        Args:
            cycle: Cycle identifier
            
        Returns:
            List of approved RAFConfig records
        """
        try:
            configs = self.db.query(RAFConfig).filter(
                RAFConfig.cycle == cycle,
                RAFConfig.status == "approved"
            ).all()
            
            logger.info(f"Retrieved {len(configs)} approved RAF configs for cycle {cycle}")
            return configs
            
        except Exception as e:
            logger.error(f"Error retrieving approved RAF configs for cycle {cycle}: {str(e)}")
            return []


class TeamRevenueDataDAL:
    """Data Access Layer for team revenue data operations."""
    
    def __init__(self, db: Session):
        """
        Initialize the TeamRevenueDataDAL.
        
        Args:
            db: Database session
        """
        self.db = db
    
    def get_by_team_and_year(self, team_id: str, fiscal_year: int) -> Optional[TeamRevenueData]:
        """
        Get team revenue data by team ID and fiscal year.
        
        Args:
            team_id: Team ID
            fiscal_year: Fiscal year
            
        Returns:
            TeamRevenueData if found, None otherwise
        """
        try:
            revenue_data = self.db.query(TeamRevenueData).filter(
                TeamRevenueData.team_id == team_id,
                TeamRevenueData.fiscal_year == fiscal_year
            ).first()
            
            if revenue_data:
                logger.debug(f"Found revenue data for team {team_id}, year {fiscal_year}")
            else:
                logger.debug(f"No revenue data found for team {team_id}, year {fiscal_year}")
            
            return revenue_data
            
        except Exception as e:
            logger.error(f"Error retrieving revenue data for team {team_id}, year {fiscal_year}: {str(e)}")
            return None
    
    def get_by_team(self, team_id: str) -> List[TeamRevenueData]:
        """
        Get all revenue data for a specific team.
        
        Args:
            team_id: Team ID
            
        Returns:
            List of TeamRevenueData records
        """
        try:
            revenue_data = self.db.query(TeamRevenueData).filter(
                TeamRevenueData.team_id == team_id
            ).order_by(TeamRevenueData.fiscal_year.desc()).all()
            
            logger.info(f"Retrieved {len(revenue_data)} revenue records for team {team_id}")
            return revenue_data
            
        except Exception as e:
            logger.error(f"Error retrieving revenue data for team {team_id}: {str(e)}")
            return []
    
    def get_by_year_range(self, team_id: str, start_year: int, end_year: int) -> List[TeamRevenueData]:
        """
        Get revenue data for a team within a specific year range.
        
        Args:
            team_id: Team ID
            start_year: Starting fiscal year (inclusive)
            end_year: Ending fiscal year (inclusive)
            
        Returns:
            List of TeamRevenueData records
        """
        try:
            revenue_data = self.db.query(TeamRevenueData).filter(
                TeamRevenueData.team_id == team_id,
                TeamRevenueData.fiscal_year >= start_year,
                TeamRevenueData.fiscal_year <= end_year
            ).order_by(TeamRevenueData.fiscal_year).all()
            
            logger.info(f"Retrieved {len(revenue_data)} revenue records for team {team_id}, years {start_year}-{end_year}")
            return revenue_data
            
        except Exception as e:
            logger.error(f"Error retrieving revenue data for team {team_id}, years {start_year}-{end_year}: {str(e)}")
            return []
    
    def create_revenue_data(self, team_id: str, fiscal_year: int, reported_revenue: float,
                           organic_revenue: Optional[float] = None, currency: str = "USD",
                           perf_fee_component: Optional[float] = None, notes: Optional[str] = None,
                           file_id: Optional[str] = None) -> TeamRevenueData:
        """
        Create a new team revenue data record.
        
        Args:
            team_id: Team ID
            fiscal_year: Fiscal year
            reported_revenue: Reported revenue amount
            organic_revenue: Optional organic revenue amount
            currency: Currency code (default: USD)
            perf_fee_component: Optional performance fee component
            notes: Optional notes
            file_id: Optional reference to source file
            
        Returns:
            Created TeamRevenueData record
        """
        try:
            revenue_data = TeamRevenueData(
                team_id=team_id,
                fiscal_year=fiscal_year,
                reported_revenue=reported_revenue,
                organic_revenue=organic_revenue,
                currency=currency,
                perf_fee_component=perf_fee_component,
                notes=notes,
                file_id=file_id
            )
            
            self.db.add(revenue_data)
            self.db.flush()  # Get the ID without committing
            
            logger.info(f"Created revenue data for team {team_id}, year {fiscal_year}, amount {reported_revenue}")
            return revenue_data
            
        except Exception as e:
            logger.error(f"Error creating revenue data: {str(e)}")
            raise