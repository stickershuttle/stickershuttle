#!/bin/bash

# Supabase Edge Function Setup Script for Order Status Notifications
# This script helps you deploy and configure the customer notification system

set -e

echo "🚀 Setting up Supabase Edge Function for Order Status Notifications"
echo "================================================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Please initialize first:"
    echo "   supabase init"
    exit 1
fi

echo "✅ Supabase CLI found"

# Deploy the edge function
echo ""
echo "📦 Deploying edge function..."
supabase functions deploy notify-customer-status-change

if [ $? -eq 0 ]; then
    echo "✅ Edge function deployed successfully"
else
    echo "❌ Failed to deploy edge function"
    exit 1
fi

# Run database migrations
echo ""
echo "🗄️  Running database migrations..."
supabase db reset --with-seed

echo ""
echo "📋 Running migration scripts..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed"
else
    echo "❌ Failed to run migrations"
    exit 1
fi

# Get project details
PROJECT_REF=$(supabase projects list --format json | jq -r '.[0].ref' 2>/dev/null || echo "your-project-ref")
PROJECT_URL="https://$PROJECT_REF.supabase.co"

echo ""
echo "🎉 Setup completed successfully!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Set up environment variables in Supabase dashboard:"
echo "   - Go to: $PROJECT_URL/project/settings/functions"
echo "   - Add the following variables:"
echo "     * SUPABASE_URL: $PROJECT_URL"
echo "     * SUPABASE_SERVICE_ROLE_KEY: [your-service-role-key]"
echo "     * EMAIL_SERVICE: resend (or sendgrid)"
echo "     * RESEND_API_KEY: [your-resend-api-key] (or SENDGRID_API_KEY)"
echo ""
echo "2. Set up database webhook:"
echo "   - Go to: $PROJECT_URL/project/database/hooks"
echo "   - Create new webhook with these settings:"
echo "     * Name: order-status-notifications"
echo "     * Table: orders_main"
echo "     * Events: Update"
echo "     * URL: $PROJECT_URL/functions/v1/notify-customer-status-change"
echo "     * Headers: Authorization: Bearer [service-role-key]"
echo ""
echo "3. Test the setup:"

# Create test commands
cat << 'EOF'
   
   # Test the edge function directly:
   curl -X POST '[PROJECT_URL]/functions/v1/notify-customer-status-change' \
     -H 'Authorization: Bearer [service-role-key]' \
     -H 'Content-Type: application/json' \
     -d '{
       "type": "UPDATE",
       "table": "orders_main", 
       "record": {
         "id": "test-order-id",
         "order_status": "Shipped"
       },
       "old_record": {
         "order_status": "In Production"
       }
     }'

   # Or test by updating an order in the database:
   # UPDATE orders_main SET order_status = 'Shipped' WHERE id = 'your-test-order-id';

EOF

echo ""
echo "📖 For detailed setup instructions, see: docs/EDGE_FUNCTION_SETUP.md"
echo ""
echo "🔍 Monitor logs with:"
echo "   supabase functions logs notify-customer-status-change"
echo ""
echo "✨ Your customers will now receive automatic email notifications when their order status changes!" 