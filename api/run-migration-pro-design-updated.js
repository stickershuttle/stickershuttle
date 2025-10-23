const supabaseClient = require('./supabase-client');

async function runMigration() {
  try {
    console.log('🔧 Running migration to add pro_design_updated_at column...');
    
    if (!supabaseClient.isReady()) {
      throw new Error('Supabase client is not ready');
    }

    const client = supabaseClient.getServiceClient();
    
    // Check if column exists
    const { data: columns, error: checkError } = await client
      .from('user_profiles')
      .select('pro_design_updated_at')
      .limit(1);
    
    if (checkError && checkError.message.includes('pro_design_updated_at')) {
      console.log('❌ Column does not exist, you need to add it manually via Supabase SQL Editor');
      console.log('\n📝 Run this SQL in your Supabase SQL Editor:');
      console.log('--------------------------------------------------');
      console.log('ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS pro_design_updated_at TIMESTAMPTZ;');
      console.log('COMMENT ON COLUMN user_profiles.pro_design_updated_at IS \'Timestamp when Pro member last updated their monthly sticker design\';');
      console.log('--------------------------------------------------\n');
      process.exit(1);
    } else {
      console.log('✅ Column pro_design_updated_at already exists!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Please run this SQL in your Supabase SQL Editor:');
    console.log('--------------------------------------------------');
    console.log('ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS pro_design_updated_at TIMESTAMPTZ;');
    console.log('COMMENT ON COLUMN user_profiles.pro_design_updated_at IS \'Timestamp when Pro member last updated their monthly sticker design\';');
    console.log('--------------------------------------------------\n');
    process.exit(1);
  }
}

runMigration();
