require('dotenv').config({ path: '../.env.local' });
require('dotenv').config({ path: './.env' });
require('dotenv').config();

const express = require('express');
const ShopifyClient = require('./shopify-client');

// Create a local webhook simulator
const app = express();
app.use(express.json());

async function simulateOrderPaidWebhook(orderNumber) {
  console.log(`🧪 Simulating orders/paid webhook for order: ${orderNumber}`);
  
  try {
    const shopify = new ShopifyClient();
    
    // Get the order from Shopify
    const orders = await shopify.getAllOrders({ limit: 50 });
    const order = orders.find(o => o.name === orderNumber || o.id.toString() === orderNumber);
    
    if (!order) {
      console.error(`❌ Order ${orderNumber} not found`);
      return;
    }
    
    console.log(`📦 Found order: ${order.name} (ID: ${order.id})`);
    console.log(`   💰 Status: ${order.financial_status}/${order.fulfillment_status}`);
    console.log(`   💎 Total: ${order.currency} ${order.total_price}`);
    
    // Simulate the webhook POST request to our local server
    const webhookData = JSON.stringify(order);
    
    console.log('🔗 Sending simulated webhook to local server...');
    
    // Make request to local webhook handler
    const response = await fetch('http://localhost:4000/webhooks/orders-paid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Topic': 'orders/paid',
        'X-Shopify-Shop-Domain': 'sticker-shuttle-dev.myshopify.com'
      },
      body: webhookData
    });
    
    if (response.ok) {
      console.log('✅ Webhook simulation successful!');
      console.log('📊 Check your dashboard - the order should now appear');
    } else {
      console.error('❌ Webhook simulation failed:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.error('❌ Error simulating webhook:', error.message);
  }
}

// CLI interface
const orderArg = process.argv[2];

if (!orderArg) {
  console.log('🧪 Local Webhook Simulator for Development');
  console.log('');
  console.log('Usage: node local-webhook-simulator.js <order-number>');
  console.log('Example: node local-webhook-simulator.js #1018');
  console.log('Example: node local-webhook-simulator.js 6352838525181');
  console.log('');
  console.log('This simulates Shopify sending an orders/paid webhook to your local server.');
  console.log('Make sure your local server is running on port 4000 first!');
  process.exit(1);
}

simulateOrderPaidWebhook(orderArg).then(() => {
  console.log('🏁 Webhook simulation complete');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Webhook simulation failed:', error);
  process.exit(1);
}); 