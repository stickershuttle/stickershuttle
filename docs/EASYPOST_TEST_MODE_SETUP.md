# EasyPost Test Mode Setup - Stop Paying for Test Labels! 💰

## The Problem
You've been charged real money for test labels because you're using **production API keys** instead of **test API keys**.

## The Solution
EasyPost provides separate API keys for testing that **DON'T CHARGE REAL MONEY**.

## Step 1: Get Your Test API Keys 🔑

### Login to EasyPost Dashboard
1. Go to https://easypost.com/account/api-keys
2. You'll see two sections:

**Test API Keys** (These are FREE!)
```
Test Secret Key: EZSK_test_xxxxxxxxxxxxxxx
Test Publishable Key: EZPK_test_xxxxxxxxxxxxxxx
```

**Production API Keys** (These charge real money!)
```
Production Secret Key: EZSK_live_xxxxxxxxxxxxxxx  
Production Publishable Key: EZPK_live_xxxxxxxxxxxxxxx
```

## Step 2: Update Your Environment Variables 🔧

### Railway Environment Variables
Add these to your Railway environment variables:

```bash
# EasyPost API Keys
EASYPOST_TEST_API_KEY=EZSK_test_your_actual_test_key_here
EASYPOST_PROD_API_KEY=EZSK_live_your_actual_prod_key_here

# Force test mode (optional)
EASYPOST_TEST_MODE=true
```

### Local Development (.env.local)
```bash
# EasyPost API Keys  
EASYPOST_TEST_API_KEY=EZSK_test_your_actual_test_key_here
EASYPOST_PROD_API_KEY=EZSK_live_your_actual_prod_key_here

# Development mode (automatically uses test keys)
NODE_ENV=development
```

## Step 3: How the Auto-Switching Works 🔄

The updated EasyPost client automatically chooses the right key:

### Test Mode (FREE!) 
**When:**
- `NODE_ENV !== 'production'` (development/local)
- OR `EASYPOST_TEST_MODE=true`

**Uses:** `EASYPOST_TEST_API_KEY`
**Result:** ✅ No real charges!

### Production Mode (Real Money!)
**When:**
- `NODE_ENV=production` AND `EASYPOST_TEST_MODE` is not set

**Uses:** `EASYPOST_PROD_API_KEY`  
**Result:** 💸 Real charges!

## Step 4: Verify Test Mode is Working 📋

### Check Railway Logs
When your API starts, you should see:
```
✅ EasyPost client initialized in TEST mode
🔑 Using API key: EZSK_tes...
💰 TEST MODE: No real charges will be made!
```

### When Buying Labels
You should see:
```
💳 Buying EasyPost shipment label in TEST mode...
💰 TEST MODE: This is a test purchase - no real money will be charged!
✅ EasyPost label purchased in TEST mode: shp_xxxxxxxxx
🎉 TEST MODE: No real money was charged - this was a test!
```

## Step 5: Test Everything Safely 🧪

Now you can:
1. ✅ Create test shipments (FREE)
2. ✅ Buy test labels (FREE)  
3. ✅ Generate test tracking numbers (FREE)
4. ✅ Test all webhooks (FREE)
5. ✅ Test all admin functionality (FREE)

## Test vs Production Differences 📊

| Feature | Test Mode | Production Mode |
|---------|-----------|-----------------|
| **Cost** | FREE ✅ | Real money 💸 |
| **Labels** | Fake/test labels | Real shipping labels |
| **Tracking** | Test tracking numbers | Real tracking numbers |
| **Webhooks** | Work normally | Work normally |
| **Admin Panel** | All features work | All features work |

## Quick Setup Commands 🚀

### For Railway (Production with Test Mode)
```bash
# Add these environment variables in Railway dashboard
EASYPOST_TEST_API_KEY=EZSK_test_your_key_here
EASYPOST_TEST_MODE=true
```

### For Local Development
```bash
# Add to your .env.local file
EASYPOST_TEST_API_KEY=EZSK_test_your_key_here
NODE_ENV=development
```

## Troubleshooting 🔍

### Still Getting Charged?
Check Railway logs for:
```
✅ EasyPost client initialized in PRODUCTION mode  # ❌ Bad!
💸 PRODUCTION MODE: Real charges will be made!    # ❌ Bad!
```

**Fix:** Add `EASYPOST_TEST_MODE=true` to Railway environment variables.

### API Key Format Check
- ✅ Test keys start with: `EZSK_test_` or `EZPK_test_`
- ❌ Prod keys start with: `EZSK_live_` or `EZPK_live_`

### Environment Variable Names
Make sure you're using the exact names:
- `EASYPOST_TEST_API_KEY` (not `EASYPOST_API_KEY`)
- `EASYPOST_PROD_API_KEY`

## Migration Steps 📝

### If You Currently Have `EASYPOST_API_KEY`

1. **Check what type of key it is:**
   - If it starts with `EZSK_test_` → rename to `EASYPOST_TEST_API_KEY`
   - If it starts with `EZSK_live_` → rename to `EASYPOST_PROD_API_KEY` AND get a test key

2. **Get the missing key** from EasyPost dashboard

3. **Add both keys** to your environment variables

4. **Set test mode** with `EASYPOST_TEST_MODE=true`

5. **Restart your Railway deployment**

## When to Use Production Mode 🎯

Only switch to production mode when:
- ✅ You've tested everything thoroughly in test mode
- ✅ You're ready to ship real packages to real customers
- ✅ You want to generate real tracking numbers
- ✅ You're okay with being charged real money

**Switch by removing or setting `EASYPOST_TEST_MODE=false` in Railway.**

---

## 🎉 Result: Free Testing!

After this setup:
- 💰 **Test all you want for FREE**
- 🧪 **Perfect for development and testing**
- 🚀 **Easy switch to production when ready**
- ✅ **No more surprise charges**

Your wallet will thank you! 💰✨ 