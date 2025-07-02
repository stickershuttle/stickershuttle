-- Fix incorrect transaction types for earned credits

-- First, let's see what we're about to fix
SELECT 
    id,
    user_id,
    amount,
    transaction_type,
    reason,
    created_at
FROM credits
WHERE transaction_type = 'used'
AND reason LIKE '%earned from your recent order%';

-- Fix the transaction types: change 'used' to 'earned' for cashback credits
UPDATE credits
SET transaction_type = 'earned'
WHERE transaction_type = 'used'
AND reason LIKE '%earned from your recent order%';

-- Verify the fix worked - check balances again
SELECT * FROM user_credit_balance;

-- Optional: Recalculate the balance column for affected transactions
-- This updates the running balance column based on corrected transaction types
WITH ordered_credits AS (
    SELECT 
        id,
        user_id,
        amount,
        transaction_type,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
    FROM credits
    WHERE reversed_at IS NULL
),
running_balances AS (
    SELECT 
        id,
        user_id,
        SUM(
            CASE 
                WHEN transaction_type IN ('earned', 'adjusted', 'add') THEN amount
                WHEN transaction_type IN ('used', 'deduction_pending_payment') THEN -amount
                ELSE 0
            END
        ) OVER (PARTITION BY user_id ORDER BY rn) as new_balance
    FROM ordered_credits
)
UPDATE credits c
SET balance = rb.new_balance
FROM running_balances rb
WHERE c.id = rb.id; 