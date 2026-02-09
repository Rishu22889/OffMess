import enum
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, DateTime, Boolean, ForeignKey, Enum, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    CANTEEN_ADMIN = "CANTEEN_ADMIN"
    CAMPUS_ADMIN = "CAMPUS_ADMIN"


class OrderStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    DECLINED = "DECLINED"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAID = "PAID"
    PREPARING = "PREPARING"
    READY = "READY"
    COLLECTED = "COLLECTED"
    CANCELLED_TIMEOUT = "CANCELLED_TIMEOUT"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"


class PaymentMethod(str, enum.Enum):
    ONLINE = "ONLINE"  # Online payment (UPI/QR)
    COUNTER = "COUNTER"  # Pay at counter when collecting
    UPI_QR = "UPI_QR"  # Legacy - maps to ONLINE
    UPI_INTENT = "UPI_INTENT"  # Legacy - maps to ONLINE


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    roll_number: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    canteen_id: Mapped[int | None] = mapped_column(ForeignKey("canteens.id"), nullable=True)
    
    # New profile fields
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    hostel_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    canteen: Mapped[Optional["Canteen"]] = relationship(back_populates="admins")
    orders: Mapped[list["Order"]] = relationship(back_populates="student")


class Canteen(Base):
    __tablename__ = "canteens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hours_open: Mapped[str] = mapped_column(String(20), nullable=False)
    hours_close: Mapped[str] = mapped_column(String(20), nullable=False)
    avg_prep_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    upi_id: Mapped[str] = mapped_column(String(255), nullable=False)
    max_active_orders: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    accepting_orders: Mapped[bool] = mapped_column(Boolean, default=True)

    menu_items: Mapped[list["MenuItem"]] = relationship(back_populates="canteen")
    orders: Mapped[list["Order"]] = relationship(back_populates="canteen")
    admins: Mapped[list[User]] = relationship(back_populates="canteen")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    canteen_id: Mapped[int] = mapped_column(ForeignKey("canteens.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)

    canteen: Mapped[Canteen] = relationship(back_populates="menu_items")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_number: Mapped[str | None] = mapped_column(String(13), nullable=True, unique=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    canteen_id: Mapped[int] = mapped_column(ForeignKey("canteens.id"), nullable=False)
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), nullable=False)
    total_amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    payment_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    collected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pickup_code: Mapped[str | None] = mapped_column(String(4), nullable=True)
    decline_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    student: Mapped[User] = relationship(back_populates="orders")
    canteen: Mapped[Canteen] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    payment: Mapped[Optional["Payment"]] = relationship(back_populates="order", uselist=False, cascade="all, delete-orphan")
    events: Mapped[list["OrderStatusEvent"]] = relationship(back_populates="order", cascade="all, delete-orphan")


Index("ix_orders_canteen_status_created", Order.canteen_id, Order.status, Order.created_at)
Index("ix_orders_student_created", Order.student_id, Order.created_at)


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False)
    menu_item_id: Mapped[int] = mapped_column(ForeignKey("menu_items.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)

    order: Mapped[Order] = relationship(back_populates="items")
    menu_item: Mapped[MenuItem] = relationship()

    @property
    def menu_item_name(self) -> str:
        if self.menu_item:
            return self.menu_item.name
        return ""


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False, unique=True)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), nullable=False)
    qr_payload: Mapped[str] = mapped_column(Text, nullable=False)
    transaction_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    upi_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    order: Mapped[Order] = relationship(back_populates="payment")


Index("ix_payments_order", Payment.order_id)


class OrderStatusEvent(Base):
    __tablename__ = "order_status_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False)
    from_status: Mapped[OrderStatus | None] = mapped_column(Enum(OrderStatus), nullable=True)
    to_status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    order: Mapped[Order] = relationship(back_populates="events")


class OrderRating(Base):
    __tablename__ = "order_ratings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Hostel(Base):
    __tablename__ = "hostels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class MessMenu(Base):
    __tablename__ = "mess_menus"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hostel_name: Mapped[str] = mapped_column(String(255), nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    breakfast: Mapped[str | None] = mapped_column(Text, nullable=True)
    lunch: Mapped[str | None] = mapped_column(Text, nullable=True)
    snacks: Mapped[str | None] = mapped_column(Text, nullable=True)
    dinner: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    __table_args__ = (
        Index("ix_mess_menus_hostel_day", "hostel_name", "day_of_week", unique=True),
    )
