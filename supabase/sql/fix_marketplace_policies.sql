-- Fix marketplace RLS policies by dropping old ones and creating new ones

-- Drop existing policies for marketplace_products
DROP POLICY IF EXISTS "Marketplace products are viewable by everyone" ON marketplace_products;
DROP POLICY IF EXISTS "All marketplace products are viewable by admin" ON marketplace_products;
DROP POLICY IF EXISTS "Marketplace products are insertable by authenticated users" ON marketplace_products;
DROP POLICY IF EXISTS "Marketplace products are updatable by creator or admin" ON marketplace_products;
DROP POLICY IF EXISTS "Marketplace products are updatable by authenticated users" ON marketplace_products;
DROP POLICY IF EXISTS "Marketplace products are deletable by creator or admin" ON marketplace_products;
DROP POLICY IF EXISTS "Marketplace products are deletable by authenticated users" ON marketplace_products;

-- Create new policies for marketplace_products
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

-- Drop existing policies for marketplace_product_variants
DROP POLICY IF EXISTS "Product variants are viewable by everyone" ON marketplace_product_variants;
DROP POLICY IF EXISTS "Product variants are insertable by authenticated users" ON marketplace_product_variants;
DROP POLICY IF EXISTS "Product variants are insertable by admin" ON marketplace_product_variants;
DROP POLICY IF EXISTS "Product variants are updatable by product creator or admin" ON marketplace_product_variants;
DROP POLICY IF EXISTS "Product variants are updatable by admin" ON marketplace_product_variants;
DROP POLICY IF EXISTS "Product variants are deletable by admin" ON marketplace_product_variants;

-- Create new policies for marketplace_product_variants
CREATE POLICY "Product variants are viewable by everyone" ON marketplace_product_variants
  FOR SELECT USING (true);

CREATE POLICY "Product variants are insertable by authenticated users" ON marketplace_product_variants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Product variants are updatable by product creator or admin" ON marketplace_product_variants
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Drop existing policies for marketplace_orders
DROP POLICY IF EXISTS "Orders are viewable by customer or admin" ON marketplace_orders;
DROP POLICY IF EXISTS "Orders are insertable by authenticated users" ON marketplace_orders;
DROP POLICY IF EXISTS "Orders are updatable by admin" ON marketplace_orders;

-- Create new policies for marketplace_orders
CREATE POLICY "Orders are viewable by customer or admin" ON marketplace_orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Orders are insertable by authenticated users" ON marketplace_orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Orders are updatable by admin" ON marketplace_orders
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Drop existing policies for marketplace_order_items
DROP POLICY IF EXISTS "Order items are viewable by customer or admin" ON marketplace_order_items;
DROP POLICY IF EXISTS "Order items are insertable by authenticated users" ON marketplace_order_items;

-- Create new policies for marketplace_order_items
CREATE POLICY "Order items are viewable by customer or admin" ON marketplace_order_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Order items are insertable by authenticated users" ON marketplace_order_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');