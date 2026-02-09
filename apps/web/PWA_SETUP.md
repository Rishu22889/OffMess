# PWA Setup - Campus Canteen App

Your website is now configured as a **Progressive Web App (PWA)**! Students can install it on their phones like a native app.

## ✅ What's Been Set Up

1. **PWA Manifest** (`public/manifest.json`) - App configuration
2. **Service Worker** (`public/sw.js`) - Offline support & caching
3. **Install Prompt** - Automatic popup asking users to install
4. **App Icons** - Created with OffMess branding (icon-192.png, icon-512.png, favicon.ico)
5. **Metadata** - Proper PWA metadata in layout

## 📱 How Students Install the App

### On Android (Chrome/Edge):
1. Open the website in Chrome
2. Tap the menu (3 dots) → "Install app" or "Add to Home Screen"
3. Or wait for the automatic install banner to appear
4. App icon will appear on home screen

### On iPhone (Safari):
1. Open the website in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right
5. App icon will appear on home screen

### On Desktop:
1. Open in Chrome/Edge
2. Look for install icon in address bar
3. Click "Install"

## 🎨 App Icons

App icons have been created from the OffMess logo:
- `public/icon-192.png` - 192x192 pixels
- `public/icon-512.png` - 512x512 pixels  
- `public/favicon.ico` - 32x32 pixels

The icons are generated from `web_logo.png` and match the website branding.

If you want to customize the icons further, you can:

### Option 1: Use a Design Tool
- Use Canva, Figma, or Photoshop
- Create a 512x512px square image
- Use your canteen logo or food emoji (🍔)
- Background: Orange (#f97316) or Dark (#171717)
- Export as PNG and replace the existing files

### Option 2: Use Online Generator
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload your logo/image
3. Download the generated icons
4. Replace the files in `public/` if you want different icons

### Option 3: Use ImageMagick
```bash
# Use ImageMagick to create custom icons
magick -size 512x512 xc:#f97316 -gravity center -pointsize 300 -annotate +0+0 "🍔" icon-512.png
magick icon-512.png -resize 192x192 icon-192.png
magick icon-512.png -resize 32x32 favicon.ico
```

## 🚀 Features Enabled

### ✅ Works Offline
- Service worker caches pages
- Students can view orders even without internet

### ✅ Push Notifications
- Real-time order updates
- Works even when app is closed

### ✅ Home Screen Icon
- Looks like a native app
- No browser UI when opened

### ✅ Fast Loading
- Cached resources load instantly
- Better performance than website

### ✅ Installable
- Automatic install prompt
- Can be installed from browser menu

## 🔧 Testing the PWA

### Test on Phone:
1. Deploy your website to a server (must be HTTPS)
2. Open on phone browser
3. Install the app
4. Test offline mode (turn off wifi)
5. Test notifications

### Test Locally:
1. Run `npm run build` in `apps/web`
2. Run `npm start` to serve production build
3. Open in Chrome
4. Open DevTools → Application → Service Workers
5. Check "Offline" to test offline mode

## 📊 PWA Checklist

- [x] Manifest file configured
- [x] Service worker registered
- [x] Install prompt added
- [x] Metadata configured
- [x] App icons created (icon-192.png, icon-512.png, favicon.ico)
- [ ] Deployed to HTTPS server
- [ ] Tested on real devices

## 🌐 Deployment Requirements

For PWA to work properly:
1. **HTTPS Required** - PWA only works on HTTPS (not HTTP)
2. **Valid SSL Certificate** - Use Let's Encrypt (free)
3. **Service Worker** - Must be served from same origin

### Recommended Hosting:
- **Vercel** (easiest for Next.js) - Free HTTPS
- **Netlify** - Free HTTPS
- **Railway** - For backend + frontend
- **Your own server** - Need to setup HTTPS

## 🎯 Next Steps

1. **Create proper app icons** (most important!)
2. **Deploy to HTTPS server**
3. **Test on real phones**
4. **Share install link with students**
5. **Monitor PWA analytics**

## 📱 User Benefits

Students will love the app because:
- ✅ No app store download needed
- ✅ Takes up less space than native app
- ✅ Instant updates (no app store approval)
- ✅ Works offline
- ✅ Push notifications
- ✅ Feels like a native app

## 🐛 Troubleshooting

**Install button doesn't appear:**
- Make sure you're on HTTPS
- Clear browser cache
- Check service worker is registered (DevTools → Application)

**Notifications don't work:**
- User must grant notification permission
- Service worker must be active
- Must be on HTTPS

**Icons don't show:**
- Replace placeholder icon files
- Clear cache and reinstall app
- Check icon paths in manifest.json

## 📚 Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker Guide](https://developers.google.com/web/fundamentals/primers/service-workers)
- [Manifest Generator](https://www.pwabuilder.com/)
- [Icon Generator](https://www.pwabuilder.com/imageGenerator)
