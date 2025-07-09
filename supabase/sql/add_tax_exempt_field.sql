-- Add tax exemption fields to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN is_tax_exempt BOOLEAN DEFAULT FALSE,
ADD COLUMN tax_exempt_id TEXT,
ADD COLUMN tax_exempt_reason TEXT,
ADD COLUMN tax_exempt_expires_at TIMESTAMP,
ADD COLUMN tax_exempt_updated_at TIMESTAMP,
ADD COLUMN tax_exempt_updated_by TEXT;

-- Add index for better performance when querying tax exempt customers
CREATE INDEX idx_user_profiles_tax_exempt ON user_profiles(is_tax_exempt);

-- Add comments to document the fields
COMMENT ON COLUMN user_profiles.is_tax_exempt IS 'Whether the customer is tax exempt for checkout purposes';
COMMENT ON COLUMN user_profiles.tax_exempt_id IS 'Tax exemption certificate ID or number';
COMMENT ON COLUMN user_profiles.tax_exempt_reason IS 'Reason for tax exemption (e.g., non-profit, reseller)';
COMMENT ON COLUMN user_profiles.tax_exempt_expires_at IS 'When the tax exemption expires';
COMMENT ON COLUMN user_profiles.tax_exempt_updated_at IS 'When the tax exemption was last updated';
COMMENT ON COLUMN user_profiles.tax_exempt_updated_by IS 'User ID who updated the tax exemption'; 