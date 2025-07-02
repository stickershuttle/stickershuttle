# CORS & Production Deployment Troubleshooting Guide

## Current Issue Summary

1. **Railway Backend**: Returns 502 Bad Gateway (service not running properly)
2. **Vercel Frontend**: Missing `NEXT_PUBLIC_API_URL` environment variable
3. **Result**: CORS errors because frontend is trying to connect to a non-responsive backend

## Step-by-Step Fix

### 1. Fix Railway Backend (502 Error)

#### A. Check Railway Deployment Status
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your `stickershuttle-production` service
3. Check the **Deployments** tab for errors

#### B. Verify Environment Variables in Railway
Required variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` 
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CLOUDINARY_URL`
- `NODE_ENV` = `production`
- `PORT` = Railway sets this automatically

#### C. Check Railway Logs
Look for these common issues:
- Missing environment variables
- Memory errors
- Module not found errors
- Connection timeouts

### 2. Configure Vercel Frontend

#### A. Add Environment Variable
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   ```
   NEXT_PUBLIC_API_URL = https://stickershuttle-production.up.railway.app
   ```
5. Select all environments (Production, Preview, Development)
6. Save and redeploy

#### B. Verify Other Frontend Variables
Make sure these are also set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

### 3. Test Endpoints

Once deployed, test these URLs:

1. **Basic Health Check**: 
   ```
   https://stickershuttle-production.up.railway.app/health
   ```
   Should return: `OK`

2. **Test Endpoint**:
   ```
   https://stickershuttle-production.up.railway.app/test
   ```
   Should return JSON with status info

3. **CORS Test**:
   ```
   https://stickershuttle-production.up.railway.app/cors-test
   ```
   Should show allowed origins

4. **GraphQL Endpoint**:
   ```
   https://stickershuttle-production.up.railway.app/graphql
   ```
   Should show GraphQL playground or require POST request

### 4. Common Issues & Solutions

#### Issue: "502 Bad Gateway" on Railway
**Causes:**
- Service crashed during startup
- Missing required environment variables
- Memory limit exceeded

**Solutions:**
- Check logs for specific error messages
- Verify all required env vars are set
- We've already increased memory limit to 2GB

#### Issue: "CORS Error" in Browser
**Causes:**
- Backend is down (502 error)
- Frontend trying to connect to wrong URL
- CORS not configured properly

**Solutions:**
- Fix backend first (must be running)
- Set `NEXT_PUBLIC_API_URL` in Vercel
- Backend already has proper CORS config

#### Issue: "Failed to fetch" Error
**Causes:**
- Network connectivity issue
- SSL certificate problem
- Backend not responding

**Solutions:**
- Ensure backend is running
- Check if Railway provides HTTPS
- Test with curl or Postman

### 5. Deployment Checklist

#### Railway Backend:
- [ ] All required environment variables set
- [ ] Latest code pushed to main branch
- [ ] Deployment successful (green status)
- [ ] Logs show "Server is listening on 0.0.0.0:PORT"
- [ ] Health endpoint responds with 200 OK

#### Vercel Frontend:
- [ ] `NEXT_PUBLIC_API_URL` set to Railway URL
- [ ] All other required env vars set
- [ ] Latest code deployed
- [ ] No build errors

### 6. Testing Production

1. **Direct API Test**:
   ```bash
   curl https://stickershuttle-production.up.railway.app/health
   ```

2. **Frontend Test**:
   - Visit https://stickershuttle.vercel.app
   - Open browser console
   - Should see "Apollo Client configured with URI: https://stickershuttle-production.up.railway.app"
   - No CORS errors

### 7. Emergency Fallback

If Railway continues to fail, you can temporarily:
1. Run the backend locally
2. Use ngrok to expose it: `ngrok http 4000`
3. Update Vercel's `NEXT_PUBLIC_API_URL` to the ngrok URL
4. This is temporary - fix Railway ASAP

## Next Steps

1. Push the updated Railway config files
2. Monitor Railway deployment logs
3. Set Vercel environment variable
4. Test all endpoints
5. Report back with specific error messages if issues persist 