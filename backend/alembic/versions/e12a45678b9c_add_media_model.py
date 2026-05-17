"""Add media model

Revision ID: e12a45678b9c
Revises: 0f146c671298
Create Date: 2026-05-17 02:05:00.123456

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e12a45678b9c'
down_revision = '0f146c671298'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'media',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('file_type', sa.String(), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_media_id'), 'media', ['id'], unique=False)
    op.create_index(op.f('ix_media_name'), 'media', ['name'], unique=False)
    op.create_index(op.f('ix_media_file_type'), 'media', ['file_type'], unique=False)
    op.create_index(op.f('ix_media_created_at'), 'media', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_media_created_at'), table_name='media')
    op.drop_index(op.f('ix_media_file_type'), table_name='media')
    op.drop_index(op.f('ix_media_name'), table_name='media')
    op.drop_index(op.f('ix_media_id'), table_name='media')
    op.drop_table('media')
