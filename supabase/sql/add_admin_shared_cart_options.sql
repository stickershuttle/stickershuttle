-- Add admin-specific fields to shared_carts table
ALTER TABLE shared_carts 
ADD COLUMN IF NOT EXISTS allow_bypass_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allow_credits_earning BOOLEAN DEFAULT TRUE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_shared_carts_admin_options ON shared_carts(allow_bypass_payment, allow_credits_earning);
