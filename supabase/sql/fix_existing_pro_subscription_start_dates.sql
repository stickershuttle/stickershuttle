-- Add pro_subscription_start_date column to user_profiles table if it doesn't exist
-- This script adds the missing column and updates existing Pro members

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'pro_subscription_start_date'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN pro_subscription_start_date TIMESTAMPTZ;
        
        -- Add comment for documentation
        COMMENT ON COLUMN user_profiles.pro_subscription_start_date IS 'Date when the Pro subscription started (used for monthly signup calculations)';
    END IF;
END $$;

-- Fix existing Pro members who don't have pro_subscription_start_date set
-- This script updates existing Pro members to use pro_current_period_start as their subscription start date
UPDATE user_profiles 
SET pro_subscription_start_date = pro_current_period_start
WHERE is_pro_member = true 
  AND pro_subscription_start_date IS NULL 
  AND pro_current_period_start IS NOT NULL;
