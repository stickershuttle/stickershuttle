-- Add missing Pro Stripe-related columns to user_profiles
-- These columns are needed for Stripe Customer Portal integration

-- Add pro_stripe_subscription_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'pro_stripe_subscription_id'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN pro_stripe_subscription_id TEXT;
    
    RAISE NOTICE 'Added pro_stripe_subscription_id column';
  ELSE
    RAISE NOTICE 'Column pro_stripe_subscription_id already exists';
  END IF;
END $$;

-- Add pro_stripe_customer_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'pro_stripe_customer_id'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN pro_stripe_customer_id TEXT;
    
    RAISE NOTICE 'Added pro_stripe_customer_id column';
  ELSE
    RAISE NOTICE 'Column pro_stripe_customer_id already exists';
  END IF;
END $$;

-- Add pro_subscription_id if it doesn't exist (legacy column for compatibility)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'pro_subscription_id'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN pro_subscription_id TEXT;
    
    RAISE NOTICE 'Added pro_subscription_id column';
  ELSE
    RAISE NOTICE 'Column pro_subscription_id already exists';
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN user_profiles.pro_stripe_subscription_id IS 'Stripe subscription ID for Pro membership';
COMMENT ON COLUMN user_profiles.pro_stripe_customer_id IS 'Stripe customer ID for Pro membership - used for Customer Portal';
COMMENT ON COLUMN user_profiles.pro_subscription_id IS 'Legacy subscription ID column for backward compatibility';

-- Sync data from pro_subscriptions table to user_profiles
UPDATE user_profiles up
SET 
  pro_stripe_subscription_id = ps.stripe_subscription_id,
  pro_stripe_customer_id = ps.stripe_customer_id,
  pro_subscription_id = ps.stripe_subscription_id,
  pro_plan = ps.plan,
  pro_status = ps.status,
  pro_subscription_start_date = ps.subscription_start_date,
  pro_current_period_start = ps.current_period_start,
  pro_current_period_end = ps.current_period_end,
  pro_current_design_file = COALESCE(up.pro_current_design_file, ps.current_design_file),
  pro_design_approved = COALESCE(up.pro_design_approved, ps.design_approved),
  pro_default_shipping_address = COALESCE(up.pro_default_shipping_address, ps.default_shipping_address),
  updated_at = NOW()
FROM pro_subscriptions ps
WHERE up.user_id = ps.user_id
  AND up.is_pro_member = true;

