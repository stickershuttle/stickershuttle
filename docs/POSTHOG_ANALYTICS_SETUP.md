# PostHog Analytics Setup & Usage Guide

## Overview

Your Sticker Shuttle website now has comprehensive PostHog analytics tracking for key business metrics:

1. **Average Order Value (AOV)** - Track revenue per order
2. **Customer Lifetime Value (LTV)** - Track customer value over time  
3. **Turnaround Time** - Track time from order to shipping
4. **Repeat Purchase Rate** - Track customer retention
5. **Top Products Sold** - Track best performing products
6. **Proof Approval Time** - Track design workflow efficiency

## Environment Variables Setup

Add these environment variables to your deployments:

### Frontend (Vercel)
```bash
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Backend (Railway)
```bash
POSTHOG_PROJECT_API_KEY=your_posthog_api_key_here  
POSTHOG_HOST=https://us.i.posthog.com
```

## Events Being Tracked

### Order Flow Events
- `order_completed` - When an order is successfully paid
- `order_status_changed` - When order status updates
- `order_production_started` - When order enters "Printing" status
- `order_shipped` - When order is shipped (includes turnaround time)
- `order_delivered` - When order is delivered

### Customer Value Events
- `customer_value_update` - Updated customer spending data
- `customer_second_purchase` - When customer makes 2nd order
- `customer_high_value` - Customer with 5+ orders
- `first_repeat_purchase` - Customer's first repeat purchase
- `customer_purchase_pattern` - Customer behavior analytics

### Product Sales Events
- `product_sold` - Individual product sales
- `product_revenue` - Revenue tracking per product

### Proof Workflow Events
- `proof_created` - When proofs are generated
- `proof_approved` - When customer approves proofs

### Cart & Checkout Events
- `cart_checkout_initiated` - When checkout starts
- `user_checkout_started` - User engagement tracking

### Data Points for Calculations
- `aov_data_point` - Raw data for AOV calculations

## PostHog Dashboard Setup

### 1. Create Insights for Key Metrics

#### Average Order Value (AOV)
```sql
-- Create a trend insight
SELECT avg(toFloat64(properties.order_value)) as avg_order_value
FROM events 
WHERE event = 'aov_data_point'
AND properties.order_value != ''
GROUP BY toStartOfMonth(timestamp)
ORDER BY toStartOfMonth(timestamp)
```

#### Customer Lifetime Value (LTV)  
```sql
-- Create a funnel or cohort analysis
SELECT 
  properties.customer_email, 
  sum(toFloat64(properties.current_order_value)) as total_spent,
  count(*) as total_orders
FROM events
WHERE event = 'customer_value_update'
AND properties.current_order_value != ''
GROUP BY properties.customer_email
ORDER BY total_spent DESC
```

#### Turnaround Time
```sql
-- Average hours from order to shipping
SELECT avg(toFloat64(properties.turnaround_time_hours)) as avg_turnaround_hours
FROM events  
WHERE event = 'order_shipped'
AND properties.turnaround_time_hours != ''
```

#### Repeat Purchase Rate
```sql
-- Percentage of customers who made repeat purchases
SELECT 
  count(DISTINCT properties.customer_email) as repeat_customers,
  (SELECT count(DISTINCT properties.customer_email) FROM events WHERE event = 'order_completed') as total_customers,
  (count(DISTINCT properties.customer_email) * 100.0 / (SELECT count(DISTINCT properties.customer_email) FROM events WHERE event = 'order_completed')) as repeat_rate_percent
FROM events
WHERE event = 'customer_second_purchase'
```

#### Top Products by Revenue
```sql
SELECT 
  properties.product_name,
  sum(toFloat64(properties.revenue)) as total_revenue,
  sum(toInt64(properties.quantity)) as total_quantity,
  count(*) as total_orders
FROM events
WHERE event = 'product_revenue'
AND properties.revenue != ''
AND properties.quantity != ''
GROUP BY properties.product_name
ORDER BY total_revenue DESC
LIMIT 10
```

#### Proof Approval Time
```sql
SELECT avg(toFloat64(properties.proof_approval_time_hours)) as avg_approval_hours
FROM events
WHERE event = 'proof_approved'
AND properties.proof_approval_time_hours != ''
```

### 2. Create a Business Dashboard

1. Go to PostHog → Insights
2. Create new dashboard called "Sticker Shuttle Business Metrics"
3. Add insights for each metric above
4. Set up alerts for key thresholds

### 3. Recommended Dashboard Layout

```
+-------------------+-------------------+
|   Average Order   |  Monthly Revenue  |
|      Value        |     Trends        |
+-------------------+-------------------+
| Customer LTV      | Repeat Purchase   |
| Distribution      |      Rate         |
+-------------------+-------------------+
|  Turnaround Time  | Proof Approval    |
|    (Hours)        |    Time           |
+-------------------+-------------------+
|     Top Products by Revenue           |
+---------------------------------------+
|       Order Status Funnel            |
+---------------------------------------+
```

## Advanced Analytics

### Cohort Analysis
Track customer retention over time using the `customer_purchase_pattern` events.

### Funnel Analysis
Track conversion from cart → checkout → completed order using:
1. `cart_checkout_initiated`
2. `user_checkout_started` 
3. `order_completed`

### Revenue Attribution
Use `product_sold` events to track which products drive the most revenue and repeat purchases.

## Event Properties Reference

### Common Properties
- `customer_email` - Customer identifier
- `order_id` - Unique order ID
- `order_number` - Human-readable order number
- `timestamp` - Event timestamp
- `user_type` - 'registered' or 'guest'

### Order Events
- `order_value` - Total order amount
- `subtotal` - Order subtotal
- `tax_amount` - Tax amount
- `items_count` - Number of items
- `financial_status` - Payment status
- `order_status` - Fulfillment status
- `credits_used` - Store credits applied

### Product Events  
- `product_name` - Product name
- `product_category` - Product category
- `quantity` - Items sold
- `unit_price` - Price per unit
- `total_price` - Total for this product
- `revenue` - Revenue generated

### Time Tracking
- `hours_from_order_creation` - Hours since order placed
- `turnaround_time_hours` - Hours from order to ship
- `proof_approval_time_hours` - Hours to approve proof
- `hours_to_proof_creation` - Hours from order to proof

## Troubleshooting

### Events Not Appearing
1. Check PostHog key is set correctly
2. Check console for analytics errors
3. Verify network requests in browser dev tools

### Server Events Missing
1. Check `POSTHOG_PROJECT_API_KEY` in Railway
2. Check server logs for analytics initialization
3. Verify posthog-node package is installed

### Duplicate Events
This is normal - both client and server track some events for redundancy. Use filters in PostHog to dedupe if needed.

## Privacy & GDPR Compliance

- Customer emails are used as identifiers
- All tracking is opt-in based on PostHog's privacy settings
- No sensitive payment information is tracked
- Order IDs and customer emails can be masked if needed

## Performance Impact

- Client-side tracking is minimal (~2KB)
- Server-side events are async and non-blocking
- Failed analytics never block order processing
- Events are batched for efficiency

## Custom Events

To add custom tracking, use:

```javascript
// Frontend
import { analytics } from '@/lib/business-analytics';
analytics.trackUserEngagement('custom_event', { custom_data: 'value' });

// Backend  
const serverAnalytics = require('./business-analytics');
serverAnalytics.trackErrorServer('error_type', errorData, context);
``` 