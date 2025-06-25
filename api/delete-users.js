const supabaseClient = require('./supabase-client');

// Protected admin emails - NEVER delete these
const PROTECTED_EMAILS = [
  'justin@stickershuttle.com',
  'admin@stickershuttle.com',
  'orbit@stickershuttle.com'
];

class SafeUserDeletion {
  constructor() {
    if (!supabaseClient.isReady()) {
      console.error('❌ Supabase client not ready. Check environment variables.');
      process.exit(1);
    }
    this.supabase = supabaseClient.getServiceClient();
  }

  async getAllUsers() {
    try {
      console.log('🔍 Fetching all users...');
      const { data, error } = await this.supabase.auth.admin.listUsers();
      if (error) throw error;
      console.log(`✅ Found ${data.users.length} total users`);
      return data.users;
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      return [];
    }
  }

  async getDeletableUsers() {
    const allUsers = await this.getAllUsers();
    const deletable = allUsers.filter(user => 
      !PROTECTED_EMAILS.includes(user.email?.toLowerCase() || '')
    );
    console.log(`🛡️  ${allUsers.length - deletable.length} users are protected`);
    console.log(`🗑️  ${deletable.length} users can be deleted`);
    return deletable;
  }

  async deleteUser(user) {
    try {
      console.log(`🗑️  Deleting user: ${user.email} (${user.id})`);
      const { error } = await this.supabase.auth.admin.deleteUser(user.id);
      if (error) throw error;
      console.log(`✅ Successfully deleted: ${user.email}`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting user ${user.email}:`, error.message);
      return false;
    }
  }

  async listDeletableUsers() {
    console.log('\n🔍 Scanning for deletable users...\n');
    
    const deletableUsers = await this.getDeletableUsers();
    
    if (deletableUsers.length === 0) {
      console.log('✅ No deletable users found (all users are protected)');
      return deletableUsers;
    }

    console.log(`📋 Found ${deletableUsers.length} deletable users:\n`);
    
    deletableUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log(`   Last login: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}`);
      console.log('');
    });

    console.log('🛡️ Protected accounts (will NOT be deleted):');
    PROTECTED_EMAILS.forEach(email => console.log(`   - ${email}`));
    console.log('');

    return deletableUsers;
  }

  async deleteAllDeletableUsers() {
    const deletableUsers = await this.getDeletableUsers();
    
    if (deletableUsers.length === 0) {
      console.log('✅ No users to delete');
      return { success: 0, failed: 0 };
    }

    console.log(`\n⚠️  WARNING: About to delete ${deletableUsers.length} users!`);
    console.log('Protected accounts will NOT be deleted:', PROTECTED_EMAILS.join(', '));
    console.log('\n🔄 Starting deletion process...\n');

    let success = 0;
    let failed = 0;

    for (const user of deletableUsers) {
      const deleted = await this.deleteUser(user);
      if (deleted) {
        success++;
      } else {
        failed++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Deletion Summary:');
    console.log(`  ✅ Successfully deleted: ${success}`);
    console.log(`  ❌ Failed to delete: ${failed}`);

    return { success, failed };
  }
}

// Main execution
async function main() {
  console.log('🚀 Safe User Deletion Tool');
  console.log('==========================\n');

  const deletion = new SafeUserDeletion();
  
  // Get command line argument
  const args = process.argv.slice(2);
  const shouldDelete = args.includes('--delete');

  if (shouldDelete) {
    console.log('🔥 DELETION MODE ENABLED\n');
    await deletion.deleteAllDeletableUsers();
  } else {
    console.log('👀 LIST MODE (no deletion will occur)\n');
    await deletion.listDeletableUsers();
    console.log('\n💡 To actually delete users, run: node delete-users.js --delete');
    console.log('⚠️  Always backup your data first!');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SafeUserDeletion; 