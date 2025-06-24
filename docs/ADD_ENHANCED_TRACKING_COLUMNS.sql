-- Add enhanced tracking columns for better EasyPost integration
-- These columns support the new tracking system

-- Add EasyPost tracker ID column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders_main' 
                   AND column_name = 'easypost_tracker_id') THEN
        ALTER TABLE orders_main ADD COLUMN easypost_tracker_id TEXT;
        COMMENT ON COLUMN orders_main.easypost_tracker_id IS 'EasyPost tracker ID for webhook updates';
    END IF;
END $$;

-- Add estimated delivery date column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders_main' 
                   AND column_name = 'estimated_delivery_date') THEN
        ALTER TABLE orders_main ADD COLUMN estimated_delivery_date DATE;
        COMMENT ON COLUMN orders_main.estimated_delivery_date IS 'Estimated delivery date from EasyPost';
    END IF;
END $$;

-- Add tracking details JSONB column for detailed tracking info
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders_main' 
                   AND column_name = 'tracking_details') THEN
        ALTER TABLE orders_main ADD COLUMN tracking_details JSONB;
        COMMENT ON COLUMN orders_main.tracking_details IS 'Detailed tracking events from EasyPost';
    END IF;
END $$;

-- Add index on tracking_number for faster webhook lookups
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'orders_main' 
                   AND indexname = 'idx_orders_main_tracking_number') THEN
        CREATE INDEX idx_orders_main_tracking_number ON orders_main(tracking_number) 
        WHERE tracking_number IS NOT NULL;
    END IF;
END $$;

-- Add index on easypost_tracker_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'orders_main' 
                   AND indexname = 'idx_orders_main_easypost_tracker_id') THEN
        CREATE INDEX idx_orders_main_easypost_tracker_id ON orders_main(easypost_tracker_id) 
        WHERE easypost_tracker_id IS NOT NULL;
    END IF;
END $$;

-- Verify the columns were added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders_main' 
AND column_name IN (
    'tracking_number', 
    'tracking_company', 
    'tracking_url',
    'easypost_tracker_id',
    'estimated_delivery_date',
    'tracking_details'
)
ORDER BY column_name; 