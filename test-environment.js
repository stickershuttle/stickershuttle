#!/usr/bin/env node

/**
 * 🧪 Environment Testing Tool
 * Tests connections between local and production environments
 */

const axios = require('axios');
const { execSync } = require('child_process');

// Environment configurations
const ENVIRONMENTS = {
  local: {
    name: 'Local Development',
    frontend: 'http://localhost:3000',
    api: 'http://localhost:4000',
    graphql: 'http://localhost:4000/graphql',
    webhook_base: 'http://localhost:4000/webhooks'
  },
  production: {
    name: 'Production',
    frontend: 'https://stickershuttle.com',
    api: 'https://stickershuttle-production.up.railway.app',
    graphql: 'https://stickershuttle-production.up.railway.app/graphql',
    webhook_base: 'https://stickershuttle-production.up.railway.app/webhooks'
  }
};

class EnvironmentTester {
  constructor() {
    this.results = {
      local: {},
      production: {}
    };
  }

  async testEnvironment(envName) {
    console.log(`\n🧪 Testing ${ENVIRONMENTS[envName].name} Environment`);
    console.log('='.repeat(50));
    
    const env = ENVIRONMENTS[envName];
    const results = {};

    // Test API Health
    results.api_health = await this.testApiHealth(env.api);
    
    // Test GraphQL Endpoint
    results.graphql = await this.testGraphQL(env.graphql);
    
    // Test Frontend Accessibility
    results.frontend = await this.testFrontend(env.frontend);
    
    // Test Webhook Endpoints
    results.webhooks = await this.testWebhooks(env.webhook_base);

    this.results[envName] = results;
    this.printResults(envName, results);
    
    return results;
  }

  async testApiHealth(apiUrl) {
    try {
      console.log(`🔍 Testing API Health: ${apiUrl}/health`);
      const response = await axios.get(`${apiUrl}/health`, { timeout: 5000 });
      
      if (response.status === 200) {
        console.log(`✅ API Health Check: OK (${response.data.service})`);
        return { status: 'success', data: response.data };
      }
    } catch (error) {
      console.log(`❌ API Health Check: Failed - ${error.message}`);
      return { status: 'failed', error: error.message };
    }
  }

  async testGraphQL(graphqlUrl) {
    try {
      console.log(`🔍 Testing GraphQL: ${graphqlUrl}`);
      
      const query = {
        query: `
          query TestQuery {
            hello
          }
        `
      };

      const response = await axios.post(graphqlUrl, query, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      if (response.status === 200 && response.data.data) {
        console.log(`✅ GraphQL Endpoint: OK (${response.data.data.hello})`);
        return { status: 'success', data: response.data };
      }
    } catch (error) {
      console.log(`❌ GraphQL Endpoint: Failed - ${error.message}`);
      return { status: 'failed', error: error.message };
    }
  }

  async testFrontend(frontendUrl) {
    try {
      console.log(`🔍 Testing Frontend: ${frontendUrl}`);
      const response = await axios.get(frontendUrl, { timeout: 10000 });
      
      if (response.status === 200) {
        console.log(`✅ Frontend: OK (${response.status})`);
        return { status: 'success', status_code: response.status };
      }
    } catch (error) {
      console.log(`❌ Frontend: Failed - ${error.message}`);
      return { status: 'failed', error: error.message };
    }
  }

  async testWebhooks(webhookBase) {
    const webhookEndpoints = [
      '/orders-create',
      '/orders-paid', 
      '/orders-updated',
      '/orders-cancelled'
    ];

    const results = {};
    
    console.log(`🔍 Testing Webhook Endpoints: ${webhookBase}`);
    
    for (const endpoint of webhookEndpoints) {
      try {
        // Test with OPTIONS request to check if endpoint exists
        const response = await axios.options(`${webhookBase}${endpoint}`, { timeout: 3000 });
        results[endpoint] = { status: 'reachable', method: 'OPTIONS' };
        console.log(`✅ Webhook ${endpoint}: Reachable`);
      } catch (error) {
        if (error.response?.status === 405) {
          // Method not allowed = endpoint exists but doesn't accept OPTIONS
          results[endpoint] = { status: 'exists', method: 'POST_only' };
          console.log(`✅ Webhook ${endpoint}: Exists (POST only)`);
        } else {
          results[endpoint] = { status: 'failed', error: error.message };
          console.log(`❌ Webhook ${endpoint}: ${error.message}`);
        }
      }
    }

    return results;
  }

  printResults(envName, results) {
    console.log(`\n📊 ${ENVIRONMENTS[envName].name} Results Summary:`);
    console.log('-'.repeat(30));
    
    Object.entries(results).forEach(([test, result]) => {
      const status = result.status === 'success' || result.status === 'reachable' || result.status === 'exists' ? '✅' : '❌';
      console.log(`${status} ${test}: ${result.status}`);
    });
  }

  printComparisonReport() {
    console.log('\n🔄 Environment Comparison Report');
    console.log('='.repeat(50));
    
    const localHealth = this.results.local.api_health?.status === 'success';
    const prodHealth = this.results.production.api_health?.status === 'success';
    
    console.log(`\n🏠 Local Development:`);
    console.log(`   API Health: ${localHealth ? '✅ Running' : '❌ Down'}`);
    console.log(`   GraphQL: ${this.results.local.graphql?.status === 'success' ? '✅ Working' : '❌ Failed'}`);
    console.log(`   Frontend: ${this.results.local.frontend?.status === 'success' ? '✅ Running' : '❌ Down'}`);
    
    console.log(`\n🌐 Production:`);
    console.log(`   API Health: ${prodHealth ? '✅ Running' : '❌ Down'}`);
    console.log(`   GraphQL: ${this.results.production.graphql?.status === 'success' ? '✅ Working' : '❌ Failed'}`);
    console.log(`   Frontend: ${this.results.production.frontend?.status === 'success' ? '✅ Running' : '❌ Down'}`);

    // Recommendations
    console.log(`\n💡 Recommendations:`);
    if (!localHealth && prodHealth) {
      console.log(`   - Use production API for testing: NEXT_PUBLIC_API_URL=https://stickershuttle-production.up.railway.app`);
    } else if (localHealth && !prodHealth) {
      console.log(`   - Production API is down - contact Railway support`);
    } else if (localHealth && prodHealth) {
      console.log(`   - Both environments healthy - proceed with testing`);
    } else {
      console.log(`   - Both environments down - check configurations`);
    }
  }

  async testLocalStartup() {
    console.log('\n🚀 Testing Local Startup Process...');
    
    try {
      // Check if local API is running
      const localApiTest = await this.testApiHealth('http://localhost:4000');
      
      if (localApiTest.status !== 'success') {
        console.log('📋 Local API not running. Here are startup options:');
        console.log('   Option 1: ./start-local-api.bat');
        console.log('   Option 2: cd api && npm run dev');
        console.log('   Option 3: npm run docker:dev');
      }
      
      // Check if local frontend is running
      const localFrontendTest = await this.testFrontend('http://localhost:3000');
      
      if (localFrontendTest.status !== 'success') {
        console.log('📋 Local Frontend not running. Here are startup options:');
        console.log('   Option 1: ./start-local-frontend.bat');
        console.log('   Option 2: cd frontend && npm run dev');
        console.log('   Option 3: npm run docker:dev');
      }
      
    } catch (error) {
      console.log(`❌ Local startup test failed: ${error.message}`);
    }
  }
}

// CLI Interface
async function main() {
  const tester = new EnvironmentTester();
  const args = process.argv.slice(2);
  
  console.log('🔧 Sticker Shuttle Environment Tester');
  console.log('=====================================');
  
  if (args.includes('--local') || args.includes('-l')) {
    await tester.testEnvironment('local');
  } else if (args.includes('--production') || args.includes('-p')) {
    await tester.testEnvironment('production');
  } else if (args.includes('--startup') || args.includes('-s')) {
    await tester.testLocalStartup();
  } else {
    // Test both environments
    await tester.testEnvironment('local');
    await tester.testEnvironment('production');
    tester.printComparisonReport();
  }
  
  console.log('\n🏁 Testing Complete!');
  console.log('\nUsage:');
  console.log('  node test-environment.js           # Test both environments');
  console.log('  node test-environment.js --local   # Test local only');
  console.log('  node test-environment.js --production # Test production only');
  console.log('  node test-environment.js --startup # Check local startup');
}

// Add axios dependency check
try {
  require('axios');
} catch (error) {
  console.log('❌ Missing dependency: axios');
  console.log('Run: npm install axios');
  process.exit(1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = EnvironmentTester; 