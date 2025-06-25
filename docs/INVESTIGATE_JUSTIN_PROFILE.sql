-- Investigate why justin@stickershuttle.com profile disappeared
-- This will help us understand what happened to the user profile

-- Step 1: Check if justin still exists in auth.users
SELECT 
  id,
  email,
  created_at,
  updated_at,
  last_sign_in_at,
  raw_user_meta_data,
  user_metadata,
  aud,
  role
FROM auth.users 
WHERE email = 'justin@stickershuttle.com';

-- Step 2: Check if there's a profile in user_profiles
SELECT 
  id,
  user_id,
  first_name,
  last_name,
  created_at,
  updated_at
FROM user_profiles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'justin@stickershuttle.com');

-- Step 3: Check if there are any constraints or triggers that might delete profiles
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_profiles'
ORDER BY trigger_name;

-- Step 4: Check for foreign key constraints that might cascade deletes
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (tc.table_name = 'user_profiles' OR ccu.table_name = 'user_profiles');

-- Step 5: Look for any policies that might affect user_profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- Step 6: Check if there are any functions that might delete user profiles
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE prosrc ILIKE '%DELETE%user_profiles%' 
   OR prosrc ILIKE '%user_profiles%DELETE%'
ORDER BY proname;

-- Step 7: Try to recreate justin's profile manually to see if it works
-- Get justin's user ID first
SELECT id FROM auth.users WHERE email = 'justin@stickershuttle.com';

-- Step 8: Check recent activity in user_profiles table (if there's an audit log)
-- This might not work if you don't have audit logging enabled
-- SELECT * FROM audit.user_profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'justin@stickershuttle.com');

-- Step 9: Try creating justin's profile manually
-- INSERT INTO user_profiles (user_id, first_name, last_name, created_at, updated_at)
-- VALUES (
--   (SELECT id FROM auth.users WHERE email = 'justin@stickershuttle.com'),
--   'Justin',
--   'Test',
--   now(),
--   now()
-- );

-- Step 10: Final verification - show all current users and their profile status
SELECT 
  au.id,
  au.email,
  au.created_at as user_created,
  up.id as profile_id,
  up.first_name,
  up.last_name,
  up.created_at as profile_created,
  CASE 
    WHEN up.user_id IS NULL THEN 'MISSING PROFILE'
    ELSE 'HAS PROFILE'
  END as profile_status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
ORDER BY au.email; 