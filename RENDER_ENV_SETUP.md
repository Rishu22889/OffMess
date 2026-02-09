# Render Environment Variables Setup

## Backend Environment Variables (Render.com)

When deploying to Render, add these environment variables in the "Environment" section:

### Required Variables

```env
# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=your-generated-secret-here

# Database
DATABASE_URL=sqlite:///./canteen.db

# Google OAuth Credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Domain Configuration
ALLOWED_DOMAIN=iitism.ac.in

# OAuth Redirect URI (your BACKEND URL + /auth/google/callback)
GOOGLE_REDIRECT_URI=https://offmess-api.onrender.com/auth/google/callback

# Frontend URL (your Vercel deployment URL)
FRONTEND_URL=https://offmess.vercel.app

# Python Version
PYTHON_VERSION=3.11.0
```

## Current Production URLs

- **Backend**: https://offmess-api.onrender.com
- **Frontend**: https://offmess.vercel.app

## Google OAuth Setup

### Authorized Redirect URIs (in Google Cloud Console)
Add this URL to your OAuth 2.0 Client:
```
https://offmess-api.onrender.com/auth/google/callback
```

### Authorized JavaScript Origins
Add these origins:
```
https://offmess.vercel.app
https://offmess-api.onrender.com
```

## Important Notes

1. **GOOGLE_REDIRECT_URI** must point to your BACKEND URL (where the OAuth callback handler is)
2. **FRONTEND_URL** is where users will be redirected after successful authentication
3. The redirect URI in Google Console must exactly match GOOGLE_REDIRECT_URI
4. After changing environment variables on Render, the service will automatically redeploy

## Testing

After setting up environment variables:

1. Visit: https://offmess.vercel.app
2. Click "Login with Google"
3. You should be redirected to Google OAuth
4. After authentication, you should be redirected back to the app
5. Check that you're logged in successfully

## Troubleshooting

### "redirect_uri_mismatch" error
- Check that GOOGLE_REDIRECT_URI matches the URL in Google Console exactly
- Make sure you saved changes in Google Console

### "invalid_domain" error
- Check that your email ends with @iitism.ac.in
- Verify ALLOWED_DOMAIN is set correctly

### CORS errors
- Verify FRONTEND_URL is set correctly in backend
- Check that CORS middleware includes your Vercel URL
