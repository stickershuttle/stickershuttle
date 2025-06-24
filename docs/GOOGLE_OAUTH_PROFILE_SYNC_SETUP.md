# Google OAuth Profile Sync Setup Guide

This guide shows you how to automatically sync first and last names from Google OAuth accounts to your user profiles.

## What This Does

When users sign up or log in with Google, their first and last names will automatically be:
1. **Extracted** from their Google account information
2. **Stored** in your `user_profiles` table 
3. **Displayed** properly in the admin credits page instead of "Unknown"

## Step 1: Run the Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Run the migration file
-- This creates the trigger that automatically syncs Google OAuth data
```

Or use the Supabase CLI:
```bash
supabase migration new google_oauth_profile_sync
# Copy the contents of supabase/migrations/003_google_oauth_profile_sync.sql
supabase db push
```

## Step 2: Run the Email Function (if you haven't already)

Make sure you've also run the email function from the previous fix:

```sql
-- Create function to get user emails for admin purposes
CREATE OR REPLACE FUNCTION get_user_emails_for_admin(user_ids UUID[])
RETURNS TABLE(id UUID, email TEXT) AS $$
BEGIN
  IF auth.jwt() ->> 'role' != 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Service role required.';
  END IF;
  
  RETURN QUERY
    SELECT au.id, au.email::TEXT
    FROM auth.users au
    WHERE au.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_emails_for_admin(UUID[]) TO service_role;
```

## Step 3: Sync Existing Google OAuth Users (One-Time)

To sync users who signed up with Google before this trigger was active:

```sql
-- Run this one-time migration to sync existing Google OAuth users
SELECT * FROM sync_existing_google_oauth_users();
```

## Step 4: Verify Google OAuth Configuration

Make sure your Supabase Google OAuth is configured to request the right scopes:

### In Supabase Dashboard:
1. Go to **Authentication** → **Providers** → **Google**
2. Make sure these scopes are included:
   - `openid`
   - `email` 
   - `profile`

### Optional: Enhanced OAuth Configuration

You can also modify your frontend OAuth calls to explicitly request profile information:

```typescript
// In your login/signup pages
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    scopes: 'openid email profile',
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    redirectTo: `${window.location.origin}/account/dashboard`
  }
});
```

## How It Works

### Data Extraction Priority:
1. **Google's standard fields**: `given_name`, `family_name`
2. **Alternative fields**: `first_name`, `last_name` 
3. **Full name splitting**: If only `full_name` or `name` is provided, it splits on the first space

### Smart Updating:
- **Won't overwrite** existing name data with empty values
- **Only updates** when new/better data is available
- **Handles edge cases** like single names or unusual formatting

### Example Data Flow:

```
Google Account: "John Smith" 
↓
OAuth Data: { "given_name": "John", "family_name": "Smith" }
↓
Database Trigger: Extracts names and creates user_profile
↓
Credits Page: Shows "John Smith" instead of "Unknown"
```

## Testing

1. **Create a test Google account** or use an existing one
2. **Sign up/log in** to your app with Google OAuth
3. **Check the user_profiles table**:
   ```sql
   SELECT user_id, first_name, last_name, created_at 
   FROM user_profiles 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
4. **Verify in admin credits page** - should show proper names

## Troubleshooting

### Names Still Showing as "Unknown"
1. Check if the trigger is installed: `\d auth.users` in psql
2. Verify user_profiles table has data: `SELECT COUNT(*) FROM user_profiles;`
3. Check the logs for trigger execution errors

### Google OAuth Not Providing Names
1. Verify scopes in Supabase Google OAuth config
2. Check `raw_user_meta_data` column in `auth.users` table
3. Ensure users are consenting to profile access during OAuth

### Existing Users Not Synced
Run the one-time migration: `SELECT * FROM sync_existing_google_oauth_users();`

## Files Created/Modified

1. `supabase/migrations/003_google_oauth_profile_sync.sql` - Main migration
2. `docs/CREATE_GOOGLE_OAUTH_SYNC_TRIGGER.sql` - Complete setup with migration function
3. `api/credit-handlers.js` - Updated user data fetching
4. `frontend/src/pages/admin/credits.tsx` - Fixed View Order links

## Security Notes

- Trigger runs with `SECURITY DEFINER` (admin privileges)
- Only processes OAuth data, never overwrites manual entries
- Follows principle of least surprise - won't delete existing data
- Service role permissions properly restricted 