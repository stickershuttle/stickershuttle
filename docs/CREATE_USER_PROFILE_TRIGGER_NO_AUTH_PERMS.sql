-- User Profile Creation Solution (No Auth Permissions Required)
-- This solution works around the auth schema permissions issue

-- Step 1: First, let's create the function to update user profile names
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION update_user_profile_names(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile_names(UUID, TEXT, TEXT) TO service_role;

-- Step 2: Create function to create basic user profile (used by frontend after signup)
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id UUID,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert basic profile if it doesn't exist
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
  ON CONFLICT (user_id) DO NOTHING; -- Don't overwrite existing profile
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT) TO service_role;

-- Step 3: Function to migrate existing users without profiles (one-time migration)
CREATE OR REPLACE FUNCTION create_missing_user_profiles()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  source TEXT,
  action TEXT
) AS $$
DECLARE
  user_record RECORD;
  extracted_first_name TEXT;
  extracted_last_name TEXT;
  full_name TEXT;
  data_source TEXT;
  action_taken TEXT;
BEGIN
  -- Loop through all users who don't have profiles
  -- NOTE: We can read from auth.users but can't create triggers on it
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
    
    -- Create profile (even if no names - basic profile)
    INSERT INTO user_profiles (
      user_id,
      first_name,
      last_name,
      created_at,
      updated_at
    ) VALUES (
      user_record.id,
      extracted_first_name,
      extracted_last_name,
      now(),
      now()
    );
    
    -- Return the result
    user_id := user_record.id;
    email := user_record.email;
    first_name := extracted_first_name;
    last_name := extracted_last_name;
    source := data_source;
    action := action_taken;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_missing_user_profiles() TO service_role;

-- Step 4: Function to sync Google OAuth users specifically
CREATE OR REPLACE FUNCTION sync_google_oauth_users()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  action TEXT
) AS $$
DECLARE
  user_record RECORD;
  extracted_first_name TEXT;
  extracted_last_name TEXT;
  full_name TEXT;
  action_taken TEXT;
BEGIN
  -- Loop through Google OAuth users who need profile updates
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN user_profiles up ON au.id = up.user_id
    WHERE au.raw_user_meta_data IS NOT NULL 
    AND (
      up.user_id IS NULL OR 
      (up.first_name IS NULL AND up.last_name IS NULL)
    )
  LOOP
    extracted_first_name := NULL;
    extracted_last_name := NULL;
    action_taken := 'skipped';
    
    -- Extract name data from Google OAuth
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
    
    -- Create or update profile if we have name data
    IF extracted_first_name IS NOT NULL OR extracted_last_name IS NOT NULL THEN
      INSERT INTO user_profiles (
        user_id,
        first_name,
        last_name,
        created_at,
        updated_at
      ) VALUES (
        user_record.id,
        extracted_first_name,
        extracted_last_name,
        now(),
        now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
        updated_at = now()
      WHERE 
        (user_profiles.first_name IS NULL AND EXCLUDED.first_name IS NOT NULL) OR
        (user_profiles.last_name IS NULL AND EXCLUDED.last_name IS NOT NULL);
        
      action_taken := 'updated';
    ELSE
      -- Create basic profile even without names
      INSERT INTO user_profiles (
        user_id,
        created_at,
        updated_at
      ) VALUES (
        user_record.id,
        now(),
        now()
      )
      ON CONFLICT (user_id) DO NOTHING;
      
      action_taken := 'created_basic';
    END IF;
    
    -- Return the result
    user_id := user_record.id;
    email := user_record.email;
    first_name := extracted_first_name;
    last_name := extracted_last_name;
    action := action_taken;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION sync_google_oauth_users() TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION update_user_profile_names IS 'Update user profile names (used by frontend after signup)';
COMMENT ON FUNCTION create_user_profile IS 'Create basic user profile (used by frontend after signup)';
COMMENT ON FUNCTION create_missing_user_profiles IS 'One-time migration to create profiles for existing users';
COMMENT ON FUNCTION sync_google_oauth_users IS 'Sync Google OAuth users to user_profiles table';

-- Instructions:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Then run: SELECT * FROM create_missing_user_profiles();
-- 3. For frontend integration, use the create_user_profile() function after user signup 