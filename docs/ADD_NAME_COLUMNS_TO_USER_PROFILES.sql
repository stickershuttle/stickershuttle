-- Add first_name and last_name columns to user_profiles table
-- This migration adds support for storing user names separately

-- Add first_name column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT;

-- Add last_name column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.first_name IS 'User first name';
COMMENT ON COLUMN user_profiles.last_name IS 'User last name';

-- Verify the columns were added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('first_name', 'last_name', 'company_name')
ORDER BY column_name; 