-- STEP 1: Check if the function exists
SELECT proname, proargtypes, prorettype 
FROM pg_proc 
WHERE proname = 'get_user_orders';

-- STEP 2: Test the function directly (replace 'YOUR_USER_ID' with your actual user ID)
-- You can find your user ID in Supabase Auth > Users
-- Example: SELECT * FROM get_user_orders('123e4567-e89b-12d3-a456-426614174000');

-- STEP 3: If the function doesn't exist or isn't working, recreate it
-- This is the EXACT original function that was working before
DROP FUNCTION IF EXISTS get_user_orders(UUID);

CREATE OR REPLACE FUNCTION get_user_orders(user_uuid UUID)
RETURNS TABLE (
    order_id UUID,
    user_id UUID,
    guest_email TEXT,
    order_status TEXT,
    fulfillment_status TEXT,
    financial_status TEXT,
    total_price NUMERIC,
    order_created_at TIMESTAMP,
    items JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        om.id as order_id,
        om.user_id,
        om.guest_email,
        om.order_status,
        om.fulfillment_status,
        om.financial_status,
        om.total_price,
        om.order_created_at,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', oi.product_name,
                    'product_category', oi.product_category,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'total_price', oi.total_price,
                    'calculator_selections', oi.calculator_selections,
                    'custom_files', oi.custom_files,
                    'customer_notes', oi.customer_notes
                )
            ) FILTER (WHERE oi.id IS NOT NULL), 
            '[]'::jsonb
        ) as items
    FROM 
        orders_main om
    LEFT JOIN 
        order_items_new oi ON om.id = oi.order_id
    WHERE 
        om.user_id = user_uuid
    GROUP BY 
        om.id,
        om.user_id,
        om.guest_email,
        om.order_status,
        om.fulfillment_status,
        om.financial_status,
        om.total_price,
        om.order_created_at
    ORDER BY 
        om.order_created_at DESC;
END;
$$;

-- STEP 4: Grant execute permissions (important!)
GRANT EXECUTE ON FUNCTION get_user_orders(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_user_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_orders(UUID) TO service_role;

-- STEP 5: Test the function again after recreation
-- Replace with your actual user ID
-- SELECT * FROM get_user_orders('YOUR_USER_ID_HERE');

-- STEP 6: Alternative - Get tracking info directly without modifying the function
-- This query shows how to get orders with tracking for any user
SELECT 
    om.id,
    om.order_number,
    om.order_status,
    om.tracking_number,
    om.tracking_company,
    om.tracking_url,
    om.total_price
FROM orders_main om
WHERE om.user_id = 'YOUR_USER_ID_HERE'
ORDER BY om.created_at DESC; 