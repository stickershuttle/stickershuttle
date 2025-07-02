# Troubleshooting Missing Credit UI at Checkout

After fixing the credit transaction types, the credit UI might not appear due to cached data. Here's how to fix it:

## Quick Fixes

1. **Hard Refresh the Page**
   - Press Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
   - This clears the browser cache and Apollo GraphQL cache

2. **Clear Browser Storage** (if hard refresh doesn't work)
   - Open Developer Tools (F12)
   - Go to Application/Storage tab
   - Click "Clear site data"
   - Refresh the page

3. **Log Out and Log Back In**
   - This forces a fresh data fetch
   - Your credits should now show correctly

## Verify Credits Are Fixed

Run this query in Supabase to confirm users have positive balances:

```sql
-- Check user credit balances
SELECT * FROM user_credit_balance
ORDER BY total_credits DESC;

-- Check if the fix was applied
SELECT 
    transaction_type,
    COUNT(*) as count,
    SUM(amount) as total
FROM credits
GROUP BY transaction_type;
```

## Understanding the Credit UI Logic

The credit UI only shows when:
1. User is logged in (`user` exists)
2. User has credits > 0 (`userCredits > 0`)
3. GraphQL query successfully returns data

From the code at line 1908:
```javascript
{user && userCredits > 0 && (
  // Credit UI components shown here
)}
```

## Debug Steps

1. **Check Browser Console**
   - Look for GraphQL errors
   - Check if `getUserCreditBalance` query is returning data

2. **Verify User is Logged In**
   - The `user` object must exist
   - Try logging out and back in

3. **Check Apollo DevTools** (if installed)
   - See if the cache has stale data
   - Manually refetch the query

## Server-Side Cache

If the issue persists, the API server might be caching old data:

1. **Restart the API server**
   - This clears any in-memory caches
   - Railway should handle this automatically on deploy

2. **Check API Logs**
   - Look for credit balance queries
   - Verify they're returning correct values

## Expected Behavior

After fixes, you should see:
- "Store Credit" section in cart summary
- Credit amount displayed (e.g., "$51.96 Store Credit")
- Slider to apply credits at checkout
- Applied credits shown in order summary

## Still Not Working?

If credits still don't show:

1. Check if the user actually has credits:
   ```sql
   SELECT * FROM user_credit_balance
   WHERE user_id = 'YOUR_USER_ID';
   ```

2. Verify the GraphQL endpoint is working:
   - Check Network tab in browser
   - Look for `getUserCreditBalance` query
   - Verify it returns data

3. The balance might be exactly 0 after applying credits
   - Check transaction history to confirm 