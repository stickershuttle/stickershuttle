const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process each profile
    for (const profile of profiles) {
      try {
        // Check if this profile has an associated auth user
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.warn(`⚠️ Could not check auth users: ${authError.message}`);
        }
        
        // Find auth user by email
        const authUser = authUsers?.users?.find(u => u.email === profile.email);
        
        if (!authUser) {
          console.log(`⚠️ No auth user found for ${profile.email} - creating credit record with profile ID`);
          
          // For profiles without auth users (migrated from Shopify), 
          // we'll create a placeholder credit record that can be linked later
          // when they create an account
          
          // Check if credits already exist for this email
          const { data: existingCredits } = await supabase
            .from('credits')
            .select('id')
            .eq('metadata->email', profile.email)
            .single();
          
          if (existingCredits) {
            console.log(`✓ Credits already exist for ${profile.email}`);
            continue;
          }
          
          // Create credit record with email in metadata
          const { data: credit, error: creditError } = await supabase
            .from('credits')
            .insert({
              user_id: authUser?.id || '00000000-0000-0000-0000-000000000000', // Placeholder UUID
              amount: 25.00,
              balance: 25.00,
              reason: 'Welcome credit for migrated customers',
              transaction_type: 'add',
              created_at: new Date().toISOString(),
              metadata: {
                email: profile.email,
                profile_id: profile.id,
                migration_credit: true,
                awaiting_user_creation: !authUser
              }
            })
            .select()
            .single();
          
          if (creditError) {
            throw creditError;
          }
          
          console.log(`💰 Added $25 credit for ${profile.email} (${authUser ? 'has auth user' : 'pending auth user'})`);
          successCount++;
          
        } else {
          // User has auth account, use the standard function
          const { data, error } = await supabase
            .rpc('add_user_credits', {
              p_user_id: authUser.id,
              p_amount: 25.00,
              p_reason: 'Welcome credit for migrated customers',
              p_created_by: null,
              p_expires_at: null
            });
          
          if (error) {
            throw error;
          }
          
          console.log(`✅ Added $25 credit for ${profile.email} (auth user: ${authUser.id})`);
          successCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error adding credit for ${profile.email}:`, error.message);
        errors.push({ email: profile.email, error: error.message });
        errorCount++;
      }
    }
    
    console.log('\n🎉 Credit addition completed!');
    console.log(`✅ Successfully added credits: ${successCount}`);
    console.log(`❌ Errors encountered: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n📋 Error Details:');
      errors.forEach((e, i) => {
        console.log(`${i + 1}. ${e.email}: ${e.error}`);
      });
    }
    
    console.log('\n💡 Note: Credits for users without auth accounts are stored and will be linked when they sign up.');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Function to link pending credits when users sign up
async function linkPendingCredits(email, newUserId) {
  try {
    // Find pending credits for this email
    const { data: pendingCredits, error: fetchError } = await supabase
      .from('credits')
      .select('*')
      .eq('metadata->email', email)
      .eq('metadata->awaiting_user_creation', true);
    
    if (fetchError || !pendingCredits || pendingCredits.length === 0) {
      return; // No pending credits
    }
    
    // Update credits to link to the new user
    for (const credit of pendingCredits) {
      const { error: updateError } = await supabase
        .from('credits')
        .update({
          user_id: newUserId,
          metadata: {
            ...credit.metadata,
            awaiting_user_creation: false,
            linked_at: new Date().toISOString()
          }
        })
        .eq('id', credit.id);
      
      if (updateError) {
        console.error(`Failed to link credit ${credit.id}:`, updateError);
      } else {
        console.log(`Linked $${credit.amount} credit to user ${email}`);
      }
    }
  } catch (error) {
    console.error('Error linking pending credits:', error);
  }
}

// Export functions
module.exports = {
  addCreditsToAllProfiles,
  linkPendingCredits
};

// Run if called directly
if (require.main === module) {
  // Check for environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables!');
    console.log('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  addCreditsToAllProfiles()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
} 