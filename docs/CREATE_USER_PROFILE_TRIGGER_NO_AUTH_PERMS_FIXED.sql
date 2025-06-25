-- User Profile Creation Solution (FIXED VERSION)
-- This version handles conflicts with existing triggers

-- First, let's check what columns actually exist in user_profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Step 1: Create function to update user profile names
CREATE OR REPLACE FUNCTION update_user_profile_names(
  p_user_id UUID,
  p_first_name TEXT,
  p_last_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
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
    -- Log the error but don't fail
    RAISE WARNING 'Error in update_user_profile_names: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION update_user_profile_names(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile_names(UUID, TEXT, TEXT) TO service_role;

-- Step 2: Create function to create basic user profile (SAFE VERSION)
CREATE OR REPLACE FUNCTION create_user_profile_safe(
  p_user_id UUID,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM user_profiles WHERE user_id = p_user_id) THEN
    -- Profile exists, just update names if provided
    IF p_first_name IS NOT NULL OR p_last_name IS NOT NULL THEN
      UPDATE user_profiles 
      SET 
        first_name = COALESCE(p_first_name, first_name),
        last_name = COALESCE(p_last_name, last_name),
        updated_at = now()
      WHERE user_id = p_user_id;
    END IF;
    RETURN TRUE;
  END IF;
  
  -- Profile doesn't exist, create it
  -- Use a more targeted approach to avoid trigger conflicts
  BEGIN
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
    );
    RETURN TRUE;
  EXCEPTION
    WHEN unique_violation THEN
      -- Another process created it, that's fine
      RETURN TRUE;
    WHEN OTHERS THEN
      -- Log error and return false
      RAISE WARNING 'Error creating profile for user %: %', p_user_id, SQLERRM;
      RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_user_profile_safe(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile_safe(UUID, TEXT, TEXT) TO service_role;

-- Step 3: Safe migration function that handles existing triggers
CREATE OR REPLACE FUNCTION create_missing_user_profiles_safe()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  source TEXT,
  action TEXT,
  success BOOLEAN
) AS $$
DECLARE
  user_record RECORD;
  extracted_first_name TEXT;
  extracted_last_name TEXT;
  full_name TEXT;
  data_source TEXT;
  action_taken TEXT;
  operation_success BOOLEAN;
BEGIN
  -- Loop through all users who don't have profiles
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN user_profiles up ON au.id = up.user_id
    WHERE up.user_id IS NULL
  LOOP
    extracted_first_name := NULL;
    extracted_last_name := NULL;
    data_source := 'none';
    action_taken := 'created_basic';
    operation_success := FALSE;
    
    -- Try to extract from OAuth data if available
    IF user_record.raw_user_meta_data IS NOT NULL THEN
      extracted_first_name := COALESCE(
        user_record.raw_user_meta_data->>'given_name',
        user_record.raw_user_meta_data->>'first_name'
      );
      
      extracted_last_name := COALESCE(
        user_record.raw_user_meta_data->>'family_name',
        user_record.raw_user_meta_data->>'last_name'
      );
      
      -- If no first/last name, try to split full_name or name
      IF extracted_first_name IS NULL AND extracted_last_name IS NULL THEN
        full_name := COALESCE(
          user_record.raw_user_meta_data->>'full_name',
          user_record.raw_user_meta_data->>'name'
        );
        
        IF full_name IS NOT NULL AND trim(full_name) != '' THEN
          extracted_first_name := split_part(trim(full_name), ' ', 1);
          IF position(' ' in trim(full_name)) > 0 THEN
            extracted_last_name := trim(substring(trim(full_name) from position(' ' in trim(full_name)) + 1));
          END IF;
        END IF;
      END IF;
      
      IF extracted_first_name IS NOT NULL OR extracted_last_name IS NOT NULL THEN
        data_source := 'oauth';
        action_taken := 'created_with_oauth_names';
      END IF;
    END IF;
    
    -- Use the safe function to create profile
    operation_success := create_user_profile_safe(
      user_record.id,
      extracted_first_name,
      extracted_last_name
    );
    
    -- Return the result
    user_id := user_record.id;
    email := user_record.email;
    first_name := extracted_first_name;
    last_name := extracted_last_name;
    source := data_source;
    action := action_taken;
    success := operation_success;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_missing_user_profiles_safe() TO service_role;

-- Step 4: Update the create_user_profile function to use the safe version
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id UUID,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN create_user_profile_safe(p_user_id, p_first_name, p_last_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT) TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION update_user_profile_names IS 'Update user profile names (used by frontend after signup)';
COMMENT ON FUNCTION create_user_profile IS 'Create basic user profile (used by frontend after signup) - SAFE VERSION';
COMMENT ON FUNCTION create_user_profile_safe IS 'Safe version that handles trigger conflicts';
COMMENT ON FUNCTION create_missing_user_profiles_safe IS 'Safe migration to create profiles for existing users';

-- Instructions:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Then run the safe migration script 