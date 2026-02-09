# Campus Admin Setup Guide

## 🔐 Create Your Campus Admin Account

Follow these steps to create your permanent campus admin account.

### Step 1: Get Your Setup Key

The setup key is the first 16 characters of your JWT_SECRET.

1. Go to: https://dashboard.render.com
2. Click on "offmess-api"
3. Go to "Environment" tab
4. Find `JWT_SECRET` value
5. Copy the **first 16 characters** only

Example: If JWT_SECRET is `abc123def456ghi789jkl012mno345pqr`, your setup key is `abc123def456ghi7`

### Step 2: Use the Registration Endpoint

You can register using either **curl** or **browser**.

#### Option A: Using curl (Terminal)

```bash
curl -X POST https://offmess-api.onrender.com/auth/register-campus-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-secure-password",
    "name": "Your Name",
    "phone_number": "1234567890",
    "setup_key": "YOUR_SETUP_KEY_HERE"
  }'
```

Replace:
- `your-email@example.com` - Your real email
- `your-secure-password` - A strong password
- `Your Name` - Your full name
- `1234567890` - Your phone number
- `YOUR_SETUP_KEY_HERE` - First 16 chars of JWT_SECRET

#### Option B: Using Browser (Postman/Insomnia)

1. Open Postman or Insomnia
2. Create a new POST request
3. URL: `https://offmess-api.onrender.com/auth/register-campus-admin`
4. Headers: `Content-Type: application/json`
5. Body (JSON):
```json
{
  "email": "your-email@example.com",
  "password": "your-secure-password",
  "name": "Your Name",
  "phone_number": "1234567890",
  "setup_key": "YOUR_SETUP_KEY_HERE"
}
```
6. Click Send

#### Option C: Using Python

```python
import requests

response = requests.post(
    "https://offmess-api.onrender.com/auth/register-campus-admin",
    json={
        "email": "your-email@example.com",
        "password": "your-secure-password",
        "name": "Your Name",
        "phone_number": "1234567890",
        "setup_key": "YOUR_SETUP_KEY_HERE"
    }
)

print(response.json())
```

### Step 3: Login

Once registered, you can login at:
https://offmess.vercel.app/login

1. Click "Admin"
2. Enter your email and password
3. You'll be redirected to the Campus Admin dashboard

## 🔒 Security Notes

- **Setup Key**: The setup key prevents unauthorized registration
- **One-Time Only**: You can only register ONE campus admin
- **Keep Credentials Safe**: Store your password securely
- **Change Password**: After first login, consider changing your password from the profile page

## ❌ Troubleshooting

### Error: "Invalid setup key"
- Double-check you copied the first 16 characters of JWT_SECRET correctly
- Make sure there are no extra spaces

### Error: "Campus admin already exists"
- An admin account has already been created
- If you need to reset, you'll need to manually delete the existing admin from the database

### Error: "Email already registered"
- This email is already in use
- Try a different email address

## 🎉 Success!

Once you see a success response with your user data, you're all set! You can now:
- Login at https://offmess.vercel.app/login
- Manage hostels
- Update mess menus
- View campus statistics
- Access your profile

## 📝 Example Success Response

```json
{
  "user": {
    "id": 1,
    "role": "CAMPUS_ADMIN",
    "email": "your-email@example.com",
    "name": "Your Name",
    "phone_number": "1234567890"
  },
  "access_token": "eyJ..."
}
```

If you see this, your account is created successfully!
