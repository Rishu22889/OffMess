"""add upi intent payment fields

Revision ID: 0005
Revises: 0004
Create Date: 2024-02-06 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite doesn't support ALTER TYPE for enums
    # The enum value will be available through the Python enum definition
    
    # Add transaction_id field to payments table
    op.add_column('payments', sa.Column('transaction_id', sa.String(255), nullable=True))
    op.create_index('ix_payments_transaction_id', 'payments', ['transaction_id'])
    
    # Add upi_response field to payments table
    op.add_column('payments', sa.Column('upi_response', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove new fields from payments table
    op.drop_index('ix_payments_transaction_id', 'payments')
    op.drop_column('payments', 'upi_response')
    op.drop_column('payments', 'transaction_id')
