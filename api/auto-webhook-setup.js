const shopifyClient = require('./shopify-client');

async function setupAutomaticWebhooks() {
  try {
    console.log('🚀 Setting up automatic webhook system...');
    
    const client = new shopifyClient();
    
    // Check existing webhooks
    console.log('🔍 Checking existing webhooks...');
    const existingWebhooks = await client.getWebhooks();
    console.log(`📊 Found ${existingWebhooks.length} existing webhooks`);
    
    // Production webhook URL (Railway)
    const productionUrl = 'https://stickershuttle-production.up.railway.app';
    
    // Define required webhooks for automatic processing
    const requiredWebhooks = [
      {
        topic: 'orders/create',
        address: `${productionUrl}/webhooks/orders-create`,
        format: 'json'
      },
      {
        topic: 'orders/updated', 
        address: `${productionUrl}/webhooks/orders-updated`,
        format: 'json'
      },
      {
        topic: 'orders/paid',
        address: `${productionUrl}/webhooks/orders-paid`,
        format: 'json'
      },
      {
        topic: 'orders/cancelled',
        address: `${productionUrl}/webhooks/orders-cancelled`, 
        format: 'json'
      },
      {
        topic: 'orders/fulfilled',
        address: `${productionUrl}/webhooks/orders-fulfilled`,
        format: 'json'
      },
      // CRITICAL: This webhook fires when draft orders are completed (paid)
      {
        topic: 'draft_orders/update',
        address: `${productionUrl}/webhooks/draft-orders-update`,
        format: 'json'
      }
    ];
    
    let createdCount = 0;
    let updatedCount = 0;
    
    // Process each required webhook
    for (const webhook of requiredWebhooks) {
      const existing = existingWebhooks.find(w => w.topic === webhook.topic);
      
      if (existing) {
        // Update if URL is different
        if (existing.address !== webhook.address) {
          console.log(`🔄 Updating webhook: ${webhook.topic}`);
          try {
            await client.deleteWebhook(existing.id);
            const result = await client.createWebhook(webhook.topic, webhook.address, webhook.format);
            console.log(`✅ Updated webhook: ${webhook.topic} -> ${webhook.address}`);
            updatedCount++;
          } catch (error) {
            console.error(`❌ Failed to update webhook ${webhook.topic}:`, error.message);
          }
        } else {
          console.log(`✅ Webhook OK: ${webhook.topic}`);
        }
      } else {
        // Create new webhook
        console.log(`🆕 Creating webhook: ${webhook.topic} -> ${webhook.address}`);
        try {
          const result = await client.createWebhook(webhook.topic, webhook.address, webhook.format);
          console.log(`✅ Created webhook: ${webhook.topic} (ID: ${result.id})`);
          createdCount++;
        } catch (error) {
          console.error(`❌ Failed to create webhook ${webhook.topic}:`, error.message);
        }
      }
    }
    
    // Final webhook list
    console.log('\n🎉 Webhook setup complete!');
    console.log(`📊 Created: ${createdCount}, Updated: ${updatedCount}`);
    
    const finalWebhooks = await client.getWebhooks();
    console.log('\n📋 Active webhooks:');
    finalWebhooks.forEach(webhook => {
      console.log(`  • ${webhook.topic} -> ${webhook.address}`);
    });
    
    return { success: true, created: createdCount, updated: updatedCount };
    
  } catch (error) {
    console.error('❌ Error setting up automatic webhooks:', error);
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  setupAutomaticWebhooks();
}

module.exports = { setupAutomaticWebhooks }; 