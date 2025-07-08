-- Add unique constraint to prevent duplicate earned credits for the same order
-- This ensures only one 'earned' credit transaction per order per user

-- First, let's check if there are any existing duplicates and clean them up
WITH duplicate_credits AS (
  SELECT 
    id,
    user_id,
    order_id,
    amount,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id, order_id, transaction_type ORDER BY created_at ASC) as row_num
  FROM credits
  WHERE transaction_type = 'earned' AND order_id IS NOT NULL
)
DELETE FROM credits
WHERE id IN (
  SELECT id FROM duplicate_credits WHERE row_num > 1
);

-- Now add a partial unique index (PostgreSQL way to do conditional unique constraints)
CREATE UNIQUE INDEX unique_earned_credits_per_order 
ON credits (user_id, order_id, transaction_type) 
WHERE transaction_type = 'earned' AND order_id IS NOT NULL;

-- This index will prevent any duplicate earned credits for the same order
-- It only applies to 'earned' transaction types with an order_id 