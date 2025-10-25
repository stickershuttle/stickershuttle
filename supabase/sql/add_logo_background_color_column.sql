-- Add logo_background_color column if it doesn't exist
ALTER TABLE public.pro_circle_businesses 
ADD COLUMN IF NOT EXISTS logo_background_color TEXT DEFAULT '#9ca3af';

-- Comment on the column
COMMENT ON COLUMN public.pro_circle_businesses.logo_background_color IS 'Background color for the logo container (hex color code)';

