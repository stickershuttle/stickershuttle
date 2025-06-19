-- Add proof-related columns to orders_main table
-- These columns support the proof approval workflow and email automation

-- Add proof_status column to track the overall proof status
ALTER TABLE orders_main 
ADD COLUMN IF NOT EXISTS proof_status TEXT DEFAULT NULL;

-- Add proof_sent_at column to track when proofs were sent to customer
ALTER TABLE orders_main 
ADD COLUMN IF NOT EXISTS proof_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add proof_link column to store the unique proof approval link for email automation
ALTER TABLE orders_main 
ADD COLUMN IF NOT EXISTS proof_link TEXT DEFAULT NULL;

-- Add comments to the columns
COMMENT ON COLUMN orders_main.proof_status IS 'Status of proof approval process: awaiting_approval, approved, changes_requested, etc.';
COMMENT ON COLUMN orders_main.proof_sent_at IS 'Timestamp when proofs were sent to customer';
COMMENT ON COLUMN orders_main.proof_link IS 'Unique proof approval link for customer access and email automation';

-- Example values:
-- proof_status: 'awaiting_approval', 'approved', 'changes_requested', 'pending'
-- proof_sent_at: '2024-01-15T10:30:00Z'
-- proof_link: 'https://stickershuttle.com/proofs?orderId=abc123&token=xyz789' 