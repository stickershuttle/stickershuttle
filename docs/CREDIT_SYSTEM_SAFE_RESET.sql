-- SAFE CREDIT SYSTEM RESET
-- This version preserves existing transaction types

-- STEP 1: Check existing transaction types
DO $$ 
DECLARE
    existing_types TEXT;
BEGIN
    -- Get all existing transaction types
    SELECT string_agg(DISTINCT quote_literal(transaction_type), ', ' ORDER BY quote_literal(transaction_type))
    INTO existing_types
    FROM public.credits;
    
    IF existing_types IS NOT NULL THEN
        RAISE NOTICE 'Existing transaction types found: %', existing_types;
    END IF;
END $$;

-- STEP 2: Drop ALL existing credit-related functions
DROP FUNCTION IF EXISTS public.add_user_credits(uuid, numeric, text, uuid, timestamp with time zone);
DROP FUNCTION IF EXISTS public.add_user_credits(uuid, numeric, text, uuid);
DROP FUNCTION IF EXISTS public.use_credits_for_order(uuid, uuid, numeric);
DROP FUNCTION IF EXISTS public.use_credits_for_order(uuid, uuid, numeric, text, text);
DROP FUNCTION IF EXISTS public.use_credits_for_order(numeric, uuid, text, text, uuid);
DROP FUNCTION IF EXISTS public.get_user_credit_balance(uuid);
DROP FUNCTION IF EXISTS public.add_user_credits_with_order(uuid, numeric, text, uuid, uuid, timestamp with time zone);
DROP FUNCTION IF EXISTS public.reverse_credit_transaction(uuid, text);
DROP FUNCTION IF EXISTS public.confirm_credit_transaction(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.get_unread_credit_notifications(uuid);
DROP FUNCTION IF EXISTS public.mark_credit_notifications_read(uuid);
DROP FUNCTION IF EXISTS public.add_credits_to_all_users(numeric, text, uuid);

-- STEP 3: Drop views that depend on the tables
DROP VIEW IF EXISTS public.user_credit_balance;

-- STEP 4: Add missing columns without touching constraints
DO $$ 
BEGIN
    -- Check if credits table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credits') THEN
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'credits' AND column_name = 'reversed_at') THEN
            ALTER TABLE public.credits ADD COLUMN reversed_at TIMESTAMP WITH TIME ZONE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'credits' AND column_name = 'reversal_reason') THEN
            ALTER TABLE public.credits ADD COLUMN reversal_reason TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'credits' AND column_name = 'expires_at') THEN
            ALTER TABLE public.credits ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'credits' AND column_name = 'balance') THEN
            ALTER TABLE public.credits ADD COLUMN balance DECIMAL(10,2) NOT NULL DEFAULT 0;
        END IF;
        
        -- DON'T update the constraint - keep existing transaction types
        RAISE NOTICE 'Keeping existing transaction_type constraint to preserve data';
    ELSE
        -- Create the table if it doesn't exist
        CREATE TABLE public.credits (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            amount DECIMAL(10,2) NOT NULL,
            balance DECIMAL(10,2) NOT NULL DEFAULT 0,
            reason TEXT,
            transaction_type TEXT NOT NULL,  -- No constraint for now
            order_id UUID REFERENCES orders_main(id) ON DELETE SET NULL,
            created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            expires_at TIMESTAMP WITH TIME ZONE,
            reversed_at TIMESTAMP WITH TIME ZONE,
            reversal_reason TEXT
        );
    END IF;
END $$;

-- Continue with the rest of the setup...
-- (indexes, notifications table, view, permissions, etc.)

-- STEP 5: Create/update indexes
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_order_id ON credits(order_id);
CREATE INDEX IF NOT EXISTS idx_credits_created_at ON credits(created_at);
CREATE INDEX IF NOT EXISTS idx_credits_transaction_type ON credits(transaction_type);

-- STEP 6: Create credit_notifications table if it doesn't exist
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

-- STEP 7: Create notification indexes
CREATE INDEX IF NOT EXISTS idx_credit_notifications_user_id ON credit_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_notifications_read ON credit_notifications(read);

-- STEP 8: Create the view - handle any transaction type
CREATE OR REPLACE VIEW user_credit_balance AS
SELECT 
    user_id,
    COALESCE(SUM(CASE 
        WHEN transaction_type IN ('earned', 'adjusted', 'add', 'credit', 'refund') AND reversed_at IS NULL THEN amount
        WHEN transaction_type IN ('used', 'deduction_pending_payment', 'deduct', 'charge') AND reversed_at IS NULL THEN -amount
        WHEN transaction_type = 'reversed' THEN 0
        ELSE 
            -- For any other type, assume positive if amount > 0, negative if amount < 0
            CASE WHEN amount > 0 AND reversed_at IS NULL THEN amount
                 WHEN amount < 0 AND reversed_at IS NULL THEN amount
                 ELSE 0
            END
    END), 0) AS total_credits,
    COUNT(*) AS transaction_count,
    MAX(created_at) AS last_transaction_date
FROM credits
WHERE (expires_at IS NULL OR expires_at > NOW())
GROUP BY user_id;

-- STEP 9: Grant permissions
GRANT ALL ON credits TO authenticated;
GRANT ALL ON credit_notifications TO authenticated;
GRANT SELECT ON user_credit_balance TO authenticated;

-- STEP 10: Enable RLS
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notifications ENABLE ROW LEVEL SECURITY;

-- STEP 11: Create RLS policies
DROP POLICY IF EXISTS "Users can view their own credits" ON credits;
CREATE POLICY "Users can view their own credits" ON credits
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all credits" ON credits;
CREATE POLICY "Service role can manage all credits" ON credits
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Users can view their own notifications" ON credit_notifications;
CREATE POLICY "Users can view their own notifications" ON credit_notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON credit_notifications;
CREATE POLICY "Users can update their own notifications" ON credit_notifications
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all notifications" ON credit_notifications;
CREATE POLICY "Service role can manage all notifications" ON credit_notifications
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Add credit_transaction_id column to orders_main if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'orders_main' 
                   AND column_name = 'credit_transaction_id') THEN
        ALTER TABLE public.orders_main ADD COLUMN credit_transaction_id UUID;
    END IF;
END $$;

-- DONE! Now run CREDIT_SYSTEM_FUNCTIONS.sql to create all the functions 