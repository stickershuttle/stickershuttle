-- Migration: Simpler webhook-based order status notification
-- This uses Supabase's native webhook functionality which is more reliable

-- First, let's clean up the previous approach
DROP TRIGGER IF EXISTS order_status_change_trigger ON orders_main;
DROP FUNCTION IF EXISTS notify_order_status_change();

-- Create a simple logging function for debugging
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS trigger AS $$
BEGIN
  -- Only process updates where status actually changed
  IF TG_OP = 'UPDATE' AND (
    (OLD.order_status IS DISTINCT FROM NEW.order_status) OR
    (OLD.fulfillment_status IS DISTINCT FROM NEW.fulfillment_status) OR
    (OLD.financial_status IS DISTINCT FROM NEW.financial_status) OR
    (OLD.tracking_number IS DISTINCT FROM NEW.tracking_number)
  ) THEN
    -- Log the status change (this will be picked up by the webhook)
    RAISE NOTICE 'Order status changed for order %: % -> %', 
      NEW.id, 
      OLD.order_status, 
      NEW.order_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for logging
CREATE TRIGGER log_order_status_change_trigger
  AFTER UPDATE ON orders_main
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();

-- Add a column to track last notification sent (to prevent duplicate notifications)
ALTER TABLE orders_main 
ADD COLUMN IF NOT EXISTS last_notification_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Add a column to track notification status
ALTER TABLE orders_main 
ADD COLUMN IF NOT EXISTS notification_status TEXT DEFAULT 'pending';

-- Add comments
COMMENT ON COLUMN orders_main.last_notification_sent_at IS 'Timestamp when the last status change notification was sent to the customer';
COMMENT ON COLUMN orders_main.notification_status IS 'Status of the last notification attempt: pending, sent, failed';
COMMENT ON TRIGGER log_order_status_change_trigger ON orders_main IS 'Logs order status changes for webhook processing'; 