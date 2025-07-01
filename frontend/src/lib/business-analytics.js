import posthog from 'posthog-js';

// Analytics utility for tracking business metrics
export class StickerShuttleAnalytics {
  constructor() {
    this.posthog = posthog;
  }

  // Helper to ensure PostHog is ready
  isReady() {
    return typeof window !== 'undefined' && this.posthog && this.posthog.__loaded;
  }

  // Helper to get user properties
  getUserProperties(user = null) {
    const baseProps = {
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : ''
    };

    if (user) {
      return {
        ...baseProps,
        user_id: user.id,
        user_email: user.email,
        user_type: 'registered'
      };
    }

    return {
      ...baseProps,
      user_type: 'guest'
    };
  }

  // 1. Average Order Value (AOV) - Track order completion
  trackOrderCompleted(orderData, user = null) {
    if (!this.isReady()) return;

    const properties = {
      ...this.getUserProperties(user),
      order_id: orderData.id,
      order_number: orderData.orderNumber || orderData.order_number,
      order_value: parseFloat(orderData.totalPrice || orderData.total_price),
      subtotal: parseFloat(orderData.subtotalPrice || orderData.subtotal_price || 0),
      tax_amount: parseFloat(orderData.totalTax || orderData.total_tax || 0),
      items_count: orderData.lineItems?.length || orderData.line_items?.length || 1,
      financial_status: orderData.financialStatus || orderData.financial_status,
      order_status: orderData.orderStatus || orderData.order_status,
      payment_method: 'stripe',
      currency: 'USD',
      customer_email: orderData.customerEmail || orderData.customer_email || user?.email,
      is_guest_order: !user || user.id === 'guest',
      credits_used: orderData.creditsApplied || 0,
      order_created_at: orderData.orderCreatedAt || orderData.created_at
    };

    // Track the main order event
    this.posthog.capture('order_completed', properties);

    // Track for AOV calculation
    this.posthog.capture('aov_data_point', {
      order_value: properties.order_value,
      customer_email: properties.customer_email,
      order_date: properties.timestamp
    });

    console.log('📊 Analytics: Order completed tracked', properties);
  }

  // 2. Customer Lifetime Value (LTV) - Track customer value over time
  trackCustomerValue(customerEmail, orderValue, isRepeatCustomer = false, totalCustomerOrders = 1) {
    if (!this.isReady()) return;

    const properties = {
      customer_email: customerEmail,
      current_order_value: parseFloat(orderValue),
      is_repeat_customer: isRepeatCustomer,
      total_orders_to_date: totalCustomerOrders,
      order_date: new Date().toISOString()
    };

    this.posthog.capture('customer_value_update', properties);

    // Track LTV milestone events
    if (totalCustomerOrders === 2) {
      this.posthog.capture('customer_second_purchase', properties);
    } else if (totalCustomerOrders >= 5) {
      this.posthog.capture('customer_high_value', properties);
    }

    console.log('📊 Analytics: Customer value tracked', properties);
  }

  // 3. Turnaround Time - Track order status changes
  trackOrderStatusChange(orderData, newStatus, previousStatus = null) {
    if (!this.isReady()) return;

    const properties = {
      order_id: orderData.id,
      order_number: orderData.orderNumber || orderData.order_number,
      new_status: newStatus,
      previous_status: previousStatus,
      status_change_timestamp: new Date().toISOString(),
      order_created_at: orderData.orderCreatedAt || orderData.created_at,
      customer_email: orderData.customerEmail || orderData.customer_email
    };

    // Calculate time from order creation if we have both timestamps
    if (orderData.orderCreatedAt || orderData.created_at) {
      const orderCreated = new Date(orderData.orderCreatedAt || orderData.created_at);
      const now = new Date();
      const hoursFromOrder = Math.round((now - orderCreated) / (1000 * 60 * 60) * 100) / 100;
      properties.hours_from_order_creation = hoursFromOrder;
    }

    this.posthog.capture('order_status_changed', properties);

    // Track specific milestone events for turnaround time calculation
    if (newStatus === 'Printing') {
      this.posthog.capture('order_production_started', properties);
    } else if (newStatus === 'Shipped' || newStatus === 'In Transit') {
      this.posthog.capture('order_shipped', {
        ...properties,
        turnaround_time_hours: properties.hours_from_order_creation
      });
    } else if (newStatus === 'Delivered') {
      this.posthog.capture('order_delivered', properties);
    }

    console.log('📊 Analytics: Order status change tracked', properties);
  }

  // 4. Repeat Purchase Rate - Track customer purchase patterns
  trackCustomerPurchasePattern(customerEmail, customerData) {
    if (!this.isReady()) return;

    const properties = {
      customer_email: customerEmail,
      total_orders: customerData.totalOrders || 1,
      total_spent: parseFloat(customerData.totalSpent || 0),
      first_order_date: customerData.firstOrderDate,
      last_order_date: customerData.lastOrderDate,
      is_repeat_customer: (customerData.totalOrders || 1) > 1,
      days_since_first_order: customerData.daysSinceFirstOrder || 0,
      average_order_value: customerData.averageOrderValue || 0
    };

    this.posthog.capture('customer_purchase_pattern', properties);

    // Track repeat purchase milestones
    if (properties.total_orders === 2) {
      this.posthog.capture('first_repeat_purchase', properties);
    }

    console.log('📊 Analytics: Customer purchase pattern tracked', properties);
  }

  // 5. Top Products Sold - Track individual product sales
  trackProductSale(productData, orderData, user = null) {
    if (!this.isReady()) return;

    const properties = {
      ...this.getUserProperties(user),
      product_id: productData.id,
      product_name: productData.name,
      product_category: productData.category || 'stickers',
      product_type: productData.productType || productData.product_type,
      quantity: parseInt(productData.quantity || 1),
      unit_price: parseFloat(productData.unitPrice || productData.unit_price || 0),
      total_price: parseFloat(productData.totalPrice || productData.total_price || 0),
      product_options: productData.options || {},
      order_id: orderData.id,
      order_number: orderData.orderNumber || orderData.order_number,
      order_total: parseFloat(orderData.totalPrice || orderData.total_price)
    };

    this.posthog.capture('product_sold', properties);

    // Track product performance metrics
    this.posthog.capture('product_revenue', {
      product_name: properties.product_name,
      product_category: properties.product_category,
      revenue: properties.total_price,
      quantity: properties.quantity,
      order_date: new Date().toISOString()
    });

    console.log('📊 Analytics: Product sale tracked', properties);
  }

  // 6. Proof Approval Time - Track proof workflow
  trackProofCreated(orderData, proofData = {}) {
    if (!this.isReady()) return;

    const properties = {
      order_id: orderData.id,
      order_number: orderData.orderNumber || orderData.order_number,
      proof_created_at: new Date().toISOString(),
      customer_email: orderData.customerEmail || orderData.customer_email,
      proof_count: proofData.proofCount || 1,
      order_created_at: orderData.orderCreatedAt || orderData.created_at
    };

    // Calculate time from order to proof creation
    if (orderData.orderCreatedAt || orderData.created_at) {
      const orderCreated = new Date(orderData.orderCreatedAt || orderData.created_at);
      const now = new Date();
      const hoursToProof = Math.round((now - orderCreated) / (1000 * 60 * 60) * 100) / 100;
      properties.hours_to_proof_creation = hoursToProof;
    }

    this.posthog.capture('proof_created', properties);
    console.log('📊 Analytics: Proof created tracked', properties);
  }

  trackProofApproved(orderData, proofData = {}) {
    if (!this.isReady()) return;

    const properties = {
      order_id: orderData.id,
      order_number: orderData.orderNumber || orderData.order_number,
      proof_approved_at: new Date().toISOString(),
      customer_email: orderData.customerEmail || orderData.customer_email,
      proof_created_at: proofData.proofCreatedAt,
      order_created_at: orderData.orderCreatedAt || orderData.created_at
    };

    // Calculate proof approval time
    if (proofData.proofCreatedAt) {
      const proofCreated = new Date(proofData.proofCreatedAt);
      const now = new Date();
      const hoursToApproval = Math.round((now - proofCreated) / (1000 * 60 * 60) * 100) / 100;
      properties.proof_approval_time_hours = hoursToApproval;
    }

    // Calculate total time from order to proof approval
    if (orderData.orderCreatedAt || orderData.created_at) {
      const orderCreated = new Date(orderData.orderCreatedAt || orderData.created_at);
      const now = new Date();
      const totalHours = Math.round((now - orderCreated) / (1000 * 60 * 60) * 100) / 100;
      properties.total_hours_to_proof_approval = totalHours;
    }

    this.posthog.capture('proof_approved', properties);
    console.log('📊 Analytics: Proof approved tracked', properties);
  }

  // Track cart events for conversion analysis
  trackCartEvent(eventType, cartData, user = null) {
    if (!this.isReady()) return;

    const properties = {
      ...this.getUserProperties(user),
      cart_value: parseFloat(cartData.totalPrice || 0),
      items_count: cartData.items?.length || 0,
      cart_items: cartData.items?.map(item => ({
        product_name: item.name,
        quantity: item.quantity,
        price: item.price
      })) || []
    };

    this.posthog.capture(`cart_${eventType}`, properties);
    console.log(`📊 Analytics: Cart ${eventType} tracked`, properties);
  }

  // Track user engagement events
  trackUserEngagement(eventType, properties = {}) {
    if (!this.isReady()) return;

    this.posthog.capture(`user_${eventType}`, {
      ...properties,
      timestamp: new Date().toISOString()
    });
  }

  // Track error events for debugging
  trackError(errorType, errorData = {}) {
    if (!this.isReady()) return;

    this.posthog.capture('error_occurred', {
      error_type: errorType,
      error_data: errorData,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : ''
    });
  }
}

// Create singleton instance
export const analytics = new StickerShuttleAnalytics();

// Export individual functions for convenience
export const trackOrderCompleted = (orderData, user) => analytics.trackOrderCompleted(orderData, user);
export const trackCustomerValue = (email, value, isRepeat, totalOrders) => analytics.trackCustomerValue(email, value, isRepeat, totalOrders);
export const trackOrderStatusChange = (orderData, newStatus, prevStatus) => analytics.trackOrderStatusChange(orderData, newStatus, prevStatus);
export const trackCustomerPurchasePattern = (email, customerData) => analytics.trackCustomerPurchasePattern(email, customerData);
export const trackProductSale = (productData, orderData, user) => analytics.trackProductSale(productData, orderData, user);
export const trackProofCreated = (orderData, proofData) => analytics.trackProofCreated(orderData, proofData);
export const trackProofApproved = (orderData, proofData) => analytics.trackProofApproved(orderData, proofData);
export const trackCartEvent = (eventType, cartData, user) => analytics.trackCartEvent(eventType, cartData, user);
export const trackUserEngagement = (eventType, properties) => analytics.trackUserEngagement(eventType, properties);
export const trackError = (errorType, errorData) => analytics.trackError(errorType, errorData); 