# Klaviyo Integration Setup Guide

This guide walks you through setting up Klaviyo email marketing integration with your Sticker Shuttle website.

## Overview

The Klaviyo integration provides:
- **Customer Sync**: Automatically sync customer data and subscription status
- **Email Lists Management**: Manage subscriptions to marketing lists
- **Event Tracking**: Track customer actions (orders, subscriptions, etc.)
- **Admin Panel**: Manage subscriptions and sync data from your admin dashboard

## Prerequisites

1. A Klaviyo account (sign up at [klaviyo.com](https://klaviyo.com))
2. Admin access to your Sticker Shuttle website
3. API keys from Klaviyo

## Step 1: Get Klaviyo API Keys

### 1.1 Create API Keys
1. Log into your Klaviyo account
2. Go to **Settings** → **API Keys**
3. Create a **Private API Key** with the following permissions:
   - Profiles: Read, Write
   - Lists: Read, Write
   - Events: Write
   - Metrics: Read
4. Copy the Private API Key (starts with `pk_`)
5. Get your Public API Key (starts with `pk_`) from the same page

### 1.2 Create a Marketing List
1. In Klaviyo, go to **Lists & Segments**
2. Click **Create List**
3. Name it "Main Marketing List" or similar
4. Copy the List ID (you'll need this)

## Step 2: Configure Environment Variables

Add these environment variables to your `.env.local` files:

### Backend API (.env.local in /api directory)
```bash
# Klaviyo Configuration
KLAVIYO_PRIVATE_API_KEY=pk_your_private_key_here
KLAVIYO_PUBLIC_API_KEY=pk_your_public_key_here

# Multiple List Support (configure as many as needed)
KLAVIYO_DEFAULT_LIST_ID=your_default_list_id_here
KLAVIYO_WINBACK_LIST_ID=your_winback_list_id_here
KLAVIYO_REPEAT_LIST_ID=your_repeat_customer_list_id_here
KLAVIYO_NEWSLETTER_LIST_ID=your_newsletter_list_id_here
```

**Multiple Lists Configuration:**
- Configure only the lists you need - unused lists can be omitted
- Klaviyo's built-in flows and logic will handle automatic list assignments
- The admin panel will show which lists are configured
- Each list serves different marketing purposes (winback campaigns, repeat customers, newsletters, etc.)

### Frontend (.env.local in /frontend directory)
```bash
# Klaviyo Public Key (for client-side tracking if needed)
NEXT_PUBLIC_KLAVIYO_PUBLIC_KEY=pk_your_public_key_here
```

## Step 3: Restart Your Application

After adding the environment variables:

1. Stop your development server
2. Restart using your normal development command
3. Verify the API recognizes Klaviyo by checking the console logs

## Step 4: Initial Customer Sync

### 4.1 Access the Klaviyo Admin Panel
1. Log into your admin dashboard
2. Navigate to **Admin** → **Klaviyo** (in the Marketing section)

### 4.2 Perform Initial Sync
1. Click **"Sync All Customers"** in the Bulk Operations section
2. Confirm the sync operation
3. Wait for the sync to complete
4. Check the results for any errors

## Step 5: Verify Integration

### 5.1 Check Klaviyo Dashboard
1. Go to your Klaviyo dashboard
2. Navigate to **Profiles** to see synced customers
3. Check your marketing list for subscribed customers

### 5.2 Test Individual Operations
1. In the admin panel, select a customer
2. Try subscribing/unsubscribing them
3. Verify the changes appear in Klaviyo

## Features and Usage

### Customer Subscription Management

**Individual Customer Management:**
- Select any customer from the list
- Toggle their subscription status
- Changes sync immediately to Klaviyo
- Events are tracked for marketing automation

**Bulk Operations:**
- Sync all customers at once
- Monitor sync progress and errors
- Re-sync specific customers as needed

### Admin Panel Features

**Dashboard Overview:**
- Total customers count
- Subscription statistics
- Subscription rate percentage
- Real-time status updates

**Customer Search and Filtering:**
- Search by name or email
- Filter by subscription status
- Sort by various criteria
- Quick customer selection

**Klaviyo Lists Display:**
- View all your Klaviyo lists
- See list creation dates
- Monitor list configurations

### Automatic Event Tracking

The integration automatically tracks these events:
- **Order Placed**: When customers complete purchases
- **Subscription Changed**: When subscription status updates
- **Customer Registration**: When new accounts are created

### Data Synchronization

**Customer Data Synced:**
- Email address (primary key)
- First and last name
- Phone number
- Location (city, state, country)
- Order history and statistics
- Subscription preferences

**Marketing Properties:**
- Total orders count
- Total amount spent
- Average order value
- First and last order dates
- Customer lifetime value

## Troubleshooting

### Common Issues

**1. API Key Not Working**
- Verify the key starts with `pk_`
- Check that permissions include Profiles, Lists, and Events
- Ensure the key is active in Klaviyo

**2. List ID Not Found**
- Verify the list exists in Klaviyo
- Check the List ID is copied correctly
- Ensure the list is not archived

**3. Sync Errors**
- Check customer email addresses are valid
- Verify API rate limits aren't exceeded
- Review error messages in the admin panel

**4. Environment Variables Not Loading**
- Restart your application after adding variables
- Check file paths for .env.local files
- Verify variable names match exactly

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG_KLAVIYO=true
```

This will log all Klaviyo API interactions to the console.

## Security Best Practices

1. **Never expose private API keys** in client-side code
2. **Use environment variables** for all sensitive data
3. **Regularly rotate API keys** (every 6-12 months)
4. **Monitor API usage** in Klaviyo dashboard
5. **Limit API key permissions** to only what's needed

## Advanced Configuration

### Custom List Management

You can create multiple lists for different purposes:

```javascript
// Example: Subscribe to specific list
await klaviyoClient.subscribeToList(email, 'CUSTOM_LIST_ID');
```

### Event Tracking Customization

Add custom events for specific business logic:

```javascript
// Example: Track custom event
await klaviyoClient.trackEvent(email, 'Custom Event Name', {
  property1: 'value1',
  property2: 'value2'
});
```

### Webhook Integration

For real-time updates from Klaviyo back to your system, you can set up webhooks:

1. In Klaviyo, go to **Settings** → **Webhooks**
2. Add webhook URL: `https://yourdomain.com/webhooks/klaviyo`
3. Select events to track (unsubscribes, profile updates, etc.)

## Support

If you encounter issues:

1. Check the admin panel error messages
2. Review Klaviyo API documentation
3. Verify environment variable configuration
4. Test with a small subset of customers first

## API Reference

### Available GraphQL Mutations

```graphql
# Subscribe customer to Klaviyo
mutation SubscribeToKlaviyo($email: String!, $listId: String) {
  subscribeToKlaviyo(email: $email, listId: $listId) {
    success
    message
    profileId
  }
}

# Unsubscribe customer from Klaviyo
mutation UnsubscribeFromKlaviyo($email: String!, $listId: String) {
  unsubscribeFromKlaviyo(email: $email, listId: $listId) {
    success
    message
    profileId
  }
}

# Update customer subscription status
mutation UpdateCustomerSubscription($email: String!, $subscribed: Boolean!) {
  updateCustomerSubscription(email: $email, subscribed: $subscribed) {
    success
    message
    customer {
      email
      marketingOptIn
    }
  }
}

# Sync all customers to Klaviyo
mutation SyncAllCustomersToKlaviyo {
  syncAllCustomersToKlaviyo {
    success
    failed
    total
    errors {
      email
      error
    }
  }
}
```

### Available GraphQL Queries

```graphql
# Get Klaviyo subscription status
query GetKlaviyoSubscriptionStatus($email: String!, $listId: String) {
  getKlaviyoSubscriptionStatus(email: $email, listId: $listId) {
    isSubscribed
    profileId
    error
  }
}

# Get all Klaviyo lists
query GetKlaviyoLists {
  getKlaviyoLists {
    id
    name
    created
    updated
  }
}

# Get configured Klaviyo lists
query GetKlaviyoConfiguredLists {
  getKlaviyoConfiguredLists {
    success
    lists {
      id
      name
      type
      configured
    }
    error
  }
}
```

## Conclusion

Your Klaviyo integration is now ready! You can manage customer subscriptions, sync data, and track events all from your admin panel. The integration will help you build better customer relationships through targeted email marketing.

For questions or support, refer to the Klaviyo documentation or contact your development team. 