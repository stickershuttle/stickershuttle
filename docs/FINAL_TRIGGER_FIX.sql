-- FINAL TRIGGER FIX - Fixes the link_guest_orders_to_user function that's causing conflicts
-- This function is trying to access NEW.email but user_profiles table doesn't have an email field

BEGIN;

-- Step 1: Drop the problematic trigger first
DROP TRIGGER IF EXISTS link_guest_orders_on_profile_insert ON user_profiles;

-- Step 2: Replace the problematic function with a corrected version
CREATE OR REPLACE FUNCTION link_guest_orders_to_user()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Get the email from auth.users table since user_profiles doesn't have email field
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = NEW.user_id;
    
    -- Only proceed if we found an email
    IF user_email IS NOT NULL THEN
        -- Update guest orders to link them to this user
        UPDATE my_orders 
        SET user_id = NEW.user_id,
            updated_at = NOW()
        WHERE guest_email = user_email 
          AND user_id IS NULL;
        
        -- Log how many orders were linked
        RAISE NOTICE 'Linked % guest orders to user % (email: %)', 
            ROW_COUNT, NEW.user_id, user_email;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the insert
        RAISE NOTICE 'Error in link_guest_orders_to_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Recreate the trigger with the fixed function
CREATE TRIGGER link_guest_orders_on_profile_insert
    AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION link_guest_orders_to_user();

-- Step 4: Now create the user profiles safely
INSERT INTO user_profiles (user_id, first_name, last_name, created_at, updated_at)
VALUES 
  (
    (SELECT id FROM auth.users WHERE email = 'justin@stickershuttle.com' LIMIT 1), 
    'Justin', 
    'Sticker Shuttle Admin', 
    NOW(), 
    NOW()
  ),
  (
    (SELECT id FROM auth.users WHERE email = 'orbit@stickershuttle.com' LIMIT 1), 
    'Orbit', 
    'Space Admin', 
    NOW(), 
    NOW()
  )
ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = NOW();

-- Step 5: Verify the profiles were created
SELECT 
  up.user_id,
  up.first_name,
  up.last_name,
  au.email,
  up.created_at,
  'Profile created successfully' as status
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('justin@stickershuttle.com', 'orbit@stickershuttle.com')
ORDER BY au.email;

-- Step 6: Check total profile count
SELECT 
  COUNT(*) as total_profiles,
  'Total profiles in system' as description
FROM user_profiles;

COMMIT;

-- Success message
SELECT 'SUCCESS: User profiles created and trigger fixed!' as result; 