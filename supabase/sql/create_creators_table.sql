-- Create creators table to manage marketplace creators
CREATE TABLE IF NOT EXISTS creators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  total_products INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id), -- Admin who created this creator
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_creators_user_id ON creators (user_id);
CREATE INDEX IF NOT EXISTS idx_creators_is_active ON creators (is_active);
CREATE INDEX IF NOT EXISTS idx_creators_email ON creators (email);
CREATE INDEX IF NOT EXISTS idx_creators_creator_name ON creators (creator_name);

-- Add unique constraint to prevent duplicate creators
ALTER TABLE creators ADD CONSTRAINT unique_creator_user_id UNIQUE (user_id);

-- Add comments to document the fields
COMMENT ON COLUMN creators.user_id IS 'Link to the user account - required';
COMMENT ON COLUMN creators.creator_name IS 'Display name for the creator';
COMMENT ON COLUMN creators.email IS 'Email address of the creator (copied from user account)';
COMMENT ON COLUMN creators.is_active IS 'Whether the creator is currently active';
COMMENT ON COLUMN creators.total_products IS 'Total number of products by this creator';

-- Create creator collections table
CREATE TABLE IF NOT EXISTS creator_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for collections
CREATE INDEX IF NOT EXISTS idx_creator_collections_creator_id ON creator_collections (creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_collections_is_active ON creator_collections (is_active);

-- Add creator_id to marketplace_products table if it doesn't exist
ALTER TABLE marketplace_products 
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE SET NULL;

-- Create index for creator_id in marketplace_products
CREATE INDEX IF NOT EXISTS idx_marketplace_products_creator_id 
ON marketplace_products (creator_id);

-- Add collection_id to marketplace_products table if it doesn't exist
ALTER TABLE marketplace_products 
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES creator_collections(id) ON DELETE SET NULL;

-- Create index for collection_id in marketplace_products
CREATE INDEX IF NOT EXISTS idx_marketplace_products_collection_id 
ON marketplace_products (collection_id);

-- Update trigger to maintain creator stats
CREATE OR REPLACE FUNCTION update_creator_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update product count and other stats when products are added/removed/updated
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE creators 
    SET 
      total_products = (
        SELECT COUNT(*) 
        FROM marketplace_products 
        WHERE creator_id = NEW.creator_id AND is_active = true
      ),
      updated_at = NOW()
    WHERE id = NEW.creator_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE creators 
    SET 
      total_products = (
        SELECT COUNT(*) 
        FROM marketplace_products 
        WHERE creator_id = OLD.creator_id AND is_active = true
      ),
      updated_at = NOW()
    WHERE id = OLD.creator_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating creator stats
DROP TRIGGER IF EXISTS trigger_update_creator_stats ON marketplace_products;
CREATE TRIGGER trigger_update_creator_stats
  AFTER INSERT OR UPDATE OR DELETE ON marketplace_products
  FOR EACH ROW
  EXECUTE FUNCTION update_creator_stats();

-- Enable RLS (Row Level Security)
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_collections ENABLE ROW LEVEL SECURITY;

-- Create policies for creators table
CREATE POLICY "Enable read access for all users" ON creators
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON creators
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for creator owners and admins" ON creators
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.uid() = created_by OR
    auth.email() IN ('justin@stickershuttle.com')
  );

CREATE POLICY "Enable delete for admins only" ON creators
  FOR DELETE USING (auth.email() IN ('justin@stickershuttle.com'));

-- Create policies for creator_collections table
CREATE POLICY "Enable read access for all users" ON creator_collections
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for creator owners and admins" ON creator_collections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM creators 
      WHERE id = creator_id AND (
        user_id = auth.uid() OR 
        auth.email() IN ('justin@stickershuttle.com')
      )
    )
  );

CREATE POLICY "Enable update for creator owners and admins" ON creator_collections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM creators 
      WHERE id = creator_id AND (
        user_id = auth.uid() OR 
        auth.email() IN ('justin@stickershuttle.com')
      )
    )
  );

CREATE POLICY "Enable delete for creator owners and admins" ON creator_collections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM creators 
      WHERE id = creator_id AND (
        user_id = auth.uid() OR 
        auth.email() IN ('justin@stickershuttle.com')
      )
    )
  );