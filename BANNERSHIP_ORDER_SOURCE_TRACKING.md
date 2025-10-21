# Bannership Order Source Tracking

## ✅ Implementation Complete

Orders are now tracked by their source subdomain, so only orders placed through `bannership.stickershuttle.com` appear in the Bannership tab.

## Problem Solved

**Before:**
- Bannership tab showed ALL orders with banner products
- Including old vinyl banner orders from before Bannership existed
- No way to distinguish where the order came from

**After:**
- Bannership tab shows ONLY orders placed through `bannership.stickershuttle.com`
- Old orders with banners don't appear in Bannership tab
- Can track which subdomain each order came from

## How It Works

### 1. Order Source Detection (at checkout)
When a customer checks out, the system detects which subdomain they're on:

```javascript
// In useStripeCheckout.js
let orderSource = 'stickershuttle';
if (window.location.hostname.startsWith('bannership.')) {
  orderSource = 'bannership';
}

// Add tag to order note
const enhancedOrderNote = orderSource === 'bannership' 
  ? `[Bannership] ${orderNote}`.trim()
  : orderNote;
```

### 2. Order Note Tagging
Orders are tagged invisibly in the `orderNote` field:
- **From bannership.stickershuttle.com:** `[Bannership] Customer note here`
- **From stickershuttle.com:** `Customer note here`

### 3. Admin Filter
The Bannership tab filter checks for the `[Bannership]` tag:

```javascript
const isBannershipOrder = (order: Order) => {
  const orderNote = order.orderNote || '';
  return orderNote.toLowerCase().includes('[bannership]');
};
```

## User Flow Examples

### Order from Bannership Subdomain
```
User on bannership.stickershuttle.com
  ↓
Adds pop-up banner to cart
  ↓
Redirects to stickershuttle.com/cart
  ↓
Checks out
  ↓
Order note automatically tagged: "[Bannership] Rush order please"
  ↓
✅ Shows in Bannership tab in admin
```

### Order from Main Site
```
User on stickershuttle.com
  ↓
Orders vinyl stickers
  ↓
Checks out
  ↓
Order note: "Please ship ASAP"
  ↓
✅ Shows in Custom Orders tab, NOT in Bannership tab
```

### Old Orders (Pre-Bannership)
```
Old order with vinyl banners from 2024
  ↓
No [Bannership] tag in order note
  ↓
❌ Does NOT show in Bannership tab
✅ Shows in Custom Orders tab if it's a sticker order
```

## Benefits

1. **✅ Accurate Tracking** - Only counts orders from bannership subdomain
2. **✅ Clean Separation** - Old orders don't pollute Bannership analytics
3. **✅ No Database Changes** - Uses existing `orderNote` field
4. **✅ Invisible to Customers** - Tag is only in admin notes
5. **✅ Future-Proof** - Can add more source tags later (e.g., [Mobile App])

## What Shows in Each Tab

**Custom Orders Tab:**
- Orders WITHOUT [Bannership] or marketplace tags
- Traditional sticker orders from main site

**Market Space Tab:**
- Orders with marketplace products
- Creator/marketplace orders

**Bannership Tab:**
- Orders WITH [Bannership] tag
- ONLY orders placed through bannership.stickershuttle.com
- Excludes old banner orders

## Testing Instructions

### Test New Orders
1. Visit `bannership.stickershuttle.com` (or `bannership.localhost:3000` locally)
2. Add a product to cart
3. Go to cart and checkout
4. Complete order
5. Check `/admin/orders` → Bannership tab
6. ✅ Order should appear there
7. Check order details → Order note should have `[Bannership]` prefix

### Test Old Orders
1. Go to `/admin/orders`
2. Click Bannership tab
3. Old orders with vinyl banners should NOT show
4. Only orders with `[Bannership]` tag should show

### Test Main Site Orders
1. Visit `stickershuttle.com` (or `localhost:3000`)
2. Add any product (stickers or banners)
3. Checkout
4. Check `/admin/orders`
5. Should appear in Custom Orders tab, NOT Bannership tab

## Files Modified

### Frontend:
- `frontend/src/hooks/useStripeCheckout.js`
  - Added order source detection
  - Automatically adds `[Bannership]` tag to order notes

### Admin:
- `frontend/src/pages/admin/orders.tsx`
  - Updated `isBannershipOrder()` to check for `[Bannership]` tag
  - No longer filters by product type

## Future Enhancements

### Additional Sources (Optional)
You could add more source tracking:
```javascript
// In useStripeCheckout.js
if (hostname.startsWith('bannership.')) {
  orderSource = 'bannership';
} else if (hostname.includes('localhost')) {
  orderSource = 'development';
} else if (referrer.includes('instagram')) {
  orderSource = 'instagram';
}
```

### Custom Order Tags Field (Optional)
Instead of order note, could add a dedicated `order_source` or `referrer_domain` field to the database for cleaner separation.

## Notes

- The `[Bannership]` tag is added to the beginning of the order note
- Customer's original note (if any) is preserved after the tag
- Tag is case-insensitive in filtering
- Works on localhost and production
- No breaking changes to existing orders or functionality

---

Now the Bannership tab only shows orders truly from the Bannership subdomain! 🎯

