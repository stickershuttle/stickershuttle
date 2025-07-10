-- First, let's check if the functions exist
SELECT 
    routine_name,
    routine_type,
    data_type,
    is_deterministic
FROM information_schema.routines 
WHERE routine_name LIKE '%discount%'
AND routine_schema = 'public';

-- Check the specific function signature
SELECT 
    p.proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments,
    pg_catalog.pg_get_function_result(p.oid) as return_type
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname LIKE '%discount%'
AND n.nspname = 'public';

-- Drop existing functions if they exist (to avoid conflicts)
DROP FUNCTION IF EXISTS public.validate_discount_code(TEXT, DECIMAL, UUID, TEXT);
DROP FUNCTION IF EXISTS public.increment_discount_usage(UUID);

-- Recreate the validate_discount_code function with correct types
CREATE OR REPLACE FUNCTION public.validate_discount_code(
    p_code TEXT,
    p_order_amount DECIMAL,
    p_user_id UUID DEFAULT NULL,
    p_guest_email TEXT DEFAULT NULL
)
RETURNS TABLE(
    is_valid BOOLEAN,
    discount_id UUID,
    discount_type TEXT,
    discount_value DECIMAL,
    discount_amount DECIMAL,
    message TEXT
) AS $$
DECLARE
    v_discount_record RECORD;
    v_usage_count INTEGER;
    v_calculated_discount DECIMAL;
BEGIN
    -- Initialize default values
    is_valid := FALSE;
    discount_id := NULL;
    discount_type := NULL;
    discount_value := NULL;
    discount_amount := 0;
    message := 'Invalid discount code';
    
    -- Check if discount code exists and is active
    SELECT * INTO v_discount_record
    FROM discount_codes
    WHERE UPPER(code) = UPPER(p_code)
    AND active = TRUE;
    
    IF NOT FOUND THEN
        message := 'Discount code not found or inactive';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Check if discount is within valid date range
    IF v_discount_record.valid_from > NOW() THEN
        message := 'Discount code is not yet valid';
        RETURN NEXT;
        RETURN;
    END IF;
    
    IF v_discount_record.valid_until IS NOT NULL AND v_discount_record.valid_until < NOW() THEN
        message := 'Discount code has expired';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Check minimum order amount
    IF p_order_amount < v_discount_record.minimum_order_amount THEN
        message := 'Order amount does not meet minimum requirement of $' || v_discount_record.minimum_order_amount::TEXT;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Check usage limit
    IF v_discount_record.usage_limit IS NOT NULL THEN
        SELECT COUNT(*) INTO v_usage_count
        FROM discount_usage
        WHERE discount_code_id = v_discount_record.id;
        
        IF v_usage_count >= v_discount_record.usage_limit THEN
            message := 'Discount code has reached its usage limit';
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Calculate discount amount based on type
    CASE v_discount_record.discount_type
        WHEN 'percentage' THEN
            v_calculated_discount := ROUND((p_order_amount * v_discount_record.discount_value / 100), 2);
        WHEN 'fixed_amount' THEN
            v_calculated_discount := v_discount_record.discount_value;
        WHEN 'free_shipping' THEN
            v_calculated_discount := 0; -- Free shipping handling would be done separately
        ELSE
            v_calculated_discount := 0;
    END CASE;
    
    -- Ensure discount doesn't exceed order amount
    IF v_calculated_discount > p_order_amount THEN
        v_calculated_discount := p_order_amount;
    END IF;
    
    -- Return successful validation
    is_valid := TRUE;
    discount_id := v_discount_record.id;
    discount_type := v_discount_record.discount_type;
    discount_value := v_discount_record.discount_value;
    discount_amount := v_calculated_discount;
    message := 'Discount code is valid';
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the increment_discount_usage function
CREATE OR REPLACE FUNCTION public.increment_discount_usage(
    code_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE discount_codes
    SET usage_count = COALESCE(usage_count, 0) + 1
    WHERE id = code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_discount_code(TEXT, DECIMAL, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_discount_code(TEXT, DECIMAL, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_discount_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_discount_usage(UUID) TO anon;

-- Test the function with a sample call
SELECT * FROM public.validate_discount_code('SPONSOR', 100.00, NULL, NULL);

-- Check if functions now exist
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name LIKE '%discount%'
AND routine_schema = 'public'; 