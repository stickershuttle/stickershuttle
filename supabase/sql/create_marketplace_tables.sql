-- Create marketplace products table
CREATE TABLE IF NOT EXISTS marketplace_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  images TEXT[] DEFAULT '{}',
  default_image TEXT,
  category TEXT NOT NULL DEFAULT 'Die-Cut',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  stock_quantity INTEGER DEFAULT -1, -- -1 means unlimited
  sold_quantity INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create marketplace product variants table for different sizes/materials
CREATE TABLE IF NOT EXISTS marketplace_product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES marketplace_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "3 inch", "5 inch", "Matte", "Gloss"
  price_modifier DECIMAL(10,2) DEFAULT 0, -- Additional cost for this variant
  is_default BOOLEAN DEFAULT false,
  stock_quantity INTEGER DEFAULT -1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create marketplace orders table
CREATE TABLE IF NOT EXISTS marketplace_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES auth.users(id),
  customer_email TEXT,
  customer_name TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  shipping_address JSONB,
  billing_address JSONB,
  tracking_number TEXT,
  tracking_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create marketplace order items table
CREATE TABLE IF NOT EXISTS marketplace_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES marketplace_products(id),
  variant_id UUID REFERENCES marketplace_product_variants(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_marketplace_products_active ON marketplace_products(is_active);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_featured ON marketplace_products(is_featured);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_category ON marketplace_products(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_created_by ON marketplace_products(created_by);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_customer ON marketplace_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status ON marketplace_orders(status);

-- Create RLS policies
ALTER TABLE marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_order_items ENABLE ROW LEVEL SECURITY;

-- Policies for marketplace_products
CREATE POLICY "Marketplace products are viewable by everyone" ON marketplace_products
  FOR SELECT USING (is_active = true);

CREATE POLICY "All marketplace products are viewable by admin" ON marketplace_products
  FOR SELECT USING (true);

CREATE POLICY "Marketplace products are insertable by authenticated users" ON marketplace_products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Marketplace products are updatable by authenticated users" ON marketplace_products
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Marketplace products are deletable by authenticated users" ON marketplace_products
  FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for marketplace_product_variants
CREATE POLICY "Product variants are viewable by everyone" ON marketplace_product_variants
  FOR SELECT USING (true);

CREATE POLICY "Product variants are insertable by authenticated users" ON marketplace_product_variants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Product variants are updatable by product creator or admin" ON marketplace_product_variants
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policies for marketplace_orders
CREATE POLICY "Orders are viewable by customer or admin" ON marketplace_orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Orders are insertable by authenticated users" ON marketplace_orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Orders are updatable by admin" ON marketplace_orders
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policies for marketplace_order_items
CREATE POLICY "Order items are viewable by customer or admin" ON marketplace_order_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Order items are insertable by authenticated users" ON marketplace_order_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create functions for marketplace
CREATE OR REPLACE FUNCTION increment_product_views(product_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE marketplace_products 
  SET views_count = views_count + 1 
  WHERE id = product_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate order number
CREATE OR REPLACE FUNCTION generate_marketplace_order_number()
RETURNS TEXT AS $$
DECLARE
  order_num TEXT;
  counter INTEGER := 1;
BEGIN
  LOOP
    order_num := 'MP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    
    -- Check if this order number already exists
    IF NOT EXISTS (SELECT 1 FROM marketplace_orders WHERE order_number = order_num) THEN
      RETURN order_num;
    END IF;
    
    counter := counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE marketplace_products IS 'Stores marketplace products that can be purchased directly';
COMMENT ON TABLE marketplace_product_variants IS 'Stores different variants of marketplace products (sizes, materials, etc.)';
COMMENT ON TABLE marketplace_orders IS 'Stores marketplace orders';
COMMENT ON TABLE marketplace_order_items IS 'Stores individual items within marketplace orders'; 