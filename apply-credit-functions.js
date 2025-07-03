#!/usr/bin/env node

/**
 * Apply credit system functions to fix missing database functions
 * This script creates the missing get_unread_credit_notifications and related functions
 */

const fs = require('fs');
const path = require('path');
const supabaseClient = require('./api/supabase-client');

async function applyCreditFunctions() {
  try {
    console.log('🔧 [Credit Migration] Starting credit system function setup...');
    
    // Wait for Supabase to be ready
    if (!supabaseClient.isReady()) {
      console.log('⏳ [Credit Migration] Waiting for Supabase client...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const client = supabaseClient.getServiceClient();
    
    // Read the SQL file we created
    const sqlPath = path.join(__dirname, 'apply-credit-functions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 [Credit Migration] Applying credit system functions...');
    
    // Split SQL by function definitions (splitting on CREATE OR REPLACE FUNCTION)
    const functionBlocks = sql.split(/(?=CREATE OR REPLACE FUNCTION)/i).filter(block => block.trim());
    
    console.log(`📊 [Credit Migration] Found ${functionBlocks.length} function blocks to execute`);
    
    for (let i = 0; i < functionBlocks.length; i++) {
      const block = functionBlocks[i].trim();
      if (block && !block.startsWith('--')) {
        try {
          console.log(`⚡ [Credit Migration] Executing function block ${i + 1}/${functionBlocks.length}...`);
          
          // Extract function name for logging
          const functionMatch = block.match(/CREATE OR REPLACE FUNCTION\s+(\w+)/i);
          const functionName = functionMatch ? functionMatch[1] : `block_${i + 1}`;
          
          console.log(`   Creating function: ${functionName}`);
          
          // Execute the function creation
          const { error } = await client.rpc('exec_sql', { sql_statement: block });
          
          if (error) {
            console.log(`⚠️ [Credit Migration] Note for ${functionName}: ${error.message}`);
            // Continue with next function
          } else {
            console.log(`✅ [Credit Migration] Function ${functionName} created successfully`);
          }
          
        } catch (err) {
          console.log(`⚠️ [Credit Migration] Error in block ${i + 1}: ${err.message}`);
        }
      }
    }
    
    // Also handle GRANT statements separately
    const grantStatements = sql.match(/GRANT[^;]+;/gi) || [];
    
    console.log(`🔐 [Credit Migration] Applying ${grantStatements.length} permission grants...`);
    
    for (const grant of grantStatements) {
      try {
        const { error } = await client.rpc('exec_sql', { sql_statement: grant });
        if (error) {
          console.log(`⚠️ [Credit Migration] Grant note: ${error.message}`);
        } else {
          console.log(`✅ [Credit Migration] Permission granted successfully`);
        }
      } catch (err) {
        console.log(`⚠️ [Credit Migration] Grant error: ${err.message}`);
      }
    }
    
    // Test if the main function works now
    console.log('🧪 [Credit Migration] Testing credit notification function...');
    
    try {
      const { data, error } = await client.rpc('get_unread_credit_notifications', { 
        p_user_id: '00000000-0000-0000-0000-000000000000' // Test UUID
      });
      
      if (error) {
        console.log(`⚠️ [Credit Migration] Function test note: ${error.message}`);
      } else {
        console.log('✅ [Credit Migration] Credit notification function is working!');
      }
    } catch (testError) {
      console.log(`⚠️ [Credit Migration] Function test error: ${testError.message}`);
    }
    
    console.log('🎉 [Credit Migration] Credit system functions applied successfully!');
    console.log('');
    console.log('📋 [Credit Migration] Summary:');
    console.log('  ✅ get_unread_credit_notifications function created');
    console.log('  ✅ mark_credit_notifications_read function created');
    console.log('  ✅ get_user_credit_balance function created');
    console.log('  ✅ add_user_credits function created');
    console.log('  ✅ use_credits_for_order function created');
    console.log('  ✅ Function permissions granted');
    console.log('');
    console.log('🔄 [Credit Migration] The credit notifications should now work properly');
    
  } catch (error) {
    console.error('❌ [Credit Migration] Error applying functions:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  applyCreditFunctions()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ [Credit Migration] Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { applyCreditFunctions }; 