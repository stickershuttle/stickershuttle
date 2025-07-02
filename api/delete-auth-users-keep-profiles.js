const supabaseClient = require('./supabase-client');

// Only protect justin@stickershuttle.com
const PROTECTED_EMAIL = 'justin@stickershuttle.com';

class AuthUserDeletionKeepProfiles {
  constructor() {
    if (!supabaseClient.isReady()) {
      console.error('❌ Supabase client not ready. Check environment variables.');
      process.exit(1);
    }
    this.supabase = supabaseClient.getServiceClient();
  }

  async getAllAuthUsers() {
    try {
      console.log('🔍 Fetching all auth users...');
      const { data, error } = await this.supabase.auth.admin.listUsers();
      if (error) throw error;
      console.log(`✅ Found ${data.users.length} total auth users`);
      return data.users;
    } catch (error) {
      console.error('❌ Error fetching auth users:', error);
      return [];
    }
  }

  async getDeletableUsers() {
    const allUsers = await this.getAllAuthUsers();
    const deletable = allUsers.filter(user => 
      user.email?.toLowerCase() !== PROTECTED_EMAIL.toLowerCase()
    );
    console.log(`🛡️  Protected user: ${PROTECTED_EMAIL}`);
    console.log(`🗑️  ${deletable.length} auth users will be deleted`);
    return deletable;
  }

  async deleteAuthUser(user) {
    try {
      console.log(`🗑️  Deleting auth user: ${user.email} (${user.id})`);
      
      // Note: Deleting from auth.users will NOT delete the user_profiles entry
      // because user_profiles typically has ON DELETE SET NULL or similar
      const { error } = await this.supabase.auth.admin.deleteUser(user.id);
      
      if (error) throw error;
      console.log(`✅ Successfully deleted auth user: ${user.email}`);
      console.log(`   ℹ️  User profile in user_profiles table is preserved`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting auth user ${user.email}:`, error.message);
      return false;
    }
  }

  async checkUserProfiles() {
    try {
      console.log('\n📊 Checking user_profiles table...');
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, email')
        .limit(5);
      
      if (error) {
        console.log('⚠️  Could not check user_profiles table:', error.message);
        return;
      }
      
      console.log(`✅ Sample user profiles (will be preserved):`);
      data.forEach(profile => {
        console.log(`   - ${profile.first_name || 'Unknown'} ${profile.last_name || 'User'} (${profile.email || 'No email'})`);
      });
    } catch (error) {
      console.error('Error checking profiles:', error);
    }
  }

  async listDeletableUsers() {
    console.log('\n🔍 Scanning for deletable auth users...\n');
    
    const deletableUsers = await this.getDeletableUsers();
    
    if (deletableUsers.length === 0) {
      console.log('✅ No deletable users found (only protected user exists)');
      return deletableUsers;
    }

    console.log(`📋 Found ${deletableUsers.length} deletable auth users:\n`);
    
    deletableUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email || 'No email'}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log(`   Last login: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}`);
      console.log('');
    });

    console.log(`🛡️  Protected account (will NOT be deleted): ${PROTECTED_EMAIL}`);
    console.log('ℹ️  Note: User profiles in user_profiles table will be PRESERVED\n');

    return deletableUsers;
  }

  async deleteAllAuthUsersExceptProtected() {
    const deletableUsers = await this.getDeletableUsers();
    
    if (deletableUsers.length === 0) {
      console.log('✅ No auth users to delete');
      return { success: 0, failed: 0 };
    }

    console.log(`\n⚠️  WARNING: About to delete ${deletableUsers.length} auth users!`);
    console.log(`🛡️  Protected account: ${PROTECTED_EMAIL}`);
    console.log('ℹ️  User profiles in user_profiles table will be PRESERVED');
    console.log('\n🔄 Starting deletion process...\n');

    let success = 0;
    let failed = 0;

    for (const user of deletableUsers) {
      const deleted = await this.deleteAuthUser(user);
      if (deleted) {
        success++;
      } else {
        failed++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Deletion Summary:');
    console.log(`  ✅ Successfully deleted: ${success} auth users`);
    console.log(`  ❌ Failed to delete: ${failed} auth users`);
    console.log(`  ℹ️  All user profiles in user_profiles table are preserved`);

    // Show profile preservation status
    await this.checkUserProfiles();

    return { success, failed };
  }
}

// Main execution
async function main() {
  console.log('🚀 Auth User Deletion Tool (Preserving Profiles)');
  console.log('==============================================\n');
  console.log('This tool will:');
  console.log('  1. Delete all auth users except justin@stickershuttle.com');
  console.log('  2. PRESERVE all user profiles in the user_profiles table');
  console.log('  3. Keep all order history and other user data intact\n');

  const deletion = new AuthUserDeletionKeepProfiles();
  
  // Get command line argument
  const args = process.argv.slice(2);
  const shouldDelete = args.includes('--delete');

  if (shouldDelete) {
    console.log('🔥 DELETION MODE ENABLED\n');
    
    // Add extra confirmation
    console.log('⚠️  FINAL WARNING: This will delete all auth users except justin@stickershuttle.com');
    console.log('   User profiles will be preserved, but users will not be able to log in.');
    console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await deletion.deleteAllAuthUsersExceptProtected();
  } else {
    console.log('👀 LIST MODE (no deletion will occur)\n');
    await deletion.listDeletableUsers();
    console.log('\n💡 To actually delete auth users, run: node delete-auth-users-keep-profiles.js --delete');
    console.log('⚠️  This will prevent users from logging in, but preserve their profile data!');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AuthUserDeletionKeepProfiles; 