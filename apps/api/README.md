# Campus Canteen Pre-Order API

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload
```

## Tests

```bash
pytest
```

Environment variables:
- `DATABASE_URL` (default: sqlite:///./canteen.db)
- `JWT_SECRET`
- `PAYMENT_TIMEOUT_SECONDS`

The seed script creates 50 students (roll numbers `S001` to `S050`, password `password123`) and 5 canteen admins (password `admin123`).
