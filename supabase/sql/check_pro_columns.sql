-- Check what Pro columns actually exist in user_profiles table

SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND (column_name LIKE 'pro_%' OR column_name = 'is_pro_member')
ORDER BY column_name;

