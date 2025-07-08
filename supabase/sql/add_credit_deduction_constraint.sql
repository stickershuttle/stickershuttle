-- Add unique constraint to prevent duplicate credit deductions for the same order
-- This ensures only one 'used' credit transaction per order per user

-- First, let's check if there are any existing duplicate deductions and clean them up
WITH duplicate_deductions AS (
  SELECT 
    id,
    user_id,
    order_id,
    amount,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id, order_id, transaction_type ORDER BY created_at ASC) as row_num
  FROM credits
  WHERE transaction_type = 'used' 
    AND order_id IS NOT NULL 
    AND amount < 0  -- Negative amounts are deductions
)
DELETE FROM credits
WHERE id IN (
  SELECT id FROM duplicate_deductions WHERE row_num > 1
);

-- Now add a partial unique index for credit deductions
-- This prevents duplicate 'used' credits for the same order
CREATE UNIQUE INDEX IF NOT EXISTS unique_used_credits_per_order 
ON credits (user_id, order_id, transaction_type) 
WHERE transaction_type = 'used' AND order_id IS NOT NULL AND amount < 0;

-- Also add an index for the existing earned credits constraint if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS unique_earned_credits_per_order 
ON credits (user_id, order_id, transaction_type) 
WHERE transaction_type = 'earned' AND order_id IS NOT NULL;

-- This ensures:
-- 1. Only one credit deduction (used) per order per user
-- 2. Only one credit earning (earned) per order per user
-- 3. Prevents race conditions and duplicate webhook processing 