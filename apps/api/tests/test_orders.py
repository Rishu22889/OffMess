from datetime import datetime, timedelta, timezone
import pytest
from fastapi import HTTPException

from app.crud import (
    create_order,
    accept_order,
    pay_order,
    expire_stale_orders,
    generate_pickup_code,
)
from app.models import Order, OrderStatus, PaymentStatus, MenuItem


def test_create_order_constraints(db, seed):
    student = seed["student"]
    canteen = seed["canteen"]
    menu_items = seed["menu_items"]

    # Duplicate menu item should fail
    with pytest.raises(HTTPException):
        create_order(
            db,
            student,
            canteen.id,
            [
                {"menu_item_id": menu_items[0].id, "quantity": 1},
                {"menu_item_id": menu_items[0].id, "quantity": 1},
            ],
        )

    # Add extra menu item to exceed max items
    extra = MenuItem(canteen_id=canteen.id, name="Extra", price_cents=1000)
    db.add(extra)
    db.commit()

    with pytest.raises(HTTPException):
        create_order(
            db,
            student,
            canteen.id,
            [
                {"menu_item_id": menu_items[0].id, "quantity": 1},
                {"menu_item_id": menu_items[1].id, "quantity": 1},
                {"menu_item_id": menu_items[2].id, "quantity": 1},
                {"menu_item_id": extra.id, "quantity": 1},
            ],
        )


def test_active_order_limit(db, seed):
    student = seed["student"]
    canteen = seed["canteen"]
    menu_item = seed["menu_items"][0]

    for _ in range(20):
        create_order(db, student, canteen.id, [{"menu_item_id": menu_item.id, "quantity": 1}])

    with pytest.raises(HTTPException):
        create_order(db, student, canteen.id, [{"menu_item_id": menu_item.id, "quantity": 1}])


def test_accept_flow(db, seed):
    student = seed["student"]
    admin = seed["admin"]
    canteen = seed["canteen"]
    menu_item = seed["menu_items"][0]

    order = create_order(db, student, canteen.id, [{"menu_item_id": menu_item.id, "quantity": 1}])
    updated = accept_order(db, order, admin)

    assert updated.status == OrderStatus.PAYMENT_PENDING
    assert updated.payment is not None
    assert updated.payment.status == PaymentStatus.PENDING
    assert updated.payment.qr_payload.startswith("upi://pay")
    assert updated.payment_expires_at is not None


def test_pay_flow_success(db, seed):
    student = seed["student"]
    admin = seed["admin"]
    canteen = seed["canteen"]
    menu_item = seed["menu_items"][0]

    order = create_order(db, student, canteen.id, [{"menu_item_id": menu_item.id, "quantity": 1}])
    order = accept_order(db, order, admin)

    paid = pay_order(db, order, student)
    assert paid.status == OrderStatus.PAID
    assert paid.payment.status == PaymentStatus.SUCCESS
    assert paid.pickup_code is not None
    assert len(paid.pickup_code) == 4


def test_pay_flow_expired(db, seed):
    student = seed["student"]
    admin = seed["admin"]
    canteen = seed["canteen"]
    menu_item = seed["menu_items"][0]

    order = create_order(db, student, canteen.id, [{"menu_item_id": menu_item.id, "quantity": 1}])
    order = accept_order(db, order, admin)

    order.payment_expires_at = datetime.now(timezone.utc) - timedelta(seconds=5)
    db.commit()

    with pytest.raises(HTTPException):
        pay_order(db, order, student)

    db.refresh(order)
    assert order.status == OrderStatus.CANCELLED_TIMEOUT


def test_auto_cancel_job(db, seed):
    student = seed["student"]
    admin = seed["admin"]
    canteen = seed["canteen"]
    menu_item = seed["menu_items"][0]

    order = create_order(db, student, canteen.id, [{"menu_item_id": menu_item.id, "quantity": 1}])
    order = accept_order(db, order, admin)
    order.payment_expires_at = datetime.now(timezone.utc) - timedelta(seconds=10)
    db.commit()

    expired = expire_stale_orders(db)
    assert len(expired) == 1
    assert expired[0].status == OrderStatus.CANCELLED_TIMEOUT


def test_pickup_code_collision(db, seed, monkeypatch):
    student = seed["student"]
    canteen = seed["canteen"]
    menu_item = seed["menu_items"][0]

    order = create_order(db, student, canteen.id, [{"menu_item_id": menu_item.id, "quantity": 1}])
    order.status = OrderStatus.PAID
    order.pickup_code = "0001"
    db.commit()

    calls = iter([1, 2])

    def fake_randint(a, b):
        return next(calls)

    monkeypatch.setattr("app.crud.random.randint", fake_randint)

    code = generate_pickup_code(db, canteen.id, attempts=2)
    assert code == "0002"
