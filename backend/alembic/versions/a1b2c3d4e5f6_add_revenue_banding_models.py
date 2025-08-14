"""Add revenue banding models: teams, team_revenue_history, revenue_band_configs

Revision ID: a1b2c3d4e5f6
Revises: 337111738a35
Create Date: 2025-08-08 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '337111738a35'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: create teams, team_revenue_history, revenue_band_configs."""
    # teams
    op.create_table(
        'teams',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('division', sa.String(), nullable=True),
        sa.Column('peer_group', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', name='uq_teams_name'),
    )
    op.create_index(op.f('ix_teams_id'), 'teams', ['id'], unique=False)
    op.create_index(op.f('ix_teams_name'), 'teams', ['name'], unique=False)

    # revenue_band_configs
    op.create_table(
        'revenue_band_configs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('settings', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', name='uq_revenue_band_configs_name'),
    )
    op.create_index(op.f('ix_revenue_band_configs_id'), 'revenue_band_configs', ['id'], unique=False)
    op.create_index(op.f('ix_revenue_band_configs_name'), 'revenue_band_configs', ['name'], unique=False)

    # team_revenue_history
    op.create_table(
        'team_revenue_history',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('team_id', sa.String(), nullable=False),
        sa.Column('fiscal_year', sa.Integer(), nullable=False),
        sa.Column('revenue', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(), nullable=True),
        sa.Column('is_adjusted', sa.Boolean(), nullable=True, server_default=sa.text('0')),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('team_id', 'fiscal_year', name='uq_team_year'),
    )
    op.create_index(op.f('ix_team_revenue_history_id'), 'team_revenue_history', ['id'], unique=False)
    op.create_index('ix_trh_team_year', 'team_revenue_history', ['team_id', 'fiscal_year'], unique=False)
    op.create_index('ix_trh_team_id', 'team_revenue_history', ['team_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema: drop revenue banding tables."""
    op.drop_index('ix_trh_team_id', table_name='team_revenue_history')
    op.drop_index('ix_trh_team_year', table_name='team_revenue_history')
    op.drop_index(op.f('ix_team_revenue_history_id'), table_name='team_revenue_history')
    op.drop_table('team_revenue_history')

    op.drop_index(op.f('ix_revenue_band_configs_name'), table_name='revenue_band_configs')
    op.drop_index(op.f('ix_revenue_band_configs_id'), table_name='revenue_band_configs')
    op.drop_table('revenue_band_configs')

    op.drop_index(op.f('ix_teams_name'), table_name='teams')
    op.drop_index(op.f('ix_teams_id'), table_name='teams')
    op.drop_table('teams')


