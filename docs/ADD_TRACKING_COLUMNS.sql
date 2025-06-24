-- Add tracking-related columns to orders_main table
-- These columns will store the shipping carrier and public tracking URL from EasyPost

-- Add tracking_company column to store the carrier name (UPS, FedEx, USPS, etc.)
ALTER TABLE orders_main 
ADD COLUMN IF NOT EXISTS tracking_company TEXT DEFAULT NULL;

-- Add tracking_url column to store the public tracking URL from EasyPost
ALTER TABLE orders_main 
ADD COLUMN IF NOT EXISTS tracking_url TEXT DEFAULT NULL;

-- Add comments to the columns for documentation
COMMENT ON COLUMN orders_main.tracking_company IS 'Shipping carrier name from EasyPost (e.g., UPS, FedEx, USPS)';
COMMENT ON COLUMN orders_main.tracking_url IS 'Public tracking URL from EasyPost for customer tracking';

-- Create an index on tracking_company for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_main_tracking_company ON orders_main(tracking_company);

-- Example values after EasyPost integration:
-- tracking_number: '1Z12345E0291980793'
-- tracking_company: 'UPS'
-- tracking_url: 'https://wwwapps.ups.com/tracking/tracking.cgi?tracknum=1Z12345E0291980793'

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'orders_main' 
AND column_name IN ('tracking_number', 'tracking_company', 'tracking_url')
ORDER BY column_name; 