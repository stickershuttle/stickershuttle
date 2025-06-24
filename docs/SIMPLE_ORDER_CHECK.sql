-- Simple check to see if you have any orders
-- Run these queries one by one

-- 1. Check total number of orders in the system
SELECT COUNT(*) as total_orders FROM orders_main;

-- 2. Check if any orders have user_id set
SELECT COUNT(*) as orders_with_user_id FROM orders_main WHERE user_id IS NOT NULL;

-- 3. Check your recent orders (replace with your email)
SELECT 
    id,
    order_number,
    user_id,
    customer_email,
    financial_status,
    total_price,
    created_at
FROM orders_main
WHERE customer_email = 'your-email@example.com' -- REPLACE THIS WITH YOUR EMAIL
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check the data type of order_created_at column
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'orders_main' 
AND column_name = 'order_created_at'; 