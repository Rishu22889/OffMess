"""initial

Revision ID: 0001_initial
Revises: 
Create Date: 2026-02-04 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "canteens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False, unique=True),
        sa.Column("hours_open", sa.String(length=20), nullable=False),
        sa.Column("hours_close", sa.String(length=20), nullable=False),
        sa.Column("avg_prep_minutes", sa.Integer(), nullable=False),
        sa.Column("upi_id", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("role", sa.Enum("STUDENT", "CANTEEN_ADMIN", "CAMPUS_ADMIN", name="userrole"), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True, unique=True),
        sa.Column("roll_number", sa.String(length=50), nullable=True, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("canteen_id", sa.Integer(), sa.ForeignKey("canteens.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "menu_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("canteen_id", sa.Integer(), sa.ForeignKey("canteens.id"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.text("1")),
    )

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("canteen_id", sa.Integer(), sa.ForeignKey("canteens.id"), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "REQUESTED",
                "DECLINED",
                "PAYMENT_PENDING",
                "PAID",
                "PREPARING",
                "READY",
                "COLLECTED",
                "CANCELLED_TIMEOUT",
                name="orderstatus",
            ),
            nullable=False,
        ),
        sa.Column("total_amount_cents", sa.Integer(), nullable=False),
        sa.Column("payment_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("collected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pickup_code", sa.String(length=4), nullable=True),
        sa.Column("decline_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("menu_item_id", sa.Integer(), sa.ForeignKey("menu_items.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price_cents", sa.Integer(), nullable=False),
    )

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False, unique=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("method", sa.Enum("UPI_QR", name="paymentmethod"), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "SUCCESS", "FAILED", "EXPIRED", name="paymentstatus"),
            nullable=False,
        ),
        sa.Column("qr_payload", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "order_status_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column(
            "from_status",
            sa.Enum(
                "REQUESTED",
                "DECLINED",
                "PAYMENT_PENDING",
                "PAID",
                "PREPARING",
                "READY",
                "COLLECTED",
                "CANCELLED_TIMEOUT",
                name="orderstatus",
            ),
            nullable=True,
        ),
        sa.Column(
            "to_status",
            sa.Enum(
                "REQUESTED",
                "DECLINED",
                "PAYMENT_PENDING",
                "PAID",
                "PREPARING",
                "READY",
                "COLLECTED",
                "CANCELLED_TIMEOUT",
                name="orderstatus",
            ),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
    )

    op.create_table(
        "order_ratings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_index("ix_orders_canteen_status_created", "orders", ["canteen_id", "status", "created_at"])
    op.create_index("ix_orders_student_created", "orders", ["student_id", "created_at"])
    op.create_index("ix_payments_order", "payments", ["order_id"])
    op.create_index("ix_menu_items_canteen", "menu_items", ["canteen_id"])


def downgrade() -> None:
    op.drop_index("ix_menu_items_canteen", table_name="menu_items")
    op.drop_index("ix_payments_order", table_name="payments")
    op.drop_index("ix_orders_student_created", table_name="orders")
    op.drop_index("ix_orders_canteen_status_created", table_name="orders")
    op.drop_table("order_ratings")
    op.drop_table("order_status_events")
    op.drop_table("payments")
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("menu_items")
    op.drop_table("users")
    op.drop_table("canteens")
    op.execute("DROP TYPE IF EXISTS paymentmethod")
    op.execute("DROP TYPE IF EXISTS paymentstatus")
    op.execute("DROP TYPE IF EXISTS orderstatus")
    op.execute("DROP TYPE IF EXISTS userrole")
