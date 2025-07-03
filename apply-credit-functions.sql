-- Credit System Functions Migration
-- This script creates the missing credit notification functions

-- Function to get unread credit notifications
CREATE OR REPLACE FUNCTION get_unread_credit_notifications(p_user_id UUID)
RETURNS SETOF credit_notifications AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM credit_notifications
    WHERE user_id = p_user_id AND read = FALSE
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to mark credit notifications as read
CREATE OR REPLACE FUNCTION mark_credit_notifications_read(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE credit_notifications
    SET read = TRUE
    WHERE user_id = p_user_id AND read = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to get user credit balance
CREATE OR REPLACE FUNCTION get_user_credit_balance(p_user_id UUID)
RETURNS DECIMAL AS $$
BEGIN
    RETURN COALESCE(
        (SELECT total_credits FROM user_credit_balance WHERE user_id = p_user_id),
        0
    );
END;
$$ LANGUAGE plpgsql;

-- Function to add user credits
CREATE OR REPLACE FUNCTION add_user_credits(
    p_user_id UUID,
    p_amount DECIMAL,
    p_reason TEXT,
    p_created_by UUID,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
    v_credit_id UUID;
BEGIN
    -- Get current balance
    v_current_balance := get_user_credit_balance(p_user_id);
    v_new_balance := v_current_balance + p_amount;
    
    -- Insert credit transaction
    INSERT INTO credits (user_id, amount, balance, reason, transaction_type, created_by, expires_at)
    VALUES (p_user_id, p_amount, v_new_balance, p_reason, 'earned', p_created_by, p_expires_at)
    RETURNING id INTO v_credit_id;
    
    -- Create notification
    INSERT INTO credit_notifications (user_id, credit_id, type, title, message)
    VALUES (
        p_user_id,
        v_credit_id,
        'credit_added',
        'Credits Added!',
        FORMAT('$%s in store credits have been added to your account. %s', p_amount, COALESCE(p_reason, ''))
    );
    
    RETURN json_build_object(
        'id', v_credit_id,
        'amount', p_amount,
        'balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql;

-- Function to use credits for an order
CREATE OR REPLACE FUNCTION use_credits_for_order(
    p_user_id UUID,
    p_order_id UUID,
    p_amount DECIMAL,
    p_reason TEXT DEFAULT 'Applied to order',
    p_transaction_type TEXT DEFAULT 'used'
)
RETURNS JSON AS $$
DECLARE
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
    v_credit_id UUID;
BEGIN
    -- Get current balance
    v_current_balance := get_user_credit_balance(p_user_id);
    
    -- Check if user has enough credits
    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient credits. Available: %, Required: %', v_current_balance, p_amount;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance - p_amount;
    
    -- Insert credit transaction
    INSERT INTO credits (user_id, amount, balance, reason, transaction_type, order_id)
    VALUES (p_user_id, p_amount, v_new_balance, COALESCE(p_reason, 'Applied to order'), COALESCE(p_transaction_type, 'used'), p_order_id)
    RETURNING id INTO v_credit_id;
    
    -- Create notification
    INSERT INTO credit_notifications (user_id, credit_id, type, title, message)
    VALUES (
        p_user_id,
        v_credit_id,
        'credit_used',
        'Credits Applied',
        FORMAT('$%s in store credits applied to your order.', p_amount)
    );
    
    RETURN json_build_object(
        'id', v_credit_id,
        'amount', p_amount,
        'balance', v_new_balance,
        'success', true
    );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_unread_credit_notifications(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_credit_notifications_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_credit_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_credits(UUID, DECIMAL, TEXT, UUID, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION use_credits_for_order(UUID, UUID, DECIMAL, TEXT, TEXT) TO authenticated;

-- Also grant to service role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role; 