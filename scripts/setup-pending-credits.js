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

async function createPendingCreditsTable() {
  console.log('📊 Creating pending_credits table...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS pending_credits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      amount DECIMAL(10, 2) NOT NULL,
      reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      applied BOOLEAN DEFAULT FALSE,
      applied_at TIMESTAMP WITH TIME ZONE,
      user_id UUID REFERENCES auth.users(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_pending_credits_email ON pending_credits(email);
    CREATE INDEX IF NOT EXISTS idx_pending_credits_applied ON pending_credits(applied);
  `;
  
  const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
  
  if (error) {
    // If the function doesn't exist, try direct SQL
    console.log('📝 Creating table directly...');
    // This is a workaround - in production you'd run this SQL directly in Supabase
    console.log('Please run this SQL in your Supabase SQL editor:');
    console.log(createTableSQL);
    return false;
  }
  
  return true;
}

async function addPendingCreditsForProfiles() {
  console.log('🎁 Adding $25 pending credits for all profile-only users...');
  
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
    
    // Get all auth users to exclude them
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.warn(`⚠️ Could not fetch auth users: ${authError.message}`);
    }
    
    const authUsers = authData?.users || [];
    const authEmails = new Set(authUsers.map(u => u.email.toLowerCase()));
    
    let successCount = 0;
    let alreadyHasAuth = 0;
    let errorCount = 0;
    const pendingCredits = [];
    
    // Process each profile
    for (const profile of profiles) {
      const email = profile.email?.toLowerCase();
      if (!email) {
        console.warn(`⚠️ Profile ${profile.id} has no email`);
        continue;
      }
      
      if (authEmails.has(email)) {
        console.log(`✓ ${email} already has an auth account`);
        alreadyHasAuth++;
        continue;
      }
      
      // Add to pending credits list
      pendingCredits.push({
        email: email,
        amount: 25.00,
        reason: 'Welcome bonus - Thank you for being a valued customer!'
      });
    }
    
    if (pendingCredits.length > 0) {
      console.log(`\n💾 Adding ${pendingCredits.length} pending credit records...`);
      
      // Insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < pendingCredits.length; i += batchSize) {
        const batch = pendingCredits.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('pending_credits')
          .upsert(batch, { onConflict: 'email' });
        
        if (error) {
          console.error(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error.message);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
          console.log(`✅ Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(pendingCredits.length/batchSize)}`);
        }
      }
    }
    
    console.log('\n🎉 Pending credits setup completed!');
    console.log(`✅ Successfully added pending credits for: ${successCount} users`);
    console.log(`ℹ️ Users who already have auth accounts: ${alreadyHasAuth}`);
    console.log(`❌ Errors encountered: ${errorCount}`);
    
    console.log('\n💡 Next steps:');
    console.log('1. Run the SQL provided above in Supabase to create the pending_credits table');
    console.log('2. Update your signup flow to check and apply pending credits');
    console.log('3. Users will automatically receive $25 when they create an account');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// SQL to run in Supabase to create the trigger
const triggerSQL = `
-- Function to apply pending credits when user signs up
CREATE OR REPLACE FUNCTION apply_pending_credits()
RETURNS TRIGGER AS $$
DECLARE
  v_pending_credit RECORD;
BEGIN
  -- Look for pending credits for this email
  SELECT * INTO v_pending_credit
  FROM pending_credits
  WHERE email = NEW.email
  AND applied = FALSE
  LIMIT 1;
  
  -- If found, apply the credits
  IF FOUND THEN
    -- Add credits to user
    PERFORM add_user_credits(
      NEW.id,
      v_pending_credit.amount,
      v_pending_credit.reason,
      NULL,
      NULL
    );
    
    -- Mark as applied
    UPDATE pending_credits
    SET applied = TRUE,
        applied_at = NOW(),
        user_id = NEW.id
    WHERE id = v_pending_credit.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS apply_pending_credits_trigger ON auth.users;
CREATE TRIGGER apply_pending_credits_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION apply_pending_credits();
`;

// Run the function
async function main() {
  console.log('\n📋 SQL to create pending_credits table and trigger:');
  console.log('========================================');
  console.log(`
CREATE TABLE IF NOT EXISTS pending_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_pending_credits_email ON pending_credits(email);
CREATE INDEX IF NOT EXISTS idx_pending_credits_applied ON pending_credits(applied);
`);
  console.log('\n' + triggerSQL);
  console.log('========================================\n');
  
  console.log('⚠️ IMPORTANT: First run the SQL above in your Supabase SQL editor');
  console.log('Then press Enter to continue adding pending credits...');
  
  // Wait for user confirmation
  await new Promise(resolve => {
    process.stdin.resume();
    process.stdin.once('data', resolve);
  });
  
  await addPendingCreditsForProfiles();
}

main()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }); 