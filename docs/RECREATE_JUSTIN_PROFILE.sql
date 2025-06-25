-- Recreate justin@stickershuttle.com profile
-- Run this after the investigation to restore his profile

-- Step 1: Get justin's user details and OAuth data
SELECT 
  id as user_id,
  email,
  raw_user_meta_data,
  raw_user_meta_data->>'given_name' as oauth_first_name,
  raw_user_meta_data->>'family_name' as oauth_last_name,
  raw_user_meta_data->>'name' as oauth_full_name
FROM auth.users 
WHERE email = 'justin@stickershuttle.com';

-- Step 2: Try using our safe function to create the profile
SELECT create_user_profile_safe(
  (SELECT id FROM auth.users WHERE email = 'justin@stickershuttle.com'),
  COALESCE(
    (SELECT raw_user_meta_data->>'given_name' FROM auth.users WHERE email = 'justin@stickershuttle.com'),
    'Justin'
  ),
  COALESCE(
    (SELECT raw_user_meta_data->>'family_name' FROM auth.users WHERE email = 'justin@stickershuttle.com'),
    'User'
  )
) as profile_creation_result;

-- Step 3: If the function doesn't work, try direct INSERT
-- INSERT INTO user_profiles (
--   user_id,
--   first_name,
--   last_name,
--   created_at,
--   updated_at
-- ) 
-- SELECT 
--   id,
--   COALESCE(raw_user_meta_data->>'given_name', 'Justin'),
--   COALESCE(raw_user_meta_data->>'family_name', 'User'),
--   now(),
--   now()
-- FROM auth.users 
-- WHERE email = 'justin@stickershuttle.com'
-- ON CONFLICT (user_id) DO UPDATE SET
--   first_name = EXCLUDED.first_name,
--   last_name = EXCLUDED.last_name,
--   updated_at = now();

-- Step 4: Verify the profile was created
SELECT 
  up.id,
  up.user_id,
  au.email,
  up.first_name,
  up.last_name,
  up.created_at,
  up.updated_at
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email = 'justin@stickershuttle.com';

-- Step 5: Final check - show all users and their profile status
SELECT 
  au.email,
  CASE 
    WHEN up.user_id IS NULL THEN '❌ MISSING PROFILE'
    ELSE '✅ HAS PROFILE'
  END as status,
  up.first_name,
  up.last_name
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
ORDER BY au.email; 