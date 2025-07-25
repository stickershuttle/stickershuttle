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
        // Notifications temporarily disabled to fix webhook errors
        console.log('⚠️ Notifications disabled - orderId:', orderId);
        return { success: true, message: 'Notifications temporarily disabled' };
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
        // Discord notifications disabled
        console.log('⚠️ Discord proof approval notification disabled for order:', order.order_number || order.id);
        return { success: true, message: 'Discord notifications disabled' };
    }
}

module.exports = new NotificationHelpers(); 