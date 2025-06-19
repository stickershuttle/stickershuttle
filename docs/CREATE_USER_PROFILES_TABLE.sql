-- Create user_profiles table for profile photos and banners
-- This table connects directly to auth.users for user-specific profile data

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Link to Supabase auth user
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile data
  profile_photo_url TEXT,
  banner_image_url TEXT,
  profile_photo_public_id TEXT,
  banner_image_public_id TEXT,
  
  -- Optional display preferences
  display_name TEXT,
  bio TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one profile per user
  UNIQUE(user_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can access all profiles (for admin purposes)
CREATE POLICY "Service role can access all profiles" ON user_profiles
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to update profile photo
CREATE OR REPLACE FUNCTION update_user_profile_photo(
  p_user_id UUID,
  p_profile_photo_url TEXT,
  p_profile_photo_public_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert or update profile
  INSERT INTO user_profiles (
    user_id,
    profile_photo_url,
    profile_photo_public_id,
    updated_at
  ) VALUES (
    p_user_id,
    p_profile_photo_url,
    p_profile_photo_public_id,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    profile_photo_url = EXCLUDED.profile_photo_url,
    profile_photo_public_id = EXCLUDED.profile_photo_public_id,
    updated_at = now();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update banner image
CREATE OR REPLACE FUNCTION update_user_banner_image(
  p_user_id UUID,
  p_banner_image_url TEXT,
  p_banner_image_public_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert or update profile
  INSERT INTO user_profiles (
    user_id,
    banner_image_url,
    banner_image_public_id,
    updated_at
  ) VALUES (
    p_user_id,
    p_banner_image_url,
    p_banner_image_public_id,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    banner_image_url = EXCLUDED.banner_image_url,
    banner_image_public_id = EXCLUDED.banner_image_public_id,
    updated_at = now();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_user_profile_photo(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_banner_image(UUID, TEXT, TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'User profile data including profile photos and banner images';
COMMENT ON COLUMN user_profiles.user_id IS 'References auth.users.id';
COMMENT ON COLUMN user_profiles.profile_photo_url IS 'Cloudinary secure URL for user profile photo';
COMMENT ON COLUMN user_profiles.banner_image_url IS 'Cloudinary secure URL for user banner image';
COMMENT ON COLUMN user_profiles.profile_photo_public_id IS 'Cloudinary public_id for profile photo (for deletion/updates)';
COMMENT ON COLUMN user_profiles.banner_image_public_id IS 'Cloudinary public_id for banner image (for deletion/updates)'; 