-- Create Pro Subscriptions Table
-- Separates Pro subscription data from user_profiles into its own dedicated table

-- ============================================================================
-- STEP 0: Ensure all Pro columns exist in user_profiles (for migration)
-- ============================================================================

-- Add pro_stripe_customer_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'pro_stripe_customer_id'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN pro_stripe_customer_id TEXT;
        RAISE NOTICE 'Added pro_stripe_customer_id column to user_profiles';
    END IF;
END $$;

-- Add pro_subscription_start_date if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'pro_subscription_start_date'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN pro_subscription_start_date TIMESTAMPTZ;
        RAISE NOTICE 'Added pro_subscription_start_date column to user_profiles';
    END IF;
END $$;

-- ============================================================================
-- STEP 1: Create pro_subscriptions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS pro_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  
  -- Stripe subscription details
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  
  -- Subscription metadata
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'annual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'incomplete')),
  
  -- Subscription dates
  subscription_start_date TIMESTAMPTZ NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  -- Payment tracking
  payment_failed BOOLEAN DEFAULT FALSE,
  last_payment_failure TIMESTAMPTZ,
  payment_retry_count INTEGER DEFAULT 0,
  
  -- Design management
  current_design_file TEXT,
  design_approved BOOLEAN DEFAULT FALSE,
  design_approved_at TIMESTAMPTZ,
  design_locked BOOLEAN DEFAULT FALSE,
  design_locked_at TIMESTAMPTZ,
  
  -- Shipping address
  default_shipping_address JSONB,
  shipping_address_updated_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Create indexes for efficient queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pro_subscriptions_user_id 
  ON pro_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_pro_subscriptions_stripe_subscription_id 
  ON pro_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_pro_subscriptions_stripe_customer_id 
  ON pro_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_pro_subscriptions_status 
  ON pro_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_pro_subscriptions_plan 
  ON pro_subscriptions(plan);

CREATE INDEX IF NOT EXISTS idx_pro_subscriptions_current_period_end 
  ON pro_subscriptions(current_period_end);

CREATE INDEX IF NOT EXISTS idx_pro_subscriptions_payment_failed 
  ON pro_subscriptions(payment_failed) 
  WHERE payment_failed = TRUE;

CREATE INDEX IF NOT EXISTS idx_pro_subscriptions_design_approved 
  ON pro_subscriptions(design_approved) 
  WHERE design_approved = FALSE;

-- ============================================================================
-- STEP 3: Create RLS policies
-- ============================================================================

ALTER TABLE pro_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view their own Pro subscription"
  ON pro_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to pro_subscriptions"
  ON pro_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 4: Create trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_pro_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pro_subscriptions_updated_at_trigger ON pro_subscriptions;
CREATE TRIGGER update_pro_subscriptions_updated_at_trigger
  BEFORE UPDATE ON pro_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_pro_subscriptions_updated_at();

-- ============================================================================
-- STEP 5: Migrate existing Pro member data from user_profiles
-- ============================================================================

INSERT INTO pro_subscriptions (
  user_id,
  stripe_subscription_id,
  stripe_customer_id,
  plan,
  status,
  subscription_start_date,
  current_period_start,
  current_period_end,
  canceled_at,
  payment_failed,
  last_payment_failure,
  current_design_file,
  design_approved,
  design_approved_at,
  design_locked,
  design_locked_at,
  default_shipping_address,
  shipping_address_updated_at,
  created_at,
  updated_at
)
SELECT 
  user_id,
  COALESCE(pro_subscription_id, 'MISSING_' || user_id::text) as stripe_subscription_id,
  COALESCE(pro_stripe_customer_id, 'MISSING_' || user_id::text) as stripe_customer_id,
  COALESCE(pro_plan, 'monthly') as plan,
  COALESCE(pro_status, 'active') as status,
  COALESCE(pro_subscription_start_date, pro_current_period_start, NOW()) as subscription_start_date,
  COALESCE(pro_current_period_start, NOW()) as current_period_start,
  COALESCE(pro_current_period_end, NOW() + INTERVAL '30 days') as current_period_end,
  NULL as canceled_at,
  COALESCE(pro_payment_failed, FALSE) as payment_failed,
  pro_last_payment_failure,
  pro_current_design_file,
  COALESCE(pro_design_approved, FALSE) as design_approved,
  pro_design_approved_at,
  COALESCE(pro_design_locked, FALSE) as design_locked,
  pro_design_locked_at,
  pro_default_shipping_address,
  pro_shipping_address_updated_at,
  created_at,
  updated_at
FROM user_profiles
WHERE is_pro_member = TRUE
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- STEP 6: Add helpful comments
-- ============================================================================

COMMENT ON TABLE pro_subscriptions IS 'Stores Pro membership subscription data separately from user profiles';
COMMENT ON COLUMN pro_subscriptions.user_id IS 'Foreign key to user_profiles.user_id';
COMMENT ON COLUMN pro_subscriptions.stripe_subscription_id IS 'Stripe subscription ID (sub_xxx)';
COMMENT ON COLUMN pro_subscriptions.stripe_customer_id IS 'Stripe customer ID (cus_xxx)';
COMMENT ON COLUMN pro_subscriptions.plan IS 'Subscription plan type: monthly or annual';
COMMENT ON COLUMN pro_subscriptions.status IS 'Current subscription status from Stripe';
COMMENT ON COLUMN pro_subscriptions.subscription_start_date IS 'Original subscription start date (never changes)';
COMMENT ON COLUMN pro_subscriptions.current_period_start IS 'Current billing period start';
COMMENT ON COLUMN pro_subscriptions.current_period_end IS 'Current billing period end';
COMMENT ON COLUMN pro_subscriptions.current_design_file IS 'URL to current monthly sticker design file';
COMMENT ON COLUMN pro_subscriptions.design_approved IS 'Whether current design has been approved';
COMMENT ON COLUMN pro_subscriptions.design_locked IS 'Whether design is locked for production';
COMMENT ON COLUMN pro_subscriptions.default_shipping_address IS 'Default shipping address for monthly stickers (JSONB)';

-- ============================================================================
-- STEP 7: Create view for easy querying with user data
-- ============================================================================

CREATE OR REPLACE VIEW pro_members_with_profiles AS
SELECT 
  ps.*,
  up.email,
  up.first_name,
  up.last_name,
  up.display_name,
  up.company_name,
  up.phone_number,
  up.profile_photo_url
FROM pro_subscriptions ps
INNER JOIN user_profiles up ON ps.user_id = up.user_id;

-- Grant access to the view
GRANT SELECT ON pro_members_with_profiles TO service_role;

COMMENT ON VIEW pro_members_with_profiles IS 'Joins pro_subscriptions with user_profiles for convenient querying';

-- ============================================================================
-- STEP 8: Verification queries
-- ============================================================================

-- Count migrated subscriptions
DO $$
DECLARE
  v_count INTEGER;
  v_user_profiles_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM pro_subscriptions;
  SELECT COUNT(*) INTO v_user_profiles_count FROM user_profiles WHERE is_pro_member = TRUE;
  
  RAISE NOTICE '✅ Pro subscriptions table created';
  RAISE NOTICE '📊 Migrated % Pro subscriptions', v_count;
  RAISE NOTICE '📊 Total Pro members in user_profiles: %', v_user_profiles_count;
  
  IF v_count = v_user_profiles_count THEN
    RAISE NOTICE '✅ All Pro members successfully migrated';
  ELSE
    RAISE NOTICE '⚠️ Migration count mismatch - please review';
  END IF;
END $$;

-- Show sample of migrated data
SELECT 
  user_id,
  stripe_subscription_id,
  plan,
  status,
  subscription_start_date,
  current_period_end,
  current_design_file IS NOT NULL as has_design,
  design_approved,
  design_locked
FROM pro_subscriptions
ORDER BY created_at DESC
LIMIT 5;

