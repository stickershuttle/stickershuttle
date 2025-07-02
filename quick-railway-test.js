const https = require('https');

async function testEndpoint(path, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'stickershuttle-production.up.railway.app',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Railway-Test/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          path,
          statusCode: res.statusCode,
          body: data,
          headers: res.headers
        });
      });
    });

    req.on('error', (e) => {
      reject({
        path,
        error: e.message,
        type: 'connection_error'
      });
    });

    req.setTimeout(timeout, () => {
      req.destroy();
      reject({
        path,
        error: 'Request timeout',
        type: 'timeout'
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Quick Railway Backend Test');
  console.log('=============================');
  
  const endpoints = [
    '/',
    '/health',
    '/graphql'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🔍 Testing ${endpoint}...`);
    
    try {
      const result = await testEndpoint(endpoint, 3000); // 3 second timeout
      console.log(`✅ ${result.path}: ${result.statusCode}`);
      
      if (result.statusCode === 200) {
        console.log(`📄 Response: ${result.body.substring(0, 200)}...`);
      } else {
        console.log(`📄 Response: ${result.body}`);
      }
      
    } catch (error) {
      if (error.type === 'timeout') {
        console.log(`⏰ ${error.path}: TIMEOUT after 3 seconds`);
      } else {
        console.log(`❌ ${error.path}: ${error.error}`);
      }
    }
  }
  
  console.log('\n📊 DIAGNOSIS:');
  console.log('=============');
  console.log('If all endpoints timeout, Railway container might not be starting');
  console.log('If specific endpoints fail, there might be routing issues');
  console.log('If you get 502, the app is crashing on startup');
  console.log('If you get 404, the app is running but routes are wrong');
}

runTests(); 