# 🔍 SEO Recovery Plan - Shopify Migration

## Current Issue
All old Shopify URLs are returning 404 errors in Google search results, causing:
- Poor user experience for visitors from Google
- Loss of SEO ranking for indexed pages
- Potential loss of organic traffic and conversions

## Solution Overview
This plan implements **permanent redirects (301 redirects)** from old Shopify URLs to new custom site URLs, plus additional SEO recovery strategies.

---

## Phase 1: Immediate Actions (Deploy Today)

### ✅ Step 1: Deploy Redirect Configuration
The `next.config.js` file has been updated with comprehensive redirects covering:
- **Product Collections**: `/collections/*` → `/products/*`
- **Individual Products**: `/products/*` → `/products/*`
- **Account Pages**: `/account/*` → `/account/dashboard` or `/login`
- **Policy Pages**: `/pages/*` → direct policy pages
- **Blog Posts**: `/blogs/*` → `/blog/*`
- **Search & Checkout**: `/search` → `/products`, `/checkout` → `/cart`

**Action Required**: Deploy these changes to production immediately.

### ✅ Step 2: Test Redirects
Use the provided testing tool:
```bash
cd frontend
node check-redirects.js https://stickershuttle.com
```

This will verify all redirects are working correctly.

---

## Phase 2: Google Search Console Actions (Within 24 hours)

### 🔍 Step 3: Submit Updated Sitemap
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select your stickershuttle.com property
3. Navigate to **Sitemaps** section
4. Submit your current sitemap: `https://stickershuttle.com/sitemap.xml`
5. Delete any old Shopify sitemaps if listed

### 🔍 Step 4: Request Recrawling
1. In Google Search Console, go to **URL Inspection**
2. Test your main pages:
   - `https://stickershuttle.com/`
   - `https://stickershuttle.com/products`
   - `https://stickershuttle.com/products/vinyl-stickers`
   - `https://stickershuttle.com/products/holographic-stickers`
3. For each page, click **Request Indexing**

### 🔍 Step 5: Monitor 404 Errors
1. In Google Search Console, go to **Coverage** report
2. Look for 404 errors in the "Error" section
3. For any 404s not covered by our redirects, add them to the redirect list

---

## Phase 3: Enhanced SEO Recovery (Week 1-2)

### 🎯 Step 6: Update Google My Business
1. Go to [Google My Business](https://business.google.com/)
2. Update your business profile with correct URLs
3. Ensure all links point to your new site structure

### 🎯 Step 7: Monitor Search Console Reports
Check these reports weekly:
- **Coverage**: Ensure 404 errors are decreasing
- **Performance**: Monitor click-through rates and impressions
- **Mobile Usability**: Ensure no new issues

### 🎯 Step 8: Add Missing Redirects
If you discover specific URLs that are still 404ing:
1. Add them to the `redirects()` array in `next.config.js`
2. Follow this pattern:
```javascript
{
  source: '/old-shopify-url',
  destination: '/new-url',
  permanent: true,
},
```

---

## Phase 4: Advanced SEO Recovery (Weeks 2-4)

### 🚀 Step 9: Internal Link Audit
1. Review your website's internal links
2. Ensure all internal links use the new URL structure
3. Update any hardcoded links in your content

### 🚀 Step 10: External Link Outreach
1. Identify high-value external sites linking to your old URLs
2. Contact them to update links to your new structure
3. Use tools like Ahrefs or SEMrush to find backlinks

### 🚀 Step 11: Social Media Updates
1. Update links in your social media profiles
2. Update any pinned posts or bio links
3. Ensure all social media campaigns use new URLs

---

## Monitoring & Reporting

### Weekly Checks (First Month)
- [ ] Google Search Console 404 error count
- [ ] Organic traffic levels in Google Analytics
- [ ] Conversion rates from organic search
- [ ] Page load speeds and Core Web Vitals

### Key Metrics to Track
- **404 Error Reduction**: Should decrease by 80%+ within 2 weeks
- **Organic Traffic Recovery**: Should return to previous levels within 4-6 weeks
- **Ranking Recovery**: Monitor keyword rankings for your main products

---

## Emergency Contact Plan

If you discover critical URLs that are still 404ing:

### For Collections:
```javascript
{
  source: '/collections/your-collection-name',
  destination: '/products/your-product-page',
  permanent: true,
},
```

### For Products:
```javascript
{
  source: '/products/old-product-handle',
  destination: '/products/new-product-page',
  permanent: true,
},
```

### For Custom Pages:
```javascript
{
  source: '/pages/custom-page',
  destination: '/your-new-page',
  permanent: true,
},
```

---

## Expected Results Timeline

- **Week 1**: 404 errors start decreasing, redirects functioning
- **Week 2-3**: Google begins recognizing new URLs, traffic stabilizes
- **Week 4-6**: Rankings recover, organic traffic returns to normal levels
- **Week 8+**: Full SEO recovery, improved performance vs. Shopify

---

## Tools & Resources

### Testing Tools
- **Redirect Checker**: Use the provided `check-redirects.js` script
- **Online Redirect Checker**: https://httpstatus.io/
- **Google Search Console**: Monitor all SEO metrics

### Monitoring Tools
- **Google Search Console**: Primary monitoring tool
- **Google Analytics**: Track traffic and conversion recovery
- **PageSpeed Insights**: Ensure performance remains optimal

---

## Success Indicators

✅ **Immediate (24-48 hours)**:
- All redirects return 301 status codes
- No 404 errors for common Shopify URLs
- Updated sitemap submitted to Google

✅ **Short-term (1-2 weeks)**:
- 404 errors in Search Console decreasing
- Google recognizing new URLs
- Organic traffic stabilizing

✅ **Long-term (4-8 weeks)**:
- Full ranking recovery
- Organic traffic at or above pre-migration levels
- Improved page load speeds vs. Shopify

---

**Note**: This is a comprehensive recovery plan. The 301 redirects are the most critical component and should be deployed immediately. All other steps support the primary goal of recovering your SEO rankings and user experience. 