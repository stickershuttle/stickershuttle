-- Create sitewide_alerts table for managing promotional banners
CREATE TABLE IF NOT EXISTS public.sitewide_alerts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  background_color VARCHAR(7) DEFAULT '#FFD700', -- Gold color by default
  text_color VARCHAR(7) DEFAULT '#030140', -- Dark blue text
  link_url VARCHAR(500),
  link_text VARCHAR(100),
  is_active BOOLEAN DEFAULT false,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sitewide_alerts_updated_at BEFORE UPDATE
ON public.sitewide_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE public.sitewide_alerts ENABLE ROW LEVEL SECURITY;

-- Allow public read access for active alerts
CREATE POLICY "Public read access for active alerts" ON public.sitewide_alerts
FOR SELECT USING (is_active = true);

-- Allow authenticated users to read all alerts (for admin)
CREATE POLICY "Authenticated read all alerts" ON public.sitewide_alerts
FOR SELECT USING (auth.role() = 'authenticated');

-- Only allow service role to insert/update/delete
CREATE POLICY "Service role full access" ON public.sitewide_alerts
FOR ALL USING (auth.role() = 'service_role');

-- Insert a sample alert for testing
INSERT INTO public.sitewide_alerts (title, message, background_color, text_color, link_url, link_text, is_active) 
VALUES (
  'New Year Sale!', 
  '🎉 Get 25% off all custom stickers - Limited time offer!', 
  '#FFD700', 
  '#030140', 
  '/products', 
  'Shop Now', 
  false
);

-- Create indexes for performance
CREATE INDEX idx_sitewide_alerts_active ON public.sitewide_alerts(is_active);
CREATE INDEX idx_sitewide_alerts_dates ON public.sitewide_alerts(start_date, end_date);

COMMENT ON TABLE public.sitewide_alerts IS 'Stores sitewide promotional alerts and banners that can be managed from admin panel'; 