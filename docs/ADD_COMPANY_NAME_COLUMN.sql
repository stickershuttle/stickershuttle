-- Add company_name column to user_profiles table
-- This migration adds support for storing company names in user profiles

-- Add company_name column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.company_name IS 'Optional company name for business users';

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'company_name'; 