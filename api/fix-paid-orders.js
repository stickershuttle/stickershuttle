const shopifyClient = require('./shopify-client');
const supabaseClient = require('./supabase-client');

async function fixPaidOrders() {
  try {
    console.log('🔍 Starting paid orders fix...');
    
    const client = new shopifyClient();
    const supabase = supabaseClient.getServiceClient();
    
    // Get all orders from Shopify (not draft orders)
    console.log('📋 Fetching all orders from Shopify...');
    const shopifyOrders = await client.getAllOrders({ limit: 250, status: 'any' });
    console.log(`📊 Found ${shopifyOrders.length} orders in Shopify`);
    
    // Get all draft orders that are awaiting payment from Supabase
    console.log('📋 Fetching draft orders from Supabase...');
    const { data: supabaseOrders, error } = await supabase
      .from('customer_orders')
      .select('*')
      .eq('order_status', 'Awaiting Payment')
      .eq('financial_status', 'pending');
    
    if (error) {
      console.error('❌ Error fetching Supabase orders:', error);
      return;
    }
    
    console.log(`📊 Found ${supabaseOrders.length} draft orders in Supabase`);
    
    let fixedCount = 0;
    let createdCount = 0;
    
    // Check each Shopify order against Supabase records
    for (const shopifyOrder of shopifyOrders) {
      try {
        if (shopifyOrder.financial_status !== 'paid') {
          continue; // Skip non-paid orders
        }
        
        console.log(`\n🔍 Checking paid order: ${shopifyOrder.name} (ID: ${shopifyOrder.id})`);
        
        // Look for existing draft order that matches this paid order
        const matchingDraft = supabaseOrders.find(draft => {
          // Try to match by customer email and similar details
          const sameEmail = draft.customer_email === shopifyOrder.customer?.email;
          const similarTotal = Math.abs(parseFloat(draft.total_price) - parseFloat(shopifyOrder.total_price)) < 0.01;
          
          return sameEmail && similarTotal;
        });
        
        if (matchingDraft) {
          // Update the draft order to be the paid order
          console.log(`🔄 Updating draft order ${matchingDraft.shopify_order_number} -> ${shopifyOrder.name}`);
          
          const { error: updateError } = await supabase
            .from('customer_orders')
            .update({
              shopify_order_id: shopifyOrder.id.toString(),
              shopify_order_number: shopifyOrder.name,
              order_status: 'Creating Proofs',
              financial_status: 'paid',
              fulfillment_status: shopifyOrder.fulfillment_status || 'unfulfilled',
              subtotal_price: parseFloat(shopifyOrder.subtotal_price),
              total_tax: parseFloat(shopifyOrder.total_tax || '0'),
              total_price: parseFloat(shopifyOrder.total_price),
              shipping_address: shopifyOrder.shipping_address,
              billing_address: shopifyOrder.billing_address,
              order_updated_at: shopifyOrder.updated_at || new Date().toISOString()
            })
            .eq('id', matchingDraft.id);
          
          if (updateError) {
            console.error(`❌ Error updating order ${matchingDraft.id}:`, updateError);
          } else {
            console.log(`✅ Successfully updated order: ${matchingDraft.shopify_order_number} -> ${shopifyOrder.name}`);
            fixedCount++;
          }
        } else {
          // Check if this paid order already exists in Supabase
          const { data: existingPaid } = await supabase
            .from('customer_orders')
            .select('id')
            .eq('shopify_order_id', shopifyOrder.id.toString())
            .single();
          
          if (!existingPaid) {
            // Create new paid order record
            console.log(`🆕 Creating new paid order record: ${shopifyOrder.name}`);
            
            const orderData = {
              user_id: null,
              guest_email: shopifyOrder.customer?.email || shopifyOrder.email,
              shopify_order_id: shopifyOrder.id.toString(),
              shopify_order_number: shopifyOrder.name,
              order_status: 'Creating Proofs',
              fulfillment_status: shopifyOrder.fulfillment_status || 'unfulfilled',
              financial_status: 'paid',
              subtotal_price: parseFloat(shopifyOrder.subtotal_price),
              total_tax: parseFloat(shopifyOrder.total_tax || '0'),
              total_price: parseFloat(shopifyOrder.total_price),
              currency: shopifyOrder.currency,
              customer_first_name: shopifyOrder.customer?.first_name,
              customer_last_name: shopifyOrder.customer?.last_name,
              customer_email: shopifyOrder.customer?.email || shopifyOrder.email,
              customer_phone: shopifyOrder.customer?.phone,
              shipping_address: shopifyOrder.shipping_address,
              billing_address: shopifyOrder.billing_address,
              order_tags: shopifyOrder.tags ? shopifyOrder.tags.split(', ') : [],
              order_note: shopifyOrder.note,
              order_created_at: shopifyOrder.created_at,
              order_updated_at: shopifyOrder.updated_at
            };
            
            const { data: newOrder, error: insertError } = await supabase
              .from('customer_orders')
              .insert([orderData])
              .select()
              .single();
            
            if (insertError) {
              console.error(`❌ Error creating order ${shopifyOrder.name}:`, insertError);
            } else {
              console.log(`✅ Created paid order: ${shopifyOrder.name}`);
              createdCount++;
              
              // Create order items
              if (shopifyOrder.line_items && shopifyOrder.line_items.length > 0) {
                const orderItems = shopifyOrder.line_items.map(item => ({
                  customer_order_id: newOrder.id,
                  product_name: item.title,
                  sku: item.sku || 'N/A',
                  quantity: item.quantity,
                  unit_price: parseFloat(item.price),
                  total_price: parseFloat(item.price) * item.quantity,
                  calculator_selections: {},
                  custom_files: [],
                  customer_notes: item.name !== item.title ? item.name : null
                }));
                
                const { error: itemsError } = await supabase
                  .from('customer_order_items')
                  .insert(orderItems);
                
                if (itemsError) {
                  console.error(`❌ Error creating order items for ${shopifyOrder.name}:`, itemsError);
                } else {
                  console.log(`✅ Created ${orderItems.length} order items for ${shopifyOrder.name}`);
                }
              }
            }
          } else {
            console.log(`✅ Paid order already exists: ${shopifyOrder.name}`);
          }
        }
      } catch (orderError) {
        console.error(`❌ Error processing order ${shopifyOrder.name}:`, orderError);
      }
    }
    
    console.log(`\n🎉 Fix completed!`);
    console.log(`📊 Updated draft orders: ${fixedCount}`);
    console.log(`📊 Created new paid orders: ${createdCount}`);
    
  } catch (error) {
    console.error('❌ Error in fixPaidOrders:', error);
  }
}

// Run if called directly
if (require.main === module) {
  fixPaidOrders();
}

module.exports = { fixPaidOrders }; 