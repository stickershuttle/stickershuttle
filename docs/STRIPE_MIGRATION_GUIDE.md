# Stripe Migration Guide

This guide will help you complete the migration from Shopify to Stripe for payment processing.

## Overview

The migration replaces Shopify checkout with Stripe Checkout while maintaining:
- Order management in Supabase
- Customer data continuity
- Order tracking functionality
- All calculator features and custom configurations

## Prerequisites

1. **Stripe Account**: Sign up at https://stripe.com
2. **Stripe API Keys**: Get your keys from the Stripe Dashboard
3. **Webhook Endpoint**: Configure webhook in Stripe Dashboard

## Step 1: Environment Configuration

### API Environment Variables (.env)

```env
# Add these to your api/.env file
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Your webhook endpoint secret
FRONTEND_URL=http://localhost:3000 # Update for production
```

### Frontend Environment Variables (.env.local)

```env
# Add this to your frontend/.env.local file
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key
```

## Step 2: Database Updates

The Supabase schema needs these new columns in the `customer_orders` table:

```sql
-- Add Stripe-specific columns to customer_orders table
ALTER TABLE customer_orders 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stripe_payment_intent ON customer_orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_stripe_checkout_session ON customer_orders(stripe_checkout_session_id);
```

## Step 3: Stripe Webhook Configuration

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-api-domain.com/webhooks/stripe`
3. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Step 4: Testing the Integration

### Local Testing with Stripe CLI

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to local:
   ```bash
   stripe listen --forward-to localhost:4000/webhooks/stripe
   ```
4. Use the webhook secret provided by the CLI for local testing

### Test Checkout Flow

1. Add items to cart
2. Click checkout - should redirect to Stripe Checkout
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. Verify order appears in Supabase and dashboard

## Step 5: Production Deployment

### API Deployment

1. Set production environment variables in Railway/your hosting platform:
   - `STRIPE_SECRET_KEY` (use live key)
   - `STRIPE_WEBHOOK_SECRET` (from production webhook)
   - `FRONTEND_URL` (your production domain)

2. Ensure webhook endpoint is accessible

### Frontend Deployment

1. Set production environment variable in Vercel:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (use live key)

2. Update any hardcoded URLs to production domains

## Step 6: Migration Checklist

- [ ] Stripe account created and verified
- [ ] API keys configured in both environments
- [ ] Database schema updated
- [ ] Webhook endpoint configured and tested
- [ ] Local testing completed successfully
- [ ] Production environment variables set
- [ ] Production webhook endpoint verified
- [ ] Test order placed in production

## Features Comparison

| Feature | Shopify | Stripe |
|---------|---------|--------|
| Checkout | Shopify Checkout | Stripe Checkout |
| Payment Methods | Shopify Payments | Cards, wallets, bank transfers |
| Order Management | Shopify + Supabase | Supabase only |
| Webhooks | Multiple endpoints | Single endpoint |
| Refunds | Shopify Admin | Stripe Dashboard |
| Currency Support | Multi-currency | Multi-currency |
| Shipping | Built-in | Configured in checkout |

## Troubleshooting

### Common Issues

1. **Webhook signature verification fails**
   - Ensure you're using the correct webhook secret
   - Check that raw body parsing is enabled for webhook route

2. **Checkout session creation fails**
   - Verify API keys are correct
   - Check that line items have valid data
   - Ensure prices are in cents (multiply by 100)

3. **Orders not appearing in Supabase**
   - Check webhook logs in Stripe Dashboard
   - Verify Supabase connection and credentials
   - Check API logs for errors

### Debug Mode

Enable detailed logging in development:

```javascript
// In api/stripe-client.js
console.log('Stripe checkout data:', checkoutData);

// In api/stripe-webhook-handlers.js
console.log('Webhook event:', event);
```

## Support

For issues or questions:
1. Check Stripe documentation: https://stripe.com/docs
2. Review API logs
3. Check Stripe Dashboard for webhook logs
4. Verify environment variables

## Next Steps

After successful migration:
1. Remove Shopify-specific code (keep for reference)
2. Update customer communications about the change
3. Monitor orders and webhooks for the first week
4. Set up Stripe reporting and analytics 

# Install Scoop if you don't have it
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install Stripe CLI
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe 