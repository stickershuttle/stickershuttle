// Railway Environment Variables Diagnostic
console.log('🔍 Railway Environment Variables Check');
console.log('=====================================');

const requiredVars = [
  { name: 'SUPABASE_URL', critical: true, description: 'Your Supabase project URL' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', critical: true, description: 'Supabase service role key (starts with eyJ...)' },
  { name: 'SUPABASE_ANON_KEY', critical: false, description: 'Supabase anonymous key' },
  { name: 'STRIPE_SECRET_KEY', critical: true, description: 'Stripe secret key (starts with sk_...)' },
  { name: 'STRIPE_WEBHOOK_SECRET', critical: true, description: 'Stripe webhook secret (starts with whsec_...)' },
  { name: 'SENTRY_DSN', critical: false, description: 'Sentry error monitoring DSN' },
  { name: 'EASYPOST_API_KEY', critical: false, description: 'EasyPost shipping API key' },
  { name: 'KLAVIYO_PRIVATE_KEY', critical: false, description: 'Klaviyo email marketing key' }
];

console.log('📋 REQUIRED ENVIRONMENT VARIABLES:');
console.log('');

let missingCritical = [];
let missingOptional = [];

requiredVars.forEach(variable => {
  const value = process.env[variable.name];
  const status = value ? '✅ SET' : '❌ MISSING';
  const priority = variable.critical ? '🚨 CRITICAL' : '⚠️  OPTIONAL';
  
  console.log(`${status} ${priority} ${variable.name}`);
  console.log(`   Description: ${variable.description}`);
  
  if (value) {
    // Show partial value for security
    const maskedValue = value.length > 10 ? 
      value.substring(0, 8) + '...' + value.substring(value.length - 4) :
      value.substring(0, 4) + '...';
    console.log(`   Value: ${maskedValue} (length: ${value.length})`);
  } else {
    if (variable.critical) {
      missingCritical.push(variable.name);
    } else {
      missingOptional.push(variable.name);
    }
  }
  console.log('');
});

// Summary
console.log('📊 SUMMARY:');
console.log('===========');

if (missingCritical.length === 0) {
  console.log('✅ All critical environment variables are set!');
  console.log('   Your backend should start successfully on Railway.');
} else {
  console.log('🚨 CRITICAL VARIABLES MISSING:');
  missingCritical.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('');
  console.log('❌ Railway backend will NOT start without these variables!');
  console.log('   This explains the 502 error you\'re seeing.');
}

if (missingOptional.length > 0) {
  console.log('');
  console.log('⚠️  OPTIONAL VARIABLES MISSING (features may not work):');
  missingOptional.forEach(varName => {
    console.log(`   - ${varName}`);
  });
}

console.log('');
console.log('🔧 HOW TO FIX:');
console.log('===============');
console.log('1. Go to your Railway dashboard');
console.log('2. Select your backend service');
console.log('3. Go to Variables tab');
console.log('4. Add the missing CRITICAL variables');
console.log('5. Redeploy your service');
console.log('');
console.log('💡 TIP: Copy values from your local .env files');

// Test basic functionality
console.log('🧪 TESTING LOCAL CONFIGURATION:');
console.log('================================');

try {
  // Test Supabase
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('✅ Supabase configuration looks valid');
  } else {
    console.log('❌ Supabase configuration incomplete');
  }

  // Test Stripe
  if (process.env.STRIPE_SECRET_KEY) {
    const isTest = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
    const isProd = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_');
    if (isTest || isProd) {
      console.log(`✅ Stripe configuration valid (${isTest ? 'TEST' : 'LIVE'} mode)`);
    } else {
      console.log('⚠️  Stripe key format unusual');
    }
  } else {
    console.log('❌ Stripe configuration missing');
  }

  console.log('');
  console.log(`🌍 Current NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`🚀 Server would start on PORT: ${process.env.PORT || 4000}`);

} catch (error) {
  console.log('❌ Error testing configuration:', error.message);
} 