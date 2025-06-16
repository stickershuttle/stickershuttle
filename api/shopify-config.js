// Load environment variables from multiple possible locations
require('dotenv').config({ path: '../.env.local' });  // When running from api/
require('dotenv').config({ path: './.env.local' });   // When running from root
require('dotenv').config({ path: './.env' });         // API-specific env
require('dotenv').config();                           // System env

const shopifyConfig = {
  // Configuration from environment variables only
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecret: process.env.SHOPIFY_API_SECRET,
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
  storeUrl: process.env.SHOPIFY_STORE_URL,
  apiVersion: process.env.SHOPIFY_API_VERSION || '2024-01'
};

// Validate configuration
const validateConfig = () => {
  const required = ['apiKey', 'apiSecret', 'accessToken', 'storeUrl'];
  const missing = required.filter(key => 
    !shopifyConfig[key] || shopifyConfig[key].includes('your_')
  );
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing Shopify configuration: ${missing.join(', ')}`);
    console.warn('Please set the following environment variables:');
    console.warn('SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_ACCESS_TOKEN, SHOPIFY_STORE_URL');
  }
  
  return missing.length === 0;
};

module.exports = {
  shopifyConfig,
  validateConfig
}; 