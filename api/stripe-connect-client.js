const Stripe = require('stripe');

class StripeConnectClient {
  constructor() {
    this.stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    this.stripe = null;
    
    if (this.stripeSecretKey) {
      try {
        this.stripe = new Stripe(this.stripeSecretKey);
        console.log('✅ Stripe Connect client initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Stripe Connect client:', error);
      }
    } else {
      console.warn('⚠️ STRIPE_SECRET_KEY not found in environment variables');
    }
  }

  isReady() {
    return this.stripe !== null;
  }

  getStripe() {
    if (!this.stripe) {
      throw new Error('Stripe not initialized. Please check your STRIPE_SECRET_KEY.');
    }
    return this.stripe;
  }

  // Create Express account for creator
  async createExpressAccount(creatorData) {
    if (!this.isReady()) {
      throw new Error('Stripe Connect client not ready');
    }

    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: creatorData.country || 'US',
        email: creatorData.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          creator_id: creatorData.creatorId,
          creator_name: creatorData.creatorName,
          platform: 'sticker_shuttle'
        }
      });

      console.log('✅ Express account created:', account.id);
      return account;
    } catch (error) {
      console.error('❌ Error creating Express account:', error);
      throw error;
    }
  }

  // Create account onboarding link
  async createAccountLink(accountId, refreshUrl, returnUrl) {
    if (!this.isReady()) {
      throw new Error('Stripe Connect client not ready');
    }

    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      console.log('✅ Account link created for:', accountId);
      return accountLink;
    } catch (error) {
      console.error('❌ Error creating account link:', error);
      throw error;
    }
  }

  // Create login link for Express Dashboard
  async createLoginLink(accountId) {
    if (!this.isReady()) {
      throw new Error('Stripe Connect client not ready');
    }

    try {
      const loginLink = await this.stripe.accounts.createLoginLink(accountId);
      console.log('✅ Login link created for:', accountId);
      return loginLink;
    } catch (error) {
      console.error('❌ Error creating login link:', error);
      throw error;
    }
  }

  // Retrieve account details
  async retrieveAccount(accountId) {
    if (!this.isReady()) {
      throw new Error('Stripe Connect client not ready');
    }

    try {
      const account = await this.stripe.accounts.retrieve(accountId);
      return account;
    } catch (error) {
      console.error('❌ Error retrieving account:', error);
      throw error;
    }
  }

  // Create transfer to connected account
  async createTransfer(amount, currency, destination, metadata = {}) {
    if (!this.isReady()) {
      throw new Error('Stripe Connect client not ready');
    }

    try {
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        destination: destination,
        metadata: {
          ...metadata,
          platform: 'sticker_shuttle'
        }
      });

      console.log('✅ Transfer created:', transfer.id);
      return transfer;
    } catch (error) {
      console.error('❌ Error creating transfer:', error);
      throw error;
    }
  }

  // Split payment between platform and creator
  async splitPayment(paymentIntentId, creatorAccountId, creatorAmount, platformFee, metadata = {}) {
    if (!this.isReady()) {
      throw new Error('Stripe Connect client not ready');
    }

    try {
      // Calculate amounts in cents
      const creatorAmountCents = Math.round(creatorAmount * 100);
      const platformFeeCents = Math.round(platformFee * 100);

      // Create transfer to creator account
      const transfer = await this.stripe.transfers.create({
        amount: creatorAmountCents,
        currency: 'usd',
        destination: creatorAccountId,
        source_transaction: paymentIntentId,
        metadata: {
          ...metadata,
          platform: 'sticker_shuttle',
          type: 'creator_payout'
        }
      });

      console.log('✅ Payment split completed:', {
        transfer_id: transfer.id,
        creator_amount: creatorAmount,
        platform_fee: platformFee
      });

      return transfer;
    } catch (error) {
      console.error('❌ Error splitting payment:', error);
      throw error;
    }
  }

  // Get account balance
  async getAccountBalance(accountId) {
    if (!this.isReady()) {
      throw new Error('Stripe Connect client not ready');
    }

    try {
      const balance = await this.stripe.balance.retrieve({
        stripeAccount: accountId
      });
      
      return balance;
    } catch (error) {
      console.error('❌ Error retrieving account balance:', error);
      throw error;
    }
  }

  // List payouts for account
  async listPayouts(accountId, limit = 10, startingAfter = null) {
    if (!this.isReady()) {
      throw new Error('Stripe Connect client not ready');
    }

    try {
      const params = {
        limit,
        stripeAccount: accountId
      };

      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const payouts = await this.stripe.payouts.list(params);
      return payouts;
    } catch (error) {
      console.error('❌ Error listing payouts:', error);
      throw error;
    }
  }

  // Validate webhook signature for Connect events
  validateConnectWebhook(payload, signature, endpointSecret) {
    if (!this.isReady()) {
      throw new Error('Stripe Connect client not ready');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, endpointSecret);
      return event;
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const stripeConnectClient = new StripeConnectClient();

module.exports = stripeConnectClient;
