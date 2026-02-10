# Canteen Admin Email Creation Fix

## Problem
When a campus admin created a new canteen, there was no canteen admin user yet. When trying to add an email to create the canteen admin account, the system returned "Canteen admin not found" error because the endpoint only supported updating existing admin emails, not creating new admins.

## Solution
Modified the `/campus/canteens/{canteen_id}/admin-email` endpoint to handle both scenarios:

### Backend Changes (`apps/api/app/main.py`)
1. **Check if canteen admin exists**
   - If exists: Update the email (existing behavior)
   - If doesn't exist: Create new canteen admin user

2. **New admin creation includes:**
   - Generate secure 8-character temporary password (letters + digits)
   - Create User with role CANTEEN_ADMIN
   - Set email, hashed password, canteen_id
   - Set default name as "{Canteen Name} Admin"
   - Return temporary password in response

3. **Response format:**
   ```json
   {
     "status": "ok",
     "message": "Canteen admin created successfully",
     "user": { ... },
     "is_new_user": true,
     "temporary_password": "Abc12345"
   }
   ```

### Frontend Changes (`apps/web/src/app/campus/page.tsx`)
1. **Handle new response format**
   - Check if `is_new_user` is true
   - If true, show alert with temporary password
   - Alert includes email and password for campus admin to share

2. **User experience:**
   - Campus admin sees popup with credentials
   - Can copy and share with canteen admin
   - Canteen admin can login and change password

## Testing Flow
1. Campus admin creates new canteen
2. Campus admin adds email for canteen admin
3. System creates canteen admin account with temporary password
4. Campus admin receives popup with credentials
5. Campus admin shares credentials with canteen admin
6. Canteen admin logs in with temporary password
7. Canteen admin changes password in profile

## Security Considerations
- Temporary password is 8 characters (secure enough for initial setup)
- Password is hashed before storage (bcrypt)
- Password shown only once to campus admin
- Canteen admin should change password after first login
- Email uniqueness is validated before creation

## Files Modified
- `apps/api/app/main.py` (lines 1259-1330)
- `apps/web/src/app/campus/page.tsx` (lines 253-278)
