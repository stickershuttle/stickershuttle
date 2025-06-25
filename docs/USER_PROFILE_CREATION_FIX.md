# User Profile Creation Fix

## Issue
Users who sign up during checkout (via email/password) were not getting user profiles created in the `user_profiles` table. Only Google OAuth users had profiles created automatically.

## Root Cause
The existing trigger only handled Google OAuth users (`raw_user_meta_data`) but ignored email/password signups that store data in `user_metadata`.

## Solution
Created a **universal trigger** that automatically creates user profiles for **all** signup types:

### What It Does
1. **OAuth Users** (Google, etc.) → Extracts names from `raw_user_meta_data`
2. **Email/Password Users** → Extracts names from `user_metadata` 
3. **Guest Checkout Users** → Extracts names from cart signup data
4. **Always Creates Profile** → Even if no names are available (basic profile)

### Data Sources Handled
- `raw_user_meta_data` (OAuth providers)
  - `given_name`, `family_name` (Google standard)
  - `first_name`, `last_name` (alternative)
  - `full_name`, `name` (splits on first space)
- `user_metadata` (email/password signups)
  - `first_name`, `last_name` (from cart checkout)
  - `full_name` (splits on first space)

## Files Changed

### 1. Fixed Order Processing
- `api/index.js` - Added proper error handling for Stripe session ID updates
- `api/stripe-webhook-handlers.js` - Added recovery mechanism for stuck orders

### 2. Universal User Profile Trigger
- `docs/CREATE_UNIVERSAL_USER_PROFILE_TRIGGER.sql` - Comprehensive solution
- `supabase/migrations/003_google_oauth_profile_sync.sql` - Updated migration

## Implementation Steps

### Step 1: Run the Universal Trigger (REQUIRED)
```sql
-- Run this in your Supabase SQL Editor
-- This will replace the old Google-only trigger with a universal one

-- Copy and paste the contents of:
-- docs/CREATE_UNIVERSAL_USER_PROFILE_TRIGGER.sql
```

### Step 2: Migrate Existing Users (RECOMMENDED)
```sql
-- Create profiles for users who don't have them yet
SELECT * FROM create_missing_user_profiles();
```

### Step 3: Verify Results
```sql
-- Check that profiles were created
SELECT 
  COUNT(*) as total_users,
  COUNT(up.user_id) as users_with_profiles,
  COUNT(CASE WHEN up.first_name IS NOT NULL OR up.last_name IS NOT NULL THEN 1 END) as users_with_names
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id;
```

## How It Works Now

### New User Signup Flow
1. **User signs up** (any method: OAuth, email/password, checkout)
2. **Trigger fires** automatically on `auth.users` INSERT/UPDATE
3. **Names extracted** from appropriate metadata source
4. **Profile created** in `user_profiles` table
5. **Available everywhere** (admin pages, order processing, etc.)

### Guest Checkout Signup Flow
1. User fills out checkout form (`firstName`, `lastName`, `email`)
2. Supabase auth signup with data in `user_metadata`
3. Trigger extracts names from `user_metadata.first_name/last_name`
4. User profile created immediately
5. Order processing continues with proper user context

## Benefits

✅ **All Users Get Profiles** - No more missing entries  
✅ **Automatic Name Extraction** - From any signup method  
✅ **Backwards Compatible** - Existing OAuth users unaffected  
✅ **Admin Pages Fixed** - No more "Unknown" names  
✅ **Order Processing Improved** - Proper user linking  
✅ **Future-Proof** - Handles new signup methods automatically  

## Testing

### Test OAuth Signup
1. Sign up with Google OAuth
2. Check `user_profiles` table for entry with names

### Test Email/Password Signup  
1. Use cart checkout signup flow
2. Fill in first/last name
3. Complete signup process
4. Check `user_profiles` table for entry

### Test Migration
```sql
-- Before migration
SELECT COUNT(*) FROM user_profiles;

-- Run migration
SELECT * FROM create_missing_user_profiles();

-- After migration (should be higher)
SELECT COUNT(*) FROM user_profiles;
```

## Monitoring

To monitor the trigger working:
```sql
-- Check recent profile creations
SELECT 
  au.email,
  up.first_name,
  up.last_name,
  up.created_at,
  CASE 
    WHEN au.raw_user_meta_data IS NOT NULL THEN 'OAuth'
    WHEN au.user_metadata IS NOT NULL THEN 'Email/Password'
    ELSE 'Unknown'
  END as signup_type
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
ORDER BY up.created_at DESC
LIMIT 10;
```

## Rollback (if needed)
If you need to rollback to the old Google-only system:
```sql
-- Drop universal trigger
DROP TRIGGER IF EXISTS universal_user_profile_trigger ON auth.users;

-- Recreate Google-only trigger (use old migration file)
-- docs/CREATE_GOOGLE_OAUTH_SYNC_TRIGGER.sql
``` 