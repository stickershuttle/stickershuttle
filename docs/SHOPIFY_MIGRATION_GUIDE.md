# 🛍️ Shopify to Custom System Migration Guide (Simplified)

This guide walks you through migrating your basic Shopify order data without detailed product configurations.

## 📋 **Migration Overview**

The **simplified migration** will:
- ✅ Create user **profiles only** (no auth accounts = no signup emails)
- ✅ Import orders with basic information
- ✅ Set appropriate order statuses
- ✅ Handle missing product details gracefully
- ✅ Tag orders as migrated from Shopify

## 🚫 **What This Migration WON'T Do**

- ❌ Send signup emails to customers
- ❌ Create detailed calculator selections (missing data)
- ❌ Import custom file URLs (not in your export)
- ❌ Set specific product categories (will show as "migrated")

## 📁 **Where to Upload Your CSV**

Place your CSV file in the `docs/` folder:
```
Sticker Shuttle Website/
  └── docs/
      └── your-shopify-orders.csv  ← Put it here
```

## 🗂️ **Required CSV Columns (Simplified)**

### **Essential Order Data**
```csv
order_id,shopify_order_number,order_date,customer_email,customer_first_name,customer_last_name,customer_phone,financial_status,fulfillment_status,order_status,subtotal_price,total_tax,total_price,currency,discount_code,discount_amount,order_note
```

### **Optional Proof Status**
```csv
proof_status,proof_sent_at
```

### **Shipping Address**
```csv
shipping_first_name,shipping_last_name,shipping_company,shipping_address1,shipping_address2,shipping_city,shipping_province,shipping_country,shipping_zip,shipping_phone
```

### **Billing Address (Optional - will default to shipping)**
```csv
billing_first_name,billing_last_name,billing_company,billing_address1,billing_address2,billing_city,billing_province,billing_country,billing_zip,billing_phone
```

### **Basic Item Data (What You Have)**
```csv
item_1_product_name,item_1_quantity,item_1_unit_price,item_1_total_price,item_2_product_name,item_2_quantity,item_2_unit_price,item_2_total_price
```

## 📝 **CSV Example**
```csv
order_id,order_date,customer_email,customer_first_name,customer_last_name,financial_status,fulfillment_status,total_price,item_1_product_name,item_1_quantity,item_1_unit_price,item_1_total_price
4856574181564,2023-01-15T10:30:00Z,john@example.com,John,Smith,paid,fulfilled,32.35,Custom Vinyl Stickers,100,0.25,25.00
```

## 🔄 **How Missing Data is Handled**

### **Product Details**
Since your export lacks detailed product configurations, the system will:
- Set product category to `migrated-orders`
- Add calculator selections showing "Migrated from Shopify"
- Display message: *"This order was migrated from an old system and the details are unavailable"*

### **User Accounts**
- Creates **user profiles only** (no Supabase auth users)
- **No signup emails sent**
- Users can sign up later when you launch
- Orders will be linked when they sign up with the same email

### **Order Tags**
Auto-generated tags for migrated orders:
- `migrated-order`
- `shopify-import` 
- `items-{count}` (e.g., `items-2`)

## 🚀 **Running the Migration**

### **1. Install Dependencies**
```bash
cd scripts
npm install @supabase/supabase-js csv-parser
```

### **2. Set Environment Variables**
Make sure these are set in your environment:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **3. Run Migration**
```bash
node scripts/shopify-migration.js docs/your-shopify-orders.csv
```

### **4. Expected Output**
```
🚀 Starting Shopify migration (Profile-only mode)...
📧 Note: No signup emails will be sent
📊 Found 1,234 orders to migrate
👤 Profile exists for john@example.com
🏷️ Generated tags for migrated order SS-00001: migrated-order,shopify-import,items-2
📋 Order status: Completed, Proof status: delivered
✅ Migrated order SS-00001 for john@example.com with 2 items
📦 Processed batch 1/124
...
🎉 Migration completed!
✅ Successfully migrated: 1,234 orders
👤 User profiles created: 856
⚠️ Duplicate orders skipped: 5
❌ Errors encountered: 2
```

## 🔍 **What Customers Will See**

### **Order Details Page**
- Basic order information (date, status, total)
- Simple item list with names and quantities
- Message: *"This order was migrated from an old system and the details are unavailable"*
- No detailed product configurations
- No proof management (for migrated orders)

### **Account Dashboard**
- Orders show up in their history
- Can track shipping if tracking info was provided
- Can't see detailed product specs (missing from export)

## 📊 **Post-Migration Verification**

### **Check Migration Success**
```sql
-- Total migrated orders
SELECT COUNT(*) as total_orders 
FROM orders_main 
WHERE migration_source = 'shopify';

-- User profiles created
SELECT COUNT(*) as migrated_profiles 
FROM user_profiles 
WHERE migration_source = 'shopify';

-- Orders by status
SELECT order_status, COUNT(*) as count 
FROM orders_main 
WHERE migration_source = 'shopify'
GROUP BY order_status;
```

### **Sample Queries**
```sql
-- View migrated order details
SELECT 
  order_number,
  customer_email,
  order_status,
  total_price,
  order_created_at
FROM orders_main 
WHERE migration_source = 'shopify'
LIMIT 10;

-- Check order items
SELECT 
  o.order_number,
  i.product_name,
  i.quantity,
  i.customer_notes
FROM orders_main o
JOIN order_items_new i ON o.id = i.order_id
WHERE o.migration_source = 'shopify'
LIMIT 10;
```

## ⚠️ **Important Notes**

1. **No Emails**: Customers won't receive any notifications about the migration
2. **Profile-Only**: Creates user profiles but no auth accounts
3. **Simplified Data**: Product details will show as "migrated" with limited info
4. **Future Signup**: When customers sign up later, orders will be linked by email
5. **Order History**: All migrated orders will appear in customer dashboards once they sign up

## 🔧 **When You're Ready to Launch**

Later, when you want customers to access their accounts:
1. Run a campaign inviting customers to create accounts
2. Orders will automatically link when they sign up with the same email
3. They'll see their full order history including migrated orders

## 🛡️ **Safety Features**

- **Duplicate Detection**: Skips orders that already exist
- **Error Handling**: Individual failures don't stop the migration
- **Batch Processing**: Processes orders in small batches
- **No Email Spam**: Zero signup emails sent during migration

This simplified approach gets your historical data into the system without overwhelming customers with signup emails, while still preserving the essential order information for business continuity. 