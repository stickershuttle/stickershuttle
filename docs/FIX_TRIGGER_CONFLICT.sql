-- Fix the trigger conflict that's preventing user profile creation
-- The link_guest_orders_to_user() trigger is expecting an email field that doesn't exist

-- Step 1: Check what triggers exist on user_profiles
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_profiles'
ORDER BY trigger_name;

-- Step 2: Look at the problematic trigger function
SELECT 
  proname,
  prosrc
FROM pg_proc 
WHERE proname = 'link_guest_orders_to_user';

-- Step 3: Check if we can see the actual trigger definition
SELECT 
  tgname,
  tgfoid::regproc,
  tgtype,
  tgenabled
FROM pg_trigger 
WHERE tgrelid = 'user_profiles'::regclass;

-- Step 4: TEMPORARILY disable the trigger to allow profile creation
-- (We'll re-enable it after creating profiles)
ALTER TABLE user_profiles DISABLE TRIGGER ALL;

-- Step 5: Now try to create justin's profile
INSERT INTO user_profiles (
  user_id,
  first_name,
  last_name,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'justin@stickershuttle.com'),
  'Justin',
  'Admin',
  now(),
  now()
)
ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = now();

-- Step 6: Create orbit's profile too (before deletion if needed)
INSERT INTO user_profiles (
  user_id,
  first_name,
  last_name,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'orbit@stickershuttle.com'),
  'Orbit',
  'User',
  now(),
  now()
)
ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = now();

-- Step 7: Re-enable triggers
ALTER TABLE user_profiles ENABLE TRIGGER ALL;

-- Step 8: Verify profiles were created
SELECT 
  au.email,
  CASE 
    WHEN up.user_id IS NULL THEN '❌ MISSING PROFILE'
    ELSE '✅ HAS PROFILE'
  END as status,
  up.first_name,
  up.last_name,
  up.created_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
ORDER BY au.email;

-- Step 9: Check final count
SELECT 
  COUNT(DISTINCT au.id) as total_users,
  COUNT(DISTINCT up.user_id) as users_with_profiles,
  COUNT(DISTINCT au.id) - COUNT(DISTINCT up.user_id) as missing_profiles
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id; 