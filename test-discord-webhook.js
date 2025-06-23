#!/usr/bin/env node

/**
 * Discord Webhook Test Script
 * 
 * This script tests your Discord webhook to make sure it's working
 * before you integrate it with your order system.
 * 
 * Usage:
 * 1. Replace YOUR_WEBHOOK_URL with your actual Discord webhook URL
 * 2. Run: node test-discord-webhook.js
 */

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1386769045516324945/KyR7mxv5iKfsjQqZ7VmRkLuRABN-Wx8F4jW0eeDCsGn5Vi7cXUciwEguVPFQabbTgMk3';

async function testDiscordWebhook() {
  if (DISCORD_WEBHOOK_URL === 'YOUR_WEBHOOK_URL_HERE') {
    console.log('❌ Please replace YOUR_WEBHOOK_URL_HERE with your actual Discord webhook URL');
    console.log('📝 Edit this file and replace line 12 with your webhook URL');
    return;
  }

  console.log('🧪 Testing Discord webhook...');
  console.log('📍 Webhook URL:', DISCORD_WEBHOOK_URL.substring(0, 50) + '...');

  try {
    // Test message 1: Simple text
    console.log('\n📤 Sending simple test message...');
    
    const simpleMessage = {
      content: '🧪 **Test Message 1:** Simple text notification from Sticker Shuttle!'
    };

    let response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(simpleMessage)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('✅ Simple message sent successfully!');
    
    // Wait a moment between messages
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test message 2: Rich embed (like your order notifications)
    console.log('\n📤 Sending rich embed test message...');
    
    const richMessage = {
      content: '🧪 **Test Message 2:** Rich embed notification',
      embeds: [{
        title: '🎉 Test Order Notification',
        description: 'This is what your real order notifications will look like!',
        color: 0x00ff00, // Green color
        fields: [
          { name: '📋 Order Number', value: 'TEST-12345', inline: true },
          { name: '👤 Customer', value: 'John Test Customer', inline: true },
          { name: '💰 Total', value: '$45.99', inline: true },
          { name: '📧 Email', value: 'test@customer.com', inline: true },
          { name: '📊 Status', value: 'Awaiting Proof Approval', inline: true },
          { name: '🕐 Time', value: new Date().toLocaleString(), inline: true }
        ],
        footer: {
          text: 'Sticker Shuttle Order System - TEST'
        }
      }]
    };

    response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(richMessage)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('✅ Rich embed message sent successfully!');

    // Success summary
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('📱 Check your Discord channel - you should see 2 test messages');
    console.log('✅ Your Discord webhook is working correctly!');
    console.log('\n📋 Next steps:');
    console.log('   1. Add your webhook URL to environment variables');
    console.log('   2. Deploy your notification system');
    console.log('   3. Test with a real order');
    console.log('\n🗑️  You can delete this test file after setup: rm test-discord-webhook.js');

  } catch (error) {
    console.log('\n❌ TEST FAILED!');
    console.log('🔍 Error details:', error.message);
    console.log('\n🛠️  Troubleshooting:');
    console.log('   1. Check that your webhook URL is correct');
    console.log('   2. Make sure it starts with: https://discord.com/api/webhooks/');
    console.log('   3. Verify the Discord channel and webhook still exist');
    console.log('   4. Try creating a new webhook if this one is broken');
  }
}

// Add basic fetch polyfill for Node.js if needed
if (typeof fetch === 'undefined') {
  console.log('📦 Installing fetch for Node.js...');
  const { fetch: nodeFetch } = await import('node-fetch');
  global.fetch = nodeFetch;
}

// Run the test
testDiscordWebhook().catch(console.error); 