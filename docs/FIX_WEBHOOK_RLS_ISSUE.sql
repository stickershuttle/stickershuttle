-- Check existing RLS policies on orders_main table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'orders_main';

-- Check if the service role has the bypassrls privilege
SELECT 
    rolname,
    rolsuper,
    rolbypassrls
FROM pg_roles
WHERE rolname LIKE '%service%';

-- Create a function to update order payment status
-- This function will run with the privileges of the role that created it (superuser)
-- and will bypass RLS
CREATE OR REPLACE FUNCTION update_order_payment_status(
    p_order_id UUID,
    p_payment_intent_id TEXT,
    p_session_id TEXT,
    p_order_status TEXT,
    p_financial_status TEXT,
    p_order_number TEXT,
    p_subtotal NUMERIC,
    p_tax NUMERIC,
    p_total NUMERIC,
    p_proof_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    order_number TEXT,
    order_status TEXT,
    financial_status TEXT,
    stripe_payment_intent_id TEXT,
    stripe_session_id TEXT,
    total_price NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER  -- This makes the function run with superuser privileges
AS $$
BEGIN
    -- Update the order
    UPDATE orders_main
    SET 
        stripe_payment_intent_id = p_payment_intent_id,
        stripe_session_id = p_session_id,
        order_status = p_order_status,
        financial_status = p_financial_status,
        order_number = p_order_number,
        subtotal_price = p_subtotal,
        total_tax = p_tax,
        total_price = p_total,
        proof_status = COALESCE(p_proof_status, proof_status),
        order_updated_at = NOW(),
        updated_at = NOW()
    WHERE orders_main.id = p_order_id;
    
    -- Return the updated order
    RETURN QUERY
    SELECT 
        om.id,
        om.order_number,
        om.order_status,
        om.financial_status,
        om.stripe_payment_intent_id,
        om.stripe_session_id,
        om.total_price
    FROM orders_main om
    WHERE om.id = p_order_id;
END;
$$;

-- Grant execute permission to the authenticated and service roles
GRANT EXECUTE ON FUNCTION update_order_payment_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_order_payment_status TO service_role;

-- Alternative approach: Grant the service role bypassrls privilege
-- WARNING: Only do this if you trust the service role completely
-- ALTER ROLE service_role BYPASSRLS;

-- Check if there are any policies that might be referencing auth.users
SELECT 
    schemaname,
    tablename,
    policyname,
    qual,
    with_check
FROM pg_policies 
WHERE 
    (qual::text LIKE '%auth.users%' OR with_check::text LIKE '%auth.users%')
    AND tablename = 'orders_main';

-- Create a simpler RLS policy for service role if needed
-- This ensures service role can always update orders
CREATE POLICY "Service role can update all orders" 
ON orders_main
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Check current user and their permissions
SELECT current_user, current_role; 