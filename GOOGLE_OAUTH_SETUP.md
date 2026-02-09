# Google OAuth Setup for IIT ISM Students

## What's Been Implemented

✅ Google OAuth authentication for students with @iitism.ac.in domain
✅ Automatic user creation on first login
✅ Roll number extraction from email (e.g., 21je0001@iitism.ac.in → 21JE0001)
✅ Updated login page with "Sign in with Google" button
✅ OAuth callback handling

## Google Cloud Console Configuration

Your OAuth credentials are already configured:
- **Client ID**: `18061567250-4idkn152q82154aushr4sf4t712li0if.apps.googleusercontent.com`
- **Client Secret**: `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`

### Important: Update Authorized Redirect URIs

You need to add the redirect URI in Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to: **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:8000/auth/google/callback
   ```
6. For production, also add:
   ```
   https://yourdomain.com/auth/google/callback
   ```
7. Click **Save**

## How It Works

### Student Login Flow:
1. Student clicks "Sign in with IIT ISM Google" button
2. Redirected to Google OAuth consent screen
3. Student logs in with their @iitism.ac.in account
4. Google redirects back to `/auth/callback`
5. Backend verifies email domain is @iitism.ac.in
6. If first time: Creates new student account automatically
7. Sets authentication cookie and redirects to home page

### Email Validation:
- Only emails ending with `@iitism.ac.in` are allowed
- Other domains will be rejected with a 403 error

### Roll Number Extraction:
- Email: `21je0001@iitism.ac.in` → Roll: `21JE0001`
- Email: `22cs0123@iitism.ac.in` → Roll: `22CS0123`

## Testing

1. Start both servers:
   ```bash
   ./start.sh
   ```

2. Go to http://localhost:3000/login

3. Click "Sign in with IIT ISM Google"

4. Use a test @iitism.ac.in account (or your real one)

5. You'll be automatically logged in and redirected to home

## Files Modified

### Backend:
- `apps/api/app/config.py` - Added OAuth settings
- `apps/api/app/oauth.py` - New file for OAuth configuration
- `apps/api/app/main.py` - Added OAuth endpoints
- `apps/api/.env` - Added Google credentials
- `apps/api/requirements.txt` - Added authlib, httpx, itsdangerous

### Frontend:
- `apps/web/src/app/login/page.tsx` - Added Google sign-in button
- `apps/web/src/app/auth/callback/page.tsx` - New OAuth callback handler

## Environment Variables

The following are configured in `apps/api/.env`:

```env
GOOGLE_CLIENT_ID=18061567250-4idkn152q82154aushr4sf4t712li0if.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
ALLOWED_DOMAIN=iitism.ac.in
```

## Security Notes

- OAuth users get a dummy password hash (they can't use password login)
- Only @iitism.ac.in domain is allowed
- Session cookies are httpOnly and secure
- Roll numbers are automatically extracted and stored

## Troubleshooting

### "redirect_uri_mismatch" error:
- Make sure you added `http://localhost:3000/auth/callback` to authorized redirect URIs in Google Cloud Console

### "Only IIT ISM students allowed" error:
- The email must end with @iitism.ac.in
- Check the ALLOWED_DOMAIN setting in .env

### User not created:
- Check backend logs: `tail -f apps/api/server.log`
- Verify database: `sqlite3 apps/api/canteen.db "SELECT * FROM users WHERE email LIKE '%@iitism.ac.in'"`

## Production Deployment

For production, update:
1. `GOOGLE_REDIRECT_URI` in `.env` to your production URL
2. Add production redirect URI in Google Cloud Console
3. Use environment variables instead of .env file
4. Enable HTTPS for secure cookies
