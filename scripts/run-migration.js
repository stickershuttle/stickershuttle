const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../frontend/.env.local') });

// Get the script to run from command line arguments
const scriptToRun = process.argv[2];

if (!scriptToRun) {
  console.error('❌ Please specify a script to run');
  console.log('Usage: node run-migration.js <script-name>');
  console.log('Example: node run-migration.js shopify-migration.js');
  process.exit(1);
}

// Check if the script exists
const scriptPath = path.join(__dirname, scriptToRun);
if (!fs.existsSync(scriptPath)) {
  console.error(`❌ Script not found: ${scriptPath}`);
  process.exit(1);
}

// Check if environment variables are loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Environment variables not loaded!');
  console.error('Make sure you have frontend/.env.local with:');
  console.error('- SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');

// Run the specified script
require(scriptPath); 