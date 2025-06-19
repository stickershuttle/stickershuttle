-- Add proofs column to orders_main table
-- This column will store an array of proof objects for each order

ALTER TABLE orders_main 
ADD COLUMN IF NOT EXISTS proofs JSONB DEFAULT '[]'::jsonb;

-- Add an index on the proofs column for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_main_proofs ON orders_main USING GIN (proofs);

-- Add a comment to the column
COMMENT ON COLUMN orders_main.proofs IS 'Array of proof objects containing URLs, metadata, and status for order proofs';

-- Example structure of proofs JSONB:
-- [
--   {
--     "id": "proof_1234567890_abc123",
--     "orderId": "order-uuid",
--     "proofUrl": "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1234567890/proofs/proof_file.jpg",
--     "proofPublicId": "proofs/proof_file",
--     "proofTitle": "Design Proof 1",
--     "uploadedAt": "2024-01-15T10:30:00Z",
--     "uploadedBy": "admin",
--     "status": "pending",
--     "customerNotes": null,
--     "adminNotes": "Initial proof for review"
--   }
-- ] 