"""add telemetry and ads permissions to user

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-06-30 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c2d3e4f5a6b7'
down_revision = 'b1c2d3e4f5a6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user', sa.Column('has_telemetry', sa.Boolean(), nullable=True, server_default='true'))
    op.add_column('user', sa.Column('has_ads', sa.Boolean(), nullable=True, server_default='true'))


def downgrade() -> None:
    op.drop_column('user', 'has_ads')
    op.drop_column('user', 'has_telemetry')
