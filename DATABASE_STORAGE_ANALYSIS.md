# 📊 Database Storage Analysis - OffMess App

## Current Storage Usage (SQLite)

Based on your current database file:

**File:** `apps/api/canteen.db`
**Size:** ~500 KB (after testing with orders)

---

## Storage Breakdown

### Per Record Estimates

**Users Table:**
- Average size per user: ~500 bytes
- Fields: id, email, name, phone, role, password_hash, hostel_name, etc.

**Orders Table:**
- Average size per order: ~1 KB
- Fields: id, order_number, user_id, canteen_id, items (JSON), status, timestamps, payment info

**Canteens Table:**
- Average size per canteen: ~2 KB
- Fields: id, name, description, menu_items (JSON), location, settings

**Menu Items:**
- Stored as JSON in canteens table
- ~100-200 bytes per item

**Hostels Table:**
- Average size per hostel: ~500 bytes
- Fields: id, name, mess_menu (JSON)

---

## Daily Usage Estimates

### Low Activity (Testing Phase)
- **Users:** 10 new users/day × 500 bytes = 5 KB
- **Orders:** 20 orders/day × 1 KB = 20 KB
- **Total:** ~25 KB/day

### Medium Activity (Campus Rollout)
- **Users:** 50 new users/day × 500 bytes = 25 KB
- **Orders:** 200 orders/day × 1 KB = 200 KB
- **Total:** ~225 KB/day

### High Activity (Full Campus)
- **Users:** 100 new users/day × 500 bytes = 50 KB (decreases over time)
- **Orders:** 1000 orders/day × 1 KB = 1 MB
- **Total:** ~1 MB/day

---

## Supabase Free Tier Capacity

**Free Tier Limits:**
- Storage: 500 MB
- Bandwidth: 2 GB/month
- Connections: Unlimited (with connection pooling)

### Capacity Calculations

**Testing Phase (25 KB/day):**
- Days until full: 500 MB ÷ 25 KB = 20,000 days (~55 years)
- **Verdict:** More than enough! ✅

**Medium Activity (225 KB/day):**
- Days until full: 500 MB ÷ 225 KB = 2,222 days (~6 years)
- **Verdict:** Plenty of capacity! ✅

**High Activity (1 MB/day):**
- Days until full: 500 MB ÷ 1 MB = 500 days (~1.4 years)
- **Verdict:** Good for initial rollout! ✅

**Your Estimate (500 KB/day):**
- Days until full: 500 MB ÷ 500 KB = 1,000 days (~2.7 years)
- **Verdict:** Perfect for campus use! ✅

---

## Storage Optimization Strategies

### 1. Regular Cleanup (Recommended)

**Delete old completed orders:**
```sql
-- Delete orders older than 30 days
DELETE FROM orders 
WHERE status = 'completed' 
AND created_at < NOW() - INTERVAL '30 days';
```

**Impact:** Saves ~30 MB/month (at 1 MB/day)

### 2. Archive Old Data

**Move old orders to archive table:**
```sql
-- Create archive table
CREATE TABLE orders_archive AS SELECT * FROM orders WHERE 1=0;

-- Move old orders
INSERT INTO orders_archive 
SELECT * FROM orders 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete from main table
DELETE FROM orders 
WHERE created_at < NOW() - INTERVAL '90 days';
```

**Impact:** Keeps main table fast, saves space

### 3. Compress JSON Fields

**Current:** Menu items stored as JSON
**Optimization:** Use PostgreSQL JSONB (already done by SQLAlchemy)

**Impact:** ~20-30% size reduction

### 4. Delete Test Data

**After testing phase:**
```sql
-- Delete test orders
DELETE FROM orders WHERE created_at < '2026-02-15';

-- Delete test users (keep real students)
DELETE FROM users 
WHERE role = 'student' 
AND email NOT LIKE '%@iitism.ac.in';
```

**Impact:** Saves 10-50 MB depending on testing duration

---

## Monitoring and Alerts

### Set Up Alerts

**80% Capacity (400 MB):**
- Time to start cleanup
- Review old orders
- Consider archiving

**90% Capacity (450 MB):**
- Urgent cleanup needed
- Archive old data
- Consider upgrading

### Monthly Review

**Check database size:**
```sql
SELECT pg_size_pretty(pg_database_size('postgres'));
```

**Check table sizes:**
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## When to Upgrade

### Supabase Pro ($25/month)
- Storage: 8 GB (16x more)
- Bandwidth: 50 GB/month
- Daily backups: 30 days retention
- Point-in-time recovery

**Upgrade when:**
- Approaching 400 MB (80% of free tier)
- Need longer backup retention
- Need more bandwidth
- Campus-wide rollout with 2000+ users

### Cost-Benefit Analysis

**Free Tier:**
- Cost: $0
- Capacity: 500 MB (~1-2 years)
- Perfect for: Testing, small campus rollout

**Pro Tier ($25/month):**
- Cost: $300/year
- Capacity: 8 GB (~16-32 years at current rate)
- Perfect for: Full campus deployment, multiple campuses

---

## Bandwidth Considerations

### Supabase Free Tier: 2 GB/month

**Typical API Request:**
- GET /orders: ~5 KB
- POST /orders: ~2 KB
- GET /canteens: ~10 KB

**Estimated Usage:**
- 1000 orders/day × 7 KB = 7 MB/day
- 7 MB/day × 30 days = 210 MB/month

**Verdict:** Well within 2 GB limit! ✅

---

## SQLite vs PostgreSQL Comparison

### SQLite (Current - Render)
- ❌ Data lost on every redeploy
- ❌ Not suitable for production
- ✅ Good for local development
- ✅ No setup required

### PostgreSQL (Supabase)
- ✅ Data persists across redeploys
- ✅ Production-ready
- ✅ Better performance
- ✅ Automatic backups
- ✅ Scalable
- ✅ Free tier available

---

## Recommendations

### For Testing Phase (Now)
1. ✅ Keep SQLite for quick testing
2. ✅ Set up Supabase PostgreSQL
3. ✅ Test with PostgreSQL before full rollout
4. ✅ Clean up test data after testing

### For Campus Rollout
1. ✅ Migrate to PostgreSQL (Supabase)
2. ✅ Set up monthly cleanup job
3. ✅ Monitor database size weekly
4. ✅ Set up alerts at 80% and 90%

### For Long-Term
1. ✅ Archive old orders quarterly
2. ✅ Review storage usage monthly
3. ✅ Upgrade to Pro when approaching 400 MB
4. ✅ Consider multiple database instances for multiple campuses

---

## Conclusion

**Your Calculation:** 282 days (9+ months) at 500 KB/day

**Reality Check:**
- Testing phase: 25 KB/day → 55 years ✅
- Campus rollout: 225 KB/day → 6 years ✅
- Full activity: 500 KB/day → 2.7 years ✅

**With monthly cleanup:**
- Capacity: Effectively unlimited on free tier ✅

**Recommendation:**
1. Set up Supabase now (free)
2. Migrate from SQLite to PostgreSQL
3. Test thoroughly
4. Clean up test data
5. Roll out to campus
6. Set up monthly cleanup
7. Monitor usage
8. Upgrade to Pro when needed (probably never!)

**You're good to go!** 🚀

---

## Quick Setup Checklist

- [ ] Add `psycopg2-binary` to requirements.txt ✅ (Done!)
- [ ] Create Supabase account
- [ ] Create new project
- [ ] Get connection string
- [ ] Update DATABASE_URL on Render
- [ ] Run migrations
- [ ] Seed database
- [ ] Test thoroughly
- [ ] Clean up test data
- [ ] Set up monitoring
- [ ] Roll out to campus

**Estimated setup time:** 15-20 minutes

Good luck! 🎉
