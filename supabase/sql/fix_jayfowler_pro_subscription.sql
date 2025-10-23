-- Retroactive fix for jayfowler@outlook.com Pro subscription
-- This script manually updates the Pro member data that was created before webhook fixes were implemented

-- STEP 1: Update user profile with correct Pro subscription data
-- You'll need to get these values from Stripe Dashboard first:
-- 1. Go to Stripe Dashboard > Customers > search for jayfowler@outlook.com
-- 2. Copy the Customer ID (starts with "cus_")
-- 3. Go to Subscriptions tab and copy the Subscription ID (starts with "sub_")
-- 4. Note the plan (monthly or annual) and subscription dates
-- 5. Get the uploaded file URL from the customer metadata

DO $$
DECLARE
    v_user_id UUID;
    v_stripe_customer_id TEXT := 'REPLACE_WITH_STRIPE_CUSTOMER_ID'; -- e.g., 'cus_xxxxx'
    v_stripe_subscription_id TEXT := 'REPLACE_WITH_STRIPE_SUBSCRIPTION_ID'; -- e.g., 'sub_xxxxx'
    v_plan TEXT := 'monthly'; -- or 'annual'
    v_period_start TIMESTAMPTZ := '2025-01-22 00:00:00+00'; -- REPLACE with actual subscription start date
    v_period_end TIMESTAMPTZ := '2025-02-22 00:00:00+00'; -- REPLACE with actual current period end
    v_uploaded_file_url TEXT := NULL; -- REPLACE with uploaded design file URL if exists
    v_shipping_address JSONB := NULL; -- REPLACE with shipping address JSONB if needed
BEGIN
    -- Get the user_id for jayfowler@outlook.com
    SELECT au.id INTO v_user_id
    FROM auth.users au
    WHERE au.email = 'jayfowler@outlook.com'
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email jayfowler@outlook.com not found';
    END IF;

    RAISE NOTICE 'Found user ID: %', v_user_id;

    -- Update the user profile with all Pro membership data
    UPDATE user_profiles
    SET 
        is_pro_member = true,
        pro_subscription_id = v_stripe_subscription_id,
        pro_stripe_subscription_id = v_stripe_subscription_id,
        pro_stripe_customer_id = v_stripe_customer_id,
        pro_plan = v_plan,
        pro_status = 'active',
        pro_subscription_start_date = v_period_start,
        pro_current_period_start = v_period_start,
        pro_current_period_end = v_period_end,
        pro_current_design_file = v_uploaded_file_url,
        pro_design_approved = CASE WHEN v_uploaded_file_url IS NOT NULL THEN false ELSE NULL END,
        pro_default_shipping_address = v_shipping_address,
        pro_shipping_address_updated_at = CASE WHEN v_shipping_address IS NOT NULL THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE user_id = v_user_id;

    RAISE NOTICE 'Updated user profile with Pro membership data';

    -- OPTIONAL: Show the updated profile
    RAISE NOTICE 'User profile updated:';
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'Email: jayfowler@outlook.com';
    RAISE NOTICE 'Pro Status: active';
    RAISE NOTICE 'Pro Plan: %', v_plan;
    RAISE NOTICE 'Subscription ID: %', v_stripe_subscription_id;
    RAISE NOTICE 'Customer ID: %', v_stripe_customer_id;

END $$;

-- STEP 2: Delete incorrect order AD0C97 if it exists
-- This order was created by the buggy checkout.session.completed handler
DELETE FROM order_items WHERE customer_order_id IN (
    SELECT id FROM orders_main WHERE order_number = 'AD0C97'
);

DELETE FROM orders_main WHERE order_number = 'AD0C97';

-- Verify deletion
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM orders_main WHERE order_number = 'AD0C97';
    IF v_count = 0 THEN
        RAISE NOTICE 'Order AD0C97 successfully deleted';
    ELSE
        RAISE NOTICE 'Order AD0C97 still exists';
    END IF;
END $$;

-- STEP 3: Create proper Pro member order (only if one doesn't already exist)
-- This creates the initial Pro monthly benefit order
DO $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_first_name TEXT;
    v_last_name TEXT;
    v_phone TEXT;
    v_design_file TEXT;
    v_shipping_address JSONB;
    v_new_order_id UUID;
    v_order_number TEXT;
    v_existing_order_count INTEGER;
BEGIN
    -- Get user data
    SELECT 
        au.id,
        au.email,
        up.first_name,
        up.last_name,
        up.phone_number,
        up.pro_current_design_file,
        up.pro_default_shipping_address
    INTO 
        v_user_id,
        v_user_email,
        v_first_name,
        v_last_name,
        v_phone,
        v_design_file,
        v_shipping_address
    FROM auth.users au
    LEFT JOIN user_profiles up ON up.user_id = au.id
    WHERE au.email = 'jayfowler@outlook.com'
    LIMIT 1;

    -- Check if a Pro order already exists for this user
    SELECT COUNT(*) INTO v_existing_order_count
    FROM orders_main
    WHERE user_id = v_user_id
    AND order_tags @> ARRAY['pro-monthly-stickers']::text[];

    IF v_existing_order_count > 0 THEN
        RAISE NOTICE 'Pro member order already exists for this user, skipping creation';
        RETURN;
    END IF;

    -- Generate order number (SS-XXXX format)
    SELECT 
        'SS-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 999) + 1)::TEXT, 4, '0')
    INTO v_order_number
    FROM orders_main
    WHERE order_number LIKE 'SS-%';

    RAISE NOTICE 'Creating Pro member order with number: %', v_order_number;

    -- Create the Pro member order
    INSERT INTO orders_main (
        user_id,
        order_number,
        order_status,
        fulfillment_status,
        financial_status,
        subtotal_price,
        total_tax,
        total_price,
        currency,
        customer_first_name,
        customer_last_name,
        customer_email,
        customer_phone,
        shipping_address,
        billing_address,
        shipping_method,
        order_tags,
        order_note,
        order_created_at,
        order_updated_at,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_order_number,
        'Pro Monthly Order',
        'unfulfilled',
        'paid',
        0.00,
        0.00,
        0.00,
        'USD',
        COALESCE(v_first_name, ''),
        COALESCE(v_last_name, ''),
        v_user_email,
        v_phone,
        COALESCE(v_shipping_address, '{}'::jsonb),
        '{}'::jsonb,
        NULL,
        ARRAY['pro-monthly-stickers', 'pro-member', 'monthly-benefit']::text[],
        'Pro member monthly sticker benefit - 100 matte vinyl stickers.',
        NOW(),
        NOW(),
        NOW(),
        NOW()
    )
    RETURNING id INTO v_new_order_id;

    RAISE NOTICE 'Created Pro member order: %', v_order_number;

    -- Create order item for 100 3" matte vinyl stickers
    INSERT INTO order_items (
        customer_order_id,
        product_id,
        product_name,
        product_category,
        sku,
        quantity,
        unit_price,
        total_price,
        calculator_selections,
        custom_files,
        fulfillment_status,
        created_at,
        updated_at
    ) VALUES (
        v_new_order_id,
        'pro-monthly-stickers',
        '100 Matte Vinyl Stickers',
        'vinyl-stickers',
        'PRO-MONTHLY-100',
        100,
        0.00,
        0.00,
        jsonb_build_object(
            'size', jsonb_build_object('value', '3"', 'displayValue', '3"'),
            'material', jsonb_build_object('value', 'matte', 'displayValue', 'Matte Vinyl'),
            'cut', jsonb_build_object('value', 'custom', 'displayValue', 'Custom Cut'),
            'quantity', jsonb_build_object('value', 100, 'displayValue', '100')
        ),
        CASE 
            WHEN v_design_file IS NOT NULL THEN ARRAY[v_design_file]::text[]
            ELSE NULL
        END,
        'unfulfilled',
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Created order item for 100 matte vinyl stickers';
    RAISE NOTICE 'Design file attached: %', v_design_file;

    -- Initialize Pro order generation log
    INSERT INTO pro_order_generation_log (
        user_id,
        last_order_generated_at,
        next_order_due_at,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        NOW(),
        NOW() + INTERVAL '30 days',
        'active',
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        last_order_generated_at = NOW(),
        next_order_due_at = NOW() + INTERVAL '30 days',
        status = 'active',
        updated_at = NOW();

    RAISE NOTICE 'Initialized Pro order generation tracking';

END $$;

-- STEP 4: Verify everything is correct
DO $$
DECLARE
    v_profile_record RECORD;
    v_order_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========== VERIFICATION SUMMARY ==========';
    RAISE NOTICE '';
    
    -- Check user profile
    SELECT * INTO v_profile_record
    FROM user_profiles
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jayfowler@outlook.com' LIMIT 1);
    
    RAISE NOTICE 'Pro Member Profile:';
    RAISE NOTICE '  Is Pro Member: %', v_profile_record.is_pro_member;
    RAISE NOTICE '  Pro Status: %', v_profile_record.pro_status;
    RAISE NOTICE '  Pro Plan: %', v_profile_record.pro_plan;
    RAISE NOTICE '  Stripe Customer ID: %', v_profile_record.pro_stripe_customer_id;
    RAISE NOTICE '  Stripe Subscription ID: %', v_profile_record.pro_stripe_subscription_id;
    RAISE NOTICE '  Has Design File: %', (v_profile_record.pro_current_design_file IS NOT NULL);
    RAISE NOTICE '  Has Shipping Address: %', (v_profile_record.pro_default_shipping_address IS NOT NULL);
    RAISE NOTICE '';
    
    -- Check Pro orders
    SELECT 
        order_number,
        order_status,
        order_tags
    INTO v_order_record
    FROM orders_main
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jayfowler@outlook.com' LIMIT 1)
    AND order_tags @> ARRAY['pro-monthly-stickers']::text[]
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_order_record IS NOT NULL THEN
        RAISE NOTICE 'Pro Member Order:';
        RAISE NOTICE '  Order Number: %', v_order_record.order_number;
        RAISE NOTICE '  Order Status: %', v_order_record.order_status;
        RAISE NOTICE '  Tags: %', v_order_record.order_tags;
    ELSE
        RAISE NOTICE 'No Pro member order found';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
END $$;

