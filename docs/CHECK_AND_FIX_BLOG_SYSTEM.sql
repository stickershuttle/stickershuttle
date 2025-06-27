-- Check and Fix Blog System
-- This script checks what exists and fixes any issues

-- 1. Check if tables exist
SELECT 'blog_posts table exists' as status
WHERE EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'blog_posts'
);

SELECT 'blog_categories table exists' as status
WHERE EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'blog_categories'
);

-- 2. Drop existing policies (to recreate them fresh)
DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can manage all posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.blog_categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.blog_categories;

-- 3. Recreate policies with correct permissions
CREATE POLICY "Published posts are viewable by everyone" ON public.blog_posts
    FOR SELECT USING (published = true);

CREATE POLICY "Admins can manage all posts" ON public.blog_posts
    FOR ALL USING (
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

CREATE POLICY "Categories are viewable by everyone" ON public.blog_categories
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.blog_categories
    FOR ALL USING (
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

-- 4. Ensure RLS is enabled
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- 5. Grant permissions (in case they're missing)
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT ON public.blog_categories TO anon;
GRANT ALL ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_categories TO authenticated;

-- 6. Insert default categories if they don't exist
INSERT INTO public.blog_categories (name, slug, description) VALUES
    ('Company Updates', 'company-updates', 'News and updates about Sticker Shuttle'),
    ('Product Tutorials', 'product-tutorials', 'How-to guides for our products'),
    ('Industry Insights', 'industry-insights', 'Tips and trends in the sticker industry'),
    ('Customer Stories', 'customer-stories', 'Success stories from our customers'),
    ('Design Tips', 'design-tips', 'Design advice for creating great stickers')
ON CONFLICT (slug) DO NOTHING;

-- 7. Refresh the schema (this helps Supabase recognize the tables)
NOTIFY pgrst, 'reload schema'; 