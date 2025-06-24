-- Quick check for your orders
-- Replace 'YOUR_EMAIL_HERE' with your actual email address

-- 1. Get your user ID
SELECT 
    id as your_user_id,
    email,
    created_at as account_created
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'; -- Replace with your email

-- 2. Check all orders for your email (regardless of user_id linkage)
SELECT 
    id,
    order_number,
    user_id,
    customer_email,
    order_status,
    financial_status,
    total_price,
    created_at
FROM orders_main
WHERE customer_email = 'YOUR_EMAIL_HERE' -- Replace with your email
ORDER BY created_at DESC;

-- 3. Test the function with your user ID
-- Copy the user_id from step 1 and replace below
SELECT * FROM get_user_orders('YOUR_USER_ID_HERE');

-- 4. Check if tracking columns exist
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'orders_main'
AND column_name IN ('tracking_number', 'tracking_company', 'tracking_url'); 