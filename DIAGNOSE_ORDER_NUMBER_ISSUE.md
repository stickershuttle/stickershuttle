# Diagnosing Order Number Issue

## The Problem

Orders showing "#A..." format instead of "SS-XXXX" format means the Stripe webhook isn't updating the order after payment.

## How Order Numbers Work

```
Step 1: User clicks "Checkout" on cart page
  ↓
Step 2: Backend creates order in Supabase with:
  - financial_status: 'pending'
  - order_status: 'Awaiting Payment'  
  - order_number: NULL (or temporary ID)
  - stripe_session_id: NULL (initially)
  ↓
Step 3: Backend creates Stripe checkout session
  ↓
Step 4: Backend updates order with stripe_session_id
  ↓ (USER GETS REDIRECTED TO STRIPE)
Step 5: User completes payment on Stripe
  ↓
Step 6: Stripe sends webhook to your backend
  ↓
Step 7: Webhook finds order by stripe_session_id
  ↓
Step 8: Webhook calls generateOrderNumber()
  ↓
Step 9: Webhook updates order with:
  - order_number: "SS-1234"
  - financial_status: 'paid'
  - order_status: 'Building Proof'
  ↓
✅ Order now has SS- number!
```

## Where It's Failing

The "#A..." you're seeing is likely Stripe's checkout session ID showing in the frontend before the order_number is set.

## Diagnostic Steps

### 1. Check Supabase Directly

Go to your Supabase dashboard and open the `orders_main` table for the test order:

**Look for:**
- `stripe_session_id` - Should have a value like "cs_test_..."
- `order_number` - What does it say?
- `financial_status` - Should be "paid" after checkout
- `order_status` - Should be "Building Proof" or "Printing"

**What each means:**
- If `stripe_session_id` is NULL → Step 4 failed (session ID not saved)
- If `order_number` is NULL → Step 8/9 failed (webhook didn't update)
- If `financial_status` is 'pending' → Webhook never fired
- If `financial_status` is 'paid' but no order_number → Webhook fired but generateOrderNumber failed

### 2. Check Stripe Webhook Logs

1. Go to Stripe Dashboard → Developers → Webhooks
2. Find your webhook endpoint (should be your Railway URL + `/webhooks/stripe`)
3. Look for `checkout.session.completed` events
4. Check if they're succeeding or failing

**Common Issues:**
- ❌ Webhook endpoint not reachable (Railway down?)
- ❌ Webhook secret mismatch
- ❌ Webhook timing out
- ❌ Database error in webhook handler

### 3. Check Railway Logs

If you have access to Railway logs:
1. Search for "checkout.session.completed"
2. Look for errors after payment
3. Check for "generateOrderNumber" logs
4. Look for database errors

## Quick Fixes

### If stripe_session_id is NULL:

**Problem:** Session ID not being saved to order  
**Solution:** Check this code in `api/index.js` around line 7964:

```javascript
// This should run and succeed:
await client.rpc('update_order_stripe_session', {
  p_order_id: customerOrder.id,
  p_session_id: sessionResult.sessionId
});
```

**Check if this RPC function exists in Supabase!**

### If stripe_session_id exists but order_number is NULL:

**Problem:** Webhook isn't updating the order  
**Possible causes:**
1. Webhook endpoint not configured in Stripe
2. Webhook secret env var missing/wrong
3. Webhook firing but failing silently

**Solution:** 
1. Check `STRIPE_WEBHOOK_SECRET` in Railway env vars
2. Check webhook endpoint is configured in Stripe dashboard
3. Make sure Railway deployment is live and healthy

### Manual Fix (Temporary):

If you need to fix existing orders manually, you can run this in Supabase SQL editor:

```sql
-- For a specific order
UPDATE orders_main 
SET order_number = 'SS-1234'  -- Use next available number
WHERE id = 'your-order-id-here';

-- To find the next available number:
SELECT order_number 
FROM orders_main 
WHERE order_number LIKE 'SS-%'
ORDER BY order_number DESC 
LIMIT 1;
```

## Testing After Fix

1. Place a new test order
2. After checkout, wait 15-30 seconds
3. Refresh admin orders page
4. Order number should show "SS-XXXX"
5. Check Supabase `order_number` field directly

## Most Likely Cause

Based on your issue, I suspect the RPC function `update_order_stripe_session` might not exist in your Supabase database, causing Step 4 to fail silently.

**To verify:** 
Run this in Supabase SQL Editor:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
AND routine_name = 'update_order_stripe_session';
```

If it returns no rows, that's the problem!

**To fix:** Create the function:
```sql
CREATE OR REPLACE FUNCTION update_order_stripe_session(
  p_order_id uuid,
  p_session_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE orders_main
  SET stripe_session_id = p_session_id,
      updated_at = now()
  WHERE id = p_order_id;
END;
$$;
```

---

Let me know what you find in Supabase for the test order and I can help debug further!

