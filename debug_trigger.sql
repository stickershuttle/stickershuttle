-- Debug trigger function to test basic functionality
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Log the metadata to see what's available
  RAISE LOG 'NEW.raw_user_meta_data: %', NEW.raw_user_meta_data;
  RAISE LOG 'NEW.user_metadata: %', NEW.user_metadata;
  
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
    -- Try multiple ways to get the data
    COALESCE(
      NEW.raw_user_meta_data->>'first_name', 
      NEW.user_metadata->>'first_name',
      (NEW.raw_user_meta_data->'data'->>'first_name'),
      'DefaultFirst'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'last_name', 
      NEW.user_metadata->>'last_name',
      (NEW.raw_user_meta_data->'data'->>'last_name'),
      'DefaultLast'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.user_metadata->>'full_name',
      (NEW.raw_user_meta_data->'data'->>'full_name'),
      'DefaultFull Name'
    ),
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'phone', 
      NEW.user_metadata->>'phone',
      (NEW.raw_user_meta_data->'data'->>'phone')
    ),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$; 