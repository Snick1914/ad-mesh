"""Add device model

Revision ID: 0f146c671298
Revises: 2b3c4d5e6f7a
Create Date: 2026-05-17 02:01:18.424211

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0f146c671298'
down_revision = '2b3c4d5e6f7a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'device',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('serial_number', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('pairing_code', sa.String(), nullable=True),
        sa.Column('is_paired', sa.Boolean(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('last_heartbeat', sa.DateTime(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('storage_used_gb', sa.Float(), nullable=True),
        sa.Column('storage_limit_gb', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('serial_number')
    )
    op.create_index(op.f('ix_device_id'), 'device', ['id'], unique=False)
    op.create_index(op.f('ix_device_name'), 'device', ['name'], unique=False)
    op.create_index(op.f('ix_device_serial_number'), 'device', ['serial_number'], unique=False)
    op.create_index(op.f('ix_device_status'), 'device', ['status'], unique=False)
    op.create_index(op.f('ix_device_pairing_code'), 'device', ['pairing_code'], unique=True)
    op.create_index(op.f('ix_device_is_paired'), 'device', ['is_paired'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_device_is_paired'), table_name='device')
    op.drop_index(op.f('ix_device_pairing_code'), table_name='device')
    op.drop_index(op.f('ix_device_status'), table_name='device')
    op.drop_index(op.f('ix_device_serial_number'), table_name='device')
    op.drop_index(op.f('ix_device_name'), table_name='device')
    op.drop_index(op.f('ix_device_id'), table_name='device')
    op.drop_table('device')
