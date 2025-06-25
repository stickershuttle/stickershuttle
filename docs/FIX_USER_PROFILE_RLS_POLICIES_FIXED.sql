-- Fix User Profile RLS Policies (FIXED VERSION)
-- This script addresses "permission denied for table users" errors
-- Fixed to handle existing function conflicts

-- First, let's check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'users') 
AND schemaname = 'public';

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'users') 
AND schemaname = 'public';

-- 1. Fix user_profiles table policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON user_profiles;

-- Create comprehensive RLS policies for user_profiles
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

-- Enable RLS on user_profiles if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Check if there's a public.users table (this might be the issue)
-- If there is a public.users table, we need to handle it differently
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        -- If public.users table exists, create policies for it
        RAISE NOTICE 'Found public.users table, creating policies...';
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view their own record" ON public.users;
        DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
        DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;
        
        -- Create policies for public.users table
        CREATE POLICY "Users can view their own record" 
        ON public.users FOR SELECT 
        USING (auth.uid() = id);
        
        CREATE POLICY "Users can update their own record" 
        ON public.users FOR UPDATE 
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
        
        CREATE POLICY "Service role can manage all users" 
        ON public.users FOR ALL 
        USING (auth.role() = 'service_role');
        
        -- Enable RLS on public.users
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        
    ELSE
        RAISE NOTICE 'No public.users table found, skipping...';
    END IF;
END $$;

-- 3. Drop existing functions that might conflict
DROP FUNCTION IF EXISTS update_user_profile_names(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_user_profile_photo(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_user_profile_banner(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_user_profile_company(UUID, TEXT);
DROP FUNCTION IF EXISTS update_user_profile_comprehensive(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_user_profile(UUID, TEXT, TEXT);

-- 4. Create or update functions with proper security
CREATE OR REPLACE FUNCTION update_user_profile_names(
  p_user_id UUID,
  p_first_name TEXT,
  p_last_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Ensure the user can only update their own profile
  IF auth.uid() != p_user_id AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: You can only update your own profile';
  END IF;
  
  -- Insert or update profile with names
  INSERT INTO user_profiles (
    user_id,
    first_name,
    last_name,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_first_name,
    p_last_name,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
    updated_at = now();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in update_user_profile_names: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION update_user_profile_names(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile_names(UUID, TEXT, TEXT) TO service_role;

-- 5. Create function to update profile photo
CREATE OR REPLACE FUNCTION update_user_profile_photo(
  p_user_id UUID,
  p_photo_url TEXT,
  p_photo_public_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Ensure the user can only update their own profile
  IF auth.uid() != p_user_id AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: You can only update your own profile';
  END IF;
  
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_user_profile_photo(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile_photo(UUID, TEXT, TEXT) TO service_role;

-- 6. Create function to update banner image
CREATE OR REPLACE FUNCTION update_user_profile_banner(
  p_user_id UUID,
  p_banner_url TEXT,
  p_banner_public_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Ensure the user can only update their own profile
  IF auth.uid() != p_user_id AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: You can only update your own profile';
  END IF;
  
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_user_profile_banner(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile_banner(UUID, TEXT, TEXT) TO service_role;

-- 7. Create function to update company name
CREATE OR REPLACE FUNCTION update_user_profile_company(
  p_user_id UUID,
  p_company_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Ensure the user can only update their own profile
  IF auth.uid() != p_user_id AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: You can only update your own profile';
  END IF;
  
  -- Update company name
  UPDATE user_profiles 
  SET 
    company_name = p_company_name,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Create profile if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO user_profiles (
      user_id,
      company_name,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_company_name,
      now(),
      now()
    );
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in update_user_profile_company: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_user_profile_company(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile_company(UUID, TEXT) TO service_role;

-- 8. Create comprehensive profile update function
CREATE OR REPLACE FUNCTION update_user_profile_comprehensive(
  p_user_id UUID,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL,
  p_profile_photo_url TEXT DEFAULT NULL,
  p_profile_photo_public_id TEXT DEFAULT NULL,
  p_banner_image_url TEXT DEFAULT NULL,
  p_banner_image_public_id TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Ensure the user can only update their own profile
  IF auth.uid() != p_user_id AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: You can only update your own profile';
  END IF;
  
  -- Insert or update profile
  INSERT INTO user_profiles (
    user_id,
    first_name,
    last_name,
    company_name,
    profile_photo_url,
    profile_photo_public_id,
    banner_image_url,
    banner_image_public_id,
    bio,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_first_name,
    p_last_name,
    p_company_name,
    p_profile_photo_url,
    p_profile_photo_public_id,
    p_banner_image_url,
    p_banner_image_public_id,
    p_bio,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
    company_name = COALESCE(EXCLUDED.company_name, user_profiles.company_name),
    profile_photo_url = COALESCE(EXCLUDED.profile_photo_url, user_profiles.profile_photo_url),
    profile_photo_public_id = COALESCE(EXCLUDED.profile_photo_public_id, user_profiles.profile_photo_public_id),
    banner_image_url = COALESCE(EXCLUDED.banner_image_url, user_profiles.banner_image_url),
    banner_image_public_id = COALESCE(EXCLUDED.banner_image_public_id, user_profiles.banner_image_public_id),
    bio = COALESCE(EXCLUDED.bio, user_profiles.bio),
    updated_at = now();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in update_user_profile_comprehensive: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_user_profile_comprehensive(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile_comprehensive(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- 9. Recreate the create_user_profile function
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id UUID,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Ensure the user can only create their own profile
  IF auth.uid() != p_user_id AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: You can only create your own profile';
  END IF;
  
  -- Insert profile
  INSERT INTO user_profiles (
    user_id,
    first_name,
    last_name,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_first_name,
    p_last_name,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
    updated_at = now();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in create_user_profile: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT) TO service_role;

-- 10. Final verification queries
-- Check that policies are in place
SELECT 'user_profiles policies:' as info;
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_profiles' 
AND schemaname = 'public';

-- Check that RLS is enabled
SELECT 'RLS status:' as info;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'users') 
AND schemaname = 'public';

-- Test functions exist
SELECT 'Functions created:' as info;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%user_profile%'
ORDER BY routine_name; 