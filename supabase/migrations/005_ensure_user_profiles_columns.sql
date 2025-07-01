-- Migration: Ensure user_profiles table has required columns
-- This ensures the table structure supports first_name and last_name storage

-- Add first_name column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT;

-- Add last_name column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Add email column if it doesn't exist (for future use)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.first_name IS 'User first name';
COMMENT ON COLUMN user_profiles.last_name IS 'User last name';
COMMENT ON COLUMN user_profiles.email IS 'User email (cached from auth.users)';

-- Create index on email for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email 
ON user_profiles(email) 
WHERE email IS NOT NULL;

-- Update existing profiles with email data from auth.users
UPDATE user_profiles 
SET email = au.email,
    updated_at = NOW()
FROM auth.users au 
WHERE user_profiles.user_id = au.id 
  AND user_profiles.email IS NULL;

-- Verify the columns exist
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND table_schema = 'public'
  AND column_name IN ('first_name', 'last_name', 'email', 'user_id')
ORDER BY column_name; 