-- Migration: Google OAuth Profile Sync
-- Automatically syncs Google OAuth user data to user_profiles table

-- Function to handle user profile creation/update from OAuth data
CREATE OR REPLACE FUNCTION handle_google_oauth_user_profile()
RETURNS trigger AS $$
DECLARE
  google_name TEXT;
  first_name TEXT;
  last_name TEXT;
  full_name TEXT;
BEGIN
  -- Only process if this is a new user or if user_metadata has name data from Google
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    
    -- Extract name data from Google OAuth
    -- Google usually provides: full_name, given_name, family_name, or name
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
    
    -- Create or update user profile if we have name data
    IF first_name IS NOT NULL OR last_name IS NOT NULL THEN
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
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after user creation or update
DROP TRIGGER IF EXISTS sync_google_oauth_profile_trigger ON auth.users;
CREATE TRIGGER sync_google_oauth_profile_trigger
  AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_google_oauth_user_profile();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_google_oauth_user_profile() TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION handle_google_oauth_user_profile IS 'Automatically creates/updates user profiles from Google OAuth data when users sign up';
COMMENT ON TRIGGER sync_google_oauth_profile_trigger ON auth.users IS 'Syncs Google OAuth user data to user_profiles table automatically'; 