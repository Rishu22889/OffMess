"""add user profile fields

Revision ID: 0003
Revises: 0002
Create Date: 2024-02-05 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new profile fields to users table
    op.add_column('users', sa.Column('name', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('phone_number', sa.String(20), nullable=True))


def downgrade() -> None:
    # Remove profile fields
    op.drop_column('users', 'phone_number')
    op.drop_column('users', 'name')