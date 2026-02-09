from sqlalchemy.orm import Session
from .database import Base, engine, SessionLocal
from .models import Canteen, MenuItem, User, UserRole
from .auth import hash_password


def seed_data(db: Session) -> None:
    if db.query(Canteen).count() > 0:
        return

    canteens = [
        Canteen(name="Main Canteen", hours_open="07:00", hours_close="22:00", avg_prep_minutes=10, upi_id="main@upi", max_active_orders=25),
        Canteen(name="Hostel Canteen A", hours_open="18:00", hours_close="00:00", avg_prep_minutes=8, upi_id="hostela@upi", max_active_orders=15),
        Canteen(name="Hostel Canteen B", hours_open="18:00", hours_close="23:30", avg_prep_minutes=7, upi_id="hostelb@upi", max_active_orders=15),
        Canteen(name="Juice & Snacks Corner", hours_open="10:00", hours_close="20:00", avg_prep_minutes=5, upi_id="juice@upi", max_active_orders=30),
        Canteen(name="South Indian Canteen", hours_open="07:00", hours_close="15:00", avg_prep_minutes=6, upi_id="south@upi", max_active_orders=20),
    ]
    db.add_all(canteens)
    db.flush()

    menu_items = {
        "Main Canteen": [
            ("Veg Thali", 6000),
            ("Chicken Curry", 9000),
            ("Rice Plate", 4000),
            ("Dal Fry", 5000),
            ("Roti (2 pieces)", 1500),
        ],
        "Hostel Canteen A": [
            ("Maggi", 3000),
            ("Egg Roll", 4000),
            ("Paneer Roll", 5000),
            ("Tea", 1000),
            ("Coffee", 1500),
        ],
        "Hostel Canteen B": [
            ("Fried Rice", 7000),
            ("Chowmein", 6000),
            ("Momos", 5000),
            ("Cold Drink", 2500),
            ("Samosa", 1000),
        ],
        "Juice & Snacks Corner": [
            ("Orange Juice", 3000),
            ("Banana Shake", 3500),
            ("Sandwich", 4000),
            ("Chips", 2000),
            ("Biscuits", 1000),
        ],
        "South Indian Canteen": [
            ("Idli (2 pieces)", 3000),
            ("Dosa", 4000),
            ("Vada", 2500),
            ("Sambhar", 2000),
            ("Filter Coffee", 1500),
        ],
    }

    for canteen in canteens:
        for name, price in menu_items[canteen.name]:
            db.add(MenuItem(canteen_id=canteen.id, name=name, price_cents=price))

    for i in range(1, 51):
        roll = f"S{i:03d}"
        db.add(
            User(
                role=UserRole.STUDENT,
                roll_number=roll,
                password_hash=hash_password("password123"),
                name=f"Student {i:02d}",
                phone_number=f"98765{i:05d}",
            )
        )

    for canteen in canteens:
        email = f"{canteen.name.lower().replace(' ', '_').replace('&', 'and')}@campus.test"
        admin_name = f"{canteen.name} Admin"
        db.add(
            User(
                role=UserRole.CANTEEN_ADMIN,
                email=email,
                password_hash=hash_password("admin123"),
                canteen_id=canteen.id,
                name=admin_name,
                phone_number=f"99999{canteen.id:05d}",
            )
        )

    db.add(
        User(
            role=UserRole.CAMPUS_ADMIN,
            email="campus.admin@campus.test",
            password_hash=hash_password("admin123"),
            name="Campus Administrator",
            phone_number="9999900000",
        )
    )

    db.commit()


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_data(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
