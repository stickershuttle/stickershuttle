-- Add wholesale_discount field to orders_main table
-- This field will store the discount amount applied to wholesale customers (15% off)

ALTER TABLE orders_main 
ADD COLUMN IF NOT EXISTS wholesale_discount DECIMAL(10,2) DEFAULT 0.00;

-- Add comment to document the field
COMMENT ON COLUMN orders_main.wholesale_discount IS 'Discount amount applied to wholesale customers (15% off total order)';

-- Update any existing orders to have 0.00 wholesale_discount if NULL
UPDATE orders_main 
SET wholesale_discount = 0.00 
WHERE wholesale_discount IS NULL;

-- Make the field NOT NULL with default value
ALTER TABLE orders_main 
ALTER COLUMN wholesale_discount SET NOT NULL;

-- Index for performance (optional, but good for reporting)
CREATE INDEX IF NOT EXISTS idx_orders_main_wholesale_discount 
ON orders_main (wholesale_discount);

-- Add helpful view for analytics
CREATE OR REPLACE VIEW wholesale_discount_stats AS
SELECT 
    DATE(order_created_at) as date,
    COUNT(*) as orders_count,
    SUM(wholesale_discount) as total_wholesale_discount,
    AVG(wholesale_discount) as avg_wholesale_discount,
    SUM(total_price) as total_revenue
FROM orders_main 
WHERE wholesale_discount > 0
GROUP BY DATE(order_created_at)
ORDER BY date DESC;

-- Grant permissions
GRANT SELECT ON wholesale_discount_stats TO authenticated;
GRANT SELECT ON wholesale_discount_stats TO anon; 