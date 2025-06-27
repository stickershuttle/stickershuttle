const { createClient } = require('@supabase/supabase-js');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

class ShopifyMigration {
  constructor() {
    this.processedOrders = 0;
    this.processedCustomers = 0;
    this.errors = [];
    this.duplicateOrders = 0;
    this.skippedUserCreation = 0;
  }

  // Status mapping functions
  mapFinancialStatus(shopifyStatus) {
    const statusMap = {
      'paid': 'paid',
      'partially_paid': 'partially_paid',
      'pending': 'pending',
      'partially_refunded': 'partially_refunded',
      'refunded': 'refunded',
      'voided': 'voided',
      'authorized': 'pending'
    };
    return statusMap[shopifyStatus?.toLowerCase()] || 'pending';
  }

  mapFulfillmentStatus(shopifyStatus) {
    const statusMap = {
      'fulfilled': 'fulfilled',
      'partial': 'partially_fulfilled',
      'unfulfilled': 'unfulfilled',
      'shipped': 'shipped',
      'delivered': 'delivered',
      'in_transit': 'shipped',
      'out_for_delivery': 'shipped'
    };
    return statusMap[shopifyStatus?.toLowerCase()] || 'unfulfilled';
  }

  mapOrderStatus(fulfillmentStatus, financialStatus) {
    if (financialStatus === 'refunded') return 'Cancelled';
    if (fulfillmentStatus === 'delivered') return 'Completed';
    if (fulfillmentStatus === 'shipped' || fulfillmentStatus === 'fulfilled') return 'Shipped';
    if (financialStatus === 'paid') return 'Processing';
    return 'Pending Payment';
  }

  // Smart product category mapping based on product name
  mapProductCategory(productName) {
    if (!productName) return 'vinyl-stickers';
    
    const name = productName.toLowerCase();
    
    // Check for specific product types
    if (name.includes('holo') || name.includes('holographic')) return 'holographic-stickers';
    if (name.includes('glitter')) return 'glitter-stickers';
    if (name.includes('chrome') || name.includes('metallic')) return 'chrome-stickers';
    if (name.includes('clear') || name.includes('transparent')) return 'clear-stickers';
    if (name.includes('banner')) return 'vinyl-banners';
    if (name.includes('sheet') || name.includes('sticker sheet')) return 'sticker-sheets';
    
    // Default mappings for common terms
    if (name.includes('vinyl') || name.includes('sticker') || name.includes('custom')) return 'vinyl-stickers';
    
    // If nothing matches, default to vinyl stickers
    return 'vinyl-stickers';
  }

  // Get display name for product category
  getProductDisplayName(category) {
    const displayNames = {
      'vinyl-stickers': 'Vinyl Stickers',
      'holographic-stickers': 'Holographic Stickers',
      'glitter-stickers': 'Glitter Stickers',
      'chrome-stickers': 'Chrome Stickers',
      'clear-stickers': 'Clear Stickers',
      'vinyl-banners': 'Vinyl Banners',
      'sticker-sheets': 'Sticker Sheets'
    };
    return displayNames[category] || 'Custom Product';
  }

  // Create user profile in user_profiles table (WITHOUT creating auth user)
  async createUserProfile(email, firstName, lastName) {
    try {
      // Check if profile already exists by email
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (existingProfile) {
        console.log(`👤 Profile exists for ${email}`);
        return existingProfile.id;
      }

      // Create user profile without auth user
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .insert({
          email: email,
          first_name: firstName,
          last_name: lastName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Created profile for ${email}`);
      this.processedCustomers++;
      return profile.id;

    } catch (error) {
      console.error(`❌ Error creating profile for ${email}:`, error);
      throw error;
    }
  }

  // Generate order number in SS-XXXXX format
  generateOrderNumber(orderIndex) {
    return `SS-${String(orderIndex).padStart(5, '0')}`;
  }

  // Generate basic order tags for migrated orders
  generateOrderTags(itemCount, productCategories) {
    const tags = ['migrated-order', 'shopify-import', `items-${itemCount}`];
    
    // Add unique product categories as tags
    const uniqueCategories = [...new Set(productCategories)];
    tags.push(...uniqueCategories);
    
    return tags;
  }

  // Create simplified calculator selections for migrated orders
  createSimplifiedCalculatorSelections(productCategory) {
    return {
      _migrated: {
        type: 'migration',
        value: true,
        displayValue: 'Migrated from Shopify',
        note: 'Original product details unavailable'
      },
      category: {
        type: 'category',
        value: productCategory,
        displayValue: this.getProductDisplayName(productCategory)
      }
    };
  }

  // Process grouped order data (handles multiple items per order)
  async processGroupedOrder(orderGroup, orderIndex) {
    try {
      // Get the first row for common order data
      const firstRow = orderGroup[0];
      const customerEmail = firstRow.customer_email?.toLowerCase();
      
      if (!customerEmail) {
        throw new Error('No customer email provided');
      }

      // Create user profile (NOT auth user)
      const profileId = await this.createUserProfile(
        customerEmail,
        firstRow.customer_first_name,
        firstRow.customer_last_name
      );

      // Check for duplicate orders by order number
      const shopifyOrderNumber = firstRow.shopify_order_number || firstRow.order_id;
      if (shopifyOrderNumber) {
        const { data: existingOrder } = await supabase
          .from('orders_main')
          .select('id')
          .eq('shopify_order_id', shopifyOrderNumber)
          .single();

        if (existingOrder) {
          console.log(`⚠️ Duplicate order found: Shopify #${shopifyOrderNumber}`);
          this.duplicateOrders++;
          return;
        }
      }

      // Generate order number
      const orderNumber = this.generateOrderNumber(orderIndex);

      // Prepare addresses (simplified)
      const shippingAddress = {
        first_name: firstRow.shipping_first_name || firstRow.customer_first_name,
        last_name: firstRow.shipping_last_name || firstRow.customer_last_name,
        company: firstRow.shipping_company,
        address1: firstRow.shipping_address1,
        address2: firstRow.shipping_address2,
        city: firstRow.shipping_city,
        province: firstRow.shipping_province,
        country: firstRow.shipping_country || 'US',
        zip: firstRow.shipping_zip,
        phone: firstRow.shipping_phone || firstRow.customer_phone
      };

      const billingAddress = {
        first_name: firstRow.billing_first_name || firstRow.customer_first_name,
        last_name: firstRow.billing_last_name || firstRow.customer_last_name,
        company: firstRow.billing_company,
        address1: firstRow.billing_address1 || firstRow.shipping_address1,
        address2: firstRow.billing_address2 || firstRow.shipping_address2,
        city: firstRow.billing_city || firstRow.shipping_city,
        province: firstRow.billing_province || firstRow.shipping_province,
        country: firstRow.billing_country || firstRow.shipping_country || 'US',
        zip: firstRow.billing_zip || firstRow.shipping_zip,
        phone: firstRow.billing_phone || firstRow.customer_phone
      };

      // Map statuses
      const financialStatus = this.mapFinancialStatus(firstRow.financial_status);
      const fulfillmentStatus = this.mapFulfillmentStatus(firstRow.fulfillment_status);
      const orderStatus = this.mapOrderStatus(fulfillmentStatus, financialStatus);
      
      // Set proof status based on order state
      let proofStatus = null;
      if (fulfillmentStatus === 'delivered' || fulfillmentStatus === 'fulfilled') {
        proofStatus = 'delivered';
      } else if (fulfillmentStatus === 'shipped') {
        proofStatus = 'approved';
      }
      
      // Collect all product categories for tags
      const productCategories = [];
      
      // Process items to get categories
      const items = [];
      orderGroup.forEach((row, itemIndex) => {
        // Extract item data from each row
        let productName = null;
        let quantity = 1;
        let unitPrice = 0;
        let totalPrice = 0;
        
        // Try multiple column formats
        const index = itemIndex + 1;
        productName = row[`item_${index}_product_name`] || 
                     row[`lineitem_name_${index}`] ||
                     row[`lineitem_${index}_name`] ||
                     row.product_name ||
                     row.lineitem_name ||
                     'Migrated Product';
        
        quantity = parseInt(row[`item_${index}_quantity`] || 
                           row[`lineitem_quantity_${index}`] ||
                           row[`lineitem_${index}_quantity`] ||
                           row.quantity ||
                           row.lineitem_quantity) || 1;
        
        unitPrice = parseFloat(row[`item_${index}_unit_price`] || 
                              row[`lineitem_price_${index}`] ||
                              row[`lineitem_${index}_price`] ||
                              row.unit_price ||
                              row.lineitem_price) || 0;
        
        totalPrice = parseFloat(row[`item_${index}_total_price`] || 
                               row[`lineitem_total_${index}`] ||
                               row[`lineitem_${index}_total`] ||
                               row.total_price ||
                               row.lineitem_total) || (unitPrice * quantity);

        // Determine product category
        const category = this.mapProductCategory(productName);
        productCategories.push(category);
        
        items.push({
          productName,
          quantity,
          unitPrice,
          totalPrice,
          category
        });
      });
      
      // Generate order tags
      const orderTags = this.generateOrderTags(items.length, productCategories);

      console.log(`🏷️ Generated tags for order ${orderNumber}:`, orderTags);
      console.log(`📋 Order status: ${orderStatus}, Proof status: ${proofStatus}`);
      console.log(`📦 Processing ${items.length} items from Shopify order #${shopifyOrderNumber}`);

      // Insert order
      const { data: order, error: orderError } = await supabase
        .from('orders_main')
        .insert({
          user_id: null, // No auth user for migrated orders
          customer_email: customerEmail,
          order_number: orderNumber,
          order_status: orderStatus,
          fulfillment_status: fulfillmentStatus,
          financial_status: financialStatus,
          subtotal_price: parseFloat(firstRow.subtotal_price) || 0,
          total_tax: parseFloat(firstRow.total_tax) || 0,
          total_price: parseFloat(firstRow.total_price) || 0,
          currency: firstRow.currency || 'USD',
          customer_first_name: firstRow.customer_first_name,
          customer_last_name: firstRow.customer_last_name,
          customer_phone: firstRow.customer_phone,
          shipping_address: shippingAddress,
          billing_address: billingAddress,
          order_note: firstRow.order_note,
          order_created_at: firstRow.order_date,
          tracking_number: firstRow.tracking_number || null,
          tracking_company: firstRow.tracking_company || null,
          tracking_url: firstRow.tracking_url || null,
          discount_code: firstRow.discount_code,
          discount_amount: parseFloat(firstRow.discount_amount) || 0,
          // Proof workflow fields
          proof_status: proofStatus,
          proof_sent_at: null,
          // Order tags
          order_tags: orderTags,
          // Always store Shopify reference
          shopify_order_id: shopifyOrderNumber || `shopify-${orderIndex}`
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      for (const item of items) {
        const calculatorSelections = this.createSimplifiedCalculatorSelections(item.category);

        // Insert order item
        const { error: itemError } = await supabase
          .from('order_items_new')
          .insert({
            order_id: order.id,
            product_id: item.category,
            product_name: item.productName,
            product_category: item.category,
            sku: `MIGRATED-${item.category.toUpperCase()}`,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice,
            calculator_selections: calculatorSelections,
            custom_files: [],
            customer_notes: 'This order was migrated from Shopify. Original product details are not available.'
          });

        if (itemError) {
          console.error(`❌ Error inserting item:`, itemError);
          throw itemError;
        }
      }

      console.log(`✅ Migrated order ${orderNumber} for ${customerEmail} with ${items.length} items`);
      this.processedOrders++;

    } catch (error) {
      console.error(`❌ Error processing order group:`, error);
      this.errors.push({
        orderData: orderGroup[0],
        error: error.message
      });
    }
  }

  // Main migration function
  async migrate(csvFilePath) {
    console.log('🚀 Starting Shopify migration (Profile-only mode)...');
    console.log('📧 Note: No signup emails will be sent');
    console.log('🏷️ All orders will be tagged as Shopify imports');
    
    const allRows = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => {
          allRows.push(data);
        })
        .on('end', async () => {
          console.log(`📊 Found ${allRows.length} rows in CSV`);
          
          // Group rows by order number
          const orderGroups = {};
          
          allRows.forEach(row => {
            const orderKey = row.shopify_order_number || row.order_id || row.order_number;
            if (orderKey) {
              if (!orderGroups[orderKey]) {
                orderGroups[orderKey] = [];
              }
              orderGroups[orderKey].push(row);
            } else {
              // If no order number, treat as individual order
              const uniqueKey = `single_${Object.keys(orderGroups).length}`;
              orderGroups[uniqueKey] = [row];
            }
          });
          
          const uniqueOrders = Object.values(orderGroups);
          console.log(`📦 Grouped into ${uniqueOrders.length} unique orders`);
          
          // Process orders in batches
          const batchSize = 10;
          for (let i = 0; i < uniqueOrders.length; i += batchSize) {
            const batch = uniqueOrders.slice(i, i + batchSize);
            const batchPromises = batch.map((orderGroup, index) => 
              this.processGroupedOrder(orderGroup, i + index + 1)
            );
            
            await Promise.all(batchPromises);
            console.log(`📦 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uniqueOrders.length / batchSize)}`);
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          console.log('\n🎉 Migration completed!');
          console.log(`✅ Successfully migrated: ${this.processedOrders} orders`);
          console.log(`👤 User profiles created: ${this.processedCustomers}`);
          console.log(`⚠️ Duplicate orders skipped: ${this.duplicateOrders}`);
          console.log(`❌ Errors encountered: ${this.errors.length}`);
          
          if (this.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.errors.forEach((error, index) => {
              console.log(`${index + 1}. ${error.error}`);
            });
          }
          
          resolve();
        })
        .on('error', reject);
    });
  }
}

// Run migration if called directly
if (require.main === module) {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('❌ Please provide CSV file path');
    console.log('Usage: node shopify-migration.js path/to/your/file.csv');
    process.exit(1);
  }

  const migration = new ShopifyMigration();
  migration.migrate(csvPath)
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = ShopifyMigration; 