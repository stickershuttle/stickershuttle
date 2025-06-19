-- First, let's see all tables in your database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Then let's look at the orders table structure specifically
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders'
ORDER BY ordinal_position;

-- Let's also check for any tables that might contain proof-related data
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name ILIKE '%proof%'
ORDER BY table_name; 