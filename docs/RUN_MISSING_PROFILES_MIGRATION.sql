-- Run this AFTER you've executed the CREATE_USER_PROFILE_TRIGGER_NO_AUTH_PERMS.sql

-- Step 1: Create profiles for all existing users without profiles
SELECT 
  user_id,
  email,
  first_name,
  last_name,
  source,
  action
FROM create_missing_user_profiles();

-- Step 2: Show the results
SELECT 
  COUNT(*) as total_users_processed,
  COUNT(CASE WHEN action = 'created_with_oauth_names' THEN 1 END) as users_with_oauth_names,
  COUNT(CASE WHEN action = 'created_basic' THEN 1 END) as users_with_basic_profiles
FROM create_missing_user_profiles();

-- Step 3: Verify the results
SELECT 
  COUNT(DISTINCT au.id) as total_users,
  COUNT(DISTINCT up.user_id) as users_with_profiles,
  COUNT(DISTINCT au.id) - COUNT(DISTINCT up.user_id) as missing_profiles
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id;

-- Step 4: Show sample of created profiles
SELECT 
  up.user_id,
  au.email,
  up.first_name,
  up.last_name,
  up.created_at
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
ORDER BY up.created_at DESC
LIMIT 10; 