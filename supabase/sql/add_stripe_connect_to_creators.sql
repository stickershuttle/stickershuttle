-- Add Stripe Connect fields to creators table
ALTER TABLE creators ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);
ALTER TABLE creators ADD COLUMN IF NOT EXISTS stripe_account_status VARCHAR(50) DEFAULT 'not_connected';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS stripe_onboarding_url TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS stripe_dashboard_url TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS stripe_requirements_past_due TEXT[];
ALTER TABLE creators ADD COLUMN IF NOT EXISTS stripe_requirements_currently_due TEXT[];
ALTER TABLE creators ADD COLUMN IF NOT EXISTS stripe_requirements_eventually_due TEXT[];
ALTER TABLE creators ADD COLUMN IF NOT EXISTS stripe_requirements_disabled_reason VARCHAR(255);
ALTER TABLE creators ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,4) DEFAULT 0.15; -- 15% platform commission
ALTER TABLE creators ADD COLUMN IF NOT EXISTS payout_schedule VARCHAR(50) DEFAULT 'weekly';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS last_payout_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS total_payouts DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS pending_payouts DECIMAL(10,2) DEFAULT 0.00;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_creators_stripe_account_id ON creators(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_creators_stripe_account_status ON creators(stripe_account_status);

-- Create a table to track creator payouts
CREATE TABLE IF NOT EXISTS creator_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    stripe_payout_id VARCHAR(255) NOT NULL,
    stripe_account_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    arrival_date TIMESTAMP WITH TIME ZONE,
    description TEXT,
    failure_code VARCHAR(255),
    failure_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for creator_payouts
CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator_id ON creator_payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_stripe_payout_id ON creator_payouts(stripe_payout_id);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_status ON creator_payouts(status);

-- Create a table to track creator earnings from orders
CREATE TABLE IF NOT EXISTS creator_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders_main(id) ON DELETE CASCADE,
    marketplace_product_id UUID REFERENCES marketplace_products(id) ON DELETE SET NULL,
    stripe_payment_intent_id VARCHAR(255),
    stripe_transfer_id VARCHAR(255),
    gross_amount DECIMAL(10,2) NOT NULL, -- Total product sale amount
    commission_rate DECIMAL(5,4) NOT NULL, -- Commission rate at time of sale
    platform_fee DECIMAL(10,2) NOT NULL, -- Amount kept by platform
    creator_earnings DECIMAL(10,2) NOT NULL, -- Amount for creator
    stripe_fee DECIMAL(10,2) DEFAULT 0.00, -- Stripe processing fee
    net_earnings DECIMAL(10,2) NOT NULL, -- Final amount after all fees
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, transferred, failed
    transferred_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for creator_earnings
CREATE INDEX IF NOT EXISTS idx_creator_earnings_creator_id ON creator_earnings(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_order_id ON creator_earnings(order_id);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_status ON creator_earnings(status);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_stripe_transfer_id ON creator_earnings(stripe_transfer_id);

-- Add RLS policies for creator_payouts
ALTER TABLE creator_payouts ENABLE ROW LEVEL SECURITY;

-- Creators can view their own payouts
CREATE POLICY "Creators can view own payouts" ON creator_payouts
    FOR SELECT USING (
        creator_id IN (
            SELECT id FROM creators WHERE user_id = auth.uid()
        )
    );

-- Add RLS policies for creator_earnings
ALTER TABLE creator_earnings ENABLE ROW LEVEL SECURITY;

-- Creators can view their own earnings
CREATE POLICY "Creators can view own earnings" ON creator_earnings
    FOR SELECT USING (
        creator_id IN (
            SELECT id FROM creators WHERE user_id = auth.uid()
        )
    );

-- Create a function to update creator totals when earnings change
CREATE OR REPLACE FUNCTION update_creator_payout_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the creator's payout totals
    UPDATE creators 
    SET 
        total_payouts = COALESCE((
            SELECT SUM(amount) 
            FROM creator_payouts 
            WHERE creator_id = NEW.creator_id AND status = 'paid'
        ), 0),
        pending_payouts = COALESCE((
            SELECT SUM(amount) 
            FROM creator_payouts 
            WHERE creator_id = NEW.creator_id AND status IN ('pending', 'in_transit')
        ), 0),
        updated_at = NOW()
    WHERE id = NEW.creator_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payout totals
CREATE TRIGGER trigger_update_creator_payout_totals
    AFTER INSERT OR UPDATE ON creator_payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_creator_payout_totals();

-- Add comments for documentation
COMMENT ON COLUMN creators.stripe_account_id IS 'Stripe Connect account ID for receiving payments';
COMMENT ON COLUMN creators.stripe_account_status IS 'Status of Stripe Connect account: not_connected, pending, restricted, active';
COMMENT ON COLUMN creators.commission_rate IS 'Platform commission rate (e.g., 0.15 for 15%)';
COMMENT ON TABLE creator_payouts IS 'Tracks Stripe payouts to creators';
COMMENT ON TABLE creator_earnings IS 'Tracks creator earnings from individual orders';
