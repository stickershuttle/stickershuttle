# 🚀 Production Launch Guide - Sticker Shuttle Website

## Pre-Launch Checklist

### 1. Environment Variables Setup

#### Frontend (Vercel)
Verify these are set in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `NEXT_PUBLIC_POSTHOG_KEY` - Your PostHog project key
- `NEXT_PUBLIC_POSTHOG_HOST` - https://app.posthog.com
- `NEXT_PUBLIC_API_URL` - https://ss-beyond.up.railway.app

#### Backend (Railway)
Verify these are set in Railway dashboard:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook endpoint secret
- `EASYPOST_API_KEY` - Your EasyPost API key
- `EASYPOST_TEST_MODE` - Set to `false` for production
- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Your Cloudinary API key
- `CLOUDINARY_API_SECRET` - Your Cloudinary API secret
- `KLAVIYO_API_KEY` - Your Klaviyo API key
- `DISCORD_WEBHOOK_URL` - Your Discord webhook URL for notifications
- `RESEND_API_KEY` - Your Resend API key for emails
- `NODE_ENV` - Set to `production`

### 2. Stripe Configuration Update

**CRITICAL: Update Stripe webhook endpoint**
1. Go to Stripe Dashboard → Webhooks
2. Find your current webhook endpoint
3. Update endpoint URL from development to: `https://ss-beyond.up.railway.app/webhooks/stripe`
4. Ensure these events are enabled:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

### 3. DNS Configuration (GoDaddy)

**For stickershuttle.com domain:**

#### A. Frontend (Vercel)
1. In GoDaddy DNS Management, add these records:
   - **Type:** CNAME
   - **Name:** www
   - **Value:** cname.vercel-dns.com
   - **TTL:** 600

   - **Type:** A
   - **Name:** @
   - **Value:** 76.76.21.21
   - **TTL:** 600

2. In Vercel dashboard:
   - Add `stickershuttle.com` as custom domain
   - Add `www.stickershuttle.com` as custom domain
   - Enable automatic HTTPS

#### B. API Subdomain (Railway)
1. Add CNAME record for API:
   - **Type:** CNAME
   - **Name:** api
   - **Value:** ss-beyond.up.railway.app
   - **TTL:** 600

### 4. Application Configuration Updates

#### A. Update CORS Configuration
The CORS configuration in `api/index.js` already includes production domains:
```javascript
const allowedOrigins = [
  'https://stickershuttle.com',
  'https://www.stickershuttle.com',
  // ... other domains
];
```

#### B. Update API URL
Frontend will automatically use production API URL when deployed to Vercel.

### 5. EasyPost Production Mode

**IMPORTANT:** Switch EasyPost from test to production mode:
1. In Railway dashboard, set `EASYPOST_TEST_MODE=false`
2. Ensure `EASYPOST_API_KEY` is your production key (not test key)

### 6. Supabase Configuration

#### A. Edge Functions
Deploy the notification edge function:
```bash
cd supabase
supabase functions deploy notify-customer-status-change
```

#### B. Environment Variables for Edge Function
In Supabase dashboard → Edge Functions → Settings:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `RESEND_API_KEY` - For email notifications

### 7. Cloudinary Configuration

Verify production upload presets:
- `sticker-uploads` - For general file uploads
- Ensure upload preset is set to "unsigned" for frontend usage

---

## Deployment Process

### Phase 1: Final Pre-Launch Testing (30 minutes)

1. **Test Build Process**
   ```bash
   # Frontend
   cd frontend
   npm run build
   
   # Backend (handled by Railway automatically)
   ```

2. **Verify All Services**
   - Test GraphQL endpoint: `https://ss-beyond.up.railway.app/graphql`
   - Test health endpoint: `https://ss-beyond.up.railway.app/health`
   - Verify Stripe webhooks are working

3. **Database Backup**
   ```bash
   # Export current Supabase data
   supabase db dump --local > pre-launch-backup.sql
   ```

### Phase 2: Domain Switch (15 minutes downtime)

1. **Shopify Backup**
   - Export all orders, customers, and products from Shopify admin
   - Save current theme as backup

2. **Update DNS Records**
   - Change A record from Shopify IP to Vercel IP
   - Update CNAME records as specified above
   - Set TTL to 300 (5 minutes) for faster propagation

3. **Monitor DNS Propagation**
   ```bash
   # Check DNS propagation
   nslookup stickershuttle.com
   ```

### Phase 3: Post-Launch Verification (15 minutes)

1. **Critical Path Testing**
   - [ ] Homepage loads correctly
   - [ ] Product pages load with pricing
   - [ ] Add to cart functionality
   - [ ] Checkout process end-to-end
   - [ ] Payment processing with Stripe
   - [ ] Order confirmation emails
   - [ ] User authentication (login/signup)
   - [ ] Admin dashboard access

2. **Third-Party Service Testing**
   - [ ] Stripe payments processing
   - [ ] EasyPost shipping labels
   - [ ] Cloudinary image uploads
   - [ ] Email notifications via Resend
   - [ ] PostHog analytics tracking
   - [ ] Discord webhook notifications

3. **Performance Check**
   - [ ] Page load times under 3 seconds
   - [ ] Mobile responsiveness
   - [ ] SSL certificate active
   - [ ] SEO metadata working

---

## Emergency Rollback Plan

If critical issues arise:

1. **Quick DNS Rollback**
   - Revert DNS A record to original Shopify IP
   - This will restore the old site within 5-10 minutes

2. **Shopify Reactivation**
   - Unpause Shopify store if paused
   - Restore theme from backup

3. **Critical Issue Debugging**
   - Check Railway logs: `railway logs`
   - Check Vercel logs in dashboard
   - Verify environment variables are set correctly

---

## Post-Launch Monitoring

### First 24 Hours
- Monitor error rates in Railway/Vercel dashboards
- Check Stripe webhook delivery status
- Verify email delivery rates
- Monitor PostHog for user activity

### First Week
- Monitor order completion rates
- Check for any payment processing issues
- Verify all automated systems (abandoned cart, etc.)
- Monitor site performance metrics

---

## Support Contacts

- **Domain/DNS Issues:** GoDaddy support
- **Frontend Issues:** Vercel support
- **Backend Issues:** Railway support
- **Database Issues:** Supabase support
- **Payment Issues:** Stripe support

---

## Quick Reference URLs

- **Frontend:** https://stickershuttle.com
- **API:** https://ss-beyond.up.railway.app
- **Admin:** https://stickershuttle.com/admin
- **GraphQL Playground:** https://ss-beyond.up.railway.app/graphql
- **Health Check:** https://ss-beyond.up.railway.app/health

---

## Final Checklist Before Launch

- [ ] All environment variables verified
- [ ] Stripe webhook URL updated
- [ ] DNS records prepared (but not yet changed)
- [ ] EasyPost in production mode
- [ ] Shopify data exported
- [ ] Database backup completed
- [ ] SSL certificates ready
- [ ] Team notified of launch window
- [ ] Monitoring tools ready
- [ ] Rollback plan confirmed

**Estimated Total Downtime: 15-30 minutes**

---

⚠️ **IMPORTANT:** Test everything in a staging environment first if possible. This is a live production deployment guide. 