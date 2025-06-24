# Setting Up the Credit System

The credit system error you're seeing is because the database functions haven't been created yet. Follow these steps to set it up:

## Step 1: Access Supabase SQL Editor

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click on **SQL Editor** in the left sidebar

## Step 2: Run the Credit System SQL

1. Click **New query**
2. Copy ALL the contents from `docs/CREATE_CREDITS_SYSTEM.sql`
3. Paste it into the SQL editor
4. Click **Run** button
5. You should see "Success. No rows returned" message

## Step 3: Add Credits Column to Orders

1. Click **New query** again
2. Copy ALL the contents from `docs/ADD_CREDITS_APPLIED_COLUMN.sql`
3. Paste it into the SQL editor
4. Click **Run** button
5. You should see "Success. No rows returned" message

## Step 4: Verify Setup

1. In Supabase Dashboard, go to **Table Editor**
2. You should see these new tables:
   - `credits`
   - `credit_notifications`
   - `user_credit_balance` (view)
3. Check that `orders_main` table has a new column: `credits_applied`

## Step 5: Refresh Your Application

1. Go back to your Sticker Shuttle website
2. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
3. The credit system should now work without errors

## Troubleshooting

If you still see errors:

1. Check the Supabase logs for any SQL execution errors
2. Make sure you copied the ENTIRE SQL file contents
3. Try running each CREATE statement individually if the full script fails
4. Check that your Supabase service role key has proper permissions

## What This Enables

Once set up, you'll have:
- Store credit system for customers
- Admin panel to manage credits
- Ability to apply credits at checkout
- Credit history tracking
- Automatic credit notifications 