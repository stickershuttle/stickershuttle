-- Add size_pricing field to marketplace_products table
ALTER TABLE marketplace_products 
ADD COLUMN IF NOT EXISTS size_pricing JSONB;

-- Add size_compare_pricing field to marketplace_products table
ALTER TABLE marketplace_products 
ADD COLUMN IF NOT EXISTS size_compare_pricing JSONB;

-- Add comments to describe the structure
COMMENT ON COLUMN marketplace_products.size_pricing IS 'JSON object containing size-specific pricing: {"3": 12.99, "4": 15.99, "5": 18.99}';
COMMENT ON COLUMN marketplace_products.size_compare_pricing IS 'JSON object containing size-specific compare at pricing: {"3": 15.99, "4": 19.99, "5": 23.99}';

-- Create indexes on the pricing columns for better query performance
CREATE INDEX IF NOT EXISTS idx_marketplace_products_size_pricing 
ON marketplace_products USING GIN (size_pricing);

CREATE INDEX IF NOT EXISTS idx_marketplace_products_size_compare_pricing 
ON marketplace_products USING GIN (size_compare_pricing);

-- Example of how to query size-specific pricing:
-- SELECT title, size_pricing->'3' as price_3_inch, size_compare_pricing->'3' as compare_price_3_inch 
-- FROM marketplace_products WHERE size_pricing IS NOT NULL;