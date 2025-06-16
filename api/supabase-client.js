const { createClient } = require('@supabase/supabase-js');
// Load environment variables from multiple possible locations
require('dotenv').config({ path: '../.env.local' });  // When running from api/
require('dotenv').config({ path: './.env.local' });   // When running from root
require('dotenv').config({ path: './.env' });         // API-specific env
require('dotenv').config();                           // System env

class SupabaseClient {
    constructor() {
        // Get environment variables
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

        // Validate configuration
        if (!this.supabaseUrl || !this.supabaseServiceKey) {
            console.error('⚠️  Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
            console.error('⚠️  Order linking functionality will be disabled until configured.');
            this.isConfigured = false;
            return;
        }

        try {
            // Create service role client (for server-side operations)
            this.serviceClient = createClient(this.supabaseUrl, this.supabaseServiceKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });

            // Create anon client (for client-side operations if needed)
            if (this.supabaseAnonKey) {
                this.anonClient = createClient(this.supabaseUrl, this.supabaseAnonKey);
            }

            this.isConfigured = true;
            console.log('✅ Supabase client initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Supabase client:', error.message);
            this.isConfigured = false;
        }
    }

    // Get the service role client (for server operations)
    getServiceClient() {
        if (!this.isConfigured) {
            throw new Error('Supabase is not properly configured');
        }
        return this.serviceClient;
    }

    // Get the anon client (for client-facing operations)
    getAnonClient() {
        if (!this.isConfigured) {
            throw new Error('Supabase is not properly configured');
        }
        return this.anonClient;
    }

    // Check if Supabase is properly configured
    isReady() {
        return this.isConfigured;
    }

    // ============================================================================
    // ORDER MANAGEMENT METHODS
    // ============================================================================

    /**
     * Create a customer order record linking user to Shopify order
     * Includes duplicate prevention to avoid creating multiple orders for the same Shopify order
     */
    async createCustomerOrder(orderData) {
        if (!this.isConfigured) {
            console.warn('Supabase not configured - skipping order creation');
            return null;
        }

        const client = this.getServiceClient();
        
        try {
            // Check if an order with this Shopify order ID already exists
            if (orderData.shopify_order_id) {
                const existingOrder = await this.findOrderByShopifyId(orderData.shopify_order_id);
                if (existingOrder) {
                    console.log(`⏭️ Order with Shopify ID ${orderData.shopify_order_id} already exists - skipping duplicate creation`);
                    return existingOrder;
                }
            }

            const { data, error } = await client
                .from('customer_orders')
                .insert([orderData])
                .select()
                .single();

            if (error) {
                // Check if error is due to unique constraint violation
                if (error.code === '23505' && error.message.includes('shopify_order_id')) {
                    console.log('⏭️ Duplicate order detected by database constraint - fetching existing order');
                    return await this.findOrderByShopifyId(orderData.shopify_order_id);
                }
                console.error('Failed to create customer order:', error);
                return null;
            }

            console.log('✅ Customer order created:', data.id);
            return data;
        } catch (error) {
            console.error('Error creating customer order:', error);
            return null;
        }
    }

    /**
     * Create order items with calculator data
     * Includes duplicate prevention to avoid creating items for the same order multiple times
     */
    async createOrderItems(orderItems) {
        if (!this.isConfigured) {
            console.warn('Supabase not configured - skipping order items creation');
            return null;
        }

        const client = this.getServiceClient();

        try {
            // Check if items already exist for this order
            if (orderItems.length > 0 && orderItems[0].customer_order_id) {
                const { data: existingItems, error: checkError } = await client
                    .from('order_items')
                    .select('id')
                    .eq('customer_order_id', orderItems[0].customer_order_id);

                if (!checkError && existingItems && existingItems.length > 0) {
                    console.log(`⏭️ Order items already exist for order ${orderItems[0].customer_order_id} - skipping duplicate creation`);
                    return existingItems;
                }
            }

            const { data, error } = await client
                .from('order_items')
                .insert(orderItems)
                .select();

            if (error) {
                console.error('Failed to create order items:', error);
                return null;
            }

            console.log(`✅ Created ${data.length} order items`);
            return data;
        } catch (error) {
            console.error('Error creating order items:', error);
            return null;
        }
    }

    /**
     * Get user's order history
     */
    async getUserOrders(userId) {
        if (!this.isConfigured) {
            console.warn('Supabase not configured - cannot fetch user orders');
            return [];
        }

        const client = this.getServiceClient();

        try {
            console.log('🔍 SUPABASE CLIENT: Calling get_user_orders with userId:', userId, 'type:', typeof userId);
            
            const { data, error } = await client
                .rpc('get_user_orders', { user_uuid: userId });

            console.log('🔍 SUPABASE CLIENT: RPC response - data length:', data?.length || 0, 'error:', error);
            
            if (data && data.length > 0) {
                console.log('🔍 SUPABASE CLIENT: First order data:', {
                    order_id: data[0].order_id,
                    shopify_order_id: data[0].shopify_order_id,
                    shopify_order_number: data[0].shopify_order_number,
                    keys: Object.keys(data[0])
                });
            }

            if (error) {
                console.error('Failed to get user orders:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error fetching user orders:', error);
            return [];
        }
    }

    /**
     * Update order status from Shopify webhook
     */
    async updateOrderStatus(shopifyOrderId, statusUpdates) {
        if (!this.isConfigured) {
            console.warn('Supabase not configured - skipping order status update');
            return null;
        }

        const client = this.getServiceClient();

        try {
            const { data, error } = await client
                .from('customer_orders')
                .update({
                    ...statusUpdates,
                    updated_at: new Date().toISOString()
                })
                .eq('shopify_order_id', shopifyOrderId)
                .select()
                .single();

            if (error) {
                console.error('Failed to update order status:', error);
                return null;
            }

            console.log('✅ Order status updated:', data.id);
            return data;
        } catch (error) {
            console.error('Error updating order status:', error);
            return null;
        }
    }

    /**
     * Claim guest orders when user registers
     */
    async claimGuestOrders(userId, userEmail) {
        if (!this.isConfigured) {
            console.warn('Supabase not configured - cannot claim guest orders');
            return 0;
        }

        const client = this.getServiceClient();

        try {
            const { data, error } = await client
                .rpc('claim_guest_orders', { 
                    user_uuid: userId, 
                    user_email: userEmail 
                });

            if (error) {
                console.error('Failed to claim guest orders:', error);
                return 0;
            }

            if (data > 0) {
                console.log(`✅ Claimed ${data} guest orders for user ${userId}`);
            }

            return data;
        } catch (error) {
            console.error('Error claiming guest orders:', error);
            return 0;
        }
    }

    /**
     * Find existing order by Shopify order ID
     */
    async findOrderByShopifyId(shopifyOrderId) {
        if (!this.isConfigured) {
            return null;
        }

        const client = this.getServiceClient();

        try {
            const { data, error } = await client
                .from('customer_orders')
                .select('*')
                .eq('shopify_order_id', shopifyOrderId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Failed to find order:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error finding order:', error);
            return null;
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Test database connection
     */
    async testConnection() {
        if (!this.isConfigured) {
            return false;
        }

        try {
            const client = this.getServiceClient();
            const { data, error } = await client
                .from('customer_orders')
                .select('count')
                .limit(1);

            return !error;
        } catch (error) {
            console.error('Database connection test failed:', error);
            return false;
        }
    }
}

// Create and export singleton instance
const supabaseClient = new SupabaseClient();

module.exports = supabaseClient; 