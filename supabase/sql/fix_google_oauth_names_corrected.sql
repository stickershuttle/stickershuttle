-- Fix existing Google OAuth users who are missing first_name and last_name
-- Run these queries one by one in your Supabase SQL Editor

-- Step 1: Check if we can access auth.users table
SELECT COUNT(*) as total_auth_users FROM auth.users;

-- Step 2: Check how many users are affected (corrected syntax)
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN (user_metadata->>'first_name' IS NULL OR user_metadata->>'first_name' = '') THEN 1 END) as missing_first_name,
  COUNT(CASE WHEN (user_metadata->>'last_name' IS NULL OR user_metadata->>'last_name' = '') THEN 1 END) as missing_last_name,
  COUNT(CASE WHEN (app_metadata->>'provider' = 'google') THEN 1 END) as google_users
FROM auth.users;

-- Step 3: See what Google OAuth metadata looks like
SELECT 
  email,
  user_metadata,
  app_metadata
FROM auth.users 
WHERE app_metadata->>'provider' = 'google'
LIMIT 5;

-- Step 4: Update Google OAuth users who are missing names
UPDATE auth.users 
SET user_metadata = COALESCE(user_metadata, '{}'::jsonb) || jsonb_build_object(
  'first_name', 
  CASE 
    WHEN COALESCE(user_metadata->>'given_name', '') != '' THEN user_metadata->>'given_name'
    WHEN COALESCE(user_metadata->>'full_name', '') != '' THEN split_part(user_metadata->>'full_name', ' ', 1)
    WHEN COALESCE(user_metadata->>'name', '') != '' THEN split_part(user_metadata->>'name', ' ', 1)
    ELSE split_part(email, '@', 1)
  END,
  'last_name',
  CASE 
    WHEN COALESCE(user_metadata->>'family_name', '') != '' THEN user_metadata->>'family_name'
    WHEN COALESCE(user_metadata->>'full_name', '') != '' THEN substring(user_metadata->>'full_name' from position(' ' in user_metadata->>'full_name') + 1)
    WHEN COALESCE(user_metadata->>'name', '') != '' THEN substring(user_metadata->>'name' from position(' ' in user_metadata->>'name') + 1)
    ELSE ''
  END,
  'full_name',
  CASE 
    WHEN COALESCE(user_metadata->>'full_name', '') != '' THEN user_metadata->>'full_name'
    WHEN COALESCE(user_metadata->>'name', '') != '' THEN user_metadata->>'name'
    WHEN COALESCE(user_metadata->>'given_name', '') != '' AND COALESCE(user_metadata->>'family_name', '') != '' 
      THEN user_metadata->>'given_name' || ' ' || user_metadata->>'family_name'
    ELSE split_part(email, '@', 1)
  END,
  'name_extracted_from_oauth', true,
  'oauth_provider', 'google'
)
WHERE app_metadata->>'provider' = 'google'
  AND (
    COALESCE(user_metadata->>'first_name', '') = '' 
    OR COALESCE(user_metadata->>'last_name', '') = ''
  );

-- Step 5: Update corresponding user_profiles table
UPDATE user_profiles 
SET 
  first_name = COALESCE(auth_users.user_metadata->>'first_name', ''),
  last_name = COALESCE(auth_users.user_metadata->>'last_name', ''),
  display_name = COALESCE(auth_users.user_metadata->>'full_name', ''),
  updated_at = NOW()
FROM auth.users as auth_users
WHERE user_profiles.user_id = auth_users.id
  AND auth_users.app_metadata->>'provider' = 'google'
  AND (
    COALESCE(user_profiles.first_name, '') = '' 
    OR COALESCE(user_profiles.last_name, '') = ''
  );

-- Step 6: Show the results
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
