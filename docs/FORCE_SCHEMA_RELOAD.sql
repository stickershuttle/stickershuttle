-- Force Supabase to reload GraphQL schema
-- Run this in SQL Editor to make GraphQL recognize the blog tables

-- Method 1: Using pg_notify to reload schema
SELECT pg_notify('pgrst', 'reload schema');

-- Method 2: Touch the tables to trigger schema detection
COMMENT ON TABLE public.blog_posts IS 'Blog posts for SEO and company updates';
COMMENT ON TABLE public.blog_categories IS 'Categories for organizing blog posts';

-- Method 3: Verify tables are in the correct schema
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name IN ('blog_posts', 'blog_categories');

-- Method 4: Check if tables are exposed to PostgREST
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables
WHERE tablename IN ('blog_posts', 'blog_categories');

-- Method 5: Force a minor schema change to trigger reload
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS _temp_reload BOOLEAN DEFAULT NULL;
ALTER TABLE public.blog_posts DROP COLUMN IF EXISTS _temp_reload;

-- Final check
SELECT 'Schema reload triggered. Wait 30 seconds then refresh your browser.' as message; 