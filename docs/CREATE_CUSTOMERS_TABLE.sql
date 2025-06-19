-- Create customers table in Supabase
-- This table will store unique customer records

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Customer identity
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  
  -- Location (from most recent order)
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'US',
  
  -- Marketing preferences
  marketing_opt_in BOOLEAN DEFAULT false,
  instagram_handle TEXT,
  
  -- Aggregated stats (will be updated via triggers or functions)
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  average_order_value DECIMAL(10,2) DEFAULT 0,
  
  -- Important dates
  first_order_date TIMESTAMPTZ,
  last_order_date TIMESTAMPTZ,
  
  -- Supabase auth user (if registered)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for better performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_last_order_date ON customers(last_order_date);
CREATE INDEX idx_customers_total_spent ON customers(total_spent);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can access all customers
CREATE POLICY "Service role can access all customers" ON customers
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Policy: Authenticated users can view their own customer record
CREATE POLICY "Users can view own customer record" ON customers
  FOR SELECT
  USING (auth.uid() = user_id OR email = auth.jwt() ->> 'email');

-- Function to update customer stats
CREATE OR REPLACE FUNCTION update_customer_stats(p_customer_email TEXT)
RETURNS void AS $$
DECLARE
  customer_record RECORD;
  order_stats RECORD;
BEGIN
  -- Get aggregated order stats from orders_main table
  SELECT 
    COUNT(*) as order_count,
    COALESCE(SUM(total_price), 0) as total_spent,
    MIN(order_created_at) as first_order,
    MAX(order_created_at) as last_order
  INTO order_stats
  FROM orders_main
  WHERE customer_email = p_customer_email;
  
  -- Update customer record
  UPDATE customers
  SET 
    total_orders = order_stats.order_count,
    total_spent = order_stats.total_spent,
    average_order_value = CASE 
      WHEN order_stats.order_count > 0 
      THEN order_stats.total_spent / order_stats.order_count 
      ELSE 0 
    END,
    first_order_date = order_stats.first_order,
    last_order_date = order_stats.last_order,
    updated_at = now()
  WHERE email = p_customer_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create or update customer from order
CREATE OR REPLACE FUNCTION upsert_customer_from_order(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_city TEXT,
  p_state TEXT,
  p_country TEXT,
  p_user_id UUID DEFAULT NULL,
  p_marketing_opt_in BOOLEAN DEFAULT false,
  p_instagram_handle TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  customer_id UUID;
BEGIN
  -- Insert or update customer
  INSERT INTO customers (
    email,
    first_name,
    last_name,
    phone,
    city,
    state,
    country,
    user_id,
    marketing_opt_in,
    instagram_handle
  ) VALUES (
    p_email,
    p_first_name,
    p_last_name,
    p_phone,
    p_city,
    p_state,
    p_country,
    p_user_id,
    p_marketing_opt_in,
    p_instagram_handle
  )
  ON CONFLICT (email) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, customers.first_name),
    last_name = COALESCE(EXCLUDED.last_name, customers.last_name),
    phone = COALESCE(EXCLUDED.phone, customers.phone),
    city = COALESCE(EXCLUDED.city, customers.city),
    state = COALESCE(EXCLUDED.state, customers.state),
    country = COALESCE(EXCLUDED.country, customers.country),
    user_id = COALESCE(EXCLUDED.user_id, customers.user_id),
    marketing_opt_in = EXCLUDED.marketing_opt_in OR customers.marketing_opt_in,
    instagram_handle = COALESCE(EXCLUDED.instagram_handle, customers.instagram_handle),
    updated_at = now()
  RETURNING id INTO customer_id;
  
  -- Update customer stats
  PERFORM update_customer_stats(p_email);
  
  RETURN customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update timestamps
CREATE TRIGGER update_customers_updated_at 
  BEFORE UPDATE ON customers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing customer data from orders
-- This will create customer records from existing orders
DO $$
DECLARE
  order_record RECORD;
  marketing_opt BOOLEAN;
  instagram TEXT;
BEGIN
  -- Loop through all unique customers from orders_main
  FOR order_record IN 
    SELECT DISTINCT ON (customer_email)
      customer_email as email,
      customer_first_name as first_name,
      customer_last_name as last_name,
      customer_phone as phone,
      shipping_address->>'city' as city,
      COALESCE(shipping_address->>'province', shipping_address->>'state') as state,
      shipping_address->>'country' as country,
      user_id
    FROM orders_main
    WHERE customer_email IS NOT NULL
    ORDER BY customer_email, order_created_at DESC
  LOOP
    -- Check for marketing opt-in from order items
    SELECT 
      bool_or(instagram_opt_in),
      string_agg(DISTINCT instagram_handle, ',')
    INTO marketing_opt, instagram
    FROM order_items_new oin
    JOIN orders_main om ON om.id = oin.order_id
    WHERE om.customer_email = order_record.email
      AND instagram_opt_in = true;
    
    -- Create customer record
    PERFORM upsert_customer_from_order(
      order_record.email,
      order_record.first_name,
      order_record.last_name,
      order_record.phone,
      order_record.city,
      order_record.state,
      order_record.country,
      order_record.user_id,
      COALESCE(marketing_opt, false),
      instagram
    );
  END LOOP;
END $$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON customers TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_customer_stats(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION upsert_customer_from_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN, TEXT) TO service_role; 