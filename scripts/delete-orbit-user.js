#!/usr/bin/env node

/**
 * Force Delete Orbit User via Supabase Admin API
 * This script uses the Supabase admin client to delete the user from auth.users
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function forceDeleteOrbitUser() {
  console.log('🚀 Starting force deletion of orbit@stickershuttle.com...');
  
  // Create admin client with service role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    // Step 1: Find the user first
    console.log('🔍 Looking for orbit@stickershuttle.com user...');
    
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      return;
    }
    
    const orbitUser = users.users.find(user => user.email === 'orbit@stickershuttle.com');
    
    if (!orbitUser) {
      console.log('✅ orbit@stickershuttle.com user not found - already deleted or never existed');
      return;
    }
    
    console.log(`📋 Found user: ${orbitUser.email} (ID: ${orbitUser.id})`);
    console.log(`   Created: ${orbitUser.created_at}`);
    console.log(`   Last sign in: ${orbitUser.last_sign_in_at || 'Never'}`);
    
    // Step 2: Delete related data from public tables first
    console.log('🧹 Cleaning up related data...');
    
    // Delete user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', orbitUser.id);
    
    if (profileError) {
      console.log('⚠️  Error deleting user profile:', profileError.message);
    } else {
      console.log('✅ Deleted user profile');
    }
    
    // Delete orders
    const { error: ordersError } = await supabase
      .from('my_orders')
      .delete()
      .eq('user_id', orbitUser.id);
    
    if (ordersError) {
      console.log('⚠️  Error deleting orders:', ordersError.message);
    } else {
      console.log('✅ Deleted user orders');
    }
    
    // Delete guest orders
    const { error: guestOrdersError } = await supabase
      .from('my_orders')
      .delete()
      .eq('guest_email', 'orbit@stickershuttle.com');
    
    if (guestOrdersError) {
      console.log('⚠️  Error deleting guest orders:', guestOrdersError.message);
    } else {
      console.log('✅ Deleted guest orders');
    }
    
    // Delete credits
    const { error: creditsError } = await supabase
      .from('user_credits')
      .delete()
      .eq('user_id', orbitUser.id);
    
    if (creditsError) {
      console.log('⚠️  Error deleting credits:', creditsError.message);
    } else {
      console.log('✅ Deleted user credits');
    }
    
    // Step 3: Force delete the user from auth
    console.log('🗑️  Force deleting user from auth system...');
    
    const { error: deleteError } = await supabase.auth.admin.deleteUser(orbitUser.id);
    
    if (deleteError) {
      console.error('❌ Error deleting user from auth:', deleteError.message);
      return;
    }
    
    console.log('✅ Successfully deleted user from auth system');
    
    // Step 4: Verify deletion
    console.log('🔍 Verifying deletion...');
    
    const { data: verifyUsers, error: verifyError } = await supabase.auth.admin.listUsers();
    
    if (verifyError) {
      console.error('❌ Error verifying deletion:', verifyError.message);
      return;
    }
    
    const stillExists = verifyUsers.users.find(user => user.email === 'orbit@stickershuttle.com');
    
    if (stillExists) {
      console.error('❌ FAILED: User still exists after deletion attempt');
    } else {
      console.log('🎉 SUCCESS: orbit@stickershuttle.com user completely deleted!');
      
      // Show remaining users
      const remainingTestUsers = verifyUsers.users.filter(user => 
        user.email === 'justin@stickershuttle.com'
      );
      
      console.log('\n📊 Remaining admin users:');
      remainingTestUsers.forEach(user => {
        console.log(`   - ${user.email} (ID: ${user.id})`);
      });
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    console.error(error.stack);
  }
}

// Run the script
if (require.main === module) {
  forceDeleteOrbitUser()
    .then(() => {
      console.log('\n🏁 Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { forceDeleteOrbitUser }; 