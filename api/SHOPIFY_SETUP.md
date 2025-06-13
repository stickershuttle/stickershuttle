# Shopify API Integration Setup

This guide will help you set up Shopify API integration for handling draft orders and checkout.

## Prerequisites

1. **Shopify Partners Account**: You mentioned you have this ✅
2. **Shopify Development Store** or **Live Store** with API access
3. **Private App** or **Custom App** credentials

## Step 1: Get Your Shopify API Credentials

### Option A: Private App (Recommended for development)

1. Go to your Shopify Admin
2. Navigate to **Apps** → **Manage private apps**
3. Click **Create private app**
4. Fill in the app details:
   - App name: "Sticker Shuttle API"
   - Emergency developer email: your email
5. In **Admin API** section, enable:
   - `read_draft_orders`
   - `write_draft_orders` 
   - `read_orders`
   - `write_orders`
6. Click **Save**
7. Copy the **API key**, **Password** (this is your access token), and **Secret key**

### Option B: Custom App (For production)

1. Go to **Apps** → **App and sales channel settings**
2. Click **Develop apps for your store**
3. Click **Create an app**
4. Configure the app with necessary scopes (same as above)

## Step 2: Configure Your Environment

### Option A: Update the config file directly
Edit `api/shopify-config.js` and replace the placeholder values:

```javascript
const shopifyConfig = {
  apiKey: 'your_actual_api_key',
  apiSecret: 'your_actual_api_secret', 
  accessToken: 'your_actual_access_token', // This is the "Password" from private app
  storeUrl: 'your-store-name.myshopify.com',
  apiVersion: '2024-01'
};
```

### Option B: Use environment variables (Recommended)
Create a `.env` file in the `api/` directory:

```env
SHOPIFY_API_KEY=your_actual_api_key
SHOPIFY_API_SECRET=your_actual_api_secret
SHOPIFY_ACCESS_TOKEN=your_actual_access_token
SHOPIFY_STORE_URL=your-store-name.myshopify.com
SHOPIFY_API_VERSION=2024-01
```

## Step 3: Install Dependencies

```bash
cd api
npm install
```

## Step 4: Start the Server

```bash
npm run dev
```

Visit `http://localhost:4000` to access GraphQL Playground.

## Step 5: Test the Integration

### Example 1: Create a Draft Order

```graphql
mutation CreateDraftOrder {
  createDraftOrder(input: {
    lineItems: [{
      title: "Custom Sticker Pack"
      quantity: 2
      price: "25.00"
      sku: "STICKER-PACK-001"
    }]
    customer: {
      email: "customer@example.com"
      first_name: "John"
      last_name: "Doe"
    }
    shippingAddress: {
      first_name: "John"
      last_name: "Doe"
      address1: "123 Main St"
      city: "New York"
      province: "NY"
      country: "United States"
      zip: "10001"
    }
    email: "customer@example.com"
    note: "Custom sticker order"
    tags: "custom,stickers,draft"
  }) {
    id
    name
    total_price
    invoice_url
    status
    line_items {
      title
      quantity
      price
    }
  }
}
```

### Example 2: Complete Draft Order (Convert to Order)

```graphql
mutation CompleteDraftOrder {
  completeDraftOrder(id: "DRAFT_ORDER_ID_HERE") {
    id
    order_id
    status
    total_price
  }
}
```

### Example 3: Create Checkout URL

```graphql
mutation CreateCheckoutUrl {
  createCheckoutUrl(draftOrderId: "DRAFT_ORDER_ID_HERE") {
    checkoutUrl
    draftOrderId
    totalPrice
  }
}
```

### Example 4: Get All Draft Orders

```graphql
query GetAllDraftOrders {
  getAllDraftOrders(limit: 10, status: "open") {
    id
    name
    total_price
    status
    created_at
    customer {
      email
      first_name
      last_name
    }
  }
}
```

## Common Workflow

1. **Create Draft Order**: Use `createDraftOrder` mutation with customer and product details
2. **Get Checkout URL**: Use `createCheckoutUrl` to get a payment link for the customer
3. **Send to Customer**: Email or display the checkout URL to your customer
4. **Complete Order**: Optionally use `completeDraftOrder` to finalize the order programmatically

## Frontend Integration

You can now call these GraphQL mutations from your Next.js frontend. Here's an example:

```javascript
// In your Next.js component
const CREATE_DRAFT_ORDER = gql`
  mutation CreateDraftOrder($input: DraftOrderInput!) {
    createDraftOrder(input: $input) {
      id
      invoice_url
      total_price
    }
  }
`;

const [createDraftOrder] = useMutation(CREATE_DRAFT_ORDER);

const handleCheckout = async (orderData) => {
  try {
    const { data } = await createDraftOrder({
      variables: { input: orderData }
    });
    
    // Redirect customer to Shopify checkout
    window.location.href = data.createDraftOrder.invoice_url;
  } catch (error) {
    console.error('Checkout error:', error);
  }
};
```

## Security Notes

- **Never expose your API credentials** in frontend code
- Use environment variables for production
- Consider implementing webhook handlers for order updates
- Add proper authentication to your GraphQL endpoints

## Troubleshooting

### Common Issues:

1. **"Unauthorized" errors**: Check your access token and API permissions
2. **"Store not found"**: Verify your store URL format
3. **GraphQL errors**: Check the GraphQL playground for detailed error messages

### Testing Your Setup:

1. Visit `http://localhost:4000` 
2. You should see a success message about Shopify configuration
3. Try the "hello" query first to ensure GraphQL is working
4. Then test with a simple draft order creation

## Next Steps

- Implement webhook handlers for order status updates
- Add email notifications
- Create a frontend checkout flow
- Add inventory management
- Implement customer management features 