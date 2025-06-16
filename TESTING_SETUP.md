# 🧪 Testing Setup Guide: Local vs Production

## 🏠 Local Development Environment

### Quick Start (Windows PowerShell Issue Fix)

Since `&&` doesn't work in Windows PowerShell, use these alternatives:

#### Option 1: Batch Files (Recommended)
```bash
# Start API only
./start-local-api.bat

# Start Frontend only  
./start-local-frontend.bat

# Or use the npm scripts separately
```

#### Option 2: PowerShell Alternative
```powershell
# Start both services in separate terminals
cd api; npm run dev
# In another terminal:
cd frontend; npm run dev
```

#### Option 3: Docker Development (Recommended for consistency)
```bash
npm run docker:dev
```

### 🔧 Local Configuration

**Ports:**
- Frontend: http://localhost:3000
- API: http://localhost:4000
- GraphQL Playground: http://localhost:4000/graphql

**Environment Files Needed:**
- `.env.local` (root directory) - Main environment file
- Contains: Shopify keys, Supabase keys, Cloudinary config

**Local API Features:**
- ✅ Apollo GraphQL Server with live schema
- ✅ Shopify API integration  
- ✅ Webhook handlers for order processing
- ✅ Local webhook simulator for testing
- ✅ File upload handling
- ✅ Supabase database integration

**Testing Webhooks Locally:**
```bash
# Terminal 1: Start your local server
npm run dev

# Terminal 2: Simulate webhook events
cd api
node local-webhook-simulator.js #1018
```

---

## 🌐 Production Environment

### Deployment Stack
- **Frontend**: Vercel (stickershuttle.com)
- **API**: Railway (stickershuttle-production.up.railway.app)
- **Database**: Supabase (shared)
- **Media**: Cloudinary (shared)

### Production URLs
- **Frontend**: https://stickershuttle.com
- **API**: https://stickershuttle-production.up.railway.app
- **GraphQL**: https://stickershuttle-production.up.railway.app/graphql

### Production Webhook Configuration
Production webhooks are configured to point to:
```
https://stickershuttle-production.up.railway.app/webhooks/orders-paid
https://stickershuttle-production.up.railway.app/webhooks/orders-created
https://stickershuttle-production.up.railway.app/webhooks/orders-updated
```

---

## 🧪 Testing Strategies

### 1. Local API + Local Frontend Testing
**When to use:** Feature development, debugging, schema changes

```bash
# Terminal 1
./start-local-api.bat

# Terminal 2  
./start-local-frontend.bat

# Test URLs
Frontend: http://localhost:3000
API: http://localhost:4000
GraphQL: http://localhost:4000/graphql
```

**Test Scenarios:**
- ✅ GraphQL queries/mutations
- ✅ Cart functionality  
- ✅ Order processing
- ✅ File uploads
- ✅ Webhook simulation
- ✅ Database operations

### 2. Production API + Local Frontend Testing
**When to use:** Frontend changes with stable backend

```bash
# Set environment variable for production API
# In frontend/.env.local:
NEXT_PUBLIC_API_URL=https://stickershuttle-production.up.railway.app

# Start only frontend locally
cd frontend && npm run dev
```

**Test Scenarios:**
- ✅ Frontend changes against live data
- ✅ Real webhook events
- ✅ Production database state
- ⚠️ Use carefully - affects live data!

### 3. Full Production Testing
**When to use:** End-to-end validation, user acceptance testing

**Access URLs:**
- Frontend: https://stickershuttle.com  
- API: https://stickershuttle-production.up.railway.app
- GraphQL: https://stickershuttle-production.up.railway.app/graphql

**Test Scenarios:**
- ✅ Complete user flows
- ✅ Real Shopify integration
- ✅ Live webhook processing
- ✅ Payment processing
- ✅ Order management

---

## 🔄 Environment Switching

### Apollo Client Configuration
The frontend automatically detects environment:

```javascript
// Local development
NEXT_PUBLIC_API_URL=http://localhost:4000

// Production testing  
NEXT_PUBLIC_API_URL=https://stickershuttle-production.up.railway.app

// Docker development
NEXT_PUBLIC_API_URL=http://api:4000
```

### Webhook Configuration Testing

#### Local Webhook Testing
```bash
# 1. Start local server
npm run dev

# 2. Use ngrok for external webhooks (optional)
ngrok http 4000

# 3. Or simulate webhooks locally
cd api
node local-webhook-simulator.js #1018
```

#### Production Webhook Testing
- Webhooks automatically trigger on real Shopify events
- Monitor Railway logs for webhook activity
- Check Shopify webhook delivery in admin panel

---

## 📊 Monitoring & Debugging

### Local Development
```bash
# API Logs
cd api && npm run dev
# Watch for: GraphQL queries, webhook events, Shopify API calls

# Frontend Logs  
cd frontend && npm run dev
# Watch for: Apollo Client errors, API connection issues
```

### Production Monitoring
- **Railway**: Check deployment logs and metrics
- **Vercel**: Monitor build/deployment status  
- **Shopify**: Webhook delivery status in admin
- **Supabase**: Database logs and metrics

---

## 🚀 Deployment Process

### To Production
```bash
# 1. Test locally first
npm run dev

# 2. Commit and push
git add .
git commit -m "Your changes"
git push origin main

# 3. Automatic deployment
# - GitHub Actions builds and deploys to Railway (API)
# - Vercel automatically deploys frontend
```

### Rollback Strategy
- **Frontend**: Vercel provides instant rollback via dashboard
- **API**: Railway provides deployment history and rollback
- **Database**: Supabase provides backup/restore options

---

## 🔧 Troubleshooting

### Common Issues

#### PowerShell && Error
**Problem:** `The token '&&' is not a valid statement separator`  
**Solution:** Use batch files or separate terminals

#### API Connection Failed
**Problem:** Frontend can't connect to API  
**Solution:** Check NEXT_PUBLIC_API_URL and API server status

#### Webhook Not Working
**Problem:** Orders not appearing in dashboard  
**Solution:** Check webhook URL, simulate locally first

#### Environment Variables Missing
**Problem:** Shopify/Supabase errors  
**Solution:** Verify .env.local has all required variables

---

## 📋 Pre-Deployment Checklist

### Before Going Live
- [ ] Local tests pass
- [ ] GraphQL playground works
- [ ] Webhook simulation successful  
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Shopify integration tested
- [ ] Payment flow verified

### Post-Deployment Verification
- [ ] Frontend loads correctly
- [ ] API health check passes
- [ ] GraphQL endpoint accessible
- [ ] Webhooks receiving events
- [ ] Orders appearing in dashboard
- [ ] Payment processing working 