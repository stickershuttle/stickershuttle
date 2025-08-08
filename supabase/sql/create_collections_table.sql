-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255) UNIQUE NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Policy for reading collections (everyone can read active collections)
CREATE POLICY "Collections are viewable by everyone" ON collections
  FOR SELECT USING (is_active = true);

-- Policy for creators to manage their own collections
CREATE POLICY "Creators can manage their own collections" ON collections
  FOR ALL USING (
    creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid()
    )
  );

-- Policy for admins to manage all collections
CREATE POLICY "Admins can manage all collections" ON collections
  FOR ALL USING (
    auth.email() = 'justin@stickershuttle.com'
  );

-- Add collection_id to marketplace_products table
ALTER TABLE marketplace_products 
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_marketplace_products_collection_id ON marketplace_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_collections_creator_id ON collections(creator_id);
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);

-- Insert some default collections
INSERT INTO collections (name, description, slug, is_active, is_featured, sort_order) VALUES
('General', 'General sticker collection for miscellaneous designs', 'general', true, false, 0),
('Nature & Outdoors', 'National parks, mountains, and outdoor adventure stickers', 'nature-outdoors', true, true, 1),
('Pop Culture', 'Trending memes, viral content, and pop culture references', 'pop-culture', true, true, 2),
('Motivational', 'Inspirational quotes and motivational designs', 'motivational', true, false, 3),
('Cute & Kawaii', 'Adorable characters and cute designs', 'cute-kawaii', true, false, 4),
('Space & Sci-Fi', 'UFOs, aliens, space exploration, and sci-fi themes', 'space-sci-fi', true, false, 5)
ON CONFLICT (slug) DO NOTHING;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_collections_updated_at 
    BEFORE UPDATE ON collections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();