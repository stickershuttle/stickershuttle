-- Migration: Add order status change notification trigger
-- This will automatically call the edge function when order status changes

-- Create or replace the function that will be triggered
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS trigger AS $$
DECLARE
  payload json;
BEGIN
  -- Only process updates, not inserts or deletes
  IF TG_OP = 'UPDATE' THEN
    -- Check if any status field actually changed
    IF (OLD.order_status IS DISTINCT FROM NEW.order_status) OR
       (OLD.fulfillment_status IS DISTINCT FROM NEW.fulfillment_status) OR
       (OLD.financial_status IS DISTINCT FROM NEW.financial_status) OR
       (OLD.tracking_number IS DISTINCT FROM NEW.tracking_number) THEN
      
      -- Create payload with old and new record data
      payload = json_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      );

      -- Call the edge function via HTTP request
      PERFORM
        net.http_post(
          url := current_setting('app.settings.edge_function_url', true),
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := payload::jsonb
        );

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS order_status_change_trigger ON orders_main;
CREATE TRIGGER order_status_change_trigger
  AFTER UPDATE ON orders_main
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();

-- Add comment to document the trigger
COMMENT ON TRIGGER order_status_change_trigger ON orders_main IS 'Triggers customer notification when order status changes';
COMMENT ON FUNCTION notify_order_status_change() IS 'Function to send order status change notifications via edge function'; 