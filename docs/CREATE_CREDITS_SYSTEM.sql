-- Create credits table for storing all credit transactions
CREATE TABLE IF NOT EXISTS credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0, -- Running balance after this transaction
    reason TEXT,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'used', 'adjusted', 'expired', 'reversed')),
    order_id UUID REFERENCES orders_main(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    expires_at TIMESTAMP WITH TIME ZONE,
    reversed_at TIMESTAMP WITH TIME ZONE,
    reversal_reason TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_order_id ON credits(order_id);
CREATE INDEX IF NOT EXISTS idx_credits_created_at ON credits(created_at);
CREATE INDEX IF NOT EXISTS idx_credits_transaction_type ON credits(transaction_type);

-- Create credit notifications table
CREATE TABLE IF NOT EXISTS credit_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credit_id UUID REFERENCES credits(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('credit_added', 'credit_used', 'credit_expired', 'credit_reversed')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for credit notifications
CREATE INDEX IF NOT EXISTS idx_credit_notifications_user_id ON credit_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_notifications_read ON credit_notifications(read);

-- Create view for user credit balance
CREATE OR REPLACE VIEW user_credit_balance AS
SELECT 
    user_id,
    COALESCE(SUM(CASE 
        WHEN transaction_type IN ('earned', 'adjusted') AND reversed_at IS NULL THEN amount
        WHEN transaction_type = 'used' AND reversed_at IS NULL THEN -amount
        WHEN transaction_type = 'reversed' THEN 0
        ELSE 0
    END), 0) AS total_credits,
    COUNT(*) AS transaction_count,
    MAX(created_at) AS last_transaction_date
FROM credits
WHERE (expires_at IS NULL OR expires_at > NOW())
GROUP BY user_id;

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
    VALUES (p_user_id, p_amount, v_new_balance, p_reason, p_transaction_type, p_order_id)
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

-- Function to reverse a credit transaction
CREATE OR REPLACE FUNCTION reverse_credit_transaction(
    p_transaction_id UUID,
    p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
    v_transaction RECORD;
    v_new_credit_id UUID;
    v_new_balance DECIMAL;
BEGIN
    -- Get the original transaction
    SELECT * INTO v_transaction
    FROM credits
    WHERE id = p_transaction_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;
    
    IF v_transaction.reversed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Transaction already reversed';
    END IF;
    
    -- Mark original transaction as reversed
    UPDATE credits
    SET reversed_at = NOW(), reversal_reason = p_reason
    WHERE id = p_transaction_id;
    
    -- Calculate new balance
    v_new_balance := get_user_credit_balance(v_transaction.user_id);
    
    -- Create reversal transaction
    INSERT INTO credits (
        user_id, amount, balance, reason, transaction_type, order_id, created_by
    ) VALUES (
        v_transaction.user_id,
        v_transaction.amount,
        v_new_balance + v_transaction.amount,
        FORMAT('Reversal: %s', p_reason),
        'reversed',
        v_transaction.order_id,
        v_transaction.user_id
    ) RETURNING id INTO v_new_credit_id;
    
    -- Create notification
    INSERT INTO credit_notifications (user_id, credit_id, type, title, message)
    VALUES (
        v_transaction.user_id,
        v_new_credit_id,
        'credit_reversed',
        'Credits Refunded',
        FORMAT('$%s in store credits have been refunded. %s', v_transaction.amount, p_reason)
    );
    
    RETURN json_build_object(
        'id', v_new_credit_id,
        'amount', v_transaction.amount,
        'success', true
    );
END;
$$ LANGUAGE plpgsql;

-- Function to confirm a credit transaction
CREATE OR REPLACE FUNCTION confirm_credit_transaction(
    p_transaction_id UUID,
    p_order_id UUID,
    p_reason TEXT DEFAULT 'Transaction confirmed'
)
RETURNS JSON AS $$
DECLARE
    v_transaction RECORD;
BEGIN
    -- Get the transaction
    SELECT * INTO v_transaction
    FROM credits
    WHERE id = p_transaction_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;
    
    -- Update order_id if provided
    IF p_order_id IS NOT NULL THEN
        UPDATE credits
        SET order_id = p_order_id
        WHERE id = p_transaction_id;
    END IF;
    
    RETURN json_build_object(
        'id', p_transaction_id,
        'amount', v_transaction.amount,
        'confirmedAt', NOW(),
        'success', true
    );
END;
$$ LANGUAGE plpgsql;

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

-- Function to add user credits with order linkage (for cashback)
CREATE OR REPLACE FUNCTION add_user_credits_with_order(
    p_user_id UUID,
    p_amount DECIMAL,
    p_reason TEXT,
    p_order_id UUID,
    p_created_by UUID DEFAULT NULL,
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
    
    -- Insert credit transaction linked to order
    INSERT INTO credits (user_id, amount, balance, reason, transaction_type, order_id, created_by, expires_at)
    VALUES (p_user_id, p_amount, v_new_balance, p_reason, 'earned', p_order_id, p_created_by, p_expires_at)
    RETURNING id INTO v_credit_id;
    
    -- Create notification
    INSERT INTO credit_notifications (user_id, credit_id, type, title, message)
    VALUES (
        p_user_id,
        v_credit_id,
        'credit_added',
        'Credits Earned!',
        p_reason
    );
    
    RETURN json_build_object(
        'id', v_credit_id,
        'amount', p_amount,
        'balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql;

-- Function to add credits to all users
CREATE OR REPLACE FUNCTION add_credits_to_all_users(
    p_amount DECIMAL,
    p_reason TEXT,
    p_created_by UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_user_count INTEGER := 0;
    v_user RECORD;
BEGIN
    FOR v_user IN SELECT id FROM auth.users WHERE deleted_at IS NULL
    LOOP
        PERFORM add_user_credits(v_user.id, p_amount, p_reason, p_created_by);
        v_user_count := v_user_count + 1;
    END LOOP;
    
    RETURN v_user_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON credits TO authenticated;
GRANT ALL ON credit_notifications TO authenticated;
GRANT SELECT ON user_credit_balance TO authenticated;

-- Enable Row Level Security
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credits table
CREATE POLICY "Users can view their own credits" ON credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all credits" ON credits
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for credit_notifications table
CREATE POLICY "Users can view their own notifications" ON credit_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON credit_notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notifications" ON credit_notifications
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role'); 