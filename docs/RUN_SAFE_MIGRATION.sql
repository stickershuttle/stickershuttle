-- SAFE Migration Script - Run AFTER CREATE_USER_PROFILE_TRIGGER_NO_AUTH_PERMS_FIXED.sql

-- Step 1: First, let's see what we're working with
SELECT 
  COUNT(DISTINCT au.id) as total_users,
  COUNT(DISTINCT up.user_id) as users_with_profiles,
  COUNT(DISTINCT au.id) - COUNT(DISTINCT up.user_id) as missing_profiles
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id;

-- Step 2: Run the safe migration (this will show detailed results)
SELECT 
  user_id,
  email,
  first_name,
  last_name,
  source,
  action,
  success
FROM create_missing_user_profiles_safe()
ORDER BY success DESC, email;

-- Step 3: Check the results summary
SELECT 
  COUNT(*) as total_processed,
  COUNT(CASE WHEN success = true THEN 1 END) as successful_creations,
  COUNT(CASE WHEN success = false THEN 1 END) as failed_creations,
  COUNT(CASE WHEN action = 'created_with_oauth_names' THEN 1 END) as profiles_with_oauth_names,
  COUNT(CASE WHEN action = 'created_basic' THEN 1 END) as basic_profiles_created
FROM create_missing_user_profiles_safe();

-- Step 4: Verify the final state
SELECT 
  COUNT(DISTINCT au.id) as total_users,
  COUNT(DISTINCT up.user_id) as users_with_profiles,
  COUNT(DISTINCT au.id) - COUNT(DISTINCT up.user_id) as still_missing_profiles
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id;

-- Step 5: Show sample of created profiles
SELECT 
  up.user_id,
  au.email,
  up.first_name,
  up.last_name,
  up.created_at,
  CASE 
    WHEN au.raw_user_meta_data IS NOT NULL THEN 'OAuth User'
    ELSE 'Email/Password User'
  END as user_type
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
ORDER BY up.created_at DESC
LIMIT 10;

-- Step 6: Check for any remaining issues
SELECT 
  au.id as user_id,
  au.email,
  au.created_at as user_created_at,
  up.user_id IS NULL as missing_profile,
  CASE 
    WHEN au.raw_user_meta_data IS NOT NULL THEN 'Has OAuth Data'
    ELSE 'No OAuth Data'
  END as data_source
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ORDER BY au.created_at DESC
LIMIT 5; 