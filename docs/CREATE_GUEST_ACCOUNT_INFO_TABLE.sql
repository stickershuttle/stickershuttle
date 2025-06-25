-- Create table to temporarily store guest account information for order success page
-- This table stores the generated password for guest accounts so it can be displayed on the order success page

CREATE TABLE IF NOT EXISTS guest_account_info (
  id BIGSERIAL PRIMARY KEY,
  stripe_session_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  auto_login BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'), -- Auto-expire after 24 hours
  accessed BOOLEAN DEFAULT FALSE,
  accessed_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guest_account_info_stripe_session_id ON guest_account_info(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_guest_account_info_email ON guest_account_info(email);
CREATE INDEX IF NOT EXISTS idx_guest_account_info_expires_at ON guest_account_info(expires_at);

-- Create function to automatically delete expired entries
CREATE OR REPLACE FUNCTION delete_expired_guest_account_info()
RETURNS void AS $$
BEGIN
  DELETE FROM guest_account_info 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to clean up expired entries periodically
-- Note: In production, you might want to use a cron job instead
CREATE OR REPLACE FUNCTION cleanup_expired_guest_accounts()
RETURNS trigger AS $$
BEGIN
  -- Delete expired entries when new ones are inserted
  PERFORM delete_expired_guest_account_info();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_guest_accounts
  AFTER INSERT ON guest_account_info
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_expired_guest_accounts();

-- Grant necessary permissions
-- Note: Adjust these permissions based on your security requirements
GRANT SELECT, INSERT, UPDATE, DELETE ON guest_account_info TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON guest_account_info TO anon;
GRANT USAGE ON SEQUENCE guest_account_info_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE guest_account_info_id_seq TO anon;

-- Add RLS (Row Level Security) policies
ALTER TABLE guest_account_info ENABLE ROW LEVEL SECURITY;

-- Policy to allow public access (since this is for guest checkout)
-- In production, you might want more restrictive policies
CREATE POLICY "Allow public access to guest account info" ON guest_account_info
  FOR ALL USING (true);

-- Optional: Add comments for documentation
COMMENT ON TABLE guest_account_info IS 'Temporary storage for guest account credentials to display on order success page';
COMMENT ON COLUMN guest_account_info.stripe_session_id IS 'Stripe checkout session ID to link with the order';
COMMENT ON COLUMN guest_account_info.email IS 'Email address for the guest account';
COMMENT ON COLUMN guest_account_info.password IS 'Generated password for the guest account';
COMMENT ON COLUMN guest_account_info.expires_at IS 'When this record expires and should be deleted';
COMMENT ON COLUMN guest_account_info.accessed IS 'Whether the password has been displayed to the user';
COMMENT ON COLUMN guest_account_info.accessed_at IS 'When the password was first accessed/displayed'; 