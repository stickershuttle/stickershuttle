const shopifyClient = require('./shopify-client');

async function setupWebhooks() {
  try {
    const client = new shopifyClient();
    
    // Check existing webhooks first
    console.log('🔍 Checking existing webhooks...');
    const existingWebhooks = await client.getWebhooks();
    console.log('📋 Existing webhooks:', JSON.stringify(existingWebhooks, null, 2));
    
    // Define required webhooks
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://stickershuttle-production.up.railway.app'
      : 'https://your-ngrok-url.ngrok-free.app'; // You'll need to replace this
    
    const requiredWebhooks = [
      {
        topic: 'orders/create',
        address: `${baseUrl}/webhooks/orders-create`,
        format: 'json'
      },
      {
        topic: 'orders/updated',
        address: `${baseUrl}/webhooks/orders-updated`,
        format: 'json'
      },
      {
        topic: 'orders/paid',
        address: `${baseUrl}/webhooks/orders-paid`,
        format: 'json'
      },
      {
        topic: 'orders/cancelled',
        address: `${baseUrl}/webhooks/orders-cancelled`,
        format: 'json'
      },
      {
        topic: 'orders/fulfilled',
        address: `${baseUrl}/webhooks/orders-fulfilled`,
        format: 'json'
      }
    ];
    
    // Create missing webhooks
    for (const webhook of requiredWebhooks) {
      const exists = existingWebhooks.some(existing => 
        existing.topic === webhook.topic && existing.address === webhook.address
      );
      
      if (!exists) {
        console.log(`🔄 Creating webhook: ${webhook.topic} -> ${webhook.address}`);
        try {
          const result = await client.createWebhook(webhook.topic, webhook.address, webhook.format);
          console.log(`✅ Created webhook: ${webhook.topic}`, result.id);
        } catch (error) {
          console.error(`❌ Failed to create webhook ${webhook.topic}:`, error.message);
        }
      } else {
        console.log(`✅ Webhook already exists: ${webhook.topic}`);
      }
    }
    
    // List final webhooks
    console.log('\n🔍 Final webhook configuration:');
    const finalWebhooks = await client.getWebhooks();
    console.log(JSON.stringify(finalWebhooks, null, 2));
    
  } catch (error) {
    console.error('❌ Error setting up webhooks:', error);
  }
}

// Run if called directly
if (require.main === module) {
  setupWebhooks();
}

module.exports = { setupWebhooks }; 