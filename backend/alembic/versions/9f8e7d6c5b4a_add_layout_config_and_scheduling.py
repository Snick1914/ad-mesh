"""add_layout_config_and_scheduling

Revision ID: 9f8e7d6c5b4a
Revises: 8e3940d361cd
Create Date: 2026-06-07 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9f8e7d6c5b4a'
down_revision = '8e3940d361cd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Agregar columna layout_config a la tabla device
    op.add_column('device', sa.Column('layout_config', sa.JSON(), nullable=True))
    
    # 2. Crear la tabla device_schedule
    op.create_table(
        'device_schedule',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.Integer(), nullable=False),
        sa.Column('zone', sa.String(), nullable=False),
        sa.Column('playlist_id', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('days_of_week', sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(['device_id'], ['device.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['playlist_id'], ['playlist.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_device_schedule_id'), 'device_schedule', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_device_schedule_id'), table_name='device_schedule')
    op.drop_table('device_schedule')
    op.drop_column('device', 'layout_config')
