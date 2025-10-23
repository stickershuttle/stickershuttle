-- First, let's check what columns actually exist in auth.users table
-- Run this query to see the actual structure

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- Alternative: Check if the column names are different
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users'
AND column_name LIKE '%metadata%';

-- Check if it's called something else
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users'
AND (column_name LIKE '%user%' OR column_name LIKE '%meta%' OR column_name LIKE '%data%');
