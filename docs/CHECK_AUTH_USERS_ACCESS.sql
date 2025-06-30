-- 1. Check for triggers on orders_main table
SELECT 
    tgname AS trigger_name,
    proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'orders_main'
AND NOT tgisinternal;

-- 2. Check if user_profiles table exists
SELECT 
    schemaname,
    tablename
FROM pg_tables
WHERE tablename = 'user_profiles';

-- 3. Grant service_role access to auth.users
GRANT SELECT ON auth.users TO service_role;

-- 4. If user_profiles exists, grant access to it too
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_profiles' AND schemaname = 'public') THEN
        EXECUTE 'GRANT SELECT ON public.user_profiles TO service_role';
        RAISE NOTICE 'Granted SELECT on user_profiles to service_role';
    END IF;
END $$;

-- 5. Check what the log_order_status_change trigger does
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
WHERE p.proname = 'log_order_status_change';

-- 6. Check current permissions on auth.users
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'auth'
AND table_name = 'users'
AND grantee IN ('service_role', 'authenticated', 'anon')
ORDER BY grantee, privilege_type; 