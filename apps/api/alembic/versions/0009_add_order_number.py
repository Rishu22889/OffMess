"""add order_number field

Revision ID: 0009
Revises: 0008
Create Date: 2026-02-09

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add order_number column as nullable first
    op.add_column('orders', sa.Column('order_number', sa.String(length=13), nullable=True))
    
    # Backfill existing orders with formatted order numbers
    # Use SQLite's strftime for date formatting
    op.execute("""
        UPDATE orders 
        SET order_number = strftime('%Y%m%d', created_at) || '-' || printf('%04d', id)
        WHERE order_number IS NULL
    """)
    
    # Create unique index (this also enforces non-null in practice)
    op.create_index('ix_orders_order_number', 'orders', ['order_number'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_orders_order_number', table_name='orders')
    op.drop_column('orders', 'order_number')
