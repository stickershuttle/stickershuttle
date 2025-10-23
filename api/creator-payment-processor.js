const supabaseClient = require('./supabase-client');
const stripeConnectClient = require('./stripe-connect-client');

class CreatorPaymentProcessor {
  constructor() {
    this.defaultCommissionRate = 0.15; // 15% platform commission (fallback)
  }

  // Calculate costs using the same structure as CreatorView with size support
  calculateCosts(quantity, totalRevenue, size = '4"') {
    let materialShippingCost;
    let fulfillmentCost;

    // Size-based sticker costs
    const stickerCostPerUnit = {
      '3"': 0.35, // Lower cost for smaller stickers
      '4"': 0.40, // Standard cost
      '5"': 0.45  // Higher cost for larger stickers
    };
    
    const costPerSticker = stickerCostPerUnit[size] || stickerCostPerUnit['4"'];
    let stickerCost = quantity * costPerSticker;

    if (quantity === 1) {
      materialShippingCost = 1.35;
      fulfillmentCost = 0.25;
    } else if (quantity <= 5) {
      materialShippingCost = 1.46;
      fulfillmentCost = 0.26;
    } else if (quantity <= 10) {
      materialShippingCost = 1.61;
      fulfillmentCost = 0.27;
    } else if (quantity <= 25) {
      materialShippingCost = 5.45; // upgrades to tracking
      fulfillmentCost = 0.30;
    } else {
      // For larger quantities, use the 25+ tier costs
      materialShippingCost = 5.45;
      fulfillmentCost = 0.30;
    }

    // Calculate Stripe processing fee: 2.9% + $0.30
    const stripeFee = totalRevenue > 0 ? (totalRevenue * 0.029) + 0.30 : 0;

    const totalCosts = materialShippingCost + stickerCost + fulfillmentCost + stripeFee;
    return {
      materialShippingCost,
      stickerCost,
      fulfillmentCost,
      stripeFee,
      totalCosts,
      costPerSticker,
      size
    };
  }

  // Process creator payments for an order
  async processCreatorPayments(orderId, paymentIntentId) {
    try {
      console.log('💰 Processing creator payments for order:', orderId);
      
      if (!supabaseClient.isReady()) {
        throw new Error('Supabase not ready for creator payment processing');
      }

      const client = supabaseClient.getServiceClient();
      
      // Get order details
      const { data: order, error: orderError } = await client
        .from('orders_main')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        throw new Error(`Order not found: ${orderError?.message}`);
      }

      // Get order items separately to avoid schema cache issues
      const { data: orderItems, error: itemsError } = await client
        .from('order_items_new')
        .select(`
          id,
          product_id,
          product_name,
          quantity,
          unit_price,
          total_price,
          calculator_selections
        `)
        .eq('order_id', orderId);

      if (itemsError) {
        throw new Error(`Failed to fetch order items: ${itemsError.message}`);
      }

      // Add items to order object
      order.order_items = orderItems || [];

      // Filter marketplace products and group by creator
      const creatorEarnings = new Map();
      
      for (const item of order.order_items) {
        // Check if this is a marketplace product
        const { data: marketplaceProduct, error: productError } = await client
          .from('marketplace_products')
          .select(`
            id,
            creator_id,
            creators!inner (
              id,
              creator_name,
              stripe_account_id,
              stripe_account_status,
              commission_rate,
              stripe_charges_enabled,
              stripe_payouts_enabled
            )
          `)
          .eq('id', item.product_id)
          .single();

        if (productError || !marketplaceProduct) {
          // Not a marketplace product, skip
          continue;
        }

        const creator = marketplaceProduct.creators;
        
        // Check if creator has active Stripe Connect account
        if (!creator.stripe_account_id || 
            creator.stripe_account_status !== 'active' || 
            !creator.stripe_charges_enabled || 
            !creator.stripe_payouts_enabled) {
          console.warn(`⚠️ Creator ${creator.creator_name} does not have active Stripe Connect account, skipping payment`);
          continue;
        }

        const creatorId = creator.id;
        const itemTotal = parseFloat(item.total_price);
        const itemQuantity = item.quantity || 1;
        
        if (!creatorEarnings.has(creatorId)) {
          creatorEarnings.set(creatorId, {
            creator,
            totalAmount: 0,
            items: []
          });
        }
        
        const earnings = creatorEarnings.get(creatorId);
        earnings.totalAmount += itemTotal;
        earnings.items.push({
          ...item,
          marketplaceProductId: marketplaceProduct.id,
          quantity: itemQuantity
        });
      }

      // Process payments for each creator
      const results = [];
      for (const [creatorId, earnings] of creatorEarnings) {
        try {
          const result = await this.processCreatorEarning(
            earnings.creator,
            earnings.totalAmount,
            earnings.items,
            orderId,
            paymentIntentId
          );
          results.push(result);
        } catch (error) {
          console.error(`❌ Failed to process payment for creator ${earnings.creator.creator_name}:`, error);
          results.push({
            success: false,
            creatorId,
            error: error.message
          });
        }
      }

      return {
        success: true,
        processedCreators: results.length,
        results
      };

    } catch (error) {
      console.error('❌ Error processing creator payments:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process earning for a single creator
  async processCreatorEarning(creator, totalAmount, items, orderId, paymentIntentId) {
    const client = supabaseClient.getServiceClient();
    
    // Calculate total quantity and average size across all items
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    // For total cost calculation, we'll use a weighted average approach
    // This gives us an overall cost estimate, but individual items will use their specific sizes
    let totalCosts = 0;
    let totalStripeFees = 0;
    
    for (const item of items) {
      const itemQuantity = item.quantity || 1;
      const itemTotal = parseFloat(item.total_price);
      
      // Extract size for this item (same logic as below)
      let itemSize = '4"';
      try {
        if (item.calculator_selections) {
          const selections = typeof item.calculator_selections === 'string' 
            ? JSON.parse(item.calculator_selections) 
            : item.calculator_selections;
          
          if (selections.size) {
            itemSize = selections.size.toString() + '"';
          } else if (selections.selectedSize) {
            itemSize = selections.selectedSize.toString() + '"';
          }
        }
        
        if (item.sku && item.sku.includes('-') && item.sku.includes('"')) {
          const skuParts = item.sku.split('-');
          if (skuParts.length >= 3) {
            const sizePart = skuParts[2];
            if (sizePart.includes('"')) {
              itemSize = sizePart;
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Error extracting size for summary calculation:', error);
        itemSize = '4"';
      }
      
      const itemCosts = this.calculateCosts(itemQuantity, itemTotal, itemSize);
      totalCosts += itemCosts.totalCosts;
      totalStripeFees += itemCosts.stripeFee;
    }
    
    // Creator earnings = Revenue - All Costs
    const creatorEarnings = Math.max(0, totalAmount - totalCosts);
    const platformFee = totalCosts - totalStripeFees; // Platform keeps all costs except Stripe fees
    const stripeFee = totalStripeFees;
    const netEarnings = creatorEarnings; // Already calculated after all costs

    console.log(`💵 Processing earnings for ${creator.creator_name}:`, {
      totalAmount,
      totalQuantity,
      totalCosts,
      platformFee,
      creatorEarnings,
      stripeFee,
      netEarnings
    });

    // Create earnings records for each item
    const earningsRecords = [];
    for (const item of items) {
      const itemTotal = parseFloat(item.total_price);
      const itemQuantity = item.quantity || 1;
      
      // Extract size from calculator selections or default to 4"
      let itemSize = '4"';
      try {
        if (item.calculator_selections) {
          const selections = typeof item.calculator_selections === 'string' 
            ? JSON.parse(item.calculator_selections) 
            : item.calculator_selections;
          
          // Check various possible size fields
          if (selections.size) {
            itemSize = selections.size.toString() + '"';
          } else if (selections.selectedSize) {
            itemSize = selections.selectedSize.toString() + '"';
          }
        }
        
        // Also check if size is encoded in the SKU (format: MP-{id}-{size}")
        if (item.sku && item.sku.includes('-') && item.sku.includes('"')) {
          const skuParts = item.sku.split('-');
          if (skuParts.length >= 3) {
            const sizePart = skuParts[2];
            if (sizePart.includes('"')) {
              itemSize = sizePart;
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Error extracting size from calculator selections:', error);
        // Default to 4" if extraction fails
        itemSize = '4"';
      }
      
      // Calculate costs for this specific item with size
      const itemCosts = this.calculateCosts(itemQuantity, itemTotal, itemSize);
      
      // Calculate proportional earnings for this item
      const itemCreatorEarnings = Math.max(0, itemTotal - itemCosts.totalCosts);
      const itemPlatformFee = itemCosts.totalCosts - itemCosts.stripeFee;
      const itemStripeFee = itemCosts.stripeFee;
      const itemNetEarnings = itemCreatorEarnings;

      console.log(`📏 Item size calculation for ${item.product_name}:`, {
        itemSize,
        itemQuantity,
        itemTotal,
        costPerSticker: itemCosts.costPerSticker,
        totalCosts: itemCosts.totalCosts,
        creatorEarnings: itemCreatorEarnings
      });

      earningsRecords.push({
        creator_id: creator.id,
        order_id: orderId,
        marketplace_product_id: item.marketplaceProductId,
        stripe_payment_intent_id: paymentIntentId,
        gross_amount: itemTotal,
        commission_rate: null, // No longer using commission rate
        platform_fee: itemPlatformFee,
        creator_earnings: itemCreatorEarnings,
        stripe_fee: itemStripeFee,
        net_earnings: itemNetEarnings,
        status: 'pending',
        // Add cost breakdown for transparency
        quantity: itemQuantity,
        material_shipping_cost: itemCosts.materialShippingCost,
        sticker_cost: itemCosts.stickerCost,
        fulfillment_cost: itemCosts.fulfillmentCost,
        size: itemSize // Store the size used for calculation
      });
    }

    // Insert earnings records
    const { data: insertedEarnings, error: insertError } = await client
      .from('creator_earnings')
      .insert(earningsRecords)
      .select('*');

    if (insertError) {
      throw new Error(`Failed to insert earnings records: ${insertError.message}`);
    }

    // Create transfer to creator's Stripe Connect account
    let transfer = null;
    try {
      transfer = await stripeConnectClient.createTransfer(
        netEarnings,
        'usd',
        creator.stripe_account_id,
        {
          creator_id: creator.id,
          creator_name: creator.creator_name,
          order_id: orderId,
          payment_intent_id: paymentIntentId,
          platform_fee: platformFee.toFixed(2),
          creator_earnings: creatorEarnings.toFixed(2)
        }
      );

      // Update earnings records with transfer ID
      const { error: updateError } = await client
        .from('creator_earnings')
        .update({
          stripe_transfer_id: transfer.id,
          status: 'transferred',
          transferred_at: new Date().toISOString()
        })
        .eq('creator_id', creator.id)
        .eq('order_id', orderId);

      if (updateError) {
        console.warn('⚠️ Could not update earnings with transfer ID:', updateError);
      }

    } catch (transferError) {
      console.error(`❌ Failed to create transfer for creator ${creator.creator_name}:`, transferError);
      
      // Update earnings status to failed
      await client
        .from('creator_earnings')
        .update({ status: 'failed' })
        .eq('creator_id', creator.id)
        .eq('order_id', orderId);

      throw transferError;
    }

    return {
      success: true,
      creatorId: creator.id,
      creatorName: creator.creator_name,
      totalAmount,
      platformFee,
      creatorEarnings,
      netEarnings,
      transferId: transfer?.id,
      earningsRecords: insertedEarnings.length
    };
  }

  // Calculate earnings for a creator (without processing payment)
  calculateCreatorEarnings(totalAmount, quantity = 1) {
    const costs = this.calculateCosts(quantity, totalAmount);
    const creatorEarnings = Math.max(0, totalAmount - costs.totalCosts);
    const platformFee = costs.totalCosts - costs.stripeFee;
    const netEarnings = creatorEarnings;

    return {
      totalAmount,
      quantity,
      costs,
      platformFee,
      creatorEarnings,
      stripeFee: costs.stripeFee,
      netEarnings,
      // Include cost breakdown
      materialShippingCost: costs.materialShippingCost,
      stickerCost: costs.stickerCost,
      fulfillmentCost: costs.fulfillmentCost
    };
  }

  // Retry failed creator payments
  async retryFailedPayments(orderId) {
    try {
      console.log('🔄 Retrying failed creator payments for order:', orderId);
      
      const client = supabaseClient.getServiceClient();
      
      // Get failed earnings records
      const { data: failedEarnings, error: fetchError } = await client
        .from('creator_earnings')
        .select(`
          *,
          creators!inner (
            id,
            creator_name,
            stripe_account_id,
            stripe_account_status,
            commission_rate,
            stripe_charges_enabled,
            stripe_payouts_enabled
          )
        `)
        .eq('order_id', orderId)
        .eq('status', 'failed');

      if (fetchError || !failedEarnings?.length) {
        return { success: false, message: 'No failed payments to retry' };
      }

      // Group by creator and retry
      const creatorGroups = new Map();
      failedEarnings.forEach(earning => {
        const creatorId = earning.creator_id;
        if (!creatorGroups.has(creatorId)) {
          creatorGroups.set(creatorId, {
            creator: earning.creators,
            earnings: []
          });
        }
        creatorGroups.get(creatorId).earnings.push(earning);
      });

      const results = [];
      for (const [creatorId, group] of creatorGroups) {
        const totalNetEarnings = group.earnings.reduce((sum, e) => sum + parseFloat(e.net_earnings), 0);
        
        try {
          const transfer = await stripeConnectClient.createTransfer(
            totalNetEarnings,
            'usd',
            group.creator.stripe_account_id,
            {
              creator_id: creatorId,
              creator_name: group.creator.creator_name,
              order_id: orderId,
              retry: 'true'
            }
          );

          // Update earnings records
          const earningIds = group.earnings.map(e => e.id);
          await client
            .from('creator_earnings')
            .update({
              stripe_transfer_id: transfer.id,
              status: 'transferred',
              transferred_at: new Date().toISOString()
            })
            .in('id', earningIds);

          results.push({
            success: true,
            creatorId,
            creatorName: group.creator.creator_name,
            transferId: transfer.id,
            amount: totalNetEarnings
          });

        } catch (error) {
          results.push({
            success: false,
            creatorId,
            creatorName: group.creator.creator_name,
            error: error.message
          });
        }
      }

      return {
        success: true,
        retriedCreators: results.length,
        results
      };

    } catch (error) {
      console.error('❌ Error retrying failed payments:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const creatorPaymentProcessor = new CreatorPaymentProcessor();

module.exports = creatorPaymentProcessor;
