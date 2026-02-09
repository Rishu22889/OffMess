"""change mess_menu to weekly schedule

Revision ID: 0007
Revises: 0006
Create Date: 2024-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the old table and recreate with new structure
    op.drop_index('ix_mess_menus_hostel_date', table_name='mess_menus')
    op.drop_table('mess_menus')
    
    # Create new table with day_of_week instead of date
    op.create_table('mess_menus',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('hostel_name', sa.String(length=255), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('breakfast', sa.Text(), nullable=True),
        sa.Column('lunch', sa.Text(), nullable=True),
        sa.Column('snacks', sa.Text(), nullable=True),
        sa.Column('dinner', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create unique index on hostel_name and day_of_week
    op.create_index('ix_mess_menus_hostel_day', 'mess_menus', ['hostel_name', 'day_of_week'], unique=True)


def downgrade() -> None:
    # Drop new table
    op.drop_index('ix_mess_menus_hostel_day', table_name='mess_menus')
    op.drop_table('mess_menus')
    
    # Recreate old table structure
    op.create_table('mess_menus',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('hostel_name', sa.String(length=255), nullable=False),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('breakfast', sa.Text(), nullable=True),
        sa.Column('lunch', sa.Text(), nullable=True),
        sa.Column('snacks', sa.Text(), nullable=True),
        sa.Column('dinner', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_mess_menus_hostel_date', 'mess_menus', ['hostel_name', 'date'], unique=True)
