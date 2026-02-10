from datetime import datetime, timedelta, timezone
import pytz
import random
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from .config import settings
from .models import (
    User,
    Canteen,
    MenuItem,
    Order,
    OrderItem,
    Payment,
    OrderStatusEvent,
    OrderStatus,
    PaymentStatus,
    PaymentMethod,
)

ACTIVE_STATUSES = {
    OrderStatus.REQUESTED,
    OrderStatus.PAYMENT_PENDING,
    OrderStatus.PAID,
    OrderStatus.PREPARING,
    OrderStatus.READY,
}


def validate_state_transition(current_status: OrderStatus, new_status: OrderStatus) -> bool:
    """
    Validates if a state transition is allowed based on the order state machine.
    
    Valid transitions:
    - REQUESTED → DECLINED (admin declines)
    - REQUESTED → PAYMENT_PENDING (admin accepts online payment)
    - REQUESTED → PREPARING (admin accepts counter payment)
    - PAYMENT_PENDING → PREPARING (payment succeeds)
    - PAYMENT_PENDING → CANCELLED_TIMEOUT (payment expires)
    - PREPARING → READY (admin marks ready)
    - READY → COLLECTED (student collects)
    
    Invalid transitions (examples):
    - PREPARING → PAYMENT_PENDING (cannot go back)
    - COLLECTED → CANCELLED_TIMEOUT (cannot cancel after collection)
    - READY → PREPARING (cannot go backwards)
    
    Requirements: 10.2, 10.4
    """
    # Define valid transitions as a mapping: current_status → set of allowed next statuses
    valid_transitions = {
        OrderStatus.REQUESTED: {OrderStatus.DECLINED, OrderStatus.PAYMENT_PENDING, OrderStatus.PREPARING},
        OrderStatus.PAYMENT_PENDING: {OrderStatus.PREPARING, OrderStatus.CANCELLED_TIMEOUT},
        OrderStatus.PAID: {OrderStatus.PREPARING, OrderStatus.READY},  # Allow PAID → READY for backward compatibility
        OrderStatus.PREPARING: {OrderStatus.READY},
        OrderStatus.READY: {OrderStatus.COLLECTED},
        # Terminal states (no transitions allowed)
        OrderStatus.DECLINED: set(),
        OrderStatus.COLLECTED: set(),
        OrderStatus.CANCELLED_TIMEOUT: set(),
    }
    
    allowed_next_states = valid_transitions.get(current_status, set())
    return new_status in allowed_next_states


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def ist_now() -> datetime:
    """Get current time in IST"""
    ist = pytz.timezone(settings.timezone)
    return datetime.now(ist)


def build_payment_payload(method: PaymentMethod, upi_id: str, amount_cents: int, order_id: int, user_upi_id: str = None) -> str:
    """Build payment payload based on payment method"""
    if method == PaymentMethod.COUNTER:
        return "COUNTER_PAYMENT"  # No QR code needed for counter payments
    
    # For ONLINE payments, generate UPI payment string
    amount = amount_cents / 100
    return f"upi://pay?pa={upi_id}&am={amount:.2f}&cu=INR&tn=Order%20{order_id}"


def count_active_orders(db: Session, canteen_id: int) -> int:
    return db.scalar(
        select(func.count(Order.id)).where(
            Order.canteen_id == canteen_id,
            Order.status.in_(list(ACTIVE_STATUSES)),
        )
    ) or 0


def get_canteen_max_orders(db: Session, canteen_id: int) -> int:
    canteen = db.get(Canteen, canteen_id)
    return canteen.max_active_orders if canteen else 20


def get_order_queue_position(db: Session, order: Order) -> dict:
    """Get the queue position and estimated time for an order"""
    # Only include orders that are PAID with successful payments (not PAYMENT_PENDING with failed/pending payments)
    if order.status not in [OrderStatus.PAID, OrderStatus.PREPARING]:
        return {"position": 0, "estimated_minutes": 0}
    
    # Only count orders with successful payments
    if order.payment and order.payment.status != PaymentStatus.SUCCESS:
        return {"position": 0, "estimated_minutes": 0}
    
    # Get all orders that are ahead in the queue (paid/preparing orders with successful payments created before this one)
    ahead_orders = db.scalars(
        select(Order).join(Payment).where(
            Order.canteen_id == order.canteen_id,
            Order.status.in_([OrderStatus.PAID, OrderStatus.PREPARING]),
            Order.paid_at < order.paid_at,
            Order.id != order.id,
            Payment.status == PaymentStatus.SUCCESS
        ).order_by(Order.paid_at)
    ).all()
    
    position = len(ahead_orders) + 1
    
    # Calculate estimated time based on canteen's average prep time
    canteen = db.get(Canteen, order.canteen_id)
    avg_prep_minutes = canteen.avg_prep_minutes if canteen else 10
    
    # Estimate: prep time * position (assuming orders are processed sequentially)
    estimated_minutes = avg_prep_minutes * position
    
    return {
        "position": position,
        "estimated_minutes": estimated_minutes,
        "total_in_queue": len(ahead_orders) + 1
    }


def get_admin_order_queue(db: Session, canteen_id: int) -> list[dict]:
    """Get ordered list of orders for admin dashboard"""
    # Get all active orders ordered by paid_at (same as student view)
    orders = db.scalars(
        select(Order).where(
            Order.canteen_id == canteen_id,
            Order.status.in_([OrderStatus.PAYMENT_PENDING, OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY])
        ).order_by(
            # Sort by paid_at ascending - first paid gets priority (same as queue position)
            Order.paid_at.asc()
        )
    ).all()
    
    result = []
    queue_position = 1
    for order in orders:
        # Only assign queue positions to orders with successful payments
        if (order.status in [OrderStatus.PAID, OrderStatus.PREPARING] and 
            order.payment and order.payment.status == PaymentStatus.SUCCESS):
            queue_info = {"position": queue_position, "estimated_minutes": 0}
            queue_position += 1
        else:
            queue_info = {"position": 0, "estimated_minutes": 0}
        
        result.append({
            "order": order,
            "queue_info": queue_info
        })
    
    return result


def create_order(db: Session, student: User, canteen_id: int, items: list[dict], payment_method: PaymentMethod = PaymentMethod.ONLINE) -> Order:
    if len(items) == 0:
        raise HTTPException(status_code=400, detail="Order must include items")
    # Removed max items limit - students can order as many items as they want

    canteen = db.get(Canteen, canteen_id)
    if not canteen or not canteen.is_active:
        raise HTTPException(status_code=404, detail="Canteen not found")

    expire_stale_orders(db)

    max_orders = get_canteen_max_orders(db, canteen_id)
    if count_active_orders(db, canteen_id) >= max_orders:
        raise HTTPException(status_code=400, detail="Canteen at max active orders")

    menu_item_ids = [item["menu_item_id"] for item in items]
    if len(set(menu_item_ids)) != len(menu_item_ids):
        raise HTTPException(status_code=400, detail="Duplicate menu items not allowed")
    menu_items = db.scalars(
        select(MenuItem).where(MenuItem.id.in_(menu_item_ids), MenuItem.canteen_id == canteen_id)
    ).all()
    menu_map = {item.id: item for item in menu_items}
    if len(menu_map) != len(menu_item_ids):
        raise HTTPException(status_code=400, detail="Invalid menu item")

    total = 0
    order_items: list[OrderItem] = []
    for item in items:
        menu = menu_map[item["menu_item_id"]]
        if not menu.is_available:
            raise HTTPException(status_code=400, detail=f"{menu.name} unavailable")
        quantity = item["quantity"]
        total += menu.price_cents * quantity
        order_items.append(
            OrderItem(menu_item_id=menu.id, quantity=quantity, unit_price_cents=menu.price_cents)
        )

    order = Order(
        student_id=student.id,
        canteen_id=canteen_id,
        status=OrderStatus.REQUESTED,
        total_amount_cents=total,
        items=order_items,
    )
    db.add(order)
    db.flush()  # Flush to get the ID
    
    # Generate order number in format YYYYMMDD-XXXX
    from datetime import datetime
    import pytz
    
    # Use IST timezone
    ist = pytz.timezone('Asia/Kolkata')
    now_ist = datetime.now(ist)
    date_str = now_ist.strftime('%Y%m%d')
    order_number = f"{date_str}-{order.id:04d}"
    order.order_number = order_number
    db.flush()  # Flush again to save order_number
    
    # Create payment record based on payment method
    # Normalize legacy payment methods to ONLINE
    if payment_method in [PaymentMethod.UPI_QR, PaymentMethod.UPI_INTENT]:
        payment_method = PaymentMethod.ONLINE
    
    payment_payload = build_payment_payload(
        payment_method, 
        canteen.upi_id, 
        total, 
        order.id
    )
    
    payment = Payment(
        order_id=order.id,
        amount_cents=total,
        method=payment_method,
        status=PaymentStatus.PENDING,
        qr_payload=payment_payload,
    )
    order.payment = payment
    
    _add_event(db, order, None, OrderStatus.REQUESTED, student.id)
    db.commit()
    db.refresh(order)
    return order


def accept_order(db: Session, order: Order, actor: User) -> Order:
    if order.status != OrderStatus.REQUESTED:
        raise HTTPException(status_code=400, detail="Order not in REQUESTED state")

    now = utcnow()
    
    # Check payment method
    if order.payment and order.payment.method == PaymentMethod.COUNTER:
        # For COUNTER payments, skip PAYMENT_PENDING and go directly to PREPARING
        # No payment confirmation needed - admin accepting the order means they'll collect payment at counter
        pickup_code = generate_pickup_code(db, order.canteen_id)
        order.status = OrderStatus.PREPARING
        order.accepted_at = now
        order.paid_at = now
        order.pickup_code = pickup_code
        order.payment.status = PaymentStatus.SUCCESS
        order.payment.paid_at = now
        _add_event(db, order, OrderStatus.REQUESTED, OrderStatus.PREPARING, actor.id)
    else:
        # For ONLINE payments, go to PAYMENT_PENDING and wait for payment confirmation
        order.status = OrderStatus.PAYMENT_PENDING
        order.accepted_at = now
        order.payment_expires_at = now + timedelta(seconds=settings.payment_timeout_seconds)
        
        # Handle legacy orders that don't have payment records
        if not order.payment:
            # Create payment record with default ONLINE method for legacy orders
            payment_payload = build_payment_payload(
                PaymentMethod.ONLINE, 
                order.canteen.upi_id, 
                order.total_amount_cents, 
                order.id
            )
            
            payment = Payment(
                order_id=order.id,
                amount_cents=order.total_amount_cents,
                method=PaymentMethod.ONLINE,
                status=PaymentStatus.PENDING,
                qr_payload=payment_payload,
            )
            order.payment = payment
        else:
            # Payment method and QR payload are already set during order creation
            order.payment.status = PaymentStatus.PENDING
        
        _add_event(db, order, OrderStatus.REQUESTED, OrderStatus.PAYMENT_PENDING, actor.id)
    
    db.commit()
    db.refresh(order)
    return order


def decline_order(db: Session, order: Order, actor: User, reason: str) -> Order:
    if order.status != OrderStatus.REQUESTED:
        raise HTTPException(status_code=400, detail="Order not in REQUESTED state")
    order.status = OrderStatus.DECLINED
    order.decline_reason = reason
    _add_event(db, order, OrderStatus.REQUESTED, OrderStatus.DECLINED, actor.id)
    db.commit()
    db.refresh(order)
    return order


def pay_order(db: Session, order: Order, actor: User) -> Order:
    now = utcnow()
    if order.status != OrderStatus.PAYMENT_PENDING:
        raise HTTPException(status_code=400, detail="Order not in PAYMENT_PENDING")
    
    # Handle both timezone-aware and timezone-naive datetimes
    expires_at = order.payment_expires_at
    if expires_at and expires_at.tzinfo is None:
        # Make naive datetime aware
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if not expires_at or now > expires_at:
        expire_order(db, order)
        raise HTTPException(status_code=400, detail="Payment window expired")

    pickup_code = generate_pickup_code(db, order.canteen_id)
    order.status = OrderStatus.PAID
    order.paid_at = now
    order.pickup_code = pickup_code
    if order.payment:
        order.payment.status = PaymentStatus.SUCCESS
        order.payment.paid_at = now
    _add_event(db, order, OrderStatus.PAYMENT_PENDING, OrderStatus.PAID, actor.id)
    db.commit()
    db.refresh(order)
    return order


def update_order_status(db: Session, order: Order, actor: User, new_status: OrderStatus) -> Order:
    """
    Updates order status with state machine validation.
    Ensures only valid state transitions are allowed.
    
    Requirements: 10.2, 10.4
    """
    # Validate state transition
    if not validate_state_transition(order.status, new_status):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition from {order.status} to {new_status}"
        )
    
    prev = order.status
    order.status = new_status
    
    # Handle COLLECTED status
    if new_status == OrderStatus.COLLECTED:
        order.collected_at = utcnow()
        
        # For COUNTER payments, mark payment as SUCCESS when order is collected
        # This indicates payment was received at pickup
        if order.payment and order.payment.method == PaymentMethod.COUNTER:
            if order.payment.status == PaymentStatus.PENDING:
                order.payment.status = PaymentStatus.SUCCESS
                order.payment.paid_at = utcnow()
    
    _add_event(db, order, prev, new_status, actor.id)
    db.commit()
    db.refresh(order)
    return order


def generate_pickup_code(db: Session, canteen_id: int, attempts: int = 5) -> str:
    for _ in range(attempts):
        code = f"{random.randint(0, 9999):04d}"
        exists = db.scalar(
            select(func.count(Order.id)).where(
                Order.canteen_id == canteen_id,
                Order.pickup_code == code,
                Order.status != OrderStatus.COLLECTED,
            )
        )
        if not exists:
            return code
    raise HTTPException(status_code=500, detail="Failed to generate pickup code")


def expire_order(db: Session, order: Order) -> Order:
    now = utcnow()
    if order.status != OrderStatus.PAYMENT_PENDING:
        return order
    order.status = OrderStatus.CANCELLED_TIMEOUT
    order.cancelled_at = now
    if order.payment:
        order.payment.status = PaymentStatus.EXPIRED
    _add_event(db, order, OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED_TIMEOUT, None)
    db.commit()
    db.refresh(order)
    return order


def expire_stale_orders(db: Session) -> list[Order]:
    now = utcnow()
    orders = db.scalars(
        select(Order).where(
            Order.status == OrderStatus.PAYMENT_PENDING,
            Order.payment_expires_at.is_not(None),
            Order.payment_expires_at < now,
        )
    ).all()
    expired: list[Order] = []
    for order in orders:
        order.status = OrderStatus.CANCELLED_TIMEOUT
        order.cancelled_at = now
        if order.payment:
            order.payment.status = PaymentStatus.EXPIRED
        _add_event(db, order, OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED_TIMEOUT, None)
        expired.append(order)
    if expired:
        db.commit()
        for order in expired:
            db.refresh(order)
    return expired


def update_payment_status(db: Session, order: Order, new_status: PaymentStatus, actor: User = None) -> Order:
    """Update payment status and handle queue management"""
    if not order.payment:
        raise HTTPException(status_code=400, detail="Order has no payment")
    
    old_status = order.payment.status
    order.payment.status = new_status
    
    now = utcnow()
    
    if new_status == PaymentStatus.SUCCESS:
        # Payment successful - move to PAID status and add to queue
        if order.status == OrderStatus.PAYMENT_PENDING:
            pickup_code = generate_pickup_code(db, order.canteen_id)
            order.status = OrderStatus.PAID
            order.paid_at = now
            order.pickup_code = pickup_code
            order.payment.paid_at = now
            _add_event(db, order, OrderStatus.PAYMENT_PENDING, OrderStatus.PAID, actor.id if actor else None)
    
    elif new_status == PaymentStatus.FAILED:
        # Payment failed - keep in PAYMENT_PENDING but remove from queue consideration
        # Admin can decide to cancel or retry
        pass
    
    elif new_status == PaymentStatus.EXPIRED:
        # Payment expired - cancel the order
        if order.status == OrderStatus.PAYMENT_PENDING:
            order.status = OrderStatus.CANCELLED_TIMEOUT
            order.cancelled_at = now
            _add_event(db, order, OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED_TIMEOUT, None)
    
    db.commit()
    db.refresh(order)
    return order


def cancel_failed_payment_order(db: Session, order: Order, actor: User) -> Order:
    """Cancel an order with failed payment"""
    if order.status != OrderStatus.PAYMENT_PENDING:
        raise HTTPException(status_code=400, detail="Order not in PAYMENT_PENDING state")
    
    if order.payment and order.payment.status != PaymentStatus.FAILED:
        raise HTTPException(status_code=400, detail="Can only cancel orders with failed payments")
    
    now = utcnow()
    order.status = OrderStatus.DECLINED
    order.cancelled_at = now
    order.decline_reason = "Payment failed - cancelled by admin"
    
    _add_event(db, order, OrderStatus.PAYMENT_PENDING, OrderStatus.DECLINED, actor.id)
    db.commit()
    db.refresh(order)
    return order


def _add_event(
    db: Session,
    order: Order,
    from_status: OrderStatus | None,
    to_status: OrderStatus,
    actor_user_id: int | None,
) -> None:
    db.add(
        OrderStatusEvent(
            order_id=order.id,
            from_status=from_status,
            to_status=to_status,
            actor_user_id=actor_user_id,
        )
    )
