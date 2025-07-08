#!/usr/bin/env node

/**
 * Cleanup Abandoned Checkouts Script
 * 
 * This script finds abandoned Stripe checkout sessions older than 24 hours
 * and restores any credits that were deducted but never used due to incomplete payments.
 * 
 * Usage:
 *   node cleanup-abandoned-checkouts.js [maxAgeHours]
 * 
 * Examples:
 *   node cleanup-abandoned-checkouts.js        # Default: 24 hours
 *   node cleanup-abandoned-checkouts.js 48     # Cleanup sessions older than 48 hours
 *   node cleanup-abandoned-checkouts.js 1      # Cleanup sessions older than 1 hour (for testing)
 */

const path = require('path');

// Initialize environment and dependencies (local development only)
if (process.env.NODE_ENV !== 'production' && !process.env.RAILWAY_ENVIRONMENT) {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
}

async function runCleanup() {
  try {
    console.log('🧹 Starting abandoned checkout cleanup...');
    console.log('⏰ Current time:', new Date().toISOString());
    
    // Get maxAgeHours from command line argument or default to 24
    const maxAgeHours = parseInt(process.argv[2]) || 24;
    console.log(`📅 Looking for abandoned checkouts older than ${maxAgeHours} hours`);
    
    // Initialize Supabase client
    const supabaseClient = require('./supabase-client');
    await supabaseClient.initialize();
    
    if (!supabaseClient.isReady()) {
      throw new Error('Failed to initialize Supabase client');
    }
    
    console.log('✅ Database connection established');
    
    // Initialize credit handlers
    const creditHandlers = require('./credit-handlers');
    creditHandlers.initializeWithSupabase(supabaseClient);
    
    // Run the cleanup
    console.log('🔍 Searching for abandoned checkouts with credits to restore...');
    const result = await creditHandlers.cleanupAbandonedCheckouts(maxAgeHours);
    
    if (result.success) {
      console.log('✅ Cleanup completed successfully!');
      console.log(`💰 Total credits restored: $${result.totalRestored || 0}`);
      console.log(`🔄 Sessions processed: ${result.restoredSessions || 0}`);
      console.log(`📝 ${result.message}`);
      
      if (result.totalRestored > 0) {
        console.log('');
        console.log('🎉 Credits have been successfully restored to affected users!');
        console.log('📧 Users will see their restored credits in their account balance.');
      } else {
        console.log('');
        console.log('👍 No abandoned checkouts found requiring cleanup.');
      }
    } else {
      console.error('❌ Cleanup failed:', result.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Fatal error during cleanup:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️ Cleanup interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Cleanup terminated');
  process.exit(0);
});

// Run the cleanup
if (require.main === module) {
  runCleanup()
    .then(() => {
      console.log('');
      console.log('🏁 Cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { runCleanup }; 