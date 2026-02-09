"""add hostels table

Revision ID: 0008
Revises: 0007
Create Date: 2026-02-08

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone


# revision identifiers, used by Alembic.
revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def utcnow():
    return datetime.now(timezone.utc)


def upgrade() -> None:
    # Create hostels table
    op.create_table(
        'hostels',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, default=utcnow),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Insert default hostels
    op.execute("""
        INSERT INTO hostels (name, created_at, updated_at) VALUES
        ('Amber Hostel', datetime('now'), datetime('now')),
        ('Hostel A', datetime('now'), datetime('now')),
        ('Hostel B', datetime('now'), datetime('now')),
        ('Hostel C', datetime('now'), datetime('now')),
        ('Hostel D', datetime('now'), datetime('now')),
        ('Hostel E', datetime('now'), datetime('now')),
        ('Hostel F', datetime('now'), datetime('now')),
        ('Hostel G', datetime('now'), datetime('now')),
        ('Hostel H', datetime('now'), datetime('now')),
        ('Boys Hostel 1', datetime('now'), datetime('now')),
        ('Boys Hostel 2', datetime('now'), datetime('now')),
        ('Girls Hostel 1', datetime('now'), datetime('now')),
        ('Girls Hostel 2', datetime('now'), datetime('now'))
    """)


def downgrade() -> None:
    op.drop_table('hostels')
