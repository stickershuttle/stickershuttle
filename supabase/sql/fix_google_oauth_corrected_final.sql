-- Fixed query using the correct column names
-- raw_user_meta_data and raw_app_meta_data instead of user_metadata and app_metadata

-- Step 1: Test basic access
SELECT COUNT(*) as total_users FROM auth.users;

-- Step 2: Check Google OAuth users and their metadata
SELECT 
  id,
  email,
  raw_user_meta_data,
  raw_app_meta_data,
  created_at
FROM auth.users 
WHERE raw_app_meta_data->>'provider' = 'google'
LIMIT 5;

-- Step 3: Count users missing names
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN (raw_user_meta_data->>'first_name' IS NULL OR raw_user_meta_data->>'first_name' = '') THEN 1 END) as missing_first_name,
  COUNT(CASE WHEN (raw_user_meta_data->>'last_name' IS NULL OR raw_user_meta_data->>'last_name' = '') THEN 1 END) as missing_last_name,
  COUNT(CASE WHEN (raw_app_meta_data->>'provider' = 'google') THEN 1 END) as google_users
FROM auth.users;

-- Step 4: Update Google OAuth users with missing names
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'first_name', 
    COALESCE(
      raw_user_meta_data->>'given_name',
      split_part(COALESCE(raw_user_meta_data->>'full_name', email), ' ', 1)
    ),
    'last_name',
    COALESCE(
      raw_user_meta_data->>'family_name',
      CASE 
        WHEN position(' ' in COALESCE(raw_user_meta_data->>'full_name', '')) > 0 
        THEN substring(raw_user_meta_data->>'full_name' from position(' ' in raw_user_meta_data->>'full_name') + 1)
        ELSE ''
      END
    ),
    'full_name',
    COALESCE(
      raw_user_meta_data->>'full_name',
      raw_user_meta_data->>'name',
      COALESCE(raw_user_meta_data->>'given_name', '') || ' ' || COALESCE(raw_user_meta_data->>'family_name', ''),
      split_part(email, '@', 1)
    ),
    'name_extracted_from_oauth', true,
    'oauth_provider', 'google'
  )
WHERE raw_app_meta_data->>'provider' = 'google'
  AND (
    COALESCE(raw_user_meta_data->>'first_name', '') = '' 
    OR COALESCE(raw_user_meta_data->>'last_name', '') = ''
  );

-- Step 5: Update user_profiles table
UPDATE user_profiles 
SET 
  first_name = COALESCE(auth_users.raw_user_meta_data->>'first_name', ''),
  last_name = COALESCE(auth_users.raw_user_meta_data->>'last_name', ''),
  display_name = TRIM(COALESCE(auth_users.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(auth_users.raw_user_meta_data->>'last_name', '')),
  updated_at = NOW()
FROM auth.users as auth_users
WHERE user_profiles.user_id = auth_users.id
  AND auth_users.raw_app_meta_data->>'provider' = 'google'
  AND (
    COALESCE(user_profiles.first_name, '') = '' 
    OR COALESCE(user_profiles.last_name, '') = ''
  );

-- Step 6: Check results
SELECT 
  'Updated users' as status,
  COUNT(*) as count
FROM auth.users 
WHERE raw_app_meta_data->>'provider' = 'google'
  AND raw_user_meta_data->>'name_extracted_from_oauth' = 'true';

-- Step 7: Show sample of updated users
SELECT 
  email,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'oauth_provider' as provider
FROM auth.users 
WHERE raw_app_meta_data->>'provider' = 'google'
  AND raw_user_meta_data->>'name_extracted_from_oauth' = 'true'
LIMIT 10;
