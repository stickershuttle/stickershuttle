# Edge Function Setup Guide: Customer Order Status Notifications

This guide will help you set up automatic email notifications to customers when their order status changes.

## Overview

The system consists of:
1. **Database Trigger**: Detects order status changes in the `orders_main` table
2. **Edge Function**: Sends email notifications to customers
3. **Email Service**: Resend or SendGrid for actual email delivery

## Step 1: Deploy the Edge Function

First, make sure you have the Supabase CLI installed:

```bash
npm install -g supabase
```

Initialize Supabase (if not already done):

```bash
supabase init
```

Deploy the edge function:

```bash
supabase functions deploy notify-customer-status-change
```

## Step 2: Set Environment Variables

In your Supabase dashboard, go to Settings → Edge Functions and add these environment variables:

### Required Variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (from Supabase Settings → API)

### Email Service Variables (choose one):

#### Option A: Resend (Recommended)
- `EMAIL_SERVICE=resend`
- `RESEND_API_KEY`: Your Resend API key

#### Option B: SendGrid
- `EMAIL_SERVICE=sendgrid` 
- `SENDGRID_API_KEY`: Your SendGrid API key

## Step 3: Run Database Migrations

Run the migration files to set up the database trigger:

```sql
-- Run these in your Supabase SQL Editor:

-- Migration 1: Basic trigger setup
\i supabase/migrations/002_simpler_webhook_trigger.sql
```

## Step 4: Set Up Database Webhook

In your Supabase dashboard:

1. Go to **Database → Webhooks**
2. Click **Create a new hook**
3. Configure the webhook:
   - **Name**: `order-status-notifications`
   - **Table**: `orders_main`
   - **Events**: Select `Update`
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: `https://[your-project-ref].supabase.co/functions/v1/notify-customer-status-change`
   - **HTTP Headers**:
     ```
     Authorization: Bearer [your-service-role-key]
     Content-Type: application/json
     ```

## Step 5: Configure Email Templates

The edge function includes built-in email templates for different order statuses:

- Creating Proofs
- Awaiting Proof Approval  
- Proofs Approved
- In Production
- Ready to Ship
- Shipped
- Out for Delivery
- Delivered
- Cancelled
- Refunded

## Step 6: Test the Setup

### Manual Test
You can test the edge function directly:

```bash
curl -X POST 'https://[your-project-ref].supabase.co/functions/v1/notify-customer-status-change' \
  -H 'Authorization: Bearer [your-service-role-key]' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "UPDATE",
    "table": "orders_main",
    "record": {
      "id": "test-order-id",
      "order_status": "Shipped",
      "fulfillment_status": "fulfilled",
      "financial_status": "paid"
    },
    "old_record": {
      "order_status": "In Production",
      "fulfillment_status": "unfulfilled"
    }
  }'
```

### Database Test
Update an order status in your database:

```sql
UPDATE orders_main 
SET order_status = 'Shipped' 
WHERE id = 'your-test-order-id';
```

## Step 7: Monitor and Debug

### Check Edge Function Logs
```bash
supabase functions logs notify-customer-status-change
```

### Check Database Logs
```sql
-- Check notification tracking columns
SELECT 
  id,
  order_number,
  order_status,
  last_notification_sent_at,
  notification_status
FROM orders_main 
WHERE last_notification_sent_at IS NOT NULL
ORDER BY last_notification_sent_at DESC;
```

### View Recent Webhook Calls
In Supabase Dashboard → Database → Webhooks → View logs

## Customization Options

### Custom Email Templates
Edit the `generateEmailHtml()` function in the edge function to customize email design.

### Additional Notification Channels
Extend the edge function to send SMS, push notifications, or Slack messages.

### Status-Specific Logic
Add custom logic for specific order statuses in the edge function.

## Troubleshooting

### Common Issues:

1. **Webhook not triggering**: 
   - Check webhook configuration in Supabase dashboard
   - Verify webhook URL is correct
   - Check that events are selected properly

2. **Email not sending**:
   - Verify email service API key is correct
   - Check edge function logs for errors
   - Test email service API key separately

3. **Duplicate notifications**:
   - The system prevents duplicate notifications by checking if status actually changed
   - Monitor `last_notification_sent_at` column

4. **Function timeout**:
   - Edge functions have a 60-second timeout
   - If needed, implement retry logic for failed notifications

### Status Mapping

The system maps your order statuses to customer-friendly messages:

```typescript
'Creating Proofs' → 'Our design team is creating digital proofs...'
'Shipped' → 'Your package is on its way to you!'
'Delivered' → 'Your order has been successfully delivered!'
```

## Email Service Setup

### Resend Setup (Recommended)
1. Sign up at [resend.com](https://resend.com)
2. Verify your domain (orders@stickershuttle.com)
3. Get your API key from the dashboard
4. Add to Supabase environment variables

### SendGrid Setup
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Verify your domain
3. Create an API key with Mail Send permissions
4. Add to Supabase environment variables

## Security Notes

- Never expose service role keys in client-side code
- Use environment variables for all API keys
- Test thoroughly before deploying to production
- Monitor webhook logs for any suspicious activity

## Support

If you encounter issues:
1. Check the edge function logs first
2. Verify all environment variables are set
3. Test the webhook manually
4. Check email service status pages

This system will automatically notify customers about important order updates, improving their experience and reducing support inquiries. 