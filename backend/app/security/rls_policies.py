"""
Row-Level Security (RLS) Policies for Multi-Tenant Isolation
Provides PostgreSQL RLS policy management for the platform transformation.
"""
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)

class RLSManager:
    """Manager for PostgreSQL Row-Level Security policies."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_tenant_policies(self) -> bool:
        """Create RLS policies for all tenant-aware tables."""
        try:
            # Enable RLS on all tenant tables
            self._enable_rls_on_tables()
            
            # Create policies for each table
            self._create_user_policies()
            self._create_input_catalog_policies()
            self._create_bonus_plan_policies()
            self._create_plan_input_policies()
            self._create_plan_step_policies()
            self._create_bonus_pool_policies()
            self._create_platform_upload_policies()
            self._create_employee_row_policies()
            self._create_plan_run_policies()
            self._create_run_step_result_policies()
            self._create_audit_event_policies()
            
            self.db.commit()
            logger.info("Successfully created all RLS policies")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create RLS policies: {e}")
            return False
    
    def _enable_rls_on_tables(self):
        """Enable RLS on all tenant-aware tables."""
        tables = [
            'users', 'input_catalog', 'bonus_plans', 'plan_inputs', 
            'plan_steps', 'bonus_pools', 'platform_uploads', 
            'employee_rows', 'plan_runs', 'run_step_results', 'audit_events'
        ]
        
        for table in tables:
            self.db.execute(text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;"))
    
    def _create_user_policies(self):
        """Create RLS policies for users table."""
        # Allow users to see only users from their tenant
        self.db.execute(text("""
            CREATE POLICY tenant_isolation ON users
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant_id', true));
        """))
    
    def _create_input_catalog_policies(self):
        """Create RLS policies for input_catalog table."""
        self.db.execute(text("""
            CREATE POLICY tenant_isolation ON input_catalog
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant_id', true));
        """))
    
    def _create_bonus_plan_policies(self):
        """Create RLS policies for bonus_plans table."""
        self.db.execute(text("""
            CREATE POLICY tenant_isolation ON bonus_plans
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant_id', true));
        """))
    
    def _create_plan_input_policies(self):
        """Create RLS policies for plan_inputs table."""
        # Use subquery to check tenant via bonus_plans
        self.db.execute(text("""
            CREATE POLICY tenant_isolation ON plan_inputs
            FOR ALL
            USING (
                plan_id IN (
                    SELECT id FROM bonus_plans 
                    WHERE tenant_id = current_setting('app.current_tenant_id', true)
                )
            );
        """))
    
    def _create_plan_step_policies(self):
        """Create RLS policies for plan_steps table."""
        self.db.execute(text("""
            CREATE POLICY tenant_isolation ON plan_steps
            FOR ALL
            USING (
                plan_id IN (
                    SELECT id FROM bonus_plans 
                    WHERE tenant_id = current_setting('app.current_tenant_id', true)
                )
            );
        """))
    
    def _create_bonus_pool_policies(self):
        """Create RLS policies for bonus_pools table."""
        self.db.execute(text("""
            CREATE POLICY tenant_isolation ON bonus_pools
            FOR ALL
            USING (
                plan_id IN (
                    SELECT id FROM bonus_plans 
                    WHERE tenant_id = current_setting('app.current_tenant_id', true)
                )
            );
        """))
    
    def _create_platform_upload_policies(self):
        """Create RLS policies for platform_uploads table."""
        self.db.execute(text("""
            CREATE POLICY tenant_isolation ON platform_uploads
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant_id', true));
        """))
    
    def _create_employee_row_policies(self):
        """Create RLS policies for employee_rows table."""
        self.db.execute(text("""
            CREATE POLICY tenant_isolation ON employee_rows
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant_id', true));
        """))
    
    def _create_plan_run_policies(self):
        """Create RLS policies for plan_runs table."""
        self.db.execute(text("""
            CREATE POLICY tenant_isolation ON plan_runs
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant_id', true));
        """))
    
    def _create_run_step_result_policies(self):
        """Create RLS policies for run_step_results table."""
        self.db.execute(text("""
            CREATE POLICY tenant_isolation ON run_step_results
            FOR ALL
            USING (
                run_id IN (
                    SELECT id FROM plan_runs 
                    WHERE tenant_id = current_setting('app.current_tenant_id', true)
                )
            );
        """))
    
    def _create_audit_event_policies(self):
        """Create RLS policies for audit_events table."""
        self.db.execute(text("""
            CREATE POLICY tenant_isolation ON audit_events
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant_id', true));
        """))
    
    def set_tenant_context(self, tenant_id: str):
        """Set the current tenant context for RLS policies."""
        self.db.execute(text(f"SET app.current_tenant_id = '{tenant_id}';"))
    
    def clear_tenant_context(self):
        """Clear the current tenant context."""
        self.db.execute(text("SET app.current_tenant_id = '';"))
    
    def drop_all_policies(self) -> bool:
        """Drop all RLS policies (for testing/migration purposes)."""
        try:
            tables = [
                'users', 'input_catalog', 'bonus_plans', 'plan_inputs', 
                'plan_steps', 'bonus_pools', 'platform_uploads', 
                'employee_rows', 'plan_runs', 'run_step_results', 'audit_events'
            ]
            
            for table in tables:
                # Drop policy if exists
                self.db.execute(text(f"DROP POLICY IF EXISTS tenant_isolation ON {table};"))
                # Disable RLS
                self.db.execute(text(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;"))
            
            self.db.commit()
            logger.info("Successfully dropped all RLS policies")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to drop RLS policies: {e}")
            return False
    
    def validate_policies(self) -> Dict[str, bool]:
        """Validate that RLS policies are correctly applied."""
        results = {}
        tables = [
            'users', 'input_catalog', 'bonus_plans', 'plan_inputs', 
            'plan_steps', 'bonus_pools', 'platform_uploads', 
            'employee_rows', 'plan_runs', 'run_step_results', 'audit_events'
        ]
        
        for table in tables:
            try:
                # Check if RLS is enabled
                result = self.db.execute(text(f"""
                    SELECT relrowsecurity FROM pg_class 
                    WHERE relname = '{table}';
                """)).fetchone()
                
                rls_enabled = result[0] if result else False
                
                # Check if policy exists
                policy_result = self.db.execute(text(f"""
                    SELECT COUNT(*) FROM pg_policies 
                    WHERE tablename = '{table}' AND policyname = 'tenant_isolation';
                """)).fetchone()
                
                policy_exists = policy_result[0] > 0 if policy_result else False
                
                results[table] = rls_enabled and policy_exists
                
            except Exception as e:
                logger.error(f"Failed to validate policy for {table}: {e}")
                results[table] = False
        
        return results


def create_rls_policies(db: Session) -> bool:
    """Factory function to create RLS policies."""
    rls_manager = RLSManager(db)
    return rls_manager.create_tenant_policies()


def set_tenant_context(db: Session, tenant_id: str):
    """Set tenant context for the current session."""
    rls_manager = RLSManager(db)
    rls_manager.set_tenant_context(tenant_id)


def clear_tenant_context(db: Session):
    """Clear tenant context for the current session."""
    rls_manager = RLSManager(db)
    rls_manager.clear_tenant_context()