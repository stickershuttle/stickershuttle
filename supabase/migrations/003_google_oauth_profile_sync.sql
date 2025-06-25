-- Migration: Universal User Profile Sync
-- Automatically creates user profiles for ALL users (OAuth and email/password signups)

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
  
  -- Extract name data from different sources based on signup type
  
  -- Method 1: Check raw_user_meta_data (Google OAuth and other OAuth providers)
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
  END IF;
  
  -- Method 2: Check user_metadata (email/password signups, including guest checkout)
  IF (first_name IS NULL OR last_name IS NULL) AND NEW.user_metadata IS NOT NULL THEN
    first_name := COALESCE(
      first_name,
      NEW.user_metadata->>'first_name'
    );
    
    last_name := COALESCE(
      last_name,
      NEW.user_metadata->>'last_name'
    );
    
    -- If no first/last name, try to split full_name
    IF first_name IS NULL AND last_name IS NULL THEN
      full_name := NEW.user_metadata->>'full_name';
      
      -- Simple name splitting
      IF full_name IS NOT NULL AND trim(full_name) != '' THEN
        first_name := split_part(trim(full_name), ' ', 1);
        IF position(' ' in trim(full_name)) > 0 THEN
          last_name := trim(substring(trim(full_name) from position(' ' in trim(full_name)) + 1));
        END IF;
      END IF;
    END IF;
  END IF;
  
  -- Create user profile (always create, even if no names)
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop any existing triggers
DROP TRIGGER IF EXISTS sync_google_oauth_profile_trigger ON auth.users;
DROP TRIGGER IF EXISTS universal_user_profile_trigger ON auth.users;

-- Create universal trigger that fires after user creation or update
CREATE TRIGGER universal_user_profile_trigger
  AFTER INSERT OR UPDATE OF raw_user_meta_data, user_metadata ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_profile_creation();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_user_profile_creation() TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION handle_user_profile_creation IS 'Automatically creates user profiles for all users (OAuth and email/password) when they sign up';
COMMENT ON TRIGGER universal_user_profile_trigger ON auth.users IS 'Creates user profiles for all user signups (OAuth and email/password)'; 