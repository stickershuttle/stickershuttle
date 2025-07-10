# Fix for Discount Code Error

## Problem
The discount code validation is failing with this error:
```
Error validating discount code: Could not find the function public.validate_discount_code
```

**UPDATE:** If you're seeing this error instead:
```
invalid input syntax for type bigint: "23e03c4b-5c92-42b1-9abc-d7a35cea70ff"
```

This means the function was created but with the wrong data type. The updated SQL below fixes this issue.

## Solution
The database is missing the `validate_discount_code` function OR it was created with the wrong data type. You need to run this SQL in your Supabase dashboard.

## Steps to Fix

1. **Open your Supabase dashboard**
2. **Go to SQL Editor**
3. **Run the following SQL:**

```sql
-- Create discount validation function
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

-- Create increment usage function if it doesn't exist
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
```

4. **Click "Run" to execute the SQL**

## After Running the SQL

Once you've run the SQL successfully, your discount codes should work properly. This fixes both the "function not found" error and the "invalid input syntax for type bigint" error. The function will:

- ✅ Check if the discount code exists and is active
- ✅ Verify the code is within valid date ranges
- ✅ Check minimum order amount requirements
- ✅ Verify usage limits haven't been exceeded
- ✅ Calculate the correct discount amount based on type (percentage, fixed amount, or free shipping)
- ✅ Return proper validation results

## Testing

After running the SQL, test your discount codes by:
1. Going to your cart
2. Entering a discount code (like "SPONSOR")
3. Verifying it applies correctly

The "Error validating discount code" message should be gone and discounts should work properly.

## Notes

- The function handles both percentage and fixed amount discounts
- Free shipping discounts are supported but handled separately
- Usage limits are enforced to prevent overuse
- The function is secure and prevents SQL injection attacks 