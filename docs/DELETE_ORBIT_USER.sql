-- Delete orbit@stickershuttle.com user safely
-- This will remove the user from both auth.users and user_profiles

-- Step 1: First, let's see what we're about to delete
SELECT 
  au.id,
  au.email,
  au.created_at as user_created,
  up.id as profile_id,
  up.first_name,
  up.last_name,
  up.created_at as profile_created
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE au.email = 'orbit@stickershuttle.com';

-- Step 2: Check if there are any orders or other data linked to this user
SELECT 
  'orders_main' as table_name,
  COUNT(*) as record_count
FROM orders_main 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'orbit@stickershuttle.com')
UNION ALL
SELECT 
  'user_credits' as table_name,
  COUNT(*) as record_count
FROM user_credits 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'orbit@stickershuttle.com')
UNION ALL
SELECT 
  'reviews' as table_name,
  COUNT(*) as record_count
FROM reviews 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'orbit@stickershuttle.com');

-- Step 3: Delete from user_profiles first (if exists)
DELETE FROM user_profiles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'orbit@stickershuttle.com');

-- Step 4: Delete from auth.users (this requires admin privileges)
-- Note: This might fail if you don't have the right permissions
-- In that case, we'd need to use Supabase admin API
DELETE FROM auth.users 
WHERE email = 'orbit@stickershuttle.com';

-- Step 5: Verify deletion
SELECT 
  COUNT(*) as remaining_orbit_users
FROM auth.users 
WHERE email = 'orbit@stickershuttle.com'; 