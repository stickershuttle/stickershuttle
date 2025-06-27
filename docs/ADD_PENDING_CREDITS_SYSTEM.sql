-- Pending Credits System for Sticker Shuttle
-- This system allows credits to be assigned to emails before users create accounts
-- When a user signs up with a matching email, they automatically receive the credits

-- Create pending_credits table
CREATE TABLE IF NOT EXISTS pending_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_credits_email ON pending_credits(email);
CREATE INDEX IF NOT EXISTS idx_pending_credits_applied ON pending_credits(applied);

-- Function to apply pending credits when user signs up
CREATE OR REPLACE FUNCTION apply_pending_credits()
RETURNS TRIGGER AS $$
DECLARE
  v_pending_credit RECORD;
BEGIN
  -- Look for pending credits for this email
  SELECT * INTO v_pending_credit
  FROM pending_credits
  WHERE LOWER(email) = LOWER(NEW.email)
  AND applied = FALSE
  LIMIT 1;
  
  -- If found, apply the credits
  IF FOUND THEN
    -- Add credits to user
    PERFORM add_user_credits(
      NEW.id,
      v_pending_credit.amount,
      v_pending_credit.reason,
      NULL,
      NULL
    );
    
    -- Mark as applied
    UPDATE pending_credits
    SET applied = TRUE,
        applied_at = NOW(),
        user_id = NEW.id
    WHERE id = v_pending_credit.id;
    
    -- Log the credit application
    RAISE NOTICE 'Applied % credits to user % (email: %)', 
      v_pending_credit.amount, NEW.id, NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS apply_pending_credits_trigger ON auth.users;
CREATE TRIGGER apply_pending_credits_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION apply_pending_credits();

-- Grant permissions
GRANT SELECT ON pending_credits TO authenticated;
GRANT ALL ON pending_credits TO service_role;

-- Enable RLS
ALTER TABLE pending_credits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role can manage all pending credits" ON pending_credits
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can view their own pending credits" ON pending_credits
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

-- Add $25 credits for all existing profile-only users
-- This will add pending credits for users who have profiles but no auth accounts
INSERT INTO pending_credits (email, amount, reason)
SELECT DISTINCT 
  LOWER(up.email),
  25.00,
  'Welcome bonus - Thank you for being a valued customer!'
FROM user_profiles up
WHERE up.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE LOWER(au.email) = LOWER(up.email)
  )
  AND NOT EXISTS (
    SELECT 1 FROM pending_credits pc 
    WHERE LOWER(pc.email) = LOWER(up.email)
  );

-- View to see pending credits status
CREATE OR REPLACE VIEW pending_credits_summary AS
SELECT 
  COUNT(*) FILTER (WHERE NOT applied) as pending_count,
  COUNT(*) FILTER (WHERE applied) as applied_count,
  SUM(amount) FILTER (WHERE NOT applied) as pending_amount,
  SUM(amount) FILTER (WHERE applied) as applied_amount
FROM pending_credits;

-- Function to manually apply pending credits (admin use)
CREATE OR REPLACE FUNCTION manually_apply_pending_credits(p_email TEXT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  credits_applied DECIMAL
) AS $$
DECLARE
  v_user_id UUID;
  v_pending_credit RECORD;
BEGIN
  -- Find the user
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(p_email);
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not found', 0::DECIMAL;
    RETURN;
  END IF;
  
  -- Find pending credits
  SELECT * INTO v_pending_credit
  FROM pending_credits
  WHERE LOWER(email) = LOWER(p_email)
  AND applied = FALSE
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'No pending credits found', 0::DECIMAL;
    RETURN;
  END IF;
  
  -- Apply the credits
  PERFORM add_user_credits(
    v_user_id,
    v_pending_credit.amount,
    v_pending_credit.reason,
    NULL,
    NULL
  );
  
  -- Mark as applied
  UPDATE pending_credits
  SET applied = TRUE,
      applied_at = NOW(),
      user_id = v_user_id
  WHERE id = v_pending_credit.id;
  
  RETURN QUERY SELECT TRUE, 'Credits applied successfully', v_pending_credit.amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION manually_apply_pending_credits TO service_role;

-- Check the results
SELECT 
  'Total pending credits:' as description,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM pending_credits
WHERE NOT applied

UNION ALL

SELECT 
  'Total user profiles without auth:' as description,
  COUNT(*) as count,
  NULL as total_amount
FROM user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au 
  WHERE LOWER(au.email) = LOWER(up.email)
); 