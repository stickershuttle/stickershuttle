-- Create reviews table for product reviews
-- This table will store user reviews for products with ratings and comments

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User and product references
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL, -- References product ID from your catalog
  product_category TEXT NOT NULL, -- e.g., 'vinyl-stickers', 'holographic-stickers'
  
  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  
  -- Review metadata
  is_verified_purchase BOOLEAN DEFAULT false,
  order_id UUID REFERENCES orders_main(id) ON DELETE SET NULL, -- Link to purchase if verified
  
  -- Helpful voting
  helpful_votes INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  
  -- Review status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'pending')),
  moderated_at TIMESTAMPTZ,
  moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- No unique constraint here - we'll add partial unique indexes after table creation
);

-- Create review_votes table for tracking helpful votes
CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one vote per user per review
  UNIQUE(review_id, user_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_category ON reviews(product_category);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_review_votes_review_id ON review_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_votes_user_id ON review_votes(user_id);

-- Partial unique indexes to ensure proper constraints
-- One review per user per product (for product reviews)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_product_unique 
  ON reviews(user_id, product_id) 
  WHERE product_id IS NOT NULL AND order_id IS NULL;

-- One review per user per order (for order reviews)  
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_order_unique 
  ON reviews(user_id, order_id) 
  WHERE order_id IS NOT NULL AND product_id IS NULL;

-- Enable Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

-- Policies for reviews table
-- Anyone can read active reviews
CREATE POLICY "Anyone can view active reviews" ON reviews
  FOR SELECT
  USING (status = 'active');

-- Users can create reviews (one per product)
CREATE POLICY "Authenticated users can create reviews" ON reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews" ON reviews
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can access all reviews (for admin purposes)
CREATE POLICY "Service role can access all reviews" ON reviews
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Policies for review_votes table
-- Anyone can read votes (for display purposes)
CREATE POLICY "Anyone can view review votes" ON review_votes
  FOR SELECT
  USING (true);

-- Users can vote on reviews
CREATE POLICY "Authenticated users can vote" ON review_votes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Users can update their own votes
CREATE POLICY "Users can update own votes" ON review_votes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes" ON review_votes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can access all votes
CREATE POLICY "Service role can access all votes" ON review_votes
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to update helpful vote counts
CREATE OR REPLACE FUNCTION update_review_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate vote counts for the affected review
  UPDATE reviews 
  SET 
    helpful_votes = (
      SELECT COUNT(*) 
      FROM review_votes 
      WHERE review_id = COALESCE(NEW.review_id, OLD.review_id) 
      AND is_helpful = true
    ),
    total_votes = (
      SELECT COUNT(*) 
      FROM review_votes 
      WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update vote counts when votes change
CREATE TRIGGER update_review_votes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON review_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_vote_counts();

-- Function to get product reviews with user info
CREATE OR REPLACE FUNCTION get_product_reviews(p_product_id TEXT, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  product_id TEXT,
  product_category TEXT,
  rating INTEGER,
  title TEXT,
  comment TEXT,
  is_verified_purchase BOOLEAN,
  helpful_votes INTEGER,
  total_votes INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_email TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  user_display_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    r.product_id,
    r.product_category,
    r.rating,
    r.title,
    r.comment,
    r.is_verified_purchase,
    r.helpful_votes,
    r.total_votes,
    r.created_at,
    r.updated_at,
    au.email as user_email,
    up.first_name as user_first_name,
    up.last_name as user_last_name,
    up.display_name as user_display_name
  FROM 
    reviews r
  JOIN 
    auth.users au ON r.user_id = au.id
  LEFT JOIN 
    user_profiles up ON r.user_id = up.user_id
  WHERE 
    r.product_id = p_product_id
    AND r.status = 'active'
  ORDER BY 
    r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get review statistics for a product
CREATE OR REPLACE FUNCTION get_product_review_stats(p_product_id TEXT)
RETURNS TABLE (
  total_reviews INTEGER,
  average_rating NUMERIC(3,2),
  rating_5_count INTEGER,
  rating_4_count INTEGER,
  rating_3_count INTEGER,
  rating_2_count INTEGER,
  rating_1_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_reviews,
    ROUND(AVG(rating), 2) as average_rating,
    COUNT(CASE WHEN rating = 5 THEN 1 END)::INTEGER as rating_5_count,
    COUNT(CASE WHEN rating = 4 THEN 1 END)::INTEGER as rating_4_count,
    COUNT(CASE WHEN rating = 3 THEN 1 END)::INTEGER as rating_3_count,
    COUNT(CASE WHEN rating = 2 THEN 1 END)::INTEGER as rating_2_count,
    COUNT(CASE WHEN rating = 1 THEN 1 END)::INTEGER as rating_1_count
  FROM 
    reviews
  WHERE 
    product_id = p_product_id
    AND status = 'active';
END;
$$;

-- Function to check if user can review a product (has purchased it)
CREATE OR REPLACE FUNCTION can_user_review_product(p_user_id UUID, p_product_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_purchased BOOLEAN := false;
  existing_review_count INTEGER := 0;
BEGIN
  -- Check if user has purchased this product type
  SELECT EXISTS (
    SELECT 1 
    FROM orders_main om
    JOIN order_items_new oin ON om.id = oin.order_id
    WHERE om.user_id = p_user_id
    AND om.financial_status = 'paid'
    AND oin.product_id = p_product_id
  ) INTO has_purchased;
  
  -- Check if user already has a review for this product
  SELECT COUNT(*)
  FROM reviews
  WHERE user_id = p_user_id 
  AND product_id = p_product_id
  INTO existing_review_count;
  
  -- Return true if has purchased and no existing review
  RETURN has_purchased AND existing_review_count = 0;
END;
$$;

-- Function to mark review as verified purchase
CREATE OR REPLACE FUNCTION verify_purchase_review(p_review_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  review_record RECORD;
  has_purchased BOOLEAN := false;
BEGIN
  -- Get review details
  SELECT user_id, product_id INTO review_record
  FROM reviews 
  WHERE id = p_review_id;
  
  IF review_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user purchased this product
  SELECT EXISTS (
    SELECT 1 
    FROM orders_main om
    JOIN order_items_new oin ON om.id = oin.order_id
    WHERE om.user_id = review_record.user_id
    AND om.financial_status = 'paid'
    AND oin.product_id = review_record.product_id
  ) INTO has_purchased;
  
  -- Update review if purchase verified
  IF has_purchased THEN
    UPDATE reviews 
    SET 
      is_verified_purchase = true,
      updated_at = now()
    WHERE id = p_review_id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_reviews_updated_at 
  BEFORE UPDATE ON reviews 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_product_reviews(TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_product_review_stats(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION can_user_review_product(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_purchase_review(UUID) TO service_role;

-- Add comments for documentation
COMMENT ON TABLE reviews IS 'Product reviews with ratings and comments from users';
COMMENT ON TABLE review_votes IS 'Helpful votes for reviews from other users';
COMMENT ON COLUMN reviews.product_id IS 'References product ID from product catalog';
COMMENT ON COLUMN reviews.rating IS 'Star rating from 1-5';
COMMENT ON COLUMN reviews.is_verified_purchase IS 'True if reviewer purchased the product';
COMMENT ON COLUMN reviews.helpful_votes IS 'Count of users who found this review helpful';
COMMENT ON COLUMN reviews.total_votes IS 'Total number of helpfulness votes received'; 