-- Add banner template columns to user_profiles table
-- Migration to support banner templates functionality

-- Add banner template columns
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS banner_template TEXT,
ADD COLUMN IF NOT EXISTS banner_template_id INTEGER;

-- Add comments for the new columns
COMMENT ON COLUMN user_profiles.banner_template IS 'JSON string containing CSS styles for banner template';
COMMENT ON COLUMN user_profiles.banner_template_id IS 'ID of the selected banner template';

-- Update the banner image function to also handle templates
CREATE OR REPLACE FUNCTION update_user_banner_image(
  p_user_id UUID,
  p_banner_image_url TEXT DEFAULT NULL,
  p_banner_image_public_id TEXT DEFAULT NULL,
  p_banner_template TEXT DEFAULT NULL,
  p_banner_template_id INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert or update profile
  INSERT INTO user_profiles (
    user_id,
    banner_image_url,
    banner_image_public_id,
    banner_template,
    banner_template_id,
    updated_at
  ) VALUES (
    p_user_id,
    p_banner_image_url,
    p_banner_image_public_id,
    p_banner_template,
    p_banner_template_id,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    banner_image_url = EXCLUDED.banner_image_url,
    banner_image_public_id = EXCLUDED.banner_image_public_id,
    banner_template = EXCLUDED.banner_template,
    banner_template_id = EXCLUDED.banner_template_id,
    updated_at = now();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_user_banner_image(UUID, TEXT, TEXT, TEXT, INTEGER) TO authenticated; 