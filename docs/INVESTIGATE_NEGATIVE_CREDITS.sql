-- Investigate negative credit balances

-- 1. Check all credit transactions for these users
SELECT 
    user_id,
    amount,
    transaction_type,
    reason,
    created_at,
    reversed_at,
    order_id
FROM credits
WHERE user_id IN (
    '7b121ce2-cc41-4aef-bf8a-f55643b63f9a',
    '24947705-8f80-48b2-ac4d-151a730cb3fb'
)
ORDER BY user_id, created_at;

-- 2. Check if 'add' transactions have negative amounts
SELECT 
    transaction_type,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    MIN(amount) as min_amount,
    MAX(amount) as max_amount,
    AVG(amount) as avg_amount
FROM credits
GROUP BY transaction_type;

-- 3. See all transactions with details
SELECT 
    id,
    user_id,
    amount,
    balance,
    transaction_type,
    reason,
    created_at
FROM credits
ORDER BY created_at DESC; 