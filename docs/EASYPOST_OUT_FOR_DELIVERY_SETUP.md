# EasyPost "Out for Delivery" Tracking Setup

## How EasyPost Tracking Works with Your Dashboard

Your system now has **enhanced EasyPost tracking** that automatically updates order statuses when packages are "out for delivery" and shows this on the customer dashboard progress bar.

## Tracking Status Flow

EasyPost sends webhook updates when tracking status changes:

### Status Progression:
1. **`pre_transit`** → Order Status: "Label Printed" (Progress Step 3)
2. **`in_transit`** → Order Status: "Shipped" (Progress Step 4) 
3. **`out_for_delivery`** → Order Status: "Out for Delivery" (Progress Step 5) 🚚
4. **`delivered`** → Order Status: "Delivered" (Progress Step 6) ✅

## Setup Requirements

### 1. EasyPost Webhook Configuration

In your EasyPost dashboard (https://easypost.com/account/webhooks):

**Test Environment:**
- URL: `https://stickershuttle-production.up.railway.app/webhooks/easypost`
- Environment: Test
- Events: `tracker.updated` (minimum required)

**Production Environment:**
- URL: `https://stickershuttle-production.up.railway.app/webhooks/easypost`  
- Environment: Production
- Events: `tracker.updated` (minimum required)

### 2. Database Requirements

Your database needs these columns in `orders_main`:

```sql
-- Essential tracking columns (you should already have these)
tracking_number TEXT,
tracking_company TEXT, 
tracking_url TEXT,

-- Enhanced tracking columns (automatically added by new system)
easypost_tracker_id TEXT,
estimated_delivery_date DATE,
tracking_details JSONB
```

### 3. When Trackers Are Created

Trackers are automatically created when:

1. **Shipping labels are purchased** via admin panel
2. **Manual creation** via GraphQL mutation: `createEasyPostTracker`
3. **Bulk refresh** via GraphQL mutation: `refreshAllActiveTracking`

## Dashboard Features

### Progress Bar Updates

Your customer dashboard already shows these statuses:

- 🏷️ **Label Printed** (Step 3)
- 📦 **Shipped** (Step 4)  
- 🚚 **Out for Delivery** (Step 5) ← **This is the key feature!**
- ✅ **Delivered** (Step 6)

### Track Order Button

The "Track Order" button appears when:
- Order status is "Shipped", "Out for Delivery", or "Delivered"
- Tracking number exists
- Links directly to carrier tracking page

## How to Test

### 1. Create Test Shipment
```bash
# Use admin panel to create shipping label for an order
# This automatically creates an EasyPost tracker
```

### 2. Simulate Status Updates

In EasyPost test mode, you can manually update tracking status:

```bash
# Use EasyPost dashboard test tools
curl -X POST https://api.easypost.com/v2/trackers/trk_test_123/events \
  -u "your_test_api_key:" \
  -d "description=out_for_delivery"
```

### 3. Force Refresh All Tracking

```graphql
mutation RefreshAllTracking {
  refreshAllActiveTracking {
    success
    message
    processedCount
    errors
  }
}
```

### 4. Refresh Single Order

```graphql
mutation RefreshOrderTracking($orderId: ID!) {
  refreshOrderTracking(orderId: $orderId) {
    success
    message
    trackingCode
    status
    carrier
    publicUrl
    estDeliveryDate
  }
}
```

## Troubleshooting

### Status Not Updating

1. **Check Railway API logs:**
   ```bash
   railway logs --service api
   ```

2. **Look for webhook receipt:**
   ```
   📦 EasyPost webhook received
   📍 Enhanced tracking update: EZ1000000001 -> out_for_delivery
   🚚 Order SS-12345 is OUT FOR DELIVERY!
   ✅ Tracking update processed successfully
   ```

3. **Verify webhook URL is reachable:**
   ```bash
   curl -X POST https://stickershuttle-production.up.railway.app/webhooks/easypost
   ```

### Missing Out for Delivery Status

1. **Check order has tracking number:**
   ```sql
   SELECT id, tracking_number, order_status, tracking_company 
   FROM orders_main 
   WHERE customer_email = 'your-email@example.com';
   ```

2. **Check EasyPost tracker exists:**
   ```sql
   SELECT id, tracking_number, easypost_tracker_id, order_status
   FROM orders_main 
   WHERE tracking_number IS NOT NULL;
   ```

3. **Force refresh specific order:**
   ```graphql
   mutation {
     refreshOrderTracking(orderId: "your-order-id") {
       success
       status
       message
     }
   }
   ```

### Dashboard Not Showing Updates

1. **Hard refresh browser** (Ctrl+F5)
2. **Check network tab** for GraphQL errors
3. **Verify order status** in database:
   ```sql
   SELECT order_status, fulfillment_status, tracking_number 
   FROM orders_main WHERE id = 'your-order-id';
   ```

## Key Features Added

### ✅ Enhanced Webhook Processing
- Better error handling
- Detailed logging
- Automatic order status mapping

### ✅ Progress Step Mapping  
- Each EasyPost status maps to specific progress step
- "Out for Delivery" = Step 5 of 6

### ✅ GraphQL Mutations
- `createEasyPostTracker` - Manual tracker creation
- `refreshOrderTracking` - Single order refresh  
- `refreshAllActiveTracking` - Bulk refresh

### ✅ Automatic Tracking Creation
- When shipping labels are purchased
- Tracking data automatically saved to database

### ✅ Real-time Status Updates
- EasyPost webhooks trigger immediate updates
- No polling required

## Next Steps

1. **Set up EasyPost webhooks** (if not already done)
2. **Test with a real shipment** in test mode
3. **Monitor Railway logs** for webhook activity
4. **Verify customer dashboard** shows correct status

The system is now ready to automatically show "Out for Delivery" status on your customer dashboard progress bars! 🚚✨ 