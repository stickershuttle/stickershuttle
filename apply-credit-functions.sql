-- Credit System Functions Migration
-- This script creates the missing credit notification functions

-- Add wholesale customer fields to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_wholesale_customer BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS wholesale_credit_rate DECIMAL(5,4) DEFAULT 0.05; -- 5% for regular, 10% for wholesale
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS wholesale_monthly_customers TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS wholesale_ordering_for TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS wholesale_fit_explanation TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS wholesale_status VARCHAR(20) DEFAULT 'pending'; -- pending, approved, rejected
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS wholesale_approved_at TIMESTAMP;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS wholesale_approved_by UUID;

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

-- Function to get user's credit rate based on wholesale status
CREATE OR REPLACE FUNCTION get_user_credit_rate(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_credit_rate DECIMAL;
BEGIN
    -- Get the user's credit rate from their profile
    SELECT COALESCE(wholesale_credit_rate, 0.05) INTO v_credit_rate
    FROM user_profiles 
    WHERE user_id = p_user_id;
    
    -- If no profile found, default to 5%
    IF v_credit_rate IS NULL THEN
        v_credit_rate := 0.05;
    END IF;
    
    RETURN v_credit_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to grant signup credits for wholesale customers
CREATE OR REPLACE FUNCTION grant_wholesale_signup_credits(
    p_user_id UUID,
    p_signup_credit_amount DECIMAL DEFAULT 0.00
)
RETURNS JSON AS $$
DECLARE
    v_credit_id UUID;
    v_new_balance DECIMAL;
    v_current_balance DECIMAL;
BEGIN
    -- Only grant credits if amount is greater than 0
    IF p_signup_credit_amount <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No signup credits to grant'
        );
    END IF;
    
    -- Get current balance
    v_current_balance := get_user_credit_balance(p_user_id);
    v_new_balance := v_current_balance + p_signup_credit_amount;
    
    -- Insert credit transaction
    INSERT INTO credits (user_id, amount, balance, reason, transaction_type, created_by, expires_at)
    VALUES (p_user_id, p_signup_credit_amount, v_new_balance, 'Welcome to wholesale program! Thank you for joining.', 'earned', null, null)
    RETURNING id INTO v_credit_id;
    
    -- Create notification
    INSERT INTO credit_notifications (user_id, credit_id, type, title, message)
    VALUES (
        p_user_id,
        v_credit_id,
        'credit_added',
        'Welcome Credits Added!',
        FORMAT('$%s in store credits have been added to your account as a welcome bonus!', p_signup_credit_amount)
    );
    
    RETURN json_build_object(
        'success', true,
        'credit_id', v_credit_id,
        'amount', p_signup_credit_amount,
        'new_balance', v_new_balance,
        'message', 'Signup credits granted successfully'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to add credits with dynamic rates and limits
CREATE OR REPLACE FUNCTION add_user_credits_with_dynamic_rate(
    p_user_id UUID,
    p_order_total DECIMAL,
    p_order_id UUID,
    p_credit_limit DECIMAL DEFAULT 100.00
)
RETURNS JSON AS $$
DECLARE
    v_current_balance DECIMAL;
    v_credit_rate DECIMAL;
    v_points_earned DECIMAL;
    v_actual_points_to_add DECIMAL;
    v_new_balance DECIMAL;
    v_credit_id UUID;
    v_is_wholesale BOOLEAN;
BEGIN
    -- Get current balance
    v_current_balance := get_user_credit_balance(p_user_id);
    
    -- Check if user has reached the credit limit
    IF v_current_balance >= p_credit_limit THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Credit limit reached',
            'current_balance', v_current_balance,
            'credit_limit', p_credit_limit
        );
    END IF;
    
    -- Get user's credit rate and wholesale status
    SELECT COALESCE(wholesale_credit_rate, 0.05), COALESCE(is_wholesale_customer, false) 
    INTO v_credit_rate, v_is_wholesale
    FROM user_profiles 
    WHERE user_id = p_user_id;
    
    -- If no profile found, default to 5%
    IF v_credit_rate IS NULL THEN
        v_credit_rate := 0.05;
        v_is_wholesale := false;
    END IF;
    
    -- Calculate points earned
    v_points_earned := ROUND((p_order_total * v_credit_rate) * 100) / 100;
    
    -- Calculate actual points to add (respecting credit limit)
    v_actual_points_to_add := LEAST(v_points_earned, p_credit_limit - v_current_balance);
    
    -- Only add credits if there's something to add
    IF v_actual_points_to_add <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No credits to add',
            'points_earned', v_points_earned,
            'current_balance', v_current_balance
        );
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance + v_actual_points_to_add;
    
    -- Insert credit transaction
    INSERT INTO credits (user_id, amount, balance, reason, transaction_type, order_id, created_by, expires_at)
    VALUES (p_user_id, v_actual_points_to_add, v_new_balance, 
            FORMAT('$%s earned from your recent order (%s%% %s rate)', 
                   v_actual_points_to_add, 
                   ROUND(v_credit_rate * 100), 
                   CASE WHEN v_is_wholesale THEN 'wholesale' ELSE 'standard' END), 
            'earned', p_order_id, null, null)
    RETURNING id INTO v_credit_id;
    
    -- Create notification
    INSERT INTO credit_notifications (user_id, credit_id, type, title, message)
    VALUES (
        p_user_id,
        v_credit_id,
        'credit_added',
        'Credits Earned!',
        FORMAT('$%s in store credits earned from your recent order! (%s%% %s rate)', 
               v_actual_points_to_add, 
               ROUND(v_credit_rate * 100),
               CASE WHEN v_is_wholesale THEN 'wholesale' ELSE 'standard' END)
    );
    
    RETURN json_build_object(
        'success', true,
        'credit_id', v_credit_id,
        'amount', v_actual_points_to_add,
        'new_balance', v_new_balance,
        'credit_rate', v_credit_rate,
        'is_wholesale', v_is_wholesale,
        'message', 'Credits added successfully'
    );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_unread_credit_notifications(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_credit_notifications_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_credit_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_credits(UUID, DECIMAL, TEXT, UUID, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION use_credits_for_order(UUID, UUID, DECIMAL, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_credit_rate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_wholesale_signup_credits(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_credits_with_dynamic_rate(UUID, DECIMAL, UUID, DECIMAL) TO authenticated;

-- Also grant to service role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role; 