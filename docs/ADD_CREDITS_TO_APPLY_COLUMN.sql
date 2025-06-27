-- Add credits_to_apply column to orders_main table
-- This column stores the amount of credits that should be deducted when payment is successful

ALTER TABLE orders_main 
ADD COLUMN IF NOT EXISTS credits_to_apply DECIMAL(10,2) DEFAULT NULL;

-- Add a comment to document the column purpose
COMMENT ON COLUMN orders_main.credits_to_apply IS 'Amount of store credits to deduct when payment is successful (temporary storage before webhook processing)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders_main' 
AND column_name = 'credits_to_apply'; 