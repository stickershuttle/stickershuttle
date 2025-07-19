-- Add stripe_line_item_id field to order_items_new table
-- This field will store the unique Stripe line item ID for better tracking and updates

ALTER TABLE order_items_new 
ADD COLUMN IF NOT EXISTS stripe_line_item_id VARCHAR(255);

-- Add comment to document the field
COMMENT ON COLUMN order_items_new.stripe_line_item_id IS 'Unique Stripe line item ID for tracking and updates from webhook events';

-- Add index for performance when querying by stripe line item ID
CREATE INDEX IF NOT EXISTS idx_order_items_stripe_line_item_id 
ON order_items_new(stripe_line_item_id) 
WHERE stripe_line_item_id IS NOT NULL;

-- Grant permissions for the service role to access this column
-- (This is typically handled automatically, but added for completeness) 