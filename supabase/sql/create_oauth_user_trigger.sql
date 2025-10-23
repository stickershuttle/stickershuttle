-- Create a trigger function that calls the Edge Function when a new user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  response http_response;
BEGIN
  -- Only process OAuth users (those with app_metadata.provider)
  IF NEW.app_metadata IS NOT NULL AND NEW.app_metadata->>'provider' IS NOT NULL THEN
    -- Call the Edge Function to process the user profile
    SELECT * INTO response FROM http((
      'POST',
      current_setting('app.supabase_url') || '/functions/v1/create-user-profile',
      ARRAY[
        http_header('Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')),
        http_header('Content-Type', 'application/json')
      ],
      'application/json',
      json_build_object('user', row_to_json(NEW))::text
    ));
    
    -- Log the response for debugging
    RAISE LOG 'Edge Function response: %', response;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA http TO postgres;
GRANT EXECUTE ON FUNCTION http TO postgres;
