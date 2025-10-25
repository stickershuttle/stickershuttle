-- Create Pro Circle Businesses table
CREATE TABLE IF NOT EXISTS public.pro_circle_businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Business Information
  company_name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  logo_public_id TEXT,
  logo_background_color TEXT DEFAULT '#9ca3af',
  category TEXT NOT NULL,
  state TEXT NOT NULL,
  bio TEXT NOT NULL CHECK (char_length(bio) <= 150),
  
  -- Contact & Links
  website_url TEXT NOT NULL,
  instagram_handle TEXT,
  tiktok_handle TEXT,
  
  -- Discount Configuration
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'credit', 'shipping', 'bogo')),
  discount_amount NUMERIC(10, 2) NOT NULL,
  
  -- Status & Moderation
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'inactive')),
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT true,
  
  -- Admin Notes
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pro_circle_businesses_user_id ON public.pro_circle_businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_circle_businesses_status ON public.pro_circle_businesses(status);
CREATE INDEX IF NOT EXISTS idx_pro_circle_businesses_category ON public.pro_circle_businesses(category);
CREATE INDEX IF NOT EXISTS idx_pro_circle_businesses_state ON public.pro_circle_businesses(state);
CREATE INDEX IF NOT EXISTS idx_pro_circle_businesses_featured ON public.pro_circle_businesses(is_featured);

-- Enable Row Level Security
ALTER TABLE public.pro_circle_businesses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view approved businesses
CREATE POLICY "Users can view approved businesses"
  ON public.pro_circle_businesses
  FOR SELECT
  USING (status = 'approved');

-- Policy: Pro members can insert their own business
CREATE POLICY "Pro members can insert their own business"
  ON public.pro_circle_businesses
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND is_pro_member = true
      AND pro_status = 'active'
    )
  );

-- Policy: Users can update their own pending/rejected businesses
CREATE POLICY "Users can update their own businesses"
  ON public.pro_circle_businesses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own businesses
CREATE POLICY "Users can delete their own businesses"
  ON public.pro_circle_businesses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pro_circle_businesses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
DROP TRIGGER IF EXISTS trigger_update_pro_circle_businesses_updated_at ON public.pro_circle_businesses;
CREATE TRIGGER trigger_update_pro_circle_businesses_updated_at
  BEFORE UPDATE ON public.pro_circle_businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_pro_circle_businesses_updated_at();

-- Grant permissions
GRANT SELECT ON public.pro_circle_businesses TO authenticated;
GRANT INSERT ON public.pro_circle_businesses TO authenticated;
GRANT UPDATE ON public.pro_circle_businesses TO authenticated;
GRANT DELETE ON public.pro_circle_businesses TO authenticated;

-- Comment on table
COMMENT ON TABLE public.pro_circle_businesses IS 'Stores business listings for Pro Circle - exclusive partner businesses offering discounts to Pro members';

