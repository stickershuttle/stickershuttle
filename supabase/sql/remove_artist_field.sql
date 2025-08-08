-- Remove artist field from marketplace_products table since we now use creator system
-- This migration removes the artist field that was added in add_artist_field.sql

-- Drop the index first
DROP INDEX IF EXISTS idx_marketplace_products_artist;

-- Remove the artist column
ALTER TABLE marketplace_products 
DROP COLUMN IF EXISTS artist;

-- Verify the change (uncomment to run a test query)
-- SELECT column_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'marketplace_products' 
-- AND column_name = 'artist';