# 🚀 Deployment Checklist

## ✅ Code Changes Complete

- [x] Order number format (YYYYMMDD-XXXX)
- [x] Dark mode locked
- [x] Profile tab in Campus Admin navbar
- [x] Test hostels removed
- [x] QR code library updated (qrcode.react → qrcode)
- [x] Backup files removed
- [x] CORS updated to include Vercel domain
- [x] OAuth redirects use FRONTEND_URL setting
- [x] Cookie settings updated for production (samesite=none, secure=true)

## 📦 Current Deployment Status

### Backend (Render.com)
- **URL**: https://offmess-api.onrender.com
- **Status**: Deployed ✅
- **Last Updated**: Check Render dashboard

### Frontend (Vercel)
- **URL**: https://offmess.vercel.app
- **Status**: Deployed ✅
- **Last Updated**: Check Vercel dashboard

## 🔧 Configuration Required

### 1. Backend Environment Variables (Render)

Go to: https://dashboard.render.com → offmess-api → Environment

Set these variables:
```
JWT_SECRET=<generate with: openssl rand -hex 32>
DATABASE_URL=sqlite:///./canteen.db
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
ALLOWED_DOMAIN=iitism.ac.in
GOOGLE_REDIRECT_URI=https://offmess-api.onrender.com/auth/google/callback
FRONTEND_URL=https://offmess.vercel.app
PYTHON_VERSION=3.11.0
```

### 2. Frontend Environment Variables (Vercel)

Go to: https://vercel.com/dashboard → offmess → Settings → Environment Variables

Set these variables:
```
NEXT_PUBLIC_API_URL=https://offmess-api.onrender.com
NEXT_PUBLIC_WS_URL=wss://offmess-api.onrender.com
```

### 3. Google OAuth Configuration

Go to: https://console.cloud.google.com → APIs & Services → Credentials

**Authorized redirect URIs:**
```
https://offmess-api.onrender.com/auth/google/callback
```

**Authorized JavaScript origins:**
```
https://offmess.vercel.app
https://offmess-api.onrender.com
```

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Homepage loads at https://offmess.vercel.app
- [ ] Dark mode is active (no theme toggle visible)
- [ ] Logo and styling look correct

### Authentication
- [ ] Google OAuth login works
- [ ] User is redirected back to app after login
- [ ] Session persists across page refreshes
- [ ] Logout works

### Student Features
- [ ] Can view canteens list
- [ ] Can view canteen menu
- [ ] Can place an order
- [ ] Order number shows as YYYYMMDD-XXXX format
- [ ] Can view order status
- [ ] Can view order history
- [ ] Profile page works

### Canteen Admin Features
- [ ] Dashboard shows incoming orders
- [ ] Can accept/decline orders
- [ ] Can update order status
- [ ] Can toggle menu item availability
- [ ] Can update canteen profile
- [ ] Can toggle accepting orders

### Campus Admin Features
- [ ] Campus stats page works
- [ ] Can view hostels list
- [ ] Can manage hostels
- [ ] Can view/edit mess menu
- [ ] Profile tab is visible in navbar
- [ ] Profile page works

### PWA Features
- [ ] Manifest.json loads correctly
- [ ] Service worker registers
- [ ] App is installable on mobile
- [ ] Icons display correctly
- [ ] Offline functionality works

## 🐛 Common Issues & Solutions

### Issue: "redirect_uri_mismatch" error
**Solution**: 
1. Check GOOGLE_REDIRECT_URI in Render matches Google Console exactly
2. Must be: `https://offmess-api.onrender.com/auth/google/callback`

### Issue: CORS errors in browser console
**Solution**:
1. Verify FRONTEND_URL is set in Render environment variables
2. Check that backend CORS includes `https://offmess.vercel.app`
3. Redeploy backend after changing environment variables

### Issue: Cookies not being set
**Solution**:
1. Check that FRONTEND_URL starts with `https://`
2. Verify cookie settings use `samesite=none` and `secure=true` for production
3. Clear browser cookies and try again

### Issue: Backend not responding
**Solution**:
1. Render free tier sleeps after 15 minutes of inactivity
2. First request after sleep takes ~30 seconds
3. Check Render logs for errors

### Issue: Build fails on Vercel
**Solution**:
1. Check build logs for specific error
2. Verify no backup files exist (page_backup.tsx, etc.)
3. Ensure all imports are correct
4. Check that qrcode package is installed (not qrcode.react)

## 📝 Next Steps After Deployment

1. **Monitor Logs**
   - Render: https://dashboard.render.com → offmess-api → Logs
   - Vercel: https://vercel.com/dashboard → offmess → Deployments → View Function Logs

2. **Test with Real Users**
   - Share URL with a few test users
   - Collect feedback
   - Monitor for errors

3. **Optional Improvements**
   - Set up custom domain
   - Add error tracking (Sentry)
   - Set up monitoring/alerts
   - Consider PostgreSQL for production database

4. **Documentation**
   - Update README with production URLs
   - Document any deployment-specific configurations
   - Create user guide for students/admins

## 🎉 Deployment Complete!

Once all checkboxes are ticked, your app is live and ready for use!

**Production URLs:**
- Frontend: https://offmess.vercel.app
- Backend: https://offmess-api.onrender.com
