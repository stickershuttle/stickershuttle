-- SAFE PROFILE CREATION - Bypasses trigger conflicts without disabling system triggers
-- This approach uses conflict resolution instead of trigger disabling

BEGIN;

-- Step 1: Create profiles using ON CONFLICT to handle any existing data gracefully
-- This approach doesn't disable triggers, so it's safer

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
  updated_at = NOW();

-- Step 2: Verify the insertions worked
SELECT 
  up.user_id,
  up.first_name,
  up.last_name,
  au.email,
  up.created_at
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('justin@stickershuttle.com', 'orbit@stickershuttle.com');

-- Step 3: Check total profile count
SELECT COUNT(*) as total_profiles FROM user_profiles;

COMMIT;

-- If the above fails, try this alternative approach using a function:
DO $$
DECLARE
    justin_user_id UUID;
    orbit_user_id UUID;
BEGIN
    -- Get user IDs
    SELECT id INTO justin_user_id FROM auth.users WHERE email = 'justin@stickershuttle.com' LIMIT 1;
    SELECT id INTO orbit_user_id FROM auth.users WHERE email = 'orbit@stickershuttle.com' LIMIT 1;
    
    -- Create profiles only if user IDs exist and profiles don't already exist
    IF justin_user_id IS NOT NULL THEN
        INSERT INTO user_profiles (user_id, first_name, last_name, created_at, updated_at)
        VALUES (justin_user_id, 'Justin', 'Sticker Shuttle Admin', NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Justin profile: %', 
            CASE WHEN EXISTS(SELECT 1 FROM user_profiles WHERE user_id = justin_user_id) 
                THEN 'Created/Exists' ELSE 'Failed' END;
    END IF;
    
    IF orbit_user_id IS NOT NULL THEN
        INSERT INTO user_profiles (user_id, first_name, last_name, created_at, updated_at)
        VALUES (orbit_user_id, 'Orbit', 'Space Admin', NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Orbit profile: %', 
            CASE WHEN EXISTS(SELECT 1 FROM user_profiles WHERE user_id = orbit_user_id) 
                THEN 'Created/Exists' ELSE 'Failed' END;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error occurred: %', SQLERRM;
        -- Don't re-raise the error, just log it
END $$;

-- Final verification
SELECT 
    'Final Status' as status,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN au.email = 'justin@stickershuttle.com' THEN 1 END) as justin_profiles,
    COUNT(CASE WHEN au.email = 'orbit@stickershuttle.com' THEN 1 END) as orbit_profiles
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('justin@stickershuttle.com', 'orbit@stickershuttle.com'); 