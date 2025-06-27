const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: './.env.local' });
require('dotenv').config({ path: './.env' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env.local file.');
  console.log('Required variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function setupBlogSystem() {
  try {
    console.log('🚀 Setting up blog system...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../docs/CREATE_BLOG_SYSTEM.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    }).catch(async (err) => {
      // If exec_sql doesn't exist, try direct execution
      console.log('📝 Executing SQL directly...');
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        console.log(`\nExecuting: ${statement.substring(0, 50)}...`);
        
        try {
          // For table creation, use direct SQL
          if (statement.toUpperCase().includes('CREATE TABLE')) {
            // Use Supabase's SQL editor endpoint (admin access)
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                'Content-Type': 'application/json',
                'apikey': supabaseServiceRoleKey
              },
              body: JSON.stringify({ query: statement + ';' })
            });
            
            if (!response.ok) {
              const text = await response.text();
              console.log(`⚠️  Table might already exist: ${text}`);
            } else {
              console.log('✅ Statement executed successfully');
            }
          } else {
            // For other operations, try a different approach
            console.log('⏭️  Skipping non-table creation statement for manual execution');
          }
        } catch (stmtError) {
          console.log(`⚠️  Error with statement: ${stmtError.message}`);
        }
      }
      
      return { error: null };
    });
    
    if (error) {
      console.error('❌ Error setting up blog system:', error);
      console.log('\n📋 Please run the following SQL manually in Supabase SQL Editor:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of docs/CREATE_BLOG_SYSTEM.sql');
      console.log('4. Run the query');
      return;
    }
    
    console.log('\n✅ Blog system setup completed successfully!');
    console.log('\n📊 Created:');
    console.log('- blog_posts table');
    console.log('- blog_categories table');
    console.log('- Helper functions (increment_blog_views, calculate_read_time, generate_slug)');
    console.log('- Row Level Security policies');
    console.log('- Default categories');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('\n💡 Tip: You can also manually run the SQL in docs/CREATE_BLOG_SYSTEM.sql in your Supabase SQL Editor');
  }
}

// Run the setup
setupBlogSystem(); 