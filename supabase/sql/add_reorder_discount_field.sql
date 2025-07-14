-- Add reorder_discount field to orders_main table
-- This field will store the discount amount applied to reordered items (10% off)

ALTER TABLE orders_main 
ADD COLUMN IF NOT EXISTS reorder_discount DECIMAL(10,2) DEFAULT 0.00;

-- Add comment to document the field
COMMENT ON COLUMN orders_main.reorder_discount IS 'Discount amount applied to reordered items (10% off reordered items only)';

-- Update any existing orders to have 0.00 reorder_discount if NULL
UPDATE orders_main 
SET reorder_discount = 0.00 
WHERE reorder_discount IS NULL;

-- Make the field NOT NULL with default value
ALTER TABLE orders_main 
ALTER COLUMN reorder_discount SET NOT NULL;

-- Index for performance (optional, but good for reporting)
CREATE INDEX IF NOT EXISTS idx_orders_main_reorder_discount 
ON orders_main(reorder_discount) 
WHERE reorder_discount > 0; 