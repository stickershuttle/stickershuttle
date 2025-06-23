# EasyPost Webhook Setup Guide

## Required Webhook URLs

### Test Environment
```
https://stickershuttle-production.up.railway.app/webhooks/easypost
```

### Production Environment  
```
https://stickershuttle-production.up.railway.app/webhooks/easypost
```

## Webhook Events to Subscribe To

Subscribe to these EasyPost webhook events:

### Tracker Events
- `tracker.created` - When a tracker is created
- `tracker.updated` - When tracking status changes (MOST IMPORTANT)

### Shipment Events (Optional)
- `shipment.purchased` - When a label is purchased
- `shipment.label_created` - When shipping label is generated

## How to Set Up in EasyPost Dashboard

1. **Login to EasyPost Dashboard**
   - Go to https://easypost.com/account/webhooks

2. **Add Webhook for Test Environment**
   - Click "Add Webhook"
   - URL: `https://stickershuttle-production.up.railway.app/webhooks/easypost`
   - Environment: **Test**
   - Events: Select `tracker.updated` (minimum required)
   - Webhook Secret: `easypost_test_webhook_secret` (or leave blank)

3. **Add Webhook for Production Environment**
   - Click "Add Webhook" 
   - URL: `https://stickershuttle-production.up.railway.app/webhooks/easypost`
   - Environment: **Production**
   - Events: Select `tracker.updated` (minimum required)
   - Webhook Secret: `easypost_prod_webhook_secret` (or leave blank)

## Environment Variables (if using webhook secrets)

Add these to your Railway environment variables:

```bash
EASYPOST_TEST_WEBHOOK_SECRET=easypost_test_webhook_secret
EASYPOST_PROD_WEBHOOK_SECRET=easypost_prod_webhook_secret
```

## Testing Webhooks

After setup, you can test by:

1. **Create a test shipment** through the admin panel
2. **Buy a shipping label** - this should trigger tracking creation
3. **Check Railway logs** for webhook receipt confirmation
4. **Verify order status** updates in admin panel

## Expected Webhook Payload

EasyPost will send tracking updates like this:

```json
{
  "description": "tracker.updated",
  "result": {
    "object": "Tracker",
    "tracking_code": "EZ1000000001", 
    "status": "in_transit",
    "carrier": "USPS",
    "est_delivery_date": "2024-01-15",
    "public_url": "https://tools.usps.com/go/TrackConfirmAction?tLabels=EZ1000000001"
  }
}
```

## Status Mapping

Our system maps EasyPost tracking statuses to order statuses:

| EasyPost Status | Order Status | Fulfillment Status |
|----------------|--------------|-------------------|
| `pre_transit` | Shipped | partial |
| `in_transit` | Shipped | partial |
| `out_for_delivery` | Out for Delivery | partial |
| `delivered` | Delivered | fulfilled |
| `exception` | Shipping Issue | partial |
| `failure` | Shipping Issue | partial |

## Troubleshooting

### Webhook Not Receiving
- Check Railway API logs for webhook errors
- Verify webhook URL is accessible publicly
- Test webhook endpoint: `curl -X POST https://stickershuttle-production.up.railway.app/webhooks/easypost`

### Status Not Updating
- Check Railway logs for database update errors
- Verify tracking number matches between EasyPost and order
- Check order exists in `orders_main` table

### Missing Tracking Info
- Ensure `reference` field in EasyPost shipment contains the order ID
- Verify tracking number is properly saved to order after label purchase
- Check that tracking company/URL are being saved correctly 