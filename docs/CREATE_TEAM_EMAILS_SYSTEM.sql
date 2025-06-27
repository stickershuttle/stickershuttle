-- Team Emails System Implementation
-- Allows users to add multiple email addresses to their account for team login

BEGIN;

-- Create team_emails table
CREATE TABLE IF NOT EXISTS team_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Link to primary user account
  primary_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Team member email
  email TEXT NOT NULL,
  
  -- Verification and status
  is_verified BOOLEAN DEFAULT false,
  verification_token UUID DEFAULT uuid_generate_v4(),
  is_active BOOLEAN DEFAULT true,
  
  -- Role and permissions
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{"can_view_orders": true, "can_edit_profile": false, "can_manage_team": false}'::jsonb,
  
  -- Metadata
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE(email),
  CONSTRAINT different_from_primary CHECK (email != (SELECT email FROM auth.users WHERE id = primary_user_id))
);

-- Indexes for performance
CREATE INDEX idx_team_emails_primary_user_id ON team_emails(primary_user_id);
CREATE INDEX idx_team_emails_email ON team_emails(email) WHERE is_verified = true;
CREATE INDEX idx_team_emails_verification_token ON team_emails(verification_token) WHERE is_verified = false;

-- Enable RLS
ALTER TABLE team_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view team emails for their account
CREATE POLICY "Users can view own team emails" ON team_emails
  FOR SELECT
  USING (auth.uid() = primary_user_id);

-- Users can insert team emails for their account  
CREATE POLICY "Users can add team emails" ON team_emails
  FOR INSERT
  WITH CHECK (auth.uid() = primary_user_id AND auth.uid() = invited_by);

-- Users can update their own team emails
CREATE POLICY "Users can update own team emails" ON team_emails
  FOR UPDATE
  USING (auth.uid() = primary_user_id)
  WITH CHECK (auth.uid() = primary_user_id);

-- Users can delete their own team emails
CREATE POLICY "Users can delete own team emails" ON team_emails
  FOR DELETE  
  USING (auth.uid() = primary_user_id);

-- Service role can do everything
CREATE POLICY "Service role full access" ON team_emails
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to add a team email
CREATE OR REPLACE FUNCTION add_team_email(
  p_email TEXT,
  p_role TEXT DEFAULT 'member',
  p_permissions JSONB DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  team_email_id UUID,
  verification_token UUID
) AS $$
DECLARE
  v_primary_user_id UUID;
  v_team_email_id UUID;
  v_verification_token UUID;
  v_primary_email TEXT;
BEGIN
  -- Get the primary user ID
  v_primary_user_id := auth.uid();
  
  IF v_primary_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not authenticated', NULL::UUID, NULL::UUID;
    RETURN;
  END IF;
  
  -- Get primary user's email
  SELECT email INTO v_primary_email FROM auth.users WHERE id = v_primary_user_id;
  
  -- Check if email is same as primary
  IF lower(p_email) = lower(v_primary_email) THEN
    RETURN QUERY SELECT false, 'Cannot add your primary email as a team email', NULL::UUID, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if email already exists in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email)) THEN
    RETURN QUERY SELECT false, 'This email is already registered as a primary account', NULL::UUID, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if email already exists as a team email
  IF EXISTS (SELECT 1 FROM team_emails WHERE lower(email) = lower(p_email)) THEN
    RETURN QUERY SELECT false, 'This email is already added to another account', NULL::UUID, NULL::UUID;
    RETURN;
  END IF;
  
  -- Insert the team email
  INSERT INTO team_emails (
    primary_user_id,
    email,
    role,
    permissions,
    invited_by
  ) VALUES (
    v_primary_user_id,
    lower(p_email),
    p_role,
    COALESCE(p_permissions, 
      CASE p_role
        WHEN 'admin' THEN '{"can_view_orders": true, "can_edit_profile": true, "can_manage_team": true}'::jsonb
        WHEN 'viewer' THEN '{"can_view_orders": true, "can_edit_profile": false, "can_manage_team": false}'::jsonb
        ELSE '{"can_view_orders": true, "can_edit_profile": false, "can_manage_team": false}'::jsonb
      END
    ),
    v_primary_user_id
  )
  RETURNING id, verification_token INTO v_team_email_id, v_verification_token;
  
  RETURN QUERY SELECT true, 'Team email added successfully', v_team_email_id, v_verification_token;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Error adding team email: ' || SQLERRM, NULL::UUID, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify team email
CREATE OR REPLACE FUNCTION verify_team_email(
  p_verification_token UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  primary_user_id UUID
) AS $$
DECLARE
  v_team_email RECORD;
BEGIN
  -- Find the team email
  SELECT * INTO v_team_email
  FROM team_emails
  WHERE verification_token = p_verification_token
    AND is_verified = false
    AND is_active = true;
    
  IF v_team_email.id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid or expired verification token', NULL::UUID;
    RETURN;
  END IF;
  
  -- Update the team email
  UPDATE team_emails
  SET 
    is_verified = true,
    verified_at = now(),
    verification_token = NULL,
    updated_at = now()
  WHERE id = v_team_email.id;
  
  RETURN QUERY SELECT true, 'Email verified successfully', v_team_email.primary_user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Error verifying email: ' || SQLERRM, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to authenticate with team email
CREATE OR REPLACE FUNCTION authenticate_team_email(
  p_email TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  primary_user_id UUID,
  team_email_id UUID,
  permissions JSONB
) AS $$
DECLARE
  v_team_email RECORD;
BEGIN
  -- Find verified team email
  SELECT * INTO v_team_email
  FROM team_emails
  WHERE lower(email) = lower(p_email)
    AND is_verified = true
    AND is_active = true;
    
  IF v_team_email.id IS NULL THEN
    RETURN QUERY SELECT false, 'Team email not found or not verified', NULL::UUID, NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Update last login
  UPDATE team_emails
  SET last_login_at = now()
  WHERE id = v_team_email.id;
  
  RETURN QUERY SELECT 
    true, 
    'Authentication successful',
    v_team_email.primary_user_id,
    v_team_email.id,
    v_team_email.permissions;
    
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Error during authentication: ' || SQLERRM, NULL::UUID, NULL::UUID, NULL::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove team email
CREATE OR REPLACE FUNCTION remove_team_email(
  p_email TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_primary_user_id UUID;
  v_deleted_count INT;
BEGIN
  v_primary_user_id := auth.uid();
  
  IF v_primary_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not authenticated';
    RETURN;
  END IF;
  
  -- Delete the team email
  DELETE FROM team_emails
  WHERE primary_user_id = v_primary_user_id
    AND lower(email) = lower(p_email);
    
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count > 0 THEN
    RETURN QUERY SELECT true, 'Team email removed successfully';
  ELSE
    RETURN QUERY SELECT false, 'Team email not found';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Error removing team email: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get team emails for a user
CREATE OR REPLACE FUNCTION get_team_emails()
RETURNS TABLE(
  id UUID,
  email TEXT,
  role TEXT,
  permissions JSONB,
  is_verified BOOLEAN,
  verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    te.id,
    te.email,
    te.role,
    te.permissions,
    te.is_verified,
    te.verified_at,
    te.last_login_at,
    te.invited_at
  FROM team_emails te
  WHERE te.primary_user_id = auth.uid()
    AND te.is_active = true
  ORDER BY te.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update team email permissions
CREATE OR REPLACE FUNCTION update_team_email_permissions(
  p_email TEXT,
  p_role TEXT DEFAULT NULL,
  p_permissions JSONB DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_primary_user_id UUID;
  v_updated_count INT;
BEGIN
  v_primary_user_id := auth.uid();
  
  IF v_primary_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not authenticated';
    RETURN;
  END IF;
  
  -- Update the team email
  UPDATE team_emails
  SET
    role = COALESCE(p_role, role),
    permissions = COALESCE(p_permissions, permissions),
    updated_at = now()
  WHERE primary_user_id = v_primary_user_id
    AND lower(email) = lower(p_email);
    
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count > 0 THEN
    RETURN QUERY SELECT true, 'Permissions updated successfully';
  ELSE
    RETURN QUERY SELECT false, 'Team email not found';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Error updating permissions: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_team_email(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_team_email(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION authenticate_team_email(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION remove_team_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_emails() TO authenticated;
GRANT EXECUTE ON FUNCTION update_team_email_permissions(TEXT, TEXT, JSONB) TO authenticated;

-- Create trigger to update timestamps
CREATE TRIGGER update_team_emails_updated_at 
  BEFORE UPDATE ON team_emails 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE team_emails IS 'Stores additional email addresses that can login to a primary user account';
COMMENT ON FUNCTION add_team_email IS 'Add a new team email address to the current user account';
COMMENT ON FUNCTION verify_team_email IS 'Verify a team email address using the verification token';
COMMENT ON FUNCTION authenticate_team_email IS 'Authenticate a user by their team email address';

COMMIT;

-- Verification query
SELECT 
  'Team emails system created successfully' as status,
  COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_name = 'team_emails'; 