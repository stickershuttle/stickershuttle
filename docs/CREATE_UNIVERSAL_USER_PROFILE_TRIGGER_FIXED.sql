-- Universal User Profile Creation Trigger (FIXED)
-- This creates user profiles for ALL users but only uses columns that actually exist
-- Works without user_metadata column

-- First, let's check what columns exist in auth.users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- Function to handle user profile creation for all signup types
CREATE OR REPLACE FUNCTION handle_user_profile_creation()
RETURNS trigger AS $$
DECLARE
  first_name TEXT;
  last_name TEXT;
  full_name TEXT;
  user_email TEXT;
BEGIN
  -- Get user email
  user_email := NEW.email;
  
  -- Initialize variables
  first_name := NULL;
  last_name := NULL;
  
  -- Extract name data from raw_user_meta_data (OAuth providers like Google)
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    -- Extract from Google OAuth format
    first_name := COALESCE(
      NEW.raw_user_meta_data->>'given_name',
      NEW.raw_user_meta_data->>'first_name'
    );
    
    last_name := COALESCE(
      NEW.raw_user_meta_data->>'family_name',
      NEW.raw_user_meta_data->>'last_name'
    );
    
    -- If no first/last name, try to split full_name or name
    IF first_name IS NULL AND last_name IS NULL THEN
      full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name'
      );
      
      -- Simple name splitting (first word = first name, rest = last name)
      IF full_name IS NOT NULL AND trim(full_name) != '' THEN
        first_name := split_part(trim(full_name), ' ', 1);
        -- Get everything after the first space as last name
        IF position(' ' in trim(full_name)) > 0 THEN
          last_name := trim(substring(trim(full_name) from position(' ' in trim(full_name)) + 1));
        END IF;
      END IF;
    END IF;
    
    RAISE LOG 'OAuth user profile creation for %: first_name=%, last_name=%', user_email, first_name, last_name;
  ELSE
    -- For email/password signups, we'll create a basic profile without names
    -- Names can be updated later when we have more information (e.g., during checkout)
    RAISE LOG 'Email signup user profile creation for %: creating basic profile', user_email;
  END IF;
  
  -- Always create a user profile (even if no names are available)
  BEGIN
    INSERT INTO user_profiles (
      user_id,
      first_name,
      last_name,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      first_name,
      last_name,
      now(),
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
      last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
      updated_at = now()
    WHERE 
      -- Only update if we're adding new data (not overwriting existing data with null)
      (user_profiles.first_name IS NULL AND EXCLUDED.first_name IS NOT NULL) OR
      (user_profiles.last_name IS NULL AND EXCLUDED.last_name IS NOT NULL) OR
      (user_profiles.first_name != EXCLUDED.first_name AND EXCLUDED.first_name IS NOT NULL) OR
      (user_profiles.last_name != EXCLUDED.last_name AND EXCLUDED.last_name IS NOT NULL);
      
    RAISE LOG 'User profile created/updated for user % (email: %)', NEW.id, user_email;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Failed to create user profile for %: %', user_email, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers
DROP TRIGGER IF EXISTS sync_google_oauth_profile_trigger ON auth.users;
DROP TRIGGER IF EXISTS universal_user_profile_trigger ON auth.users;

-- Create universal trigger that fires after user creation or update
-- Note: Only monitoring raw_user_meta_data since user_metadata doesn't exist
CREATE TRIGGER universal_user_profile_trigger
  AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_profile_creation();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_user_profile_creation() TO service_role;

-- Function to migrate existing users without profiles (one-time migration)
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

-- Function to manually update user profile names (for email/password users)
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

GRANT EXECUTE ON FUNCTION update_user_profile_names(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile_names(UUID, TEXT, TEXT) TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION handle_user_profile_creation IS 'Automatically creates user profiles for all users when they sign up';
COMMENT ON FUNCTION create_missing_user_profiles IS 'One-time migration function to create profiles for existing users without profiles';
COMMENT ON FUNCTION update_user_profile_names IS 'Manually update user profile names (useful for email/password signups)';
COMMENT ON TRIGGER universal_user_profile_trigger ON auth.users IS 'Creates user profiles for all user signups';

-- Instructions for running the one-time migration:
-- SELECT * FROM create_missing_user_profiles(); 