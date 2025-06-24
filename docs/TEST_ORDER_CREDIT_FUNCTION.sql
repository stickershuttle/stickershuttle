-- Test the new order-linked credit function
-- Run this to verify the function was created successfully

-- Check if function exists
SELECT 
    p.proname as function_name,
    p.proargnames as argument_names,
    p.prosrc as function_source
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'add_user_credits_with_order'
AND n.nspname = 'public';

-- If the function exists, you should see one row returned
-- If no rows are returned, you need to run the SQL from docs/ADD_ORDER_CREDIT_EARNING.sql 