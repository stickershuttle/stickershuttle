-- Quick Sync for Existing Google OAuth Users
-- Run this step-by-step to sync existing Google accounts

-- Step 1: First, let's see what Google OAuth users we have
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'given_name' as google_first_name,
  au.raw_user_meta_data->>'family_name' as google_last_name,
  au.raw_user_meta_data->>'full_name' as google_full_name,
  au.raw_user_meta_data->>'name' as google_name,
  up.first_name as current_first_name,
  up.last_name as current_last_name,
  CASE 
    WHEN up.user_id IS NULL THEN 'No profile exists'
    WHEN up.first_name IS NULL AND up.last_name IS NULL THEN 'Profile exists but no names'
    ELSE 'Profile has names'
  END as profile_status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE au.raw_user_meta_data IS NOT NULL
ORDER BY au.email;

-- Step 2: Now let's sync the users (this will create/update user_profiles)
INSERT INTO user_profiles (
  user_id,
  first_name,
  last_name,
  created_at,
  updated_at
)
SELECT 
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'given_name',
    au.raw_user_meta_data->>'first_name',
    CASE 
      WHEN COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name') IS NOT NULL 
      THEN split_part(trim(COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name')), ' ', 1)
      ELSE NULL
    END
  ) as first_name,
  COALESCE(
    au.raw_user_meta_data->>'family_name',
    au.raw_user_meta_data->>'last_name',
    CASE 
      WHEN COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name') IS NOT NULL 
      AND position(' ' in trim(COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'))) > 0
      THEN trim(substring(trim(COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name')) from position(' ' in trim(COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'))) + 1))
      ELSE NULL
    END
  ) as last_name,
  now(),
  now()
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE au.raw_user_meta_data IS NOT NULL 
AND (
  up.user_id IS NULL OR 
  (up.first_name IS NULL AND up.last_name IS NULL)
)
AND (
  -- Only insert if we actually have name data
  COALESCE(au.raw_user_meta_data->>'given_name', au.raw_user_meta_data->>'first_name') IS NOT NULL OR
  COALESCE(au.raw_user_meta_data->>'family_name', au.raw_user_meta_data->>'last_name') IS NOT NULL OR
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name') IS NOT NULL
)
ON CONFLICT (user_id) DO UPDATE SET
  first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
  last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
  updated_at = now()
WHERE 
  (user_profiles.first_name IS NULL AND EXCLUDED.first_name IS NOT NULL) OR
  (user_profiles.last_name IS NULL AND EXCLUDED.last_name IS NOT NULL);

-- Step 3: Verify the results
SELECT 
  'Successfully synced users' as result,
  COUNT(*) as count
FROM auth.users au
JOIN user_profiles up ON au.id = up.user_id
WHERE au.raw_user_meta_data IS NOT NULL
AND (up.first_name IS NOT NULL OR up.last_name IS NOT NULL);

-- Step 4: Show the synced users
SELECT 
  au.email,
  up.first_name,
  up.last_name,
  up.created_at as profile_created,
  CASE 
    WHEN up.first_name IS NOT NULL AND up.last_name IS NOT NULL THEN 
      CONCAT(up.first_name, ' ', up.last_name)
    WHEN up.first_name IS NOT NULL THEN up.first_name
    WHEN up.last_name IS NOT NULL THEN up.last_name
    ELSE 'No name available'
  END as display_name
FROM auth.users au
JOIN user_profiles up ON au.id = up.user_id
WHERE au.raw_user_meta_data IS NOT NULL
ORDER BY up.created_at DESC; 