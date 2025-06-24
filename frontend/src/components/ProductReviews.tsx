import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useDashboardData } from '../hooks/useDashboardData';
import {
  GET_PRODUCT_REVIEWS,
  GET_PRODUCT_REVIEW_STATS,
  CAN_USER_REVIEW_PRODUCT,
  CREATE_REVIEW,
  UPDATE_REVIEW,
  DELETE_REVIEW,
  VOTE_ON_REVIEW
} from '../lib/review-mutations';

interface ProductReviewsProps {
  productId: string;
  productCategory: string;
  productName: string;
}

interface Review {
  id: string;
  userId: string;
  productId: string;
  productCategory: string;
  rating: number;
  title?: string;
  comment?: string;
  isVerifiedPurchase: boolean;
  helpfulVotes: number;
  totalVotes: number;
  createdAt: string;
  updatedAt: string;
  userEmail?: string;
  userFirstName?: string;
  userLastName?: string;
  userDisplayName?: string;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  rating5Count: number;
  rating4Count: number;
  rating3Count: number;
  rating2Count: number;
  rating1Count: number;
}

const ProductReviews: React.FC<ProductReviewsProps> = ({ 
  productId, 
  productCategory, 
  productName 
}) => {
  const { user } = useDashboardData();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [reviewFormData, setReviewFormData] = useState({
    rating: 5,
    title: '',
    comment: ''
  });

  // Queries
  const { data: reviewsData, loading: reviewsLoading, refetch: refetchReviews } = useQuery(GET_PRODUCT_REVIEWS, {
    variables: { productId, limit: 50, offset: 0 },
    errorPolicy: 'all'
  });

  const { data: statsData, loading: statsLoading } = useQuery(GET_PRODUCT_REVIEW_STATS, {
    variables: { productId },
    errorPolicy: 'all'
  });

  const { data: canReviewData } = useQuery(CAN_USER_REVIEW_PRODUCT, {
    variables: { userId: (user as any)?.id, productId },
    skip: !user,
    errorPolicy: 'all'
  });

  // Mutations
  const [createReview] = useMutation(CREATE_REVIEW);
  const [updateReview] = useMutation(UPDATE_REVIEW);
  const [deleteReview] = useMutation(DELETE_REVIEW);
  const [voteOnReview] = useMutation(VOTE_ON_REVIEW);

  const reviews: Review[] = reviewsData?.getProductReviews || [];
  const stats: ReviewStats = statsData?.getProductReviewStats || {
    totalReviews: 0,
    averageRating: 0,
    rating5Count: 0,
    rating4Count: 0,
    rating3Count: 0,
    rating2Count: 0,
    rating1Count: 0
  };
  const canUserReview = canReviewData?.canUserReviewProduct || false;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingReview) {
        await updateReview({
          variables: {
            reviewId: editingReview.id,
            input: reviewFormData
          }
        });
      } else {
        await createReview({
          variables: {
            input: {
              productId,
              productCategory,
              ...reviewFormData
            }
          }
        });
      }
      
      setShowReviewForm(false);
      setEditingReview(null);
      setReviewFormData({ rating: 5, title: '', comment: '' });
      refetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      await deleteReview({
        variables: { reviewId }
      });
      refetchReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review. Please try again.');
    }
  };

  const handleVoteOnReview = async (reviewId: string, isHelpful: boolean) => {
    if (!user) return;

    try {
      await voteOnReview({
        variables: { reviewId, isHelpful }
      });
      refetchReviews();
    } catch (error) {
      console.error('Error voting on review:', error);
    }
  };

  const renderStars = (rating: number, interactive = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? "button" : undefined}
            className={`text-xl ${
              star <= rating 
                ? 'text-yellow-400' 
                : 'text-gray-600'
            } ${interactive ? 'hover:text-yellow-300 cursor-pointer' : ''}`}
            onClick={() => interactive && onRate && onRate(star)}
            disabled={!interactive}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  const renderRatingDistribution = () => {
    const maxCount = Math.max(stats.rating5Count, stats.rating4Count, stats.rating3Count, stats.rating2Count, stats.rating1Count);
    
    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = stats[`rating${rating}Count` as keyof ReviewStats] as number;
          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
          
          return (
            <div key={rating} className="flex items-center space-x-2 text-sm">
              <span className="text-white w-6">{rating}</span>
              <span className="text-yellow-400">★</span>
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-gray-300 w-8 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Review Stats Section */}
      <div className="bg-white bg-opacity-5 backdrop-blur-sm rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Customer Reviews</h2>
        
        {statsLoading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">
                {stats.averageRating.toFixed(1)}
              </div>
              {renderStars(Math.round(stats.averageRating))}
              <div className="text-gray-300 mt-2">
                Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
              </div>
            </div>
            
            {/* Rating Distribution */}
            <div>
              {renderRatingDistribution()}
            </div>
          </div>
        )}

        {/* Write Review Button */}
        {user && canUserReview && (
          <div className="mt-6 pt-6 border-t border-gray-600">
            <button
              onClick={() => setShowReviewForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors duration-200"
            >
              Write a Review
            </button>
          </div>
        )}

        {!user && (
          <div className="mt-6 pt-6 border-t border-gray-600">
            <p className="text-gray-300">
              <a href="/login" className="text-purple-400 hover:text-purple-300">Sign in</a> to write a review
            </p>
          </div>
        )}
      </div>

      {/* Review Form */}
      {showReviewForm && (
        <div className="bg-white bg-opacity-5 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">
            {editingReview ? 'Edit Review' : 'Write a Review'}
          </h3>
          
          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Rating */}
            <div>
              <label className="block text-white mb-2">Rating *</label>
              {renderStars(reviewFormData.rating, true, (rating) =>
                setReviewFormData(prev => ({ ...prev, rating }))
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-white mb-2">Review Title</label>
              <input
                type="text"
                value={reviewFormData.title}
                onChange={(e) => setReviewFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                placeholder="Summarize your experience"
                maxLength={100}
              />
            </div>

            {/* Comment */}
            <div>
              <label className="block text-white mb-2">Review *</label>
              <textarea
                value={reviewFormData.comment}
                onChange={(e) => setReviewFormData(prev => ({ ...prev, comment: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                rows={4}
                placeholder="Tell others about your experience with this product"
                required
                maxLength={1000}
              />
              <div className="text-right text-gray-400 text-sm mt-1">
                {reviewFormData.comment.length}/1000
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-4">
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
              >
                {editingReview ? 'Update Review' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReviewForm(false);
                  setEditingReview(null);
                  setReviewFormData({ rating: 5, title: '', comment: '' });
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviewsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white bg-opacity-5 backdrop-blur-sm rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-16 bg-gray-700 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="bg-white bg-opacity-5 backdrop-blur-sm rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    {renderStars(review.rating)}
                    {review.isVerifiedPurchase && (
                      <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  {review.title && (
                    <h4 className="text-lg font-semibold text-white mb-2">{review.title}</h4>
                  )}
                  <div className="text-gray-300 text-sm">
                    By {review.userDisplayName || 'Anonymous'} • {formatDate(review.createdAt)}
                  </div>
                </div>
                
                {(user as any)?.id === review.userId && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingReview(review);
                        setReviewFormData({
                          rating: review.rating,
                          title: review.title || '',
                          comment: review.comment || ''
                        });
                        setShowReviewForm(true);
                      }}
                      className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {review.comment && (
                <p className="text-gray-200 mb-4 leading-relaxed">{review.comment}</p>
              )}

              {/* Helpful Votes */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-600">
                <div className="text-gray-300 text-sm">
                  {review.helpfulVotes > 0 && (
                    <span>{review.helpfulVotes} of {review.totalVotes} found this helpful</span>
                  )}
                </div>
                
                {user && (user as any).id !== review.userId && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">Was this helpful?</span>
                    <button
                      onClick={() => handleVoteOnReview(review.id, true)}
                      className="text-green-400 hover:text-green-300 text-sm px-2 py-1 rounded transition-colors duration-200"
                    >
                      👍 Yes
                    </button>
                    <button
                      onClick={() => handleVoteOnReview(review.id, false)}
                      className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded transition-colors duration-200"
                    >
                      👎 No
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white bg-opacity-5 backdrop-blur-sm rounded-xl p-8 text-center">
            <p className="text-gray-300 text-lg mb-4">No reviews yet</p>
            <p className="text-gray-400">Be the first to review {productName}!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductReviews; 