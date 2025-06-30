-- Check for triggers on orders_main table
SELECT 
    tgname AS trigger_name,
    tgtype,
    proname AS function_name,
    tgisinternal
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'orders_main'
AND tgisinternal = false
ORDER BY tgname;

-- Check if there's a users table (not auth.users)
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename = 'users'
OR tablename = 'user_profiles';

-- Check the function code for any trigger that might be accessing users table
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'orders_main'
AND tgisinternal = false;

-- Check if any functions are trying to access auth.users
SELECT 
    proname,
    prosrc
FROM pg_proc
WHERE prosrc LIKE '%auth.users%'
AND proname IN (
    SELECT proname 
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'orders_main'
);

-- Quick fix: Grant service_role access to common tables
-- This might help if the issue is with accessing user-related tables
GRANT SELECT ON auth.users TO service_role;
GRANT SELECT ON public.user_profiles TO service_role;
GRANT SELECT ON public.users TO service_role; 