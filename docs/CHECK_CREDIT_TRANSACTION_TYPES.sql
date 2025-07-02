-- Check what transaction types currently exist in your credits table
SELECT DISTINCT transaction_type, COUNT(*) as count
FROM public.credits
GROUP BY transaction_type
ORDER BY count DESC;

-- This will show you all the unique transaction types in your data
-- Run this BEFORE running the reset script to understand what data you have 