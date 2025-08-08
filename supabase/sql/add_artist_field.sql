-- Add artist field to marketplace_products table
ALTER TABLE marketplace_products 
ADD COLUMN IF NOT EXISTS artist TEXT;

-- Add a comment to describe the field
COMMENT ON COLUMN marketplace_products.artist IS 'Name of the artist or designer who created the product';

-- Create an index on the artist column for better search performance
CREATE INDEX IF NOT EXISTS idx_marketplace_products_artist 
ON marketplace_products (artist);

-- Example of how to query by artist:
-- SELECT * FROM marketplace_products WHERE artist ILIKE '%artist_name%';