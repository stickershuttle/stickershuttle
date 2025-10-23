-- Add pro_design_updated_at column to track when Pro members change their design
-- This helps track design swap history for monthly Pro orders

-- Add the column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'pro_design_updated_at'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN pro_design_updated_at TIMESTAMPTZ;
    
    RAISE NOTICE 'Added pro_design_updated_at column to user_profiles table';
  ELSE
    RAISE NOTICE 'Column pro_design_updated_at already exists';
  END IF;
END $$;

-- Add comment to the column
COMMENT ON COLUMN user_profiles.pro_design_updated_at IS 'Timestamp when Pro member last updated their monthly sticker design';

