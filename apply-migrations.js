const fs = require('fs');
const path = require('path');

console.log('🔧 SIGNUP FIX - MANUAL MIGRATION SCRIPT');
console.log('=====================================');
console.log('');
console.log('Copy and paste the following SQL into your Supabase SQL Editor:');
console.log('(Dashboard → SQL Editor → New Query)');
console.log('');
console.log('=' .repeat(80));

// Read and output the trigger fix migration
try {
  const triggerFixPath = path.join(__dirname, 'supabase', 'migrations', '004_fix_user_profile_trigger.sql');
  const triggerFixSQL = fs.readFileSync(triggerFixPath, 'utf8');
  
  console.log('-- MIGRATION 1: Fix User Profile Creation Trigger');
  console.log('-- This fixes the signup issue by correcting the trigger logic');
  console.log('');
  console.log(triggerFixSQL);
  console.log('');
  console.log('-'.repeat(80));
  console.log('');
  
} catch (error) {
  console.error('❌ Could not read trigger fix migration:', error.message);
}

// Read and output the table structure migration
try {
  const tableFixPath = path.join(__dirname, 'supabase', 'migrations', '005_ensure_user_profiles_columns.sql');
  const tableFixSQL = fs.readFileSync(tableFixPath, 'utf8');
  
  console.log('-- MIGRATION 2: Ensure User Profiles Table Structure');
  console.log('-- This ensures all required columns exist (should be safe to run)');
  console.log('');
  console.log(tableFixSQL);
  console.log('');
  console.log('=' .repeat(80));
  
} catch (error) {
  console.error('❌ Could not read table fix migration:', error.message);
}

console.log('');
console.log('📋 INSTRUCTIONS:');
console.log('1. Go to your Supabase Dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Create a new query');
console.log('4. Copy and paste the SQL above');
console.log('5. Click "Run" to execute');
console.log('');
console.log('🧪 TESTING:');
console.log('After running the migrations, test signup on your website.');
console.log('The "Database error saving new user" should be resolved.');
console.log('');
console.log('⚠️  NOTE: These migrations are safe to run and won\'t affect existing data.'); 