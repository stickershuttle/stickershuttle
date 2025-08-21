-- Update creator_earnings table to support cost-based payout structure
-- This replaces the fixed commission rate system with flexible cost calculations

-- Add new columns for cost breakdown
ALTER TABLE creator_earnings 
ADD COLUMN IF NOT EXISTS quantity INTEGER,
ADD COLUMN IF NOT EXISTS material_shipping_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sticker_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS fulfillment_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS size VARCHAR(10);

-- Update the commission_rate column to be nullable since we're moving away from percentage-based
ALTER TABLE creator_earnings 
ALTER COLUMN commission_rate DROP NOT NULL;

-- Add index for quantity for performance
CREATE INDEX IF NOT EXISTS idx_creator_earnings_quantity ON creator_earnings(quantity);

-- Add comments to explain the new structure
COMMENT ON COLUMN creator_earnings.quantity IS 'Number of stickers in this order item';
COMMENT ON COLUMN creator_earnings.material_shipping_cost IS 'Cost of materials and shipping for this quantity';
COMMENT ON COLUMN creator_earnings.sticker_cost IS 'Cost of sticker production (varies by size: 3"=$0.35, 4"=$0.40, 5"=$0.45)';
COMMENT ON COLUMN creator_earnings.fulfillment_cost IS 'Cost of order fulfillment and handling';
COMMENT ON COLUMN creator_earnings.size IS 'Sticker size (3", 4", or 5") used for cost calculation';
COMMENT ON COLUMN creator_earnings.commission_rate IS 'Legacy field - now nullable as we use cost-based calculations';

-- Update the creators table to make commission_rate optional
ALTER TABLE creators 
ALTER COLUMN commission_rate DROP NOT NULL,
ALTER COLUMN commission_rate SET DEFAULT NULL;

-- Add comment to creators table
COMMENT ON COLUMN creators.commission_rate IS 'Legacy commission rate - now optional as payouts use cost-based calculations';
