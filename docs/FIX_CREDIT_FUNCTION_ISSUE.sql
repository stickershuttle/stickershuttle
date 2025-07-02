-- Diagnostic: Check if the function exists and with what parameters
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'use_credits_for_order';

-- Drop ALL existing versions of the function
DROP FUNCTION IF EXISTS public.use_credits_for_order(numeric, uuid, text, text, uuid);
DROP FUNCTION IF EXISTS public.use_credits_for_order(uuid, uuid, numeric);
DROP FUNCTION IF EXISTS public.use_credits_for_order(uuid, uuid, numeric, text, text);

-- Then run the CREATE_CREDITS_SYSTEM.sql file to create the correct version 