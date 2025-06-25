-- Quick fix for profile permissions error (42501)
-- Run this in Supabase SQL Editor

-- 1. First, enable RLS on user_profiles if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON user_profiles;

-- 3. Create comprehensive RLS policies
CREATE POLICY "Users can view their own profile" 
ON user_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON user_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all profiles" 
ON user_profiles FOR ALL 
USING (auth.role() = 'service_role');

-- 4. Create or update the essential functions
CREATE OR REPLACE FUNCTION update_user_profile_photo(
  p_user_id UUID,
  p_photo_url TEXT,
  p_photo_public_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update profile photo
  UPDATE user_profiles 
  SET 
    profile_photo_url = p_photo_url,
    profile_photo_public_id = p_photo_public_id,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Create profile if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO user_profiles (
      user_id,
      profile_photo_url,
      profile_photo_public_id,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_photo_url,
      p_photo_public_id,
      now(),
      now()
    );
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in update_user_profile_photo: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_user_profile_banner(
  p_user_id UUID,
  p_banner_url TEXT,
  p_banner_public_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update banner image
  UPDATE user_profiles 
  SET 
    banner_image_url = p_banner_url,
    banner_image_public_id = p_banner_public_id,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Create profile if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO user_profiles (
      user_id,
      banner_image_url,
      banner_image_public_id,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_banner_url,
      p_banner_public_id,
      now(),
      now()
    );
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in update_user_profile_banner: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION update_user_profile_photo(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile_photo(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION update_user_profile_banner(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile_banner(UUID, TEXT, TEXT) TO service_role;

-- 6. Check if there's a public.users table causing conflicts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        RAISE NOTICE 'Found public.users table - this may be causing conflicts';
        
        -- If there is, disable RLS on it or create policies
        ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
        
    ELSE
        RAISE NOTICE 'No public.users table found';
    END IF;
END $$;

SELECT 'Profile permissions fix complete!' as status; 