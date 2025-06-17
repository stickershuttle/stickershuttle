# Webhook Debugging Session - Order Sync Issue Resolution

**Date**: June 17, 2025  
**Issue**: Customer orders creating draft orders in Supabase but not converting to paid orders when payments complete  
**Status**: IN PROGRESS - Webhooks updated, testing required

---

## 🔍 Problem Summary

**Initial Issue**: Orders were creating draft entries in Supabase but not converting to paid status when customers completed payments through the Vercel frontend.

**Expected Behavior**: 
1. Customer places order → Draft order created
2. Customer completes payment → Webhook fires → Draft order converts to paid order
3. Paid order appears in customer dashboard

**Actual Behavior**: Only draft orders were appearing, no paid orders in dashboard.

---

## 🧪 Investigation Process

### 1. Initial System Architecture Verification

**Frontend**: Next.js deployed on Vercel (`https://stickershuttle.vercel.app`)  
**Backend**: Apollo Server on Railway (`https://stickershuttle-production.up.railway.app`)  
**Database**: Supabase  
**Payment**: Shopify dev store (`sticker-shuttle-dev.myshopify.com`) with Bogus Gateway  

### 2. Database Analysis

**Scripts Created**:
- `test-order-sync.js` - Check order status in Supabase
- `check-production-orders.js` - Verify production database state
- `simulate-paid-order-webhook.js` - Test webhook logic manually

**Initial Findings**:
```
📋 Draft Orders: 3
💰 Paid Orders: 0
🎯 Dashboard Shows: 0 orders (paid only)
```

**Dashboard filtering was correct** - it only shows paid orders, which was the intended behavior.

### 3. Webhook Configuration Analysis

**Scripts Created**:
- `check-dev-store-webhooks.js` - Verify Shopify webhook setup
- `check-shopify-webhooks.js` - Check webhook endpoints

**Initial Webhook Configuration**:
```
✅ orders/paid: https://stickershuttle-production.up.railway.app/webhooks/orders-paid
✅ orders/create: https://stickershuttle-production.up.railway.app/webhooks/orders-create  
✅ draft_orders/update: https://stickershuttle-production.up.railway.app/webhooks/draft-orders-update
```

Webhooks were properly configured in Shopify dev store.

### 4. Railway Server Investigation

**Critical Discovery**: Railway server was not responding to external requests!

**Test Results**:
```bash
# Health check failed
❌ Server health check failed: timeout of 5000ms exceeded
❌ Invoke-WebRequest timeout: The operation has timed out
```

**Root Cause Found**: Multiple Railway projects existed, but webhooks were pointing to the wrong one.

### 5. Railway Project Analysis

**Discovery**: User had 3 Railway projects:
- `stickershuttle-production` (DOWN - webhooks pointing here)
- `enchanting-upliftment` (ACTIVE - should be used)
- `gleaming-fascination` (unknown status)

**Scripts Created**:
- `test-railway-urls.js` - Test different Railway URL patterns
- `test-new-webhook-url.js` - Test updated webhook endpoints

**Working Railway URL Found**: `https://enchanting-upliftment-production.up.railway.app`

---

## 🛠️ Solutions Implemented

### 1. Enhanced Webhook Handlers

**File**: `api/webhook-handlers.js`

**Key Improvements**:
- Added `ensurePaidOrderInSupabase()` function to find matching draft orders by customer email and price
- Enhanced `orders/paid` webhook to convert draft orders to paid status
- Improved error handling and logging
- Added comprehensive order matching logic

**Code Enhancement**:
```javascript
// Enhanced logic to find matching draft orders and convert them to paid
async function ensurePaidOrderInSupabase(shopifyOrder) {
  // Find matching draft orders by email and price
  // Update them to paid status with real Shopify order ID
  // Prevent duplicate order creation
}
```

### 2. Webhook URL Correction

**Problem**: Webhooks pointing to inactive Railway project  
**Solution**: Updated Shopify webhooks to point to active Railway project

**Old URLs**:
```
https://stickershuttle-production.up.railway.app/webhooks/*
```

**New URLs**:
```
https://enchanting-upliftment-production.up.railway.app/webhooks/orders-paid
https://enchanting-upliftment-production.up.railway.app/webhooks/orders-create
https://enchanting-upliftment-production.up.railway.app/webhooks/draft-orders-update
https://enchanting-upliftment-production.up.railway.app/webhooks/orders-fulfilled
```

### 3. Comprehensive Testing Suite

**Created Diagnostic Scripts**:

1. **`test-order-sync.js`** - Check order status and identify issues
2. **`check-production-orders.js`** - Verify production database state  
3. **`check-dev-store-webhooks.js`** - Verify Shopify webhook configuration
4. **`check-recent-webhook-activity.js`** - Cross-reference Shopify orders with Supabase
5. **`simulate-paid-order-webhook.js`** - Test webhook processing logic
6. **`test-railway-urls.js`** - Find working Railway endpoints
7. **`test-new-webhook-url.js`** - Test updated webhook URLs
8. **`manual-webhook-test.js`** - Manual webhook testing

---

## 📊 Test Results & Verification

### Before Fix
```
📦 Shopify Order #1036: $520.00 - PAID ✅
📋 Supabase: Only draft orders, no paid orders ❌
🎯 Dashboard: Empty (correctly filtered) ❌
```

### During Investigation
**Confirmed**: 
- Payment processing worked (customer received confirmation email)
- Order #1036 existed as PAID in Shopify
- Webhook endpoints were unreachable (Railway server down)
- Draft order creation was working correctly

### After Railway URL Fix
**Updated Shopify Webhooks**: ✅ Completed  
**Railway Server**: ✅ Responding (404 on /health but server reachable)  
**Webhook Endpoints**: ⏳ Testing required  

---

## 🎯 Current Status

### ✅ Completed
1. **Enhanced webhook handlers** to properly convert draft orders to paid orders
2. **Fixed Railway URL** in Shopify webhook configuration
3. **Verified webhook routing** logic handles order matching correctly
4. **Created comprehensive test suite** for future debugging
5. **Deployed updates** to Railway via GitHub Actions

### ⏳ Pending Verification
1. **Live order test** - Need to place test order on Vercel site
2. **Webhook firing confirmation** - Verify Shopify sends webhooks to new URL
3. **Order conversion test** - Confirm draft orders convert to paid status
4. **Dashboard display** - Verify paid orders appear in customer dashboard

---

## 🧪 Testing Instructions

### Manual Test Process
1. **Go to**: `https://stickershuttle.vercel.app`
2. **Add product to cart** (use small value for testing)
3. **Proceed to checkout**
4. **Use Bogus Gateway**: Card number "1", any future expiry, any CVV
5. **Complete order**
6. **Run verification**: `node check-production-orders.js`
7. **Check dashboard**: Verify paid order appears

### Automated Verification
```bash
# Check current order status
node test-order-sync.js

# Verify webhook configuration  
node check-dev-store-webhooks.js

# Check production database
node check-production-orders.js

# Test webhook endpoints
node test-new-webhook-url.js
```

---

## 🔧 Technical Architecture

### Order Flow
```
Customer → Vercel Frontend → Shopify Checkout → Payment Gateway
                                     ↓
                              Webhook Triggers
                                     ↓
                    Railway Backend (enchanting-upliftment)
                                     ↓
                              Webhook Handlers
                                     ↓
                         Find Draft Order by Email/Price
                                     ↓
                         Convert to Paid Order in Supabase
                                     ↓
                           Customer Dashboard Shows Order
```

### Webhook Configuration
- **Store**: `sticker-shuttle-dev.myshopify.com`
- **API Version**: `2024-04`
- **Format**: JSON
- **Endpoint**: `https://enchanting-upliftment-production.up.railway.app`

### Database Schema
- **Table**: `customer_orders`
- **Key Fields**: `shopify_order_id`, `order_status`, `financial_status`, `customer_email`, `total_price`
- **Status Flow**: `pending` (draft) → `paid` (completed)

---

## 📝 Lessons Learned

1. **Multiple Railway Projects**: Always verify which project is active and receiving traffic
2. **Webhook URL Verification**: Test webhook endpoints independently of Shopify configuration
3. **Order Matching Logic**: Use multiple criteria (email + price) to match draft orders to paid orders
4. **Comprehensive Testing**: Create diagnostic scripts for complex webhook workflows
5. **Environment Consistency**: Ensure dev/staging/prod environments use correct service URLs

---

## 🚀 Next Steps

1. **Complete live order test** to verify webhook processing
2. **Monitor Railway logs** during order placement for webhook activity
3. **Verify dashboard functionality** shows paid orders correctly
4. **Document successful test** for future reference
5. **Consider webhook verification** for additional security

---

## 📞 Support Information

**Files Modified**:
- `api/webhook-handlers.js` - Enhanced order processing logic
- Shopify webhook configuration - Updated Railway URLs
- Created 8 diagnostic scripts for testing

**Key Functions Enhanced**:
- `ensurePaidOrderInSupabase()` - Order matching and conversion
- `syncOrderToSupabase()` - Improved order creation
- `orders/paid` webhook handler - Enhanced processing logic

**Testing Commands**:
```bash
# Quick status check
node test-order-sync.js

# Full system verification  
node check-production-orders.js && node check-dev-store-webhooks.js
```

---

*Session logged on June 17, 2025 - Webhook debugging and Railway URL correction completed* 