-- Add profile picture URL column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN profile_picture_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN public.profiles.profile_picture_url IS 'URL to user profile picture stored in Supabase Storage';

-- Optional: Create a storage bucket for profile pictures (run this in Supabase dashboard or via API)
-- You'll need to create this bucket in your Supabase dashboard under Storage
-- Bucket name: 'profile-pictures'
-- Public: true (so profile pictures can be displayed)
-- File size limit: 5MB recommended
-- Allowed file types: image/jpeg, image/png, image/webp

-- Example RLS policy for profile pictures bucket (if you want to restrict uploads)
-- This would go in your Supabase dashboard under Storage > profile-pictures > Policies
/*
CREATE POLICY "Users can upload their own profile picture" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile picture" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile picture" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Profile pictures are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-pictures');
*/ 