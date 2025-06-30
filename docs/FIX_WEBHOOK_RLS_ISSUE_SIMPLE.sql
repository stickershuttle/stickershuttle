-- 1. Check existing RLS policies on orders_main
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'orders_main'
ORDER BY policyname;

-- 2. Check service_role permissions
SELECT 
    rolname,
    rolbypassrls
FROM pg_roles
WHERE rolname = 'service_role';

-- 3. Create or replace the update function
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
SECURITY DEFINER
SET search_path = public, auth
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

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION update_order_payment_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_order_payment_status TO service_role;
GRANT EXECUTE ON FUNCTION update_order_payment_status TO anon;

-- 5. Check if function was created
SELECT 
    proname as function_name,
    prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'update_order_payment_status';

-- 6. If service_role doesn't have bypassrls, consider running this:
-- ALTER ROLE service_role BYPASSRLS;

-- 7. Alternative: Create a simple service role policy
DROP POLICY IF EXISTS "service_role_all_access" ON orders_main;
CREATE POLICY "service_role_all_access" 
ON orders_main
FOR ALL
TO service_role
USING (true)
WITH CHECK (true); 