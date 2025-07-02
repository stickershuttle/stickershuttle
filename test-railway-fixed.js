const https = require('https');

console.log('🧪 Testing Railway Backend After Environment Variable Fix');
console.log('=======================================================');

async function testRailwayHealth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'stickershuttle-production.up.railway.app',
      port: 443,
      path: '/health',
      method: 'GET',
      headers: {
        'User-Agent': 'Railway-Health-Check/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runTest() {
  try {
    console.log('🔍 Testing Railway health endpoint...');
    const result = await testRailwayHealth();
    
    console.log(`📊 Status Code: ${result.statusCode}`);
    
    if (result.statusCode === 200) {
      console.log('✅ SUCCESS! Railway backend is working!');
      console.log('📄 Response:', result.body);
      
      // Parse response to show service status
      try {
        const health = JSON.parse(result.body);
        console.log('');
        console.log('🏥 Service Health Details:');
        console.log(`   Status: ${health.status}`);
        console.log(`   Environment: ${health.environment}`);
        console.log(`   Timestamp: ${health.timestamp}`);
        console.log(`   Service: ${health.service}`);
      } catch (e) {
        console.log('Response is not JSON or has different format');
      }
      
    } else if (result.statusCode === 502) {
      console.log('❌ Still getting 502 error');
      console.log('🔧 This means environment variables are still missing or Railway hasn\'t redeployed yet');
      console.log('💡 Wait a few minutes for Railway to redeploy, then try again');
      
    } else {
      console.log(`⚠️  Unexpected status code: ${result.statusCode}`);
      console.log('📄 Response:', result.body);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    
    if (error.message === 'Request timeout') {
      console.log('🔧 Railway might be starting up or still deploying');
    } else {
      console.log('🔧 Check Railway deployment logs for more details');
    }
  }
}

// Run the test
runTest(); 