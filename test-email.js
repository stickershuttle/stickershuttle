// Test script to verify all email notification templates
// Run this with: node test-email.js

// Load environment variables from .env file in api directory
require('dotenv').config({ path: './api/.env' });

// Also try to load .env.local if it exists
require('dotenv').config({ path: './api/.env.local' });

const emailNotifications = require('./api/email-notifications');

// Test order data
const testOrderData = {
  order_number: 'SS-TEST-001',
  customer_email: 'justin@stickershuttle.com', // Replace with your email
  total_price: 25.99,
  tracking_number: 'TEST123456789',
  tracking_url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=TEST123456789'
};

// All possible order statuses to test
const statusesToTest = [
  'Building Proof',
  'Proof Sent', 
  'Printing',
  'Shipped',
  'Delivered'
];

async function testAllEmails() {
  console.log('🧪 Testing ALL email notification templates...');
  console.log('📧 Test order data:', testOrderData);
  
  // Check if RESEND_API_KEY is set
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY environment variable is not set!');
    console.log('💡 Please set RESEND_API_KEY in your environment variables');
    return;
  }
  
  console.log('✅ RESEND_API_KEY is configured');
  console.log('🚀 Starting email tests...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  // Test 1: Order Status Notifications
  console.log('📋 TESTING ORDER STATUS NOTIFICATIONS:');
  console.log('=' .repeat(50));
  
  for (const status of statusesToTest) {
    try {
      console.log(`\n🔄 Testing status: "${status}"`);
      
      const result = await emailNotifications.sendOrderStatusNotification(
        testOrderData, 
        status
      );
      
      if (result.success) {
        console.log(`✅ ${status} email sent successfully!`);
        console.log(`📬 Email ID: ${result.id}`);
        successCount++;
      } else {
        console.log(`❌ ${status} email failed:`, result.error);
        failCount++;
      }
      
      // Wait 1 second between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error testing ${status}:`, error);
      failCount++;
    }
  }
  
  // Test 2: Proof Notification
  console.log('\n\n📋 TESTING PROOF NOTIFICATION:');
  console.log('=' .repeat(50));
  
  try {
    console.log('\n🔄 Testing proof notification with sample image...');
    
    const proofUrl = 'https://via.placeholder.com/400x300/3B82F6/FFFFFF?text=Sample+Proof';
    const result = await emailNotifications.sendProofNotification(
      testOrderData, 
      proofUrl
    );
    
    if (result.success) {
      console.log('✅ Proof notification sent successfully!');
      console.log(`📬 Email ID: ${result.id}`);
      successCount++;
    } else {
      console.log('❌ Proof notification failed:', result.error);
      failCount++;
    }
  } catch (error) {
    console.error('❌ Error testing proof notification:', error);
    failCount++;
  }
  
  // Test 3: Proof Notification without image
  try {
    console.log('\n🔄 Testing proof notification without image...');
    
    const result = await emailNotifications.sendProofNotification(
      testOrderData, 
      null // No proof URL
    );
    
    if (result.success) {
      console.log('✅ Proof notification (no image) sent successfully!');
      console.log(`📬 Email ID: ${result.id}`);
      successCount++;
    } else {
      console.log('❌ Proof notification (no image) failed:', result.error);
      failCount++;
    }
  } catch (error) {
    console.error('❌ Error testing proof notification (no image):', error);
    failCount++;
  }
  
  // Test 4: Admin New Order Notification
  console.log('\n\n📋 TESTING ADMIN NEW ORDER NOTIFICATION:');
  console.log('=' .repeat(50));
  
  try {
    console.log('\n🔄 Testing admin new order notification...');
    
    const adminOrderData = {
      ...testOrderData,
      customer_first_name: 'Test',
      customer_last_name: 'Customer',
      order_status: 'Building Proof',
      order_note: '📏 Size: 3" x 3"\n✨ Material: Premium Vinyl\n✂️ Cut: Kiss Cut\n🔢 Quantity: 100\n⚡ Rush Order: Yes'
    };
    
    const result = await emailNotifications.sendAdminNewOrderNotification(adminOrderData);
    
    if (result.success) {
      console.log('✅ Admin new order notification sent successfully!');
      console.log(`📬 Email ID: ${result.id}`);
      successCount++;
    } else {
      console.log('❌ Admin new order notification failed:', result.error);
      failCount++;
    }
    
    // Wait 2 seconds before next admin test to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error) {
    console.error('❌ Error testing admin new order notification:', error);
    failCount++;
  }
  
  // Test 5: Admin Proof Action Notifications
  console.log('\n\n📋 TESTING ADMIN PROOF ACTION NOTIFICATIONS:');
  console.log('=' .repeat(50));
  
  // Test proof approved
  try {
    console.log('\n🔄 Testing admin proof approved notification...');
    
    const adminOrderData = {
      ...testOrderData,
      customer_first_name: 'Test',
      customer_last_name: 'Customer',
      order_status: 'Ready for Production',
      order_note: '📏 Size: 4" x 4"\n✨ Material: Chrome Vinyl\n✂️ Cut: Die Cut\n🔢 Quantity: 50'
    };
    
    const result = await emailNotifications.sendAdminProofActionNotification(
      adminOrderData, 
      'approved'
    );
    
    if (result.success) {
      console.log('✅ Admin proof approved notification sent successfully!');
      console.log(`📬 Email ID: ${result.id}`);
      successCount++;
    } else {
      console.log('❌ Admin proof approved notification failed:', result.error);
      failCount++;
    }
    
    // Wait 1 second between emails
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.error('❌ Error testing admin proof approved notification:', error);
    failCount++;
  }
  
  // Test proof changes requested
  try {
    console.log('\n🔄 Testing admin proof changes requested notification...');
    
    const adminOrderData = {
      ...testOrderData,
      customer_first_name: 'Test',
      customer_last_name: 'Customer',
      order_status: 'Changes Requested',
      order_note: '📏 Size: 2" x 2"\n✨ Material: Holographic Vinyl\n✂️ Cut: Kiss Cut\n🔢 Quantity: 250'
    };
    
    const result = await emailNotifications.sendAdminProofActionNotification(
      adminOrderData, 
      'changes_requested',
      { customerNotes: 'Please make the logo bigger and change the color to blue.' }
    );
    
    if (result.success) {
      console.log('✅ Admin proof changes requested notification sent successfully!');
      console.log(`📬 Email ID: ${result.id}`);
      successCount++;
    } else {
      console.log('❌ Admin proof changes requested notification failed:', result.error);
      failCount++;
    }
  } catch (error) {
    console.error('❌ Error testing admin proof changes requested notification:', error);
    failCount++;
  }
  
  // Final Results
  console.log('\n\n📊 TEST RESULTS SUMMARY:');
  console.log('=' .repeat(50));
  console.log(`✅ Successful emails: ${successCount}`);
  console.log(`❌ Failed emails: ${failCount}`);
  console.log(`📧 Total emails tested: ${successCount + failCount}`);
  
  if (failCount === 0) {
    console.log('\n🎉 ALL EMAIL TEMPLATES WORKING PERFECTLY!');
    console.log('📬 Check your inbox for all the test emails');
  } else {
    console.log('\n⚠️  Some email templates had issues. Check the logs above.');
  }
  
  console.log('\n💡 Email Templates Tested:');
  statusesToTest.forEach(status => {
    console.log(`   - ${status} status notification`);
  });
  console.log('   - Proof notification (with image)');
  console.log('   - Proof notification (without image)');
  console.log('   - Admin new order notification');
  console.log('   - Admin proof approved notification');
  console.log('   - Admin proof changes requested notification');
}

// Interactive mode - ask user what to test
async function interactiveTest() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('🧪 EMAIL TEMPLATE TESTER');
  console.log('=' .repeat(30));
  console.log('1. Test all email templates');
  console.log('2. Test specific status');
  console.log('3. Test proof notification');
  console.log('4. Exit');
  
  rl.question('\nChoose an option (1-4): ', async (answer) => {
    switch(answer) {
      case '1':
        rl.close();
        await testAllEmails();
        break;
        
      case '2':
        console.log('\nAvailable statuses:');
        statusesToTest.forEach((status, index) => {
          console.log(`${index + 1}. ${status}`);
        });
        
        rl.question('\nChoose status number: ', async (statusNum) => {
          const statusIndex = parseInt(statusNum) - 1;
          if (statusIndex >= 0 && statusIndex < statusesToTest.length) {
            const status = statusesToTest[statusIndex];
            console.log(`\n🔄 Testing ${status}...`);
            
            const result = await emailNotifications.sendOrderStatusNotification(
              testOrderData, 
              status
            );
            
            if (result.success) {
              console.log(`✅ ${status} email sent successfully!`);
              console.log(`📬 Email ID: ${result.id}`);
            } else {
              console.log(`❌ ${status} email failed:`, result.error);
            }
          } else {
            console.log('❌ Invalid status number');
          }
          rl.close();
        });
        break;
        
      case '3':
        rl.close();
        console.log('\n🔄 Testing proof notification...');
        
        const proofUrl = 'https://via.placeholder.com/400x300/F59E0B/FFFFFF?text=Test+Proof';
        const result = await emailNotifications.sendProofNotification(
          testOrderData, 
          proofUrl
        );
        
        if (result.success) {
          console.log('✅ Proof notification sent successfully!');
          console.log(`📬 Email ID: ${result.id}`);
        } else {
          console.log('❌ Proof notification failed:', result.error);
        }
        break;
        
      case '4':
        console.log('👋 Goodbye!');
        rl.close();
        break;
        
      default:
        console.log('❌ Invalid option');
        rl.close();
        break;
    }
  });
}

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('--all') || args.includes('-a')) {
  // Run all tests automatically
  testAllEmails();
} else if (args.includes('--interactive') || args.includes('-i')) {
  // Run interactive mode
  interactiveTest();
} else {
  // Default: run all tests
  console.log('💡 Running all tests by default. Use --interactive for menu.');
  console.log('💡 Available flags: --all, --interactive\n');
  testAllEmails();
} 