const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '../.env.local' });
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBlogTables() {
  try {
    console.log('🔧 Setting up blog database tables...');
    
    // Test if tables already exist
    const { data: existingPosts, error: testError } = await supabase
      .from('blog_posts')
      .select('count')
      .limit(1);
    
    if (!testError) {
      console.log('✅ Blog tables already exist!');
      return;
    }
    
    console.log('📋 Blog tables do not exist. Please run the following SQL in your Supabase SQL Editor:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the following SQL:');
    console.log('');
    console.log('-- Blog System Setup SQL');
    console.log('-- =====================');
    console.log('');
    console.log(`CREATE TABLE IF NOT EXISTS public.blog_posts (
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

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category);
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
GRANT ALL ON public.blog_categories TO authenticated;`);
    
    console.log('');
    console.log('4. Run the query');
    console.log('5. Refresh your blog admin page');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the setup
createBlogTables(); 