"""Add company_name to user

Revision ID: a3b4c5d6e7f8
Revises: f23b45678c9d
Create Date: 2026-05-17 02:18:00.123456

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a3b4c5d6e7f8'
down_revision = 'f23b45678c9d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user', sa.Column('company_name', sa.String(), nullable=True))
    op.create_index(op.f('ix_user_company_name'), 'user', ['company_name'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_company_name'), table_name='user')
    op.drop_column('user', 'company_name')
