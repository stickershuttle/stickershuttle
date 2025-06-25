-- Function to link guest orders to a user when they sign up
-- This function will automatically run when a new user is created
-- and will associate any guest orders with the same email to the new user

-- First, create the function that links guest orders
CREATE OR REPLACE FUNCTION link_guest_orders_to_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  linked_count INTEGER;
BEGIN
  -- Get the email from the new user
  user_email := NEW.email;
  
  -- Only proceed if we have an email
  IF user_email IS NOT NULL THEN
    -- Update all orders with matching guest_email to be owned by this user
    UPDATE orders_main
    SET 
      user_id = NEW.id,
      guest_email = NULL, -- Clear guest email since they now have an account
      updated_at = NOW(),
      order_tags = array_append(
        COALESCE(order_tags, ARRAY[]::text[]), 
        'linked_from_guest_' || to_char(NOW(), 'YYYYMMDD')
      )
    WHERE guest_email = user_email
      AND user_id IS NULL; -- Only update orders that don't already have a user_id
    
    -- Get the count of linked orders
    GET DIAGNOSTICS linked_count = ROW_COUNT;
    
    -- Log the linking action
    IF linked_count > 0 THEN
      RAISE NOTICE 'Linked % guest orders to user % (email: %)', linked_count, NEW.id, user_email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that fires after a new user is inserted into auth.users
-- Note: This requires admin access to create triggers on auth schema
-- Alternative: You can call this function manually after user creation in your application code

-- Option 1: Trigger on auth.users (requires admin access)
-- DROP TRIGGER IF EXISTS link_guest_orders_on_signup ON auth.users;
-- CREATE TRIGGER link_guest_orders_on_signup
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION link_guest_orders_to_user();

-- Option 2: Trigger on user_profiles table (more accessible)
DROP TRIGGER IF EXISTS link_guest_orders_on_profile_creation ON user_profiles;
CREATE TRIGGER link_guest_orders_on_profile_creation
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION link_guest_orders_to_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION link_guest_orders_to_user() TO authenticated;
GRANT EXECUTE ON FUNCTION link_guest_orders_to_user() TO service_role;

-- Add a comment for documentation
COMMENT ON FUNCTION link_guest_orders_to_user() IS 'Automatically links guest orders to a user account when they sign up with the same email address';

-- Test query to check for guest orders that would be linked
-- SELECT COUNT(*), guest_email 
-- FROM orders_main 
-- WHERE user_id IS NULL AND guest_email IS NOT NULL 
-- GROUP BY guest_email; 