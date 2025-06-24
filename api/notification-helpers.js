// Notification helpers for manual triggering and status management
const supabaseClient = require('./supabase-client');

class NotificationHelpers {
    constructor() {
        this.edgeFunctionUrl = process.env.SUPABASE_URL 
            ? `${process.env.SUPABASE_URL}/functions/v1/notify-customer-status-change`
            : null;
    }

    /**
     * Manually trigger a notification for an order status change
     * Useful for retroactive notifications or manual triggers
     */
    async triggerOrderStatusNotification(orderId, oldStatus = null) {
        if (!supabaseClient.isReady()) {
            console.warn('⚠️ Supabase not configured - cannot trigger notification');
            return { success: false, message: 'Supabase not configured' };
        }

        if (!this.edgeFunctionUrl) {
            console.warn('⚠️ Edge function URL not configured');
            return { success: false, message: 'Edge function URL not configured' };
        }

        try {
            const client = supabaseClient.getServiceClient();
            
            // Get current order data
            const { data: order, error } = await client
                .from('orders_main')
                .select(`
                    *,
                    order_items_new(*)
                `)
                .eq('id', orderId)
                .single();

            if (error || !order) {
                throw new Error(`Failed to fetch order: ${error?.message}`);
            }

            // Create payload for edge function
            const payload = {
                type: 'UPDATE',
                table: 'orders_main',
                record: order,
                old_record: oldStatus ? { ...order, order_status: oldStatus } : {}
            };

            // Call edge function
            const response = await fetch(this.edgeFunctionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Edge function error: ${errorText}`);
            }

            const result = await response.json();
            
            // Update notification status
            await this.updateNotificationStatus(orderId, 'sent');

            console.log('✅ Manual notification triggered successfully:', {
                orderId,
                status: order.order_status,
                result
            });

            return { success: true, result };

        } catch (error) {
            console.error('❌ Failed to trigger notification:', error);
            
            // Update notification status to failed
            await this.updateNotificationStatus(orderId, 'failed');
            
            return { success: false, message: error.message };
        }
    }

    /**
     * Update the notification status for an order
     */
    async updateNotificationStatus(orderId, status) {
        if (!supabaseClient.isReady()) return;

        try {
            const client = supabaseClient.getServiceClient();
            
            await client
                .from('orders_main')
                .update({
                    notification_status: status,
                    last_notification_sent_at: status === 'sent' ? new Date().toISOString() : null
                })
                .eq('id', orderId);

            console.log(`📝 Notification status updated: ${orderId} -> ${status}`);
        } catch (error) {
            console.error('❌ Failed to update notification status:', error);
        }
    }

    /**
     * Get orders that need notification (pending status)
     */
    async getOrdersPendingNotification() {
        if (!supabaseClient.isReady()) {
            return [];
        }

        try {
            const client = supabaseClient.getServiceClient();
            
            const { data: orders, error } = await client
                .from('orders_main')
                .select('id, order_number, order_status, customer_email, notification_status')
                .eq('notification_status', 'pending')
                .not('order_status', 'in', '("Awaiting Payment", "Payment Failed")')
                .order('updated_at', { ascending: false });

            if (error) {
                throw new Error(`Failed to fetch pending orders: ${error.message}`);
            }

            return orders || [];
        } catch (error) {
            console.error('❌ Failed to get pending orders:', error);
            return [];
        }
    }

    /**
     * Retry failed notifications
     */
    async retryFailedNotifications() {
        if (!supabaseClient.isReady()) {
            return { processed: 0, failed: 0 };
        }

        try {
            const client = supabaseClient.getServiceClient();
            
            // Get orders with failed notifications from the last 24 hours
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            
            const { data: failedOrders, error } = await client
                .from('orders_main')
                .select('id, order_status')
                .eq('notification_status', 'failed')
                .gte('updated_at', oneDayAgo);

            if (error) {
                throw new Error(`Failed to fetch failed orders: ${error.message}`);
            }

            let processed = 0;
            let stillFailed = 0;

            for (const order of failedOrders || []) {
                const result = await this.triggerOrderStatusNotification(order.id);
                if (result.success) {
                    processed++;
                } else {
                    stillFailed++;
                }
                
                // Small delay to avoid overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log(`🔄 Retry completed: ${processed} sent, ${stillFailed} still failed`);
            
            return { processed, failed: stillFailed };
        } catch (error) {
            console.error('❌ Failed to retry notifications:', error);
            return { processed: 0, failed: 0 };
        }
    }

    /**
     * Send a bulk notification update (useful for status changes affecting multiple orders)
     */
    async bulkNotifyStatusChange(orderIds, newStatus) {
        const results = [];
        
        for (const orderId of orderIds) {
            const result = await this.triggerOrderStatusNotification(orderId);
            results.push({ orderId, ...result });
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        console.log(`📊 Bulk notification complete: ${successful} sent, ${failed} failed`);
        
        return { successful, failed, results };
    }

    /**
     * Get notification statistics
     */
    async getNotificationStats() {
        if (!supabaseClient.isReady()) {
            return null;
        }

        try {
            const client = supabaseClient.getServiceClient();
            
            // Get stats for the last 7 days
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            
            const { data: stats, error } = await client
                .from('orders_main')
                .select('notification_status')
                .gte('updated_at', sevenDaysAgo)
                .not('notification_status', 'is', null);

            if (error) {
                throw new Error(`Failed to fetch stats: ${error.message}`);
            }

            const summary = {
                total: stats?.length || 0,
                sent: stats?.filter(s => s.notification_status === 'sent').length || 0,
                pending: stats?.filter(s => s.notification_status === 'pending').length || 0,
                failed: stats?.filter(s => s.notification_status === 'failed').length || 0
            };

            summary.success_rate = summary.total > 0 
                ? Math.round((summary.sent / summary.total) * 100) 
                : 0;

            return summary;
        } catch (error) {
            console.error('❌ Failed to get notification stats:', error);
            return null;
        }
    }

    /**
     * Send Discord notification when a proof is approved
     */
    async sendProofApprovalNotification(order, proofId) {
        const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
        
        if (!discordWebhookUrl) {
            console.log('⏭️ Discord webhook URL not configured, skipping proof approval notification');
            return { success: false, message: 'Discord webhook not configured' };
        }

        // Security: Never log the actual webhook URL
        console.log('📱 Sending Discord notification (webhook configured: yes)');

        try {
            // Find the approved proof
            const approvedProof = order.proofs?.find(p => p.id === proofId);
            if (!approvedProof) {
                throw new Error('Approved proof not found');
            }

            // Check if this is a reorder by looking at order items
            const isReorder = order.order_items_new?.some(item => 
                item.calculator_selections?.isReorder === true ||
                item.calculatorSelections?.isReorder === true
            ) || false;

            // Create Discord message
            let description = `✅ **Proof Approved!**\n\n`;
            
            if (isReorder) {
                description += `🔄 **This is a re-order, skip proof and send straight to production.**\n\n`;
            }
            
            description += `**Order:** ${order.order_number || order.id}\n**Customer:** ${order.customer_first_name} ${order.customer_last_name}\n**Email:** ${order.customer_email}\n**Total:** $${order.total_price}\n\n**Proof Title:** ${approvedProof.proofTitle || 'Design Proof'}\n**Approved At:** ${new Date().toLocaleString()}\n\nThe order is now ready for production! 🏭`;

            const discordMessage = {
                embeds: [{
                    description: description,
                    color: isReorder ? 0xf59e0b : 0x22c55e, // Amber for reorder, Green for regular
                    thumbnail: {
                        url: approvedProof.proofUrl
                    }
                }],
                components: [{
                    type: 1, // Action Row
                    components: [{
                        type: 2, // Button
                        style: 5, // Link style
                        label: "View Order in Admin",
                        url: `https://stickershuttle.vercel.app/admin/orders/${order.order_number || order.id}`
                    }]
                }]
            };

            const response = await fetch(discordWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(discordMessage)
            });

            if (!response.ok) {
                throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
            }

            console.log('✅ Discord proof approval notification sent successfully');
            return { success: true };

        } catch (error) {
            console.error('❌ Discord proof approval notification failed:', error);
            return { success: false, message: error.message };
        }
    }
}

module.exports = new NotificationHelpers(); 