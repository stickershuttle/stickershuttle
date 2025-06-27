const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: './.env.local' });
require('dotenv').config({ path: './.env' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkBlogTables() {
  console.log('🔍 Checking blog tables...\n');
  
  try {
    // Check blog_posts table
    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select('id')
      .limit(1);
    
    if (postsError) {
      console.log('❌ blog_posts table: NOT FOUND');
      console.log('   Error:', postsError.message);
    } else {
      console.log('✅ blog_posts table: EXISTS');
      
      // Get count
      const { count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true });
      
      console.log(`   Posts count: ${count || 0}`);
    }
    
    // Check blog_categories table
    const { data: categories, error: categoriesError } = await supabase
      .from('blog_categories')
      .select('*');
    
    if (categoriesError) {
      console.log('\n❌ blog_categories table: NOT FOUND');
      console.log('   Error:', categoriesError.message);
    } else {
      console.log('\n✅ blog_categories table: EXISTS');
      console.log(`   Categories count: ${categories?.length || 0}`);
      
      if (categories && categories.length > 0) {
        console.log('   Categories:');
        categories.forEach(cat => {
          console.log(`   - ${cat.name} (${cat.slug})`);
        });
      }
    }
    
    // Check if we need to create tables
    if (postsError || categoriesError) {
      console.log('\n⚠️  ACTION REQUIRED:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('The blog tables are missing. Please follow these steps:');
      console.log('\n1. Go to your Supabase dashboard: https://app.supabase.com');
      console.log('2. Select your project');
      console.log('3. Navigate to SQL Editor (left sidebar)');
      console.log('4. Click "New query"');
      console.log('5. Copy ALL contents from: docs/CREATE_BLOG_SYSTEM.sql');
      console.log('6. Paste into the SQL editor');
      console.log('7. Click "Run" button');
      console.log('\n✨ This will create the blog tables and set up all permissions.');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      console.log('\n✅ All blog tables are properly set up!');
      console.log('   You can now use the blog admin panel.');
    }
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run the check
checkBlogTables(); 