-- Enhanced Credit System: Add Order-Linked Credit Earning
-- This adds the ability to link earned credits directly to specific orders

-- Create a new function to add credits with order linkage
CREATE OR REPLACE FUNCTION add_user_credits_with_order(
    p_user_id UUID,
    p_amount DECIMAL,
    p_reason TEXT DEFAULT 'Store credit added',
    p_order_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS credits
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_credit credits;
BEGIN
    -- Validate input
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Credit amount must be positive';
    END IF;
    
    -- Insert credit transaction with order linkage
    INSERT INTO credits (
        user_id,
        amount,
        balance,
        reason,
        transaction_type,
        order_id,
        created_by,
        expires_at
    ) VALUES (
        p_user_id,
        p_amount,
        p_amount,
        p_reason,
        'add',
        p_order_id,
        p_created_by,
        p_expires_at
    ) RETURNING * INTO v_credit;

    -- Create notification
    INSERT INTO credit_notifications (
        user_id,
        credit_id,
        amount,
        reason
    ) VALUES (
        p_user_id,
        v_credit.id,
        p_amount,
        p_reason
    );

    RETURN v_credit;
END;
$$;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION add_user_credits_with_order TO authenticated;

-- Example usage:
-- SELECT add_user_credits_with_order(
--     'user-uuid-here'::UUID, 
--     5.00, 
--     '$5.00 earned from your recent order', 
--     'order-uuid-here'::UUID
-- ); 