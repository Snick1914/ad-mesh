"""add iot sensor and alert tables

Revision ID: 9b1c3d4e5f6a
Revises: 354a7018e147
Create Date: 2026-07-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '9b1c3d4e5f6a'
down_revision = '354a7018e147'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'iot_sensor',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sensor_code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('type', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('last_seen', sa.DateTime(), nullable=True),
        sa.Column('metrics', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_iot_sensor_id'), 'iot_sensor', ['id'], unique=False)
    op.create_index(op.f('ix_iot_sensor_sensor_code'), 'iot_sensor', ['sensor_code'], unique=True)
    op.create_index(op.f('ix_iot_sensor_type'), 'iot_sensor', ['type'], unique=False)
    op.create_index(op.f('ix_iot_sensor_status'), 'iot_sensor', ['status'], unique=False)
    op.create_index(op.f('ix_iot_sensor_user_id'), 'iot_sensor', ['user_id'], unique=False)

    op.create_table(
        'alert_rule',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('sensor_id', sa.Integer(), nullable=False),
        sa.Column('metric_name', sa.String(), nullable=False),
        sa.Column('condition', sa.String(), nullable=False),
        sa.Column('threshold', sa.Float(), nullable=False),
        sa.Column('severity', sa.String(), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sensor_id'], ['iot_sensor.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_alert_rule_id'), 'alert_rule', ['id'], unique=False)
    op.create_index(op.f('ix_alert_rule_user_id'), 'alert_rule', ['user_id'], unique=False)
    op.create_index(op.f('ix_alert_rule_sensor_id'), 'alert_rule', ['sensor_id'], unique=False)

    op.create_table(
        'fired_alert',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('rule_id', sa.Integer(), nullable=False),
        sa.Column('sensor_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('metric_name', sa.String(), nullable=False),
        sa.Column('current_value', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(), nullable=True),
        sa.Column('threshold', sa.Float(), nullable=False),
        sa.Column('condition', sa.String(), nullable=False),
        sa.Column('severity', sa.String(), nullable=False),
        sa.Column('fired_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['rule_id'], ['alert_rule.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sensor_id'], ['iot_sensor.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_fired_alert_id'), 'fired_alert', ['id'], unique=False)
    op.create_index(op.f('ix_fired_alert_rule_id'), 'fired_alert', ['rule_id'], unique=False)
    op.create_index(op.f('ix_fired_alert_sensor_id'), 'fired_alert', ['sensor_id'], unique=False)
    op.create_index(op.f('ix_fired_alert_user_id'), 'fired_alert', ['user_id'], unique=False)
    op.create_index(op.f('ix_fired_alert_fired_at'), 'fired_alert', ['fired_at'], unique=False)


def downgrade() -> None:
    op.drop_table('fired_alert')
    op.drop_table('alert_rule')
    op.drop_table('iot_sensor')
