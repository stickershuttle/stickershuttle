-- Discount System Schema Migration
-- This creates the tables and functions needed for the discount/coupon system

-- Create discount_codes table
CREATE TABLE IF NOT EXISTS discount_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
    discount_value NUMERIC(10,2) NOT NULL,
    minimum_order_amount NUMERIC(10,2) DEFAULT 0,
    usage_limit INTEGER, -- NULL for unlimited
    usage_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create discount_usage table to track who used what discount
CREATE TABLE IF NOT EXISTS discount_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    discount_code_id UUID REFERENCES discount_codes(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders_main(id),
    user_id UUID REFERENCES auth.users(id),
    guest_email VARCHAR(255),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    discount_amount NUMERIC(10,2) NOT NULL,
    CONSTRAINT unique_discount_order UNIQUE(discount_code_id, order_id)
);

-- Add discount fields to orders_main table
ALTER TABLE orders_main 
ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(active);
CREATE INDEX IF NOT EXISTS idx_discount_codes_valid_dates ON discount_codes(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_discount_usage_code ON discount_usage(discount_code_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_user ON discount_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_order ON discount_usage(order_id);

-- Create function to increment discount usage count
CREATE OR REPLACE FUNCTION increment_discount_usage(code_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE discount_codes 
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = code_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate discount code
CREATE OR REPLACE FUNCTION validate_discount_code(
    p_code VARCHAR(50),
    p_order_amount NUMERIC,
    p_user_id UUID DEFAULT NULL,
    p_guest_email VARCHAR(255) DEFAULT NULL
)
RETURNS TABLE (
    is_valid BOOLEAN,
    discount_id UUID,
    discount_type VARCHAR(20),
    discount_value NUMERIC(10,2),
    discount_amount NUMERIC(10,2),
    message TEXT
) AS $$
DECLARE
    v_discount RECORD;
    v_discount_amount NUMERIC(10,2);
    v_has_used BOOLEAN;
BEGIN
    -- Get the discount code
    SELECT * INTO v_discount
    FROM discount_codes
    WHERE UPPER(code) = UPPER(p_code)
      AND active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            false, 
            NULL::UUID, 
            NULL::VARCHAR(20), 
            NULL::NUMERIC(10,2), 
            NULL::NUMERIC(10,2), 
            'Invalid discount code'::TEXT;
        RETURN;
    END IF;
    
    -- Check validity dates
    IF NOW() < v_discount.valid_from THEN
        RETURN QUERY SELECT 
            false, 
            v_discount.id, 
            v_discount.discount_type, 
            v_discount.discount_value, 
            NULL::NUMERIC(10,2), 
            'Discount code is not yet valid'::TEXT;
        RETURN;
    END IF;
    
    IF v_discount.valid_until IS NOT NULL AND NOW() > v_discount.valid_until THEN
        RETURN QUERY SELECT 
            false, 
            v_discount.id, 
            v_discount.discount_type, 
            v_discount.discount_value, 
            NULL::NUMERIC(10,2), 
            'Discount code has expired'::TEXT;
        RETURN;
    END IF;
    
    -- Check minimum order amount
    IF p_order_amount < v_discount.minimum_order_amount THEN
        RETURN QUERY SELECT 
            false, 
            v_discount.id, 
            v_discount.discount_type, 
            v_discount.discount_value, 
            NULL::NUMERIC(10,2), 
            format('Minimum order amount of $%s required', v_discount.minimum_order_amount)::TEXT;
        RETURN;
    END IF;
    
    -- Check usage limit
    IF v_discount.usage_limit IS NOT NULL AND v_discount.usage_count >= v_discount.usage_limit THEN
        RETURN QUERY SELECT 
            false, 
            v_discount.id, 
            v_discount.discount_type, 
            v_discount.discount_value, 
            NULL::NUMERIC(10,2), 
            'Discount code usage limit reached'::TEXT;
        RETURN;
    END IF;
    
    -- Check if user has already used this code (optional check)
    IF p_user_id IS NOT NULL OR p_guest_email IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM discount_usage
            WHERE discount_code_id = v_discount.id
              AND (
                  (p_user_id IS NOT NULL AND user_id = p_user_id)
                  OR (p_guest_email IS NOT NULL AND guest_email = p_guest_email)
              )
        ) INTO v_has_used;
        
        IF v_has_used THEN
            RETURN QUERY SELECT 
                false, 
                v_discount.id, 
                v_discount.discount_type, 
                v_discount.discount_value, 
                NULL::NUMERIC(10,2), 
                'You have already used this discount code'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Calculate discount amount
    IF v_discount.discount_type = 'percentage' THEN
        v_discount_amount := ROUND(p_order_amount * (v_discount.discount_value / 100), 2);
    ELSIF v_discount.discount_type = 'fixed_amount' THEN
        v_discount_amount := LEAST(v_discount.discount_value, p_order_amount);
    ELSE -- free_shipping
        v_discount_amount := 0; -- Will be handled in shipping calculation
    END IF;
    
    -- Return success
    RETURN QUERY SELECT 
        true, 
        v_discount.id, 
        v_discount.discount_type, 
        v_discount.discount_value, 
        v_discount_amount, 
        'Discount code applied successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create view for discount statistics
CREATE OR REPLACE VIEW discount_statistics AS
SELECT 
    dc.id,
    dc.code,
    dc.description,
    dc.discount_type,
    dc.discount_value,
    dc.usage_count,
    dc.usage_limit,
    COUNT(du.id) as actual_usage_count,
    COALESCE(SUM(du.discount_amount), 0) as total_discount_given,
    COALESCE(AVG(om.total_price), 0) as average_order_value,
    dc.active,
    dc.valid_from,
    dc.valid_until
FROM discount_codes dc
LEFT JOIN discount_usage du ON dc.id = du.discount_code_id
LEFT JOIN orders_main om ON du.order_id = om.id
GROUP BY dc.id;

-- Create trigger to update discount_codes updated_at
CREATE OR REPLACE FUNCTION update_discount_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_discount_codes_updated_at_trigger
BEFORE UPDATE ON discount_codes
FOR EACH ROW
EXECUTE FUNCTION update_discount_codes_updated_at();

-- Grant necessary permissions
GRANT SELECT ON discount_codes TO authenticated;
GRANT SELECT ON discount_usage TO authenticated;
GRANT SELECT ON discount_statistics TO authenticated;

-- Admin permissions (you may need to adjust based on your role setup)
GRANT ALL ON discount_codes TO service_role;
GRANT ALL ON discount_usage TO service_role;

-- Sample discount codes for testing (commented out, uncomment to use)
/*
INSERT INTO discount_codes (code, description, discount_type, discount_value, minimum_order_amount, usage_limit)
VALUES 
    ('WELCOME10', 'Welcome discount - 10% off', 'percentage', 10, 0, NULL),
    ('SAVE20', 'Save $20 on orders over $100', 'fixed_amount', 20, 100, NULL),
    ('FLASH50', 'Flash sale - 50% off', 'percentage', 50, 0, 100),
    ('FREESHIP', 'Free shipping on any order', 'free_shipping', 0, 0, NULL);
*/ 