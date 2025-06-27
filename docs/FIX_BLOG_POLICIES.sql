-- Fix Blog System Policies
-- Run each section separately if needed

-- STEP 1: Drop ALL existing policies first
DO $$ 
BEGIN
    -- Drop blog_posts policies
    DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON public.blog_posts;
    DROP POLICY IF EXISTS "Admins can manage all posts" ON public.blog_posts;
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.blog_posts;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.blog_posts;
    DROP POLICY IF EXISTS "Enable update for users based on email" ON public.blog_posts;
    DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.blog_posts;
    
    -- Drop blog_categories policies
    DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.blog_categories;
    DROP POLICY IF EXISTS "Admins can manage categories" ON public.blog_categories;
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.blog_categories;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.blog_categories;
    
    RAISE NOTICE 'All existing policies dropped successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- STEP 2: Ensure RLS is enabled
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create new policies for blog_posts
CREATE POLICY "public_read_published" ON public.blog_posts
    FOR SELECT 
    USING (published = true);

CREATE POLICY "admin_all_access" ON public.blog_posts
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.email IN (
                'orbit@stickershuttle.com',
                'austin@stickershuttle.com',
                'justinalanflores@gmail.com'
            )
        )
    );

-- STEP 4: Create new policies for blog_categories  
CREATE POLICY "public_read_categories" ON public.blog_categories
    FOR SELECT 
    USING (true);

CREATE POLICY "admin_manage_categories" ON public.blog_categories
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.email IN (
                'orbit@stickershuttle.com',
                'austin@stickershuttle.com',
                'justinalanflores@gmail.com'
            )
        )
    );

-- STEP 5: Grant permissions
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT ON public.blog_categories TO anon;
GRANT ALL ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_categories TO authenticated;

-- STEP 6: Add categories if needed
INSERT INTO public.blog_categories (name, slug, description) VALUES
    ('Company Updates', 'company-updates', 'News and updates about Sticker Shuttle'),
    ('Product Tutorials', 'product-tutorials', 'How-to guides for our products'),
    ('Industry Insights', 'industry-insights', 'Tips and trends in the sticker industry'),
    ('Customer Stories', 'customer-stories', 'Success stories from our customers'),
    ('Design Tips', 'design-tips', 'Design advice for creating great stickers')
ON CONFLICT (slug) DO NOTHING;

-- STEP 7: Check that everything is set up
SELECT 'Setup complete! Tables and policies are ready.' as status; 