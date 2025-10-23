-- Diagnostic script to check Supabase setup
-- Run these queries one by one to understand your database structure

-- 1. Check if we're in the right database
SELECT current_database(), current_schema();

-- 2. Check what schemas exist
SELECT schema_name FROM information_schema.schemata ORDER BY schema_name;

-- 3. Check what tables exist in auth schema (if it exists)
SELECT table_name FROM information_schema.tables WHERE table_schema = 'auth';

-- 4. Check what tables exist in public schema
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- 5. Check if there's a users table anywhere
SELECT table_schema, table_name FROM information_schema.tables 
WHERE table_name LIKE '%user%' OR table_name LIKE '%auth%';

-- 6. Check if there's a user_profiles table
SELECT table_schema, table_name FROM information_schema.tables 
WHERE table_name = 'user_profiles';

-- 7. If auth.users exists, check its structure
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_schema = 'auth' AND table_name = 'users';

-- 8. Check if there are any users at all (try different approaches)
-- SELECT COUNT(*) FROM auth.users;  -- This might fail
-- SELECT COUNT(*) FROM public.users;  -- Try this instead
-- SELECT COUNT(*) FROM user_profiles;  -- This should work
