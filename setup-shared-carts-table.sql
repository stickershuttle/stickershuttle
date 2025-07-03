-- Create shared_carts table for storing shared cart data
CREATE TABLE IF NOT EXISTS shared_carts (
  id SERIAL PRIMARY KEY,
  share_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  cart_data JSONB NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days',
  access_count INTEGER DEFAULT 0,
  last_access_at TIMESTAMP WITH TIME ZONE
);

-- Create index on share_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_shared_carts_share_id ON shared_carts(share_id);

-- Create index on created_by for admin queries
CREATE INDEX IF NOT EXISTS idx_shared_carts_created_by ON shared_carts(created_by);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_shared_carts_expires_at ON shared_carts(expires_at);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_shared_carts_created_at ON shared_carts(created_at);

-- Enable Row Level Security
ALTER TABLE shared_carts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read shared carts (public access)
CREATE POLICY "Allow public read access to shared carts" ON shared_carts
  FOR SELECT USING (true);

-- Create policy to allow anyone to create shared carts
CREATE POLICY "Allow anyone to create shared carts" ON shared_carts
  FOR INSERT WITH CHECK (true);

-- Create policy to allow creators to update their own shared carts
CREATE POLICY "Allow creators to update their own shared carts" ON shared_carts
  FOR UPDATE USING (created_by = auth.jwt() ->> 'email');

-- Create policy to allow creators to delete their own shared carts
CREATE POLICY "Allow creators to delete their own shared carts" ON shared_carts
  FOR DELETE USING (created_by = auth.jwt() ->> 'email');

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_shared_carts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_shared_carts_updated_at
  BEFORE UPDATE ON shared_carts
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_carts_updated_at();

-- Function to increment access count
CREATE OR REPLACE FUNCTION increment_shared_cart_access(cart_share_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE shared_carts 
  SET 
    access_count = access_count + 1,
    last_access_at = NOW()
  WHERE share_id = cart_share_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired shared carts (optional)
CREATE OR REPLACE FUNCTION cleanup_expired_shared_carts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM shared_carts 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON shared_carts TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE shared_carts_id_seq TO anon, authenticated;

-- Insert a sample shared cart for testing (optional)
-- INSERT INTO shared_carts (share_id, cart_data, created_by) 
-- VALUES (
--   'c3b936fc-0066-448b-89a2-519308c684bd',
--   '[{"id":"test-item-1","product":{"name":"Test Sticker"},"quantity":1,"totalPrice":5.99}]'::jsonb,
--   'test@example.com'
-- );

-- Display table info
SELECT 
  'Shared carts table created successfully!' as message,
  'Table: shared_carts' as table_name,
  'Indexes: 4 created' as indexes,
  'Policies: 4 RLS policies created' as security,
  'Functions: 3 helper functions created' as functions;

COMMENT ON TABLE shared_carts IS 'Stores shared cart data for public access';
COMMENT ON COLUMN shared_carts.share_id IS 'Unique identifier for public sharing';
COMMENT ON COLUMN shared_carts.cart_data IS 'JSON data containing cart items and configuration';
COMMENT ON COLUMN shared_carts.created_by IS 'Email of the admin user who created the share';
COMMENT ON COLUMN shared_carts.expires_at IS 'When this shared cart expires (NULL = never expires)';
COMMENT ON COLUMN shared_carts.access_count IS 'Number of times this cart has been accessed';
COMMENT ON COLUMN shared_carts.last_access_at IS 'Last time this cart was accessed'; 