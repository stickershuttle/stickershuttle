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

async function addCreditsToAllProfiles() {
  console.log('🎁 Starting to add $25 credits to all user profiles...');
  
  try {
    // Get all user profiles
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name')
      .order('created_at', { ascending: false });
    
    if (profileError) {
      throw new Error(`Failed to fetch profiles: ${profileError.message}`);
    }
    
    console.log(`📊 Found ${profiles.length} user profiles`);
    
    // Get all auth users to map emails to user IDs
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.warn(`⚠️ Could not fetch auth users: ${authError.message}`);
    }
    
    const authUsers = authData?.users || [];
    const emailToAuthId = {};
    authUsers.forEach(user => {
      emailToAuthId[user.email.toLowerCase()] = user.id;
    });
    
    let successCount = 0;
    let alreadyHasCredits = 0;
    let noAuthUser = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process each profile
    for (const profile of profiles) {
      try {
        const email = profile.email?.toLowerCase();
        if (!email) {
          console.warn(`⚠️ Profile ${profile.id} has no email`);
          continue;
        }
        
        const authUserId = emailToAuthId[email];
        
        if (!authUserId) {
          console.log(`⚠️ No auth user for ${email} - profile-only user from migration`);
          noAuthUser++;
          continue;
        }
        
        // Check current balance
        const { data: currentBalance, error: balanceError } = await supabase
          .rpc('get_user_credit_balance', { p_user_id: authUserId });
        
        if (balanceError) {
          console.warn(`⚠️ Could not check balance for ${email}: ${balanceError.message}`);
        }
        
        // Skip if user already has credits
        if (currentBalance && currentBalance > 0) {
          console.log(`✓ ${email} already has $${currentBalance} in credits`);
          alreadyHasCredits++;
          continue;
        }
        
        // Add $25 credit
        const { data, error } = await supabase
          .rpc('add_user_credits', {
            p_user_id: authUserId,
            p_amount: 25.00,
            p_reason: 'Welcome bonus - Thank you for being a valued customer!',
            p_created_by: null,
            p_expires_at: null
          });
        
        if (error) {
          throw error;
        }
        
        console.log(`✅ Added $25 credit for ${email}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error adding credit for ${profile.email}:`, error.message);
        errors.push({ email: profile.email, error: error.message });
        errorCount++;
      }
    }
    
    console.log('\n🎉 Credit addition completed!');
    console.log(`✅ Successfully added credits to: ${successCount} users`);
    console.log(`ℹ️ Users who already had credits: ${alreadyHasCredits}`);
    console.log(`⚠️ Profile-only users (no auth): ${noAuthUser}`);
    console.log(`❌ Errors encountered: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n📋 Error Details:');
      errors.forEach((e, i) => {
        console.log(`${i + 1}. ${e.email}: ${e.error}`);
      });
    }
    
    console.log('\n💡 Note: Profile-only users from Shopify migration will get credits when they create an account.');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the function
addCreditsToAllProfiles()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }); 