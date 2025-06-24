-- DEBUGGING: Why orders aren't showing in dashboard

-- 1. First, let's check if you have ANY orders in orders_main
SELECT COUNT(*) as total_orders FROM orders_main;

-- 2. Check if orders exist for ANY user
SELECT 
    user_id,
    COUNT(*) as order_count,
    MAX(created_at) as latest_order
FROM orders_main
WHERE user_id IS NOT NULL
GROUP BY user_id
LIMIT 10;

-- 3. Get YOUR user ID from auth.users (find your email)
SELECT 
    id as your_user_id,
    email,
    created_at
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'; -- Replace with your actual email

-- 4. Check if there are orders for YOUR specific user_id
-- Replace 'YOUR_USER_ID' with the ID from step 3
SELECT 
    id,
    order_number,
    order_status,
    financial_status,
    total_price,
    created_at
FROM orders_main
WHERE user_id = 'YOUR_USER_ID' -- Replace with your actual user ID
ORDER BY created_at DESC;

-- 5. Test the function directly
-- Replace 'YOUR_USER_ID' with your actual user ID
SELECT * FROM get_user_orders('YOUR_USER_ID');

-- 6. Check if there's a mismatch between user_id in orders and auth.users
SELECT 
    om.id as order_id,
    om.user_id as order_user_id,
    om.customer_email,
    au.id as auth_user_id,
    au.email as auth_email
FROM orders_main om
LEFT JOIN auth.users au ON om.customer_email = au.email
WHERE om.customer_email IS NOT NULL
LIMIT 10;

-- 7. Check function permissions
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_userbyid(p.proowner) as owner,
    array_to_string(p.proacl, E'\n') as permissions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_user_orders';

-- 8. If orders exist but aren't linked to your user, this will show them
SELECT 
    id,
    user_id,
    customer_email,
    order_status,
    total_price,
    created_at
FROM orders_main
WHERE customer_email = 'YOUR_EMAIL_HERE' -- Replace with your email
ORDER BY created_at DESC; 