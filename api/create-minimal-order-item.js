// Create minimal order item for the existing Pro order
const supabaseClient = require('./supabase-client');

async function createMinimalOrderItem() {
  console.log('🧪 Creating minimal order item...');
  
  try {
    const supabase = supabaseClient.getServiceClient();
    
    // Get the most recent Pro order
    const { data: orders, error: orderError } = await supabase
      .from('orders_main')
      .select('id, order_number')
      .contains('order_tags', ['pro-monthly-stickers'])
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (orderError || !orders || orders.length === 0) {
      console.log('❌ No Pro orders found');
      return;
    }
    
    const order = orders[0];
    console.log(`✅ Found Pro order: ${order.order_number}`);
    
    // Try creating a very minimal order item
    const { data: item, error: itemError } = await supabase
      .from('order_items')
      .insert([{
        customer_order_id: order.id,
        product_name: 'Pro Monthly Stickers',
        quantity: 100,
        unit_price: 0.00,
        total_price: 0.00
      }])
      .select();
    
    if (itemError) {
      console.log('❌ Error creating minimal item:', itemError);
      
      // Let's try even more minimal
      const { data: item2, error: itemError2 } = await supabase
        .from('order_items')
        .insert([{
          customer_order_id: order.id,
          product_name: 'Pro Monthly Stickers',
          quantity: 100
        }])
        .select();
      
      if (itemError2) {
        console.log('❌ Error creating super minimal item:', itemError2);
      } else {
        console.log('✅ Super minimal item created:', item2);
      }
      
    } else {
      console.log('✅ Minimal item created:', item);
    }
    
    console.log('\n🎯 Check your admin panel now:');
    console.log('1. Go to /admin/orders');
    console.log('2. Look for Pro orders');
    console.log(`3. Order number: ${order.order_number}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createMinimalOrderItem();
