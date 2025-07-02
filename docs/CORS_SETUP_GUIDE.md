# CORS & Development Setup Guide

## Overview

This guide explains how to properly configure your development environment for both local and production setups.

## Understanding CORS

**CORS (Cross-Origin Resource Sharing)** is required when your frontend and backend are on different origins:
- Different domains (localhost vs stickershuttle.com)
- Different ports (3000 vs 4000)
- Different protocols (http vs https)

## Your Development Setups

### 1. Local Development (Both Frontend & Backend Local)
```
Frontend: http://localhost:3000
Backend:  http://localhost:4000
```

**To use this setup:**
1. Start your local backend: `cd api && npm run dev`
2. Start your local frontend: `cd frontend && npm run dev`
3. Frontend will automatically connect to localhost:4000

### 2. Local Frontend + Production Backend
```
Frontend: http://localhost:3000
Backend:  https://stickershuttle-production.up.railway.app
```

**To use this setup:**
1. Create a `.env.local` file in your frontend directory:
   ```
   NEXT_PUBLIC_API_URL=https://stickershuttle-production.up.railway.app
   ```
2. Start only your frontend: `cd frontend && npm run dev`
3. Frontend will connect to the Railway production backend

### 3. Production (Both on Cloud)
```
Frontend: https://stickershuttle.vercel.app
Backend:  https://stickershuttle-production.up.railway.app
```

This happens automatically when you push to GitHub.

## CORS Configuration

The backend is configured to accept requests from:
```javascript
const allowedOrigins = [
  // Local development
  'http://localhost:3000',
  'http://localhost:3001',
  
  // Production domains
  'https://stickershuttle.com',
  'https://www.stickershuttle.com',
  'https://stickershuttle.vercel.app',
  
  // Vercel preview deployments (regex)
  /^https:\/\/stickershuttle-[\w-]+\.vercel\.app$/,
  /^https:\/\/[\w-]+\.vercel\.app$/
];
```

## Troubleshooting

### Still Getting CORS Errors?

1. **Check Railway deployment status**: Make sure the backend has deployed the latest changes
2. **Clear browser cache**: CORS errors can be cached
3. **Check browser console**: Look for the exact origin being blocked
4. **Verify API URL**: Make sure your frontend is pointing to the correct backend URL

### Testing CORS

You can test if CORS is working by visiting:
- Local: http://localhost:4000/health
- Production: https://stickershuttle-production.up.railway.app/health

You should see "OK" without any CORS errors.

## Environment Variables

### Frontend (.env.local)
```bash
# For local backend
NEXT_PUBLIC_API_URL=http://localhost:4000

# For production backend
# NEXT_PUBLIC_API_URL=https://stickershuttle-production.up.railway.app

# Other required variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
```

### Backend (.env)
```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Other services...
```

## Quick Commands

### Local Development (Full Stack)
```bash
# Terminal 1 - Backend
cd api
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Deploy to Production
```bash
git add -A
git commit -m "your message"
git push origin main
```

## Important Notes

1. **Never remove CORS entirely** - It will break cross-origin requests
2. **Always test locally first** before pushing to production
3. **Keep your .env files in .gitignore** - Never commit secrets
4. **Use environment-specific API URLs** to switch between local and production backends 