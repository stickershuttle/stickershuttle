# Pro Subscriptions Table Migration Guide

## Overview
This migration separates Pro membership subscription data from the `user_profiles` table into a dedicated `pro_subscriptions` table for better data organization and scalability.

## What Changed

### Before (Old Structure)
All Pro membership data was stored directly in `user_profiles` table:
- `is_pro_member` (boolean flag)
- `pro_status`, `pro_plan`, `pro_subscription_id`, etc.
- 15+ Pro-related columns mixed with profile data

### After (New Structure)
Pro subscription data is separated into its own table:
- `user_profiles` keeps only `is_pro_member` (boolean flag for quick checks)
- `pro_subscriptions` table stores ALL subscription details
- Clean separation of concerns

## Database Changes

### New Table: `pro_subscriptions`

**Core Fields:**
- `id` - UUID primary key
- `user_id` - Foreign key to user_profiles (UNIQUE)
- `stripe_subscription_id` - Stripe subscription ID (UNIQUE)
- `stripe_customer_id` - Stripe customer ID

**Subscription Details:**
- `plan` - 'monthly' or 'annual'
- `status` - 'active', 'canceled', 'past_due', 'unpaid', 'incomplete'
- `subscription_start_date` - Original start date
- `current_period_start` - Current billing period start
- `current_period_end` - Current billing period end
- `canceled_at` - When subscription was canceled
- `cancel_at_period_end` - Whether to cancel at period end

**Payment Tracking:**
- `payment_failed` - Boolean
- `last_payment_failure` - Timestamp
- `payment_retry_count` - Integer

**Design Management:**
- `current_design_file` - URL to design
- `design_approved` - Boolean
- `design_approved_at` - Timestamp
- `design_locked` - Boolean
- `design_locked_at` - Timestamp

**Shipping:**
- `default_shipping_address` - JSONB
- `shipping_address_updated_at` - Timestamp

**Metadata:**
- `metadata` - JSONB for extensibility
- `created_at`, `updated_at` - Timestamps

### Helper View: `pro_members_with_profiles`
Joins `pro_subscriptions` with `user_profiles` for convenient querying with user info.

## Migration Steps

### 1. Run the SQL Migration
```bash
# Execute the migration SQL file in Supabase
supabase/sql/create_pro_subscriptions_table.sql
```

This will:
- Create the `pro_subscriptions` table
- Create all necessary indexes
- Set up RLS policies
- Migrate existing Pro member data
- Create the helper view
- Verify the migration

### 2. Update Backend Code

**Files to Update:**

#### `api/index.js`

**GraphQL Schema Updates:**

Add new `ProSubscription` type:
```graphql
type ProSubscription {
  id: ID!
  userId: ID!
  stripeSubscriptionId: String!
  stripeCustomerId: String!
  plan: String!
  status: String!
  subscriptionStartDate: String!
  currentPeriodStart: String!
  currentPeriodEnd: String!
  canceledAt: String
  cancelAtPeriodEnd: Boolean
  paymentFailed: Boolean
  lastPaymentFailure: String
  paymentRetryCount: Int
  currentDesignFile: String
  designApproved: Boolean
  designApprovedAt: String
  designLocked: Boolean
  designLockedAt: String
  defaultShippingAddress: JSON
  shippingAddressUpdatedAt: String
  metadata: JSON
  createdAt: String!
  updatedAt: String!
}
```

Add queries:
```graphql
# Add to Query type
getProSubscription(userId: ID!): ProSubscription
getAllProSubscriptions: [ProSubscription!]!
```

**Resolver Updates:**

All resolvers that currently query `user_profiles` for Pro data need to be updated:

1. `getAllProMembers` - Query `pro_subscriptions` table
2. `getProMemberAnalytics` - Query `pro_subscriptions` table
3. `getProMemberCount` - Query `pro_subscriptions` table (already counts correctly)
4. `updateProMemberDesign` - Update `pro_subscriptions.current_design_file`
5. `approveProMemberDesign` - Update `pro_subscriptions.design_approved`
6. `lockProMemberDesign` - Update `pro_subscriptions.design_locked`
7. `updateProMemberShippingAddress` - Update `pro_subscriptions.default_shipping_address`
8. `createProMemberOrder` - Read from `pro_subscriptions` table

#### `api/stripe-webhook-handlers.js`

Update subscription event handlers:

**`handleSubscriptionCreated`:**
```javascript
// Instead of updating user_profiles, insert into pro_subscriptions
const { error } = await client
  .from('pro_subscriptions')
  .insert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    plan: plan,
    status: subscription.status,
    subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    current_design_file: uploadedDesignFile || null,
    design_approved: uploadedDesignFile ? false : null,
    default_shipping_address: shippingAddress,
    shipping_address_updated_at: shippingAddress ? new Date().toISOString() : null
  });

// Also update user_profiles.is_pro_member flag
await client
  .from('user_profiles')
  .update({ is_pro_member: true })
  .eq('user_id', userId);
```

**`handleSubscriptionUpdated`:**
```javascript
// Update pro_subscriptions table
await client
  .from('pro_subscriptions')
  .update({
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end
  })
  .eq('stripe_subscription_id', subscription.id);
```

**`handleSubscriptionDeleted`:**
```javascript
// Update pro_subscriptions table
await client
  .from('pro_subscriptions')
  .update({
    status: 'canceled',
    canceled_at: new Date().toISOString()
  })
  .eq('stripe_subscription_id', subscription.id);

// Update user_profiles flag
await client
  .from('user_profiles')
  .update({ is_pro_member: false })
  .eq('user_id', userId);
```

#### `api/pro-order-scheduler.js`

Update queries to use `pro_subscriptions`:
```javascript
// Instead of querying user_profiles
const { data: dueMembers, error } = await client
  .from('pro_subscriptions')
  .select(`
    *,
    user_profiles!inner(*)
  `)
  .lte('current_period_end', cutoffDate)
  .eq('status', 'active');
```

### 3. Update Frontend Components

#### Update GraphQL Queries

Any components querying Pro member data need to use the new structure:

**`frontend/src/components/dashboard/tabs/ProMembershipView.tsx`:**
- Update to query Pro subscription data from the dedicated table
- The profile prop may need to be augmented with subscription data

**`frontend/src/pages/account/dashboard.tsx`:**
- Fetch Pro subscription data separately when needed
- Join with profile data for display

### 4. Testing Checklist

- [ ] Verify all existing Pro members migrated successfully
- [ ] Test new Pro subscription signup flow
- [ ] Test subscription updates (plan changes, cancellations)
- [ ] Test design upload and approval workflow
- [ ] Test shipping address updates
- [ ] Test monthly order generation
- [ ] Verify dashboard displays Pro data correctly
- [ ] Test payment failure handling
- [ ] Verify Pro member count displays correctly on /pro page

## Benefits of This Migration

1. **Better Data Organization** - Subscription data is separate from profile data
2. **Easier to Query** - Pro-specific queries don't scan user_profiles
3. **Better Performance** - Dedicated indexes for Pro-specific fields
4. **Scalability** - Can add Pro-specific features without bloating user_profiles
5. **Cleaner Code** - Clear separation between profiles and subscriptions
6. **Audit Trail** - Easier to track subscription history and changes
7. **Multiple Subscriptions** - Future-proof for users potentially having multiple subscriptions

## Rollback Plan

If issues arise, the old columns in `user_profiles` are NOT dropped by this migration. You can:

1. Stop using the new table
2. Revert backend code changes
3. Continue using the old structure in `user_profiles`
4. Drop the `pro_subscriptions` table when ready

## Notes

- The `is_pro_member` flag remains in `user_profiles` for quick boolean checks
- All Pro-related columns in `user_profiles` are kept for now (can be dropped later)
- The migration is designed to be non-destructive
- RLS policies ensure users can only see their own subscription data

