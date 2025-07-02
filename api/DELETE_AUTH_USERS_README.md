# Delete Auth Users While Preserving Profiles

## Overview

This script deletes all Supabase auth users except `justin@stickershuttle.com` while preserving all user profiles in the `user_profiles` table.

## What It Does

1. **Deletes auth users** - Removes users from Supabase authentication system
2. **Preserves profiles** - Keeps all data in the `user_profiles` table intact
3. **Protects admin** - Never deletes `justin@stickershuttle.com`
4. **Maintains data** - Order history and other user data remains untouched

## Usage

### Step 1: Navigate to API directory
```bash
cd api
```

### Step 2: List users that will be deleted (safe mode)
```bash
node delete-auth-users-keep-profiles.js
```

This will show you all users that would be deleted without actually deleting them.

### Step 3: Actually delete users
```bash
node delete-auth-users-keep-profiles.js --delete
```

This will:
- Show a warning and wait 5 seconds
- Delete all auth users except justin@stickershuttle.com
- Show deletion progress
- Confirm that user profiles are preserved

## Important Notes

⚠️ **WARNING**: After deletion, users will NOT be able to log in anymore!

✅ **SAFE**: User profiles, order history, and all associated data remain intact

🛡️ **PROTECTED**: `justin@stickershuttle.com` is never deleted

## What Happens to the Data?

- **Auth Users**: Deleted from Supabase auth system
- **User Profiles**: Remain in `user_profiles` table with `user_id` field
- **Orders**: Remain linked via `user_id` 
- **Other Data**: All user-related data is preserved

## Recovery

If you need to restore access for a user:
1. They would need to sign up again with the same email
2. You would need to manually link their new auth ID to their existing profile
3. Consider creating a migration script if you need to restore many users 