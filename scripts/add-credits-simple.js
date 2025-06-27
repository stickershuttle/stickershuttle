const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check for environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.log('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addCreditsToAllUsers() {
  console.log('🎁 Starting to add $25 credits to all users...');
  
  try {
    // Get all auth users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to fetch users: ${authError.message}`);
    }
    
    const users = authData.users || [];
    console.log(`📊 Found ${users.length} users in the system`);
    
    let successCount = 0;
    let alreadyHasCredits = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process each user
    for (const user of users) {
      try {
        // Check current balance first
        const { data: currentBalance, error: balanceError } = await supabase
          .rpc('get_user_credit_balance', { p_user_id: user.id });
        
        if (balanceError) {
          console.warn(`⚠️ Could not check balance for ${user.email}: ${balanceError.message}`);
        }
        
        // Skip if user already has credits
        if (currentBalance && currentBalance > 0) {
          console.log(`✓ ${user.email} already has $${currentBalance} in credits`);
          alreadyHasCredits++;
          continue;
        }
        
        // Add $25 credit
        const { data, error } = await supabase
          .rpc('add_user_credits', {
            p_user_id: user.id,
            p_amount: 25.00,
            p_reason: 'Welcome bonus - Thank you for being a valued customer!',
            p_created_by: null,
            p_expires_at: null
          });
        
        if (error) {
          throw error;
        }
        
        console.log(`✅ Added $25 credit for ${user.email}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error adding credit for ${user.email}:`, error.message);
        errors.push({ email: user.email, error: error.message });
        errorCount++;
      }
    }
    
    console.log('\n🎉 Credit addition completed!');
    console.log(`✅ Successfully added credits to: ${successCount} users`);
    console.log(`ℹ️ Users who already had credits: ${alreadyHasCredits}`);
    console.log(`❌ Errors encountered: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n📋 Error Details:');
      errors.forEach((e, i) => {
        console.log(`${i + 1}. ${e.email}: ${e.error}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the function
addCreditsToAllUsers()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }); 