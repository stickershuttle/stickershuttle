-- First, let's see what RLS policies exist on orders_main
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
WHERE tablename = 'orders_main'
ORDER BY policyname;

-- Check if the service role exists and has bypassrls
SELECT 
    rolname,
    rolsuper,
    rolbypassrls,
    rolinherit,
    rolcreaterole,
    rolcreatedb
FROM pg_roles
WHERE rolname IN ('service_role', 'authenticator', 'authenticated', 'anon')
ORDER BY rolname;

-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Service role can update all orders" ON orders_main;

-- Create or replace the function (this will update if it exists)
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

-- Grant execute permission to the roles
GRANT EXECUTE ON FUNCTION update_order_payment_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_order_payment_status TO service_role;
GRANT EXECUTE ON FUNCTION update_order_payment_status TO anon; -- Just in case

-- Check if any RLS policies reference auth.users
SELECT 
    'Policy references auth.users' as issue,
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE 
    (qual::text LIKE '%auth.users%' OR with_check::text LIKE '%auth.users%')
    AND tablename IN ('orders_main', 'order_items_new');

-- Create a better policy for service role that ensures it can always update
DO $$
BEGIN
    -- Check if RLS is enabled
    IF EXISTS (
        SELECT 1 
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE t.tablename = 'orders_main' 
        AND t.schemaname = 'public'
        AND c.relrowsecurity = true
    ) THEN
        -- Create policy for service role
        CREATE POLICY "Service role full access to orders" 
        ON orders_main
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
        
        RAISE NOTICE 'Created service role policy for orders_main';
    ELSE
        RAISE NOTICE 'RLS is not enabled on orders_main';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Service role policy already exists';
END;
$$;

-- Test the function exists and has correct permissions
SELECT 
    p.proname as function_name,
    p.prosecdef as security_definer,
    p.proowner::regrole as owner,
    array_agg(
        (SELECT rolname FROM pg_roles WHERE oid = a.grantee)
        || ' ' || 
        CASE 
            WHEN a.privilege_type = 'EXECUTE' THEN 'EXECUTE'
            ELSE a.privilege_type
        END
    ) as permissions
FROM pg_proc p
LEFT JOIN information_schema.routine_privileges a 
    ON a.specific_name = p.proname || '_' || p.oid
WHERE p.proname = 'update_order_payment_status'
GROUP BY p.proname, p.prosecdef, p.proowner;

-- Check if we need to grant bypassrls to service_role
-- This is a more aggressive fix but might be necessary
SELECT 
    'To enable bypassrls for service_role, run:' as instruction,
    'ALTER ROLE service_role BYPASSRLS;' as command
WHERE EXISTS (
    SELECT 1 FROM pg_roles 
    WHERE rolname = 'service_role' 
    AND NOT rolbypassrls
);

-- Show current RLS status for orders_main
SELECT 
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'orders_main'
AND n.nspname = 'public'; 