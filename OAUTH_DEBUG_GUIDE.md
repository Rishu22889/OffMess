# Google OAuth Debugging Guide

## Issue: Student Login with Google Not Working

### Quick Fix Checklist

#### 1. Frontend Fix (DONE ✅)
Updated `apps/web/src/app/login/page.tsx` to use environment variable instead of hardcoded localhost.

#### 2. Verify Render Environment Variables

Go to: https://dashboard.render.com → offmess-api → Environment

**Required Variables:**
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://offmess-api.onrender.com/auth/google/callback
FRONTEND_URL=https://offmess.vercel.app
ALLOWED_DOMAIN=iitism.ac.in
```

#### 3. Verify Vercel Environment Variables

Go to: https://vercel.com/dashboard → offmess → Settings → Environment Variables

**Required Variables:**
```env
NEXT_PUBLIC_API_URL=https://offmess-api.onrender.com
NEXT_PUBLIC_WS_URL=wss://offmess-api.onrender.com
```

#### 4. Verify Google Cloud Console Settings

Go to: https://console.cloud.google.com → APIs & Services → Credentials

**Authorized Redirect URIs:**
```
https://offmess-api.onrender.com/auth/google/callback
```

**Authorized JavaScript Origins:**
```
https://offmess.vercel.app
https://offmess-api.onrender.com
```

## Testing Flow

### Expected Flow:
1. User visits: `https://offmess.vercel.app/login`
2. Clicks "Student" → "Sign in with IIT ISM Google"
3. Redirected to: `https://offmess-api.onrender.com/auth/google/login`
4. Backend redirects to Google OAuth
5. User authenticates with Google
6. Google redirects to: `https://offmess-api.onrender.com/auth/google/callback`
7. Backend processes OAuth and redirects to: `https://offmess.vercel.app/auth/callback`
8. Frontend processes the callback and logs user in

### Common Errors & Solutions

#### Error: "redirect_uri_mismatch"
**Cause:** Google redirect URI doesn't match what's configured in Google Console

**Solution:**
1. Check that `GOOGLE_REDIRECT_URI` in Render = `https://offmess-api.onrender.com/auth/google/callback`
2. Check that Google Console has the exact same URL
3. Make sure there are no trailing slashes or typos

#### Error: "invalid_domain"
**Cause:** User's email doesn't end with @iitism.ac.in

**Solution:**
1. Verify `ALLOWED_DOMAIN=iitism.ac.in` in Render
2. Make sure user is signing in with @iitism.ac.in email

#### Error: CORS or Cookie Issues
**Cause:** Cross-origin cookie settings or CORS misconfiguration

**Solution:**
1. Verify `FRONTEND_URL=https://offmess.vercel.app` in Render
2. Check backend CORS includes Vercel domain
3. Ensure cookies use `samesite=none` and `secure=true` for HTTPS

#### Error: "Cannot GET /auth/google/login"
**Cause:** Backend not responding or wrong API URL

**Solution:**
1. Check `NEXT_PUBLIC_API_URL` in Vercel = `https://offmess-api.onrender.com`
2. Test backend directly: `https://offmess-api.onrender.com/health`
3. Check Render logs for errors

## Manual Testing Steps

### 1. Test Backend Health
```bash
curl https://offmess-api.onrender.com/health
```
Expected: `{"status":"ok"}`

### 2. Test OAuth Initiation
Visit in browser: `https://offmess-api.onrender.com/auth/google/login`

Expected: Redirects to Google OAuth page

### 3. Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try logging in
4. Look for errors

### 4. Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try logging in
4. Check the requests:
   - Should see redirect to `/auth/google/login`
   - Should see redirect to Google
   - Should see redirect back to `/auth/google/callback`
   - Should see redirect to `/auth/callback`

## After Fixing

### Deploy Changes
```bash
git add apps/web/src/app/login/page.tsx
git commit -m "fix: Use environment variable for Google OAuth URL"
git push origin main
```

Vercel will automatically redeploy the frontend.

### Verify Fix
1. Wait for Vercel deployment to complete (~2 minutes)
2. Visit: https://offmess.vercel.app/login
3. Click "Student" → "Sign in with IIT ISM Google"
4. Should redirect to Google OAuth
5. Sign in with @iitism.ac.in account
6. Should redirect back and log you in

## Still Not Working?

### Check Render Logs
1. Go to: https://dashboard.render.com
2. Click on "offmess-api"
3. Click "Logs" tab
4. Try logging in again
5. Look for error messages

### Check Vercel Logs
1. Go to: https://vercel.com/dashboard
2. Click on "offmess"
3. Click "Deployments"
4. Click on latest deployment
5. Click "View Function Logs"
6. Try logging in again
7. Look for error messages

### Common Log Errors

**"OAuth error: ..."**
- Check Google OAuth credentials are correct
- Verify redirect URI matches exactly

**"CORS error"**
- Check FRONTEND_URL is set correctly
- Verify CORS middleware includes Vercel domain

**"Database error"**
- Check database is accessible
- Verify migrations have run

## Need More Help?

1. Check Render environment variables are all set
2. Check Vercel environment variables are all set
3. Check Google Console settings match exactly
4. Try clearing browser cookies and cache
5. Try in incognito/private browsing mode
6. Check both Render and Vercel logs for errors
