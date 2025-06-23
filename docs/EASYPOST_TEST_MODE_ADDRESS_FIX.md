# EasyPost Test Mode Address Fix

## Problem
When using EasyPost in test mode, you cannot use production address IDs. The error "The requested resource could not be found" occurs because test mode and production mode have completely separate resources.

## Solution
The code now automatically detects the mode and handles addresses accordingly:

### Test Mode
- Creates the "from" address object on-the-fly with your business details
- Uses test API keys (starting with `EZTK`)
- No real charges are made

### Production Mode  
- Uses the pre-verified address ID: `adr_31c828354d4a11f08f10ac1f6bc539aa`
- Uses production API keys (starting with `EZPK`)
- Real shipping charges apply

## Code Implementation

```javascript
// In api/index.js - createEasyPostShipment mutation
let fromAddress;

if (easyPostClient.isTestMode()) {
  // Test mode - create address object
  fromAddress = {
    name: 'Sticker Shuttle',
    company: 'Sticker Shuttle',
    street1: '2981 S Harrison St',
    city: 'Denver',
    state: 'CO',
    zip: '80210',
    country: 'US',
    phone: '720-555-0000',
    email: 'justin@stickershuttle.com'
  };
} else {
  // Production mode - use pre-verified address ID
  fromAddress = 'adr_31c828354d4a11f08f10ac1f6bc539aa';
}
```

## Environment Variables
- `EASYPOST_API_KEY`: Your EasyPost API key (test or production)
- `EASYPOST_TEST_MODE`: Set to "true" to force test mode
- `NODE_ENV`: If not "production", defaults to test mode

## Important Notes
1. **Never mix test and production resources** - they are completely separate
2. **Test mode is automatic** when NODE_ENV !== "production" or EASYPOST_TEST_MODE = "true"
3. **Address verification** is optional in test mode but recommended in production
4. **Update the business address** in the code if your shipping location changes 