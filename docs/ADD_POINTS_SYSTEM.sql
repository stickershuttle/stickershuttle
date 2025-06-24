-- Points/Rewards System Implementation
-- Automatically awards 5% cashback credits on every purchase
-- This system works with the existing credit system

-- The points system is implemented in the backend code:
-- 1. api/credit-handlers.js - earnPointsFromPurchase() function
-- 2. api/stripe-webhook-handlers.js - calls earnPointsFromPurchase() after successful payment

-- How it works:
-- 1. User completes a purchase through Stripe
-- 2. Webhook receives payment success event
-- 3. System calculates 5% of total order amount
-- 4. Credits are added to user's account using existing add_user_credits() function
-- 5. User receives notification: "$X.XX earned from your recent order"

-- Example:
-- User spends $100.00 → Earns $5.00 in credits
-- User spends $50.00 → Earns $2.50 in credits
-- User spends $10.00 → Earns $0.50 in credits

-- Features:
-- ✅ Only applies to registered users (not guests)
-- ✅ Automatically rounds to 2 decimal places
-- ✅ Creates credit notification for user
-- ✅ Integrates with existing credit system
-- ✅ Logs all points earning activity
-- ✅ Fails gracefully without affecting order completion

-- No database changes needed - uses existing credit system tables:
-- - credits (stores the earned points)
-- - credit_notifications (notifies user of earned points)

-- To verify the system is working:
-- 1. Check webhook logs for "💰 Awarding points" messages
-- 2. Check user's credit balance increases after purchase
-- 3. Check credit_notifications table for earning notifications

COMMENT ON TABLE credits IS 'Stores both manually added credits and automatically earned points from purchases';
COMMENT ON TABLE credit_notifications IS 'Notifies users of both manual credit additions and automatic points earning'; 