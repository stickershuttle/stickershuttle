-- Add markup_percentage field to marketplace_products table
ALTER TABLE marketplace_products 
ADD COLUMN markup_percentage DECIMAL(5,2) DEFAULT 0.00;

-- Add comment for clarity
COMMENT ON COLUMN marketplace_products.markup_percentage IS 'Markup percentage to apply to calculator prices (e.g., 25.00 for 25% markup)';

-- Update existing products with default markup (can be adjusted per product)
UPDATE marketplace_products 
SET markup_percentage = 0.00 
WHERE markup_percentage IS NULL;