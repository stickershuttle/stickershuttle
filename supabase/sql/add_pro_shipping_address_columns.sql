-- Add Pro member shipping address columns to user_profiles table
-- This script adds the missing columns for Pro member shipping address management

-- Add pro_default_shipping_address column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'pro_default_shipping_address'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN pro_default_shipping_address JSONB;
        
        -- Add comment for documentation
        COMMENT ON COLUMN user_profiles.pro_default_shipping_address IS 'Default shipping address for Pro members (JSONB format)';
    END IF;
END $$;

-- Add pro_shipping_address_updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'pro_shipping_address_updated_at'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN pro_shipping_address_updated_at TIMESTAMPTZ;
        
        -- Add comment for documentation
        COMMENT ON COLUMN user_profiles.pro_shipping_address_updated_at IS 'Timestamp when Pro member shipping address was last updated';
    END IF;
END $$;

-- Add pro_payment_failed column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'pro_payment_failed'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN pro_payment_failed BOOLEAN DEFAULT FALSE;
        
        -- Add comment for documentation
        COMMENT ON COLUMN user_profiles.pro_payment_failed IS 'Whether Pro member has a failed payment';
    END IF;
END $$;

-- Add pro_last_payment_failure column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'pro_last_payment_failure'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN pro_last_payment_failure TIMESTAMPTZ;
        
        -- Add comment for documentation
        COMMENT ON COLUMN user_profiles.pro_last_payment_failure IS 'Timestamp of the last payment failure for Pro member';
    END IF;
END $$;

-- Create index for efficient queries on Pro shipping address updates
CREATE INDEX IF NOT EXISTS idx_user_profiles_pro_shipping_updated_at 
ON user_profiles(pro_shipping_address_updated_at) 
WHERE pro_shipping_address_updated_at IS NOT NULL;

-- Create index for Pro payment failure queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_pro_payment_failed 
ON user_profiles(pro_payment_failed) 
WHERE pro_payment_failed = TRUE;
