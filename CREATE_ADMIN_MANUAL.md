# Manual Campus Admin Creation (Alternative Method)

If the API endpoint isn't working, you can create the admin account directly in the database.

## Option 1: Wait for Render Deployment (Recommended)

1. Go to https://dashboard.render.com → offmess-api
2. Wait until status shows "Live" (not "Deploying")
3. Check the deployment time - should be recent
4. Try the curl command again after deployment completes

## Option 2: Use Python Script on Render Shell

1. Go to https://dashboard.render.com → offmess-api
2. Click "Shell" tab (if available on free tier)
3. Run this Python script:

```python
from app.database import SessionLocal
from app.models import User, UserRole
from app.auth import hash_password

db = SessionLocal()

# Create campus admin
admin = User(
    role=UserRole.CAMPUS_ADMIN,
    email="rishi_admin@offmess.com",
    password_hash=hash_password("Risumi@1204"),
    name="Rishi Singh",
    phone_number="+919693482676",
)

db.add(admin)
db.commit()
print(f"Campus admin created: {admin.email}")
db.close()
```

## Option 3: Use Seeded Account Temporarily

The database is seeded with a test campus admin on every deployment:

**Email:** `campus.admin@campus.test`
**Password:** `admin123`

Try logging in at: https://offmess.vercel.app/login

1. Click "Admin"
2. Enter the credentials above
3. Once logged in, you can change the password from your profile

## Option 4: Wait and Retry API

After Render finishes deploying (check dashboard), retry:

```bash
curl -X POST https://offmess-api.onrender.com/auth/register-campus-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rishi_admin@offmess.com",
    "password": "Risumi@1204",
    "name": "Rishi Singh",
    "phone_number": "+919693482676",
    "setup_key": "2ae13280064b9f57"
  }'
```

## Checking Render Deployment Status

1. Go to: https://dashboard.render.com
2. Click on "offmess-api"
3. Look for:
   - **Status**: Should say "Live" (green)
   - **Last Deploy**: Should be within last 10 minutes
   - **Logs**: Check for any errors

## Troubleshooting

### If curl still returns "Not Found":
- Render might not have picked up the changes
- Try manually redeploying:
  1. Go to Render dashboard
  2. Click "Manual Deploy" → "Deploy latest commit"
  3. Wait 5-10 minutes
  4. Try curl again

### If you get "Invalid setup key":
- Double-check the JWT_SECRET in Render environment variables
- Make sure you're using the first 16 characters exactly
- No spaces before or after

### If you get "Campus admin already exists":
- The seeded admin (`campus.admin@campus.test`) already exists
- You can login with that account instead
- Or delete it first (requires database access)

## Recommended Approach

**For now, use the seeded account:**
- Email: `campus.admin@campus.test`
- Password: `admin123`

This will work immediately and you can use it to manage the system while we fix the registration endpoint.
