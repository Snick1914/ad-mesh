"""Add playlist models

Revision ID: f23b45678c9d
Revises: e12a45678b9c
Create Date: 2026-05-17 02:09:00.123456

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f23b45678c9d'
down_revision = 'e12a45678b9c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Crear tabla playlist
    op.create_table(
        'playlist',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_playlist_id'), 'playlist', ['id'], unique=False)
    op.create_index(op.f('ix_playlist_name'), 'playlist', ['name'], unique=False)
    op.create_index(op.f('ix_playlist_is_active'), 'playlist', ['is_active'], unique=False)
    op.create_index(op.f('ix_playlist_created_at'), 'playlist', ['created_at'], unique=False)

    # 2. Crear tabla playlist_item
    op.create_table(
        'playlist_item',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('playlist_id', sa.Integer(), nullable=False),
        sa.Column('media_id', sa.Integer(), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('duration_seconds', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['playlist_id'], ['playlist.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['media_id'], ['media.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_playlist_item_id'), 'playlist_item', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_playlist_item_id'), table_name='playlist_item')
    op.drop_table('playlist_item')
    
    op.drop_index(op.f('ix_playlist_created_at'), table_name='playlist')
    op.drop_index(op.f('ix_playlist_is_active'), table_name='playlist')
    op.drop_index(op.f('ix_playlist_name'), table_name='playlist')
    op.drop_index(op.f('ix_playlist_id'), table_name='playlist')
    op.drop_table('playlist')
