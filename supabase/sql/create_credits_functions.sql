-- Create credit-related functions for the admin credit system

-- Function to add credits to a user with validation
CREATE OR REPLACE FUNCTION public.add_user_credits_with_limit(
    p_user_id UUID,
    p_amount DECIMAL,
    p_reason TEXT DEFAULT 'Store credit added by admin'
)
RETURNS JSON AS $$
DECLARE
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
    v_credit_id UUID;
    v_result JSON;
BEGIN
    -- Validate input parameters
    IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid parameters: user_id and positive amount are required';
    END IF;
    
    -- Get current user balance
    SELECT COALESCE(SUM(c.amount), 0) INTO v_current_balance
    FROM credits c
    WHERE c.user_id = p_user_id;
    
    -- Calculate new balance
    v_new_balance := v_current_balance + p_amount;
    
    -- Generate new credit ID
    v_credit_id := gen_random_uuid();
    
    -- Insert new credit transaction
    INSERT INTO credits (
        id,
        user_id,
        amount,
        balance,
        reason,
        transaction_type,
        created_at
    ) VALUES (
        v_credit_id,
        p_user_id,
        p_amount,
        v_new_balance,
        p_reason,
        'earned',
        NOW()
    );
    
    -- Return the credit transaction details as JSON
    SELECT json_build_object(
        'id', v_credit_id,
        'user_id', p_user_id,
        'amount', p_amount,
        'balance', v_new_balance,
        'reason', p_reason,
        'transaction_type', 'earned',
        'created_at', NOW(),
        'success', TRUE
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits to all users (admin only)
CREATE OR REPLACE FUNCTION public.add_credits_to_all_users(
    p_amount DECIMAL,
    p_reason TEXT DEFAULT 'Promotional credit',
    p_created_by UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_user_count INTEGER := 0;
    v_user_record RECORD;
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
BEGIN
    -- Validate input parameters
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid amount: positive amount is required';
    END IF;
    
    -- Loop through all users in auth.users
    FOR v_user_record IN
        SELECT DISTINCT id FROM auth.users
        WHERE deleted_at IS NULL
    LOOP
        -- Get current user balance
        SELECT COALESCE(SUM(c.amount), 0) INTO v_current_balance
        FROM credits c
        WHERE c.user_id = v_user_record.id;
        
        -- Calculate new balance
        v_new_balance := v_current_balance + p_amount;
        
        -- Insert credit transaction
        INSERT INTO credits (
            id,
            user_id,
            amount,
            balance,
            reason,
            transaction_type,
            created_at,
            created_by
        ) VALUES (
            gen_random_uuid(),
            v_user_record.id,
            p_amount,
            v_new_balance,
            p_reason,
            'earned',
            NOW(),
            p_created_by
        );
        
        v_user_count := v_user_count + 1;
    END LOOP;
    
    RETURN v_user_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user emails for admin (helper function)
CREATE OR REPLACE FUNCTION public.get_user_emails_for_admin(
    user_ids UUID[]
)
RETURNS TABLE(
    id UUID,
    email VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email
    FROM auth.users u
    WHERE u.id = ANY(user_ids)
    AND u.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.add_user_credits_with_limit(UUID, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits_to_all_users(DECIMAL, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_emails_for_admin(UUID[]) TO authenticated;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION public.add_user_credits_with_limit(UUID, DECIMAL, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_credits_to_all_users(DECIMAL, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_emails_for_admin(UUID[]) TO service_role;

-- Create an index on credits table for better performance
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_transaction_type ON credits(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credits_created_at ON credits(created_at); 