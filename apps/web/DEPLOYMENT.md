# OffMess - Vercel Deployment Guide

## ✅ Pre-Deployment Checklist

- [x] App name changed to "OffMess" everywhere
- [x] PWA manifest configured
- [x] Service worker setup
- [x] App icons created (icon-192.png, icon-512.png, favicon.ico)
- [ ] Environment variables configured
- [ ] Backend deployed
- [ ] Frontend deployed

## 🚀 Step 1: Deploy Backend (FastAPI)

### Option A: Railway (Recommended)
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set root directory: `apps/api`
5. Add environment variables:
   ```
   JWT_SECRET=your-secret-key-here
   DATABASE_URL=sqlite:///./canteen.db
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ALLOWED_DOMAIN=iitism.ac.in
   ```
6. Deploy!
7. Copy the deployment URL (e.g., `https://your-app.railway.app`)

### Option B: Render
1. Go to https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Root directory: `apps/api`
5. Build command: `pip install -r requirements.txt`
6. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Add environment variables (same as above)
8. Deploy!

## 🌐 Step 2: Deploy Frontend (Next.js) to Vercel

### Prerequisites:
1. Push all changes to GitHub
2. Make sure icons are created and committed
3. Have backend URL ready

### Deployment Steps:

1. **Go to Vercel**
   - Visit https://vercel.com
   - Sign in with GitHub

2. **Import Project**
   - Click "Add New" → "Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Project**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: **apps/web**
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

4. **Environment Variables**
   Add these in Vercel dashboard:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
   NEXT_PUBLIC_WS_URL=wss://your-backend-url.railway.app
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app will be live at `https://your-app.vercel.app`

## 🔧 Step 3: Update Backend CORS

After deploying frontend, update backend CORS settings:

1. Edit `apps/api/app/main.py`
2. Update CORS origins:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=[
           "http://localhost:3000",
           "https://your-app.vercel.app",  # Add your Vercel URL
       ],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```
3. Commit and push
4. Backend will auto-redeploy

## 📱 Step 4: Test PWA Installation

1. Open your Vercel URL on phone
2. You should see "Install App" prompt
3. Install it
4. Test:
   - Place an order
   - Check notifications
   - Test offline mode (turn off wifi)
   - Verify icons look good

## 🎯 Custom Domain (Optional)

### Add Custom Domain to Vercel:
1. Go to Vercel project settings
2. Domains → Add Domain
3. Enter your domain (e.g., `offmess.yourdomain.com`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate (automatic)

### Update Backend CORS:
Add your custom domain to CORS origins in backend

## 🔐 Environment Variables Reference

### Backend (Railway/Render):
```env
JWT_SECRET=generate-random-secret-key
DATABASE_URL=sqlite:///./canteen.db
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret
ALLOWED_DOMAIN=iitism.ac.in
GOOGLE_REDIRECT_URI=https://your-frontend.vercel.app/auth/callback
```

### Frontend (Vercel):
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app
```

## 🐛 Troubleshooting

### Icons not showing:
- Make sure icon files exist in `apps/web/public/`
- Clear browser cache
- Reinstall PWA

### CORS errors:
- Check backend CORS settings include your Vercel URL
- Make sure URLs don't have trailing slashes

### Notifications not working:
- HTTPS is required (Vercel provides this automatically)
- User must grant permission
- Check browser console for errors

### Database issues:
- For production, consider PostgreSQL instead of SQLite
- Railway provides free PostgreSQL database

## 📊 Post-Deployment

1. **Monitor**:
   - Check Vercel Analytics
   - Monitor Railway logs
   - Test all features

2. **Share**:
   - Share URL with students
   - Create QR code for easy access
   - Add to campus website

3. **Maintain**:
   - Monitor error logs
   - Update dependencies
   - Add new features

## 🎉 Success Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed on Vercel
- [ ] App icons visible
- [ ] PWA installable on phone
- [ ] Notifications working
- [ ] Orders can be placed
- [ ] Admin dashboard working
- [ ] Custom domain configured (optional)

## 📞 Need Help?

Common issues:
1. **Build fails**: Check Node.js version (use 18.x or higher)
2. **API not connecting**: Verify environment variables
3. **Icons missing**: Create and commit icon files first
4. **CORS errors**: Update backend allowed origins

Your app is ready to deploy! Follow the steps above and you'll have OffMess live in minutes! 🚀
