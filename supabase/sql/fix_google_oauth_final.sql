-- Fixed query for your Supabase setup
-- The users table exists in auth schema, let's query it correctly

-- Step 1: Test basic access to auth.users
SELECT COUNT(*) as total_users FROM auth.users;

-- Step 2: Check Google OAuth users and their metadata
SELECT 
  id,
  email,
  user_metadata,
  app_metadata,
  created_at
FROM auth.users 
WHERE app_metadata->>'provider' = 'google'
LIMIT 5;

-- Step 3: Count users missing names
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN (user_metadata->>'first_name' IS NULL OR user_metadata->>'first_name' = '') THEN 1 END) as missing_first_name,
  COUNT(CASE WHEN (user_metadata->>'last_name' IS NULL OR user_metadata->>'last_name' = '') THEN 1 END) as missing_last_name,
  COUNT(CASE WHEN (app_metadata->>'provider' = 'google') THEN 1 END) as google_users
FROM auth.users;

-- Step 4: Update Google OAuth users with missing names
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
    'full_name',
    COALESCE(
      user_metadata->>'full_name',
      user_metadata->>'name',
      COALESCE(user_metadata->>'given_name', '') || ' ' || COALESCE(user_metadata->>'family_name', ''),
      split_part(email, '@', 1)
    ),
    'name_extracted_from_oauth', true,
    'oauth_provider', 'google'
  )
WHERE app_metadata->>'provider' = 'google'
  AND (
    COALESCE(user_metadata->>'first_name', '') = '' 
    OR COALESCE(user_metadata->>'last_name', '') = ''
  );

-- Step 5: Update user_profiles table
UPDATE user_profiles 
SET 
  first_name = COALESCE(auth_users.user_metadata->>'first_name', ''),
  last_name = COALESCE(auth_users.user_metadata->>'last_name', ''),
  display_name = TRIM(COALESCE(auth_users.user_metadata->>'first_name', '') || ' ' || COALESCE(auth_users.user_metadata->>'last_name', '')),
  updated_at = NOW()
FROM auth.users as auth_users
WHERE user_profiles.user_id = auth_users.id
  AND auth_users.app_metadata->>'provider' = 'google'
  AND (
    COALESCE(user_profiles.first_name, '') = '' 
    OR COALESCE(user_profiles.last_name, '') = ''
  );

-- Step 6: Check results
SELECT 
  'Updated users' as status,
  COUNT(*) as count
FROM auth.users 
WHERE app_metadata->>'provider' = 'google'
  AND user_metadata->>'name_extracted_from_oauth' = 'true';

-- Step 7: Show sample of updated users
SELECT 
  email,
  user_metadata->>'first_name' as first_name,
  user_metadata->>'last_name' as last_name,
  user_metadata->>'full_name' as full_name,
  user_metadata->>'oauth_provider' as provider
FROM auth.users 
WHERE app_metadata->>'provider' = 'google'
  AND user_metadata->>'name_extracted_from_oauth' = 'true'
LIMIT 10;
