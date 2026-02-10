# 🐘 PostgreSQL Migration Guide - Supabase Setup

## 📋 Overview

This guide will help you migrate from SQLite to PostgreSQL using Supabase's free tier (500MB storage).

**Current Setup:**
- Database: SQLite (ephemeral on Render - data lost on redeploy)
- Storage: ~500KB per day of operation
- Estimated capacity: 282 days (9+ months) on Supabase free tier

**After Migration:**
- Database: PostgreSQL (persistent, production-ready)
- Hosting: Supabase (free tier: 500MB storage, 2GB bandwidth)
- Benefits: Data persistence, better performance, scalability

---

## 🎯 Step 1: Prepare Backend for PostgreSQL

### 1.1 Add PostgreSQL Driver

Update `apps/api/requirements.txt`:

```txt
fastapi==0.115.8
uvicorn[standard]==0.30.6
SQLAlchemy==2.0.36
pydantic==2.9.2
pydantic-settings==2.6.1
python-jose==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12
alembic==1.13.3
pytest==8.3.4
pytz==2024.2
websockets==12.0
authlib==1.6.6
httpx==0.28.1
itsdangerous==2.2.0
psycopg2-binary==2.9.9
```

**Note:** `psycopg2-binary` is the PostgreSQL adapter for Python.

### 1.2 Update Database Configuration

Your `apps/api/app/database.py` already supports PostgreSQL! It automatically detects the database type:

```python
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)
```

- SQLite: Uses `check_same_thread=False`
- PostgreSQL: No special connect_args needed

**No changes needed!** ✅

### 1.3 Update Config (Optional)

Your `apps/api/app/config.py` already has `database_url` setting. It will work with both SQLite and PostgreSQL.

**No changes needed!** ✅

---

## 🌐 Step 2: Create Supabase Account and Project

### 2.1 Sign Up for Supabase

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Verify your email if needed

### 2.2 Create New Project

1. Click "New Project"
2. Fill in details:
   - **Organization**: Create new or select existing
   - **Name**: `offmess` (or your preferred name)
   - **Database Password**: Generate a strong password (SAVE THIS!)
   - **Region**: Choose closest to your users (e.g., Mumbai for India)
   - **Pricing Plan**: Free (500MB database, 2GB bandwidth)
3. Click "Create new project"
4. Wait 2-3 minutes for project to be provisioned

### 2.3 Get Connection String

1. Once project is ready, go to **Settings** (gear icon in sidebar)
2. Click **Database** in the left menu
3. Scroll down to **Connection string**
4. Select **URI** tab
5. Copy the connection string - it looks like:

```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

6. Replace `[YOUR-PASSWORD]` with the database password you created in step 2.2

**Example:**
```
postgresql://postgres:MySecurePass123@db.abcdefghijklmnop.supabase.co:5432/postgres
```

**Important:** Save this connection string securely! You'll need it for Render.

---

## 🔧 Step 3: Update Render Environment Variables

### 3.1 Go to Render Dashboard

1. Visit https://dashboard.render.com
2. Click on your `offmess-api` service
3. Go to **Environment** tab

### 3.2 Update DATABASE_URL

1. Find the `DATABASE_URL` variable
2. Click "Edit"
3. Replace the SQLite URL with your Supabase PostgreSQL URL:

**Old (SQLite):**
```
sqlite:///./canteen.db
```

**New (PostgreSQL):**
```
postgresql://postgres:YourPassword@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

4. Click "Save Changes"

**Important:** Render will automatically redeploy your service after saving.

### 3.3 Wait for Deployment

1. Go to **Logs** tab
2. Watch the deployment progress
3. Look for "Build successful" and "Service is live"
4. This takes about 3-5 minutes

---

## 🗄️ Step 4: Run Database Migrations

### 4.1 Connect to Render Shell

**Option A: Using Render Dashboard**
1. Go to your service on Render
2. Click **Shell** tab (top right)
3. Wait for shell to connect

**Option B: Using Render CLI** (if installed)
```bash
render shell offmess-api
```

### 4.2 Run Alembic Migrations

In the Render shell, run:

```bash
# Navigate to app directory (if needed)
cd /opt/render/project/src

# Run migrations
alembic upgrade head
```

**Expected output:**
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 0001_initial, Initial migration
INFO  [alembic.runtime.migration] Running upgrade 0001_initial -> 0002_add_max_active_orders
INFO  [alembic.runtime.migration] Running upgrade 0002_add_max_active_orders -> 0003_add_user_profile_fields
INFO  [alembic.runtime.migration] Running upgrade 0003_add_user_profile_fields -> 0004_add_accepting_orders
INFO  [alembic.runtime.migration] Running upgrade 0004_add_accepting_orders -> 0005_add_upi_intent_payment_fields
INFO  [alembic.runtime.migration] Running upgrade 0005_add_upi_intent_payment_fields -> 0006_add_hostel_name_and_mess_menu
INFO  [alembic.runtime.migration] Running upgrade 0006_add_hostel_name_and_mess_menu -> 0007_change_mess_menu_to_weekly
INFO  [alembic.runtime.migration] Running upgrade 0007_change_mess_menu_to_weekly -> 0008_add_hostels_table
INFO  [alembic.runtime.migration] Running upgrade 0008_add_hostels_table -> 0009_add_order_number
```

✅ **Success!** Your database schema is now created in PostgreSQL.

---

## 🌱 Step 5: Seed Initial Data

### 5.1 Run Seed Script

Still in the Render shell:

```bash
# Run the seed script
python -c "from app.seed import seed_database; seed_database()"
```

**Expected output:**
```
Seeding database...
Created campus admin: campus.admin@campus.test
Created canteen: Main Canteen
Created canteen admin: canteen.admin@canteen.test
Database seeded successfully!
```

### 5.2 Verify Data in Supabase

1. Go to your Supabase project dashboard
2. Click **Table Editor** in sidebar
3. You should see tables:
   - `users`
   - `canteens`
   - `menu_items`
   - `orders`
   - `hostels`
   - `alembic_version`
4. Click on `users` table - you should see 2 admin users
5. Click on `canteens` table - you should see 1 canteen

✅ **Success!** Your database is seeded with initial data.

---

## 🧪 Step 6: Test the Migration

### 6.1 Test Backend API

1. Visit your backend URL: `https://offmess-api.onrender.com/docs`
2. You should see the FastAPI Swagger documentation
3. Try the `/health` endpoint (if you have one)

### 6.2 Test Admin Login

1. Go to your frontend: `https://offmess.vercel.app/login`
2. Login as campus admin:
   - Email: `campus.admin@campus.test`
   - Password: `admin123`
3. You should be able to login successfully

### 6.3 Test Canteen Admin Login

1. Login as canteen admin:
   - Email: `canteen.admin@canteen.test`
   - Password: `admin123`
2. Check that you can see the canteen dashboard

### 6.4 Test Student Registration

1. Logout
2. Try registering with a Google account (@iitism.ac.in)
3. Place a test order
4. Verify order appears in admin dashboard

---

## 📊 Step 7: Monitor Database Usage

### 7.1 Check Database Size

In Supabase dashboard:
1. Go to **Settings** → **Database**
2. Scroll to **Database size**
3. You'll see current usage (should be ~1-2 MB after seeding)

### 7.2 Set Up Usage Alerts (Optional)

1. Go to **Settings** → **Billing**
2. Set up email alerts for:
   - 80% database usage (400 MB)
   - 90% database usage (450 MB)

### 7.3 Monitor Growth

**Expected growth:**
- ~500 KB per day of active use
- ~15 MB per month
- ~180 MB per year
- **Capacity:** 282 days (9+ months) on free tier

**When to clean up:**
- After testing phase (delete test orders)
- Monthly cleanup of old completed orders
- Archive old data if needed

---

## 🧹 Step 8: Clean Up Test Data (After Testing)

### 8.1 Connect to Supabase SQL Editor

1. Go to Supabase dashboard
2. Click **SQL Editor** in sidebar
3. Click **New query**

### 8.2 Delete Test Orders

```sql
-- Delete all test orders
DELETE FROM orders WHERE created_at < NOW() - INTERVAL '1 day';

-- Or delete specific test orders
DELETE FROM orders WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%test%'
);
```

### 8.3 Delete Test Users (Optional)

```sql
-- Delete test student accounts (keep admins)
DELETE FROM users 
WHERE role = 'student' 
AND email NOT LIKE '%@iitism.ac.in';
```

### 8.4 Verify Cleanup

```sql
-- Check remaining data
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'canteens', COUNT(*) FROM canteens
UNION ALL
SELECT 'menu_items', COUNT(*) FROM menu_items;
```

---

## 🔄 Step 9: Backup Strategy (Optional but Recommended)

### 9.1 Automatic Backups

Supabase free tier includes:
- **Daily backups** (retained for 7 days)
- Automatic point-in-time recovery

### 9.2 Manual Backup

To create a manual backup:

1. Go to **Database** → **Backups**
2. Click "Create backup"
3. Wait for backup to complete
4. Download backup file (optional)

### 9.3 Restore from Backup

If you need to restore:

1. Go to **Database** → **Backups**
2. Find the backup you want to restore
3. Click "Restore"
4. Confirm restoration

**Warning:** This will overwrite current data!

---

## 🚨 Troubleshooting

### Connection Refused Error

**Error:**
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Solutions:**
1. Check DATABASE_URL is correct
2. Verify password has no special characters that need escaping
3. Check Supabase project is running (not paused)
4. Verify Render can access Supabase (firewall/network)

### Password Special Characters

If your password has special characters, URL-encode them:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`

**Example:**
```
Password: MyPass@123#
Encoded: MyPass%40123%23
```

### Migration Fails

**Error:**
```
alembic.util.exc.CommandError: Can't locate revision identified by 'xxxx'
```

**Solution:**
```bash
# Reset migrations (WARNING: This drops all tables!)
alembic downgrade base
alembic upgrade head
```

### Seed Script Fails

**Error:**
```
IntegrityError: duplicate key value violates unique constraint
```

**Solution:**
Data already exists. Either:
1. Skip seeding (data is already there)
2. Or delete existing data first:

```sql
-- In Supabase SQL Editor
TRUNCATE users, canteens, menu_items, orders, hostels CASCADE;
```

Then run seed script again.

### Render Deployment Fails

**Error:**
```
ModuleNotFoundError: No module named 'psycopg2'
```

**Solution:**
1. Make sure `psycopg2-binary==2.9.9` is in `requirements.txt`
2. Commit and push changes
3. Render will auto-redeploy

### Database Connection Pool Exhausted

**Error:**
```
sqlalchemy.exc.TimeoutError: QueuePool limit of size 5 overflow 10 reached
```

**Solution:**
Update `apps/api/app/database.py`:

```python
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
    pool_size=10,  # Add this
    max_overflow=20,  # Add this
)
```

---

## 📈 Performance Optimization (Optional)

### Add Database Indexes

For better query performance:

```sql
-- Index on order status for faster filtering
CREATE INDEX idx_orders_status ON orders(status);

-- Index on order created_at for date queries
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Index on user email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Index on canteen accepting_orders for filtering
CREATE INDEX idx_canteens_accepting_orders ON canteens(accepting_orders);
```

### Enable Connection Pooling

Already configured in SQLAlchemy! No changes needed.

---

## ✅ Migration Checklist

- [ ] Added `psycopg2-binary` to requirements.txt
- [ ] Created Supabase account and project
- [ ] Got PostgreSQL connection string
- [ ] Updated DATABASE_URL on Render
- [ ] Waited for Render to redeploy
- [ ] Ran Alembic migrations
- [ ] Ran seed script
- [ ] Verified data in Supabase
- [ ] Tested admin login
- [ ] Tested student registration
- [ ] Tested order placement
- [ ] Set up usage monitoring
- [ ] Cleaned up test data (after testing)
- [ ] Documented backup strategy

---

## 🎉 Success!

Your OffMess app is now running on PostgreSQL with Supabase!

**Benefits:**
- ✅ Data persists across Render redeployments
- ✅ Better performance than SQLite
- ✅ Production-ready database
- ✅ Free tier: 500MB storage, 2GB bandwidth
- ✅ Automatic daily backups
- ✅ Easy to scale when needed

**Next Steps:**
1. Monitor database usage in Supabase dashboard
2. Clean up test data after testing phase
3. Set up usage alerts (80% and 90%)
4. Consider upgrading to paid tier when you reach 400MB

---

## 📞 Quick Reference

### Important URLs
- **Supabase Dashboard**: https://app.supabase.com
- **Render Dashboard**: https://dashboard.render.com
- **Backend URL**: https://offmess-api.onrender.com
- **Frontend URL**: https://offmess.vercel.app

### Connection String Format
```
postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres
```

### Useful SQL Queries

**Check database size:**
```sql
SELECT pg_size_pretty(pg_database_size('postgres'));
```

**Count records:**
```sql
SELECT 
  'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'canteens', COUNT(*) FROM canteens;
```

**Recent orders:**
```sql
SELECT * FROM orders 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🆘 Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Render Docs**: https://render.com/docs
- **SQLAlchemy Docs**: https://docs.sqlalchemy.org
- **Alembic Docs**: https://alembic.sqlalchemy.org

Good luck with your migration! 🚀
