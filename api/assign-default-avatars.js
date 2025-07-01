const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Avatar utilities
const { defaultAvatars, getRandomAvatar, getAvatarNumber } = require('./avatar-utils');

async function assignDefaultAvatars() {
  console.log('🎭 Starting default avatar assignment...');
  console.log('=========================================');
  
  try {
    // Find users without profile photos
    console.log('🔍 Finding users without profile photos...');
    
    const { data: usersWithoutAvatars, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .or('profile_photo_url.is.null,profile_photo_url.eq.""');

    if (fetchError) {
      throw new Error(`Failed to fetch users: ${fetchError.message}`);
    }

    if (!usersWithoutAvatars || usersWithoutAvatars.length === 0) {
      console.log('✅ No users found without avatars. All users already have profile photos!');
      return;
    }

    console.log(`📊 Found ${usersWithoutAvatars.length} users without profile photos`);
    console.log('');

    // Update each user with a random avatar
    const updates = [];
    
    for (const user of usersWithoutAvatars) {
      const randomAvatar = getRandomAvatar();
      
      console.log(`👤 Assigning avatar to user: ${user.first_name || 'Unknown'} ${user.last_name || ''} (${user.user_id})`);
      console.log(`🎨 Selected avatar: ${randomAvatar}`);
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          profile_photo_url: randomAvatar,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.user_id)
        .select('*')
        .single();

      if (updateError) {
        console.error(`❌ Failed to update user ${user.user_id}:`, updateError.message);
        continue;
      }

      console.log(`✅ Successfully assigned avatar to ${user.first_name || 'Unknown'} ${user.last_name || ''}`);
      console.log('');
      
      updates.push({
        userId: user.user_id,
        name: `${user.first_name || 'Unknown'} ${user.last_name || ''}`.trim(),
        avatar: randomAvatar
      });

      // Add a small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('🎉 Avatar assignment completed!');
    console.log('=====================================');
    console.log(`📊 Successfully updated ${updates.length} users`);
    console.log('');
    console.log('📋 Summary of assignments:');
    updates.forEach((update, index) => {
      console.log(`${index + 1}. ${update.name} → Avatar ${getAvatarNumber(update.avatar)}`);
    });

  } catch (error) {
    console.error('💥 Error during avatar assignment:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Default Avatar Assignment Script');
  console.log('===================================');
  console.log('');
  console.log('This script will assign random default avatars to users who don\'t have profile photos.');
  console.log('');
  
  await assignDefaultAvatars();
  
  console.log('');
  console.log('✨ Script completed successfully!');
  process.exit(0);
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
}); 