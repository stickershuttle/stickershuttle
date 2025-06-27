-- Quick Blog Setup for Sticker Shuttle
-- Run this in Supabase SQL Editor

-- 1. Create blog_posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image TEXT,
    author_id UUID REFERENCES auth.users(id),
    author_name TEXT,
    category TEXT DEFAULT 'company-updates',
    tags TEXT[] DEFAULT '{}',
    meta_title TEXT,
    meta_description TEXT,
    og_image TEXT,
    published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    views INTEGER DEFAULT 0,
    read_time_minutes INTEGER DEFAULT 1
);

-- 2. Create blog_categories table
CREATE TABLE IF NOT EXISTS public.blog_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- 4. Allow everyone to read published posts
CREATE POLICY "Published posts are viewable by everyone" ON public.blog_posts
    FOR SELECT USING (published = true);

-- 5. Allow admins to manage posts
CREATE POLICY "Admins can manage all posts" ON public.blog_posts
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE email IN (
                'orbit@stickershuttle.com',
                'austin@stickershuttle.com',
                'justinalanflores@gmail.com'
            )
        )
    );

-- 6. Allow everyone to read categories
CREATE POLICY "Categories are viewable by everyone" ON public.blog_categories
    FOR SELECT USING (true);

-- 7. Grant permissions
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT ON public.blog_categories TO anon;
GRANT ALL ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_categories TO authenticated; 