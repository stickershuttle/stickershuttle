-- Create Credits System for Sticker Shuttle
-- This system allows for store credits that can be used at checkout

-- Create credits table
CREATE TABLE IF NOT EXISTS credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    reason TEXT,
    transaction_type TEXT CHECK (transaction_type IN ('add', 'deduct', 'used')),
    order_id UUID REFERENCES orders_main(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_created_at ON credits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credits_balance ON credits(balance) WHERE balance > 0;

-- Create a view for current credit balance
CREATE OR REPLACE VIEW user_credit_balance AS
SELECT 
    user_id,
    COALESCE(SUM(CASE 
        WHEN transaction_type = 'add' THEN amount 
        WHEN transaction_type IN ('deduct', 'used') THEN -amount 
        ELSE 0 
    END), 0) as total_credits,
    COUNT(*) as transaction_count,
    MAX(created_at) as last_transaction_date
FROM credits
WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP
GROUP BY user_id;

-- Create notifications table for credit additions
CREATE TABLE IF NOT EXISTS credit_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credit_id UUID NOT NULL REFERENCES credits(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    reason TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_notifications_user_id ON credit_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_notifications_read ON credit_notifications(user_id, read) WHERE read = FALSE;

-- Function to add credits to a user account
CREATE OR REPLACE FUNCTION add_user_credits(
    p_user_id UUID,
    p_amount DECIMAL,
    p_reason TEXT DEFAULT 'Store credit added',
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
    -- Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Credit amount must be positive';
    END IF;

    -- Insert credit transaction
    INSERT INTO credits (
        user_id,
        amount,
        balance,
        reason,
        transaction_type,
        created_by,
        expires_at
    ) VALUES (
        p_user_id,
        p_amount,
        p_amount,
        p_reason,
        'add',
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

-- Function to get user's current credit balance
CREATE OR REPLACE FUNCTION get_user_credit_balance(p_user_id UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance DECIMAL;
BEGIN
    SELECT COALESCE(SUM(CASE 
        WHEN transaction_type = 'add' THEN amount 
        WHEN transaction_type IN ('deduct', 'used') THEN -amount 
        ELSE 0 
    END), 0)
    INTO v_balance
    FROM credits
    WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);
    
    RETURN v_balance;
END;
$$;

-- Function to use credits at checkout
CREATE OR REPLACE FUNCTION use_credits_for_order(
    p_user_id UUID,
    p_order_id UUID,
    p_amount DECIMAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance DECIMAL;
BEGIN
    -- Get current balance
    v_balance := get_user_credit_balance(p_user_id);
    
    -- Check if user has enough credits
    IF v_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient credits. Available: %, Requested: %', v_balance, p_amount;
    END IF;
    
    -- Deduct credits
    INSERT INTO credits (
        user_id,
        amount,
        balance,
        reason,
        transaction_type,
        order_id
    ) VALUES (
        p_user_id,
        p_amount,
        0,
        'Credits used for order',
        'used',
        p_order_id
    );
    
    RETURN TRUE;
END;
$$;

-- Function to add credits to all users
CREATE OR REPLACE FUNCTION add_credits_to_all_users(
    p_amount DECIMAL,
    p_reason TEXT DEFAULT 'Promotional credit',
    p_created_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_user_id UUID;
BEGIN
    -- Add credits to all active users
    FOR v_user_id IN 
        SELECT id FROM auth.users 
        WHERE deleted_at IS NULL
    LOOP
        PERFORM add_user_credits(v_user_id, p_amount, p_reason, p_created_by);
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- Function to get unread credit notifications
CREATE OR REPLACE FUNCTION get_unread_credit_notifications(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    credit_id UUID,
    amount DECIMAL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cn.id,
        cn.credit_id,
        cn.amount,
        cn.reason,
        cn.created_at
    FROM credit_notifications cn
    WHERE cn.user_id = p_user_id
    AND cn.read = FALSE
    ORDER BY cn.created_at DESC;
END;
$$;

-- Function to mark credit notifications as read
CREATE OR REPLACE FUNCTION mark_credit_notifications_read(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE credit_notifications
    SET read = TRUE
    WHERE user_id = p_user_id
    AND read = FALSE;
END;
$$;

-- Enable RLS on tables
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credits
CREATE POLICY "Users can view own credits" ON credits
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all credits" ON credits
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for credit_notifications
CREATE POLICY "Users can view own notifications" ON credit_notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON credit_notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all notifications" ON credit_notifications
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Add credit_amount column to orders_main to track credits used
ALTER TABLE orders_main 
ADD COLUMN IF NOT EXISTS credit_amount DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN orders_main.credit_amount IS 'Amount of store credits used for this order';

-- Grant permissions
GRANT SELECT ON credits TO authenticated;
GRANT SELECT ON credit_notifications TO authenticated;
GRANT UPDATE (read) ON credit_notifications TO authenticated;
GRANT SELECT ON user_credit_balance TO authenticated;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION get_user_credit_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_credit_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION mark_credit_notifications_read TO authenticated; 