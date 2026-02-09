"""add hostel_name and mess_menu

Revision ID: 0006
Revises: 0005
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check and add hostel_name to users table if it doesn't exist
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Check if hostel_name column exists
    user_columns = [col['name'] for col in inspector.get_columns('users')]
    if 'hostel_name' not in user_columns:
        op.add_column('users', sa.Column('hostel_name', sa.String(length=255), nullable=True))
    
    # Create mess_menus table if it doesn't exist
    if 'mess_menus' not in inspector.get_table_names():
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
        
        # Create unique index on hostel_name and date
        op.create_index('ix_mess_menus_hostel_date', 'mess_menus', ['hostel_name', 'date'], unique=True)


def downgrade() -> None:
    # Drop mess_menus table and index
    op.drop_index('ix_mess_menus_hostel_date', table_name='mess_menus')
    op.drop_table('mess_menus')
    
    # Remove hostel_name from users table
    op.drop_column('users', 'hostel_name')
