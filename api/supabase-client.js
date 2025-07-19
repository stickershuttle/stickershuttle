const { createClient } = require('@supabase/supabase-js');
// Load environment variables from multiple possible locations (local development only)
if (process.env.NODE_ENV !== 'production' && !process.env.RAILWAY_ENVIRONMENT) {
  require('dotenv').config({ path: '../.env.local' });  // When running from api/
  require('dotenv').config({ path: './.env.local' });   // When running from root
  require('dotenv').config({ path: './.env' });         // API-specific env
  require('dotenv').config();                           // System env
}

class SupabaseClient {
    constructor() {
        console.log('🔧 [SupabaseClient] Constructor called');
        
        // Get environment variables
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

        console.log('🔧 [SupabaseClient] Environment variables:');
        console.log('  - SUPABASE_URL:', this.supabaseUrl ? 'Set' : 'NOT SET');
        console.log('  - SUPABASE_SERVICE_ROLE_KEY:', this.supabaseServiceKey ? 'Set (length: ' + this.supabaseServiceKey.length + ')' : 'NOT SET');
        console.log('  - SUPABASE_ANON_KEY:', this.supabaseAnonKey ? 'Set' : 'NOT SET');

        // Validate configuration
        if (!this.supabaseUrl || !this.supabaseServiceKey) {
            console.error('⚠️  Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
            console.error('⚠️  Order linking functionality will be disabled until configured.');
            this.isConfigured = false;
            return;
        }

        try {
            console.log('🔧 [SupabaseClient] Creating service role client...');
            // Create service role client (for server-side operations) with connection pooling
            this.serviceClient = createClient(this.supabaseUrl, this.supabaseServiceKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                },
                db: {
                    schema: 'public'
                },
                global: {
                    headers: { 'x-my-custom-header': 'sticker-shuttle-api' },
                },
                // Add connection pooling and timeout configurations
                realtime: {
                    params: {
                        eventsPerSecond: 10
                    }
                }
            });

            // Configure connection pool limits and timeouts
            if (this.serviceClient.supabaseUrl) {
                // Set reasonable timeouts to prevent hanging connections
                this.connectionTimeout = 30000; // 30 seconds
                this.idleTimeout = 600000; // 10 minutes
                this.maxConnections = 20; // Limit concurrent connections
                
                console.log('🔧 [SupabaseClient] Connection pooling configured:', {
                    connectionTimeout: this.connectionTimeout,
                    idleTimeout: this.idleTimeout,
                    maxConnections: this.maxConnections
                });
            }

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

    // Get connection statistics
    getConnectionStats() {
        return {
            isConfigured: this.isConfigured,
            hasServiceClient: !!this.serviceClient,
            hasAnonClient: !!this.anonClient,
            connectionTimeout: this.connectionTimeout || 'not set',
            idleTimeout: this.idleTimeout || 'not set',
            maxConnections: this.maxConnections || 'not set'
        };
    }

    // Cleanup method for graceful shutdown
    async cleanup() {
        console.log('🧹 [SupabaseClient] Starting cleanup...');
        
        if (this.serviceClient) {
            try {
                // Disconnect realtime connections if any
                if (this.serviceClient.realtime) {
                    await this.serviceClient.realtime.disconnect();
                }
                
                // Clear any cached connections
                this.serviceClient = null;
                console.log('✅ Service client cleaned up');
            } catch (error) {
                console.error('⚠️ Error cleaning up service client:', error);
            }
        }

        if (this.anonClient) {
            try {
                if (this.anonClient.realtime) {
                    await this.anonClient.realtime.disconnect();
                }
                this.anonClient = null;
                console.log('✅ Anon client cleaned up');
            } catch (error) {
                console.error('⚠️ Error cleaning up anon client:', error);
            }
        }

        this.isConfigured = false;
        console.log('✅ [SupabaseClient] Cleanup completed');
    }

    // Connection health check with timeout
    async healthCheck(timeoutMs = 5000) {
        if (!this.isConfigured) {
            return { healthy: false, error: 'Not configured' };
        }

        try {
            const client = this.getServiceClient();
            
            // Create a promise that will timeout
            const healthPromise = client
                .from('orders_main')
                .select('count')
                .limit(1);

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Health check timeout')), timeoutMs)
            );

            await Promise.race([healthPromise, timeoutPromise]);
            
            return { healthy: true, timestamp: new Date().toISOString() };
        } catch (error) {
            console.error('❌ Health check failed:', error);
            return { healthy: false, error: error.message, timestamp: new Date().toISOString() };
        }
    }

    // ============================================================================
    // ORDER MANAGEMENT METHODS
    // ============================================================================

    /**
     * Create a customer order record linking user to Shopify order
     * Includes duplicate prevention to avoid creating multiple orders for the same Shopify order
     */
    async createCustomerOrder(orderData) {
        console.log('📌 [SupabaseClient] createCustomerOrder called');
        console.log('📌 [SupabaseClient] isConfigured:', this.isConfigured);
        
        if (!this.isConfigured) {
            console.warn('Supabase not configured - skipping order creation');
            return null;
        }

        const client = this.getServiceClient();
        console.log('📌 [SupabaseClient] Got service client');
        
        try {
            // Remove any undefined values
            const cleanOrderData = Object.entries(orderData).reduce((acc, [key, value]) => {
                if (value !== undefined) {
                    acc[key] = value;
                }
                return acc;
            }, {});
            
            console.log('📌 [SupabaseClient] Clean order data:', JSON.stringify(cleanOrderData, null, 2));
            console.log('📌 [SupabaseClient] About to insert into orders_main...');

            const { data, error } = await client
                .from('orders_main')
                .insert([cleanOrderData])
                .select()
                .single();

            console.log('📌 [SupabaseClient] Insert result - data:', data);
            console.log('📌 [SupabaseClient] Insert result - error:', error);

            if (error) {
                // Check if error is due to unique constraint violation
                if (error.code === '23505' && error.message.includes('shopify_order_id')) {
                    console.log('⏭️ Duplicate order detected by database constraint - fetching existing order');
                    return await this.findOrderByShopifyId(orderData.shopify_order_id);
                }
                console.error('Failed to create customer order:', error);
                console.error('Error details:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
                return null;
            }

            console.log('✅ Customer order created:', data.id);
            return data;
        } catch (error) {
            console.error('Error in createCustomerOrder:', error);
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
            if (orderItems.length > 0 && orderItems[0].order_id) {
                const { data: existingItems, error: checkError } = await client
                    .from('order_items_new')
                    .select('id')
                    .eq('order_id', orderItems[0].order_id);

                if (!checkError && existingItems && existingItems.length > 0) {
                    console.log(`⏭️ Order items already exist for order ${orderItems[0].order_id} - skipping duplicate creation`);
                    return existingItems;
                }
            }

            const { data, error } = await client
                .from('order_items_new')
                .insert(orderItems)
                .select();

            if (error) {
                console.error('Failed to create order items:', error);
                return null;
            }

            console.log(`✅ Created ${data.length} order items`);
            return data;
        } catch (error) {
            console.error('Error in createOrderItems:', error);
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
     * Update order status from Stripe webhook
     */
    async updateOrderStatus(orderId, statusUpdates) {
        if (!this.isConfigured) {
            console.warn('Supabase not configured - skipping order status update');
            return null;
        }

        const client = this.getServiceClient();

        try {
            // Map GraphQL field names (camelCase) to database field names (snake_case)
            const dbStatusUpdates = {};
            
            if (statusUpdates.orderStatus) {
                dbStatusUpdates.order_status = statusUpdates.orderStatus;
            }
            if (statusUpdates.fulfillmentStatus) {
                dbStatusUpdates.fulfillment_status = statusUpdates.fulfillmentStatus;
            }
            if (statusUpdates.financialStatus) {
                dbStatusUpdates.financial_status = statusUpdates.financialStatus;
            }
            if (statusUpdates.trackingNumber) {
                dbStatusUpdates.tracking_number = statusUpdates.trackingNumber;
            }
            if (statusUpdates.trackingCompany) {
                dbStatusUpdates.tracking_company = statusUpdates.trackingCompany;
            }
            if (statusUpdates.trackingUrl) {
                dbStatusUpdates.tracking_url = statusUpdates.trackingUrl;
            }
            if (statusUpdates.proof_status) {
                dbStatusUpdates.proof_status = statusUpdates.proof_status;
            }

            const { data, error } = await client
                .from('orders_main')
                .update({
                    ...dbStatusUpdates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId)
                .select(`
                    *,
                    order_items_new(*)
                `)
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
                    guest_email_param: userEmail 
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
                .from('orders_main')
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
                .from('orders_main')
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