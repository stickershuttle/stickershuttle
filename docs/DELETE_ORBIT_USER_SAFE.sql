-- SAFE DELETION OF ORBIT@STICKERSHUTTLE.COM USER
-- This script safely removes the user and all associated data

BEGIN;

-- Step 1: Get the user ID first for reference
DO $$
DECLARE
    orbit_user_id UUID;
    orbit_email TEXT := 'orbit@stickershuttle.com';
BEGIN
    -- Get the user ID
    SELECT id INTO orbit_user_id 
    FROM auth.users 
    WHERE email = orbit_email;
    
    IF orbit_user_id IS NOT NULL THEN
        RAISE NOTICE 'Found user to delete: % (ID: %)', orbit_email, orbit_user_id;
        
        -- Step 2: Delete from user_profiles first (child table)
        DELETE FROM user_profiles 
        WHERE user_id = orbit_user_id;
        RAISE NOTICE 'Deleted user profile for %', orbit_email;
        
        -- Step 3: Delete any orders associated with this user
        DELETE FROM my_orders 
        WHERE user_id = orbit_user_id;
        RAISE NOTICE 'Deleted orders for %', orbit_email;
        
        -- Step 4: Delete any guest orders with this email
        DELETE FROM my_orders 
        WHERE guest_email = orbit_email;
        RAISE NOTICE 'Deleted guest orders for %', orbit_email;
        
        -- Step 5: Delete any credit records
        DELETE FROM user_credits 
        WHERE user_id = orbit_user_id;
        RAISE NOTICE 'Deleted credit records for %', orbit_email;
        
        -- Step 6: Delete any other user-related data (add more as needed)
        -- Add other table deletions here if you have more user-related tables
        
        -- Step 7: Finally delete from auth.users (parent table)
        DELETE FROM auth.users 
        WHERE id = orbit_user_id;
        RAISE NOTICE 'Deleted user from auth.users: %', orbit_email;
        
        RAISE NOTICE 'Successfully deleted all data for user: %', orbit_email;
    ELSE
        RAISE NOTICE 'User % not found - nothing to delete', orbit_email;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during deletion: %', SQLERRM;
        RAISE;
END $$;

-- Step 8: Verify the deletion worked
SELECT 
    'Verification Results' as status,
    COUNT(*) as remaining_users,
    STRING_AGG(email, ', ') as remaining_emails
FROM auth.users 
WHERE email IN ('justin@stickershuttle.com', 'orbit@stickershuttle.com');

-- Step 9: Check user_profiles table
SELECT 
    'User Profiles Remaining' as status,
    COUNT(*) as total_profiles,
    STRING_AGG(email, ', ') as profile_emails
FROM user_profiles 
WHERE email IN ('justin@stickershuttle.com', 'orbit@stickershuttle.com');

-- Step 10: Check for any orphaned data
SELECT 
    'Cleanup Check' as status,
    (SELECT COUNT(*) FROM my_orders WHERE guest_email = 'orbit@stickershuttle.com') as orphaned_guest_orders,
    (SELECT COUNT(*) FROM user_credits WHERE user_id NOT IN (SELECT id FROM auth.users)) as orphaned_credits;

COMMIT;

-- Final success message
SELECT 'SUCCESS: orbit@stickershuttle.com user and all associated data deleted!' as result; 