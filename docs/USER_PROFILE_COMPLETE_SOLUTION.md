# Complete User Profile Solution

## Problem Solved
Users signing up during checkout weren't getting profiles created in the `user_profiles` table because:
1. The original trigger required auth schema permissions (which we don't have)
2. Only Google OAuth users had automatic profile creation
3. Email/password signups were completely ignored

## Solution Overview
Since we can't create triggers on `auth.users` due to permissions, we use a **function-based approach** with manual profile creation after signup.

## Implementation Steps

### 1. Database Functions (✅ DONE)
**File:** `docs/CREATE_USER_PROFILE_TRIGGER_NO_AUTH_PERMS.sql`

**Functions created:**
- `update_user_profile_names()` - Updates existing profiles with names
- `create_user_profile()` - Creates new profiles (used by frontend)
- `create_missing_user_profiles()` - One-time migration for existing users
- `sync_google_oauth_users()` - Sync Google OAuth users specifically

### 2. Run Initial Migration (✅ DONE)
**File:** `docs/RUN_MISSING_PROFILES_MIGRATION.sql`

Creates profiles for all existing users who don't have them.

### 3. GraphQL Integration (✅ DONE)
**Backend:** Added to `api/index.js`
- Added `createUserProfile` mutation to GraphQL schema
- Added resolver for `createUserProfile` mutation

**Frontend:** Added to `frontend/src/lib/profile-mutations.js`
- Added `CREATE_USER_PROFILE` mutation
- Updated imports in cart component

### 4. Cart Checkout Integration (✅ DONE)
**File:** `frontend/src/pages/cart.tsx`

Now automatically creates user profiles during checkout signup:
- Uses `createUserProfile` mutation after successful email verification
- Passes first name and last name from guest checkout form
- Handles errors gracefully without blocking checkout

## How It Works

### For New Users (Email/Password Signup)
1. User fills out guest checkout form with name and email
2. System sends OTP for email verification
3. User verifies email with 6-digit code
4. **NEW:** System automatically calls `createUserProfile()` with their names
5. User profile is created in `user_profiles` table
6. Checkout proceeds normally

### For Existing Users (Google OAuth)
1. Use the migration script to create profiles for existing OAuth users
2. Future OAuth users will need profiles created manually (can be added later)

### For Admin (One-time Cleanup)
1. Run the migration to create profiles for all existing users
2. Check results with the verification queries

## Files Modified/Created

### New Files:
- `docs/CREATE_USER_PROFILE_TRIGGER_NO_AUTH_PERMS.sql` - Main database functions
- `docs/RUN_MISSING_PROFILES_MIGRATION.sql` - Migration script
- `docs/USER_PROFILE_COMPLETE_SOLUTION.md` - This documentation

### Modified Files:
- `api/index.js` - Added GraphQL schema and resolver
- `frontend/src/lib/profile-mutations.js` - Added CREATE_USER_PROFILE mutation
- `frontend/src/pages/cart.tsx` - Integrated profile creation into checkout

## Database Commands to Run

```sql
-- 1. First, run the functions (copy/paste entire file)
-- Execute: docs/CREATE_USER_PROFILE_TRIGGER_NO_AUTH_PERMS.sql

-- 2. Then run the migration to create profiles for existing users
-- Execute: docs/RUN_MISSING_PROFILES_MIGRATION.sql

-- 3. Verify everything worked
SELECT 
  COUNT(DISTINCT au.id) as total_users,
  COUNT(DISTINCT up.user_id) as users_with_profiles,
  COUNT(DISTINCT au.id) - COUNT(DISTINCT up.user_id) as missing_profiles
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id;
```

## Testing

### Test New User Signup
1. Go to cart page (not logged in)
2. Add items to cart
3. Fill out checkout form with first/last name
4. Complete email verification
5. Check `user_profiles` table - should have new profile with names

### Test Existing Users
1. Run migration script
2. Check that all existing users now have profiles
3. OAuth users should have names extracted from their metadata

## Benefits

✅ **No Auth Permissions Required** - Works around Supabase auth schema limitations
✅ **Automatic Profile Creation** - New users get profiles during checkout
✅ **Backward Compatible** - Existing users get profiles via migration
✅ **Name Extraction** - Pulls names from OAuth metadata where available
✅ **Error Handling** - Graceful failure doesn't block checkout
✅ **Manual Override** - Admins can create/update profiles manually

## Future Enhancements

1. **Auto-create for OAuth users** - Add profile creation to OAuth flow
2. **Profile completion prompts** - Encourage users to complete their profiles
3. **Bulk profile updates** - Admin tools for managing user profiles
4. **Profile sync** - Keep profiles in sync with auth metadata changes

## Troubleshooting

**Q: Users still don't have profiles after signup**
A: Check browser console for errors, verify GraphQL mutations are working

**Q: Migration didn't create all profiles**
A: Re-run the migration script, check for database errors

**Q: OAuth users missing names**
A: Run `sync_google_oauth_users()` function to extract names from metadata

**Q: Profile creation fails during checkout**
A: Check API logs, verify database functions exist and have correct permissions 