const supabaseClient = require('./supabase-client');

class ProfileCleaner {
  constructor() {
    if (!supabaseClient.isReady()) {
      console.error('❌ Supabase client not ready. Check environment variables.');
      process.exit(1);
    }
    this.supabase = supabaseClient.getServiceClient();
  }

  async deleteSpecificProfiles() {
    // UIDs from the screenshot
    const profilesToDelete = [
      {
        uid: 'd44a79e6-e3ce-4122-a7b3-e6a86d70b24b',
        name: 'Digital Bandit',
        email: 'thedigitalbandit@gmail.com'
      },
      {
        uid: '12731f0d-8583-476e-8aea-36f6ff007b38',
        name: 'Bailey Boofton',
        email: 'justinfowlermail@gmail.com'
      },
      {
        uid: '18129647-f5b7-49cb-9d9b-46a215cbd33c',
        name: 'Booby Brown',
        email: 'jayfowler@outlook.com'
      }
    ];

    console.log('🗑️  Deleting specific user profiles...');
    console.log('====================================');

    for (const profile of profilesToDelete) {
      try {
        console.log(`🔄 Processing: ${profile.name} (${profile.email})`);
        
        // First, delete from user_profiles table
        const { error: profileError } = await this.supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', profile.uid);

        if (profileError) {
          console.error(`❌ Error deleting profile for ${profile.name}:`, profileError.message);
          continue;
        }

        console.log(`✅ Deleted profile: ${profile.name}`);

        // Then delete the auth user (this will cascade delete the profile if it still exists)
        const { error: authError } = await this.supabase.auth.admin.deleteUser(profile.uid);

        if (authError) {
          console.error(`❌ Error deleting auth user for ${profile.name}:`, authError.message);
          continue;
        }

        console.log(`✅ Deleted auth user: ${profile.name}`);
        console.log('');

      } catch (error) {
        console.error(`💥 Unexpected error processing ${profile.name}:`, error.message);
      }
    }

    console.log('🎉 Profile deletion completed!');
  }
}

async function main() {
  const cleaner = new ProfileCleaner();
  await cleaner.deleteSpecificProfiles();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ProfileCleaner }; 