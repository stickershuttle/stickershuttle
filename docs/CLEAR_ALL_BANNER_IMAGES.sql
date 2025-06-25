-- Clear all custom banner images from user_profiles
-- This will remove all uploaded banner images but preserve banner templates
-- Run this to fix banner image glitching issues

-- Update all user profiles to clear custom banner images
UPDATE user_profiles 
SET 
  banner_image_url = NULL,
  banner_image_public_id = NULL,
  updated_at = now()
WHERE 
  banner_image_url IS NOT NULL 
  OR banner_image_public_id IS NOT NULL;

-- Show the results
SELECT 
  COUNT(*) as total_profiles,
  COUNT(banner_template) as profiles_with_templates,
  COUNT(banner_image_url) as profiles_with_custom_images
FROM user_profiles;

-- Optional: If you want to reset everyone to the default template, uncomment below:
-- UPDATE user_profiles 
-- SET 
--   banner_template = NULL,
--   banner_template_id = NULL,
--   updated_at = now()
-- WHERE 
--   banner_template IS NOT NULL 
--   OR banner_template_id IS NOT NULL; 