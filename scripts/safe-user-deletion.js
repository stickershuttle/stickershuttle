// Use the existing Supabase client from the API
const SupabaseClient = require('../api/supabase-client');
require('dotenv').config({ path: '.env.local' });

// Protected admin emails - NEVER delete these
const PROTECTED_EMAILS = [
  'justin@stickershuttle.com',
  'admin@stickershuttle.com',
  'orbit@stickershuttle.com'
];

class SafeUserDeletion {
  constructor() {
    this.supabaseClient = new SupabaseClient();
    this.supabase = this.supabaseClient.getServiceClient();
  }

  async getAllUsers() {
    try {
      const { data, error } = await this.supabase.auth.admin.listUsers();
      if (error) throw error;
      return data.users;
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      return [];
    }
  }

  async getDeletableUsers() {
    const allUsers = await this.getAllUsers();
    return allUsers.filter(user => 
      !PROTECTED_EMAILS.includes(user.email?.toLowerCase() || '')
    );
  }

  async backupUserData(user) {
    try {
      // Get user profile data
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Get user orders
      const { data: orders } = await this.supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id);

      // Get user credits
      const { data: credits } = await this.supabase
        .from('credits')
        .select('*')
        .eq('user_id', user.id);

      const backup = {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          user_metadata: user.user_metadata
        },
        profile,
        orders: orders || [],
        credits: credits || [],
        backup_date: new Date().toISOString()
      };

      // Save backup to file
      const fs = require('fs');
      const path = require('path');
      
      const backupDir = path.join(__dirname, 'user-backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const filename = `user-backup-${user.id}-${Date.now()}.json`;
      const filepath = path.join(backupDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
      console.log(`✅ Backup created: ${filepath}`);
      
      return filepath;
    } catch (error) {
      console.error(`❌ Error backing up user ${user.email}:`, error);
      return null;
    }
  }

  async deleteUser(userId) {
    try {
      const { error } = await this.supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`❌ Error deleting user ${userId}:`, error);
      return false;
    }
  }

  async listDeletableUsers() {
    console.log('\n🔍 Scanning for deletable users...\n');
    
    const deletableUsers = await this.getDeletableUsers();
    
    if (deletableUsers.length === 0) {
      console.log('✅ No deletable users found (all users are protected)');
      return;
    }

    console.log(`📋 Found ${deletableUsers.length} deletable users:\n`);
    
    deletableUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log(`   Last login: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}`);
      console.log('');
    });

    console.log('🛡️ Protected accounts (will NOT be deleted):');
    PROTECTED_EMAILS.forEach(email => console.log(`   - ${email}`));
    console.log('');
  }

  async deleteAllDeletableUsers(createBackups = true) {
    const deletableUsers = await this.getDeletableUsers();
    
    if (deletableUsers.length === 0) {
      console.log('✅ No users to delete');
      return { success: 0, failed: 0, backed_up: 0 };
    }

    console.log(`\n⚠️  WARNING: About to delete ${deletableUsers.length} users!`);
    console.log('Protected accounts will NOT be deleted:', PROTECTED_EMAILS.join(', '));
    
    // In a real scenario, you'd want confirmation here
    console.log('\n🔄 Starting deletion process...\n');

    let success = 0;
    let failed = 0;
    let backed_up = 0;

    for (const user of deletableUsers) {
      console.log(`Processing: ${user.email}`);
      
      // Create backup if requested
      if (createBackups) {
        const backupPath = await this.backupUserData(user);
        if (backupPath) {
          backed_up++;
          console.log(`  ✅ Backup created`);
        } else {
          console.log(`  ⚠️  Backup failed, skipping deletion for safety`);
          failed++;
          continue;
        }
      }

      // Delete user
      const deleted = await this.deleteUser(user.id);
      if (deleted) {
        success++;
        console.log(`  ✅ User deleted`);
      } else {
        failed++;
        console.log(`  ❌ Deletion failed`);
      }
      
      console.log('');
    }

    console.log('\n📊 Deletion Summary:');
    console.log(`  ✅ Successfully deleted: ${success}`);
    console.log(`  ❌ Failed to delete: ${failed}`);
    console.log(`  💾 Backups created: ${backed_up}`);

    return { success, failed, backed_up };
  }
}

// Main execution
async function main() {
  const deletion = new SafeUserDeletion();
  
  console.log('🚀 Safe User Deletion Tool');
  console.log('==========================\n');

  // List deletable users first
  await deletion.listDeletableUsers();

  // Uncomment the line below to actually perform deletion
  // await deletion.deleteAllDeletableUsers(true);

  console.log('\n⚠️  To actually delete users, uncomment the deletion line in the script');
  console.log('💡 Always test in development first!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SafeUserDeletion; 