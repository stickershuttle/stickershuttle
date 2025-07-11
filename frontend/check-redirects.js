#!/usr/bin/env node

/**
 * Redirect Testing Tool for Shopify Migration
 * 
 * This script tests common Shopify URL patterns against your new site
 * to ensure all redirects are working properly.
 */

const https = require('https');
const http = require('http');

// Common Shopify URLs to test
const urlsToTest = [
  // Collections
  '/collections/all',
  '/collections/stickers',
  '/collections/vinyl-stickers',
  '/collections/custom-stickers',
  '/collections/holographic-stickers',
  '/collections/clear-stickers',
  '/collections/chrome-stickers',
  '/collections/glitter-stickers',
  '/collections/bumper-stickers',
  '/collections/vinyl-banners',
  '/collections/sticker-sheets',
  '/collections/sample-packs',
  
  // Products
  '/products/vinyl-sticker',
  '/products/custom-vinyl-stickers',
  '/products/holographic-sticker',
  '/products/clear-sticker',
  '/products/chrome-sticker',
  '/products/glitter-sticker',
  '/products/bumper-sticker',
  '/products/vinyl-banner',
  '/products/sticker-sheet',
  '/products/sample-pack',
  
  // Account pages
  '/account',
  '/account/login',
  '/account/register',
  '/account/addresses',
  '/account/orders',
  
  // Policy pages
  '/pages/privacy-policy',
  '/pages/terms-of-service',
  '/pages/shipping-policy',
  '/pages/refund-policy',
  '/pages/contact',
  '/pages/contact-us',
  '/pages/about',
  '/pages/about-us',
  
  // Blog
  '/blogs/news',
  '/blogs/sticker-news',
  
  // Other
  '/search',
  '/checkout',
];

const baseUrl = process.argv[2] || 'https://stickershuttle.com';

console.log(`🔍 Testing redirects for: ${baseUrl}`);
console.log(`📊 Testing ${urlsToTest.length} URLs...\n`);

async function testRedirect(url) {
  return new Promise((resolve) => {
    const fullUrl = `${baseUrl}${url}`;
    const requestModule = fullUrl.startsWith('https') ? https : http;
    
    const req = requestModule.request(fullUrl, { method: 'HEAD' }, (res) => {
      const statusCode = res.statusCode;
      const location = res.headers.location;
      
      if (statusCode >= 300 && statusCode < 400 && location) {
        resolve({
          url,
          status: statusCode,
          redirect: location,
          success: true
        });
      } else if (statusCode === 200) {
        resolve({
          url,
          status: statusCode,
          redirect: null,
          success: true,
          note: 'Direct hit (no redirect needed)'
        });
      } else {
        resolve({
          url,
          status: statusCode,
          redirect: null,
          success: false,
          error: `Status ${statusCode}`
        });
      }
    });
    
    req.on('error', (err) => {
      resolve({
        url,
        status: null,
        redirect: null,
        success: false,
        error: err.message
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        url,
        status: null,
        redirect: null,
        success: false,
        error: 'Timeout'
      });
    });
    
    req.end();
  });
}

async function testAllRedirects() {
  const results = [];
  
  for (const url of urlsToTest) {
    const result = await testRedirect(url);
    results.push(result);
    
    if (result.success) {
      if (result.redirect) {
        console.log(`✅ ${url} → ${result.redirect} (${result.status})`);
      } else {
        console.log(`✅ ${url} → Direct hit (${result.status})`);
      }
    } else {
      console.log(`❌ ${url} → ${result.error || 'Failed'}`);
    }
  }
  
  console.log('\n📈 Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n🔧 Failed URLs to investigate:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   ${r.url} - ${r.error}`);
    });
  }
  
  console.log('\n💡 Next steps:');
  console.log('1. Deploy these changes to production');
  console.log('2. Test redirects on live site');
  console.log('3. Submit updated sitemap to Google Search Console');
  console.log('4. Request Google to recrawl your site');
}

testAllRedirects().catch(console.error); 