-- Add is_additional_payment field to order_items_new table
-- This field will track items that were added via additional payment links

ALTER TABLE order_items_new 
ADD COLUMN IF NOT EXISTS is_additional_payment BOOLEAN DEFAULT FALSE;

-- Add comment to document the field
COMMENT ON COLUMN order_items_new.is_additional_payment IS 'Whether this item was added via an additional payment link after the original order';

-- Update any existing items to have false is_additional_payment if NULL
UPDATE order_items_new 
SET is_additional_payment = FALSE 
WHERE is_additional_payment IS NULL;

-- Make the field NOT NULL with default value
ALTER TABLE order_items_new 
ALTER COLUMN is_additional_payment SET NOT NULL;

-- Index for performance when querying additional payment items
CREATE INDEX IF NOT EXISTS idx_order_items_additional_payment 
ON order_items_new(is_additional_payment) 
WHERE is_additional_payment = TRUE;

-- Add helpful view for analytics
CREATE OR REPLACE VIEW additional_payment_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as additional_items_count,
    SUM(total_price) as total_additional_revenue,
    AVG(total_price) as avg_additional_item_price,
    COUNT(DISTINCT order_id) as orders_with_additional_items
FROM order_items_new 
WHERE is_additional_payment = TRUE
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Grant permissions
GRANT SELECT ON additional_payment_stats TO authenticated;
GRANT SELECT ON additional_payment_stats TO anon; 