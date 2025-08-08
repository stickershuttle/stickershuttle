-- Update existing marketplace products with default size-based pricing
-- This script will only update products that don't already have size_pricing set

-- First, let's see what products need updating (optional check)
-- SELECT id, title, size_pricing, size_compare_pricing 
-- FROM marketplace_products 
-- WHERE size_pricing IS NULL OR size_compare_pricing IS NULL;

-- Update products that don't have size_pricing with default values
UPDATE marketplace_products 
SET size_pricing = jsonb_build_object(
  '3', 3.99,
  '4', 4.99,
  '5', 5.99
)
WHERE size_pricing IS NULL;

-- Update products that don't have size_compare_pricing with default values
UPDATE marketplace_products 
SET size_compare_pricing = jsonb_build_object(
  '3', 4.99,
  '4', 5.99,
  '5', 6.99
)
WHERE size_compare_pricing IS NULL;

-- Optional: Update products that have empty size_pricing objects
UPDATE marketplace_products 
SET size_pricing = jsonb_build_object(
  '3', 3.99,
  '4', 4.99,
  '5', 5.99
)
WHERE size_pricing = '{}'::jsonb OR size_pricing = 'null'::jsonb;

-- Optional: Update products that have empty size_compare_pricing objects
UPDATE marketplace_products 
SET size_compare_pricing = jsonb_build_object(
  '3', 4.99,
  '4', 5.99,
  '5', 6.99
)
WHERE size_compare_pricing = '{}'::jsonb OR size_compare_pricing = 'null'::jsonb;

-- Update the updated_at timestamp for affected products
UPDATE marketplace_products 
SET updated_at = NOW()
WHERE size_pricing IS NOT NULL OR size_compare_pricing IS NOT NULL;

-- Show summary of updated products
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN size_pricing IS NOT NULL THEN 1 END) as products_with_size_pricing,
  COUNT(CASE WHEN size_compare_pricing IS NOT NULL THEN 1 END) as products_with_compare_pricing
FROM marketplace_products;