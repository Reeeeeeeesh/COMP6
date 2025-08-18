"""Add Row-Level Security (RLS) policies for multi-tenant isolation

Revision ID: g2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2025-01-14 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'g2b3c4d5e6f7'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create RLS policies for all tenant-aware tables."""
    # Note: RLS policies are only applied for PostgreSQL
    # SQLite doesn't support RLS, so we skip for development
    
    connection = op.get_bind()
    if connection.dialect.name == 'postgresql':
        # Enable RLS on all tenant tables
        tables = [
            'users', 'input_catalog', 'bonus_plans', 'plan_inputs', 
            'plan_steps', 'bonus_pools', 'platform_uploads', 
            'employee_rows', 'plan_runs', 'run_step_results', 'audit_events'
        ]
        
        for table in tables:
            op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        
        # Create tenant isolation policies
        
        # Users table
        op.execute("""
            CREATE POLICY tenant_isolation ON users
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant_id', true))
        """)
        
        # Input catalog table
        op.execute("""
            CREATE POLICY tenant_isolation ON input_catalog
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant_id', true))
        """)
        
        # Bonus plans table
        op.execute("""
            CREATE POLICY tenant_isolation ON bonus_plans
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant_id', true))
        """)
        
        # Plan inputs table (via bonus_plans relationship)
        op.execute("""
            CREATE POLICY tenant_isolation ON plan_inputs
            FOR ALL
            USING (
                plan_id IN (
                    SELECT id FROM bonus_plans 
                    WHERE tenant_id = current_setting('app.current_tenant_id', true)
                )
            )
        """)
        
        # Plan steps table (via bonus_plans relationship)
        op.execute("""
            CREATE POLICY tenant_isolation ON plan_steps
            FOR ALL
            USING (
                plan_id IN (
                    SELECT id FROM bonus_plans 
                    WHERE tenant_id = current_setting('app.current_tenant_id', true)
                )
            )
        """)
        
        # Bonus pools table (via bonus_plans relationship)
        op.execute("""
            CREATE POLICY tenant_isolation ON bonus_pools
            FOR ALL
            USING (
                plan_id IN (
                    SELECT id FROM bonus_plans 
                    WHERE tenant_id = current_setting('app.current_tenant_id', true)
                )
            )
        """)
        
        # Platform uploads table
        op.execute("""
            CREATE POLICY tenant_isolation ON platform_uploads
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant_id', true))
        """)
        
        # Employee rows table
        op.execute("""
            CREATE POLICY tenant_isolation ON employee_rows
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant_id', true))
        """)
        
        # Plan runs table
        op.execute("""
            CREATE POLICY tenant_isolation ON plan_runs
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant_id', true))
        """)
        
        # Run step results table (via plan_runs relationship)
        op.execute("""
            CREATE POLICY tenant_isolation ON run_step_results
            FOR ALL
            USING (
                run_id IN (
                    SELECT id FROM plan_runs 
                    WHERE tenant_id = current_setting('app.current_tenant_id', true)
                )
            )
        """)
        
        # Audit events table
        op.execute("""
            CREATE POLICY tenant_isolation ON audit_events
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant_id', true))
        """)


def downgrade() -> None:
    """Drop RLS policies and disable RLS."""
    connection = op.get_bind()
    if connection.dialect.name == 'postgresql':
        tables = [
            'users', 'input_catalog', 'bonus_plans', 'plan_inputs', 
            'plan_steps', 'bonus_pools', 'platform_uploads', 
            'employee_rows', 'plan_runs', 'run_step_results', 'audit_events'
        ]
        
        for table in tables:
            # Drop policy if exists
            op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
            # Disable RLS
            op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")