-- FORCE DELETE ORBIT USER FROM AUTH.USERS
-- Direct deletion with constraint handling

BEGIN;

-- Step 1: Check what's currently in the database
SELECT 'BEFORE DELETION - Current Users:' as status;
SELECT email, id, created_at 
FROM auth.users 
WHERE email IN ('justin@stickershuttle.com', 'orbit@stickershuttle.com')
ORDER BY email;

-- Step 2: Get the orbit user ID
DO $$
DECLARE
    orbit_user_id UUID;
    records_deleted INTEGER;
BEGIN
    -- Get the orbit user ID
    SELECT id INTO orbit_user_id 
    FROM auth.users 
    WHERE email = 'orbit@stickershuttle.com';
    
    IF orbit_user_id IS NOT NULL THEN
        RAISE NOTICE 'Found orbit user ID: %', orbit_user_id;
        
        -- Delete from all possible related tables first
        -- User profiles
        DELETE FROM user_profiles WHERE user_id = orbit_user_id;
        GET DIAGNOSTICS records_deleted = ROW_COUNT;
        RAISE NOTICE 'Deleted % records from user_profiles', records_deleted;
        
        -- Orders
        DELETE FROM my_orders WHERE user_id = orbit_user_id;
        GET DIAGNOSTICS records_deleted = ROW_COUNT;
        RAISE NOTICE 'Deleted % records from my_orders (user_id)', records_deleted;
        
        DELETE FROM my_orders WHERE guest_email = 'orbit@stickershuttle.com';
        GET DIAGNOSTICS records_deleted = ROW_COUNT;
        RAISE NOTICE 'Deleted % records from my_orders (guest_email)', records_deleted;
        
        -- Credits
        DELETE FROM user_credits WHERE user_id = orbit_user_id;
        GET DIAGNOSTICS records_deleted = ROW_COUNT;
        RAISE NOTICE 'Deleted % records from user_credits', records_deleted;
        
        -- Any other tables that might reference this user
        -- Add more DELETE statements here if needed
        
        -- Now try to delete from auth.users
        DELETE FROM auth.users WHERE id = orbit_user_id;
        GET DIAGNOSTICS records_deleted = ROW_COUNT;
        
        IF records_deleted > 0 THEN
            RAISE NOTICE 'SUCCESS: Deleted orbit user from auth.users';
        ELSE
            RAISE NOTICE 'WARNING: No records deleted from auth.users - user may not exist';
        END IF;
        
    ELSE
        RAISE NOTICE 'orbit@stickershuttle.com user not found in auth.users';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR during deletion: %', SQLERRM;
        -- Don't re-raise to see what the specific error is
END $$;

-- Step 3: Verify deletion
SELECT 'AFTER DELETION - Remaining Users:' as status;
SELECT email, id, created_at 
FROM auth.users 
WHERE email IN ('justin@stickershuttle.com', 'orbit@stickershuttle.com')
ORDER BY email;

-- Step 4: Check for any remaining references
SELECT 'Checking for orphaned references:' as status;

SELECT 
    'user_profiles' as table_name,
    COUNT(*) as count
FROM user_profiles 
WHERE email = 'orbit@stickershuttle.com'
UNION ALL
SELECT 
    'my_orders (user_id)' as table_name,
    COUNT(*) as count
FROM my_orders 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'orbit@stickershuttle.com'
)
UNION ALL
SELECT 
    'my_orders (guest_email)' as table_name,
    COUNT(*) as count
FROM my_orders 
WHERE guest_email = 'orbit@stickershuttle.com'
UNION ALL
SELECT 
    'user_credits' as table_name,
    COUNT(*) as count
FROM user_credits 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'orbit@stickershuttle.com'
);

COMMIT;

-- Final verification
SELECT 
    CASE 
        WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'orbit@stickershuttle.com') 
        THEN '❌ FAILED: orbit@stickershuttle.com still exists in auth.users'
        ELSE '✅ SUCCESS: orbit@stickershuttle.com deleted from auth.users'
    END as final_result; 