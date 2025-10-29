/**
 * Customer Metrics Calculation Utility
 * 
 * Calculates customer-level metrics for Klaviyo segmentation:
 * - Time since last purchase (days)
 * - Purchase frequency (orders per year)
 * - Lifetime value (total spent)
 * - Average days between orders
 */

const supabaseClient = require('./supabase-client');

/**
 * Calculate customer metrics based on order history
 * @param {string} email - Customer email address
 * @param {string} userId - Optional user ID (if available)
 * @returns {Promise<Object>} Customer metrics object
 */
async function calculateCustomerMetrics(email, userId = null) {
  try {
    console.log('📊 Calculating customer metrics for:', email);
    
    const client = await supabaseClient.getServiceClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    // Query orders for this customer (by email or userId)
    let ordersQuery = client
      .from('orders_main')
      .select('id, total_price, order_created_at, financial_status')
      .in('financial_status', ['paid', 'pending']) // Only count paid/pending orders
      .order('order_created_at', { ascending: true });

    if (userId) {
      ordersQuery = ordersQuery.eq('user_id', userId);
    } else {
      ordersQuery = ordersQuery.eq('customer_email', email.toLowerCase().trim());
    }

    const { data: orders, error } = await ordersQuery;

    if (error) {
      console.error('❌ Error fetching orders for metrics:', error);
      throw error;
    }

    if (!orders || orders.length === 0) {
      console.log('📭 No orders found for customer:', email);
      return getDefaultMetrics();
    }

    // Filter out orders with null/zero total_price
    const validOrders = orders.filter(order => 
      order.total_price && 
      parseFloat(order.total_price) > 0 && 
      order.order_created_at
    );

    if (validOrders.length === 0) {
      console.log('📭 No valid orders found for customer:', email);
      return getDefaultMetrics();
    }

    // Sort by date (oldest first)
    validOrders.sort((a, b) => 
      new Date(a.order_created_at) - new Date(b.order_created_at)
    );

    const now = new Date();
    const firstOrderDate = new Date(validOrders[0].order_created_at);
    const lastOrderDate = new Date(validOrders[validOrders.length - 1].order_created_at);

    // Calculate total spent (lifetime value)
    const totalSpent = validOrders.reduce((sum, order) => {
      return sum + (parseFloat(order.total_price) || 0);
    }, 0);

    // Calculate total orders
    const totalOrders = validOrders.length;

    // Calculate average order value
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    // Calculate time since last purchase (in days)
    const timeSinceLastPurchase = Math.floor(
      (now - lastOrderDate) / (1000 * 60 * 60 * 24)
    );

    // Calculate years since first order
    const yearsSinceFirstOrder = (now - firstOrderDate) / (1000 * 60 * 60 * 24 * 365);
    
    // Calculate purchase frequency (orders per year)
    // If customer has been with us less than 30 days, extrapolate to yearly rate
    let purchaseFrequency = 0;
    if (yearsSinceFirstOrder > 0) {
      purchaseFrequency = totalOrders / yearsSinceFirstOrder;
    } else if (timeSinceLastPurchase < 365) {
      // For customers who ordered recently, calculate frequency based on days since first order
      const daysSinceFirstOrder = (now - firstOrderDate) / (1000 * 60 * 60 * 24);
      if (daysSinceFirstOrder > 0) {
        purchaseFrequency = (totalOrders / daysSinceFirstOrder) * 365; // Extrapolate to yearly
      }
    }

    // Calculate average days between orders
    let averageDaysBetweenOrders = 0;
    if (totalOrders > 1) {
      const timeBetweenOrders = [];
      for (let i = 1; i < validOrders.length; i++) {
        const prevDate = new Date(validOrders[i - 1].order_created_at);
        const currDate = new Date(validOrders[i].order_created_at);
        const daysDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
        if (daysDiff > 0) {
          timeBetweenOrders.push(daysDiff);
        }
      }
      
      if (timeBetweenOrders.length > 0) {
        averageDaysBetweenOrders = timeBetweenOrders.reduce((a, b) => a + b, 0) / timeBetweenOrders.length;
      }
    }

    const metrics = {
      totalOrders,
      totalSpent,
      averageOrderValue,
      lifetimeValue: totalSpent, // LTV is same as totalSpent
      timeSinceLastPurchase, // Days since last purchase
      purchaseFrequency: Math.round(purchaseFrequency * 100) / 100, // Round to 2 decimals
      averageDaysBetweenOrders: Math.round(averageDaysBetweenOrders),
      firstOrderDate: validOrders[0].order_created_at,
      lastOrderDate: validOrders[validOrders.length - 1].order_created_at,
      yearsSinceFirstOrder: Math.round(yearsSinceFirstOrder * 100) / 100
    };

    console.log('✅ Calculated customer metrics:', {
      email,
      totalOrders: metrics.totalOrders,
      totalSpent: metrics.totalSpent,
      timeSinceLastPurchase: metrics.timeSinceLastPurchase,
      purchaseFrequency: metrics.purchaseFrequency
    });

    return metrics;
  } catch (error) {
    console.error('❌ Error calculating customer metrics:', error);
    return getDefaultMetrics();
  }
}

/**
 * Get default metrics for customers with no order history
 * @returns {Object} Default metrics object
 */
function getDefaultMetrics() {
  return {
    totalOrders: 0,
    totalSpent: 0,
    averageOrderValue: 0,
    lifetimeValue: 0,
    timeSinceLastPurchase: null,
    purchaseFrequency: 0,
    averageDaysBetweenOrders: 0,
    firstOrderDate: null,
    lastOrderDate: null,
    yearsSinceFirstOrder: 0
  };
}

/**
 * Calculate metrics for a customer when a new order is placed
 * This is a lightweight version that calculates from the order data itself
 * @param {Object} orderData - New order data
 * @param {string} email - Customer email
 * @param {string} userId - Optional user ID
 * @returns {Promise<Object>} Updated customer metrics
 */
async function updateCustomerMetricsForNewOrder(orderData, email, userId = null) {
  try {
    // Recalculate all metrics based on current order history
    // This ensures we always have accurate, up-to-date metrics
    return await calculateCustomerMetrics(email, userId);
  } catch (error) {
    console.error('❌ Error updating customer metrics for new order:', error);
    return getDefaultMetrics();
  }
}

module.exports = {
  calculateCustomerMetrics,
  updateCustomerMetricsForNewOrder,
  getDefaultMetrics
};

