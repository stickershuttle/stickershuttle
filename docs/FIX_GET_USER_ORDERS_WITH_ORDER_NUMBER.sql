-- Fix the get_user_orders function to include order_number field
-- This will ensure the dashboard shows the correct order number (SS-00001 format)

-- First drop the existing function
DROP FUNCTION IF EXISTS get_user_orders(UUID);

-- Recreate with order_number field added
CREATE FUNCTION get_user_orders(user_uuid UUID)
RETURNS TABLE (
    order_id UUID,
    user_id UUID,
    guest_email TEXT,
    order_number TEXT,              -- Added order_number field
    order_status TEXT,
    fulfillment_status TEXT,
    financial_status TEXT,
    tracking_number TEXT,
    tracking_company TEXT,
    tracking_url TEXT,
    total_price NUMERIC,
    order_created_at TIMESTAMPTZ,
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
        om.order_number,            -- Include order_number in SELECT
        om.order_status,
        om.fulfillment_status,
        om.financial_status,
        om.tracking_number,
        om.tracking_company,
        om.tracking_url,
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
        om.order_number,            -- Include in GROUP BY
        om.order_status,
        om.fulfillment_status,
        om.financial_status,
        om.tracking_number,
        om.tracking_company,
        om.tracking_url,
        om.total_price,
        om.order_created_at
    ORDER BY 
        om.order_created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_orders(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_user_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_orders(UUID) TO service_role;

-- Test the function to verify it returns order_number
-- SELECT order_id, order_number, order_created_at FROM get_user_orders('YOUR_USER_ID_HERE') LIMIT 5; 