const supabaseClient = require('./supabase-client');

class EasyPostTrackingEnhancer {
    constructor(easyPostClient) {
        this.easyPostClient = easyPostClient;
    }

    /**
     * Create a tracker for a shipment and store it in the database
     * This should be called after purchasing a shipping label
     */
    async createTracker(trackingCode, orderId, carrier = null) {
        if (!this.easyPostClient.isReady()) {
            throw new Error('EasyPost client is not configured');
        }

        try {
            console.log(`📍 Creating EasyPost tracker for: ${trackingCode}`);

            // Create tracker in EasyPost
            const tracker = await this.easyPostClient.getClient().Tracker.create({
                tracking_code: trackingCode,
                carrier: carrier || undefined // Let EasyPost auto-detect if not provided
            });

            console.log(`✅ EasyPost tracker created: ${tracker.id}`);

            // Update order with tracking information
            if (supabaseClient.isReady()) {
                const client = supabaseClient.getServiceClient();
                
                const { data: updatedOrder, error } = await client
                    .from('orders_main')
                    .update({
                        tracking_number: trackingCode,
                        tracking_company: tracker.carrier,
                        tracking_url: tracker.public_url,
                        easypost_tracker_id: tracker.id,
                        fulfillment_status: 'partial',
                        order_status: 'Shipped',
                        proof_status: 'label_printed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', orderId)
                    .select();

                if (error) {
                    console.error('❌ Error updating order with tracking info:', error);
                } else {
                    console.log(`✅ Order ${orderId} updated with tracking: ${trackingCode}`);
                    
                    // Send shipped email notification
                    if (updatedOrder && updatedOrder.length > 0) {
                        try {
                            console.log('📧 Sending shipped notification to customer...');
                            const emailNotifications = require('./email-notifications');
                            
                            const orderData = updatedOrder[0];
                            const orderForEmail = {
                                ...orderData,
                                customerEmail: orderData.customer_email,
                                orderNumber: orderData.order_number || orderData.id,
                                totalPrice: orderData.total_price
                            };
                            
                            const emailResult = await emailNotifications.sendOrderStatusNotification(
                                orderForEmail,
                                'Shipped'
                            );
                            
                            if (emailResult.success) {
                                console.log('✅ Shipped notification sent successfully');
                            } else {
                                console.error('❌ Shipped notification failed:', emailResult.error);
                            }
                        } catch (emailError) {
                            console.error('⚠️ Failed to send shipped notification (tracking still created):', emailError);
                        }
                    }
                }
            }

            return tracker;
        } catch (error) {
            console.error('❌ Failed to create EasyPost tracker:', error);
            throw error;
        }
    }

    /**
     * Enhanced status mapping from EasyPost to our system
     */
    mapEasyPostStatus(easyPostStatus, currentProofStatus = null) {
        const statusMap = {
            // Initial states
            'unknown': {
                orderStatus: 'Processing',
                fulfillmentStatus: 'unfulfilled',
                proofStatus: currentProofStatus || 'building_proof',
                progressStep: 0
            },
            'pre_transit': {
                orderStatus: 'Label Printed',
                fulfillmentStatus: 'partial',
                proofStatus: 'label_printed',
                progressStep: 3
            },
            // In transit states
            'in_transit': {
                orderStatus: 'Shipped',
                fulfillmentStatus: 'partial', 
                proofStatus: 'shipped',
                progressStep: 4
            },
            'out_for_delivery': {
                orderStatus: 'Out for Delivery',
                fulfillmentStatus: 'partial',
                proofStatus: 'shipped',
                progressStep: 5
            },
            // Final states
            'delivered': {
                orderStatus: 'Delivered',
                fulfillmentStatus: 'fulfilled',
                proofStatus: 'delivered',
                progressStep: 6
            },
            // Error states
            'available_for_pickup': {
                orderStatus: 'Available for Pickup',
                fulfillmentStatus: 'partial',
                proofStatus: 'shipped',
                progressStep: 5
            },
            'exception': {
                orderStatus: 'Shipping Exception',
                fulfillmentStatus: 'partial',
                proofStatus: 'shipped',
                progressStep: 4
            },
            'failure': {
                orderStatus: 'Shipping Failed',
                fulfillmentStatus: 'partial',
                proofStatus: 'shipped',
                progressStep: 4
            },
            'return_to_sender': {
                orderStatus: 'Returned to Sender',
                fulfillmentStatus: 'partial',
                proofStatus: 'shipped',
                progressStep: 4
            }
        };

        return statusMap[easyPostStatus] || statusMap['unknown'];
    }

    /**
     * Process tracking update from EasyPost webhook
     */
    async processTrackingUpdate(tracker) {
        if (!supabaseClient.isReady()) {
            console.warn('⚠️ Supabase not ready, skipping tracking update');
            return false;
        }

        const client = supabaseClient.getServiceClient();
        const trackingCode = tracker.tracking_code;
        const status = tracker.status;

        console.log(`📦 Processing tracking update: ${trackingCode} -> ${status}`);

        try {
            // Find order by tracking number
            const { data: orders, error: findError } = await client
                .from('orders_main')
                .select('id, order_status, fulfillment_status, proof_status, customer_email, order_number')
                .eq('tracking_number', trackingCode);

            if (findError) {
                console.error('❌ Error finding order:', findError);
                return false;
            }

            if (!orders || orders.length === 0) {
                console.warn(`⚠️ No order found with tracking number: ${trackingCode}`);
                return false;
            }

            const order = orders[0];
            const statusMapping = this.mapEasyPostStatus(status, order.proof_status);

            // Prepare update data
            const updateData = {
                fulfillment_status: statusMapping.fulfillmentStatus,
                order_status: statusMapping.orderStatus,
                proof_status: statusMapping.proofStatus,
                tracking_company: tracker.carrier,
                tracking_url: tracker.public_url,
                easypost_tracker_id: tracker.id,
                updated_at: new Date().toISOString()
            };

            // Add delivery date if available
            if (tracker.est_delivery_date) {
                updateData.estimated_delivery_date = tracker.est_delivery_date;
            }

            // Add tracking details if available
            if (tracker.tracking_details && tracker.tracking_details.length > 0) {
                updateData.tracking_details = tracker.tracking_details;
            }

            // Update order
            const { data: updatedOrder, error: updateError } = await client
                .from('orders_main')
                .update(updateData)
                .eq('id', order.id)
                .select();

            if (updateError) {
                console.error('❌ Error updating order status:', updateError);
                return false;
            }

            console.log(`✅ Order ${order.order_number || order.id} status updated:`);
            console.log(`   ${order.order_status} -> ${statusMapping.orderStatus}`);
            console.log(`   Tracking: ${trackingCode} (${tracker.carrier})`);

            // Send email notifications for important status changes
            if (order.order_status !== statusMapping.orderStatus && 
                ['Shipped', 'Out for Delivery', 'Delivered'].includes(statusMapping.orderStatus)) {
                try {
                    console.log(`📧 Sending customer notification for status: ${statusMapping.orderStatus}`);
                    const emailNotifications = require('./email-notifications');
                    
                    // Get complete order data for email
                    const { data: fullOrder, error: fetchError } = await client
                        .from('orders_main')
                        .select('*')
                        .eq('id', order.id)
                        .single();
                    
                    if (!fetchError && fullOrder) {
                        // Ensure order has customer email
                        const orderForEmail = {
                            ...fullOrder,
                            customerEmail: fullOrder.customer_email,
                            orderNumber: fullOrder.order_number || fullOrder.id,
                            totalPrice: fullOrder.total_price
                        };
                        
                        const emailResult = await emailNotifications.sendOrderStatusNotification(
                            orderForEmail,
                            statusMapping.orderStatus
                        );
                        
                        if (emailResult.success) {
                            console.log(`✅ Customer ${statusMapping.orderStatus} notification sent successfully`);
                        } else {
                            console.error(`❌ Customer ${statusMapping.orderStatus} notification failed:`, emailResult.error);
                        }
                    }
                } catch (emailError) {
                    console.error('⚠️ Failed to send tracking update email (tracking update still processed):', emailError);
                }
            }

            // Log special events
            if (status === 'out_for_delivery') {
                console.log(`🚚 Order ${order.order_number || order.id} is OUT FOR DELIVERY!`);
            } else if (status === 'delivered') {
                console.log(`📦 Order ${order.order_number || order.id} has been DELIVERED!`);
            }

            return true;
        } catch (error) {
            console.error('❌ Error processing tracking update:', error);
            return false;
        }
    }

    /**
     * Get tracking status for an order
     */
    async getTrackingStatus(trackingCode) {
        if (!this.easyPostClient.isReady()) {
            throw new Error('EasyPost client is not configured');
        }

        try {
            const tracker = await this.easyPostClient.getClient().Tracker.retrieve(trackingCode);
            return {
                status: tracker.status,
                carrier: tracker.carrier,
                public_url: tracker.public_url,
                est_delivery_date: tracker.est_delivery_date,
                tracking_details: tracker.tracking_details || []
            };
        } catch (error) {
            console.error('❌ Failed to get tracking status:', error);
            throw error;
        }
    }

    /**
     * Force refresh tracking for all active shipments
     * Useful for catching up on missed webhook events
     */
    async refreshAllActiveTracking() {
        if (!supabaseClient.isReady()) {
            throw new Error('Supabase client is not configured');
        }

        const client = supabaseClient.getServiceClient();

        try {
            // Get all orders with tracking numbers that aren't delivered
            const { data: orders, error } = await client
                .from('orders_main')
                .select('id, tracking_number, order_status')
                .not('tracking_number', 'is', null)
                .not('order_status', 'eq', 'Delivered')
                .not('order_status', 'eq', 'Cancelled');

            if (error) {
                console.error('❌ Error fetching active orders:', error);
                return;
            }

            console.log(`🔄 Refreshing tracking for ${orders.length} active orders...`);

            for (const order of orders) {
                try {
                    const trackingStatus = await this.getTrackingStatus(order.tracking_number);
                    
                    // Create a mock tracker object for processing
                    const mockTracker = {
                        tracking_code: order.tracking_number,
                        status: trackingStatus.status,
                        carrier: trackingStatus.carrier,
                        public_url: trackingStatus.public_url,
                        est_delivery_date: trackingStatus.est_delivery_date,
                        tracking_details: trackingStatus.tracking_details
                    };

                    await this.processTrackingUpdate(mockTracker);
                    
                    // Add delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    console.warn(`⚠️ Failed to refresh tracking for order ${order.id}:`, error.message);
                }
            }

            console.log('✅ Tracking refresh complete');
        } catch (error) {
            console.error('❌ Error refreshing tracking:', error);
        }
    }
}

module.exports = EasyPostTrackingEnhancer; 