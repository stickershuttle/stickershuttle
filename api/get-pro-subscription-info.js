// Helper script to get Stripe subscription information for jayfowler@outlook.com
// This will help you fill in the SQL migration script values

require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function getProSubscriptionInfo() {
  try {
    const email = 'jayfowler@outlook.com';
    console.log(`\n🔍 Looking up Stripe data for: ${email}\n`);
    
    // Search for customer
    console.log('Searching for customer...');
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });
    
    if (customers.data.length === 0) {
      console.log(`❌ No Stripe customer found for ${email}`);
      return;
    }
    
    const customer = customers.data[0];
    console.log(`✅ Found customer: ${customer.id}\n`);
    
    // Get subscriptions
    console.log('Getting subscriptions...');
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10
    });
    
    if (subscriptions.data.length === 0) {
      console.log(`❌ No subscriptions found for customer ${customer.id}`);
      return;
    }
    
    console.log(`\n✅ Found ${subscriptions.data.length} subscription(s)\n`);
    
    // Get the most recent subscription
    const subscription = subscriptions.data[0];
    
    // Get subscription interval
    const interval = subscription.items.data[0].price.recurring.interval;
    const plan = interval === 'month' ? 'monthly' : 'annual';
    
    // Convert timestamps to SQL-friendly format
    const periodStart = new Date(subscription.current_period_start * 1000);
    const periodEnd = new Date(subscription.current_period_end * 1000);
    const subscriptionStart = new Date(subscription.created * 1000);
    
    console.log('========================================');
    console.log('STRIPE SUBSCRIPTION INFORMATION');
    console.log('========================================\n');
    
    console.log('Customer Information:');
    console.log(`  Customer ID: ${customer.id}`);
    console.log(`  Email: ${customer.email}`);
    console.log(`  Name: ${customer.name || 'N/A'}`);
    console.log(`  Metadata userId: ${customer.metadata?.userId || 'N/A'}`);
    console.log(`  Metadata uploadedFileUrl: ${customer.metadata?.uploadedFileUrl || 'N/A'}`);
    console.log('');
    
    console.log('Subscription Information:');
    console.log(`  Subscription ID: ${subscription.id}`);
    console.log(`  Status: ${subscription.status}`);
    console.log(`  Plan: ${plan} (${interval}ly)`);
    console.log(`  Created: ${subscriptionStart.toISOString()}`);
    console.log(`  Current Period Start: ${periodStart.toISOString()}`);
    console.log(`  Current Period End: ${periodEnd.toISOString()}`);
    console.log('');
    
    // Try to get checkout session if available
    if (subscription.metadata?.checkout_session_id) {
      console.log('Checkout Session Information:');
      try {
        const session = await stripe.checkout.sessions.retrieve(subscription.metadata.checkout_session_id);
        console.log(`  Session ID: ${session.id}`);
        
        if (session.shipping_details) {
          console.log(`  Shipping Name: ${session.shipping_details.name}`);
          console.log(`  Shipping Address: ${JSON.stringify(session.shipping_details.address, null, 2)}`);
        }
      } catch (err) {
        console.log(`  Could not retrieve checkout session: ${err.message}`);
      }
      console.log('');
    }
    
    console.log('========================================');
    console.log('SQL MIGRATION VALUES');
    console.log('========================================\n');
    
    console.log('Copy these values into the SQL script:\n');
    console.log(`v_stripe_customer_id TEXT := '${customer.id}';`);
    console.log(`v_stripe_subscription_id TEXT := '${subscription.id}';`);
    console.log(`v_plan TEXT := '${plan}';`);
    console.log(`v_period_start TIMESTAMPTZ := '${periodStart.toISOString()}';`);
    console.log(`v_period_end TIMESTAMPTZ := '${periodEnd.toISOString()}';`);
    
    if (customer.metadata?.uploadedFileUrl) {
      console.log(`v_uploaded_file_url TEXT := '${customer.metadata.uploadedFileUrl}';`);
    } else {
      console.log(`v_uploaded_file_url TEXT := NULL; -- No uploaded file found`);
    }
    
    // Try to construct shipping address JSONB
    if (subscription.metadata?.checkout_session_id) {
      try {
        const session = await stripe.checkout.sessions.retrieve(subscription.metadata.checkout_session_id);
        if (session.shipping_details?.address) {
          const addr = session.shipping_details.address;
          const name = session.shipping_details.name || customer.name || '';
          const nameParts = name.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          const shippingAddress = {
            first_name: firstName,
            last_name: lastName,
            address1: addr.line1 || '',
            address2: addr.line2 || '',
            city: addr.city || '',
            state: addr.state || '',
            zip: addr.postal_code || '',
            country: addr.country || 'US',
            phone: session.customer_details?.phone || customer.phone || ''
          };
          
          console.log(`v_shipping_address JSONB := '${JSON.stringify(shippingAddress)}'::jsonb;`);
        }
      } catch (err) {
        console.log(`v_shipping_address JSONB := NULL; -- Could not retrieve shipping address`);
      }
    } else {
      console.log(`v_shipping_address JSONB := NULL; -- No checkout session available`);
    }
    
    console.log('\n========================================\n');
    
    console.log('✅ Done! Copy the values above into the SQL script and run it in Supabase.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

// Run the script
getProSubscriptionInfo();

