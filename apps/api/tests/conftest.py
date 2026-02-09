import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Canteen, MenuItem, User, UserRole
from app.auth import hash_password


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def seed(db):
    canteen = Canteen(
        name="Main Canteen",
        hours_open="07:00",
        hours_close="22:00",
        avg_prep_minutes=10,
        upi_id="main@upi",
    )
    db.add(canteen)
    db.flush()

    menu_items = [
        MenuItem(canteen_id=canteen.id, name="Veg Thali", price_cents=6000),
        MenuItem(canteen_id=canteen.id, name="Rice Plate", price_cents=4000),
        MenuItem(canteen_id=canteen.id, name="Dal Fry", price_cents=5000),
    ]
    db.add_all(menu_items)

    student = User(
        role=UserRole.STUDENT,
        roll_number="S001",
        password_hash=hash_password("password123"),
    )
    admin = User(
        role=UserRole.CANTEEN_ADMIN,
        email="main_canteen@campus.test",
        password_hash=hash_password("admin123"),
        canteen_id=canteen.id,
    )
    db.add_all([student, admin])
    db.commit()

    return {
        "canteen": canteen,
        "menu_items": menu_items,
        "student": student,
        "admin": admin,
    }
