"""add accepting_orders field

Revision ID: 0004
Revises: 0003
Create Date: 2026-02-05

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add accepting_orders column with default True
    op.add_column('canteens', sa.Column('accepting_orders', sa.Boolean(), nullable=False, server_default='1'))


def downgrade() -> None:
    op.drop_column('canteens', 'accepting_orders')
