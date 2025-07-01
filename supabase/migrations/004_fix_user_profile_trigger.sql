-- Migration: Fix User Profile Creation Trigger
-- This fixes the trigger to properly handle both OAuth and email/password signups
-- The issue was that the ELSE block prevented extraction of regular signup data

-- Function to handle user profile creation for all signup types (FIXED)
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
  
  -- Extract name data from raw_user_meta_data (supports both OAuth and regular signups)
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    -- Extract from Google OAuth format first
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
    
    IF first_name IS NOT NULL OR last_name IS NOT NULL THEN
      RAISE LOG 'User profile creation for % with names: first_name=%, last_name=%', user_email, first_name, last_name;
    ELSE
      RAISE LOG 'User profile creation for % without names (basic profile)', user_email;
    END IF;
  ELSE
    RAISE LOG 'User profile creation for % without metadata (basic profile)', user_email;
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
      -- Don't fail the user creation, just log the error
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_user_profile_creation() TO service_role;

-- Add comment
COMMENT ON FUNCTION handle_user_profile_creation IS 'Fixed version: Creates user profiles for all users (OAuth and email/password) when they sign up'; 