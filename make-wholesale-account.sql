-- SQL to make jayfowler@outlook.com a wholesale account
-- Run this in your Supabase SQL editor or PostgreSQL client

-- First, let's find the user ID for jayfowler@outlook.com
-- (This is just for reference - you'll need to get the actual user_id)
-- SELECT id, email FROM auth.users WHERE email = 'jayfowler@outlook.com';

-- Option 1: If the user already has a profile, update it to wholesale
UPDATE user_profiles 
SET 
  is_wholesale_customer = true,
  wholesale_status = 'approved',
  wholesale_credit_rate = 0.025, -- 2.5% for approved wholesale customers
  wholesale_approved_at = NOW(),
  wholesale_approved_by = NULL, -- Set to NULL or use actual admin user UUID
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'jayfowler@outlook.com'
);

-- Option 2: If the user doesn't have a profile yet, create one
-- (This will only insert if no profile exists due to the WHERE NOT EXISTS clause)
INSERT INTO user_profiles (
  user_id,
  first_name,
  last_name,
  email,
  display_name,
  is_wholesale_customer,
  wholesale_status,
  wholesale_credit_rate,
  wholesale_approved_at,
  wholesale_approved_by,
  profile_photo_url,
  created_at,
  updated_at
)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'first_name', 'Jay'),
  COALESCE(u.raw_user_meta_data->>'last_name', 'Fowler'),
  u.email,
  CONCAT(
    COALESCE(u.raw_user_meta_data->>'first_name', 'Jay'),
    ' ',
    COALESCE(u.raw_user_meta_data->>'last_name', 'Fowler')
  ),
  true, -- is_wholesale_customer
  'approved', -- wholesale_status
  0.025, -- wholesale_credit_rate (2.5%)
  NOW(), -- wholesale_approved_at
  NULL, -- wholesale_approved_by (set to NULL or use actual admin user UUID)
  'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751390215/StickerShuttle_Avatar1_dmnkat.png',
  NOW(),
  NOW()
FROM auth.users u
WHERE u.email = 'jayfowler@outlook.com'
AND NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE user_id = u.id
);

-- Verify the changes
SELECT 
  up.user_id,
  up.first_name,
  up.last_name,
  up.email,
  up.is_wholesale_customer,
  up.wholesale_status,
  up.wholesale_credit_rate,
  up.wholesale_approved_at
FROM user_profiles up
JOIN auth.users u ON up.user_id = u.id
WHERE u.email = 'jayfowler@outlook.com';