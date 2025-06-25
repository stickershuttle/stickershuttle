-- ADD EMAIL FIELD TO USER_PROFILES TABLE
-- This will make user_profiles self-contained and fix trigger issues permanently

BEGIN;

-- Step 1: Add email column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 2: Create a unique index on email (optional but recommended)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_email 
ON user_profiles(email) 
WHERE email IS NOT NULL;

-- Step 3: Update existing user_profiles with email addresses from auth.users
UPDATE user_profiles 
SET email = au.email,
    updated_at = NOW()
FROM auth.users au 
WHERE user_profiles.user_id = au.id 
  AND user_profiles.email IS NULL;

-- Step 4: Update the trigger function to use the new email field
CREATE OR REPLACE FUNCTION link_guest_orders_to_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Now we can use NEW.email directly since it exists in user_profiles
    IF NEW.email IS NOT NULL THEN
        -- Update guest orders to link them to this user
        UPDATE my_orders 
        SET user_id = NEW.user_id,
            updated_at = NOW()
        WHERE guest_email = NEW.email 
          AND user_id IS NULL;
        
        -- Log how many orders were linked
        RAISE NOTICE 'Linked % guest orders to user % (email: %)', 
            ROW_COUNT, NEW.user_id, NEW.email;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the insert
        RAISE NOTICE 'Error in link_guest_orders_to_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a trigger to automatically populate email field on insert/update
CREATE OR REPLACE FUNCTION sync_user_profile_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-populate email from auth.users if not provided
    IF NEW.email IS NULL THEN
        SELECT email INTO NEW.email 
        FROM auth.users 
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-populating email
DROP TRIGGER IF EXISTS sync_email_on_profile_upsert ON user_profiles;
CREATE TRIGGER sync_email_on_profile_upsert
    BEFORE INSERT OR UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_profile_email();

-- Step 6: Now create the missing user profiles with email included
INSERT INTO user_profiles (user_id, first_name, last_name, email, created_at, updated_at)
VALUES 
  (
    (SELECT id FROM auth.users WHERE email = 'justin@stickershuttle.com' LIMIT 1), 
    'Justin', 
    'Sticker Shuttle Admin',
    'justin@stickershuttle.com',
    NOW(), 
    NOW()
  ),
  (
    (SELECT id FROM auth.users WHERE email = 'orbit@stickershuttle.com' LIMIT 1), 
    'Orbit', 
    'Space Admin',
    'orbit@stickershuttle.com',
    NOW(), 
    NOW()
  )
ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  updated_at = NOW();

-- Step 7: Verify the migration worked
SELECT 
  up.user_id,
  up.first_name,
  up.last_name,
  up.email,
  au.email as auth_email,
  CASE 
    WHEN up.email = au.email THEN '✅ Email sync correct'
    ELSE '❌ Email mismatch'
  END as email_status,
  up.created_at
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('justin@stickershuttle.com', 'orbit@stickershuttle.com')
ORDER BY au.email;

-- Step 8: Check all user profiles have emails populated
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as profiles_with_email,
  COUNT(CASE WHEN email IS NULL THEN 1 END) as profiles_without_email,
  'Email field migration status' as description
FROM user_profiles;

-- Step 9: Show table structure to confirm email field was added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

COMMIT;

-- Success message
SELECT 'SUCCESS: Email field added to user_profiles table and profiles created!' as result; 