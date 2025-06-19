-- SQL commands to clear all proofs data from Supabase
-- Run these in your Supabase SQL Editor

-- First, let's see what tables we have related to proofs
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (table_name LIKE '%proof%' OR table_name = 'orders')
ORDER BY table_name, ordinal_position;

-- Method 1: If you have a separate order_proofs table
DELETE FROM order_proofs;

-- Method 2: If you have a standalone proofs table
DELETE FROM proofs;

-- Method 3: If proofs are stored as JSON in the orders table
UPDATE orders SET proofs = '[]'::jsonb WHERE proofs IS NOT NULL;

-- Method 4: If proofs are stored as a separate column in orders
UPDATE orders SET proof_urls = NULL, proof_data = NULL;

-- Verify the cleanup
SELECT id, order_number, 
       CASE 
         WHEN proofs IS NOT NULL THEN jsonb_array_length(proofs)
         ELSE 0 
       END as proof_count
FROM orders; 