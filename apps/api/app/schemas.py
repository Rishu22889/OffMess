from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, field_serializer
from .models import UserRole, OrderStatus, PaymentStatus, PaymentMethod


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserOut(ORMBase):
    id: int
    role: UserRole
    email: Optional[str] = None
    roll_number: Optional[str] = None
    canteen_id: Optional[int] = None
    name: Optional[str] = None
    phone_number: Optional[str] = None
    hostel_name: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    phone_number: Optional[str] = Field(default=None, min_length=10, max_length=20)
    hostel_name: Optional[str] = Field(default=None, min_length=1, max_length=255)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6, max_length=100)


class CanteenAdminEmailUpdate(BaseModel):
    canteen_id: int
    new_email: str = Field(min_length=1, max_length=255)


class AuthResponse(ORMBase):
    user: UserOut
    access_token: str


class CanteenOut(ORMBase):
    id: int
    name: str
    hours_open: str
    hours_close: str
    avg_prep_minutes: int
    upi_id: str
    max_active_orders: int
    is_active: bool
    accepting_orders: bool


class MenuItemOut(ORMBase):
    id: int
    canteen_id: int
    name: str
    price_cents: int
    is_available: bool


class MenuItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    price_cents: int = Field(gt=0)
    is_available: bool = True


class MenuItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    price_cents: Optional[int] = Field(default=None, gt=0)
    is_available: Optional[bool] = None


class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int = Field(ge=1)  # At least 1, no upper limit


class OrderCreate(BaseModel):
    canteen_id: int
    items: List[OrderItemCreate]
    payment_method: PaymentMethod = PaymentMethod.ONLINE  # Default to online payment


class OrderItemOut(ORMBase):
    id: int
    menu_item_id: int
    menu_item_name: str
    quantity: int
    unit_price_cents: int


class PaymentOut(ORMBase):
    id: int
    amount_cents: int
    method: PaymentMethod
    status: PaymentStatus
    qr_payload: str
    created_at: datetime
    paid_at: Optional[datetime] = None
    
    @field_serializer('created_at', 'paid_at')
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        # Ensure timezone-aware datetime is properly serialized
        if dt.tzinfo is None:
            # If naive datetime, assume UTC
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class OrderStatusEventOut(ORMBase):
    id: int
    from_status: Optional[OrderStatus] = None
    to_status: OrderStatus
    created_at: datetime
    actor_user_id: Optional[int] = None
    
    @field_serializer('created_at')
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        # Ensure timezone-aware datetime is properly serialized
        if dt.tzinfo is None:
            # If naive datetime, assume UTC
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class OrderOut(ORMBase):
    id: int
    order_number: str
    student_id: int
    canteen_id: int
    status: OrderStatus
    total_amount_cents: int
    payment_expires_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    collected_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    pickup_code: Optional[str] = None
    decline_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemOut]
    payment: Optional[PaymentOut] = None
    events: List[OrderStatusEventOut] = Field(default_factory=list)
    queue_position: Optional[int] = None
    estimated_minutes: Optional[int] = None
    
    # Student information for admin view
    student_name: Optional[str] = None
    student_roll_number: Optional[str] = None
    student_phone_number: Optional[str] = None
    
    @field_serializer('payment_expires_at', 'accepted_at', 'paid_at', 'collected_at', 'cancelled_at', 'created_at', 'updated_at')
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        # Ensure timezone-aware datetime is properly serialized
        if dt.tzinfo is None:
            # If naive datetime, assume UTC
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class PaymentMethodRequest(BaseModel):
    method: PaymentMethod
    upi_id: Optional[str] = None  # For UPI_ID method


class PaymentCallbackRequest(BaseModel):
    transaction_id: str = Field(min_length=1, max_length=255)
    status: str = Field(min_length=1, max_length=50)
    upi_response: str


class OrderActionResponse(ORMBase):
    order: OrderOut


class DeclineRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=200)


class StatusUpdateRequest(BaseModel):
    status: OrderStatus
    pickup_code: Optional[str] = None  # Required when marking as COLLECTED


class CanteenUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    hours_open: Optional[str] = Field(default=None, min_length=1, max_length=20)
    hours_close: Optional[str] = Field(default=None, min_length=1, max_length=20)
    avg_prep_minutes: Optional[int] = Field(default=None, gt=0, le=120)
    upi_id: Optional[str] = Field(default=None, min_length=1, max_length=255)
    max_active_orders: Optional[int] = Field(default=None, gt=0, le=100)
    accepting_orders: Optional[bool] = None


class CanteenCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    hours_open: str = Field(min_length=1, max_length=20)
    hours_close: str = Field(min_length=1, max_length=20)
    avg_prep_minutes: int = Field(gt=0, le=120, default=15)
    upi_id: str = Field(min_length=1, max_length=255)
    max_active_orders: int = Field(gt=0, le=100, default=20)
    is_active: bool = True


class StatsOut(ORMBase):
    canteen_id: int
    canteen_name: str
    status: OrderStatus
    count: int


# Mess Menu Schemas
class MessMenuCreate(BaseModel):
    hostel_name: str = Field(min_length=1, max_length=255)
    day_of_week: int = Field(ge=0, le=6)  # 0=Monday, 6=Sunday
    breakfast: Optional[str] = None
    lunch: Optional[str] = None
    snacks: Optional[str] = None
    dinner: Optional[str] = None


class MessMenuUpdate(BaseModel):
    breakfast: Optional[str] = None
    lunch: Optional[str] = None
    snacks: Optional[str] = None
    dinner: Optional[str] = None


class MessMenuResponse(ORMBase):
    id: int
    hostel_name: str
    day_of_week: int
    breakfast: Optional[str]
    lunch: Optional[str]
    snacks: Optional[str]
    dinner: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        # Ensure timezone-aware datetime is properly serialized
        if dt.tzinfo is None:
            # If naive datetime, assume UTC
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class MessMenuListResponse(BaseModel):
    total: int
    items: List[MessMenuResponse]


# Hostel Schemas
class HostelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class HostelUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class HostelResponse(ORMBase):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime
    
    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        # Ensure timezone-aware datetime is properly serialized
        if dt.tzinfo is None:
            # If naive datetime, assume UTC
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class HostelListResponse(BaseModel):
    total: int
    items: List[HostelResponse]


class LoginRequest(BaseModel):
    email: Optional[str] = None
    roll_number: Optional[str] = None
    password: str
