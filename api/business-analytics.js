const { PostHog } = require('posthog-node');

// Server-side analytics utility for PostHog
class ServerAnalytics {
  constructor() {
    this.posthog = null;
    this.isShuttingDown = false;
    this.eventQueue = [];
    this.flushTimer = null;
    this.initialize();
  }

  initialize() {
    const posthogKey = process.env.POSTHOG_PROJECT_API_KEY;
    const posthogHost = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';

    if (posthogKey) {
      // Optimize PostHog configuration to prevent memory leaks
      this.posthog = new PostHog(posthogKey, { 
        host: posthogHost,
        flushAt: 20, // Batch events for better performance (reduced from 1)
        flushInterval: 10000, // Flush every 10 seconds (instead of disabled)
        maxQueueSize: 1000, // Limit queue size to prevent memory buildup
        maxEventSize: 32768, // Limit individual event size (32KB)
        httpTimeout: 30000, // 30 second timeout to prevent hanging requests
        requestTimeout: 30000, // Request timeout
        // Add retry configuration
        retryOptions: {
          retryCount: 3,
          retryDelay: 1000
        }
      });
      console.log('📊 Server-side PostHog analytics initialized with optimized settings');
    } else {
      console.warn('⚠️ PostHog API key not found - server analytics disabled');
    }
  }

  isReady() {
    return this.posthog !== null && !this.isShuttingDown;
  }

  // Safe event capture with error handling
  safeCapture(event) {
    if (!this.isReady()) {
      // Queue events if PostHog isn't ready or we're shutting down
      this.eventQueue.push(event);
      
      // Limit queue size to prevent memory leaks
      if (this.eventQueue.length > 500) {
        console.warn('⚠️ Server analytics queue limit reached, dropping oldest events');
        this.eventQueue = this.eventQueue.slice(-250); // Keep only last 250 events
      }
      return;
    }

    try {
      this.posthog.capture(event);
    } catch (error) {
      console.error('📊 Error capturing server analytics event:', error);
      // Fallback to queueing
      this.eventQueue.push(event);
    }
  }

  // Process queued events
  processQueue() {
    if (!this.isReady() || this.eventQueue.length === 0) return;

    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    eventsToProcess.forEach(event => {
      try {
        this.posthog.capture(event);
      } catch (error) {
        console.error('📊 Error processing queued analytics event:', error);
      }
    });

    console.log(`📊 Processed ${eventsToProcess.length} queued analytics events`);
  }

  // Helper to get base properties
  getBaseProperties() {
    return {
      timestamp: new Date().toISOString(),
      source: 'server',
      environment: process.env.NODE_ENV || 'development'
    };
  }

  // Track order completion from webhook
  trackOrderCompletedServer(orderData, lineItems = []) {
    if (!this.isReady()) return;

    const properties = {
      ...this.getBaseProperties(),
      order_id: orderData.id,
      order_number: orderData.order_number,
      order_value: parseFloat(orderData.total_price || 0),
      subtotal: parseFloat(orderData.subtotal_price || 0),
      tax_amount: parseFloat(orderData.total_tax || 0),
      items_count: lineItems.length || 1,
      financial_status: orderData.financial_status,
      order_status: orderData.order_status,
      payment_method: 'stripe',
      currency: 'USD',
      customer_email: orderData.customer_email,
      is_guest_order: !orderData.user_id || orderData.user_id === 'guest',
      order_created_at: orderData.created_at
    };

    // Track main order event
    this.safeCapture({
      distinctId: orderData.customer_email || orderData.id,
      event: 'order_completed_server',
      properties
    });

    // Track AOV data point
    this.safeCapture({
      distinctId: orderData.customer_email || orderData.id,
      event: 'aov_data_point_server', 
      properties: {
        order_value: properties.order_value,
        customer_email: properties.customer_email,
        order_date: properties.timestamp
      }
    });

    // Track individual product sales
    if (lineItems && lineItems.length > 0) {
      lineItems.forEach(item => {
        this.trackProductSaleServer(item, orderData);
      });
    }

    console.log('📊 Server Analytics: Order completed tracked', properties.order_number);
  }

  // Track product sales from order line items
  trackProductSaleServer(lineItem, orderData) {
    if (!this.isReady()) return;

    const properties = {
      ...this.getBaseProperties(),
      product_id: lineItem.product_id || 'custom',
      product_name: lineItem.name || lineItem.title || 'Custom Stickers',
      product_category: 'stickers',
      quantity: parseInt(lineItem.quantity || 1),
      unit_price: parseFloat(lineItem.price || 0),
      total_price: parseFloat(lineItem.price || 0) * parseInt(lineItem.quantity || 1),
      order_id: orderData.id,
      order_number: orderData.order_number,
      order_total: parseFloat(orderData.total_price || 0),
      customer_email: orderData.customer_email
    };

    this.safeCapture({
      distinctId: orderData.customer_email || orderData.id,
      event: 'product_sold_server',
      properties
    });

    // Track product revenue
    this.safeCapture({
      distinctId: orderData.customer_email || orderData.id,
      event: 'product_revenue_server',
      properties: {
        product_name: properties.product_name,
        product_category: properties.product_category,
        revenue: properties.total_price,
        quantity: properties.quantity,
        order_date: properties.timestamp
      }
    });

    console.log('📊 Server Analytics: Product sale tracked', properties.product_name);
  }

  // Track order status changes
  trackOrderStatusChangeServer(orderData, newStatus, previousStatus = null) {
    if (!this.isReady()) return;

    const properties = {
      ...this.getBaseProperties(),
      order_id: orderData.id,
      order_number: orderData.order_number,
      new_status: newStatus,
      previous_status: previousStatus,
      status_change_timestamp: new Date().toISOString(),
      order_created_at: orderData.created_at,
      customer_email: orderData.customer_email
    };

    // Calculate time from order creation
    if (orderData.created_at) {
      const orderCreated = new Date(orderData.created_at);
      const now = new Date();
      const hoursFromOrder = Math.round((now - orderCreated) / (1000 * 60 * 60) * 100) / 100;
      properties.hours_from_order_creation = hoursFromOrder;
    }

    this.safeCapture({
      distinctId: orderData.customer_email || orderData.id,
      event: 'order_status_changed_server',
      properties
    });

    // Track specific milestone events
    if (newStatus === 'Printing') {
      this.safeCapture({
        distinctId: orderData.customer_email || orderData.id,
        event: 'order_production_started_server',
        properties
      });
    } else if (newStatus === 'Shipped' || newStatus === 'In Transit') {
      this.safeCapture({
        distinctId: orderData.customer_email || orderData.id,
        event: 'order_shipped_server',
        properties: {
          ...properties,
          turnaround_time_hours: properties.hours_from_order_creation
        }
      });
    } else if (newStatus === 'Delivered') {
      this.safeCapture({
        distinctId: orderData.customer_email || orderData.id,
        event: 'order_delivered_server',
        properties
      });
    }

    console.log('📊 Server Analytics: Order status change tracked', newStatus);
  }

  // Track proof workflow events
  trackProofCreatedServer(orderData, proofData = {}) {
    if (!this.isReady()) return;

    const properties = {
      ...this.getBaseProperties(),
      order_id: orderData.id,
      order_number: orderData.order_number,
      proof_created_at: new Date().toISOString(),
      customer_email: orderData.customer_email,
      proof_count: proofData.proofCount || 1,
      order_created_at: orderData.created_at
    };

    // Calculate time from order to proof creation
    if (orderData.created_at) {
      const orderCreated = new Date(orderData.created_at);
      const now = new Date();
      const hoursToProof = Math.round((now - orderCreated) / (1000 * 60 * 60) * 100) / 100;
      properties.hours_to_proof_creation = hoursToProof;
    }

    this.safeCapture({
      distinctId: orderData.customer_email || orderData.id,
      event: 'proof_created_server',
      properties
    });

    console.log('📊 Server Analytics: Proof created tracked');
  }

  trackProofApprovedServer(orderData, proofData = {}) {
    if (!this.isReady()) return;

    const properties = {
      ...this.getBaseProperties(),
      order_id: orderData.id,
      order_number: orderData.order_number,
      proof_approved_at: new Date().toISOString(),
      customer_email: orderData.customer_email,
      proof_created_at: proofData.proofCreatedAt,
      order_created_at: orderData.created_at
    };

    // Calculate proof approval time
    if (proofData.proofCreatedAt) {
      const proofCreated = new Date(proofData.proofCreatedAt);
      const now = new Date();
      const hoursToApproval = Math.round((now - proofCreated) / (1000 * 60 * 60) * 100) / 100;
      properties.proof_approval_time_hours = hoursToApproval;
    }

    // Calculate total time from order to proof approval
    if (orderData.created_at) {
      const orderCreated = new Date(orderData.created_at);
      const now = new Date();
      const totalHours = Math.round((now - orderCreated) / (1000 * 60 * 60) * 100) / 100;
      properties.total_hours_to_proof_approval = totalHours;
    }

    this.safeCapture({
      distinctId: orderData.customer_email || orderData.id,
      event: 'proof_approved_server',
      properties
    });

    console.log('📊 Server Analytics: Proof approved tracked');
  }

  // Track error events
  trackErrorServer(errorType, errorData = {}, context = {}) {
    if (!this.isReady()) return;

    this.safeCapture({
      distinctId: context.customer_email || 'server',
      event: 'error_occurred_server',
      properties: {
        ...this.getBaseProperties(),
        error_type: errorType,
        error_data: errorData,
        context
      }
    });
  }

  // Ensure events are flushed before process exit
  async shutdown() {
    if (this.isShuttingDown) return;
    
    console.log('📊 Starting server analytics shutdown...');
    this.isShuttingDown = true;

    try {
      // Process any remaining queued events
      if (this.eventQueue.length > 0) {
        console.log(`📊 Processing ${this.eventQueue.length} remaining events before shutdown`);
        this.processQueue();
      }

      // Clear any pending timers
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }

      // Shutdown PostHog with timeout
      if (this.posthog) {
        const shutdownPromise = this.posthog.shutdown();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Shutdown timeout')), 5000)
        );

        await Promise.race([shutdownPromise, timeoutPromise]);
        this.posthog = null;
      }

      // Clear event queue
      this.eventQueue = [];

      console.log('✅ Server analytics shutdown complete');
    } catch (error) {
      console.error('⚠️ Error during analytics shutdown:', error);
      // Force cleanup even if shutdown fails
      this.posthog = null;
      this.eventQueue = [];
    }
  }

  // Graceful restart method
  async restart() {
    console.log('🔄 Restarting server analytics...');
    await this.shutdown();
    this.isShuttingDown = false;
    this.initialize();
  }
}

// Create singleton instance
const serverAnalytics = new ServerAnalytics();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await serverAnalytics.shutdown();
});

process.on('SIGINT', async () => {
  await serverAnalytics.shutdown();
});

module.exports = serverAnalytics; 