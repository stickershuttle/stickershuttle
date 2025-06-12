-- Debug trigger to see what data is actually available
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    full_name, 
    email,
    phone,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    -- Debug: show us what data is actually there
    CONCAT('META:', COALESCE(NEW.raw_user_meta_data::text, 'NULL'), '|EMAIL:', NEW.email),
    CONCAT('USER_META:', COALESCE(NEW.user_metadata::text, 'NULL')),
    CONCAT('RAW_APP_META:', COALESCE(NEW.raw_app_meta_data::text, 'NULL')),
    NEW.email,
    'DEBUG_PHONE',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 