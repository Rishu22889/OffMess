# 🚀 OffMess - Complete Vercel Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Completed:
- [x] Order number format updated (YYYYMMDD-XXXX)
- [x] Dark mode locked
- [x] Profile tab added to Campus Admin navbar
- [x] Test hostels removed from mess menu
- [x] PWA configured
- [x] App icons ready

### 🔲 To Complete:
- [ ] Commit code to GitHub
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Configure environment variables
- [ ] Test deployment

---

## 🎯 Step 1: Commit Your Code to GitHub

### 1.1 Initialize Git (if not already done)
```bash
git init
git branch -M main
```

### 1.2 Add all files
```bash
git add .
```

### 1.3 Commit
```bash
git commit -m "feat: Complete OffMess app with order numbers, dark mode, and profile tab"
```

### 1.4 Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `offmess` (or your preferred name)
3. Make it **Private** (recommended for now)
4. **DO NOT** initialize with README (you already have one)
5. Click "Create repository"

### 1.5 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/offmess.git
git push -u origin main
```

---

## 🖥️ Step 2: Deploy Backend to Railway

### 2.1 Sign Up for Railway
1. Go to https://railway.app
2. Sign up with GitHub
3. Authorize Railway to access your repositories

### 2.2 Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `offmess` repository
4. Click "Deploy Now"

### 2.3 Configure Backend Service
1. After deployment starts, click on the service
2. Go to "Settings" tab
3. **Root Directory**: Set to `apps/api`
4. **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. **Build Command**: Leave empty (Railway auto-detects)

### 2.4 Add Environment Variables
Go to "Variables" tab and add:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_URL=sqlite:///./canteen.db
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
ALLOWED_DOMAIN=iitism.ac.in
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/auth/callback
```

**Important Notes:**
- Generate a strong JWT_SECRET: `openssl rand -hex 32`
- You'll update GOOGLE_REDIRECT_URI after deploying frontend
- For production, consider using PostgreSQL instead of SQLite

### 2.5 Get Your Backend URL
1. Go to "Settings" tab
2. Under "Domains", you'll see your Railway URL
3. Copy it (e.g., `https://offmess-production.up.railway.app`)
4. **Save this URL** - you'll need it for frontend deployment

### 2.6 Update CORS in Backend
Before deploying frontend, update `apps/api/app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-app.vercel.app",  # Add after Vercel deployment
        "https://*.vercel.app",  # Allow all Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Commit and push this change - Railway will auto-redeploy.

---

## 🌐 Step 3: Deploy Frontend to Vercel

### 3.1 Sign Up for Vercel
1. Go to https://vercel.com
2. Click "Sign Up"
3. Choose "Continue with GitHub"
4. Authorize Vercel

### 3.2 Import Project
1. Click "Add New..." → "Project"
2. Find your `offmess` repository
3. Click "Import"

### 3.3 Configure Build Settings
Vercel should auto-detect Next.js. Verify these settings:

- **Framework Preset**: Next.js
- **Root Directory**: `apps/web`
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### 3.4 Add Environment Variables
Click "Environment Variables" and add:

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app
```

**Replace** `your-backend.railway.app` with your actual Railway URL from Step 2.5

### 3.5 Deploy
1. Click "Deploy"
2. Wait 2-3 minutes for build to complete
3. You'll get a URL like `https://offmess.vercel.app`

### 3.6 Update Backend CORS
Now that you have your Vercel URL:

1. Go back to `apps/api/app/main.py`
2. Update CORS origins with your actual Vercel URL
3. Commit and push
4. Railway will auto-redeploy

### 3.7 Update Google OAuth Redirect URI
1. Go to Google Cloud Console
2. Update OAuth redirect URI to: `https://your-app.vercel.app/auth/callback`
3. Update Railway environment variable `GOOGLE_REDIRECT_URI`

---

## 🔧 Step 4: Update vercel.json

Update `apps/web/vercel.json` with your actual backend URL:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": ".next",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend.railway.app/:path*"
    }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/manifest+json"
        }
      ]
    }
  ]
}
```

Commit and push - Vercel will auto-redeploy.

---

## ✅ Step 5: Test Your Deployment

### 5.1 Test Frontend
1. Visit your Vercel URL
2. Check that the homepage loads
3. Verify logo and styling look correct

### 5.2 Test Authentication
1. Click "Login"
2. Try logging in with Google OAuth
3. Verify redirect works

### 5.3 Test Student Features
1. Login as a student
2. Browse canteens
3. Place an order
4. Check order status
5. View profile

### 5.4 Test Admin Features
1. Login as canteen admin
2. Check dashboard
3. Accept/decline orders
4. Update menu items

### 5.5 Test Campus Admin Features
1. Login as campus admin
2. View campus stats
3. Manage hostels
4. Update mess menu
5. Check profile tab

### 5.6 Test PWA
1. Open site on mobile device
2. Look for "Install App" prompt
3. Install the app
4. Test offline functionality
5. Check notifications

---

## 🎨 Step 6: Custom Domain (Optional)

### 6.1 Add Domain to Vercel
1. Go to your Vercel project
2. Settings → Domains
3. Add your domain (e.g., `offmess.yourdomain.com`)
4. Follow DNS configuration instructions

### 6.2 Update Backend CORS
Add your custom domain to CORS origins in backend

### 6.3 Update Google OAuth
Update redirect URI to use custom domain

---

## 🐛 Troubleshooting

### Build Fails on Vercel
- **Check Node version**: Vercel uses Node 18.x by default
- **Check build logs**: Look for specific error messages
- **Verify dependencies**: Make sure package.json is correct

### API Connection Issues
- **Verify environment variables**: Check NEXT_PUBLIC_API_URL is correct
- **Check CORS**: Make sure backend allows your Vercel domain
- **Test backend directly**: Visit your Railway URL to ensure it's running

### Icons Not Showing
- **Check file paths**: Icons should be in `apps/web/public/`
- **Clear cache**: Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
- **Check manifest**: Verify `manifest.json` has correct icon paths

### Google OAuth Not Working
- **Check redirect URI**: Must match exactly in Google Console
- **Verify credentials**: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
- **Check allowed domain**: ALLOWED_DOMAIN matches your institution

### Database Issues
- **SQLite limitations**: Consider PostgreSQL for production
- **Railway PostgreSQL**: Free tier available, more reliable
- **Data persistence**: SQLite on Railway may lose data on redeploy

---

## 📊 Post-Deployment Monitoring

### Vercel Analytics
1. Go to your project on Vercel
2. Click "Analytics" tab
3. Monitor page views, performance, errors

### Railway Logs
1. Go to your Railway project
2. Click on your service
3. View "Deployments" → "Logs"
4. Monitor for errors

### Error Tracking (Optional)
Consider adding:
- **Sentry** for error tracking
- **LogRocket** for session replay
- **Mixpanel** for analytics

---

## 🔐 Security Checklist

- [ ] JWT_SECRET is strong and unique
- [ ] Environment variables are not committed to git
- [ ] CORS is configured correctly (not using "*")
- [ ] Google OAuth credentials are secure
- [ ] Database has proper access controls
- [ ] HTTPS is enabled (automatic on Vercel)
- [ ] Rate limiting is configured (if needed)

---

## 🎉 Success Checklist

- [ ] Code committed to GitHub
- [ ] Backend deployed on Railway
- [ ] Frontend deployed on Vercel
- [ ] Environment variables configured
- [ ] Google OAuth working
- [ ] Students can place orders
- [ ] Admins can manage orders
- [ ] Campus admin can manage hostels/menus
- [ ] PWA installable on mobile
- [ ] Notifications working
- [ ] All features tested

---

## 📞 Quick Reference

### Important URLs
- **GitHub Repo**: https://github.com/YOUR_USERNAME/offmess
- **Railway Dashboard**: https://railway.app/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Backend URL**: https://your-backend.railway.app
- **Frontend URL**: https://your-app.vercel.app

### Commands
```bash
# Commit changes
git add .
git commit -m "your message"
git push

# Check deployment status
vercel --prod  # Deploy to production
vercel logs    # View logs
```

---

## 🚀 You're Ready to Deploy!

Follow the steps above in order, and your OffMess app will be live in about 30 minutes!

**Need help?** Check the troubleshooting section or review the logs on Railway/Vercel.

Good luck! 🎉
