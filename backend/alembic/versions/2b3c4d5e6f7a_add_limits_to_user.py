"""Add limits to user

Revision ID: 2b3c4d5e6f7a
Revises: 1a2b3c4d5e6f
Create Date: 2024-05-16 19:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2b3c4d5e6f7a'
down_revision = '1a2b3c4d5e6f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user', sa.Column('max_devices', sa.Integer(), nullable=True, server_default='5'))
    op.add_column('user', sa.Column('max_storage_gb', sa.Integer(), nullable=True, server_default='10'))


def downgrade() -> None:
    op.drop_column('user', 'max_storage_gb')
    op.drop_column('user', 'max_devices')
