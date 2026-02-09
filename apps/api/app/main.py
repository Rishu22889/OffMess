import asyncio
from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, Response, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload
from anyio import from_thread
from pydantic import BaseModel

from .config import settings
from .database import Base, engine, SessionLocal
from .oauth import oauth
from .models import (
    User,
    Canteen,
    MenuItem,
    Order,
    OrderItem,
    OrderStatus,
    UserRole,
    Payment,
    PaymentStatus,
    PaymentMethod,
    MessMenu,
    Hostel,
)
from .schemas import (
    AuthResponse,
    UserOut,
    UserUpdate,
    PasswordChangeRequest,
    CanteenAdminEmailUpdate,
    CanteenOut,
    CanteenUpdate,
    CanteenCreate,
    MenuItemOut,
    MenuItemCreate,
    MenuItemUpdate,
    OrderCreate,
    OrderOut,
    OrderActionResponse,
    DeclineRequest,
    StatusUpdateRequest,
    PaymentMethodRequest,
    PaymentCallbackRequest,
    StatsOut,
    MessMenuCreate,
    MessMenuUpdate,
    MessMenuResponse,
    MessMenuListResponse,
    HostelCreate,
    HostelUpdate,
    HostelResponse,
    HostelListResponse,
)
from .auth import verify_password, create_access_token, hash_password
from .deps import get_db, get_current_user, require_role, get_current_user_ws
from .crud import (
    create_order,
    accept_order,
    decline_order,
    pay_order,
    update_order_status,
    expire_stale_orders,
    build_payment_payload,
)
from .websockets import ConnectionManager

app = FastAPI(title="Campus Canteen Pre-Order API")

# Add session middleware for OAuth
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.jwt_secret,  # Use same secret as JWT
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000", 
        "http://localhost:3001", 
        "http://127.0.0.1:3001",
        "https://offmess.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = ConnectionManager()


def serialize_order(order: Order, db: Session = None) -> OrderOut:
    order_dict = OrderOut.model_validate(order).model_dump()
    
    # Add student information for admin view
    if order.student:
        order_dict["student_name"] = order.student.name
        order_dict["student_roll_number"] = order.student.roll_number
        order_dict["student_phone_number"] = order.student.phone_number
    
    # Add queue information if database session is available
    if db and order.status in [OrderStatus.PAID, OrderStatus.PREPARING]:
        from .crud import get_order_queue_position
        queue_info = get_order_queue_position(db, order)
        order_dict["queue_position"] = queue_info["position"]
        order_dict["estimated_minutes"] = queue_info["estimated_minutes"]
    
    return OrderOut(**order_dict)


def broadcast_order(event_type: str, order: Order) -> None:
    payload = {
        "order_id": order.id,
        "status": order.status.value,
        "canteen_id": order.canteen_id,
        "student_id": order.student_id,
        "updated_at": order.updated_at.isoformat(),
        "event_type": event_type,
    }
    from_thread.run(manager.broadcast, event_type, payload)


async def expiry_loop() -> None:
    while True:
        await asyncio.sleep(30)
        await asyncio.to_thread(expire_and_notify)


def expire_and_notify() -> None:
    db = SessionLocal()
    try:
        expired = expire_stale_orders(db)
        for order in expired:
            broadcast_order("order.payment_expired", order)
    finally:
        db.close()


@app.on_event("startup")
async def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    # Seed database with test data
    from .seed import seed_data
    db = SessionLocal()
    try:
        seed_data(db)
    finally:
        db.close()
    asyncio.create_task(expiry_loop())


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


class LoginRequest(BaseModel):
    email: Optional[str] = None
    roll_number: Optional[str] = None
    password: str


@app.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    if not payload.email and not payload.roll_number:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email or roll number required")
    user = None
    if payload.email:
        user = db.scalar(select(User).where(User.email == payload.email))
    if not user and payload.roll_number:
        user = db.scalar(select(User).where(User.roll_number == payload.roll_number))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user.id, user.role.value)
    response.set_cookie(
        settings.cookie_name,
        token,
        httponly=True,
        samesite="lax",
        path="/",
    )
    return {"user": UserOut.model_validate(user), "access_token": token}


@app.get("/auth/google/login")
async def google_login(request: Request):
    """Initiate Google OAuth flow"""
    redirect_uri = settings.google_redirect_uri
    return await oauth.google.authorize_redirect(request, redirect_uri)


@app.get("/auth/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            # Redirect to login with error
            return RedirectResponse(url=f"{settings.frontend_url}/login?error=no_user_info")
        
        email = user_info.get('email')
        if not email:
            return RedirectResponse(url=f"{settings.frontend_url}/login?error=no_email")
        
        # Check if email is from allowed domain
        if not email.endswith(f"@{settings.allowed_domain}"):
            return RedirectResponse(url=f"{settings.frontend_url}/login?error=invalid_domain")
        
        # Extract roll number from email (e.g., 21je0001@iitism.ac.in -> 21JE0001)
        roll_number = email.split('@')[0].upper()
        
        # Find or create user
        user = db.scalar(select(User).where(User.email == email))
        if not user:
            user = User(
                role=UserRole.STUDENT,
                email=email,
                roll_number=roll_number,
                password_hash=hash_password("oauth_user_no_password"),  # Dummy password for OAuth users
                name=user_info.get('name', roll_number),
                phone_number="",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Create session token
        access_token = create_access_token(user.id, user.role.value)
        
        # Redirect to frontend with token in URL
        # Frontend will extract token and make authenticated request
        redirect_url = f"{settings.frontend_url}/auth/callback?token={access_token}"
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        print(f"OAuth error: {e}")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=auth_failed")


@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(settings.cookie_name)
    return {"status": "ok"}


class TokenExchangeRequest(BaseModel):
    token: str


@app.post("/auth/exchange-token", response_model=AuthResponse)
def exchange_token(payload: TokenExchangeRequest, response: Response, db: Session = Depends(get_db)):
    """Exchange OAuth token for cookie-based session"""
    from .auth import decode_token
    
    try:
        # Decode and validate token
        token_data = decode_token(payload.token)
        user_id = token_data.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Fetch user
        user = db.get(User, int(user_id))
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Set cookie
        response.set_cookie(
            settings.cookie_name,
            payload.token,
            httponly=True,
            samesite="none" if settings.frontend_url.startswith("https") else "lax",
            secure=settings.frontend_url.startswith("https"),
            path="/",
            max_age=settings.access_token_expire_minutes * 60,
        )
        
        return {"user": UserOut.model_validate(user), "access_token": payload.token}
    except Exception as e:
        print(f"Token exchange error: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")


class CampusAdminRegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    phone_number: str
    setup_key: str  # Secret key to prevent unauthorized registration


@app.post("/auth/register-campus-admin", response_model=AuthResponse)
def register_campus_admin(payload: CampusAdminRegisterRequest, response: Response, db: Session = Depends(get_db)):
    """
    One-time setup endpoint to create a campus admin account.
    Requires a setup key for security.
    """
    # Check setup key (you can set this in environment variables)
    expected_key = settings.jwt_secret[:16]  # Use first 16 chars of JWT secret as setup key
    if payload.setup_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid setup key")
    
    # Check if campus admin already exists
    existing_admin = db.scalar(select(User).where(User.role == UserRole.CAMPUS_ADMIN))
    if existing_admin:
        raise HTTPException(status_code=400, detail="Campus admin already exists. Contact support to reset.")
    
    # Check if email is already taken
    existing_user = db.scalar(select(User).where(User.email == payload.email))
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create campus admin
    admin = User(
        role=UserRole.CAMPUS_ADMIN,
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        phone_number=payload.phone_number,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    # Create session token
    token = create_access_token(admin.id, admin.role.value)
    response.set_cookie(
        settings.cookie_name,
        token,
        httponly=True,
        samesite="none" if settings.frontend_url.startswith("https") else "lax",
        secure=settings.frontend_url.startswith("https"),
        path="/",
    )
    
    return {"user": UserOut.model_validate(admin), "access_token": token}


@app.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@app.put("/profile", response_model=UserOut)
def update_profile(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if payload.name is not None:
        user.name = payload.name.strip()
    if payload.phone_number is not None:
        user.phone_number = payload.phone_number.strip()
    if payload.hostel_name is not None:
        user.hostel_name = payload.hostel_name.strip()
    
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@app.post("/profile/change-password")
def change_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Allow any user to change their password"""
    # Verify current password
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update to new password
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    
    return {"status": "ok", "message": "Password changed successfully"}


@app.get("/canteens", response_model=list[CanteenOut])
def list_canteens(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    canteens = db.scalars(select(Canteen).where(Canteen.is_active == True)).all()
    return [CanteenOut.model_validate(c) for c in canteens]


@app.get("/canteens/{canteen_id}/status")
def get_canteen_status(
    canteen_id: int, 
    db: Session = Depends(get_db), 
    user: User = Depends(get_current_user)
):
    canteen = db.get(Canteen, canteen_id)
    if not canteen:
        raise HTTPException(status_code=404, detail="Canteen not found")
    
    from .crud import ist_now
    
    # Get current IST time
    current_time = ist_now()
    current_time_str = current_time.strftime("%H:%M")
    
    # Check if canteen is accepting orders (based on accepting_orders flag)
    is_open = canteen.accepting_orders and canteen.is_active
    
    # Get active orders count
    from .crud import count_active_orders
    active_orders = count_active_orders(db, canteen_id)
    
    # Get canteen admin contact info
    admin = db.scalar(
        select(User).where(
            User.canteen_id == canteen_id,
            User.role == UserRole.CANTEEN_ADMIN
        )
    )
    
    return {
        "is_open": is_open,
        "accepting_orders": canteen.accepting_orders,
        "current_time": current_time_str,
        "hours_open": canteen.hours_open,
        "hours_close": canteen.hours_close,
        "active_orders": active_orders,
        "max_orders": canteen.max_active_orders,
        "can_accept_orders": is_open and active_orders < canteen.max_active_orders,
        "admin_name": admin.name if admin else None,
        "admin_phone": admin.phone_number if admin else None,
        "admin_email": admin.email if admin else None,
    }


@app.get("/canteens/{canteen_id}/menu", response_model=list[MenuItemOut])
def canteen_menu(canteen_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Return ALL menu items (including unavailable ones) so students can see what's out of stock
    items = db.scalars(
        select(MenuItem).where(MenuItem.canteen_id == canteen_id)
    ).all()
    return [MenuItemOut.model_validate(i) for i in items]


# Mess Menu Endpoints
@app.get("/mess-menu/today", response_model=MessMenuResponse)
def get_today_mess_menu(
    hostel_name: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get today's mess menu for a specific hostel"""
    # Get current day of week in IST (UTC+5:30)
    # This ensures the menu matches the local day for Indian users
    from datetime import timedelta
    ist_offset = timedelta(hours=5, minutes=30)
    today = datetime.now(timezone.utc) + ist_offset
    day_of_week = today.weekday()
    
    menu = db.scalar(
        select(MessMenu).where(
            MessMenu.hostel_name == hostel_name,
            MessMenu.day_of_week == day_of_week
        )
    )
    
    if not menu:
        raise HTTPException(
            status_code=404,
            detail="No menu found for the specified hostel and day"
        )
    
    return MessMenuResponse.model_validate(menu)


@app.get("/mess-menu", response_model=MessMenuResponse)
def get_mess_menu(
    hostel_name: str,
    day_of_week: int,  # 0=Monday, 6=Sunday
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get mess menu for a specific hostel and day of week"""
    if day_of_week < 0 or day_of_week > 6:
        raise HTTPException(
            status_code=400,
            detail="Invalid day_of_week. Must be 0-6 (0=Monday, 6=Sunday)"
        )
    
    menu = db.scalar(
        select(MessMenu).where(
            MessMenu.hostel_name == hostel_name,
            MessMenu.day_of_week == day_of_week
        )
    )
    
    if not menu:
        raise HTTPException(
            status_code=404,
            detail="No menu found for the specified hostel and day"
        )
    
    return MessMenuResponse.model_validate(menu)


@app.post("/orders", response_model=OrderActionResponse)
def create_order_endpoint(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.STUDENT)),
):
    order = create_order(
        db, 
        user, 
        payload.canteen_id, 
        [item.model_dump() for item in payload.items],
        payload.payment_method  # Pass payment method to create_order
    )
    order = db.scalar(
        select(Order)
        .where(Order.id == order.id)
        .options(
            joinedload(Order.items).joinedload(OrderItem.menu_item),
            joinedload(Order.payment),
            joinedload(Order.events),
        )
    )
    broadcast_order("order.created", order)
    return {"order": serialize_order(order, db)}


@app.get("/orders", response_model=list[OrderOut])
def list_orders(
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.STUDENT)),
):
    expired = expire_stale_orders(db)
    for order in expired:
        broadcast_order("order.payment_expired", order)
    orders = db.scalars(
        select(Order)
        .where(Order.student_id == user.id)
        .options(
            joinedload(Order.items).joinedload(OrderItem.menu_item),
            joinedload(Order.payment),
            joinedload(Order.events),
            joinedload(Order.student),
        )
        .order_by(Order.created_at.desc())
    ).unique().all()
    return [serialize_order(o, db) for o in orders]


@app.get("/orders/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = db.scalar(
        select(Order)
        .where(Order.id == order_id)
        .options(
            joinedload(Order.items).joinedload(OrderItem.menu_item),
            joinedload(Order.payment),
            joinedload(Order.events),
            joinedload(Order.student),
        )
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if user.role == UserRole.STUDENT and order.student_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if user.role == UserRole.CANTEEN_ADMIN and order.canteen_id != user.canteen_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    expired = expire_stale_orders(db)
    for exp in expired:
        broadcast_order("order.payment_expired", exp)
    db.refresh(order)
    return serialize_order(order, db)


@app.post("/orders/{order_id}/pay", response_model=OrderActionResponse)
def pay_order_endpoint(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.STUDENT)),
):
    order = db.scalar(
        select(Order)
        .where(Order.id == order_id)
        .options(
            joinedload(Order.items).joinedload(OrderItem.menu_item),
            joinedload(Order.payment),
            joinedload(Order.events),
            joinedload(Order.canteen),
        )
    )
    if not order or order.student_id != user.id:
        raise HTTPException(status_code=404, detail="Order not found")
    updated = pay_order(db, order, user)
    broadcast_order("order.updated", updated)
    return {"order": serialize_order(updated, db)}


@app.post("/orders/{order_id}/payment-callback", response_model=OrderActionResponse)
def payment_callback_endpoint(
    order_id: int,
    callback: "PaymentCallbackRequest",
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.STUDENT)),
):
    """
    Handle payment callback from Android app after UPI payment attempt.
    This endpoint is idempotent - multiple calls with same transaction_id are safe.
    """
    # Fetch order with related data
    order = db.scalar(
        select(Order)
        .where(Order.id == order_id)
        .options(
            joinedload(Order.items).joinedload(OrderItem.menu_item),
            joinedload(Order.payment),
            joinedload(Order.events),
            joinedload(Order.canteen),
        )
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Verify order belongs to current user
    if order.student_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this order")
    
    # Fetch payment record
    payment = order.payment
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Idempotency check: if payment already processed with this transaction_id, return current state
    if payment.transaction_id == callback.transaction_id and payment.status != PaymentStatus.PENDING:
        return {"order": serialize_order(order, db)}
    
    # Update payment record
    payment.transaction_id = callback.transaction_id
    payment.upi_response = callback.upi_response
    
    # Update payment and order status based on callback status
    callback_status_upper = callback.status.upper()
    
    # Determine target order status based on payment result
    if callback_status_upper == "SUCCESS":
        target_order_status = OrderStatus.PREPARING  # Go directly to PREPARING after payment
        payment.status = PaymentStatus.SUCCESS
        payment.paid_at = datetime.now(timezone.utc)
    elif callback_status_upper == "FAILURE":
        target_order_status = OrderStatus.PAYMENT_PENDING  # Keep as payment pending to allow retry
        payment.status = PaymentStatus.FAILED
    elif callback_status_upper in ["PENDING", "SUBMITTED"]:
        target_order_status = OrderStatus.PAYMENT_PENDING
        payment.status = PaymentStatus.PENDING
    else:
        # Unknown status, treat as pending
        target_order_status = OrderStatus.PAYMENT_PENDING
        payment.status = PaymentStatus.PENDING
    
    # Validate state transition before updating order status
    from .crud import validate_state_transition
    if order.status != target_order_status:
        if not validate_state_transition(order.status, target_order_status):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid order status transition from {order.status} to {target_order_status}"
            )
        order.status = target_order_status
        if target_order_status == OrderStatus.PREPARING:
            order.paid_at = datetime.now(timezone.utc)
    
    # Commit transaction
    try:
        db.commit()
        db.refresh(order)
        
        # Broadcast order update
        broadcast_order("order.updated", order)
        
        return {"order": serialize_order(order, db)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update payment status")


@app.get("/admin/orders", response_model=list[OrderOut])
def admin_orders(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CANTEEN_ADMIN)),
):
    if not user.canteen_id:
        raise HTTPException(status_code=400, detail="Canteen admin missing canteen_id")
    
    expired = expire_stale_orders(db)
    for order in expired:
        if order.canteen_id == user.canteen_id:
            broadcast_order("order.payment_expired", order)
    
    query = select(Order).where(Order.canteen_id == user.canteen_id)
    
    if status:
        status_upper = status.upper()
        if status_upper == "ACTIVE":
            query = query.where(
                Order.status.in_(
                    [
                        OrderStatus.PAYMENT_PENDING,
                        OrderStatus.PAID,  # Include PAID for backward compatibility with existing orders
                        OrderStatus.PREPARING,
                        OrderStatus.READY,
                    ]
                )
            ).order_by(Order.created_at.desc())
        else:
            try:
                status_enum = OrderStatus(status_upper)
                query = query.where(Order.status == status_enum).order_by(Order.created_at.desc())
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Invalid status filter") from exc
    else:
        query = query.order_by(Order.created_at.desc())
        
    orders = db.scalars(
        query.options(
            joinedload(Order.items).joinedload(OrderItem.menu_item),
            joinedload(Order.payment),
            joinedload(Order.events),
            joinedload(Order.student),  # Include student information
        )
    ).unique().all()
    return [serialize_order(o, db) for o in orders]


@app.get("/admin/stats/active-orders")
def get_active_orders_count(
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CANTEEN_ADMIN)),
):
    if not user.canteen_id:
        raise HTTPException(status_code=400, detail="Canteen admin missing canteen_id")
    from .crud import count_active_orders
    count = count_active_orders(db, user.canteen_id)
    canteen = db.get(Canteen, user.canteen_id)
    max_orders = canteen.max_active_orders if canteen else 20
    return {"active_orders": count, "max_orders": max_orders}


@app.get("/admin/profile", response_model=CanteenOut)
def get_canteen_profile(
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CANTEEN_ADMIN)),
):
    if not user.canteen_id:
        raise HTTPException(status_code=400, detail="Canteen admin missing canteen_id")
    canteen = db.get(Canteen, user.canteen_id)
    if not canteen:
        raise HTTPException(status_code=404, detail="Canteen not found")
    return CanteenOut.model_validate(canteen)


@app.put("/admin/profile", response_model=CanteenOut)
def update_canteen_profile(
    payload: CanteenUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CANTEEN_ADMIN)),
):
    if not user.canteen_id:
        raise HTTPException(status_code=400, detail="Canteen admin missing canteen_id")
    canteen = db.get(Canteen, user.canteen_id)
    if not canteen:
        raise HTTPException(status_code=404, detail="Canteen not found")
    
    if payload.name is not None:
        canteen.name = payload.name.strip()
    if payload.hours_open is not None:
        canteen.hours_open = payload.hours_open.strip()
    if payload.hours_close is not None:
        canteen.hours_close = payload.hours_close.strip()
    if payload.avg_prep_minutes is not None:
        canteen.avg_prep_minutes = payload.avg_prep_minutes
    if payload.upi_id is not None:
        canteen.upi_id = payload.upi_id.strip()
    if payload.max_active_orders is not None:
        canteen.max_active_orders = payload.max_active_orders
    
    db.commit()
    db.refresh(canteen)
    return CanteenOut.model_validate(canteen)


@app.patch("/admin/profile/toggle-orders", response_model=CanteenOut)
def toggle_accepting_orders(
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CANTEEN_ADMIN)),
):
    """Toggle accepting_orders status for the canteen"""
    if not user.canteen_id:
        raise HTTPException(status_code=400, detail="Canteen admin missing canteen_id")
    canteen = db.get(Canteen, user.canteen_id)
    if not canteen:
        raise HTTPException(status_code=404, detail="Canteen not found")
    
    canteen.accepting_orders = not canteen.accepting_orders
    db.commit()
    db.refresh(canteen)
    return CanteenOut.model_validate(canteen)


@app.get("/admin/menu", response_model=list[MenuItemOut])
def admin_menu(
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CANTEEN_ADMIN)),
):
    if not user.canteen_id:
        raise HTTPException(status_code=400, detail="Canteen admin missing canteen_id")
    items = db.scalars(select(MenuItem).where(MenuItem.canteen_id == user.canteen_id)).all()
    return [MenuItemOut.model_validate(item) for item in items]


@app.patch("/admin/menu/{item_id}/toggle", response_model=MenuItemOut)
def toggle_menu_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CANTEEN_ADMIN)),
):
    """Canteen Admin can only toggle item availability"""
    if not user.canteen_id:
        raise HTTPException(status_code=400, detail="Canteen admin missing canteen_id")
    item = db.get(MenuItem, item_id)
    if not item or item.canteen_id != user.canteen_id:
        raise HTTPException(status_code=404, detail="Menu item not found")
    item.is_available = not item.is_available
    db.commit()
    db.refresh(item)
    return MenuItemOut.model_validate(item)


@app.post("/admin/orders/{order_id}/accept", response_model=OrderActionResponse)
def accept_order_endpoint(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CANTEEN_ADMIN)),
):
    order = db.scalar(
        select(Order)
        .where(Order.id == order_id)
        .options(
            joinedload(Order.items).joinedload(OrderItem.menu_item),
            joinedload(Order.payment),
            joinedload(Order.events),
            joinedload(Order.canteen),
        )
    )
    if not order or order.canteen_id != user.canteen_id:
        raise HTTPException(status_code=404, detail="Order not found")
    
    updated = accept_order(db, order, user)
    broadcast_order("order.updated", updated)
    return {"order": serialize_order(updated, db)}


@app.post("/admin/orders/{order_id}/payment-status", response_model=OrderActionResponse)
def update_payment_status_endpoint(
    order_id: int,
    status_request: dict,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CANTEEN_ADMIN)),
):
    order = db.scalar(select(Order).where(Order.id == order_id))
    if not order or order.canteen_id != user.canteen_id:
        raise HTTPException(status_code=404, detail="Order not found")
    
    from .models import PaymentStatus
    from .crud import update_payment_status
    
    try:
        new_status = PaymentStatus(status_request["status"])
    except (ValueError, KeyError):
        raise HTTPException(status_code=400, detail="Invalid payment status")
    
    updated = update_payment_status(db, order, new_status, user)
    broadcast_order("order.updated", updated)
    return {"order": serialize_order(updated, db)}


@app.post("/admin/orders/{order_id}/cancel-failed-payment", response_model=OrderActionResponse)
def cancel_failed_payment_endpoint(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CANTEEN_ADMIN)),
):
    order = db.scalar(select(Order).where(Order.id == order_id))
    if not order or order.canteen_id != user.canteen_id:
        raise HTTPException(status_code=404, detail="Order not found")
    
    from .crud import cancel_failed_payment_order
    updated = cancel_failed_payment_order(db, order, user)
    broadcast_order("order.updated", updated)
    return {"order": serialize_order(updated, db)}


@app.post("/admin/orders/{order_id}/fix-payment", response_model=OrderActionResponse)
def fix_payment_endpoint(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CANTEEN_ADMIN)),
):
    """Fix legacy orders that are in PAYMENT_PENDING but don't have payment records"""
    order = db.scalar(
        select(Order)
        .where(Order.id == order_id)
        .options(
            joinedload(Order.items).joinedload(OrderItem.menu_item),
            joinedload(Order.payment),
            joinedload(Order.events),
            joinedload(Order.canteen),
        )
    )
    if not order or order.canteen_id != user.canteen_id:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != OrderStatus.PAYMENT_PENDING:
        raise HTTPException(status_code=400, detail="Order not in PAYMENT_PENDING state")
    
    if order.payment:
        raise HTTPException(status_code=400, detail="Order already has payment record")
    
    # Create payment record for legacy order
    payment_payload = build_payment_payload(
        PaymentMethod.UPI_QR, 
        order.canteen.upi_id, 
        order.total_amount_cents, 
        order.id
    )
    
    payment = Payment(
        order_id=order.id,
        amount_cents=order.total_amount_cents,
        method=PaymentMethod.UPI_QR,
        status=PaymentStatus.PENDING,
        qr_payload=payment_payload,
    )
    order.payment = payment
    db.commit()
    db.refresh(order)
    
    broadcast_order("order.updated", order)
    return {"order": serialize_order(order, db)}


@app.post("/admin/orders/{order_id}/decline", response_model=OrderActionResponse)
def decline_order_endpoint(
    order_id: int,
    payload: DeclineRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CANTEEN_ADMIN)),
):
    order = db.scalar(select(Order).where(Order.id == order_id))
    if not order or order.canteen_id != user.canteen_id:
        raise HTTPException(status_code=404, detail="Order not found")
    updated = decline_order(db, order, user, payload.reason)
    broadcast_order("order.updated", updated)
    return {"order": serialize_order(updated, db)}


@app.post("/admin/orders/{order_id}/status", response_model=OrderActionResponse)
def update_status_endpoint(
    order_id: int,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CANTEEN_ADMIN)),
):
    order = db.scalar(select(Order).where(Order.id == order_id))
    if not order or order.canteen_id != user.canteen_id:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Verify pickup code when marking as COLLECTED
    if payload.status == OrderStatus.COLLECTED:
        if not payload.pickup_code:
            raise HTTPException(status_code=400, detail="Pickup code required for collection")
        if payload.pickup_code != order.pickup_code:
            raise HTTPException(status_code=400, detail="Invalid pickup code")
    
    updated = update_order_status(db, order, user, payload.status)
    broadcast_order("order.updated", updated)
    return {"order": serialize_order(updated, db)}


@app.get("/admin/orders/daily", response_model=list[OrderOut])
def daily_orders(
    date: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CANTEEN_ADMIN)),
):
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    start = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    end = datetime.combine(target_date, datetime.max.time()).replace(tzinfo=timezone.utc)
    orders = db.scalars(
        select(Order)
        .where(
            Order.canteen_id == user.canteen_id,
            Order.created_at >= start,
            Order.created_at <= end,
        )
        .options(
            joinedload(Order.items).joinedload(OrderItem.menu_item),
            joinedload(Order.payment),
            joinedload(Order.events),
            joinedload(Order.student),
        )
        .order_by(Order.created_at.desc())
    ).unique().all()
    return [serialize_order(o, db) for o in orders]


@app.get("/admin/stats", response_model=list[StatsOut])
def admin_stats(
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CAMPUS_ADMIN)),
):
    rows = db.execute(
        select(
            Order.canteen_id,
            Canteen.name,
            Order.status,
            func.count(Order.id).label("count"),
        )
        .join(Canteen, Canteen.id == Order.canteen_id)
        .group_by(Order.canteen_id, Canteen.name, Order.status)
    ).all()
    return [
        StatsOut(canteen_id=row[0], canteen_name=row[1], status=row[2], count=row[3])
        for row in rows
    ]


# Campus Admin endpoints for managing canteens
@app.post("/campus/canteens", response_model=CanteenOut)
def create_canteen(
    payload: CanteenCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CAMPUS_ADMIN)),
):
    """Campus Admin can create new canteens"""
    canteen = Canteen(
        name=payload.name.strip(),
        hours_open=payload.hours_open.strip(),
        hours_close=payload.hours_close.strip(),
        avg_prep_minutes=payload.avg_prep_minutes,
        upi_id=payload.upi_id.strip(),
        max_active_orders=payload.max_active_orders,
        is_active=payload.is_active,
    )
    db.add(canteen)
    db.commit()
    db.refresh(canteen)
    return CanteenOut.model_validate(canteen)


@app.put("/campus/canteens/{canteen_id}", response_model=CanteenOut)
def update_canteen(
    canteen_id: int,
    payload: CanteenUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CAMPUS_ADMIN)),
):
    """Campus Admin can update any canteen"""
    canteen = db.get(Canteen, canteen_id)
    if not canteen:
        raise HTTPException(status_code=404, detail="Canteen not found")
    
    if payload.name is not None:
        canteen.name = payload.name.strip()
    if payload.hours_open is not None:
        canteen.hours_open = payload.hours_open.strip()
    if payload.hours_close is not None:
        canteen.hours_close = payload.hours_close.strip()
    if payload.avg_prep_minutes is not None:
        canteen.avg_prep_minutes = payload.avg_prep_minutes
    if payload.upi_id is not None:
        canteen.upi_id = payload.upi_id.strip()
    if payload.max_active_orders is not None:
        canteen.max_active_orders = payload.max_active_orders
    
    db.commit()
    db.refresh(canteen)
    return CanteenOut.model_validate(canteen)


@app.delete("/campus/canteens/{canteen_id}")
def delete_canteen(
    canteen_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CAMPUS_ADMIN)),
):
    """Campus Admin can delete canteens"""
    canteen = db.get(Canteen, canteen_id)
    if not canteen:
        raise HTTPException(status_code=404, detail="Canteen not found")
    
    # Soft delete by marking as inactive
    canteen.is_active = False
    db.commit()
    return {"status": "ok", "message": f"Canteen {canteen.name} has been deactivated"}


@app.post("/campus/canteens/{canteen_id}/menu", response_model=MenuItemOut)
def create_menu_item_campus(
    canteen_id: int,
    payload: MenuItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CAMPUS_ADMIN)),
):
    """Campus Admin can add menu items to any canteen"""
    canteen = db.get(Canteen, canteen_id)
    if not canteen:
        raise HTTPException(status_code=404, detail="Canteen not found")
    
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    
    item = MenuItem(
        canteen_id=canteen_id,
        name=name,
        price_cents=payload.price_cents,
        is_available=payload.is_available,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return MenuItemOut.model_validate(item)


@app.put("/campus/canteens/{canteen_id}/menu/{item_id}", response_model=MenuItemOut)
def update_menu_item_campus(
    canteen_id: int,
    item_id: int,
    payload: MenuItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CAMPUS_ADMIN)),
):
    """Campus Admin can update menu items in any canteen"""
    item = db.get(MenuItem, item_id)
    if not item or item.canteen_id != canteen_id:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        item.name = name
    if payload.price_cents is not None:
        item.price_cents = payload.price_cents
    if payload.is_available is not None:
        item.is_available = payload.is_available
    
    db.commit()
    db.refresh(item)
    return MenuItemOut.model_validate(item)


@app.delete("/campus/canteens/{canteen_id}/menu/{item_id}")
def delete_menu_item_campus(
    canteen_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CAMPUS_ADMIN)),
):
    """Campus Admin can delete menu items from any canteen"""
    item = db.get(MenuItem, item_id)
    if not item or item.canteen_id != canteen_id:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    db.delete(item)
    db.commit()
    return {"status": "ok", "message": f"Menu item {item.name} has been deleted"}


@app.put("/campus/canteens/{canteen_id}/admin-email")
def update_canteen_admin_email(
    canteen_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CAMPUS_ADMIN)),
):
    """Campus Admin can update the email of a canteen admin"""
    new_email = payload.get("new_email", "").strip()
    if not new_email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Check if email is already in use
    existing_user = db.scalar(select(User).where(User.email == new_email))
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already in use")
    
    # Find the canteen admin for this canteen
    canteen_admin = db.scalar(
        select(User).where(
            User.canteen_id == canteen_id,
            User.role == UserRole.CANTEEN_ADMIN
        )
    )
    
    if not canteen_admin:
        raise HTTPException(status_code=404, detail="Canteen admin not found")
    
    # Update email
    canteen_admin.email = new_email
    db.commit()
    db.refresh(canteen_admin)
    
    return {"status": "ok", "message": "Email updated successfully", "user": UserOut.model_validate(canteen_admin)}


# Campus Admin Mess Menu Management Endpoints
@app.post("/campus/mess-menu", response_model=MessMenuResponse, status_code=201)
def create_mess_menu(
    payload: MessMenuCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CAMPUS_ADMIN)),
):
    """Campus Admin can create mess menus for hostels"""
    # Check if menu already exists for this hostel and day
    existing_menu = db.scalar(
        select(MessMenu).where(
            MessMenu.hostel_name == payload.hostel_name,
            MessMenu.day_of_week == payload.day_of_week
        )
    )
    
    if existing_menu:
        raise HTTPException(
            status_code=409,
            detail="Menu already exists for this hostel and day of week"
        )
    
    # Create new menu
    menu = MessMenu(
        hostel_name=payload.hostel_name,
        day_of_week=payload.day_of_week,
        breakfast=payload.breakfast,
        lunch=payload.lunch,
        snacks=payload.snacks,
        dinner=payload.dinner,
    )
    
    db.add(menu)
    db.commit()
    db.refresh(menu)
    
    return MessMenuResponse.model_validate(menu)


@app.put("/campus/mess-menu/{menu_id}", response_model=MessMenuResponse)
def update_mess_menu(
    menu_id: int,
    payload: MessMenuUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CAMPUS_ADMIN)),
):
    """Campus Admin can update existing mess menus"""
    menu = db.get(MessMenu, menu_id)
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    
    # Update only meal fields (hostel and day_of_week cannot be changed)
    if payload.breakfast is not None:
        menu.breakfast = payload.breakfast
    if payload.lunch is not None:
        menu.lunch = payload.lunch
    if payload.snacks is not None:
        menu.snacks = payload.snacks
    if payload.dinner is not None:
        menu.dinner = payload.dinner
    
    db.commit()
    db.refresh(menu)
    
    return MessMenuResponse.model_validate(menu)


@app.delete("/campus/mess-menu/{menu_id}", status_code=204)
def delete_mess_menu(
    menu_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CAMPUS_ADMIN)),
):
    """Campus Admin can delete mess menus"""
    menu = db.get(MessMenu, menu_id)
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    
    db.delete(menu)
    db.commit()
    
    return Response(status_code=204)


@app.get("/campus/mess-menus", response_model=MessMenuListResponse)
def list_mess_menus(
    hostel_name: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CAMPUS_ADMIN)),
):
    """Campus Admin can list all mess menus with filtering"""
    query = select(MessMenu)
    
    # Apply filters
    if hostel_name:
        query = query.where(MessMenu.hostel_name == hostel_name)
    
    # Get total count
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    
    # Order by hostel and day of week
    query = query.order_by(MessMenu.hostel_name, MessMenu.day_of_week)
    menus = db.scalars(query).all()
    
    return MessMenuListResponse(
        total=total or 0,
        items=[MessMenuResponse.model_validate(m) for m in menus]
    )


# Public Hostel Endpoints (for students to view hostel list)
@app.get("/hostels", response_model=HostelListResponse)
def list_hostels_public(
    db: Session = Depends(get_db),
):
    """Public endpoint to list all hostels (for student profile dropdown)"""
    query = select(Hostel).order_by(Hostel.name)
    hostels = db.scalars(query).all()
    
    return HostelListResponse(
        total=len(hostels),
        items=[HostelResponse.model_validate(h) for h in hostels]
    )


# Campus Admin Hostel Management Endpoints
@app.get("/campus/hostels", response_model=HostelListResponse)
def list_hostels(
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CAMPUS_ADMIN)),
):
    """Campus Admin can list all hostels"""
    query = select(Hostel).order_by(Hostel.name)
    hostels = db.scalars(query).all()
    
    return HostelListResponse(
        total=len(hostels),
        items=[HostelResponse.model_validate(h) for h in hostels]
    )


@app.post("/campus/hostels", response_model=HostelResponse, status_code=201)
def create_hostel(
    payload: HostelCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CAMPUS_ADMIN)),
):
    """Campus Admin can create new hostels"""
    # Check if hostel already exists
    existing_hostel = db.scalar(
        select(Hostel).where(Hostel.name == payload.name)
    )
    
    if existing_hostel:
        raise HTTPException(
            status_code=409,
            detail="Hostel with this name already exists"
        )
    
    # Create new hostel
    hostel = Hostel(name=payload.name)
    
    db.add(hostel)
    db.commit()
    db.refresh(hostel)
    
    return HostelResponse.model_validate(hostel)


@app.put("/campus/hostels/{hostel_id}", response_model=HostelResponse)
def update_hostel(
    hostel_id: int,
    payload: HostelUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CAMPUS_ADMIN)),
):
    """Campus Admin can update hostel names"""
    hostel = db.get(Hostel, hostel_id)
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
    
    # Check if new name already exists
    existing_hostel = db.scalar(
        select(Hostel).where(
            Hostel.name == payload.name,
            Hostel.id != hostel_id
        )
    )
    
    if existing_hostel:
        raise HTTPException(
            status_code=409,
            detail="Hostel with this name already exists"
        )
    
    # Update hostel name
    hostel.name = payload.name
    
    db.commit()
    db.refresh(hostel)
    
    return HostelResponse.model_validate(hostel)


@app.delete("/campus/hostels/{hostel_id}", status_code=204)
def delete_hostel(
    hostel_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.CAMPUS_ADMIN)),
):
    """Campus Admin can delete hostels"""
    hostel = db.get(Hostel, hostel_id)
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
    
    # Check if hostel has associated mess menus
    has_menus = db.scalar(
        select(func.count()).select_from(MessMenu).where(MessMenu.hostel_name == hostel.name)
    )
    
    if has_menus and has_menus > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete hostel with existing mess menus. Delete menus first."
        )
    
    db.delete(hostel)
    db.commit()
    
    return Response(status_code=204)


@app.websocket("/ws/orders")
async def orders_ws(websocket: WebSocket):
    db = SessionLocal()
    try:
        # Try to authenticate user, but don't fail if not authenticated
        try:
            get_current_user_ws(websocket, db)
        except HTTPException:
            # If authentication fails, close the connection gracefully
            await websocket.close(code=1008, reason="Authentication required")
            return
        
        await manager.connect(websocket)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    finally:
        db.close()
