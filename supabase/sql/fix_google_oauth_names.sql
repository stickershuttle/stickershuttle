-- Fix existing Google OAuth users who are missing first_name and last_name
-- This script extracts names from Google OAuth metadata and updates user profiles

-- First, let's see how many users are affected
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN user_metadata->>'first_name' IS NULL OR user_metadata->>'first_name' = '' THEN 1 END) as missing_first_name,
  COUNT(CASE WHEN user_metadata->>'last_name' IS NULL OR user_metadata->>'last_name' = '' THEN 1 END) as missing_last_name,
  COUNT(CASE WHEN app_metadata->>'provider' = 'google' THEN 1 END) as google_users
FROM auth.users;

-- Update Google OAuth users who are missing names
UPDATE auth.users 
SET user_metadata = user_metadata || jsonb_build_object(
  'first_name', 
  CASE 
    WHEN user_metadata->>'given_name' IS NOT NULL THEN user_metadata->>'given_name'
    WHEN user_metadata->>'full_name' IS NOT NULL THEN split_part(user_metadata->>'full_name', ' ', 1)
    WHEN user_metadata->>'name' IS NOT NULL THEN split_part(user_metadata->>'name', ' ', 1)
    ELSE split_part(email, '@', 1)
  END,
  'last_name',
  CASE 
    WHEN user_metadata->>'family_name' IS NOT NULL THEN user_metadata->>'family_name'
    WHEN user_metadata->>'full_name' IS NOT NULL THEN substring(user_metadata->>'full_name' from position(' ' in user_metadata->>'full_name') + 1)
    WHEN user_metadata->>'name' IS NOT NULL THEN substring(user_metadata->>'name' from position(' ' in user_metadata->>'name') + 1)
    ELSE ''
  END,
  'full_name',
  CASE 
    WHEN user_metadata->>'full_name' IS NOT NULL THEN user_metadata->>'full_name'
    WHEN user_metadata->>'name' IS NOT NULL THEN user_metadata->>'name'
    WHEN user_metadata->>'given_name' IS NOT NULL AND user_metadata->>'family_name' IS NOT NULL 
      THEN user_metadata->>'given_name' || ' ' || user_metadata->>'family_name'
    ELSE split_part(email, '@', 1)
  END,
  'name_extracted_from_oauth', true,
  'oauth_provider', 'google'
)
WHERE app_metadata->>'provider' = 'google'
  AND (
    user_metadata->>'first_name' IS NULL 
    OR user_metadata->>'first_name' = '' 
    OR user_metadata->>'last_name' IS NULL 
    OR user_metadata->>'last_name' = ''
  );

-- Update corresponding user_profiles table
UPDATE user_profiles 
SET 
  first_name = auth_users.user_metadata->>'first_name',
  last_name = auth_users.user_metadata->>'last_name',
  display_name = auth_users.user_metadata->>'full_name',
  updated_at = NOW()
FROM auth.users as auth_users
WHERE user_profiles.user_id = auth_users.id
  AND auth_users.app_metadata->>'provider' = 'google'
  AND (
    user_profiles.first_name IS NULL 
    OR user_profiles.first_name = '' 
    OR user_profiles.last_name IS NULL 
    OR user_profiles.last_name = ''
  );

-- Show the results
SELECT 
  'Updated users' as status,
  COUNT(*) as count
FROM auth.users 
WHERE app_metadata->>'provider' = 'google'
  AND user_metadata->>'name_extracted_from_oauth' = 'true';

-- Show sample of updated users
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
