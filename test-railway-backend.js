const https = require('https');

console.log('🔍 Testing Railway backend...');

// Test the health endpoint
const options = {
  hostname: 'stickershuttle-production.up.railway.app',
  port: 443,
  path: '/health',
  method: 'GET',
  headers: {
    'Origin': 'https://stickershuttle.vercel.app',
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'Content-Type'
  }
};

const req = https.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`📄 Response Body: ${data}`);
    
    // Check CORS headers
    const corsHeader = res.headers['access-control-allow-origin'];
    if (corsHeader) {
      console.log('✅ CORS header found:', corsHeader);
    } else {
      console.log('❌ No CORS header found - this is the problem!');
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request failed: ${e.message}`);
});

req.end(); 