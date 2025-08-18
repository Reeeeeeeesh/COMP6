"""Add platform transformation models (tenancy, bonus plans, audit)

Revision ID: f1a2b3c4d5e6
Revises: ee71111c2f79
Create Date: 2025-01-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.sqlite import JSON


# revision identifiers, used by Alembic.
revision = 'f1a2b3c4d5e6'
down_revision = 'ee71111c2f79'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create tenants table
    op.create_table('tenants',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('tenant_metadata', JSON(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tenants_id'), 'tenants', ['id'], unique=False)

    # Create users table
    op.create_table('users',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('tenant_id', sa.String(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('display_name', sa.String(), nullable=True),
    sa.Column('role', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=False)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_tenant_id'), 'users', ['tenant_id'], unique=False)

    # Create input_catalog table
    op.create_table('input_catalog',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('tenant_id', sa.String(), nullable=False),
    sa.Column('key', sa.String(), nullable=False),
    sa.Column('label', sa.String(), nullable=False),
    sa.Column('dtype', sa.String(), nullable=False),
    sa.Column('required', sa.Boolean(), nullable=False),
    sa.Column('default_value', JSON(), nullable=True),
    sa.Column('validation', JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_input_catalog_id'), 'input_catalog', ['id'], unique=False)
    op.create_index(op.f('ix_input_catalog_tenant_id'), 'input_catalog', ['tenant_id'], unique=False)

    # Create bonus_plans table
    op.create_table('bonus_plans',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('tenant_id', sa.String(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('effective_from', sa.DateTime(), nullable=True),
    sa.Column('effective_to', sa.DateTime(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('plan_metadata', JSON(), nullable=False),
    sa.Column('created_by', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('locked_by', sa.String(), nullable=True),
    sa.Column('locked_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['locked_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bonus_plans_id'), 'bonus_plans', ['id'], unique=False)
    op.create_index(op.f('ix_bonus_plans_tenant_id'), 'bonus_plans', ['tenant_id'], unique=False)

    # Create platform_uploads table
    op.create_table('platform_uploads',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('tenant_id', sa.String(), nullable=False),
    sa.Column('created_by', sa.String(), nullable=True),
    sa.Column('filename', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('file_size', sa.Integer(), nullable=True),
    sa.Column('upload_metadata', JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_platform_uploads_id'), 'platform_uploads', ['id'], unique=False)
    op.create_index(op.f('ix_platform_uploads_tenant_id'), 'platform_uploads', ['tenant_id'], unique=False)

    # Create plan_inputs table
    op.create_table('plan_inputs',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('plan_id', sa.String(), nullable=False),
    sa.Column('input_id', sa.String(), nullable=False),
    sa.Column('required', sa.Boolean(), nullable=False),
    sa.Column('source_mapping', JSON(), nullable=False),
    sa.ForeignKeyConstraint(['input_id'], ['input_catalog.id'], ),
    sa.ForeignKeyConstraint(['plan_id'], ['bonus_plans.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_plan_inputs_id'), 'plan_inputs', ['id'], unique=False)
    op.create_index(op.f('ix_plan_inputs_plan_id'), 'plan_inputs', ['plan_id'], unique=False)

    # Create plan_steps table
    op.create_table('plan_steps',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('plan_id', sa.String(), nullable=False),
    sa.Column('step_order', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('expr', sa.Text(), nullable=False),
    sa.Column('condition_expr', sa.Text(), nullable=True),
    sa.Column('outputs', JSON(), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['plan_id'], ['bonus_plans.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_plan_steps_id'), 'plan_steps', ['id'], unique=False)
    op.create_index(op.f('ix_plan_steps_plan_id'), 'plan_steps', ['plan_id'], unique=False)

    # Create bonus_pools table
    op.create_table('bonus_pools',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('plan_id', sa.String(), nullable=False),
    sa.Column('currency', sa.String(length=3), nullable=False),
    sa.Column('amount', sa.Numeric(precision=38, scale=10), nullable=False),
    sa.Column('allocation_rules', JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['plan_id'], ['bonus_plans.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bonus_pools_id'), 'bonus_pools', ['id'], unique=False)
    op.create_index(op.f('ix_bonus_pools_plan_id'), 'bonus_pools', ['plan_id'], unique=False)

    # Create employee_rows table
    op.create_table('employee_rows',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('tenant_id', sa.String(), nullable=False),
    sa.Column('upload_id', sa.String(), nullable=False),
    sa.Column('employee_ref', sa.String(), nullable=False),
    sa.Column('raw', JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.ForeignKeyConstraint(['upload_id'], ['platform_uploads.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_employee_rows_id'), 'employee_rows', ['id'], unique=False)
    op.create_index(op.f('ix_employee_rows_tenant_id'), 'employee_rows', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_employee_rows_upload_id'), 'employee_rows', ['upload_id'], unique=False)

    # Create plan_runs table
    op.create_table('plan_runs',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('tenant_id', sa.String(), nullable=False),
    sa.Column('plan_id', sa.String(), nullable=False),
    sa.Column('upload_id', sa.String(), nullable=True),
    sa.Column('scenario_name', sa.String(), nullable=True),
    sa.Column('approvals_state', JSON(), nullable=False),
    sa.Column('snapshot_hash', sa.String(), nullable=False),
    sa.Column('started_at', sa.DateTime(), nullable=False),
    sa.Column('finished_at', sa.DateTime(), nullable=True),
    sa.Column('status', sa.String(), nullable=False),
    sa.ForeignKeyConstraint(['plan_id'], ['bonus_plans.id'], ),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.ForeignKeyConstraint(['upload_id'], ['platform_uploads.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_plan_runs_id'), 'plan_runs', ['id'], unique=False)
    op.create_index(op.f('ix_plan_runs_plan_id'), 'plan_runs', ['plan_id'], unique=False)
    op.create_index(op.f('ix_plan_runs_tenant_id'), 'plan_runs', ['tenant_id'], unique=False)

    # Create audit_events table
    op.create_table('audit_events',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tenant_id', sa.String(), nullable=False),
    sa.Column('actor_user_id', sa.String(), nullable=True),
    sa.Column('action', sa.String(), nullable=False),
    sa.Column('entity', sa.String(), nullable=False),
    sa.Column('entity_id', sa.String(), nullable=False),
    sa.Column('before', JSON(), nullable=True),
    sa.Column('after', JSON(), nullable=True),
    sa.Column('at', sa.DateTime(), nullable=False),
    sa.Column('signature', sa.String(), nullable=True),
    sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_events_tenant_id'), 'audit_events', ['tenant_id'], unique=False)

    # Create run_step_results table
    op.create_table('run_step_results',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('run_id', sa.String(), nullable=False),
    sa.Column('employee_ref', sa.String(), nullable=False),
    sa.Column('step_name', sa.String(), nullable=False),
    sa.Column('value', JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['run_id'], ['plan_runs.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_run_step_results_id'), 'run_step_results', ['id'], unique=False)
    op.create_index(op.f('ix_run_step_results_run_id'), 'run_step_results', ['run_id'], unique=False)

    # Create run_totals table
    op.create_table('run_totals',
    sa.Column('run_id', sa.String(), nullable=False),
    sa.Column('totals', JSON(), nullable=False),
    sa.ForeignKeyConstraint(['run_id'], ['plan_runs.id'], ),
    sa.PrimaryKeyConstraint('run_id')
    )


def downgrade() -> None:
    # Drop tables in reverse order to handle foreign key constraints
    op.drop_table('run_totals')
    op.drop_table('run_step_results')
    op.drop_table('audit_events')
    op.drop_table('plan_runs')
    op.drop_table('employee_rows')
    op.drop_table('bonus_pools')
    op.drop_table('plan_steps')
    op.drop_table('plan_inputs')
    op.drop_table('platform_uploads')
    op.drop_table('bonus_plans')
    op.drop_table('input_catalog')
    op.drop_table('users')
    op.drop_table('tenants')