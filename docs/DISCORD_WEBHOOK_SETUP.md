# Discord Webhook Setup Guide

This guide will help you set up Discord notifications for your Sticker Shuttle order system.

## 🎯 What You'll Get

- **Instant mobile notifications** when orders come in
- **Rich formatted messages** with order details
- **Different colors and emojis** for different order statuses
- **100% FREE** with no limits

## 📱 Step 1: Create Discord Server & Channel

### 1.1 Create a Discord Server (if you don't have one)
1. Open Discord (web, desktop, or mobile app)
2. Click the **"+"** button in the server list
3. Select **"Create My Own"**
4. Choose **"For me and my friends"**
5. Name your server (e.g., "Sticker Shuttle Business")
6. Click **"Create"**

### 1.2 Create a Dedicated Channel
1. Right-click on your server name
2. Select **"Create Channel"**
3. Choose **"Text Channel"**
4. Name it `order-notifications`
5. Click **"Create Channel"**

## 🔗 Step 2: Create Discord Webhook

### 2.1 Access Channel Settings
1. Go to your `#order-notifications` channel
2. Click the **gear icon** (⚙️) next to the channel name
3. Select **"Integrations"** from the left menu

### 2.2 Create Webhook
1. Click **"Create Webhook"**
2. Customize your webhook:
   - **Name**: `Sticker Shuttle Orders`
   - **Avatar**: Upload your logo (optional)
   - **Channel**: Make sure it's set to `#order-notifications`

### 2.3 Copy Webhook URL
1. Click **"Copy Webhook URL"**
2. **IMPORTANT**: Keep this URL secret! Anyone with this URL can send messages to your channel.

## 🌐 Step 3: Add Environment Variables

You need to add the Discord webhook URL to both your frontend (Vercel) and backend (Railway) environments.

### 3.1 Add to Vercel (Frontend)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `Sticker Shuttle Website` project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Add:
   - **Name**: `DISCORD_WEBHOOK_URL`
   - **Value**: Your copied webhook URL
   - **Environments**: Select all (Production, Preview, Development)
6. Click **"Save"**

### 3.2 Add to Railway (Backend)
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your backend project
3. Go to **Variables** tab
4. Click **"New Variable"**
5. Add:
   - **Name**: `DISCORD_WEBHOOK_URL`
   - **Value**: Your copied webhook URL
6. Click **"Add"**

### 3.3 Add to Supabase (Edge Functions)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Edge Functions**
4. Click **"Add new secret"**
5. Add:
   - **Name**: `DISCORD_WEBHOOK_URL`
   - **Value**: Your copied webhook URL
6. Click **"Save"**

## 🚀 Step 4: Deploy Changes

### 4.1 Deploy Supabase Edge Function
```bash
# From your project root
supabase functions deploy notify-customer-status-change
```

### 4.2 Deploy Frontend (if needed)
```bash
# Your changes will auto-deploy when you push to main
git add .
git commit -m "Add Discord webhook support"
git push origin main
```

## 📱 Step 5: Test Your Setup

### 5.1 Test Webhook Directly
You can test if your webhook works by using this curl command:

```bash
curl -X POST "YOUR_DISCORD_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "🧪 Test message from Sticker Shuttle!",
    "embeds": [{
      "title": "Test Notification",
      "description": "If you see this, your Discord webhook is working! 🎉",
      "color": 65280
    }]
  }'
```

### 5.2 Test with Real Order
1. Create a test order on your website
2. Update the order status in your admin panel
3. Check your Discord channel for the notification

## 🎨 What Your Notifications Will Look Like

**New Order:**
- 🚨 **NEW ORDER ALERT** 🚨
- Green colored embed with order details
- Customer name, email, order total
- Timestamp

**Order Updates:**
- 📋 **ORDER UPDATE** 📋
- Different colors for different statuses:
  - 🔵 Blue: Creating Proofs
  - 🟠 Orange: Awaiting Proof Approval
  - 🟢 Green: Approved/Delivered
  - 🟣 Purple: In Production
  - 🔴 Red: Cancelled

## 📱 Mobile App Setup

### Get Discord Mobile App
1. Download Discord from App Store or Google Play
2. Log in with your account
3. Join your server
4. **Enable push notifications** in Discord settings

### Customize Notifications
1. Right-click your server name
2. Go to **"Notification Settings"**
3. Set to **"All Messages"** for instant alerts
4. Make sure mobile push notifications are enabled

## 🔧 Troubleshooting

### Common Issues:

**1. No notifications appearing**
- Check if webhook URL is correctly added to environment variables
- Verify the channel exists and webhook is active
- Check Supabase function logs for errors

**2. Webhook URL not working**
- Make sure you copied the complete URL
- Verify it starts with `https://discord.com/api/webhooks/`
- Try the test curl command above

**3. Environment variables not working**
- Make sure you redeployed after adding variables
- Check variable names are exactly: `DISCORD_WEBHOOK_URL`
- Verify variables are set in the correct environment

### Check Logs:
```bash
# Check Supabase function logs
supabase functions logs notify-customer-status-change

# Check for Discord API errors in the logs
```

## 🎉 Success!

Once set up, you'll receive beautiful Discord notifications for:
- ✅ New orders
- ✅ Order status changes
- ✅ Shipping updates
- ✅ Customer information
- ✅ Order totals

**Your phone will buzz every time you get an order! 📱💰**

## 🔒 Security Notes

- **Never share your webhook URL publicly**
- **Don't commit it to version control**
- **Use environment variables only**
- **If compromised, regenerate the webhook in Discord**

## Need Help?

If you run into issues, check:
1. Supabase function logs
2. Discord webhook settings
3. Environment variable configuration
4. Network connectivity

The Discord webhook is now integrated into your existing notification system and will work alongside your email notifications! 