-- Add credits_applied column to orders_main table
ALTER TABLE orders_main 
ADD COLUMN IF NOT EXISTS credits_applied DECIMAL(10,2) DEFAULT 0;

-- Create an index for better performance when querying orders with credits
CREATE INDEX IF NOT EXISTS idx_orders_main_credits_applied 
ON orders_main(credits_applied) 
WHERE credits_applied > 0;

-- Add a comment to the column for documentation
COMMENT ON COLUMN orders_main.credits_applied IS 'Amount of store credits applied to this order';

-- Update any existing orders that might have credit transactions
-- This ensures data consistency if credits were somehow applied before this column existed
UPDATE orders_main o
SET credits_applied = COALESCE(
    (SELECT SUM(amount) 
     FROM credits c 
     WHERE c.order_id = o.id 
     AND c.transaction_type = 'used'
     AND c.reversed_at IS NULL),
    0
)
WHERE EXISTS (
    SELECT 1 
    FROM credits c 
    WHERE c.order_id = o.id
);

-- Create a trigger function to automatically update credits_applied when credits are used
CREATE OR REPLACE FUNCTION update_order_credits_applied()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'used' AND NEW.order_id IS NOT NULL THEN
        UPDATE orders_main
        SET credits_applied = COALESCE(credits_applied, 0) + NEW.amount
        WHERE id = NEW.order_id;
    ELSIF NEW.transaction_type = 'reversed' AND NEW.order_id IS NOT NULL THEN
        UPDATE orders_main
        SET credits_applied = GREATEST(COALESCE(credits_applied, 0) - NEW.amount, 0)
        WHERE id = NEW.order_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_order_credits_applied ON credits;
CREATE TRIGGER trigger_update_order_credits_applied
AFTER INSERT ON credits
FOR EACH ROW
EXECUTE FUNCTION update_order_credits_applied();

-- Create a function to get order totals with credits applied
CREATE OR REPLACE FUNCTION get_order_total_with_credits(p_order_id UUID)
RETURNS JSON AS $$
DECLARE
    v_order RECORD;
    v_subtotal DECIMAL;
    v_credits_applied DECIMAL;
    v_final_total DECIMAL;
BEGIN
    -- Get order details
    SELECT 
        total_amount,
        shipping_cost,
        tax_amount,
        COALESCE(credits_applied, 0) as credits_applied
    INTO v_order
    FROM orders_main
    WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;
    
    -- Calculate totals
    v_subtotal := v_order.total_amount;
    v_credits_applied := v_order.credits_applied;
    v_final_total := GREATEST(v_subtotal - v_credits_applied, 0);
    
    RETURN json_build_object(
        'subtotal', v_subtotal,
        'creditsApplied', v_credits_applied,
        'finalTotal', v_final_total,
        'shipping', v_order.shipping_cost,
        'tax', v_order.tax_amount
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on the new function
GRANT EXECUTE ON FUNCTION get_order_total_with_credits(UUID) TO authenticated; 