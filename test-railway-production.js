const https = require('https');

async function testRailwayProduction() {
  console.log('🧪 Testing Railway Production Deployment');
  console.log('========================================');
  
  const endpoints = [
    { path: '/health', name: 'Health Check' },
    { path: '/', name: 'Root Endpoint' },
    { path: '/graphql', name: 'GraphQL Endpoint' }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🔍 Testing ${endpoint.name} (${endpoint.path})...`);
    
    try {
      const result = await testEndpoint(endpoint.path);
      
      if (result.statusCode === 200) {
        console.log(`✅ ${endpoint.name}: SUCCESS (${result.statusCode})`);
        if (endpoint.path === '/health') {
          const healthData = JSON.parse(result.body);
          console.log(`   📊 Status: ${healthData.status}`);
          console.log(`   🌍 Environment: ${healthData.environment}`);
          console.log(`   ⏰ Timestamp: ${healthData.timestamp}`);
        }
      } else if (result.statusCode === 404 && endpoint.path === '/graphql') {
        console.log(`⚠️ ${endpoint.name}: Expected 404 for GET request (GraphQL needs POST)`);
      } else {
        console.log(`❌ ${endpoint.name}: HTTP ${result.statusCode}`);
        console.log(`   Response: ${result.body.substring(0, 200)}`);
      }
      
    } catch (error) {
      if (error.type === 'timeout') {
        console.log(`⏰ ${endpoint.name}: TIMEOUT - Railway still starting or not configured`);
      } else {
        console.log(`❌ ${endpoint.name}: ${error.error}`);
      }
    }
  }
  
  console.log('\n📊 RESULTS:');
  console.log('===========');
  console.log('✅ If health check succeeds: Railway is working!');
  console.log('⏰ If timeouts persist: Railway configuration needs adjustment');
  console.log('❌ If 502 errors: Check Railway logs for startup errors');
}

function testEndpoint(path, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'stickershuttle-production.up.railway.app',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Railway-Production-Test/1.0'
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
          body: data,
          headers: res.headers
        });
      });
    });

    req.on('error', (e) => {
      reject({
        error: e.message,
        type: 'connection_error'
      });
    });

    req.setTimeout(timeout, () => {
      req.destroy();
      reject({
        error: 'Request timeout after ' + timeout + 'ms',
        type: 'timeout'
      });
    });

    req.end();
  });
}

testRailwayProduction(); 