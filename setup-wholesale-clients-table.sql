-- Wholesale Clients Table Setup
-- This script creates the wholesale_clients table and adds the wholesale_client_id column to customer_orders

-- Create wholesale_clients table
CREATE TABLE IF NOT EXISTS wholesale_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wholesale_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    client_phone VARCHAR(50),
    client_company VARCHAR(255),
    client_address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_wholesale_clients_user_id ON wholesale_clients(wholesale_user_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_clients_active ON wholesale_clients(is_active);
CREATE INDEX IF NOT EXISTS idx_wholesale_clients_name ON wholesale_clients(client_name);

-- Add wholesale_client_id column to orders_main table
ALTER TABLE orders_main ADD COLUMN IF NOT EXISTS wholesale_client_id UUID REFERENCES wholesale_clients(id) ON DELETE SET NULL;

-- Add index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_orders_main_wholesale_client ON orders_main(wholesale_client_id);

-- Enable RLS (Row Level Security) for wholesale_clients
ALTER TABLE wholesale_clients ENABLE ROW LEVEL SECURITY;

-- Create policy for wholesale_clients - users can only access their own clients
CREATE POLICY "Users can manage their own wholesale clients" ON wholesale_clients
    FOR ALL USING (wholesale_user_id = auth.uid());

-- Grant permissions
GRANT ALL ON wholesale_clients TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wholesale_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_wholesale_clients_updated_at
    BEFORE UPDATE ON wholesale_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_wholesale_clients_updated_at(); 