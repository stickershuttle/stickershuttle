import { gql } from '@apollo/client';

// Review Queries
export const GET_PRODUCT_REVIEWS = gql`
  query GetProductReviews($productId: String!, $limit: Int, $offset: Int) {
    getProductReviews(productId: $productId, limit: $limit, offset: $offset) {
      id
      userId
      productId
      productCategory
      rating
      title
      comment
      isVerifiedPurchase
      helpfulVotes
      totalVotes
      createdAt
      updatedAt
      userEmail
      userFirstName
      userLastName
      userDisplayName
    }
  }
`;

export const GET_PRODUCT_REVIEW_STATS = gql`
  query GetProductReviewStats($productId: String!) {
    getProductReviewStats(productId: $productId) {
      totalReviews
      averageRating
      rating5Count
      rating4Count
      rating3Count
      rating2Count
      rating1Count
    }
  }
`;

export const CAN_USER_REVIEW_PRODUCT = gql`
  query CanUserReviewProduct($userId: ID!, $productId: String!) {
    canUserReviewProduct(userId: $userId, productId: $productId)
  }
`;

export const GET_USER_REVIEWS = gql`
  query GetUserReviews($userId: ID!) {
    getUserReviews(userId: $userId) {
      id
      userId
      productId
      productCategory
      rating
      title
      comment
      isVerifiedPurchase
      helpfulVotes
      totalVotes
      createdAt
      updatedAt
    }
  }
`;

// Review Mutations
export const CREATE_REVIEW = gql`
  mutation CreateReview($input: CreateReviewInput!) {
    createReview(input: $input) {
      id
      userId
      productId
      productCategory
      rating
      title
      comment
      isVerifiedPurchase
      helpfulVotes
      totalVotes
      createdAt
      updatedAt
      userEmail
      userFirstName
      userLastName
      userDisplayName
    }
  }
`;

export const UPDATE_REVIEW = gql`
  mutation UpdateReview($reviewId: ID!, $input: UpdateReviewInput!) {
    updateReview(reviewId: $reviewId, input: $input) {
      id
      userId
      productId
      productCategory
      rating
      title
      comment
      isVerifiedPurchase
      helpfulVotes
      totalVotes
      createdAt
      updatedAt
      userEmail
      userFirstName
      userLastName
      userDisplayName
    }
  }
`;

export const DELETE_REVIEW = gql`
  mutation DeleteReview($reviewId: ID!) {
    deleteReview(reviewId: $reviewId)
  }
`;

export const VOTE_ON_REVIEW = gql`
  mutation VoteOnReview($reviewId: ID!, $isHelpful: Boolean!) {
    voteOnReview(reviewId: $reviewId, isHelpful: $isHelpful) {
      id
      userId
      productId
      productCategory
      rating
      title
      comment
      isVerifiedPurchase
      helpfulVotes
      totalVotes
      createdAt
      updatedAt
      userEmail
      userFirstName
      userLastName
      userDisplayName
    }
  }
`; 