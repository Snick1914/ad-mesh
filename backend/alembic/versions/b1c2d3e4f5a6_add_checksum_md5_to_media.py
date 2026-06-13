"""add_checksum_md5_to_media

Revision ID: b1c2d3e4f5a6
Revises: 9f8e7d6c5b4a
Create Date: 2026-06-13 18:31:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b1c2d3e4f5a6'
down_revision = '9f8e7d6c5b4a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('media', sa.Column('checksum_md5', sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column('media', 'checksum_md5')
