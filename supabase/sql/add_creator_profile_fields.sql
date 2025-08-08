-- Add profile fields to creators table for direct management
ALTER TABLE creators 
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_public_id TEXT;

-- Add comments to document the fields
COMMENT ON COLUMN creators.profile_photo_url IS 'Direct profile photo URL for the creator (independent of user profile)';
COMMENT ON COLUMN creators.profile_photo_public_id IS 'Cloudinary public ID for the creator profile photo';

-- Create index for better performance when querying creators with photos
CREATE INDEX IF NOT EXISTS idx_creators_profile_photo ON creators(profile_photo_url);