# Vercel Environment Variables Setup

## Required Environment Variables for Production

The following environment variables need to be set in your Vercel dashboard for the application to work properly:

### Frontend Environment Variables

1. **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** (Required for checkout)
   - Your Stripe publishable key (starts with `pk_test_` for test mode or `pk_live_` for production)
   - This must be set in Vercel for checkout to work
   
2. **NEXT_PUBLIC_SUPABASE_URL**
   - Your Supabase project URL
   
3. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Your Supabase anonymous key

4. **NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME**
   - Your Cloudinary cloud name for image uploads

5. **NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET**
   - Your Cloudinary upload preset

6. **NEXT_PUBLIC_API_URL**
   - Your backend API URL (e.g., https://stickershuttle-production.up.railway.app)

## How to Set Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable with its value
5. Make sure to select the appropriate environment (Production/Preview/Development)
6. Save the changes
7. Redeploy your application for changes to take effect

## Current Issue

The checkout error "Cannot read properties of undefined (reading 'match')" is caused by the missing `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` environment variable on Vercel.

To fix this:
1. Get your Stripe publishable key from your Stripe dashboard
2. Add it to Vercel as described above
3. Redeploy your application 