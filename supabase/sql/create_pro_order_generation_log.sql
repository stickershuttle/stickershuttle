-- Pro Order Generation Tracking Table
-- Tracks when each Pro member's next order should be generated

CREATE TABLE IF NOT EXISTS pro_order_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  last_check_date TIMESTAMPTZ,
  next_order_date TIMESTAMPTZ NOT NULL,
  last_order_generated_at TIMESTAMPTZ,
  last_order_id UUID REFERENCES orders_main(id) ON DELETE SET NULL,
  last_design_lock_warning_sent_at TIMESTAMPTZ,
  last_design_locked_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one log entry per user
  UNIQUE(user_id)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_pro_order_log_user_id ON pro_order_generation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_order_log_next_order_date ON pro_order_generation_log(next_order_date);
CREATE INDEX IF NOT EXISTS idx_pro_order_log_status ON pro_order_generation_log(status);

-- RLS policies (admin only)
ALTER TABLE pro_order_generation_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to pro_order_generation_log"
  ON pro_order_generation_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pro_order_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_pro_order_log_updated_at_trigger ON pro_order_generation_log;
CREATE TRIGGER update_pro_order_log_updated_at_trigger
  BEFORE UPDATE ON pro_order_generation_log
  FOR EACH ROW
  EXECUTE FUNCTION update_pro_order_log_updated_at();

-- Comments for documentation
COMMENT ON TABLE pro_order_generation_log IS 'Tracks Pro member order generation scheduling and automation';
COMMENT ON COLUMN pro_order_generation_log.next_order_date IS 'Date when next monthly order should be generated (25 days from subscription start, 5 days before 30-day renewal)';
COMMENT ON COLUMN pro_order_generation_log.last_design_lock_warning_sent_at IS 'When the 3-day design lock warning email was last sent';
COMMENT ON COLUMN pro_order_generation_log.status IS 'Status: active, paused, canceled';

