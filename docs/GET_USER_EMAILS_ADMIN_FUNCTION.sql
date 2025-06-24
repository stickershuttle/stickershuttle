-- Create function to get user emails for admin purposes
-- This function allows the service role to get user email addresses from auth.users

CREATE OR REPLACE FUNCTION get_user_emails_for_admin(user_ids UUID[])
RETURNS TABLE(id UUID, email TEXT) AS $$
BEGIN
  -- Only allow service role to access this function
  IF auth.jwt() ->> 'role' != 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Service role required.';
  END IF;
  
  RETURN QUERY
    SELECT au.id, au.email::TEXT
    FROM auth.users au
    WHERE au.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION get_user_emails_for_admin(UUID[]) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION get_user_emails_for_admin IS 'Secure function to get user emails for admin operations. Service role only.'; 