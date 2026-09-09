"""add alert_email and config columns to iot_sensor

Revision ID: d4e5f6a7b8c9
Revises: 9b1c3d4e5f6a
Create Date: 2026-09-08 20:03:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd4e5f6a7b8c9'
down_revision = '9b1c3d4e5f6a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # safe addition with check/fallback
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('iot_sensor')]

    if 'send_interval_seconds' not in columns:
        op.add_column('iot_sensor', sa.Column('send_interval_seconds', sa.Integer(), nullable=False, server_default='300'))
    if 'baud_rate' not in columns:
        op.add_column('iot_sensor', sa.Column('baud_rate', sa.Integer(), nullable=True, server_default='9600'))
    if 'ota_version' not in columns:
        op.add_column('iot_sensor', sa.Column('ota_version', sa.String(255), nullable=True))
    if 'ota_file_path' not in columns:
        op.add_column('iot_sensor', sa.Column('ota_file_path', sa.String(512), nullable=True))
    if 'temperature_unit' not in columns:
        op.add_column('iot_sensor', sa.Column('temperature_unit', sa.String(10), nullable=True, server_default='C'))
    if 'alert_email' not in columns:
        op.add_column('iot_sensor', sa.Column('alert_email', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('iot_sensor', 'alert_email')
