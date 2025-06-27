-- Blog System Schema for Sticker Shuttle
-- =======================================

-- Create blog_categories table
CREATE TABLE IF NOT EXISTS public.blog_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image TEXT,
    author_id UUID REFERENCES auth.users(id),
    author_name TEXT,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    meta_title TEXT,
    meta_description TEXT,
    og_image TEXT,
    published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    views INTEGER DEFAULT 0,
    read_time_minutes INTEGER
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON public.blog_posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON public.blog_categories(slug);

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blog_posts
-- Public can read published posts
CREATE POLICY "Published posts are viewable by everyone" ON public.blog_posts
    FOR SELECT USING (published = true);

-- Admins can do everything
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

-- RLS Policies for blog_categories
-- Everyone can read categories
CREATE POLICY "Categories are viewable by everyone" ON public.blog_categories
    FOR SELECT USING (true);

-- Admins can manage categories
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

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_blog_updated_at();

-- Function to increment blog post views
CREATE OR REPLACE FUNCTION increment_blog_views(post_slug TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.blog_posts
    SET views = views + 1
    WHERE slug = post_slug AND published = true;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate read time based on content
CREATE OR REPLACE FUNCTION calculate_read_time(content TEXT)
RETURNS INTEGER AS $$
BEGIN
    -- Average reading speed is ~200 words per minute
    -- Count words and divide by 200
    RETURN GREATEST(1, CEIL(array_length(string_to_array(content, ' '), 1)::NUMERIC / 200));
END;
$$ LANGUAGE plpgsql;

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Convert to lowercase, replace spaces with hyphens, remove special characters
    RETURN lower(
        regexp_replace(
            regexp_replace(
                regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'),
                '\s+', '-', 'g'
            ),
            '-+', '-', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Insert default categories
INSERT INTO public.blog_categories (name, slug, description) VALUES
    ('Company Updates', 'company-updates', 'News and updates about Sticker Shuttle'),
    ('Product Tutorials', 'product-tutorials', 'How-to guides for our products'),
    ('Industry Insights', 'industry-insights', 'Tips and trends in the sticker industry'),
    ('Customer Stories', 'customer-stories', 'Success stories from our customers'),
    ('Design Tips', 'design-tips', 'Design advice for creating great stickers')
ON CONFLICT (slug) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT ON public.blog_categories TO anon;
GRANT ALL ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_categories TO authenticated;

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