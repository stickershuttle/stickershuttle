# Database Schema Documentation

## Tables

### orders_main
Main table for storing customer orders.

### order_items_new
Table for storing individual items within orders.

## Functions

### get_user_orders(user_uuid UUID)
Returns all orders for a specific user.

```sql
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
        order_items_new oi ON om.id = oi.customer_order_id
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
```

### claim_guest_orders(user_uuid UUID, user_email TEXT)
Claims guest orders for a newly registered user.

**Note**: This function needs to be created if it doesn't exist. 