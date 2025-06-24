-- Add credits_applied column to orders_main table
ALTER TABLE orders_main 
ADD COLUMN IF NOT EXISTS credits_applied DECIMAL(10, 2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN orders_main.credits_applied IS 'Amount of store credits applied to this order';

-- Update the view if needed (optional, depends on your views)
-- This ensures any views that select * from orders_main will include the new column 