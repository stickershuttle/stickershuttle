# Review System Implementation Guide

## Overview

This guide explains how to implement a complete review system for your Sticker Shuttle website using Supabase. The system includes:

- Star ratings (1-5 stars)
- Written reviews with titles and comments
- Verified purchase badges
- Helpful voting on reviews
- Review statistics and analytics
- User permissions and moderation

## 🗃️ Database Setup

### 1. Run the Database Schema

First, execute the SQL script to create the review tables:

```bash
# Run this in your Supabase SQL Editor
cat docs/CREATE_REVIEWS_TABLE.sql
```

This creates:
- `reviews` table for storing product reviews
- `review_votes` table for helpful voting
- Database functions for querying reviews
- Row Level Security (RLS) policies
- Triggers for vote count updates

### 2. Key Database Features

**Reviews Table:**
- Links users to products via `user_id` and `product_id`
- Stores ratings (1-5), titles, and comments
- Tracks verified purchases via `order_id`
- Supports moderation with status field
- One review per user per product (unique constraint)

**Review Votes Table:**
- Users can vote reviews as helpful or not
- Automatically updates helpful vote counts
- One vote per user per review

**Database Functions:**
- `get_product_reviews()` - Fetch reviews with user info
- `get_product_review_stats()` - Rating averages and distribution
- `can_user_review_product()` - Check if user can review (must have purchased)
- `verify_purchase_review()` - Mark reviews as verified purchases

## 🔧 API Implementation

### 1. GraphQL Schema Added

The following types and operations were added to your API:

**Types:**
```graphql
type Review {
  id: ID!
  userId: ID!
  productId: String!
  productCategory: String!
  rating: Int!
  title: String
  comment: String
  isVerifiedPurchase: Boolean!
  helpfulVotes: Int!
  totalVotes: Int!
  createdAt: String!
  updatedAt: String!
  userDisplayName: String
}

type ReviewStats {
  totalReviews: Int!
  averageRating: Float!
  rating5Count: Int!
  rating4Count: Int!
  rating3Count: Int!
  rating2Count: Int!
  rating1Count: Int!
}
```

**Queries:**
- `getProductReviews(productId, limit, offset)` - Get paginated reviews
- `getProductReviewStats(productId)` - Get review statistics
- `canUserReviewProduct(userId, productId)` - Check review eligibility
- `getUserReviews(userId)` - Get user's reviews

**Mutations:**
- `createReview(input)` - Create new review
- `updateReview(reviewId, input)` - Update existing review
- `deleteReview(reviewId)` - Delete review
- `voteOnReview(reviewId, isHelpful)` - Vote on review helpfulness

### 2. Review Validation

The API automatically:
- Verifies users have purchased products before allowing reviews
- Prevents duplicate reviews per user per product
- Links reviews to orders for verification badges
- Handles helpful voting with automatic count updates

## 🎨 Frontend Components

### 1. ProductReviews Component

A comprehensive React component that provides:

**Features:**
- Review statistics with rating distribution
- Star ratings display and input
- Review form with title and comment
- Edit/delete for user's own reviews
- Helpful voting interface
- Verified purchase badges
- Responsive design matching your site theme

**Usage:**
```tsx
import ProductReviews from '../components/ProductReviews';

// In your product page
<ProductReviews 
  productId={product.id}
  productCategory={product.category}
  productName={product.name}
/>
```

### 2. GraphQL Integration

The `review-mutations.js` file provides all necessary GraphQL operations:

```javascript
import { 
  GET_PRODUCT_REVIEWS,
  CREATE_REVIEW,
  UPDATE_REVIEW,
  DELETE_REVIEW 
} from '../lib/review-mutations';
```

## 📄 Integration Guide

### 1. Add Reviews to Product Pages

Add the `ProductReviews` component to your existing product pages:

**Vinyl Stickers Example:**
```tsx
// In frontend/src/pages/products/vinyl-stickers.tsx
import ProductReviews from '@/components/ProductReviews';

export default function VinylStickers() {
  return (
    <Layout>
      {/* Existing product content */}
      
      {/* Add reviews section */}
      <ProductReviews 
        productId="vinyl-stickers-custom"
        productCategory="vinyl-stickers"
        productName="Custom Vinyl Stickers"
      />
    </Layout>
  );
}
```

### 2. Product ID Mapping

Use the product IDs from your product catalog:

```javascript
// From your existing product data
const productIds = {
  'vinyl-stickers': 'vinyl-stickers-custom',
  'holographic-stickers': 'holographic-stickers-rainbow',
  'chrome-stickers': 'chrome-stickers-mirror',
  'glitter-stickers': 'glitter-stickers-sparkle',
  'clear-stickers': 'clear-stickers-transparent',
  'sticker-sheets': 'sticker-sheets-custom',
  'vinyl-banners': 'vinyl-banners-outdoor'
};
```

### 3. Authentication Integration

The component automatically works with your existing authentication system via `useDashboardData()`.

## 🎯 User Experience Features

### 1. Review Permissions

- **Write Reviews:** Only users who have purchased the product
- **Edit/Delete:** Users can only modify their own reviews
- **Vote:** Any authenticated user can vote (except on their own reviews)
- **View:** Anyone can view published reviews

### 2. Verified Purchase Badges

Reviews automatically show "Verified Purchase" badges when:
- User has purchased the product
- Order is marked as paid
- Review is linked to the purchase order

### 3. Review Quality Features

- **Character Limits:** Title (100 chars), Comment (1000 chars)
- **Required Fields:** Rating and comment are required
- **Helpful Voting:** Users can mark reviews as helpful
- **Rating Distribution:** Visual breakdown of star ratings

## 🚀 Deployment Steps

### 1. Database Migration

```sql
-- Run in Supabase SQL Editor
\i docs/CREATE_REVIEWS_TABLE.sql
```

### 2. API Deployment

The GraphQL schema and resolvers are already added to your `api/index.js`. Deploy your API to Railway.

### 3. Frontend Deployment

```bash
# Add the new components
git add frontend/src/components/ProductReviews.tsx
git add frontend/src/lib/review-mutations.js

# Deploy to Vercel
git commit -m "Add review system"
git push origin main
```

### 4. Integration

Add the `ProductReviews` component to each product page where you want reviews.

## 📊 Analytics & Monitoring

### 1. Review Metrics

The system tracks:
- Average ratings per product
- Review count trends
- Helpful vote ratios
- Verified vs unverified reviews

### 2. Moderation Tools

Reviews can be moderated via:
- Status field ('active', 'hidden', 'pending')
- Admin notes for internal tracking
- Bulk operations via database queries

## 🔒 Security & Privacy

### 1. Row Level Security

- Users can only edit their own reviews
- Public can view active reviews
- Service role has full access for admin operations

### 2. Data Validation

- API validates all inputs
- Prevents duplicate reviews
- Enforces purchase requirements
- Rate limiting via authentication

## 🎨 Customization

### 1. Styling

The component uses Tailwind CSS and matches your existing design:
- Purple accent colors
- Glass morphism effects
- Responsive design
- Dark theme compatible

### 2. Text Customization

Easily customize messages:
```tsx
// In ProductReviews.tsx
const messages = {
  noReviews: "No reviews yet",
  signInPrompt: "Sign in to write a review",
  mustPurchase: "You can only review products you have purchased"
};
```

## 🚦 Testing

### 1. Test Scenarios

- User who purchased product can review
- User who didn't purchase cannot review
- Users can edit/delete own reviews
- Helpful voting works correctly
- Review stats calculate properly

### 2. Test Data

Create test reviews for development:
```sql
-- Only run in development
INSERT INTO reviews (user_id, product_id, product_category, rating, title, comment, is_verified_purchase)
VALUES 
  ('user-uuid', 'vinyl-stickers-custom', 'vinyl-stickers', 5, 'Amazing Quality!', 'These stickers exceeded my expectations. Great quality and fast shipping.', true),
  ('user-uuid-2', 'vinyl-stickers-custom', 'vinyl-stickers', 4, 'Good Product', 'Nice stickers, exactly what I ordered.', true);
```

## 🔧 Troubleshooting

### Common Issues

1. **"User can't review" Error**
   - Check if user has purchased the product
   - Verify order status is 'paid'
   - Check product_id matches order items

2. **Reviews Not Showing**
   - Check RLS policies
   - Verify GraphQL endpoint
   - Check API authentication

3. **Vote Counts Not Updating**
   - Check trigger is enabled
   - Verify vote insert succeeded
   - Check foreign key constraints

### Debug Queries

```sql
-- Check user's orders for a product
SELECT * FROM orders_main om
JOIN order_items_new oin ON om.id = oin.order_id
WHERE om.user_id = 'user-uuid' 
AND oin.product_id = 'vinyl-stickers-custom';

-- Check review permissions
SELECT can_user_review_product('user-uuid', 'vinyl-stickers-custom');

-- View all reviews for a product
SELECT * FROM get_product_reviews('vinyl-stickers-custom', 50, 0);
```

## 📈 Future Enhancements

Consider adding:
- Review photos/videos
- Review responses from business
- Review templates for common feedback
- AI-powered review sentiment analysis
- Review rewards/incentives
- Advanced filtering (verified only, rating range)
- Review syndication to other platforms

## 🎉 Conclusion

Your review system is now ready! Users can:
✅ Leave detailed reviews with ratings
✅ See verified purchase badges
✅ Vote on helpful reviews
✅ View comprehensive review statistics
✅ Edit and manage their own reviews

The system automatically handles permissions, verification, and provides a great user experience that will help build trust and increase conversions on your Sticker Shuttle website. 