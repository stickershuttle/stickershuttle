-- Test Script for User Profile Creation
-- Run this to verify the functions work correctly

-- Test 1: Check if functions exist
SELECT 
  proname as function_name,
  pronargs as parameter_count,
  prorettype::regtype as return_type
FROM pg_proc 
WHERE proname IN (
  'create_user_profile',
  'create_user_profile_safe', 
  'update_user_profile_names',
  'create_missing_user_profiles_safe'
)
ORDER BY proname;

-- Test 2: Test creating a profile for an existing user (if you have one)
-- Replace 'your-user-id-here' with an actual user ID from auth.users
-- SELECT create_user_profile('your-user-id-here'::UUID, 'Test', 'User');

-- Test 3: Check current state of user profiles
SELECT 
  COUNT(DISTINCT au.id) as total_auth_users,
  COUNT(DISTINCT up.user_id) as total_user_profiles,
  COUNT(DISTINCT au.id) - COUNT(DISTINCT up.user_id) as missing_profiles
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id;

-- Test 4: Show users without profiles (if any)
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE 
    WHEN au.raw_user_meta_data IS NOT NULL THEN 'OAuth'
    ELSE 'Email/Password'
  END as signup_type
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ORDER BY au.created_at DESC
LIMIT 5;

-- Test 5: Show existing profiles
SELECT 
  up.user_id,
  au.email,
  up.first_name,
  up.last_name,
  up.created_at as profile_created,
  au.created_at as user_created
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
ORDER BY up.created_at DESC
LIMIT 5; 