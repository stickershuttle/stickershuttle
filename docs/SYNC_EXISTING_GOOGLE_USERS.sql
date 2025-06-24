-- One-time migration to sync existing Google OAuth users
-- This will extract names from existing Google OAuth accounts and populate user_profiles

-- Function to sync existing Google OAuth users (if not already created)
CREATE OR REPLACE FUNCTION sync_existing_google_oauth_users()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  action TEXT
) AS $$
DECLARE
  user_record RECORD;
  google_name TEXT;
  extracted_first_name TEXT;
  extracted_last_name TEXT;
  full_name TEXT;
  action_taken TEXT;
BEGIN
  -- Loop through all users with Google OAuth data who don't have profiles or names
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
      
      -- Simple name splitting
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
GRANT EXECUTE ON FUNCTION sync_existing_google_oauth_users() TO service_role;

-- Now run the migration
SELECT 
  user_id,
  email,
  first_name,
  last_name,
  action,
  CASE 
    WHEN action = 'updated' THEN '✅ Successfully synced'
    ELSE '⚠️ No name data found'
  END as status
FROM sync_existing_google_oauth_users()
ORDER BY action DESC, email;

-- Check results
SELECT 
  'Total Google OAuth users with profiles' as description,
  COUNT(*) as count
FROM auth.users au
JOIN user_profiles up ON au.id = up.user_id
WHERE au.raw_user_meta_data IS NOT NULL

UNION ALL

SELECT 
  'Users with first/last names' as description,
  COUNT(*) as count
FROM user_profiles 
WHERE first_name IS NOT NULL OR last_name IS NOT NULL

UNION ALL

SELECT 
  'Total Google OAuth users (all)' as description,
  COUNT(*) as count
FROM auth.users
WHERE raw_user_meta_data IS NOT NULL; 