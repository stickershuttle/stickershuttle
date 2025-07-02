-- STEP 1: Drop existing functions that might conflict
DROP FUNCTION IF EXISTS public.use_credits_for_order(uuid, uuid, numeric);
DROP FUNCTION IF EXISTS public.use_credits_for_order(uuid, uuid, numeric, text, text);
DROP FUNCTION IF EXISTS public.use_credits_for_order(numeric, uuid, text, text, uuid);

-- STEP 2: Create credits table
CREATE TABLE IF NOT EXISTS credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    reason TEXT,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'used', 'adjusted', 'expired', 'reversed', 'deduction_pending_payment')),
    order_id UUID REFERENCES orders_main(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    expires_at TIMESTAMP WITH TIME ZONE,
    reversed_at TIMESTAMP WITH TIME ZONE,
    reversal_reason TEXT
);

-- STEP 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_order_id ON credits(order_id);
CREATE INDEX IF NOT EXISTS idx_credits_created_at ON credits(created_at);
CREATE INDEX IF NOT EXISTS idx_credits_transaction_type ON credits(transaction_type);

-- STEP 4: Create notifications table
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

-- STEP 5: Create notification indexes
CREATE INDEX IF NOT EXISTS idx_credit_notifications_user_id ON credit_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_notifications_read ON credit_notifications(read);

-- STEP 6: Create balance view
CREATE OR REPLACE VIEW user_credit_balance AS
SELECT 
    user_id,
    COALESCE(SUM(CASE 
        WHEN transaction_type IN ('earned', 'adjusted') AND reversed_at IS NULL THEN amount
        WHEN transaction_type IN ('used', 'deduction_pending_payment') AND reversed_at IS NULL THEN -amount
        WHEN transaction_type = 'reversed' THEN 0
        ELSE 0
    END), 0) AS total_credits,
    COUNT(*) AS transaction_count,
    MAX(created_at) AS last_transaction_date
FROM credits
WHERE (expires_at IS NULL OR expires_at > NOW())
GROUP BY user_id;

-- STEP 7: Grant permissions
GRANT ALL ON credits TO authenticated;
GRANT ALL ON credit_notifications TO authenticated;
GRANT SELECT ON user_credit_balance TO authenticated;

-- STEP 8: Enable RLS
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notifications ENABLE ROW LEVEL SECURITY;

-- STEP 9: Create RLS policies
CREATE POLICY "Users can view their own credits" ON credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all credits" ON credits
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view their own notifications" ON credit_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON credit_notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notifications" ON credit_notifications
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Now run the functions SQL separately in the next query 