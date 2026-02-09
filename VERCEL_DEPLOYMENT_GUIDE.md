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
- [ ] Deploy backend to Render (or alternative)
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

## 🖥️ Step 2: Deploy Backend (Choose One Option)

### Option A: Render.com (Recommended - Free Tier Available)

#### 2.1 Sign Up for Render
1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

#### 2.2 Create New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select your `offmess` repository

#### 2.3 Configure Service
- **Name**: `offmess-api` (or your choice)
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: `apps/api`
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Instance Type**: `Free` (select free tier)

#### 2.4 Add Environment Variables
Click "Advanced" → "Add Environment Variable":

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_URL=sqlite:///./canteen.db
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
ALLOWED_DOMAIN=iitism.ac.in
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/auth/callback
PYTHON_VERSION=3.11.0
```

**Generate JWT_SECRET:**
```bash
openssl rand -hex 32
```

#### 2.5 Deploy
1. Click "Create Web Service"
2. Wait 5-10 minutes for first deployment
3. Your backend URL will be: `https://offmess-api.onrender.com`
4. **Save this URL** - you'll need it for frontend

**Note:** Free tier sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds.

---

### Option B: PythonAnywhere (Alternative Free Option)

#### 2.1 Sign Up
1. Go to https://www.pythonanywhere.com
2. Create a free "Beginner" account

#### 2.2 Upload Code
1. Go to "Files" tab
2. Upload your `apps/api` folder
3. Or clone from GitHub using console

#### 2.3 Create Web App
1. Go to "Web" tab
2. Click "Add a new web app"
3. Choose "Manual configuration"
4. Select Python 3.10

#### 2.4 Configure WSGI
1. Edit WSGI configuration file
2. Add:
```python
import sys
path = '/home/yourusername/apps/api'
if path not in sys.path:
    sys.path.append(path)

from app.main import app as application
```

#### 2.5 Install Dependencies
Open Bash console:
```bash
cd apps/api
pip install -r requirements.txt
```

#### 2.6 Set Environment Variables
In web app configuration, add environment variables

Your URL: `https://yourusername.pythonanywhere.com`

---

### Option C: Fly.io (Good Free Tier)

#### 2.1 Install Fly CLI
```bash
# macOS
brew install flyctl

# Or download from https://fly.io/docs/hands-on/install-flyctl/
```

#### 2.2 Sign Up and Login
```bash
flyctl auth signup
flyctl auth login
```

#### 2.3 Create fly.toml
Create `apps/api/fly.toml`:
```toml
app = "offmess-api"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  PORT = "8080"

[[services]]
  http_checks = []
  internal_port = 8080
  processes = ["app"]
  protocol = "tcp"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

#### 2.4 Deploy
```bash
cd apps/api
flyctl launch
flyctl secrets set JWT_SECRET=your-secret
flyctl secrets set GOOGLE_CLIENT_ID=your-id
flyctl secrets set GOOGLE_CLIENT_SECRET=your-secret
flyctl secrets set ALLOWED_DOMAIN=iitism.ac.in
flyctl deploy
```

Your URL: `https://offmess-api.fly.dev`

---

### 🎯 Recommended: Use Render.com

**Why Render?**
- ✅ Easy setup (similar to Railway)
- ✅ Free tier available
- ✅ Auto-deploys from GitHub
- ✅ Good performance
- ✅ SSL included
- ⚠️ Sleeps after 15 min inactivity (acceptable for campus use)

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

Commit and push this change - Render will auto-redeploy.

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
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-backend.onrender.com
```

**Replace** `your-backend.onrender.com` with your actual backend URL from Step 2.

**Note:** If using PythonAnywhere or Fly.io, use their respective URLs.

### 3.5 Deploy
1. Click "Deploy"
2. Wait 2-3 minutes for build to complete
3. You'll get a URL like `https://offmess.vercel.app`

### 3.6 Update Backend CORS
Now that you have your Vercel URL:

1. Go back to `apps/api/app/main.py`
2. Update CORS origins with your actual Vercel URL
3. Commit and push
4. Your backend will auto-redeploy (Render/Fly.io)

### 3.7 Update Google OAuth Redirect URI
1. Go to Google Cloud Console
2. Update OAuth redirect URI to: `https://your-app.vercel.app/auth/callback`
3. Update backend environment variable `GOOGLE_REDIRECT_URI` on your hosting platform

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
      "destination": "https://your-backend.onrender.com/:path*"
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

**Replace** `your-backend.onrender.com` with your actual backend URL.

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
- **Test backend directly**: Visit your backend URL to ensure it's running
- **Check logs**: Review logs on your hosting platform (Render/Fly.io/PythonAnywhere)

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
- **Render PostgreSQL**: Free PostgreSQL available on Render
- **Data persistence**: SQLite may lose data on redeploy (use PostgreSQL for production)

---

## 📊 Post-Deployment Monitoring

### Vercel Analytics
1. Go to your project on Vercel
2. Click "Analytics" tab
3. Monitor page views, performance, errors

### Backend Logs
**For Render:**
1. Go to your Render dashboard
2. Click on your service
3. View "Logs" tab

**For Fly.io:**
```bash
flyctl logs
```

**For PythonAnywhere:**
1. Go to "Web" tab
2. View error log and server log

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
- [ ] Backend deployed on Render (or alternative)
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
- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Backend URL**: https://your-backend.onrender.com (or your chosen platform)
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

**Need help?** Check the troubleshooting section or review the logs on Render/Vercel.

Good luck! 🎉
