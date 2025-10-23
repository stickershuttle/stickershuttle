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
      // Helper function to safely parse numbers and handle NaN
      const safeParseFloat = (value, fallback = 0) => {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? fallback : parsed;
      };

      // Calculate discount proportionally across all line items
      const originalTotal = orderData.lineItems.reduce((sum, item) => sum + safeParseFloat(item.totalPrice, 0), 0);
      const discountAmount = safeParseFloat(orderData.cartMetadata?.discountAmount, 0);
      const creditsApplied = safeParseFloat(orderData.cartMetadata?.creditsApplied, 0);
      const totalDiscounts = discountAmount + creditsApplied;
      const discountRatio = totalDiscounts > 0 && originalTotal > 0 ? totalDiscounts / originalTotal : 0;

      console.log('💰 Discount calculation:', {
        originalTotal,
        discountAmount,
        creditsApplied,
        totalDiscounts,
        discountRatio,
        finalTotal: originalTotal - totalDiscounts
      });

      // Check for tax exemption status
      const isTaxExempt = orderData.customerTaxExempt || false;
      console.log('🏛️ Tax exemption status:', { isTaxExempt, customerEmail: orderData.customerEmail });

      // Create/update customer if tax exemption is needed
      let customerId = null;
      if (orderData.userId && orderData.userId !== 'guest') {
        try {
          // Create or update customer with tax exemption status
          const customerData = {
            email: orderData.customerEmail,
            tax_exempt: isTaxExempt ? 'exempt' : 'none',
            metadata: {
              userId: orderData.userId,
              isTaxExempt: isTaxExempt.toString()
            }
          };
          
          // For Pro subscriptions, add uploaded file URL to customer metadata
          if (orderData.metadata?.isSubscription === 'true' && orderData.metadata?.uploadedFileUrl) {
            customerData.metadata.uploadedFileUrl = orderData.metadata.uploadedFileUrl;
            customerData.metadata.uploadedFileName = orderData.metadata.uploadedFileName || '';
            console.log('📁 Storing Pro design file in customer metadata:', orderData.metadata.uploadedFileUrl);
          }

          if (orderData.existingCustomerId) {
            // Update existing customer
            await this.stripe.customers.update(orderData.existingCustomerId, customerData);
            customerId = orderData.existingCustomerId;
          } else {
            // Create new customer
            const customer = await this.stripe.customers.create(customerData);
            customerId = customer.id;
          }

          console.log('✅ Customer tax status updated:', { customerId, taxExempt: isTaxExempt });
        } catch (customerError) {
          console.warn('⚠️ Error managing customer tax status:', customerError);
          // Continue without customer ID - guest checkout
        }
      }

      // Check if this is a subscription (Pro membership)
      const isSubscription = orderData.metadata?.isSubscription === 'true';
      const subscriptionInterval = orderData.metadata?.plan === 'monthly' ? 'month' : 'year';
      
      console.log('🔄 Payment mode:', isSubscription ? `subscription (${subscriptionInterval})` : 'one-time payment');

      const sessionConfig = {
        payment_method_types: ['card'],
        line_items: orderData.lineItems.map(item => {
          // Apply discount proportionally to each item
          // Use totalPrice if available, otherwise calculate from unitPrice * quantity
          const itemTotalPrice = item.totalPrice 
            ? safeParseFloat(item.totalPrice, 0)
            : safeParseFloat(item.unitPrice, 0) * (item.quantity || 1);
          const itemDiscountAmount = itemTotalPrice * discountRatio;
          const discountedItemPrice = itemTotalPrice - itemDiscountAmount;
          
          console.log(`📦 Item pricing: ${item.name}`, {
            originalPrice: itemTotalPrice,
            itemDiscountAmount,
            discountedPrice: discountedItemPrice,
            isSubscription
          });

          const lineItemConfig = {
            price_data: {
              currency: orderData.currency || 'usd',
              product_data: {
                name: item.name || item.title,
                description: item.description || `${item.name} - Custom Stickers (${item.quantity} pieces)${totalDiscounts > 0 ? ` (${orderData.cartMetadata?.discountCode ? orderData.cartMetadata.discountCode + ' discount' : ''}${creditsApplied > 0 ? (orderData.cartMetadata?.discountCode ? ' + ' : '') + '$' + creditsApplied.toFixed(2) + ' credits' : ''} applied)` : ''}`,
                metadata: {
                  productId: item.productId,
                  sku: item.sku,
                  // Store only essential selections in product metadata (500 char limit)
                  // Full selections will be in orderNote in session metadata (truncated to 450 chars)
                  size: item.calculatorSelections?.size?.displayValue || '',
                  material: item.calculatorSelections?.material?.displayValue || '',
                  cut: item.calculatorSelections?.cut?.displayValue || '',
                  whiteOption: item.calculatorSelections?.whiteOption?.displayValue || '',
                  kissOption: item.calculatorSelections?.kissOption?.displayValue || '',
                  // Add essential product info
                  category: item.category || 'custom-stickers',
                  actualQuantity: item.quantity.toString(), // Store actual quantity in metadata
                  discountApplied: discountAmount > 0 ? 'true' : 'false',
                  originalPrice: itemTotalPrice.toFixed(2),
                  discountAmount: itemDiscountAmount.toFixed(2)
                }
              },
              // Use discounted price for Stripe checkout
              unit_amount: Math.round(discountedItemPrice * 100), // Discounted price in cents
            },
            quantity: 1, // Always 1, actual quantity is in product description and metadata
          };

          // Add recurring configuration for subscriptions
          if (isSubscription) {
            lineItemConfig.price_data.recurring = {
              interval: subscriptionInterval
            };
          }

          return lineItemConfig;
        }),
        mode: isSubscription ? 'subscription' : 'payment',
        success_url: `${orderData.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: orderData.cancelUrl,
        metadata: {
          orderId: orderData.orderId,
          userId: orderData.userId || 'guest',
          customerOrderId: orderData.customerOrderId || '',
          orderNote: (orderData.orderNote || '').substring(0, 450), // Truncate to 450 chars to stay under 500 limit (full note saved in DB)
          itemCount: orderData.cartMetadata?.itemCount?.toString() || '0',
          originalTotalAmount: orderData.cartMetadata?.subtotalAmount || '0.00',
          discountCode: orderData.cartMetadata?.discountCode || '',
          discountAmount: orderData.cartMetadata?.discountAmount || '0.00',
          creditsApplied: orderData.cartMetadata?.creditsApplied || '0.00',
          totalAmount: orderData.cartMetadata?.totalAmount || '0.00',
          isTaxExempt: isTaxExempt.toString(),
          // Customer information as fallback
          customerFirstName: orderData.customerFirstName || '',
          customerLastName: orderData.customerLastName || '',
          customerEmail: orderData.customerEmail || '',
          customerPhone: orderData.customerPhone || '',
          // Additional payment fields
          isAdditionalPayment: orderData.cartMetadata?.isAdditionalPayment?.toString() || 'false',
          originalOrderId: orderData.cartMetadata?.originalOrderId || '',
          // Subscription-specific metadata
          isSubscription: isSubscription.toString(),
          subscriptionInterval: isSubscription ? subscriptionInterval : '',
          ...orderData.metadata // Include any additional metadata from the request
        }
      };

      // Always collect shipping address (needed for both custom orders and Pro membership stickers)
      sessionConfig.shipping_address_collection = {
        allowed_countries: ['US', 'CA'], // Add more countries as needed
      };

      // Always enable phone number collection
      sessionConfig.phone_number_collection = {
        enabled: true
      };

      // Always collect customer name - REQUIRED for all orders
      sessionConfig.customer_creation = 'always';

      // Only enable automatic tax for non-subscription products
      // (subscriptions are typically tax-exempt memberships)
      if (!isSubscription) {
        sessionConfig.automatic_tax = {
          enabled: true
        };
        sessionConfig.customer_update = {
          shipping: 'auto'
        };
      }

      // Add customer information
      if (customerId) {
        sessionConfig.customer = customerId;
      } else {
        sessionConfig.customer_email = orderData.customerEmail;
      }

      // Determine shipping options based on product type
      let shippingOptions;
      
      if (orderData.hasMarketplaceProducts) {
        // Market Space products: Auto-select USPS First-Class for 10+ items
        const marketplaceQty = orderData.marketplaceProductQuantity || 0;
        const shouldAutoSelectFirstClass = marketplaceQty >= 10;
        
        console.log(`🏪 Market Space products detected - using market space shipping options (${marketplaceQty} items${shouldAutoSelectFirstClass ? ', auto-selecting First-Class' : ''})`);
        
        if (shouldAutoSelectFirstClass) {
          // For 10+ items: Put USPS First-Class first (auto-selected), then other options
          shippingOptions = [
            {
              shipping_rate_data: {
                type: 'fixed_amount',
                fixed_amount: {
                  amount: 400, // $4.00
                  currency: 'usd',
                },
                display_name: 'USPS First-Class (Recommended for 10+ Items)',
                delivery_estimate: {
                  minimum: {
                    unit: 'business_day',
                    value: 1,
                  },
                  maximum: {
                    unit: 'business_day',
                    value: 3,
                  },
                },
              },
            },
            {
              shipping_rate_data: {
                type: 'fixed_amount',
                fixed_amount: {
                  amount: 0, // Free shipping
                  currency: 'usd',
                },
                display_name: 'USPS Stamp (No Tracking)',
                delivery_estimate: {
                  minimum: {
                    unit: 'business_day',
                    value: 3,
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
                  amount: 800, // $8.00 upgrade
                  currency: 'usd',
                },
                display_name: 'UPS Ground (Tracking Included)',
                delivery_estimate: {
                  minimum: {
                    unit: 'business_day',
                    value: 2,
                  },
                  maximum: {
                    unit: 'business_day',
                    value: 5,
                  },
                },
              },
            },
          ];
        } else {
          // For <10 items: Standard order with free USPS Stamp first
          shippingOptions = [
            {
              shipping_rate_data: {
                type: 'fixed_amount',
                fixed_amount: {
                  amount: 0, // Free shipping
                  currency: 'usd',
                },
                display_name: 'USPS Stamp (No Tracking)',
                delivery_estimate: {
                  minimum: {
                    unit: 'business_day',
                    value: 3,
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
                  amount: 400, // $4.00
                  currency: 'usd',
                },
                display_name: 'USPS First-Class (Tracking Included)',
                delivery_estimate: {
                  minimum: {
                    unit: 'business_day',
                    value: 1,
                  },
                  maximum: {
                    unit: 'business_day',
                    value: 3,
                  },
                },
              },
            },
            {
              shipping_rate_data: {
                type: 'fixed_amount',
                fixed_amount: {
                  amount: 800, // $8.00 upgrade
                  currency: 'usd',
                },
                display_name: 'UPS Ground (Tracking Included)',
                delivery_estimate: {
                  minimum: {
                    unit: 'business_day',
                    value: 2,
                  },
                  maximum: {
                    unit: 'business_day',
                    value: 5,
                  },
                },
              },
            },
          ];
        }
      } else {
        // Custom products: Standard shipping options
        console.log('🎨 Custom products detected - using standard shipping options');
        shippingOptions = [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: {
                amount: 0, // Free shipping - adjust as needed
                currency: 'usd',
              },
              display_name: 'UPS Ground',
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
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: {
                amount: 2000, // $20.00
                currency: 'usd',
              },
              display_name: 'UPS 2nd Day Air',
              delivery_estimate: {
                minimum: {
                  unit: 'business_day',
                  value: 2,
                },
                maximum: {
                  unit: 'business_day',
                  value: 2,
                },
              },
            },
          },
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: {
                amount: 4000, // $40.00
                currency: 'usd',
              },
              display_name: 'UPS Next Day Air',
              delivery_estimate: {
                minimum: {
                  unit: 'business_day',
                  value: 1,
                },
                maximum: {
                  unit: 'business_day',
                  value: 1,
                },
              },
            },
          },
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: {
                amount: 0, // Free local pickup
                currency: 'usd',
              },
              display_name: 'Local Pickup (Denver, CO)',
              delivery_estimate: {
                minimum: {
                  unit: 'business_day',
                  value: 1,
                },
                maximum: {
                  unit: 'business_day',
                  value: 1,
                },
              },
            },
          },
        ];
      }

      // Create session with or without shipping options
      const sessionCreateData = {
        ...sessionConfig
      };

      // Only add shipping options for non-subscription products
      // Subscriptions can collect addresses but can't have shipping_options
      if (!isSubscription) {
        sessionCreateData.shipping_options = shippingOptions;
      } else {
        // For subscriptions, add metadata to subscription so we can retrieve it later
        sessionCreateData.subscription_data = {
          metadata: {
            plan: orderData.metadata?.plan || subscriptionInterval,
            checkout_session_id: '{CHECKOUT_SESSION_ID}' // Stripe will replace this
          }
        };
      }

      const session = await this.stripe.checkout.sessions.create(sessionCreateData);
      
      // Update subscription metadata with actual session ID for Pro subscriptions
      if (isSubscription && session.subscription) {
        try {
          await this.stripe.subscriptions.update(session.subscription, {
            metadata: {
              ...sessionCreateData.subscription_data?.metadata,
              checkout_session_id: session.id
            }
          });
          console.log('✅ Updated subscription with checkout session ID');
        } catch (metadataError) {
          console.error('❌ Error updating subscription metadata:', metadataError);
        }
      }

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
        expand: ['line_items.data.price.product', 'customer', 'payment_intent', 'shipping_cost.shipping_rate']
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

    // Debug logging for webhook signature verification
    console.log('🔍 StripeClient webhook verification debug:', {
      payloadType: typeof payload,
      payloadIsBuffer: Buffer.isBuffer(payload),
      payloadLength: payload ? payload.length : 0,
      hasSignature: !!signature,
      hasEndpointSecret: !!endpointSecret,
      endpointSecretPrefix: endpointSecret ? endpointSecret.substring(0, 10) + '...' : 'NOT SET'
    });

    try {
      // Ensure payload is in the correct format for Stripe
      let payloadForVerification = payload;
      
      // Stripe expects payload as string or Buffer, but string is more reliable
      if (Buffer.isBuffer(payload)) {
        payloadForVerification = payload.toString('utf8');
      }
      
      console.log('🔍 Calling Stripe constructEvent with payload type:', typeof payloadForVerification);
      return this.stripe.webhooks.constructEvent(payloadForVerification, signature, endpointSecret);
    } catch (error) {
      console.error('❌ Stripe webhook signature verification error:', {
        message: error.message,
        type: error.type,
        code: error.code,
        requestId: error.requestId,
        payloadPreview: payload ? payload.toString().substring(0, 200) + '...' : 'NO PAYLOAD',
        signaturePreview: signature ? signature.substring(0, 100) + '...' : 'NO SIGNATURE'
      });
      
      // Re-throw the original Stripe error for better debugging
      throw error;
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