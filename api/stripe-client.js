const Stripe = require('stripe');

class StripeClient {
  constructor() {
    this.stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!this.stripeSecretKey) {
      console.error('⚠️  Stripe configuration missing. Please set STRIPE_SECRET_KEY environment variable.');
      this.isConfigured = false;
      return;
    }

    try {
      this.stripe = new Stripe(this.stripeSecretKey, {
        apiVersion: '2023-10-16',
      });
      this.isConfigured = true;
      console.log('✅ Stripe client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Stripe client:', error.message);
      this.isConfigured = false;
    }
  }

  // Check if Stripe is properly configured
  isReady() {
    return this.isConfigured;
  }

  // Create a checkout session for an order
  async createCheckoutSession(orderData) {
    if (!this.isConfigured) {
      throw new Error('Stripe is not properly configured');
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: orderData.lineItems.map(item => ({
          price_data: {
            currency: orderData.currency || 'usd',
            product_data: {
              name: item.name || item.title,
              description: item.description || `${item.name} - Custom Stickers (${item.quantity} pieces)`,
              metadata: {
                productId: item.productId,
                sku: item.sku,
                // Store only essential selections in product metadata (500 char limit)
                // Full selections will be in orderNote in session metadata
                size: item.calculatorSelections?.size?.displayValue || '',
                material: item.calculatorSelections?.material?.displayValue || '',
                cut: item.calculatorSelections?.cut?.displayValue || '',
                // Add essential product info
                category: item.category || 'custom-stickers',
                actualQuantity: item.quantity.toString() // Store actual quantity in metadata
              }
            },
            // Fix: Use total price directly to avoid rounding issues
            // Set quantity to 1 and use total price as unit amount
            unit_amount: Math.round(item.totalPrice * 100), // Total price in cents
          },
          quantity: 1, // Always 1, actual quantity is in product description and metadata
        })),
        mode: 'payment',
        success_url: `${orderData.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: orderData.cancelUrl,
        customer_email: orderData.customerEmail,
        metadata: {
          orderId: orderData.orderId,
          userId: orderData.userId || 'guest',
          customerOrderId: orderData.customerOrderId || '',
          orderNote: orderData.orderNote || '',
          cartMetadata: JSON.stringify(orderData.cartMetadata || {})
        },
        shipping_address_collection: {
          allowed_countries: ['US', 'CA'], // Add more countries as needed
        },
        shipping_options: [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: {
                amount: 0, // Free shipping - adjust as needed
                currency: 'usd',
              },
              display_name: 'Standard Shipping',
              delivery_estimate: {
                minimum: {
                  unit: 'business_day',
                  value: 5,
                },
                maximum: {
                  unit: 'business_day',
                  value: 7,
                },
              },
            },
          },
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: {
                amount: 1500, // $15.00
                currency: 'usd',
              },
              display_name: 'Express Shipping',
              delivery_estimate: {
                minimum: {
                  unit: 'business_day',
                  value: 2,
                },
                maximum: {
                  unit: 'business_day',
                  value: 3,
                },
              },
            },
          },
        ],
      });

      return {
        success: true,
        sessionId: session.id,
        checkoutUrl: session.url,
        totalAmount: session.amount_total,
      };
    } catch (error) {
      console.error('Error creating Stripe checkout session:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  // Retrieve a checkout session
  async getCheckoutSession(sessionId) {
    if (!this.isConfigured) {
      throw new Error('Stripe is not properly configured');
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items.data.price.product', 'customer', 'payment_intent']
      });
      return session;
    } catch (error) {
      console.error('Error retrieving checkout session:', error);
      throw new Error(`Failed to retrieve checkout session: ${error.message}`);
    }
  }

  // Create a payment intent for custom payment flows
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    if (!this.isConfigured) {
      throw new Error('Stripe is not properly configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
      });
      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  // Retrieve a payment intent
  async getPaymentIntent(paymentIntentId) {
    if (!this.isConfigured) {
      throw new Error('Stripe is not properly configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw new Error(`Failed to retrieve payment intent: ${error.message}`);
    }
  }

  // Create a customer
  async createCustomer(customerData) {
    if (!this.isConfigured) {
      throw new Error('Stripe is not properly configured');
    }

    try {
      const customer = await this.stripe.customers.create({
        email: customerData.email,
        name: `${customerData.firstName} ${customerData.lastName}`,
        phone: customerData.phone,
        metadata: {
          userId: customerData.userId || 'guest',
        },
      });
      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(payload, signature, endpointSecret) {
    if (!this.isConfigured) {
      throw new Error('Stripe is not properly configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      throw new Error(`Invalid webhook signature: ${error.message}`);
    }
  }

  // Create a refund
  async createRefund(paymentIntentId, amount = null) {
    if (!this.isConfigured) {
      throw new Error('Stripe is not properly configured');
    }

    try {
      const refundData = {
        payment_intent: paymentIntentId,
      };
      
      if (amount !== null) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await this.stripe.refunds.create(refundData);
      return refund;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  }
}

// Create and export singleton instance
const stripeClient = new StripeClient();

module.exports = stripeClient; 