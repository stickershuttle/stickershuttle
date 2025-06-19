# EasyPost Integration Guide

This guide walks you through setting up the EasyPost shipping integration for Sticker Shuttle.

## What You Get

✅ **Replace ShipStation with EasyPost** - Modern shipping API with better rates  
✅ **Pre-filled Customer Info** - Order details automatically pulled from Supabase  
✅ **Multi-Carrier Support** - USPS, UPS, FedEx, and more in one interface  
✅ **Real-time Rates** - Compare shipping costs across carriers  
✅ **Smart Package Calculation** - Automatic dimensions/weight based on order items  
✅ **Integrated Label Printing** - Generate and download shipping labels instantly  
✅ **Tracking Integration** - Automatic tracking number generation and customer notifications  

## Setup Steps

### 1. Get EasyPost API Keys

1. Sign up at [EasyPost.com](https://www.easypost.com/)
2. Get your **Test API Key** from the dashboard
3. Later, get your **Production API Key** when ready to go live

### 2. Add Environment Variables

Add your EasyPost API key to your environment files:

#### In your `.env` (API directory)
```bash
# EasyPost Configuration
EASYPOST_API_KEY=EZAK_your_test_api_key_here
```

#### In production (Railway/your deployment)
Add the same variable to your deployment environment.

### 3. Update Your Business Address

Edit `api/easypost-client.js` and update the `fromAddress` in the `createEasyPostShipment` mutation:

```javascript
// Replace this section with your actual business address:
const fromAddress = {
  name: 'Sticker Shuttle',
  company: 'Sticker Shuttle',
  street1: '123 Business St', // ← Your actual address
  street2: null,
  city: 'Your City', // ← Your actual city
  state: 'CA', // ← Your actual state
  zip: '12345', // ← Your actual ZIP
  country: 'US',
  phone: '555-123-4567', // ← Your actual phone
  email: 'shipping@stickershuttle.com' // ← Your actual email
};
```

### 4. Test the Integration

1. Make sure your API is running with the new EasyPost dependency:
   ```bash
   cd api
   npm install  # This installs @easypost/api
   npm start
   ```

2. In your admin interface, find an order and click "Ship Order"
3. The EasyPost modal should open with:
   - Customer shipping address pre-filled
   - Package dimensions calculated from order items
   - Available shipping rates from multiple carriers

## How It Works

### 1. When You Click "Ship Order"

The system:
1. Fetches the order details from Supabase
2. Calculates package dimensions based on your order items
3. Sends order data to EasyPost API
4. Returns available shipping rates from all carriers

### 2. Package Calculation Logic

The system automatically estimates:
- **Weight**: Based on product type (stickers = 0.1oz, banners = 4oz)
- **Dimensions**: Based on item sizes from calculator selections
- **Minimum Package**: 6" x 4" x 1" minimum for shipping

### 3. Rate Selection

You can:
- Compare rates across USPS, UPS, FedEx, etc.
- See delivery times and guaranteed dates
- Add optional insurance
- Select the best rate for your customer

### 4. Label Generation

After selecting a rate:
- Generates official shipping label
- Creates tracking number
- Provides download link for label
- Updates order with tracking info (if implemented)

## Customization Options

### Package Weight/Dimension Rules

Edit `estimateItemWeight()` and `estimateItemDimensions()` in `api/easypost-client.js`:

```javascript
estimateItemWeight(item) {
  const quantity = item.quantity || 1;
  let baseWeight = 1; // Default 1 oz

  // Customize for your products
  if (item.productCategory) {
    const category = item.productCategory.toLowerCase();
    if (category.includes('sticker')) {
      baseWeight = 0.1; // Very light
    } else if (category.includes('banner')) {
      baseWeight = 4; // Heavier
    } else if (category.includes('die-cut')) {
      baseWeight = 0.05; // Even lighter
    }
  }

  return baseWeight * quantity;
}
```

### Carrier Preferences

EasyPost automatically provides rates from all enabled carriers. You can:
- Enable specific carriers in your EasyPost dashboard
- Set up your own carrier accounts for better rates
- Configure shipping rules and restrictions

### Insurance Defaults

You can set automatic insurance based on order value in the React component:

```javascript
// In EasyPostShipping.tsx, add automatic insurance calculation
React.useEffect(() => {
  if (order.totalPrice > 100) {
    setInsurance(order.totalPrice.toString());
  }
}, [order]);
```

## Production Considerations

### 1. Switch to Production API Key

When ready to go live:
1. Update `EASYPOST_API_KEY` to your production key
2. Test with a few orders first
3. Enable production carriers in EasyPost dashboard

### 2. Carrier Account Setup

For the best rates:
1. Set up your own USPS, UPS, FedEx accounts
2. Connect them to EasyPost in the dashboard
3. EasyPost will automatically use your negotiated rates

### 3. Address Validation

EasyPost includes automatic address validation. Invalid addresses will be flagged before label creation.

### 4. International Shipping

EasyPost supports international shipping with:
- Automatic customs forms
- Duty and tax calculation
- International carrier options

## Troubleshooting

### Common Issues

**"EasyPost service is not configured"**
- Check that `EASYPOST_API_KEY` is set in your environment
- Restart your API server after adding the key

**"No rates available"**
- Check that your business address is valid
- Ensure customer shipping address is complete
- Verify package dimensions aren't too large/small

**"Failed to create shipment"**
- Check EasyPost dashboard for account status
- Verify API key has correct permissions
- Check that you haven't exceeded rate limits

### Debug Mode

Add console logging to see what's happening:

```javascript
// In api/easypost-client.js
console.log('Creating shipment with data:', shipmentData);
```

### EasyPost Dashboard

Monitor your shipping activity:
- Go to [EasyPost Dashboard](https://app.easypost.com/)
- View all shipments and their status
- Check for any API errors or issues

## Support

- **EasyPost Documentation**: https://docs.easypost.com/
- **EasyPost Support**: https://support.easypost.com/
- **Rate Shopping Guide**: https://docs.easypost.com/guides/rate-shopping

## Migration Notes

### From ShipStation

The old ShipStation integration has been replaced with EasyPost. The main differences:

**Before (ShipStation)**:
- Manual order entry in ShipStation interface
- Separate platform for shipping management
- Limited carrier options

**After (EasyPost)**:
- Automatic order data population from Supabase
- Direct integration in your admin interface
- Multiple carriers with real-time rate comparison
- Instant label generation and download

### Button Changes

The "Ship Order" buttons now open the EasyPost modal instead of redirecting to ShipStation.

## Future Enhancements

Possible improvements you can add:

1. **Order Status Updates**: Automatically update order fulfillment status when label is created
2. **Customer Notifications**: Send tracking numbers to customers via email
3. **Batch Shipping**: Process multiple orders at once
4. **Return Labels**: Generate return shipping labels
5. **Delivery Confirmation**: Webhook integration for delivery updates

## Cost Comparison

EasyPost typically offers:
- **Free** for development and testing
- **Competitive rates** often better than retail shipping
- **Volume discounts** as you ship more
- **No monthly fees** (pay per label)

Compare this with your current ShipStation costs to see potential savings. 