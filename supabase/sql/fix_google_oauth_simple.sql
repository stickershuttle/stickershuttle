-- Alternative approach: Use Supabase's built-in functions
-- This should work in the Supabase SQL Editor

-- First, let's test basic access
SELECT COUNT(*) FROM auth.users;

-- If that works, try this simpler approach:
-- Step 1: See what we're working with
SELECT 
  id,
  email,
  user_metadata,
  app_metadata
FROM auth.users 
WHERE app_metadata->>'provider' = 'google'
LIMIT 3;

-- Step 2: Simple update for one user at a time (replace with actual email)
-- UPDATE auth.users 
-- SET user_metadata = COALESCE(user_metadata, '{}'::jsonb) || 
--   jsonb_build_object('first_name', 'Test', 'last_name', 'User')
-- WHERE email = 'your-email@gmail.com';

-- Step 3: Bulk update with proper null handling
UPDATE auth.users 
SET user_metadata = COALESCE(user_metadata, '{}'::jsonb) || 
  jsonb_build_object(
    'first_name', 
    COALESCE(
      user_metadata->>'given_name',
      split_part(COALESCE(user_metadata->>'full_name', email), ' ', 1)
    ),
    'last_name',
    COALESCE(
      user_metadata->>'family_name',
      CASE 
        WHEN position(' ' in COALESCE(user_metadata->>'full_name', '')) > 0 
        THEN substring(user_metadata->>'full_name' from position(' ' in user_metadata->>'full_name') + 1)
        ELSE ''
      END
    ),
    'name_extracted_from_oauth', true
  )
WHERE app_metadata->>'provider' = 'google'
  AND (
    COALESCE(user_metadata->>'first_name', '') = '' 
    OR COALESCE(user_metadata->>'last_name', '') = ''
  );

-- Step 4: Update user_profiles
UPDATE user_profiles 
SET 
  first_name = COALESCE(auth_users.user_metadata->>'first_name', ''),
  last_name = COALESCE(auth_users.user_metadata->>'last_name', ''),
  display_name = COALESCE(auth_users.user_metadata->>'first_name', '') || ' ' || COALESCE(auth_users.user_metadata->>'last_name', ''),
  updated_at = NOW()
FROM auth.users as auth_users
WHERE user_profiles.user_id = auth_users.id
  AND auth_users.app_metadata->>'provider' = 'google'
  AND (
    COALESCE(user_profiles.first_name, '') = '' 
    OR COALESCE(user_profiles.last_name, '') = ''
  );

-- Step 5: Check results
SELECT 
  email,
  user_metadata->>'first_name' as first_name,
  user_metadata->>'last_name' as last_name,
  user_metadata->>'name_extracted_from_oauth' as extracted
FROM auth.users 
WHERE app_metadata->>'provider' = 'google'
  AND user_metadata->>'name_extracted_from_oauth' = 'true'
LIMIT 10;
