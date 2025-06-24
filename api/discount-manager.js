// Discount Manager Module
// Handles all discount code operations including validation, CRUD, and usage tracking

const supabaseClient = require('./supabase-client');

const discountManager = {
  // Validate a discount code
  async validateCode(code, orderAmount, userId = null, guestEmail = null) {
    try {
      const client = supabaseClient.getServiceClient();
      
      console.log('🏷️ Validating discount code:', code, 'for amount:', orderAmount);
      
      // Call the SQL function for validation
      const { data, error } = await client.rpc('validate_discount_code', {
        p_code: code,
        p_order_amount: orderAmount,
        p_user_id: userId,
        p_guest_email: guestEmail
      });

      if (error) {
        console.error('❌ Error validating discount code:', error);
        return { valid: false, message: 'Error validating discount code' };
      }

      const result = data[0];
      
      return {
        valid: result.is_valid,
        discountCode: result.is_valid ? {
          id: result.discount_id,
          code: code.toUpperCase(),
          discountType: result.discount_type,
          discountValue: result.discount_value
        } : null,
        discountAmount: result.discount_amount || 0,
        message: result.message
      };
    } catch (error) {
      console.error('❌ Error in validateCode:', error);
      return { valid: false, message: 'Error validating discount code' };
    }
  },

  // Record discount usage
  async recordUsage(discountCodeId, orderId, userId, guestEmail, discountAmount) {
    try {
      const client = supabaseClient.getServiceClient();
      
      console.log('📝 Recording discount usage:', {
        discountCodeId,
        orderId,
        userId,
        guestEmail,
        discountAmount
      });
      
      // Record the usage
      const { error: usageError } = await client
        .from('discount_usage')
        .insert({
          discount_code_id: discountCodeId,
          order_id: orderId,
          user_id: userId,
          guest_email: guestEmail,
          discount_amount: discountAmount
        });

      if (usageError) {
        console.error('❌ Error recording discount usage:', usageError);
        return false;
      }

      // Increment usage count using the SQL function
      const { error: incrementError } = await client.rpc('increment_discount_usage', {
        code_id: discountCodeId
      });

      if (incrementError) {
        console.error('❌ Error incrementing usage count:', incrementError);
      }

      console.log('✅ Discount usage recorded successfully');
      return true;
    } catch (error) {
      console.error('❌ Error in recordUsage:', error);
      return false;
    }
  },

  // Get all discount codes (for admin)
  async getAllDiscountCodes() {
    try {
      const client = supabaseClient.getServiceClient();
      
      const { data, error } = await client
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching discount codes:', error);
        throw new Error('Failed to fetch discount codes');
      }

      return data;
    } catch (error) {
      console.error('❌ Error in getAllDiscountCodes:', error);
      throw error;
    }
  },

  // Create a new discount code
  async createDiscountCode(input) {
    try {
      const client = supabaseClient.getServiceClient();
      
      console.log('🎫 Creating new discount code:', input);
      
      const discountData = {
        code: input.code.toUpperCase(),
        description: input.description,
        discount_type: input.discountType,
        discount_value: parseFloat(input.discountValue),
        minimum_order_amount: parseFloat(input.minimumOrderAmount) || 0,
        usage_limit: input.usageLimit ? parseInt(input.usageLimit) : null,
        valid_from: input.validFrom || new Date().toISOString(),
        valid_until: input.validUntil || null,
        active: input.active !== false
      };
      
      const { data, error } = await client
        .from('discount_codes')
        .insert(discountData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating discount code:', error);
        if (error.code === '23505') { // Unique violation
          throw new Error('A discount code with this code already exists');
        }
        throw new Error('Failed to create discount code');
      }

      console.log('✅ Discount code created:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in createDiscountCode:', error);
      throw error;
    }
  },

  // Update an existing discount code
  async updateDiscountCode(id, input) {
    try {
      const client = supabaseClient.getServiceClient();
      
      console.log('📝 Updating discount code:', id, input);
      
      const updateData = {};
      
      // Only include fields that are provided
      if (input.description !== undefined) updateData.description = input.description;
      if (input.discountType !== undefined) updateData.discount_type = input.discountType;
      if (input.discountValue !== undefined) updateData.discount_value = parseFloat(input.discountValue);
      if (input.minimumOrderAmount !== undefined) updateData.minimum_order_amount = parseFloat(input.minimumOrderAmount);
      if (input.usageLimit !== undefined) updateData.usage_limit = input.usageLimit ? parseInt(input.usageLimit) : null;
      if (input.validFrom !== undefined) updateData.valid_from = input.validFrom;
      if (input.validUntil !== undefined) updateData.valid_until = input.validUntil || null;
      if (input.active !== undefined) updateData.active = input.active;
      
      const { data, error } = await client
        .from('discount_codes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating discount code:', error);
        throw new Error('Failed to update discount code');
      }

      console.log('✅ Discount code updated:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in updateDiscountCode:', error);
      throw error;
    }
  },

  // Delete a discount code
  async deleteDiscountCode(id) {
    try {
      const client = supabaseClient.getServiceClient();
      
      console.log('🗑️ Deleting discount code:', id);
      
      const { error } = await client
        .from('discount_codes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting discount code:', error);
        throw new Error('Failed to delete discount code');
      }

      console.log('✅ Discount code deleted');
      return true;
    } catch (error) {
      console.error('❌ Error in deleteDiscountCode:', error);
      throw error;
    }
  },

  // Get discount statistics
  async getDiscountStats(codeId) {
    try {
      const client = supabaseClient.getServiceClient();
      
      console.log('📊 Getting discount statistics for:', codeId);
      
      // Get from the statistics view
      const { data: stats, error: statsError } = await client
        .from('discount_statistics')
        .select('*')
        .eq('id', codeId)
        .single();

      if (statsError) {
        console.error('❌ Error fetching discount statistics:', statsError);
        throw new Error('Failed to fetch discount statistics');
      }

      // Get recent usage
      const { data: recentUsage, error: usageError } = await client
        .from('discount_usage')
        .select(`
          *,
          orders_main(
            order_number,
            total_price,
            customer_email,
            customer_first_name,
            customer_last_name
          )
        `)
        .eq('discount_code_id', codeId)
        .order('used_at', { ascending: false })
        .limit(10);

      if (usageError) {
        console.error('❌ Error fetching recent usage:', usageError);
      }

      return {
        totalUsage: stats.actual_usage_count || 0,
        totalDiscountGiven: parseFloat(stats.total_discount_given) || 0,
        averageOrderValue: parseFloat(stats.average_order_value) || 0,
        recentUsage: recentUsage || []
      };
    } catch (error) {
      console.error('❌ Error in getDiscountStats:', error);
      throw error;
    }
  },

  // Apply discount to order (called during checkout)
  async applyDiscountToOrder(orderId, discountCode, discountAmount) {
    try {
      const client = supabaseClient.getServiceClient();
      
      console.log('💰 Applying discount to order:', { orderId, discountCode, discountAmount });
      
      const { error } = await client
        .from('orders_main')
        .update({
          discount_code: discountCode,
          discount_amount: discountAmount,
          // Update total price to reflect discount
          total_price: client.raw('total_price - ?', [discountAmount])
        })
        .eq('id', orderId);

      if (error) {
        console.error('❌ Error applying discount to order:', error);
        throw new Error('Failed to apply discount to order');
      }

      console.log('✅ Discount applied to order');
      return true;
    } catch (error) {
      console.error('❌ Error in applyDiscountToOrder:', error);
      throw error;
    }
  },

  // Helper to format discount for display
  formatDiscountDisplay(discountCode) {
    if (!discountCode) return '';
    
    if (discountCode.discount_type === 'percentage') {
      return `${discountCode.discount_value}% off`;
    } else if (discountCode.discount_type === 'fixed_amount') {
      return `$${discountCode.discount_value} off`;
    } else {
      return 'Free shipping';
    }
  }
};

module.exports = { discountManager }; 