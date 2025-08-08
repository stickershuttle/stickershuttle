// Initialize console suppressor for production (must be first)
const { suppressConsoleInProduction } = require('./console-suppressor');
suppressConsoleInProduction();

// Startup logging
console.log('🚀 Sticker Shuttle API starting...');
if (process.env.NODE_ENV !== 'production') {
  console.log(`Environment: ${process.env.NODE_ENV || 'development'} | Port: ${process.env.PORT || 4000}`);
}

// Load environment variables - Railway provides them directly
// Only load dotenv in local development (Railway provides env vars directly)
if (process.env.NODE_ENV !== 'production' && !process.env.RAILWAY_ENVIRONMENT) {
  require('dotenv').config();
  console.log('📧 Loaded .env file - RESEND_API_KEY configured:', !!process.env.RESEND_API_KEY);
} else if (!process.env.RAILWAY_ENVIRONMENT) {
  // Always load .env file if not in Railway environment (local development)
  require('dotenv').config();
  console.log('📧 Loaded .env file for local development - RESEND_API_KEY configured:', !!process.env.RESEND_API_KEY);
}

// Initialize Sentry error monitoring (must be first)
// TEMPORARILY DISABLED FOR DEBUGGING
let Sentry = { captureException: () => {} }; // Mock Sentry

const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const GraphQLError = require('graphql').GraphQLError;
const gql = require('graphql-tag');
const express = require('express');
const { json } = require('body-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// Create custom AuthenticationError
class AuthenticationError extends GraphQLError {
  constructor(message) {
    super(message, {
      extensions: {
        code: 'UNAUTHENTICATED',
      },
    });
  }
}

// Admin authentication helper
function requireAdminAuth(user) {
  if (!user) {
    throw new AuthenticationError('Authentication required');
  }
  const ADMIN_EMAILS = ['justin@stickershuttle.com', 'admin@stickershuttle.com', 'orbit@stickershuttle.com'];
  const email = String(user.email || '').toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) {
    throw new AuthenticationError('Admin access required');
  }
  return true;
}

// Standardized error response helper
function createErrorResponse(message, details = null) {
  return {
    success: false,
    message,
    error: details,
    data: null
  };
}

// Standardized success response helper
function createSuccessResponse(message, data = null) {
  return {
    success: true,
    message,
    error: null,
    data
  };
}
const uploadRoutes = require('./upload-routes');
const supabaseClient = require('./supabase-client');
const stripeClient = require('./stripe-client');
const stripeWebhookHandlers = require('./stripe-webhook-handlers');
const easyPostClient = require('./easypost-client');
const EasyPostTrackingEnhancer = require('./easypost-tracking-enhancer');
const { discountManager } = require('./discount-manager');
const KlaviyoClient = require('./klaviyo-client');
const klaviyoClient = new KlaviyoClient();
const creditHandlers = require('./credit-handlers');

// Initialize enhanced tracking
const trackingEnhancer = new EasyPostTrackingEnhancer(easyPostClient);

// Initialize credit handlers with Supabase
creditHandlers.initializeWithSupabase(supabaseClient);

// Check service status  
const services = {
  supabase: supabaseClient.isReady(),
  stripe: stripeClient.isReady(),
  easypost: easyPostClient.isReady(),
  klaviyo: klaviyoClient.isReady()
};
const readyCount = Object.values(services).filter(Boolean).length;
console.log(`📋 Services ready: ${readyCount}/4 (${Object.entries(services).filter(([k,v]) => v).map(([k]) => k).join(', ') || 'none'})`);
if (readyCount < 4) {
  console.warn('⚠️ Missing services:', Object.entries(services).filter(([k,v]) => !v).map(([k]) => k).join(', '));
}

// Initialize Express app
const app = express();

// Trust proxy headers (required for Railway and other proxied environments)
// Configure trust proxy more securely for Railway
if (process.env.NODE_ENV === 'production') {
  // In production (Railway), trust the first proxy
  app.set('trust proxy', 1);
} else {
  // In development, trust localhost
  app.set('trust proxy', 'loopback');
}

// Add immediate health check - before any middleware
app.get('/health', (req, res) => {
  res.setTimeout(5000, () => {
    console.log('⚠️ Health check timeout!');
  });
  res.status(200).send('OK');
});

// Add a super simple root endpoint that returns HTML for browser testing
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`
    <html>
      <head><title>Sticker Shuttle API</title></head>
      <body>
        <h1>Sticker Shuttle API is running</h1>
        <p>Status: OK</p>
        <p>Environment: ${process.env.NODE_ENV || 'not set'}</p>
        <p>Railway: ${process.env.RAILWAY_ENVIRONMENT || 'not set'}</p>
        <p>Endpoints:</p>
        <ul>
          <li><a href="/health">/health</a> - Health check</li>
          <li><a href="/test">/test</a> - Test endpoint</li>
          <li>/graphql - GraphQL API</li>
        </ul>
      </body>
    </html>
  `);
});

// Add a super simple test endpoint that bypasses everything
app.get('/test', (req, res) => {
  res.status(200).json({ 
    status: 'alive',
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'not set',
    port: process.env.PORT || 4000,
    railway: {
      environment: process.env.RAILWAY_ENVIRONMENT || 'not set',
      project_id: process.env.RAILWAY_PROJECT_ID || 'not set',
      service_id: process.env.RAILWAY_SERVICE_ID || 'not set',
      replica_id: process.env.RAILWAY_REPLICA_ID || 'not set'
    },
    services: {
      supabase: supabaseClient.isReady() ? 'ready' : 'not configured',
      stripe: stripeClient.isReady() ? 'ready' : 'not configured',
      easypost: easyPostClient.isReady() ? 'ready' : 'not configured',
      klaviyo: klaviyoClient.isReady() ? 'ready' : 'not configured'
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  });
});

// Add request logging middleware (development only or errors)
app.use((req, res, next) => {
  const start = Date.now();
  
  // Only log in development or for specific paths
  const shouldLog = process.env.NODE_ENV !== 'production' || 
                   req.path.startsWith('/webhooks') || 
                   req.path.startsWith('/graphql');
  
  if (shouldLog && req.path !== '/health') {
    console.log(`${req.method} ${req.path}`);
  }
  
  // Log errors or slow requests
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400 || duration > 1000) {
      console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });
  
  next();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // In production, exit to let Railway restart the container
  if (process.env.NODE_ENV === 'production') {
    console.error('🚨 Exiting process due to uncaught exception in production');
    process.exit(1);
  }
  // Keep the process alive but log the error in development
  Sentry.captureException(error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, exit to let Railway restart the container
  if (process.env.NODE_ENV === 'production') {
    console.error('🚨 Exiting process due to unhandled rejection in production');
    process.exit(1);
  }
  // Keep the process alive but log the error in development
  Sentry.captureException(new Error(`Unhandled Rejection: ${reason}`));
});

// CORS configuration for both local and production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      // Local development
      'http://localhost:3000',
      'http://localhost:3001',
      
      // Production domains
      'https://stickershuttle.com',
      'https://www.stickershuttle.com',
      'https://stickershuttle.vercel.app',
      
      // Vercel preview deployments
      /^https:\/\/stickershuttle-[\w-]+\.vercel\.app$/,
      /^https:\/\/[\w-]+\.vercel\.app$/
    ];
    
    // Check if origin matches any allowed origin
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ CORS blocked:', origin);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-info', 'apikey'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Add security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://checkout.stripe.com", "https://va.vercel-scripts.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://js.stripe.com", "https://*.stripe.com", "https://js.stripe.com/type-font/"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://checkout.stripe.com", "https://vitals.vercel-insights.com"],
      frameSrc: ["'self'", "https://checkout.stripe.com", "https://js.stripe.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting configuration
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 500, // Much more generous for customers
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for customer-facing requests
    if (process.env.NODE_ENV === 'development') {
      return true; // Skip all rate limiting in development
    }
    
    // Skip for essential customer paths
    const skipPaths = [
      '/health',
      '/graphql',
      '/health/detailed',
      '/api/contact', // Allow contact form submissions
      '/api/auth/verify' // Allow auth verification
    ];
    
    return skipPaths.includes(req.path);
  }
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Increased from 10 to 50 uploads per hour
  message: {
    error: 'Too many upload attempts from this IP, please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip strict limiting in development
    return process.env.NODE_ENV === 'development';
  }
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 2000, // Increased from 1000 to 2000 webhook requests per hour
  message: {
    error: 'Webhook rate limit exceeded',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all requests
app.use(generalLimiter);

// Apply strict rate limiting to upload routes
app.use('/api/upload', strictLimiter);

// Apply webhook rate limiting to webhook routes
app.use('/webhooks', webhookLimiter);

// Add Sentry request handling middleware (temporarily commented out)
// app.use(Sentry.Handlers.requestHandler());

// Add upload routes
app.use('/api', uploadRoutes);

// Add placeholder image route
app.get('/api/placeholder/:width/:height', (req, res) => {
  const { width, height } = req.params;
  const w = parseInt(width) || 64;
  const h = parseInt(height) || 64;
  
  // Generate a simple SVG placeholder
  const svg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">
        ${w}x${h}
      </text>
    </svg>
  `;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  res.send(svg);
});

// Add Stripe webhook routes with raw body parsing (CRITICAL: must be before any JSON parsing)
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandlers);

// Add EasyPost webhook endpoint with enhanced tracking
app.post('/webhooks/easypost', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = req.body;
    const eventData = JSON.parse(event.toString());
    
    // Handle tracker updates with enhanced processing
    if (eventData.result && eventData.result.object === 'Tracker') {
      const tracker = eventData.result;
      console.log(`📦 Tracking update: ${tracker.tracking_code} -> ${tracker.status}`);
      
      // Use enhanced tracking processor
      const success = await trackingEnhancer.processTrackingUpdate(tracker);
      
      if (!success) {
        console.warn('⚠️ Tracking update failed for:', tracker.tracking_code);
      }
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ EasyPost webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// Health check with more details (overrides the simple one)
app.get('/health/detailed', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Sticker Shuttle API',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 4000,
    easypostConfigured: easyPostClient.isReady()
  });
});



// API info endpoint
app.get('/info', (req, res) => {
  res.json({ 
    message: 'Sticker Shuttle API is running',
    graphql: '/graphql',
    health: '/health',
    detailedHealth: '/health/detailed'
  });
});

// Add Sentry test endpoint
app.get('/debug-sentry', (req, res) => {
  throw new Error('This is a test error for Sentry!');
});

// Add webhook diagnostic endpoint
app.get('/webhooks/test', async (req, res) => {
  const diagnostics = {
    webhook_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
    webhook_secret_prefix: process.env.STRIPE_WEBHOOK_SECRET ? process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10) + '...' : 'NOT SET',
    supabase_configured: supabaseClient.isReady(),
    stripe_configured: stripeClient.isReady(),
    timestamp: new Date().toISOString()
  };

  // Try to get recent pending orders
  if (supabaseClient.isReady()) {
    try {
      const client = supabaseClient.getServiceClient();
      const { data: pendingOrders } = await client
        .from('orders_main')
        .select('id, financial_status, order_status, created_at, stripe_session_id')
        .eq('financial_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      
      diagnostics.recent_pending_orders = pendingOrders || [];
      
      // Also check for orders with the specific session ID
      const { data: sessionOrder } = await client
        .from('orders_main')
        .select('id, financial_status, order_status, stripe_session_id')
        .eq('stripe_session_id', 'cs_test_a1nPX5t5vTZ4VD01f0mL3dEK3gyfA7yXExQvoVsb3JePgQMfuzscqSehpL')
        .single();
      
      diagnostics.order_with_test_session = sessionOrder || null;
    } catch (error) {
      diagnostics.pending_orders_error = error.message;
    }
  }

  res.json(diagnostics);
});

// Add EasyPost diagnostic endpoint
app.get('/easypost/status', (req, res) => {
  const diagnostics = {
    easypost_configured: easyPostClient.isReady(),
    easypost_test_mode: easyPostClient.isTestMode(),
    easypost_api_key_set: !!process.env.EASYPOST_API_KEY,
    easypost_api_key_prefix: process.env.EASYPOST_API_KEY ? process.env.EASYPOST_API_KEY.substring(0, 8) + '...' : 'NOT SET',
    easypost_test_mode_env: process.env.EASYPOST_TEST_MODE,
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };

  // Add rate limiting stats if client is ready
  if (easyPostClient.isReady()) {
    diagnostics.rate_limiting = easyPostClient.getRateLimitingStats();
  }

  // Try to check if we can reinitialize
  if (!easyPostClient.isReady() && process.env.EASYPOST_API_KEY) {
    easyPostClient.init();
    diagnostics.reinit_attempted = true;
    diagnostics.reinit_result = easyPostClient.isReady();
    if (diagnostics.reinit_result) {
      console.log('🔄 EasyPost reconnected');
    }
  }

  res.json(diagnostics);
});

// Add EasyPost health check endpoint
app.get('/easypost/health', async (req, res) => {
  try {
    const healthCheck = await easyPostClient.testApiHealth();
    res.json(healthCheck);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Add Klaviyo diagnostic endpoint
app.get('/klaviyo/status', (req, res) => {
  const configStatus = klaviyoClient.getConfigurationStatus();
  const configuredLists = klaviyoClient.getConfiguredLists();
  
  const diagnostics = {
    klaviyo_configured: configStatus.readiness.partially_ready, // True if API key is set
    klaviyo_fully_configured: configStatus.readiness.fully_ready, // True if API key AND default list
    klaviyo_api_key_set: !!process.env.KLAVIYO_PRIVATE_API_KEY,
    klaviyo_api_key_prefix: process.env.KLAVIYO_PRIVATE_API_KEY ? process.env.KLAVIYO_PRIVATE_API_KEY.substring(0, 8) + '...' : 'NOT SET',
    klaviyo_public_key_set: !!process.env.KLAVIYO_PUBLIC_API_KEY,
    klaviyo_default_list_id: process.env.KLAVIYO_DEFAULT_LIST_ID || 'NOT SET',
    klaviyo_lists_configured: configuredLists,
    configuration_details: configStatus,
    environment_variables: {
      KLAVIYO_PRIVATE_API_KEY: process.env.KLAVIYO_PRIVATE_API_KEY ? 'Set' : 'Missing',
      KLAVIYO_PUBLIC_API_KEY: process.env.KLAVIYO_PUBLIC_API_KEY ? 'Set' : 'Missing',
      KLAVIYO_DEFAULT_LIST_ID: process.env.KLAVIYO_DEFAULT_LIST_ID ? 'Set' : 'Missing',
      KLAVIYO_WINBACK_LIST_ID: process.env.KLAVIYO_WINBACK_LIST_ID ? 'Set' : 'Missing',
      KLAVIYO_REPEAT_LIST_ID: process.env.KLAVIYO_REPEAT_LIST_ID ? 'Set' : 'Missing',
      KLAVIYO_NEWSLETTER_LIST_ID: process.env.KLAVIYO_NEWSLETTER_LIST_ID ? 'Set' : 'Missing'
    },
    setup_instructions: {
      message: configStatus.message,
      next_steps: configStatus.configuration_level === 'none' ? [
        'Set KLAVIYO_PRIVATE_API_KEY environment variable',
        'Set KLAVIYO_PUBLIC_API_KEY environment variable',
        'Set KLAVIYO_DEFAULT_LIST_ID environment variable'
      ] : configStatus.configuration_level === 'partial' ? [
        'Set KLAVIYO_DEFAULT_LIST_ID environment variable',
        'Optionally set other list IDs (KLAVIYO_WINBACK_LIST_ID, KLAVIYO_REPEAT_LIST_ID, KLAVIYO_NEWSLETTER_LIST_ID)'
      ] : [
        'Configuration is complete!',
        'You can optionally set additional list IDs for advanced segmentation'
      ]
    },
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };

  res.json(diagnostics);
});

// Add Klaviyo test endpoint
app.get('/klaviyo/test', async (req, res) => {
  try {
    if (!klaviyoClient || !klaviyoClient.isPartiallyReady()) {
      return res.status(400).json({
        success: false,
        message: 'Klaviyo client is not ready for testing',
        issues: {
          api_key: !process.env.KLAVIYO_PRIVATE_API_KEY ? 'Missing KLAVIYO_PRIVATE_API_KEY' : 'OK',
          default_list: !process.env.KLAVIYO_DEFAULT_LIST_ID ? 'Missing KLAVIYO_DEFAULT_LIST_ID (optional for basic testing)' : 'OK'
        },
        configuration_status: klaviyoClient.getConfigurationStatus(),
        timestamp: new Date().toISOString()
      });
    }

    // Test basic API connectivity
    const testResult = await klaviyoClient.getLists();
    
    return res.json({
      success: true,
      message: 'Klaviyo integration is working correctly',
      data: {
        lists_fetched: testResult.length,
        configured_lists: klaviyoClient.getConfiguredLists(),
        api_connectivity: 'OK',
        configuration_status: klaviyoClient.getConfigurationStatus(),
        available_lists: testResult.map(list => ({
          id: list.id,
          name: list.attributes?.name || 'Unknown',
          created: list.attributes?.created || 'Unknown'
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Klaviyo test failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Klaviyo test failed',
      error: error.message,
      configuration_status: klaviyoClient ? klaviyoClient.getConfigurationStatus() : null,
      timestamp: new Date().toISOString()
    });
  }
});

// Add Klaviyo setup guide endpoint
app.get('/klaviyo/setup', (req, res) => {
  const configStatus = klaviyoClient.getConfigurationStatus();
  
  const setupGuide = {
    current_status: configStatus,
    setup_steps: [
      {
        step: 1,
        title: 'Get your Klaviyo API Keys',
        description: 'Sign in to your Klaviyo account and get your API keys',
        instructions: [
          'Go to https://www.klaviyo.com/account#api-keys-tab',
          'Create a new Private API Key with the following permissions:',
          '  - Read/Write Lists',
          '  - Read/Write Profiles',
          '  - Read/Write Events',
          '  - Read/Write Segments',
          'Copy the Private API Key (starts with "pk_")',
          'Copy the Public API Key (starts with "pk_" but shorter)'
        ],
        status: configStatus.api_key === 'configured' ? 'completed' : 'pending'
      },
      {
        step: 2,
        title: 'Set Environment Variables',
        description: 'Add the API keys to your environment variables',
        instructions: [
          'In your .env file, add:',
          'KLAVIYO_PRIVATE_API_KEY=your_private_key_here',
          'KLAVIYO_PUBLIC_API_KEY=your_public_key_here',
          '',
          'For Railway deployment, add these in your Railway environment variables:',
          'https://railway.app/project/your-project/settings/environment'
        ],
        status: configStatus.api_key === 'configured' ? 'completed' : 'pending'
      },
      {
        step: 3,
        title: 'Create and Configure Lists',
        description: 'Set up your Klaviyo lists for customer segmentation',
        instructions: [
          'In your Klaviyo account, create the following lists:',
          '  - Default List (for general subscribers)',
          '  - Winback List (for re-engagement campaigns)',
          '  - Repeat Customer List (for loyal customers)',
          '  - Newsletter List (for newsletter subscribers)',
          '',
          'Copy the List IDs from each list (found in the list URL)',
          'Add these to your environment variables:',
          'KLAVIYO_DEFAULT_LIST_ID=your_default_list_id',
          'KLAVIYO_WINBACK_LIST_ID=your_winback_list_id',
          'KLAVIYO_REPEAT_LIST_ID=your_repeat_list_id',
          'KLAVIYO_NEWSLETTER_LIST_ID=your_newsletter_list_id'
        ],
        status: configStatus.default_list === 'configured' ? 'completed' : 'pending'
      },
      {
        step: 4,
        title: 'Test Your Integration',
        description: 'Verify everything is working correctly',
        instructions: [
          'Visit /klaviyo/test to test your API connectivity',
          'Visit /klaviyo/status to check your configuration status',
          'Test subscribing/unsubscribing users through your admin panel'
        ],
        status: configStatus.configuration_level === 'complete' ? 'completed' : 'pending'
      }
    ],
    environment_variables: {
      required: {
        KLAVIYO_PRIVATE_API_KEY: {
          description: 'Your Klaviyo Private API Key (starts with "pk_")',
          status: process.env.KLAVIYO_PRIVATE_API_KEY ? 'Set' : 'Missing',
          example: 'pk_1234567890abcdef...'
        },
        KLAVIYO_PUBLIC_API_KEY: {
          description: 'Your Klaviyo Public API Key (shorter, starts with "pk_")',
          status: process.env.KLAVIYO_PUBLIC_API_KEY ? 'Set' : 'Missing',
          example: 'pk_abc123'
        }
      },
      optional: {
        KLAVIYO_DEFAULT_LIST_ID: {
          description: 'Default list ID for general subscribers',
          status: process.env.KLAVIYO_DEFAULT_LIST_ID ? 'Set' : 'Missing',
          example: 'ABC123'
        },
        KLAVIYO_WINBACK_LIST_ID: {
          description: 'List ID for winback/re-engagement campaigns',
          status: process.env.KLAVIYO_WINBACK_LIST_ID ? 'Set' : 'Missing',
          example: 'DEF456'
        },
        KLAVIYO_REPEAT_LIST_ID: {
          description: 'List ID for repeat/loyal customers',
          status: process.env.KLAVIYO_REPEAT_LIST_ID ? 'Set' : 'Missing',
          example: 'GHI789'
        },
        KLAVIYO_NEWSLETTER_LIST_ID: {
          description: 'List ID for newsletter subscribers',
          status: process.env.KLAVIYO_NEWSLETTER_LIST_ID ? 'Set' : 'Missing',
          example: 'JKL012'
        }
      }
    },
    help_links: {
      klaviyo_api_keys: 'https://www.klaviyo.com/account#api-keys-tab',
      klaviyo_lists: 'https://www.klaviyo.com/lists',
      klaviyo_docs: 'https://developers.klaviyo.com/en/docs',
      railway_env: 'https://railway.app/project/your-project/settings/environment'
    },
    timestamp: new Date().toISOString()
  };

  res.json(setupGuide);
});

// Add Resend audience API endpoint
app.post('/api/add-to-resend-audience', express.json(), async (req, res) => {
  try {
    const { email, firstName, lastName, audienceId } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    console.log('📧 Adding contact to Resend audience:', { email, firstName, lastName, audienceId });

    // Import the email notifications module
    const emailNotifications = require('./email-notifications');

    // Add contact to Resend audience
    const result = await emailNotifications.addContactToResendAudience(
      email,
      firstName || '',
      lastName || '',
      audienceId || null
    );

    if (result.success) {
      console.log('✅ Contact added to Resend audience successfully:', result);
      return res.status(200).json({
        success: true,
        message: 'Contact added to Resend audience successfully',
        data: result
      });
    } else {
      console.error('❌ Failed to add contact to Resend audience:', result);
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to add contact to Resend audience',
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Error in add-to-resend-audience endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Add bulk sync all users to Resend audience endpoint (admin only)
app.post('/api/bulk-sync-users-to-resend', express.json(), async (req, res) => {
  try {
    // This is an admin-only endpoint - in a real app you'd want proper auth
    const { adminKey, audienceId } = req.body;
    
    // Simple admin key check - replace with proper auth in production
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    console.log('🔄 Starting bulk sync of all users to Resend audience...');

    // Import the email notifications module
    const emailNotifications = require('./email-notifications');

    // Bulk sync all users to Resend audience
    const result = await emailNotifications.bulkSyncUsersToResendAudience(audienceId || null);

    if (result.success) {
      console.log('✅ Bulk sync completed successfully:', result);
      return res.status(200).json({
        success: true,
        message: 'Bulk sync completed successfully',
        data: result
      });
    } else {
      console.error('❌ Bulk sync failed:', result);
      return res.status(400).json({
        success: false,
        message: result.message || 'Bulk sync failed',
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Error in bulk-sync-users-to-resend endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Add Sentry error handler middleware (temporarily commented out)
// app.use(Sentry.Handlers.errorHandler());

// Add custom error handler for non-Sentry errors
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  
  // Capture error in Sentry
  Sentry.captureException(error);
  
  // Send error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});



// 1. Schema
const typeDefs = gql`
  type Query {
    hello: String
    
    # Customer order queries
    getUserOrders(userId: ID!): [CustomerOrder]
    getOrderById(id: ID!): CustomerOrder
    getOrderByNumber(orderNumber: String!): CustomerOrder
    claimGuestOrders(userId: ID!, email: String!): ClaimResult
    getAllOrders: [CustomerOrder]
    getAllCustomers: [Customer!]!
    getAllUsersWithOrderStats: [Customer!]!
    getAnalyticsData(timeRange: String): AnalyticsData
    
    # Review queries
    getProductReviews(productId: String!, limit: Int, offset: Int): [Review!]!
    getProductReviewStats(productId: String!): ReviewStats!
    canUserReviewProduct(userId: ID!, productId: String!): Boolean!
    getUserReviews(userId: ID!): [Review!]!
    
    # Order Review Queries
    getOrderReview(orderId: ID!): Review
    canUserReviewOrder(userId: ID!, orderId: ID!): Boolean!
    
    # Discount queries
    validateDiscountCode(code: String!, orderAmount: Float!, sessionId: String): DiscountValidation!
    getAllDiscountCodes: [DiscountCode!]!
    getDiscountCodeStats(codeId: ID!): DiscountCodeStats!
    

    
    # User queries
    getAllUsers: [User!]!
    getUserProfile(userId: ID!): UserProfile
    
    # Creator queries
    getCreatorByUserId(userId: ID!): Creator
    getCreatorSalesStats(creatorId: ID!): CreatorSalesStats
    
    # Admin wholesale queries
    getPendingWholesaleApplications: [UserProfile!]!
    getAllWholesaleCustomers: [UserProfile!]!
    getWholesaleAnalytics: WholesaleAnalytics!
    getWholesaleTopPerformers(limit: Int): [WholesalePerformer!]!
    
    # Wholesale client management queries
    getWholesaleClients(userId: ID!): [WholesaleClient!]!
    getClientOrders(clientId: ID!): [CustomerOrder!]!
    
    # Blog queries
    blog_posts(limit: Int, offset: Int, where: BlogPostWhere, order_by: BlogPostOrderBy): [BlogPost!]!
    blog_posts_aggregate(where: BlogPostWhere): BlogPostAggregate!
    blog_posts_by_pk(id: ID!): BlogPost
    blog_categories(order_by: BlogCategoryOrderBy): [BlogCategory!]!
    
    # Klaviyo queries
    getKlaviyoSubscriptionStatus(email: String!, listId: String): KlaviyoSubscriptionStatus!
    getKlaviyoLists: [KlaviyoList!]!
    getKlaviyoConfiguredLists: KlaviyoConfiguredListsResult!
    getKlaviyoProfiles(limit: Int, cursor: String): KlaviyoProfilesResult!
    getKlaviyoProfilesFromAllLists(limit: Int): KlaviyoAllListsProfilesResult!
    getAllKlaviyoProfiles(limit: Int): KlaviyoAllProfilesResult!
    
    # Sitewide Alert queries
    getAllSitewideAlerts: [SitewideAlert!]!
    
    # Shared cart queries
    getSharedCart(shareId: String!): SharedCartResult!
    getAllSharedCarts(offset: Int, limit: Int): AllSharedCartsResult!
    
    # Credit queries
    getUserCreditBalance(userId: ID!): CreditBalance!
    getUserCreditHistory(userId: ID!, limit: Int): [Credit!]!
    getUnreadCreditNotifications(userId: ID!): [CreditNotification!]!
    validateCreditApplication(userId: ID!, orderSubtotal: Float!, requestedCredits: Float!): CreditValidation!
    getAllCreditTransactions(limit: Int, offset: Int): AllCreditTransactionsResult!
  }

  type Mutation {
    # Customer order mutations
    createCustomerOrder(input: CustomerOrderInput!): CustomerOrder
    updateOrderStatus(orderId: ID!, statusUpdate: OrderStatusInput!): CustomerOrder
    updateOrderShippingAddress(orderId: ID!, shippingAddress: ShippingAddressInput!): OrderShippingAddressResult
    markOrderAsDelivered(orderId: ID!): CustomerOrder
    markOrderReadyForPickup(orderId: ID!): CustomerOrder
    markOrderPickedUp(orderId: ID!): CustomerOrder
    claimGuestOrders(userId: ID!, email: String!): ClaimResult
    
    # Proof mutations
    addOrderProof(orderId: ID!, proofData: OrderProofInput!): CustomerOrder
    updateProofStatus(orderId: ID!, proofId: ID!, status: String!, customerNotes: String): CustomerOrder
    replaceProofFile(orderId: ID!, proofId: ID!, newProofData: OrderProofInput!): CustomerOrder
    updateProofFileByCustomer(orderId: ID!, proofId: ID!, newFileUrl: String!, originalFileName: String): CustomerOrder
    updateOrderFileByCustomer(orderId: ID!, newFileUrl: String!, originalFileName: String): CustomerOrder
    removeProof(orderId: ID!, proofId: ID!): CustomerOrder
    
    # Review mutations
    createReview(input: CreateReviewInput!): Review!
    updateReview(reviewId: ID!, input: UpdateReviewInput!): Review!
    deleteReview(reviewId: ID!): Boolean!
    voteOnReview(reviewId: ID!, isHelpful: Boolean!): Review!
    
    # Order Review Mutations
    createOrderReview(input: CreateOrderReviewInput!): Review!
    updateOrderReview(reviewId: ID!, input: UpdateOrderReviewInput!): Review!
    deleteOrderReview(reviewId: ID!): Boolean!
    
    # EasyPost tracking mutations
    createEasyPostTracker(trackingCode: String!, orderId: ID!, carrier: String): TrackingResult
    refreshOrderTracking(orderId: ID!): TrackingResult
    refreshAllActiveTracking: BatchTrackingResult
    addProofNotes(orderId: ID!, proofId: ID!, adminNotes: String, customerNotes: String): CustomerOrder
    approveProof(orderId: ID!, proofId: ID!, adminNotes: String): CustomerOrder
    requestProofChanges(orderId: ID!, proofId: ID!, adminNotes: String!): CustomerOrder
    sendProofs(orderId: ID!): CustomerOrder
    
    # Stripe mutations
    createStripeCheckoutSession(input: StripeCheckoutInput!): StripeCheckoutResult
    processStripeCartOrder(input: CartOrderInput!): StripeOrderProcessResult
    createAdditionalPaymentLink(input: AdditionalPaymentInput!): AdditionalPaymentResponse
    
    # EasyPost shipping mutations
    createEasyPostShipment(orderId: ID!, packageDimensions: PackageDimensionsInput): EasyPostShipmentResult
    buyEasyPostLabel(shipmentId: String!, rateId: String!, orderId: ID!, insurance: String): EasyPostLabelResult
    trackEasyPostShipment(trackingCode: String!): EasyPostTrackingResult
    getEasyPostLabel(trackingCode: String!): EasyPostLabelUrlResult
    
    # Manual tracking update mutation
    updateOrderTracking(orderId: ID!): CustomerOrder
    
    # Discount mutations
    createDiscountCode(input: CreateDiscountCodeInput!): DiscountCode!
    updateDiscountCode(id: ID!, input: UpdateDiscountCodeInput!): DiscountCode!
    deleteDiscountCode(id: ID!): Boolean!
    applyDiscountToCheckout(code: String!, orderAmount: Float!, hasReorderItems: Boolean): DiscountValidation!
    removeDiscountSession(sessionId: String): MutationResult!
    


    # Shared cart mutations
    createSharedCart(input: CreateSharedCartInput!): SharedCartResult!
    
    # User Profile mutations
    updateUserProfileNames(userId: ID!, firstName: String!, lastName: String!): UserProfileResult!
    createUserProfile(userId: ID!, firstName: String, lastName: String, phoneNumber: String, companyWebsite: String): UserProfileResult!
    createWholesaleUserProfile(userId: ID!, input: WholesaleUserProfileInput!): UserProfileResult!
    updateUserProfilePhoto(userId: ID!, photoUrl: String!, photoPublicId: String): UserProfileResult!
    updateUserProfileBanner(userId: ID!, bannerUrl: String, bannerPublicId: String, bannerTemplate: String, bannerTemplateId: Int): UserProfileResult!
    updateUserProfileCompany(userId: ID!, companyName: String!): UserProfileResult!
    updateUserProfileComprehensive(userId: ID!, input: UserProfileInput!): UserProfileResult!
    updateWholesaleStatus(userId: ID!, isWholesaleCustomer: Boolean!, wholesaleCreditRate: Float): UserProfileResult!
    
    # Admin wholesale mutations
    approveWholesaleApplication(userId: ID!, approvedBy: ID!): WholesaleApprovalResult!
    rejectWholesaleApplication(userId: ID!, rejectedBy: ID!): WholesaleApprovalResult!
    revokeWholesaleAccess(userId: ID!, revokedBy: ID!): WholesaleApprovalResult!
    updateWholesaleCustomer(userId: ID!, input: UpdateWholesaleCustomerInput!): WholesaleApprovalResult!
    
    # Tax exemption mutations
    updateTaxExemption(userId: ID!, input: TaxExemptionInput!): UserProfileResult!
    
    # Creator management mutations
    updateCreatorStatus(userId: ID!, isCreator: Boolean!): CreatorResult!
    
    # Wholesale client management mutations
    createWholesaleClient(input: CreateWholesaleClientInput!): WholesaleClientResult!
    updateWholesaleClient(clientId: ID!, input: UpdateWholesaleClientInput!): WholesaleClientResult!
    deleteWholesaleClient(clientId: ID!): WholesaleClientResult!
    
    # Order assignment mutations
    assignOrderToClient(orderId: ID!, clientId: ID!): OrderAssignmentResult!
    unassignOrderFromClient(orderId: ID!): OrderAssignmentResult!
    
    # Blog mutations
    insert_blog_posts_one(object: BlogPostInput!): BlogPost!
    update_blog_posts_by_pk(pk_columns: BlogPostPkInput!, _set: BlogPostSetInput!): BlogPost
    delete_blog_posts_by_pk(id: ID!): BlogPost
    increment_blog_views(args: IncrementBlogViewsInput!): IncrementBlogViewsResult!
    insert_blog_categories_one(object: BlogCategoryInput!): BlogCategory!
    update_blog_categories_by_pk(pk_columns: BlogCategoryPkInput!, _set: BlogCategorySetInput!): BlogCategory
    delete_blog_categories_by_pk(id: ID!): BlogCategory
    
    # Klaviyo mutations
    subscribeToKlaviyo(email: String!, listId: String): KlaviyoMutationResult!
    unsubscribeFromKlaviyo(email: String!, listId: String): KlaviyoMutationResult!
    syncCustomerToKlaviyo(customerData: KlaviyoCustomerInput!): KlaviyoMutationResult!
    bulkSyncCustomersToKlaviyo(customers: [KlaviyoCustomerInput!]!): KlaviyoBulkSyncResult!
    updateCustomerSubscription(email: String!, subscribed: Boolean!): CustomerSubscriptionResult!
    trackKlaviyoEvent(email: String!, eventName: String!, properties: JSON): KlaviyoMutationResult!
    syncAllCustomersToKlaviyo: KlaviyoBulkSyncResult!
    
    # Sitewide Alert mutations
    createSitewideAlert(input: CreateSitewideAlertInput!): SitewideAlert!
    updateSitewideAlert(id: ID!, input: UpdateSitewideAlertInput!): SitewideAlert!
    deleteSitewideAlert(id: ID!): Boolean!
    toggleSitewideAlert(id: ID!, isActive: Boolean!): SitewideAlert!
    
    # Mutation to update order item files
    updateOrderItemFiles(orderId: ID!, itemId: ID!, customFiles: [String!]!): CustomerOrder
    
    # User management mutations
    deleteUsers(userIds: [String!]!): DeleteUsersResult!
    
    # Credit mutations
    addCredits(userId: ID!, amount: Float!, reason: String!, expiresAt: String): CreditTransactionResult!
    addCreditsToAllUsers(amount: Float!, reason: String!): AddCreditsToAllUsersResult!
    applyCreditsToOrder(userId: ID!, orderId: ID!, amount: Float!): CreditTransactionResult!
    reverseCredits(transactionId: ID!, reason: String!): CreditTransactionResult!
    markCreditNotificationAsRead(notificationId: ID!): Boolean!
    fixExistingEarnedCredits: CreditFixResult!
  }

  type Customer {
    id: ID!
    email: String!
    firstName: String
    lastName: String
    city: String
    state: String
    country: String
    totalOrders: Int!
    totalSpent: Float!
    averageOrderValue: Float!
    marketingOptIn: Boolean!
    lastOrderDate: String
    firstOrderDate: String
    orders: [CustomerOrder!]!
  }

  # Sitewide Alert types
  type SitewideAlert {
    id: ID!
    title: String!
    message: String!
    backgroundColor: String
    textColor: String
    linkUrl: String
    linkText: String
    isActive: Boolean!
    startDate: String
    endDate: String
    createdAt: String!
    updatedAt: String!
    createdBy: String
  }

  input CreateSitewideAlertInput {
    title: String!
    message: String!
    backgroundColor: String
    textColor: String
    linkUrl: String
    linkText: String
    isActive: Boolean
    startDate: String
    endDate: String
  }

  input UpdateSitewideAlertInput {
    title: String
    message: String
    backgroundColor: String
    textColor: String
    linkUrl: String
    linkText: String
    isActive: Boolean
    startDate: String
    endDate: String
  }

  type User {
    id: ID!
    email: String!
    firstName: String
    lastName: String
    company: String
    createdAt: String!
    lastSignIn: String
  }

  type UserProfile {
    id: ID!
    userId: ID!
    firstName: String
    lastName: String
    email: String
    displayName: String
    bio: String
    phoneNumber: String
    companyWebsite: String
    profilePhotoUrl: String
    bannerImageUrl: String
    profilePhotoPublicId: String
    bannerImagePublicId: String
    bannerTemplate: String
    bannerTemplateId: Int
    companyName: String
    isWholesaleCustomer: Boolean
    wholesaleMonthlyCustomers: String
    wholesaleOrderingFor: String
    wholesaleFitExplanation: String
    wholesaleStatus: String
    wholesaleApprovedAt: String
    wholesaleApprovedBy: String
    wholesaleCreditRate: Float
    isTaxExempt: Boolean
    taxExemptId: String
    taxExemptReason: String
    taxExemptExpiresAt: String
    taxExemptUpdatedAt: String
    taxExemptUpdatedBy: String
    createdAt: String!
    updatedAt: String!
  }

  type UserProfileResult {
    success: Boolean!
    message: String
    userProfile: UserProfile
  }

  # Creator Types
  type Creator {
    id: ID!
    userId: ID!
    creatorName: String!
    email: String!
    isActive: Boolean!
    totalProducts: Int!
    createdAt: String!
    updatedAt: String!
  }

  type CreatorResult {
    success: Boolean!
    message: String
    creator: Creator
  }

  type SoldProduct {
    id: ID!
    name: String!
    imageUrl: String
    totalSold: Int!
    totalRevenue: Float!
    price: Float!
  }

  type RecentSale {
    id: ID!
    productName: String!
    quantity: Int!
    price: Float!
    soldAt: String!
    orderNumber: String!
  }

  type CreatorSalesStats {
    totalSales: Int!
    totalRevenue: Float!
    totalProducts: Int!
    soldProducts: [SoldProduct!]!
    recentSales: [RecentSale!]!
  }

  type WholesaleApprovalResult {
    success: Boolean!
    message: String
    userProfile: UserProfile
  }

  # Wholesale Analytics Types
  type WholesaleAnalytics {
    totalWholesaleCustomers: Int!
    totalWholesaleRevenue: Float!
    averageOrderValue: Float!
    totalOrders: Int!
    monthlyRevenue: Float!
    monthlyOrders: Int!
    growthRate: Float!
    creditRateDistribution: [CreditRateDistribution!]!
  }

  type CreditRateDistribution {
    creditRate: Float!
    customerCount: Int!
    percentage: Float!
  }

  type WholesalePerformer {
    id: ID!
    userId: ID!
    firstName: String
    lastName: String
    companyName: String
    totalOrders: Int!
    totalRevenue: Float!
    averageOrderValue: Float!
    creditRate: Float!
    lastOrderDate: String
    monthlyRevenue: Float!
  }

  input UpdateWholesaleCustomerInput {
    firstName: String
    lastName: String
    companyName: String
    wholesaleMonthlyCustomers: String
    wholesaleOrderingFor: String
    wholesaleFitExplanation: String
    wholesaleCreditRate: Float
  }

  # Wholesale Client Types
  type WholesaleClient {
    id: ID!
    wholesaleUserId: ID!
    clientName: String!
    clientEmail: String
    clientPhone: String
    clientCompany: String
    clientAddress: String
    notes: String
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
    orderCount: Int!
    totalSpent: Float!
  }

  type WholesaleClientResult {
    success: Boolean!
    message: String
    client: WholesaleClient
  }

  type OrderAssignmentResult {
    success: Boolean!
    message: String
    order: OrderAssignmentOrder
  }

  type OrderAssignmentOrder {
    id: ID!
    orderNumber: String!
    wholesaleClientId: ID
  }

  input CreateWholesaleClientInput {
    clientName: String!
    clientEmail: String
    clientPhone: String
    clientCompany: String
    clientAddress: String
    notes: String
  }

  input UpdateWholesaleClientInput {
    clientName: String
    clientEmail: String
    clientPhone: String
    clientCompany: String
    clientAddress: String
    notes: String
    isActive: Boolean
  }

  input UserProfileInput {
    firstName: String
    lastName: String
    companyName: String
    profilePhotoUrl: String
    profilePhotoPublicId: String
    bannerImageUrl: String
    bannerImagePublicId: String
    bio: String
    isWholesaleCustomer: Boolean
  }

  input WholesaleUserProfileInput {
    firstName: String!
    lastName: String!
    phoneNumber: String!
    companyWebsite: String!
    companyName: String!
    wholesaleMonthlyCustomers: String!
    wholesaleOrderingFor: String!
    wholesaleFitExplanation: String!
    signupCreditAmount: Float
  }

  input TaxExemptionInput {
    isTaxExempt: Boolean!
    taxExemptId: String
    taxExemptReason: String
    taxExemptExpiresAt: String
  }

  type Address {
    first_name: String
    last_name: String
    company: String
    address1: String
    address2: String
    city: String
    province: String
    country: String
    zip: String
    phone: String
  }

  type DeleteResult {
    success: Boolean!
    message: String
  }

  type DeleteUsersResult {
    success: Boolean!
    deletedCount: Int!
    errors: [UserDeletionError!]!
  }

  type UserDeletionError {
    userId: String!
    error: String!
  }

  # Review Types
  type Review {
    id: ID!
    userId: ID!
    productId: String!
    productCategory: String!
    rating: Int!
    title: String
    comment: String
    isVerifiedPurchase: Boolean!
    orderId: ID
    helpfulVotes: Int!
    totalVotes: Int!
    status: String!
    createdAt: String!
    updatedAt: String!
    userEmail: String
    userFirstName: String
    userLastName: String
    userDisplayName: String
  }

  type ReviewStats {
    totalReviews: Int!
    averageRating: Float!
    rating5Count: Int!
    rating4Count: Int!
    rating3Count: Int!
    rating2Count: Int!
    rating1Count: Int!
  }

  # Customer Order Types
  type CustomerOrder {
    id: ID!
    userId: ID
    guestEmail: String
    stripePaymentIntentId: String
    stripeCheckoutSessionId: String
    orderNumber: String
    orderStatus: String
    fulfillmentStatus: String
    financialStatus: String
    trackingNumber: String
    trackingCompany: String
    trackingUrl: String
    subtotalPrice: Float
    totalTax: Float
    totalPrice: Float
    currency: String
    customerFirstName: String
    customerLastName: String
    customerEmail: String
    customerPhone: String
    shippingAddress: JSON
    billingAddress: JSON
    shipping_method: String
    is_express_shipping: Boolean
    is_rush_order: Boolean
    is_blind_shipment: Boolean
    orderTags: [String]
    orderNote: String
    orderCreatedAt: String
    orderUpdatedAt: String
    createdAt: String
    updatedAt: String
    items: [OrderItem]
    proofs: [OrderProof]
    proof_status: String
    proof_sent_at: String
    proof_link: String
    discountCode: String
    discountAmount: Float
    creditsApplied: Float
    wholesaleClientId: ID
  }

  type OrderProof {
    id: ID!
    orderId: ID!
    orderItemId: ID
    proofUrl: String!
    proofPublicId: String!
    proofTitle: String
    uploadedAt: String
    uploadedBy: String
    status: String
    customerNotes: String
    adminNotes: String
    cutLines: String
    replaced: Boolean
    replacedAt: String
    originalFileName: String
  }

  type OrderItem {
    id: ID!
    customerOrderId: ID!
    stripeLineItemId: String
    productId: String!
    productName: String!
    productCategory: String
    sku: String
    quantity: Int!
    unitPrice: Float!
    totalPrice: Float!
    calculatorSelections: JSON!
    customFiles: [String]
    customerNotes: String
    instagramHandle: String
    instagramOptIn: Boolean
    fulfillmentStatus: String
    createdAt: String
    updatedAt: String
    customerReplacementFile: String
    customerReplacementFileName: String
    customerReplacementAt: String
    is_additional_payment: Boolean
  }

  type ClaimResult {
    success: Boolean!
    claimedOrdersCount: Int!
    message: String
  }

  type TrackingResult {
    success: Boolean!
    message: String!
    trackingCode: String
    status: String
    carrier: String
    publicUrl: String
    estDeliveryDate: String
  }

  type BatchTrackingResult {
    success: Boolean!
    message: String!
    processedCount: Int!
    errors: [String!]
  }

  scalar JSON

  # Klaviyo Types
  type KlaviyoSubscriptionStatus {
    isSubscribed: Boolean!
    profileId: String
    error: String
  }

  type KlaviyoList {
    id: ID!
    name: String!
    created: String
    updated: String
  }

  type KlaviyoConfiguredList {
    id: String!
    name: String!
    type: String!
    configured: Boolean!
  }

  type KlaviyoConfiguredListsResult {
    success: Boolean!
    lists: [KlaviyoConfiguredList!]!
    error: String
  }

  type KlaviyoProfile {
    id: ID!
    email: String!
    firstName: String
    lastName: String
    phone: String
    city: String
    state: String
    country: String
    totalOrders: Int!
    totalSpent: Float!
    averageOrderValue: Float!
    firstOrderDate: String
    lastOrderDate: String
    createdAt: String
    updatedAt: String
    listMembership: [String!]
    sources: [String!]
  }

  type KlaviyoProfilesResult {
    success: Boolean!
    profiles: [KlaviyoProfile!]!
    nextCursor: String
    total: Int!
    error: String
  }

  type KlaviyoListSummary {
    listType: String!
    listId: String!
    count: Int!
  }

  type KlaviyoAllListsProfilesResult {
    success: Boolean!
    profiles: [KlaviyoProfile!]
    totalProfiles: Int!
    uniqueProfiles: Int!
    profilesByList: [KlaviyoListSummary!]!
    errors: [KlaviyoError!]!
  }

  type KlaviyoError {
    listType: String
    listId: String
    error: String!
  }

  type KlaviyoSourceSummary {
    sourceName: String!
    sourceId: String!
    sourceType: String!
    count: Int!
  }

  type KlaviyoAllProfilesResult {
    success: Boolean!
    profiles: [KlaviyoProfile!]
    totalProfiles: Int!
    uniqueProfiles: Int!
    profilesBySource: [KlaviyoSourceSummary!]!
    errors: [KlaviyoError!]!
  }

  type KlaviyoMutationResult {
    success: Boolean!
    message: String
    profileId: String
    error: String
  }

  type KlaviyoBulkSyncResult {
    success: Int!
    failed: Int!
    total: Int!
    errors: [KlaviyoSyncError!]!
  }

  type KlaviyoSyncError {
    email: String!
    error: String!
  }

  type CustomerSubscriptionResult {
    success: Boolean!
    message: String
    customer: Customer
  }

  # Credit System Types
  type Credit {
    id: ID!
    userId: ID!
    amount: Float!
    balance: Float!
    reason: String
    transactionType: String
    orderId: ID
    createdAt: String
    createdBy: ID
    expiresAt: String
    metadata: JSON
    reversedAt: String
    reversalReason: String
  }

  type CreditBalance {
    balance: Float!
    transactionCount: Int
    lastTransactionDate: String
    transactions: [Credit!]
  }

  type CreditNotification {
    id: ID!
    userId: ID!
    creditId: ID
    type: String!
    title: String!
    message: String!
    read: Boolean!
    createdAt: String!
  }

  type CreditValidation {
    valid: Boolean!
    message: String!
    maxApplicable: Float!
  }

  type CreditTransactionResult {
    success: Boolean!
    message: String
    credit: Credit
    newBalance: Float
  }

  type CreditFixResult {
    success: Boolean!
    fixed: Int!
    message: String
    error: String
  }

  type AddCreditsToAllUsersResult {
    success: Boolean!
    usersUpdated: Int!
    message: String
    error: String
  }

  type AllCreditTransactionsResult {
    transactions: [CreditTransaction!]!
    totalCount: Int!
  }

  type CreditTransaction {
    id: ID!
    userId: ID!
    userEmail: String!
    userName: String!
    amount: Float!
    balance: Float!
    reason: String
    transactionType: String!
    orderId: ID
    orderNumber: String
    createdAt: String!
    createdBy: ID
    expiresAt: String
  }

  input KlaviyoCustomerInput {
    email: String!
    firstName: String
    lastName: String
    phone: String
    city: String
    state: String
    country: String
    totalOrders: Int
    totalSpent: Float
    averageOrderValue: Float
    firstOrderDate: String
    lastOrderDate: String
    marketingOptIn: Boolean!
  }

  input CustomerInput {
    email: String
    first_name: String
    last_name: String
    phone: String
  }

  input AddressInput {
    first_name: String
    last_name: String
    company: String
    address1: String
    address2: String
    city: String
    province: String
    country: String
    zip: String
    phone: String
  }

  # Customer Order Input Types
  input CustomerOrderInput {
    userId: ID
    guestEmail: String
    stripePaymentIntentId: String
    stripeCheckoutSessionId: String
    orderStatus: String
    fulfillmentStatus: String
    financialStatus: String
    subtotalPrice: Float
    totalTax: Float
    totalPrice: Float
    currency: String
    customerFirstName: String
    customerLastName: String
    customerEmail: String
    customerPhone: String
    shippingAddress: JSON
    billingAddress: JSON
    orderTags: [String]
    orderNote: String
    orderCreatedAt: String
    orderUpdatedAt: String
  }

  input CartOrderInput {
    userId: ID
    guestEmail: String
    cartItems: [CartItemInput!]!
    customerInfo: CustomerInfoInput!
    shippingAddress: AddressInput!
    billingAddress: AddressInput
    orderNote: String
    discountCode: String
    discountAmount: Float
    creditsToApply: Float
    isBlindShipment: Boolean
  }

  input CartItemInput {
    productId: String!
    productName: String!
    productCategory: String
    sku: String
    quantity: Int!
    unitPrice: Float!
    totalPrice: Float
    calculatorSelections: JSON!
    customization: JSON
    customFiles: [String]
    customerNotes: String
    instagramHandle: String
    instagramOptIn: Boolean
  }

  input AdditionalPaymentInput {
    orderId: ID!
    additionalItems: [CartItemInput!]!
    customerEmail: String!
    orderNote: String
  }

  type AdditionalPaymentResponse {
    success: Boolean!
    sessionId: String
    checkoutUrl: String
    message: String
    errors: [String]
  }

  input CustomerInfoInput {
    firstName: String!
    lastName: String!
    email: String!
    phone: String
  }

  input OrderStatusInput {
    orderStatus: String
    fulfillmentStatus: String
    financialStatus: String
    trackingNumber: String
    trackingCompany: String
    trackingUrl: String
    proof_status: String
  }

  input ShippingAddressInput {
    first_name: String
    last_name: String
    company: String
    address1: String
    address2: String
    city: String
    state: String
    zip: String
    country: String
    phone: String
  }

  type OrderShippingAddressResult {
    success: Boolean!
    message: String!
    order: OrderInfo
  }

  type OrderInfo {
    id: ID!
    orderNumber: String
    customerFirstName: String
    customerLastName: String
    customerEmail: String
    shippingAddress: JSON
  }

  input PackageDimensionsInput {
    length: Float!
    width: Float!
    height: Float!
    weight: Float!
    _timestamp: Float  # Optional cache-busting field
  }

  # Stripe types
  type StripeCheckoutResult {
    success: Boolean!
    sessionId: String
    checkoutUrl: String
    totalAmount: Int
    message: String
    error: String
  }

  type StripeOrderProcessResult {
    success: Boolean!
    sessionId: String
    checkoutUrl: String
    customerOrder: CustomerOrder
    message: String
    errors: [String]
    creditsApplied: Float
    remainingCredits: Float
  }

  # EasyPost Types
  type EasyPostShipmentResult {
    success: Boolean!
    shipment: EasyPostShipment
    error: String
  }

  type EasyPostShipment {
    id: String!
    rates: [EasyPostRate!]!
    to_address: EasyPostAddress
    from_address: EasyPostAddress
    parcel: EasyPostParcel
    reference: String
  }

  type EasyPostRate {
    id: String!
    carrier: String!
    service: String!
    rate: String!
    currency: String!
    delivery_days: Int
    delivery_date: String
    delivery_date_guaranteed: Boolean
  }

  type EasyPostAddress {
    name: String
    company: String
    street1: String
    street2: String
    city: String
    state: String
    zip: String
    country: String
    phone: String
    email: String
  }

  type EasyPostParcel {
    length: Float
    width: Float
    height: Float
    weight: Float
  }

  type EasyPostLabelResult {
    success: Boolean!
    shipment: EasyPostPurchasedShipment
    error: String
  }

  type EasyPostPurchasedShipment {
    id: String!
    tracking_code: String
    postage_label: EasyPostLabel
    selected_rate: EasyPostRate
    tracker: EasyPostTracker
  }

  type EasyPostLabel {
    id: String!
    label_url: String!
    label_file_type: String
    label_size: String
  }

  type EasyPostTracker {
    id: String!
    tracking_code: String!
    carrier: String!
    public_url: String
    status: String
    est_delivery_date: String
  }

  type EasyPostTrackingResult {
    success: Boolean!
    tracker: EasyPostTracker
    error: String
  }

  type EasyPostLabelUrlResult {
    success: Boolean!
    labelUrl: String
    trackingCode: String
    carrier: String
    error: String
  }

  input StripeCheckoutInput {
    lineItems: [StripeLineItemInput!]!
    successUrl: String!
    cancelUrl: String!
    customerEmail: String
    userId: ID
    metadata: JSON
  }

  input StripeLineItemInput {
    name: String!
    description: String
    unitPrice: Float!
    quantity: Int!
    productId: String
    sku: String
    calculatorSelections: JSON
  }

  input OrderProofInput {
    orderItemId: ID
    proofUrl: String!
    proofPublicId: String!
    proofTitle: String
    adminNotes: String
    cutLines: String
  }

  # Review Input Types
  input CreateReviewInput {
    productId: String!
    productCategory: String!
    rating: Int!
    title: String
    comment: String
  }

  input UpdateReviewInput {
    rating: Int
    title: String
    comment: String
  }
  
  input CreateOrderReviewInput {
    orderId: ID!
    rating: Int!
    title: String
    comment: String
  }
  
  input UpdateOrderReviewInput {
    rating: Int
    title: String
    comment: String
  }

  type AnalyticsData {
    summary: SummaryMetrics
    dailySales: [DailySalesData]
    proofMetrics: ProofMetrics
    productPerformance: ProductPerformance
    customerAnalytics: [CustomerAnalytics]
  }

  type SummaryMetrics {
    totalRevenue: Float
    totalOrders: Int
    averageOrderValue: Float
    uniqueCustomers: Int
    revenueGrowth: Float
    conversionRate: Float
    dailyAverageRevenue: Float
    dailyAverageOrders: Float
    currentMonthProjection: Float
    avgOrderToDeliveryTime: Float
    avgProofApprovedToDeliveryTime: Float
    newCustomers: Int
    existingCustomers: Int
    newSignups: Int
  }

  type DailySalesData {
    date: String
    revenue: Float
    orders: Int
    averageOrderValue: Float
  }

  type ProofMetrics {
    avgProofSendTime: Float
    avgProofAcceptTime: Float
    proofApprovalRate: Float
    proofChangesRate: Float
    totalProofs: Int
    proofsApproved: Int
    proofsWithChanges: Int
  }

  type ProductPerformance {
    topProductsByRevenue: [ProductStats]
  }

  type ProductStats {
    name: String
    revenue: Float
    quantity: Int
    orders: Int
  }

  type CustomerAnalytics {
    id: ID!
    email: String!
    name: String
    lifetimeValue: Float!
    purchaseFrequency: Float
    totalOrders: Int!
    firstOrderDate: String
    lastOrderDate: String
    avgOrderValue: Float!
  }

  # Discount Types
  type DiscountCode {
    id: ID!
    code: String!
    description: String
    discountType: String!
    discountValue: Float!
    minimumOrderAmount: Float
    usageLimit: Int
    usageCount: Int!
    validFrom: String!
    validUntil: String
    active: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type DiscountValidation {
    valid: Boolean!
    discountCode: DiscountCode
    discountAmount: Float
    message: String
  }

  type DiscountCodeStats {
    totalUsage: Int!
    totalDiscountGiven: Float!
    averageOrderValue: Float!
    recentUsage: [DiscountUsage!]!
  }

  type DiscountUsage {
    id: ID!
    orderId: ID!
    userId: ID
    guestEmail: String
    usedAt: String!
    discountAmount: Float!
  }

  input CreateDiscountCodeInput {
    code: String!
    description: String
    discountType: String!
    discountValue: Float!
    minimumOrderAmount: Float
    usageLimit: Int
    validFrom: String
    validUntil: String
    active: Boolean
  }

  input UpdateDiscountCodeInput {
    description: String
    discountType: String
    discountValue: Float
    minimumOrderAmount: Float
    usageLimit: Int
    validFrom: String
    validUntil: String
    active: Boolean
  }
  
  type MutationResult {
    success: Boolean!
  }
  
  # Blog Types
  type BlogPost {
    id: ID!
    title: String!
    slug: String!
    excerpt: String
    content: String!
    featured_image: String
    author_id: ID
    author_name: String
    category: String
    tags: [String]
    meta_title: String
    meta_description: String
    og_image: String
    published: Boolean!
    published_at: String
    created_at: String!
    updated_at: String!
    views: Int!
    read_time_minutes: Int
  }
  
  type BlogCategory {
    id: ID!
    name: String!
    slug: String!
    description: String
    created_at: String!
  }
  
  type BlogPostAggregate {
    aggregate: BlogAggregateFields!
  }
  
  type BlogAggregateFields {
    count: Int!
  }
  
  input BlogPostWhere {
    published: BooleanComparisonExp
    category: StringComparisonExp
    slug: StringComparisonExp
    _and: [BlogPostWhere]
    _or: [BlogPostWhere]
  }
  
  input BlogPostOrderBy {
    created_at: OrderDirection
    published_at: OrderDirection
  }
  
  input BlogCategoryOrderBy {
    name: OrderDirection
  }
  
  input BooleanComparisonExp {
    _eq: Boolean
  }
  
  input StringComparisonExp {
    _eq: String
    _neq: String
    _ilike: String
    _contains: String
  }
  
  enum OrderDirection {
    asc
    desc
  }
  
  input BlogPostInput {
    title: String!
    slug: String!
    excerpt: String
    content: String!
    featured_image: String
    author_id: ID
    author_name: String
    category: String
    tags: [String]
    meta_title: String
    meta_description: String
    og_image: String
    published: Boolean
    published_at: String
    read_time_minutes: Int
  }
  
  input BlogPostPkInput {
    id: ID!
  }
  
  input BlogPostSetInput {
    title: String
    slug: String
    excerpt: String
    content: String
    featured_image: String
    author_id: ID
    author_name: String
    category: String
    tags: [String]
    meta_title: String
    meta_description: String
    og_image: String
    published: Boolean
    read_time_minutes: Int
  }
  
  input BlogCategoryInput {
    name: String!
    slug: String!
    description: String
  }
  
  input BlogCategoryPkInput {
    id: ID!
  }
  
  input BlogCategorySetInput {
    name: String
    slug: String
    description: String
  }
  
  input IncrementBlogViewsInput {
    post_slug: String!
  }
  
  type IncrementBlogViewsResult {
    success: Boolean!
  }
  
  # Shared Cart Types
  type SharedCart {
    id: ID!
    shareId: String!
    cartData: JSON!
    createdBy: String!
    createdAt: String!
    expiresAt: String
    accessCount: Int!
    lastAccessAt: String
  }
  
  type SharedCartResult {
    success: Boolean!
    sharedCart: SharedCart
    shareUrl: String
    error: String
  }
  
  type AllSharedCartsResult {
    success: Boolean!
    sharedCarts: [SharedCart!]!
    totalCount: Int!
    error: String
  }
  
  input CreateSharedCartInput {
    cartData: JSON!
    expiresAt: String
  }
`;

// 2. Resolvers
const resolvers = {
  // Field resolvers to map database snake_case to GraphQL camelCase
  CustomerOrder: {
    userId: (parent) => parent.user_id || parent.userId,
    guestEmail: (parent) => parent.guest_email || parent.guestEmail,
    stripePaymentIntentId: (parent) => parent.stripe_payment_intent_id || parent.stripePaymentIntentId,
    stripeCheckoutSessionId: (parent) => parent.stripe_session_id || parent.stripeCheckoutSessionId,
    orderNumber: (parent) => parent.order_number || parent.orderNumber,
    orderStatus: (parent) => parent.order_status || parent.orderStatus,
    fulfillmentStatus: (parent) => parent.fulfillment_status || parent.fulfillmentStatus,
    financialStatus: (parent) => parent.financial_status || parent.financialStatus,
    trackingNumber: (parent) => parent.tracking_number || parent.trackingNumber,
                trackingCompany: (parent) => parent.tracking_company || parent.trackingCompany,
      trackingUrl: (parent) => parent.tracking_url || parent.trackingUrl,
    subtotalPrice: (parent) => parent.subtotal_price || parent.subtotalPrice,
    totalTax: (parent) => parent.total_tax || parent.totalTax,
    totalPrice: (parent) => parent.total_price || parent.totalPrice,
    customerFirstName: (parent) => parent.customer_first_name || parent.customerFirstName,
    customerLastName: (parent) => parent.customer_last_name || parent.customerLastName,
    customerEmail: (parent) => parent.customer_email || parent.customerEmail,
    customerPhone: (parent) => parent.customer_phone || parent.customerPhone,
    shippingAddress: (parent) => parent.shipping_address || parent.shippingAddress,
    billingAddress: (parent) => parent.billing_address || parent.billingAddress,
    is_blind_shipment: (parent) => parent.is_blind_shipment || parent.isBlindShipment,
    orderTags: (parent) => parent.order_tags || parent.orderTags,
    orderNote: (parent) => parent.order_note || parent.orderNote,
    orderCreatedAt: (parent) => parent.order_created_at || parent.orderCreatedAt,
    orderUpdatedAt: (parent) => parent.order_updated_at || parent.orderUpdatedAt,
    createdAt: (parent) => parent.created_at || parent.createdAt,
    updatedAt: (parent) => parent.updated_at || parent.updatedAt,
    proofs: (parent) => parent.proofs || [],
    proof_status: (parent) => parent.proof_status || parent.proofStatus,
    proof_sent_at: (parent) => parent.proof_sent_at || parent.proofSentAt,
    proof_link: (parent) => parent.proof_link || parent.proofLink,
    discountCode: (parent) => parent.discount_code || parent.discountCode,
    discountAmount: (parent) => parent.discount_amount || parent.discountAmount,
    creditsApplied: (parent) => parent.credits_applied || parent.creditsApplied
  },

  OrderItem: {
    customerOrderId: (parent) => parent.order_id || parent.customerOrderId,
    customerReplacementFile: (parent) => parent.customer_replacement_file || parent.customerReplacementFile,
    customerReplacementFileName: (parent) => parent.customer_replacement_file_name || parent.customerReplacementFileName,
    customerReplacementAt: (parent) => parent.customer_replacement_at || parent.customerReplacementAt,
    stripeLineItemId: (parent) => parent.stripe_line_item_id || parent.stripeLineItemId,
    productId: (parent) => parent.product_id || parent.productId || 'custom-product',
    productName: (parent) => parent.product_name || parent.productName || 'Custom Product',
    productCategory: (parent) => parent.product_category || parent.productCategory,
    unitPrice: (parent) => parent.unit_price || parent.unitPrice,
    totalPrice: (parent) => parent.total_price || parent.totalPrice,
    calculatorSelections: (parent) => parent.calculator_selections || parent.calculatorSelections,
    customFiles: (parent) => parent.custom_files || parent.customFiles,
    customerNotes: (parent) => parent.customer_notes || parent.customerNotes,
    instagramHandle: (parent) => parent.instagram_handle || parent.instagramHandle,
    instagramOptIn: (parent) => parent.instagram_opt_in || parent.instagramOptIn,
    fulfillmentStatus: (parent) => parent.fulfillment_status || parent.fulfillmentStatus,
    createdAt: (parent) => parent.created_at || parent.createdAt,
    updatedAt: (parent) => parent.updated_at || parent.updatedAt,
    is_additional_payment: (parent) => parent.is_additional_payment || parent.isAdditionalPayment
  },

  OrderProof: {
    orderId: (parent) => parent.orderId || parent.order_id,
    orderItemId: (parent) => parent.orderItemId || parent.order_item_id,
    proofUrl: (parent) => parent.proofUrl || parent.proof_url,
    proofPublicId: (parent) => parent.proofPublicId || parent.proof_public_id,
    proofTitle: (parent) => parent.proofTitle || parent.proof_title,
    uploadedAt: (parent) => parent.uploadedAt || parent.uploaded_at,
    uploadedBy: (parent) => parent.uploadedBy || parent.uploaded_by,
    customerNotes: (parent) => parent.customerNotes || parent.customer_notes,
    adminNotes: (parent) => parent.adminNotes || parent.admin_notes,
    cutLines: (parent) => parent.cutLines || parent.cut_lines
  },

  Review: {
    userId: (parent) => parent.user_id || parent.userId,
    productId: (parent) => parent.product_id || parent.productId,
    productCategory: (parent) => parent.product_category || parent.productCategory,
    isVerifiedPurchase: (parent) => parent.is_verified_purchase || parent.isVerifiedPurchase,
    orderId: (parent) => parent.order_id || parent.orderId,
    helpfulVotes: (parent) => parent.helpful_votes || parent.helpfulVotes,
    totalVotes: (parent) => parent.total_votes || parent.totalVotes,
    createdAt: (parent) => parent.created_at || parent.createdAt,
    updatedAt: (parent) => parent.updated_at || parent.updatedAt,
    userEmail: (parent) => parent.user_email || parent.userEmail,
    userFirstName: (parent) => parent.user_first_name || parent.userFirstName,
    userLastName: (parent) => parent.user_last_name || parent.userLastName,
    userDisplayName: (parent) => parent.user_display_name || parent.userDisplayName
  },

  Query: {
    hello: () => 'Hello, Sticker Shuttle API with Stripe Payments!',
    
    getUserOrders: async (_, { userId }) => {
      try {
        console.log('🔍 getUserOrders called with userId:', userId);
        
        if (!supabaseClient.isReady()) {
          console.error('❌ Supabase client not ready');
          throw new Error('Order history service is currently unavailable');
        }
        
        console.log('📡 Calling supabaseClient.getUserOrders...');
        const rpcData = await supabaseClient.getUserOrders(userId);
        console.log('📊 RPC data received:', rpcData.length, 'total orders');
        
        // IMPORTANT: The RPC function must return order_id field, not just id
        // Run the SQL fix in DASHBOARD_ORDERS_FIX.md to update the RPC function
        
        // Log what we're getting from RPC to debug field names
        if (rpcData.length > 0) {
          console.log('🔍 RPC data structure check - first order fields:', Object.keys(rpcData[0]));
          console.log('🔍 Looking for order_id field:', rpcData[0].order_id ? '✅ Found' : '❌ Missing - RPC needs update!');
        }
        
        // Filter to only show paid orders in dashboard (hide draft orders with financial_status = 'pending')
        const paidOrders = rpcData.filter(order => order.financial_status === 'paid');
        console.log('💰 Filtered to paid orders:', paidOrders.length, 'of', rpcData.length, 'total');
        
        // Fetch additional data for all orders since RPC doesn't include everything
        const client = supabaseClient.getServiceClient();
        const orderIds = paidOrders.map(order => order.order_id);
        
        let additionalOrderData = {};
        if (orderIds.length > 0) {
          const { data: ordersWithExtras, error: extrasError } = await client
            .from('orders_main')
            .select('id, proofs, proof_status, proof_sent_at, proof_link, order_note, customer_first_name, customer_last_name, customer_email')
            .in('id', orderIds);
            
          if (extrasError) {
            console.error('❌ Error fetching additional order data:', extrasError);
          } else {
            // Create lookup map for additional order data
            additionalOrderData = ordersWithExtras.reduce((acc, order) => {
              acc[order.id] = {
                proofs: order.proofs || [],
                proof_status: order.proof_status,
                proof_sent_at: order.proof_sent_at,
                proof_link: order.proof_link,
                order_note: order.order_note,
                customer_first_name: order.customer_first_name,
                customer_last_name: order.customer_last_name,
                customer_email: order.customer_email
              };
              return acc;
            }, {});
            console.log('🔍 Additional order data fetched for', Object.keys(additionalOrderData).length, 'orders');
          }
        }
        
        // Log order structure for analytics (production-safe)
        if (paidOrders.length > 0 && paidOrders[0].items) {
          console.log('🔍 First paid order items structure:', JSON.stringify(paidOrders[0].items, null, 2));
        }
        
        // Map RPC function results to match GraphQL schema expectations (camelCase field names)
        const ordersWithTracking = await Promise.all(paidOrders.map(async order => {
          // Get additional data for this order (proofs, order note, customer info, etc.)
          const orderExtras = additionalOrderData[order.order_id] || {
            proofs: [],
            proof_status: null,
            proof_sent_at: null,
            proof_link: null,
            order_note: null,
            customer_first_name: null,
            customer_last_name: null,
            customer_email: null
          };
          
          // Fetch tracking data and order totals separately for each order
          let trackingData = {
            tracking_number: null,
            tracking_company: null,
            tracking_url: null
          };
          let orderTotals = {
            subtotal_price: null,
            total_tax: null,
            total_price: null,
            discount_amount: null,
            credits_applied: null
          };
          
          try {
            const { data: trackingInfo, error: trackingError } = await client
              .from('orders_main')
              .select('tracking_number, tracking_company, tracking_url, subtotal_price, total_tax, total_price, discount_amount, credits_applied')
              .eq('id', order.order_id)
              .single();
              
            if (!trackingError && trackingInfo) {
              trackingData = {
                tracking_number: trackingInfo.tracking_number,
                tracking_company: trackingInfo.tracking_company,
                tracking_url: trackingInfo.tracking_url
              };
              orderTotals = {
                subtotal_price: trackingInfo.subtotal_price,
                total_tax: trackingInfo.total_tax,
                total_price: trackingInfo.total_price,
                discount_amount: trackingInfo.discount_amount,
                credits_applied: trackingInfo.credits_applied
              };
              console.log(`📦 Order ${order.order_id} - Tracking: ${trackingData.tracking_number}, Total: ${orderTotals.total_price}`);
            }
          } catch (err) {
            console.log(`⚠️ Could not fetch tracking and totals for order ${order.order_id}`);
          }
          
          // Use actual total_price from database (updated by Stripe webhook) instead of calculating from items
          const actualTotal = Number(orderTotals.total_price) || 0;
          
          console.log(`🔍 Order ${order.order_id} actual total from database: ${actualTotal} (was previously calculating from items)`);
          console.log(`🔍 Order ${order.order_id} additional data:`, {
            hasProofs: orderExtras.proofs.length > 0,
            proofsCount: orderExtras.proofs.length,
            proof_status: orderExtras.proof_status,
            proof_sent_at: orderExtras.proof_sent_at,
            hasOrderNote: !!orderExtras.order_note,
            orderNoteLength: orderExtras.order_note ? orderExtras.order_note.length : 0,
            hasCustomerInfo: !!(orderExtras.customer_first_name || orderExtras.customer_email)
          });
          console.log(`🔍 RAW ORDER OBJECT:`, {
            keys: Object.keys(order),
            order_id: order.order_id,
            order_status: order.order_status,
            total_price: order.total_price
          });
          
          // 🔍 Debug log for white option fix verification
          if (orderExtras.order_note && orderExtras.order_note.includes('⚪ White Option')) {
            const whiteOptionMatch = orderExtras.order_note.match(/⚪ White Option: (.+?)(?:\n|$)/);
            console.log(`✅ WHITE OPTION FIX: Order ${order.order_id} has white option:`, 
              whiteOptionMatch?.[1] || 'pattern not found');
          }
          
          const mappedOrder = {
            // Map RPC field names to expected GraphQL schema field names (camelCase)
            id: String(order.order_id), // Ensure string ID
            userId: String(userId), // Ensure string ID
            guestEmail: null, // RPC doesn't return this
            stripePaymentIntentId: null, // RPC doesn't return this
            stripeCheckoutSessionId: null, // RPC doesn't return this
            orderNumber: order.order_number || null, // Get order_number from RPC
            orderStatus: order.order_status || 'Processing',
            fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
            financialStatus: order.financial_status || 'pending',
            trackingNumber: trackingData.tracking_number || null, // Use fetched tracking data
            trackingCompany: trackingData.tracking_company || null,
            trackingUrl: trackingData.tracking_url || null,
            subtotalPrice: Number(orderTotals.subtotal_price) || 0, // Use actual subtotal from database
            totalTax: Number(orderTotals.total_tax) || 0, // Use actual tax from database
            totalPrice: actualTotal, // Use actual total from database (updated by Stripe webhook)
            discountAmount: Number(orderTotals.discount_amount) || 0, // Use actual discount amount from database
            creditsApplied: Number(orderTotals.credits_applied) || 0, // Use actual credits applied from database
            currency: 'USD', // RPC doesn't return this, default to USD
            customerFirstName: orderExtras.customer_first_name, // Now available from database fetch
            customerLastName: orderExtras.customer_last_name, // Now available from database fetch
            customerEmail: orderExtras.customer_email, // Now available from database fetch
            customerPhone: null, // RPC doesn't return this
            shippingAddress: null,
            billingAddress: null,
            orderTags: null,
            orderNote: orderExtras.order_note, // 🎯 THIS IS THE KEY FIX - now includes actual order note!
            orderCreatedAt: order.order_created_at || new Date().toISOString(),
            orderUpdatedAt: null, // RPC doesn't return this
            createdAt: order.order_created_at || new Date().toISOString(), // Use order_created_at as fallback
            updatedAt: order.order_created_at || new Date().toISOString(), // Use order_created_at as fallback
            // Add proof-related fields
            proofs: orderExtras.proofs || [], // Include proofs array from fetched data
            proof_status: orderExtras.proof_status || null, // Include proof status
            proof_sent_at: orderExtras.proof_sent_at || null, // Include proof sent timestamp
            proof_link: orderExtras.proof_link || null, // Include proof link
            // Map items from JSONB to expected structure (camelCase field names)
            items: (order.items || []).map(item => ({
              id: String(item.id || `item-${Date.now()}-${Math.random()}`), // Ensure string ID
              customerOrderId: String(order.order_id), // Ensure string ID
              stripeLineItemId: null, // RPC doesn't include this in items
              productId: String(item.product_id || 'custom-product'), // Ensure non-null string
              productName: String(item.product_name || 'Custom Product'), // Ensure non-null string
              productCategory: item.product_category || 'custom',
              sku: null, // RPC doesn't include this in items
              quantity: Number(item.quantity) || 1, // Ensure non-null number
              unitPrice: Number(item.unit_price) || 0, // Ensure non-null number
              totalPrice: Number(item.total_price) || 0, // Ensure non-null number
              calculatorSelections: item.calculator_selections || {}, // Ensure non-null object
              customFiles: Array.isArray(item.custom_files) ? item.custom_files : [],
              customerNotes: item.customer_notes || '',
              instagramHandle: null, // RPC doesn't include this in items
              instagramOptIn: null, // RPC doesn't include this in items
              fulfillmentStatus: null, // RPC doesn't include this in items
              createdAt: null, // RPC doesn't include this in items
              updatedAt: null, // RPC doesn't include this in items
              is_additional_payment: Boolean(item.is_additional_payment)
            }))
          };

          return mappedOrder;
        }));
        
        return ordersWithTracking;
      } catch (error) {
        console.error('Error fetching user orders:', error);
        throw new Error(error.message);
      }
    },

    // Get order by number resolver
    getOrderByNumber: async (_, { orderNumber }) => {
      try {
        console.log('🔍 getOrderByNumber called with orderNumber:', orderNumber);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Supabase client not ready');
        }

        const client = supabaseClient.getServiceClient();
        const { data: orders, error } = await client
          .from('orders_main')
          .select(`
            *,
            items:order_items_new(*)
          `)
          .eq('order_number', orderNumber)
          .single();

        if (error) {
          console.error('❌ Error fetching order by number:', error);
          throw new Error(`Failed to fetch order: ${error.message}`);
        }

        if (!orders) {
          console.log('❌ No order found with orderNumber:', orderNumber);
          return null;
        }

        console.log('✅ Order found:', orders);
        
        // Map the order to match GraphQL schema (same as getAllOrders)
        return {
          id: String(orders.id),
          userId: orders.user_id ? String(orders.user_id) : null,
          guestEmail: orders.guest_email,
          stripePaymentIntentId: orders.stripe_payment_intent_id,
          stripeCheckoutSessionId: orders.stripe_session_id,
          orderNumber: orders.order_number,
          orderStatus: orders.order_status || 'Processing',
          fulfillmentStatus: orders.fulfillment_status || 'unfulfilled',
          financialStatus: orders.financial_status || 'pending',
          trackingNumber: orders.tracking_number,
          trackingCompany: orders.tracking_company,
          trackingUrl: orders.tracking_url,
          subtotalPrice: Number(orders.subtotal_price) || 0,
          totalTax: Number(orders.total_tax) || 0,
          totalPrice: Number(orders.total_price) || 0,
          currency: orders.currency || 'USD',
          customerFirstName: orders.customer_first_name,
          customerLastName: orders.customer_last_name,
          customerEmail: orders.customer_email,
          customerPhone: orders.customer_phone,
          shippingAddress: orders.shipping_address,
          billingAddress: orders.billing_address,
          shipping_method: orders.shipping_method,
          is_express_shipping: Boolean(orders.is_express_shipping),
          is_rush_order: Boolean(orders.is_rush_order),
          is_blind_shipment: Boolean(orders.is_blind_shipment),
          orderTags: orders.order_tags,
          orderNote: orders.order_note,
          orderCreatedAt: orders.order_created_at,
          orderUpdatedAt: orders.order_updated_at,
          createdAt: orders.created_at,
          updatedAt: orders.updated_at,
          proof_status: orders.proof_status,
          proof_sent_at: orders.proof_sent_at,
          proof_link: orders.proof_link,
          proofs: orders.proofs || [],
          // Map items
          items: (orders.items || []).map(item => ({
            id: String(item.id),
            customerOrderId: String(orders.id),
            stripeLineItemId: item.stripe_line_item_id,
            productId: String(item.product_id || 'custom-product'),
            productName: String(item.product_name || 'Custom Product'),
            productCategory: item.product_category,
            sku: item.sku,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unit_price) || 0,
            totalPrice: Number(item.total_price) || 0,
            calculatorSelections: item.calculator_selections || {},
            customFiles: Array.isArray(item.custom_files) ? item.custom_files : [],
            customerNotes: item.customer_notes,
            instagramHandle: item.instagram_handle,
            instagramOptIn: item.instagram_opt_in,
            fulfillmentStatus: item.fulfillment_status,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            customerReplacementFile: item.customer_replacement_file,
            customerReplacementFileName: item.customer_replacement_file_name,
            customerReplacementAt: item.customer_replacement_at,
            is_additional_payment: Boolean(item.is_additional_payment)
          }))
        };
      } catch (error) {
        console.error('❌ getOrderByNumber error:', error);
        throw error;
      }
    },

    getOrderById: async (_, { id }) => {
      try {
        console.log('🔍 getOrderById called with id:', id);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        const { data, error } = await client
          .from('orders_main')
          .select(`
            *,
            items:order_items_new(*)
          `)
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching order:', error);
          throw new Error('Order not found');
        }

        console.log('📦 Order fetched:', {
          id: data.id,
          proofs: data.proofs || [],
          proof_status: data.proof_status
        });
        
        // Debug proofs orderItemId when retrieved
        if (data.proofs && data.proofs.length > 0) {
          console.log('🔍 Retrieved proofs orderItemId debugging:');
          data.proofs.forEach((proof, index) => {
            console.log(`  Proof ${index + 1}:`, {
              'proof.id': proof.id,
              'proof.orderItemId': proof.orderItemId,
              'proof.orderItemId type': typeof proof.orderItemId,
              'proof.order_item_id': proof.order_item_id,
              'proof keys': Object.keys(proof),
              'raw proof': JSON.stringify(proof, null, 2)
            });
          });
        }

        // Debug order items before mapping
        console.log('🔍 Order items before mapping:', data.items?.map(item => ({
          id: item.id,
          idType: typeof item.id,
          productName: item.product_name
        })));

        // CRITICAL: Debug the mapping process
        const mappedItems = (data.items || []).map(item => ({
          id: String(item.id), // Convert to string for consistent ID matching
          customerOrderId: String(data.id),
          stripeLineItemId: item.stripe_line_item_id,
          productId: String(item.product_id || 'custom-product'),
          productName: String(item.product_name || 'Custom Product'),
          productCategory: item.product_category,
          sku: item.sku,
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unit_price) || 0,
          totalPrice: Number(item.total_price) || 0,
          calculatorSelections: item.calculator_selections || {},
          customFiles: Array.isArray(item.custom_files) ? item.custom_files : [],
          customerNotes: item.customer_notes,
          instagramHandle: item.instagram_handle,
          instagramOptIn: item.instagram_opt_in,
          fulfillmentStatus: item.fulfillment_status,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          customerReplacementFile: item.customer_replacement_file,
          customerReplacementFileName: item.customer_replacement_file_name,
          customerReplacementAt: item.customer_replacement_at,
          is_additional_payment: Boolean(item.is_additional_payment)
        }));

        console.log('🔍 Order items after mapping:', mappedItems.map(item => ({
          id: item.id,
          idType: typeof item.id,
          productName: item.productName
        })));

        // Check if any proof orderItemId matches any item id
        if (data.proofs && data.proofs.length > 0 && mappedItems.length > 0) {
          console.log('🔍 CRITICAL ID MATCHING TEST:');
          data.proofs.forEach((proof, proofIndex) => {
            console.log(`  Proof ${proofIndex + 1} (${proof.orderItemId}) matching test:`);
            mappedItems.forEach((item, itemIndex) => {
              const directMatch = proof.orderItemId === item.id;
              const stringMatch = String(proof.orderItemId) === String(item.id);
              console.log(`    Item ${itemIndex + 1} (${item.id}): direct=${directMatch}, string=${stringMatch}`);
            });
          });
        }

        // Return the order with proper item mapping (consistent with other functions)
        return {
          id: String(data.id),
          userId: data.user_id ? String(data.user_id) : null,
          guestEmail: data.guest_email,
          stripePaymentIntentId: data.stripe_payment_intent_id,
          stripeCheckoutSessionId: data.stripe_session_id,
          orderNumber: data.order_number,
          orderStatus: data.order_status || 'Processing',
          fulfillmentStatus: data.fulfillment_status || 'unfulfilled',
          financialStatus: data.financial_status || 'pending',
          trackingNumber: data.tracking_number,
          trackingCompany: data.tracking_company,
          trackingUrl: data.tracking_url,
          subtotalPrice: Number(data.subtotal_price) || 0,
          totalTax: Number(data.total_tax) || 0,
          totalPrice: Number(data.total_price) || 0,
          currency: data.currency || 'USD',
          customerFirstName: data.customer_first_name,
          customerLastName: data.customer_last_name,
          customerEmail: data.customer_email,
          customerPhone: data.customer_phone,
          shippingAddress: data.shipping_address,
          billingAddress: data.billing_address,
          shipping_method: data.shipping_method,
          is_express_shipping: Boolean(data.is_express_shipping),
          is_rush_order: Boolean(data.is_rush_order),
          is_blind_shipment: Boolean(data.is_blind_shipment),
          orderTags: data.order_tags,
          orderNote: data.order_note,
          orderCreatedAt: data.order_created_at,
          orderUpdatedAt: data.order_updated_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          proof_status: data.proof_status,
          proof_sent_at: data.proof_sent_at,
          proof_link: data.proof_link,
          proofs: data.proofs || [],
          // Map items with proper ID conversion (crucial for proof matching)
          items: mappedItems
        };
      } catch (error) {
        console.error('Error fetching order by ID:', error);
        throw new Error(error.message);
      }
    },

    claimGuestOrders: async (_, { userId, email }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        const claimedCount = await supabaseClient.claimGuestOrders(userId, email);
        return {
          success: true,
          claimedOrdersCount: claimedCount,
          message: claimedCount > 0 
            ? `Successfully claimed ${claimedCount} orders`
            : 'No guest orders found to claim'
        };
      } catch (error) {
        console.error('Error claiming guest orders:', error);
        throw new Error(error.message);
      }
    },

    getAllOrders: async () => {
      try {
        console.log('🔍 getAllOrders called - Admin fetching all orders');
        
        if (!supabaseClient.isReady()) {
          console.error('❌ Supabase client not ready');
          throw new Error('Order service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        
        // Fetch all orders with their items
        const { data: orders, error } = await client
          .from('orders_main')
          .select(`
            *,
            items:order_items_new(*)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching all orders:', error);
          throw new Error('Failed to fetch orders');
        }

        console.log(`📊 Found ${orders?.length || 0} total orders`);

        // Map the orders to match GraphQL schema
        return (orders || []).map(order => ({
          id: String(order.id),
          userId: order.user_id ? String(order.user_id) : null,
          guestEmail: order.guest_email,
          stripePaymentIntentId: order.stripe_payment_intent_id,
          stripeCheckoutSessionId: order.stripe_session_id,
          orderNumber: order.order_number,
          orderStatus: order.order_status || 'Processing',
          fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
          financialStatus: order.financial_status || 'pending',
          trackingNumber: order.tracking_number,
          trackingCompany: order.tracking_company,
          trackingUrl: order.tracking_url,
          subtotalPrice: Number(order.subtotal_price) || 0,
          totalTax: Number(order.total_tax) || 0,
          totalPrice: Number(order.total_price) || 0,
          currency: order.currency || 'USD',
          customerFirstName: order.customer_first_name,
          customerLastName: order.customer_last_name,
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone,
          shippingAddress: order.shipping_address,
          billingAddress: order.billing_address,
          shipping_method: order.shipping_method,
          is_express_shipping: Boolean(order.is_express_shipping),
          is_rush_order: Boolean(order.is_rush_order),
          is_blind_shipment: Boolean(order.is_blind_shipment),
          orderTags: order.order_tags,
          orderNote: order.order_note,
          orderCreatedAt: order.order_created_at,
          orderUpdatedAt: order.order_updated_at,
          createdAt: order.created_at,
          updatedAt: order.updated_at,
          proof_status: order.proof_status,
          proof_sent_at: order.proof_sent_at,
          proof_link: order.proof_link,
          proofs: order.proofs || [],
          // Map items
          items: (order.items || []).map(item => ({
            id: String(item.id),
            customerOrderId: String(order.id),
            stripeLineItemId: item.stripe_line_item_id,
            productId: String(item.product_id || 'custom-product'),
            productName: String(item.product_name || 'Custom Product'),
            productCategory: item.product_category,
            sku: item.sku,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unit_price) || 0,
            totalPrice: Number(item.total_price) || 0,
            calculatorSelections: item.calculator_selections || {},
            customFiles: Array.isArray(item.custom_files) ? item.custom_files : [],
            customerNotes: item.customer_notes,
            instagramHandle: item.instagram_handle,
            instagramOptIn: item.instagram_opt_in,
            fulfillmentStatus: item.fulfillment_status,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            customerReplacementFile: item.customer_replacement_file,
            customerReplacementFileName: item.customer_replacement_file_name,
            customerReplacementAt: item.customer_replacement_at,
            is_additional_payment: Boolean(item.is_additional_payment)
          }))
        }));
      } catch (error) {
        console.error('❌ Error in getAllOrders:', error);
        throw new Error(error.message);
      }
    },

    getAllCustomers: async (parent, args, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        // Get all orders from orders_main with items
        const client = supabaseClient.getServiceClient();
        const { data: orders, error } = await client
          .from('orders_main')
          .select(`
            *,
            order_items_new(*)
          `)
          .order('order_created_at', { ascending: false });

        if (error) throw error;

        // Get all user profiles to map emails to user IDs
        const { data: userProfiles, error: profilesError } = await client
          .from('user_profiles')
          .select('user_id, email');

        if (profilesError) {
          console.warn('Error fetching user profiles:', profilesError);
        }

        // Create email to user_id mapping
        const emailToUserIdMap = new Map();
        if (userProfiles) {
          userProfiles.forEach(profile => {
            if (profile.email && profile.user_id) {
              emailToUserIdMap.set(profile.email.toLowerCase(), profile.user_id);
            }
          });
        }

        // Group orders by customer email
        const customerMap = new Map();

        orders.forEach(order => {
          const email = order.customer_email?.toLowerCase();
          if (!email) return;

          if (!customerMap.has(email)) {
            // Try to get the actual user_id from user_profiles, fallback to email
            const userId = emailToUserIdMap.get(email) || email;
            
            customerMap.set(email, {
              id: userId, // Use actual user_id when available, fallback to email for guests
              email: order.customer_email,
              firstName: order.customer_first_name,
              lastName: order.customer_last_name,
              city: order.shipping_address?.city || '',
              state: order.shipping_address?.province || order.shipping_address?.state || '',
              country: order.shipping_address?.country || 'US',
              totalOrders: 0,
              totalSpent: 0,
              marketingOptIn: false,
              orders: [],
              lastOrderDate: null,
              firstOrderDate: null,
              hasUserProfile: emailToUserIdMap.has(email) // Flag to indicate if they have a user profile
            });
          }

          const customer = customerMap.get(email);
          
          // Only include paid orders in customer statistics
          if (order.financial_status === 'paid') {
            customer.totalOrders += 1;
            customer.totalSpent += Number(order.total_price) || 0;
          }
          
          // Check marketing opt-in from any order item
          if (order.order_items_new) {
            order.order_items_new.forEach(item => {
              if (item.instagram_opt_in) {
                customer.marketingOptIn = true;
              }
            });
          }

          // Track order dates
          const orderDate = order.order_created_at || order.created_at;
          if (!customer.firstOrderDate || new Date(orderDate) < new Date(customer.firstOrderDate)) {
            customer.firstOrderDate = orderDate;
          }
          if (!customer.lastOrderDate || new Date(orderDate) > new Date(customer.lastOrderDate)) {
            customer.lastOrderDate = orderDate;
          }

          // Update location from most recent order
          if (order.shipping_address) {
            customer.city = order.shipping_address.city || customer.city;
            customer.state = order.shipping_address.province || order.shipping_address.state || customer.state;
            customer.country = order.shipping_address.country || customer.country;
          }

          customer.orders.push(order);
        });

        // Convert to array and calculate averages
        const customers = Array.from(customerMap.values()).map(customer => ({
          ...customer,
          averageOrderValue: customer.totalOrders > 0 ? customer.totalSpent / customer.totalOrders : 0
        }));

        return customers;
      } catch (error) {
        console.error('Error fetching customers:', error);
        throw new Error('Failed to fetch customers');
      }
    },

    getAllUsersWithOrderStats: async (parent, args, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      // Admin authentication required
      requireAdminAuth(user);

      try {
        console.log('📋 Fetching all users with order statistics...');
        const client = supabaseClient.getServiceClient();
        
        // Get all users from Supabase auth
        const { data: authData, error: authError } = await client.auth.admin.listUsers();
        
        if (authError) {
          console.error('❌ Error fetching auth users:', authError);
          throw new Error('Failed to fetch users from auth');
        }

        const authUsers = authData.users || [];

        // Get user profiles for additional info
        const { data: profiles, error: profileError } = await client
          .from('user_profiles')
          .select('user_id, first_name, last_name, email, city, state, country, marketing_opt_in');
        
        if (profileError) {
          console.warn('⚠️ Error fetching user profiles:', profileError);
        }

        // Get all orders to calculate statistics
        const { data: orders, error: ordersError } = await client
          .from('orders_main')
          .select(`
            *,
            order_items_new(*)
          `)
          .order('order_created_at', { ascending: false });

        if (ordersError) {
          console.warn('⚠️ Error fetching orders:', ordersError);
        }

        // Create profile lookup map
        const profileMap = new Map(
          (profiles || []).map(p => [p.user_id, p])
        );

        // Group orders by user ID and email
        const userOrdersMap = new Map();
        const emailOrdersMap = new Map();

        if (orders) {
          orders.forEach(order => {
            // Group by user_id if available
            if (order.user_id) {
              if (!userOrdersMap.has(order.user_id)) {
                userOrdersMap.set(order.user_id, []);
              }
              userOrdersMap.get(order.user_id).push(order);
            }

            // Also group by email for guest orders
            if (order.customer_email) {
              const email = order.customer_email.toLowerCase();
              if (!emailOrdersMap.has(email)) {
                emailOrdersMap.set(email, []);
              }
              emailOrdersMap.get(email).push(order);
            }
          });
        }

        // Calculate statistics for each user
        const usersWithStats = authUsers.map(user => {
          const profile = profileMap.get(user.id);
          const userOrders = userOrdersMap.get(user.id) || [];
          const emailOrders = emailOrdersMap.get(user.email?.toLowerCase()) || [];
          
          // Combine orders from both user_id and email (deduplicate by order ID)
          const allUserOrders = [...userOrders];
          emailOrders.forEach(order => {
            if (!allUserOrders.some(existingOrder => existingOrder.id === order.id)) {
              allUserOrders.push(order);
            }
          });

          // Calculate statistics from paid orders only
          const paidOrders = allUserOrders.filter(order => order.financial_status === 'paid');
          const totalOrders = paidOrders.length;
          const totalSpent = paidOrders.reduce((sum, order) => sum + (Number(order.total_price) || 0), 0);
          const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

          // Get order dates
          let firstOrderDate = null;
          let lastOrderDate = null;
          if (paidOrders.length > 0) {
            const orderDates = paidOrders.map(order => new Date(order.order_created_at || order.created_at));
            firstOrderDate = new Date(Math.min(...orderDates)).toISOString();
            lastOrderDate = new Date(Math.max(...orderDates)).toISOString();
          }

          // Check marketing opt-in from profile or any order item
          let marketingOptIn = profile?.marketing_opt_in || false;
          if (!marketingOptIn && allUserOrders.length > 0) {
            marketingOptIn = allUserOrders.some(order => 
              order.order_items_new?.some(item => item.instagram_opt_in)
            );
          }

          return {
            id: user.id,
            email: user.email,
            firstName: user.user_metadata?.first_name || profile?.first_name || null,
            lastName: user.user_metadata?.last_name || profile?.last_name || null,
            city: profile?.city || '',
            state: profile?.state || '',
            country: profile?.country || 'US',
            totalOrders,
            totalSpent,
            averageOrderValue,
            marketingOptIn,
            lastOrderDate,
            firstOrderDate,
            orders: allUserOrders
          };
        });

        console.log(`✅ Successfully fetched ${usersWithStats.length} users with order stats`);
        return usersWithStats;
      } catch (error) {
        console.error('❌ Error in getAllUsersWithOrderStats:', error);
        throw new Error(error.message);
      }
    },

    // Analytics query with time-series data
    getAnalyticsData: async (_, { timeRange = '30d' }, context) => {
      try {
        const client = supabaseClient.getServiceClient();
        const { data: allOrders, error } = await client
          .from('orders_main')
          .select(`
            *,
            order_items_new(*)
          `)
          .order('order_created_at', { ascending: true });

        if (error) throw error;

        const orders = allOrders || [];
        
        // Calculate date range
        const now = new Date();
        let startDate = new Date();
        
        
        switch (timeRange) {
          case '7d':
            startDate.setDate(now.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(now.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(now.getDate() - 90);
            break;
          case '1y':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
          default:
            startDate.setDate(now.getDate() - 30);
        }

        // Filter orders by date range and paid status only
        const filteredOrders = orders.filter(order => {
          const orderDate = new Date(order.order_created_at || order.created_at);
          return orderDate >= startDate && order.financial_status === 'paid';
        });

        // Calculate daily sales data
        const dailySalesMap = new Map();
        const dailyOrdersMap = new Map();
        
        filteredOrders.forEach(order => {
          const date = new Date(order.order_created_at || order.created_at).toISOString().split('T')[0];
          
          // Daily sales
          if (!dailySalesMap.has(date)) {
            dailySalesMap.set(date, 0);
            dailyOrdersMap.set(date, 0);
          }
          dailySalesMap.set(date, dailySalesMap.get(date) + (order.total_price || 0));
          dailyOrdersMap.set(date, dailyOrdersMap.get(date) + 1);
        });

        // Prepare daily sales data for chart
        const dailySales = Array.from(dailySalesMap.entries())
          .map(([date, revenue]) => ({
            date,
            revenue,
            orders: dailyOrdersMap.get(date),
            averageOrderValue: revenue / dailyOrdersMap.get(date)
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate unique customers
        const uniqueCustomers = new Set(filteredOrders.map(o => o.customer_email)).size;

        // Calculate proof metrics
        let totalProofSendTime = 0;
        let proofSendCount = 0;
        let totalProofAcceptTime = 0;
        let proofAcceptCount = 0;
        let proofsApproved = 0;
        let proofsWithChanges = 0;
        let totalProofs = 0;

        filteredOrders.forEach(order => {
          if (order.proofs && order.proofs.length > 0) {
            // Time to send proof (order created to proof sent)
            if (order.proof_sent_at) {
              const orderDate = new Date(order.order_created_at || order.created_at);
              const proofSentDate = new Date(order.proof_sent_at);
              const hoursDiff = (proofSentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
              if (hoursDiff > 0 && hoursDiff < 720) { // Exclude outliers over 30 days
                totalProofSendTime += hoursDiff;
                proofSendCount++;
              }
            }

            // Analyze each proof
            order.proofs.forEach(proof => {
              totalProofs++;
              
              // Time to accept/respond to proof
              if (proof.sentAt && (proof.approvedAt || proof.updatedAt)) {
                const sentDate = new Date(proof.sentAt);
                const responseDate = new Date(proof.approvedAt || proof.updatedAt);
                const hoursDiff = (responseDate.getTime() - sentDate.getTime()) / (1000 * 60 * 60);
                if (hoursDiff > 0 && hoursDiff < 720) { // Exclude outliers over 30 days
                  totalProofAcceptTime += hoursDiff;
                  proofAcceptCount++;
                }
              }

              // Count approvals vs changes
              if (proof.status === 'approved') {
                proofsApproved++;
              } else if (proof.status === 'changes_requested') {
                proofsWithChanges++;
              }
            });
          }
        });

        const avgProofSendTime = proofSendCount > 0 ? totalProofSendTime / proofSendCount : 0;
        const avgProofAcceptTime = proofAcceptCount > 0 ? totalProofAcceptTime / proofAcceptCount : 0;
        const proofApprovalRate = totalProofs > 0 ? (proofsApproved / totalProofs) * 100 : 0;
        const proofChangesRate = totalProofs > 0 ? (proofsWithChanges / totalProofs) * 100 : 0;

        // Product performance
        const productStatsMap = new Map();
        
        filteredOrders.forEach(order => {
          const items = order.order_items_new || [];
          items.forEach(item => {
            const productName = item.product_name || 'Unknown';
            if (!productStatsMap.has(productName)) {
              productStatsMap.set(productName, { revenue: 0, quantity: 0, orders: 0 });
            }
            const stats = productStatsMap.get(productName);
            stats.revenue += item.total_price || 0;
            stats.quantity += item.quantity || 0;
            stats.orders += 1;
          });
        });

        const topProductsByRevenue = Array.from(productStatsMap.entries())
          .map(([name, stats]) => ({ name, ...stats }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);



        // Summary metrics
        const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total_price || 0), 0);
        const totalOrders = filteredOrders.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Growth metrics (compare to previous period)
        const previousPeriodStart = new Date(startDate);
        const periodLength = now.getTime() - startDate.getTime();
        previousPeriodStart.setTime(previousPeriodStart.getTime() - periodLength);

        const previousPeriodOrders = orders.filter(order => {
          const orderDate = new Date(order.order_created_at || order.created_at);
          return orderDate >= previousPeriodStart && orderDate < startDate && order.financial_status === 'paid';
        });

        const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + (order.total_price || 0), 0);
        const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

        // Calculate churn rate (customers who haven't ordered in the last 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        const allCustomerIds = new Set(orders.map(order => order.user_id || order.guest_email).filter(Boolean));
        const recentCustomerIds = new Set(
          orders
            .filter(order => new Date(order.order_created_at || order.created_at) >= ninetyDaysAgo)
            .map(order => order.user_id || order.guest_email)
            .filter(Boolean)
        );
        
        // Calculate daily averages
        const periodDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
        const dailyAverageRevenue = periodDays > 0 ? totalRevenue / periodDays : 0;
        const dailyAverageOrders = periodDays > 0 ? totalOrders / periodDays : 0;

        // Calculate new vs existing customers for the current period
        const customerFirstOrderMap = new Map();
        orders.forEach(order => {
          const customerId = order.user_id || order.guest_email;
          if (!customerId) return;
          
          const orderDate = new Date(order.order_created_at || order.created_at);
          if (!customerFirstOrderMap.has(customerId) || orderDate < customerFirstOrderMap.get(customerId)) {
            customerFirstOrderMap.set(customerId, orderDate);
          }
        });

        // Track unique customers who ordered in the filtered period
        const newCustomerSet = new Set();
        const existingCustomerSet = new Set();
        
        filteredOrders.forEach(order => {
          const customerId = order.user_id || order.guest_email;
          if (!customerId) return;
          
          const firstOrderDate = customerFirstOrderMap.get(customerId);
          
          // If customer's first order is within the filtered period, they're new
          if (firstOrderDate && firstOrderDate >= startDate) {
            newCustomerSet.add(customerId);
          } else {
            existingCustomerSet.add(customerId);
          }
        });

        const newCustomers = newCustomerSet.size;
        const existingCustomers = existingCustomerSet.size;

        // Get new signups (user registrations) for the period
        let newSignups = 0;
        try {
          const { data: signupData, error: signupError } = await client
            .from('user_profiles')
            .select('created_at')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', now.toISOString());
          
          if (!signupError && signupData) {
            newSignups = signupData.length;
          }
        } catch (signupErr) {
          console.warn('Could not fetch signup data:', signupErr);
          newSignups = 0;
        }

        // Calculate current month projection
        const currentMonth = new Date();
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const daysInMonth = endOfMonth.getDate();
        const daysPassed = Math.max(1, currentMonth.getDate());
        
        // Get current month's revenue so far
        const currentMonthOrders = orders.filter(order => {
          const orderDate = new Date(order.order_created_at || order.created_at);
          return orderDate >= startOfMonth && orderDate <= currentMonth && order.financial_status === 'paid';
        });
        
        const currentMonthRevenue = currentMonthOrders.reduce((sum, order) => sum + (order.total_price || 0), 0);
        const dailyAverageThisMonth = daysPassed > 0 ? currentMonthRevenue / daysPassed : 0;
        const currentMonthProjection = dailyAverageThisMonth * daysInMonth;

        // Calculate average order to delivery time
        const deliveredOrders = filteredOrders.filter(order => 
          order.fulfillment_status === 'fulfilled' && 
          order.order_created_at && 
          order.updated_at
        );
        
        let avgOrderToDeliveryTime = 0;
        if (deliveredOrders.length > 0) {
          const totalDeliveryTime = deliveredOrders.reduce((sum, order) => {
            const orderDate = new Date(order.order_created_at);
            const deliveryDate = new Date(order.updated_at);
            const diffInHours = (deliveryDate - orderDate) / (1000 * 60 * 60);
            return sum + diffInHours;
          }, 0);
          avgOrderToDeliveryTime = totalDeliveryTime / deliveredOrders.length;
        }

        // Calculate average proof approved to delivery time
        let avgProofApprovedToDeliveryTime = 0;
        try {
          // First, get all fulfilled orders in the time range
          const fulfilledOrderIds = filteredOrders
            .filter(order => order.fulfillment_status === 'fulfilled')
            .map(order => order.id);

          if (fulfilledOrderIds.length > 0) {
            // Get approved proofs for these orders
            const { data: proofsData, error: proofsError } = await client
              .from('order_proofs')
              .select('*')
              .eq('status', 'approved')
              .in('order_id', fulfilledOrderIds);

            if (!proofsError && proofsData && proofsData.length > 0) {
              console.log(`Found ${proofsData.length} approved proofs for fulfilled orders`);
              
              let validProofTimes = [];
              
              for (const proof of proofsData) {
                // Find the corresponding order
                const order = filteredOrders.find(o => o.id === proof.order_id);
                if (order && order.updated_at && proof.uploaded_at) {
                  const proofApprovedDate = new Date(proof.uploaded_at);
                  const deliveryDate = new Date(order.updated_at);
                  const diffInHours = (deliveryDate - proofApprovedDate) / (1000 * 60 * 60);
                  
                  console.log(`Proof ${proof.id}: Approved ${proofApprovedDate.toISOString()}, Delivered ${deliveryDate.toISOString()}, Diff: ${diffInHours} hours`);
                  
                  // Only include proof times that are reasonable (0-24 hours)
                  // This excludes orders that didn't actually require proofs or had long delays
                  if (diffInHours > 0 && diffInHours <= 24) {
                    validProofTimes.push(diffInHours);
                  } else if (diffInHours > 24) {
                    console.log(`Excluding proof ${proof.id} - too long: ${diffInHours} hours`);
                  }
                }
              }
              
              if (validProofTimes.length > 0) {
                avgProofApprovedToDeliveryTime = validProofTimes.reduce((sum, time) => sum + time, 0) / validProofTimes.length;
                console.log(`Average proof to delivery time: ${avgProofApprovedToDeliveryTime} hours from ${validProofTimes.length} valid proofs`);
              } else {
                console.log('No valid proof timing data found');
              }
            } else {
              console.log('No approved proofs found for fulfilled orders');
              
              // Fallback: Try to get any proofs (not just approved) for debugging
              const { data: allProofsData, error: allProofsError } = await client
                .from('order_proofs')
                .select('*, status')
                .in('order_id', fulfilledOrderIds.slice(0, 5)); // Just first 5 for debugging
              
              if (!allProofsError && allProofsData) {
                console.log('Available proof statuses:', allProofsData.map(p => ({ id: p.id, status: p.status, orderId: p.order_id })));
              }
            }
          }
        } catch (proofErr) {
          console.error('Error calculating proof approval to delivery data:', proofErr);
          avgProofApprovedToDeliveryTime = 0;
        }



        // Calculate customer analytics
        const customerStatsMap = new Map();
        
        orders.forEach(order => {
          const customerId = order.user_id || order.guest_email;
          const customerEmail = order.customer_email || order.guest_email || 'unknown@example.com';
          const customerName = order.customer_first_name && order.customer_last_name 
            ? `${order.customer_first_name} ${order.customer_last_name}` 
            : null;
          
          if (!customerId) return;
          
          if (!customerStatsMap.has(customerId)) {
            customerStatsMap.set(customerId, {
              id: customerId,
              email: customerEmail,
              name: customerName,
              lifetimeValue: 0,
              totalOrders: 0,
              firstOrderDate: null,
              lastOrderDate: null,
              orderDates: []
            });
          }
          
          const stats = customerStatsMap.get(customerId);
          if (order.financial_status === 'paid') {
            stats.lifetimeValue += order.total_price || 0;
            stats.totalOrders += 1;
            
            const orderDate = new Date(order.order_created_at || order.created_at);
            stats.orderDates.push(orderDate);
            
            if (!stats.firstOrderDate || orderDate < new Date(stats.firstOrderDate)) {
              stats.firstOrderDate = orderDate.toISOString();
            }
            if (!stats.lastOrderDate || orderDate > new Date(stats.lastOrderDate)) {
              stats.lastOrderDate = orderDate.toISOString();
            }
          }
        });

        // Calculate purchase frequency and average order value for each customer
        const customerAnalytics = Array.from(customerStatsMap.values())
          .filter(customer => customer.totalOrders > 0)
          .map(customer => {
            const avgOrderValue = customer.totalOrders > 0 ? customer.lifetimeValue / customer.totalOrders : 0;
            
            // Calculate purchase frequency (average days between orders)
            let purchaseFrequency = null;
            if (customer.orderDates.length > 1) {
              customer.orderDates.sort((a, b) => a - b);
              const intervals = [];
              for (let i = 1; i < customer.orderDates.length; i++) {
                const daysBetween = (customer.orderDates[i] - customer.orderDates[i-1]) / (1000 * 60 * 60 * 24);
                intervals.push(daysBetween);
              }
              purchaseFrequency = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
            }
            
            return {
              id: customer.id,
              email: customer.email,
              name: customer.name,
              lifetimeValue: customer.lifetimeValue,
              purchaseFrequency,
              totalOrders: customer.totalOrders,
              firstOrderDate: customer.firstOrderDate,
              lastOrderDate: customer.lastOrderDate,
              avgOrderValue
            };
          })
          .sort((a, b) => b.lifetimeValue - a.lifetimeValue);

        return {
          summary: {
            totalRevenue,
            totalOrders,
            averageOrderValue,
            uniqueCustomers,
            revenueGrowth,
            conversionRate: 2.9, // This would need actual visitor data
            dailyAverageRevenue,
            dailyAverageOrders,
            currentMonthProjection,
            avgOrderToDeliveryTime,
            avgProofApprovedToDeliveryTime,
            newCustomers,
            existingCustomers,
            newSignups
          },
          dailySales,
          proofMetrics: {
            avgProofSendTime, // in hours
            avgProofAcceptTime, // in hours
            proofApprovalRate,
            proofChangesRate,
            totalProofs,
            proofsApproved,
            proofsWithChanges
          },
          productPerformance: {
            topProductsByRevenue
          },
          customerAnalytics
        };
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        throw new Error('Failed to fetch analytics data');
      }
    },

    // Review Queries
    getProductReviews: async (_, { productId, limit = 50, offset = 0 }) => {
      try {
        const client = supabaseClient.getServiceClient();
        const { data, error } = await client
          .rpc('get_product_reviews', { 
            p_product_id: productId, 
            p_limit: limit, 
            p_offset: offset 
          });

        if (error) {
          console.error('Error fetching product reviews:', error);
          throw new Error('Failed to fetch product reviews');
        }

        return data || [];
      } catch (error) {
        console.error('Error in getProductReviews:', error);
        throw new Error(error.message);
      }
    },

    getProductReviewStats: async (_, { productId }) => {
      try {
        const client = supabaseClient.getServiceClient();
        const { data, error } = await client
          .rpc('get_product_review_stats', { p_product_id: productId });

        if (error) {
          console.error('Error fetching product review stats:', error);
          throw new Error('Failed to fetch product review stats');
        }

        // If no reviews exist, return zero stats
        if (!data || data.length === 0) {
          return {
            totalReviews: 0,
            averageRating: 0,
            rating5Count: 0,
            rating4Count: 0,
            rating3Count: 0,
            rating2Count: 0,
            rating1Count: 0
          };
        }

        return data[0];
      } catch (error) {
        console.error('Error in getProductReviewStats:', error);
        throw new Error(error.message);
      }
    },

    canUserReviewProduct: async (_, { userId, productId }, context) => {
      const { user } = context;
      if (!user) {
        return false;
      }

      try {
        const client = supabaseClient.getServiceClient();
        const { data, error } = await client
          .rpc('can_user_review_product', { 
            p_user_id: userId, 
            p_product_id: productId 
          });

        if (error) {
          console.error('Error checking if user can review product:', error);
          return false;
        }

        return data || false;
      } catch (error) {
        console.error('Error in canUserReviewProduct:', error);
        return false;
      }
    },

    getUserReviews: async (_, { userId }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        const { data, error } = await client
          .from('reviews')
          .select(`
            *,
            auth.users!inner(email)
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching user reviews:', error);
          throw new Error('Failed to fetch user reviews');
        }

        return data || [];
      } catch (error) {
        console.error('Error in getUserReviews:', error);
        throw new Error(error.message);
      }
    },

    // Order Review Queries
    getOrderReview: async (_, { orderId }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        // Validate inputs
        if (!orderId) {
          throw new Error('Order ID is required');
        }
        if (!user?.id) {
          throw new Error('User ID is required');
        }

        const client = supabaseClient.getServiceClient();
        
        // Check if user owns the order
        const { data: order, error: orderError } = await client
          .from('orders_main')
          .select('id, user_id')
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single();

        if (orderError || !order) {
          throw new Error('Order not found or access denied');
        }

        // Get the review for this order
        const { data: review, error: reviewError } = await client
          .from('reviews')
          .select(`
            *,
            auth.users!inner(email)
          `)
          .eq('order_id', orderId)
          .eq('user_id', user.id)
          .single();

        if (reviewError && reviewError.code !== 'PGRST116') {
          console.error('Error fetching order review:', reviewError);
          throw new Error('Failed to fetch review');
        }

        if (!review) {
          return null;
        }

        // Safe property access with null checks
        const safeUserMetadata = user.user_metadata || {};
        const firstName = safeUserMetadata.first_name || '';
        const lastName = safeUserMetadata.last_name || '';
        const displayName = `${firstName} ${lastName}`.trim() || 'Anonymous User';

        return {
          ...review,
          userEmail: review.users?.email || user.email || '',
          userFirstName: firstName,
          userLastName: lastName,
          userDisplayName: displayName
        };
      } catch (error) {
        console.error('Error in getOrderReview:', error);
        throw new Error(error.message);
      }
    },

    canUserReviewOrder: async (_, { userId, orderId }) => {
      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if order exists and belongs to user
        const { data: order, error: orderError } = await client
          .from('orders_main')
          .select('id, user_id, financial_status')
          .eq('id', orderId)
          .eq('user_id', userId)
          .single();

        if (orderError) {
          return false;
        }

        // Only allow reviews for paid orders
        if (order.financial_status !== 'paid') {
          return false;
        }

        // Check if user has already reviewed this order
        const { data: existingReview, error: reviewError } = await client
          .from('reviews')
          .select('id')
          .eq('user_id', userId)
          .eq('order_id', orderId)
          .single();

        if (reviewError && reviewError.code !== 'PGRST116') {
          return false;
        }

        // User can review if no existing review found
        return !existingReview;
      } catch (error) {
        console.error('Error in canUserReviewOrder:', error);
        return false;
      }
    },

    // Discount queries
    validateDiscountCode: async (_, { code, orderAmount, sessionId }, context) => {
      try {
        console.log('🏷️ Validating discount code from GraphQL:', code, 'sessionId:', sessionId);
        
        // Get user info from context if available
        const userId = context.user?.id || null;
        const guestEmail = context.guestEmail || null;
        
        const result = await discountManager.validateCode(code, orderAmount, userId, guestEmail, sessionId);
        
        // Map the result to GraphQL schema
        return {
          valid: result.valid,
          discountCode: result.discountCode ? {
            id: result.discountCode.id,
            code: result.discountCode.code,
            description: result.discountCode.description,
            discountType: result.discountCode.discountType,
            discountValue: result.discountCode.discountValue,
            minimumOrderAmount: result.discountCode.minimumOrderAmount,
            usageLimit: result.discountCode.usageLimit,
            usageCount: result.discountCode.usageCount,
            validFrom: result.discountCode.validFrom,
            validUntil: result.discountCode.validUntil,
            active: result.discountCode.active,
            createdAt: result.discountCode.createdAt,
            updatedAt: result.discountCode.updatedAt
          } : null,
          discountAmount: result.discountAmount,
          message: result.message
        };
      } catch (error) {
        console.error('❌ Error validating discount code:', error);
        return {
          valid: false,
          discountCode: null,
          discountAmount: 0,
          message: 'Error validating discount code'
        };
      }
    },

    getAllDiscountCodes: async () => {
      try {
        console.log('📋 Fetching all discount codes');
        const codes = await discountManager.getAllDiscountCodes();
        
        // Map database fields to GraphQL schema
        return codes.map(code => ({
          id: code.id,
          code: code.code,
          description: code.description,
          discountType: code.discount_type,
          discountValue: parseFloat(code.discount_value),
          minimumOrderAmount: parseFloat(code.minimum_order_amount),
          usageLimit: code.usage_limit,
          usageCount: code.usage_count,
          validFrom: code.valid_from,
          validUntil: code.valid_until,
          active: code.active,
          createdAt: code.created_at,
          updatedAt: code.updated_at
        }));
      } catch (error) {
        console.error('❌ Error fetching discount codes:', error);
        throw new Error('Failed to fetch discount codes');
      }
    },

    getDiscountCodeStats: async (_, { codeId }) => {
      try {
        console.log('📊 Fetching discount code stats for:', codeId);
        return await discountManager.getDiscountStats(codeId);
      } catch (error) {
        console.error('❌ Error fetching discount stats:', error);
        throw new Error('Failed to fetch discount statistics');
      }
    },


    getAllUsers: async (_, args, context) => {
      try {
        const { user } = context;
        if (!user) {
          throw new AuthenticationError('Authentication required');
        }

        // Admin authentication required
        requireAdminAuth(user);

        console.log('📋 Fetching all users using admin API...');
        const client = supabaseClient.getServiceClient();
        
        // Use Supabase Admin API to list users with pagination to get ALL users
        let allUsers = [];
        let page = 1;
        const perPage = 1000; // Max per page
        
        while (true) {
          const { data: authData, error: authError } = await client.auth.admin.listUsers({
            page: page,
            perPage: perPage
          });
          
          if (authError) {
            console.error('❌ Error fetching auth users:', authError);
            throw new Error('Failed to fetch users from auth');
          }
          
          if (!authData.users || authData.users.length === 0) {
            break; // No more users
          }
          
          allUsers = allUsers.concat(authData.users);
          
          // If we got less than perPage, we've reached the end
          if (authData.users.length < perPage) {
            break;
          }
          
          page++;
        }
        
        console.log(`📊 Total users found across all pages: ${allUsers.length}`);
        const authUsers = allUsers;

        // Get user profiles for additional info including wholesale status
        const { data: profiles, error: profileError } = await client
          .from('user_profiles')
          .select('user_id, first_name, last_name, company_name, is_wholesale_customer, wholesale_status');
        
        if (profileError) {
          console.warn('⚠️ Error fetching user profiles:', profileError);
        }

        // Create profile lookup map
        const profileMap = new Map(
          (profiles || []).map(p => [p.user_id, p])
        );

        // Format users for GraphQL response
        const formattedUsers = authUsers.map(user => {
          const profile = profileMap.get(user.id);
          
          // Prioritize user_profiles data (like credit transactions do) to ensure consistency
          const firstName = profile?.first_name || user.user_metadata?.first_name || null;
          const lastName = profile?.last_name || user.user_metadata?.last_name || null;
          
          return {
            id: user.id,
            email: user.email,
            firstName: firstName,
            lastName: lastName,
            company: profile?.company_name || null,
            createdAt: user.created_at,
            lastSignIn: user.last_sign_in_at
          };
        });

        console.log(`✅ Successfully fetched ${formattedUsers.length} users (including wholesale customers)`);
        console.log('📊 Sample formatted users:', formattedUsers.slice(0, 3).map(u => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim()
        })));
        return formattedUsers;
      } catch (error) {
        console.error('❌ Error fetching all users:', error);
        throw new Error('Failed to fetch users');
      }
    },

    getUserProfile: async (_, { userId }) => {
      try {
        console.log('👤 Fetching user profile for:', userId);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Profile service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Fetch user profile
        const { data: profile, error } = await client
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No profile found - this is normal for new users
            console.log('⚠️ No profile found for user:', userId);
            return null;
          }
          console.error('❌ Error fetching user profile:', error);
          throw new Error(`Failed to fetch profile: ${error.message}`);
        }

        console.log('✅ Successfully fetched user profile');
        
        return {
          id: profile.id,
          userId: profile.user_id,
          firstName: profile.first_name,
          lastName: profile.last_name,
          displayName: profile.display_name,
          bio: profile.bio,
          profilePhotoUrl: profile.profile_photo_url,
          bannerImageUrl: profile.banner_image_url,
          profilePhotoPublicId: profile.profile_photo_public_id,
          bannerImagePublicId: profile.banner_image_public_id,
          companyName: profile.company_name,
          isWholesaleCustomer: profile.is_wholesale_customer || false,
          wholesaleMonthlyCustomers: profile.wholesale_monthly_customers,
          wholesaleOrderingFor: profile.wholesale_ordering_for,
          wholesaleFitExplanation: profile.wholesale_fit_explanation,
          wholesaleStatus: profile.wholesale_status,
          wholesaleApprovedAt: profile.wholesale_approved_at,
          wholesaleApprovedBy: profile.wholesale_approved_by,
          isTaxExempt: profile.is_tax_exempt || false,
          taxExemptId: profile.tax_exempt_id,
          taxExemptReason: profile.tax_exempt_reason,
          taxExemptExpiresAt: profile.tax_exempt_expires_at,
          taxExemptUpdatedAt: profile.tax_exempt_updated_at,
          taxExemptUpdatedBy: profile.tax_exempt_updated_by,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        };
      } catch (error) {
        console.error('❌ Error in getUserProfile:', error);
        throw new Error(error.message);
      }
    },

    // Creator queries
    getCreatorByUserId: async (_, { userId }) => {
      try {
        console.log('🎨 Fetching creator for user:', userId);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Creator service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Fetch creator data
        const { data: creator, error } = await client
          .from('creators')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No creator found - user is not a creator
            console.log('⚠️ No creator found for user:', userId);
            return null;
          }
          throw new Error(`Failed to fetch creator: ${error.message}`);
        }

        console.log('✅ Creator found:', creator.creator_name);
        
        return {
          id: creator.id,
          userId: creator.user_id,
          creatorName: creator.creator_name,
          email: creator.email,
          isActive: creator.is_active,
          totalProducts: creator.total_products || 0,
          createdAt: creator.created_at,
          updatedAt: creator.updated_at
        };
      } catch (error) {
        console.error('❌ Error in getCreatorByUserId:', error);
        throw new Error(error.message);
      }
    },

    getCreatorSalesStats: async (_, { creatorId }) => {
      try {
        console.log('📊 Fetching creator sales stats for:', creatorId);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Creator service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Get creator's products
        const { data: products, error: productsError } = await client
          .from('marketplace_products')
          .select('*')
          .eq('creator_id', creatorId)
          .eq('is_active', true);

        if (productsError) {
          throw new Error(`Failed to fetch creator products: ${productsError.message}`);
        }

        // For now, return mock data since we need to implement order tracking for marketplace products
        // This will be implemented when marketplace orders are tracked
        const mockStats = {
          totalSales: 0,
          totalRevenue: 0.0,
          totalProducts: products ? products.length : 0,
          soldProducts: [],
          recentSales: []
        };

        console.log('✅ Creator stats fetched');
        return mockStats;
      } catch (error) {
        console.error('❌ Error in getCreatorSalesStats:', error);
        throw new Error(error.message);
      }
    },

    // Admin wholesale queries
    getPendingWholesaleApplications: async (_, args, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        console.log('🏪 Fetching pending wholesale applications');
        
        if (!supabaseClient.isReady()) {
          throw new Error('Profile service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Get all wholesale customers with pending status
        const { data: profiles, error } = await client
          .from('user_profiles')
          .select('*')
          .eq('is_wholesale_customer', true)
          .eq('wholesale_status', 'pending')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching pending wholesale applications:', error);
          throw new Error(`Failed to fetch applications: ${error.message}`);
        }

        console.log(`✅ Found ${profiles?.length || 0} pending wholesale applications`);
        
        // Get emails for all user IDs
        const userIds = profiles?.map(p => p.user_id) || [];
        let emailMap = {};
        
        if (userIds.length > 0) {
          try {
            const { data: authUsers, error: authError } = await client
              .from('auth.users')
              .select('id, email')
              .in('id', userIds);
            
            if (authError) {
              console.warn('⚠️ Could not fetch emails from auth.users:', authError);
            } else {
              emailMap = authUsers?.reduce((map, user) => {
                map[user.id] = user.email;
                return map;
              }, {}) || {};
            }
          } catch (emailError) {
            console.warn('⚠️ Error fetching emails:', emailError);
          }
        }
        
        return (profiles || []).map(profile => ({
          id: profile.id,
          userId: profile.user_id,
          firstName: profile.first_name,
          lastName: profile.last_name,
          email: emailMap[profile.user_id] || profile.email || 'No email',
          displayName: profile.display_name,
          bio: profile.bio,
          profilePhotoUrl: profile.profile_photo_url,
          bannerImageUrl: profile.banner_image_url,
          profilePhotoPublicId: profile.profile_photo_public_id,
          bannerImagePublicId: profile.banner_image_public_id,
          companyName: profile.company_name,
          isWholesaleCustomer: profile.is_wholesale_customer,
          wholesaleCreditRate: profile.wholesale_credit_rate,
          wholesaleMonthlyCustomers: profile.wholesale_monthly_customers,
          wholesaleOrderingFor: profile.wholesale_ordering_for,
          wholesaleFitExplanation: profile.wholesale_fit_explanation,
          wholesaleStatus: profile.wholesale_status,
          wholesaleApprovedAt: profile.wholesale_approved_at,
          wholesaleApprovedBy: profile.wholesale_approved_by,
          isTaxExempt: profile.is_tax_exempt || false,
          taxExemptId: profile.tax_exempt_id,
          taxExemptReason: profile.tax_exempt_reason,
          taxExemptExpiresAt: profile.tax_exempt_expires_at,
          taxExemptUpdatedAt: profile.tax_exempt_updated_at,
          taxExemptUpdatedBy: profile.tax_exempt_updated_by,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        }));
      } catch (error) {
        console.error('❌ Error in getPendingWholesaleApplications:', error);
        throw new Error(error.message);
      }
    },

    getAllWholesaleCustomers: async (_, args, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        console.log('🏪 Fetching all wholesale customers');
        
        if (!supabaseClient.isReady()) {
          throw new Error('Profile service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Get all wholesale customers (any status)
        const { data: profiles, error } = await client
          .from('user_profiles')
          .select('*')
          .eq('is_wholesale_customer', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching wholesale customers:', error);
          throw new Error(`Failed to fetch customers: ${error.message}`);
        }

        console.log(`✅ Found ${profiles?.length || 0} wholesale customers`);
        
        // Get emails for all user IDs
        const userIds = profiles?.map(p => p.user_id) || [];
        let emailMap = {};
        
        if (userIds.length > 0) {
          try {
            const { data: authUsers, error: authError } = await client
              .from('auth.users')
              .select('id, email')
              .in('id', userIds);
            
            if (authError) {
              console.warn('⚠️ Could not fetch emails from auth.users:', authError);
            } else {
              emailMap = authUsers?.reduce((map, user) => {
                map[user.id] = user.email;
                return map;
              }, {}) || {};
            }
          } catch (emailError) {
            console.warn('⚠️ Error fetching emails:', emailError);
          }
        }
        
        return (profiles || []).map(profile => ({
          id: profile.id,
          userId: profile.user_id,
          firstName: profile.first_name,
          lastName: profile.last_name,
          email: emailMap[profile.user_id] || profile.email || 'No email',
          displayName: profile.display_name,
          bio: profile.bio,
          profilePhotoUrl: profile.profile_photo_url,
          bannerImageUrl: profile.banner_image_url,
          profilePhotoPublicId: profile.profile_photo_public_id,
          bannerImagePublicId: profile.banner_image_public_id,
          companyName: profile.company_name,
          isWholesaleCustomer: profile.is_wholesale_customer,
          wholesaleCreditRate: profile.wholesale_credit_rate,
          wholesaleMonthlyCustomers: profile.wholesale_monthly_customers,
          wholesaleOrderingFor: profile.wholesale_ordering_for,
          wholesaleFitExplanation: profile.wholesale_fit_explanation,
          wholesaleStatus: profile.wholesale_status,
          wholesaleApprovedAt: profile.wholesale_approved_at,
          wholesaleApprovedBy: profile.wholesale_approved_by,
          isTaxExempt: profile.is_tax_exempt || false,
          taxExemptId: profile.tax_exempt_id,
          taxExemptReason: profile.tax_exempt_reason,
          taxExemptExpiresAt: profile.tax_exempt_expires_at,
          taxExemptUpdatedAt: profile.tax_exempt_updated_at,
          taxExemptUpdatedBy: profile.tax_exempt_updated_by,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        }));
      } catch (error) {
        console.error('❌ Error in getAllWholesaleCustomers:', error);
        throw new Error(error.message);
      }
    },

    // Wholesale client management queries
    getWholesaleClients: async (_, { userId }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        console.log('🏪 Fetching wholesale clients for user:', userId);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Client service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Get all clients for this wholesale user
        const { data: clients, error } = await client
          .from('wholesale_clients')
          .select('*')
          .eq('wholesale_user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching wholesale clients:', error);
          throw new Error(`Failed to fetch clients: ${error.message}`);
        }

        console.log(`✅ Found ${clients?.length || 0} wholesale clients`);
        
        // For each client, get their order count and total spent
        const clientsWithStats = await Promise.all((clients || []).map(async (clientRecord) => {
          try {
                         // Get order statistics for this client
             const { data: orders, error: ordersError } = await client
               .from('orders_main')
               .select('total_price')
               .eq('wholesale_client_id', clientRecord.id);

            if (ordersError) {
              console.warn('⚠️ Error fetching orders for client:', clientRecord.id, ordersError);
            }

            const orderCount = orders?.length || 0;
            const totalSpent = orders?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;

            return {
              id: clientRecord.id,
              wholesaleUserId: clientRecord.wholesale_user_id,
              clientName: clientRecord.client_name,
              clientEmail: clientRecord.client_email,
              clientPhone: clientRecord.client_phone,
              clientCompany: clientRecord.client_company,
              clientAddress: clientRecord.client_address,
              notes: clientRecord.notes,
              isActive: clientRecord.is_active,
              createdAt: clientRecord.created_at,
              updatedAt: clientRecord.updated_at,
              orderCount,
              totalSpent
            };
          } catch (err) {
            console.warn('⚠️ Error processing client stats:', err);
            return {
              id: clientRecord.id,
              wholesaleUserId: clientRecord.wholesale_user_id,
              clientName: clientRecord.client_name,
              clientEmail: clientRecord.client_email,
              clientPhone: clientRecord.client_phone,
              clientCompany: clientRecord.client_company,
              clientAddress: clientRecord.client_address,
              notes: clientRecord.notes,
              isActive: clientRecord.is_active,
              createdAt: clientRecord.created_at,
              updatedAt: clientRecord.updated_at,
              orderCount: 0,
              totalSpent: 0
            };
          }
        }));
        
        return clientsWithStats;
      } catch (error) {
        console.error('❌ Error in getWholesaleClients:', error);
        throw new Error(error.message);
      }
    },

    getClientOrders: async (_, { clientId }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        console.log('📦 Fetching orders for client:', clientId);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
                 // Get all orders for this client
         const { data: orders, error } = await client
           .from('orders_main')
           .select('*')
           .eq('wholesale_client_id', clientId)
           .order('order_created_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching client orders:', error);
          throw new Error(`Failed to fetch orders: ${error.message}`);
        }

        console.log(`✅ Found ${orders?.length || 0} orders for client`);
        
        // Transform the orders to match the CustomerOrder type
        const transformedOrders = await Promise.all((orders || []).map(async (order) => {
          try {
                         // Get order items
             const { data: items, error: itemsError } = await client
               .from('order_items_new')
               .select('*')
               .eq('order_id', order.id);

            if (itemsError) {
              console.warn('⚠️ Error fetching items for order:', order.id, itemsError);
            }

            // Get order proofs
            const { data: proofs, error: proofsError } = await client
              .from('order_proofs')
              .select('*')
              .eq('order_id', order.id);

            if (proofsError) {
              console.warn('⚠️ Error fetching proofs for order:', order.id, proofsError);
            }

            return {
              id: order.id,
              userId: order.user_id,
              guestEmail: order.guest_email,
              stripePaymentIntentId: order.stripe_payment_intent_id,
              stripeCheckoutSessionId: order.stripe_checkout_session_id,
              orderNumber: order.order_number,
              orderStatus: order.order_status,
              fulfillmentStatus: order.fulfillment_status,
              financialStatus: order.financial_status,
              trackingNumber: order.tracking_number,
              trackingCompany: order.tracking_company,
              trackingUrl: order.tracking_url,
              subtotalPrice: order.subtotal_price,
              totalTax: order.total_tax,
              totalPrice: order.total_price,
              currency: order.currency,
              customerFirstName: order.customer_first_name,
              customerLastName: order.customer_last_name,
              customerEmail: order.customer_email,
              customerPhone: order.customer_phone,
              shippingAddress: order.shipping_address,
              billingAddress: order.billing_address,
              shipping_method: order.shipping_method,
              is_express_shipping: order.is_express_shipping,
              is_rush_order: order.is_rush_order,
              is_blind_shipment: order.is_blind_shipment,
              orderTags: order.order_tags,
              orderNote: order.order_note,
              orderCreatedAt: order.order_created_at,
              orderUpdatedAt: order.order_updated_at,
              createdAt: order.created_at,
              updatedAt: order.updated_at,
              items: (items || []).map(item => ({
                id: item.id,
                customerOrderId: item.order_id,
                stripeLineItemId: item.stripe_line_item_id,
                productId: item.product_id,
                productName: item.product_name,
                productCategory: item.product_category,
                sku: item.sku,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                totalPrice: item.total_price,
                calculatorSelections: item.calculator_selections,
                customFiles: item.custom_files,
                customerNotes: item.customer_notes,
                instagramHandle: item.instagram_handle,
                instagramOptIn: item.instagram_opt_in,
                fulfillmentStatus: item.fulfillment_status,
                createdAt: item.created_at,
                updatedAt: item.updated_at,
                customerReplacementFile: item.customer_replacement_file,
                customerReplacementFileName: item.customer_replacement_file_name,
                customerReplacementAt: item.customer_replacement_at,
                is_additional_payment: Boolean(item.is_additional_payment)
              })),
              proofs: (proofs || []).map(proof => ({
                id: proof.id,
                orderId: proof.order_id,
                proofUrl: proof.proof_url,
                proofPublicId: proof.proof_public_id,
                proofTitle: proof.proof_title,
                uploadedAt: proof.uploaded_at,
                uploadedBy: proof.uploaded_by,
                status: proof.status,
                customerNotes: proof.customer_notes,
                adminNotes: proof.admin_notes,
                cutLines: proof.cut_lines,
                replaced: proof.replaced,
                replacedAt: proof.replaced_at,
                originalFileName: proof.original_file_name
              })),
              proof_status: order.proof_status,
              proof_sent_at: order.proof_sent_at,
              proof_link: order.proof_link,
              discountCode: order.discount_code,
              discountAmount: order.discount_amount,
              wholesaleClientId: order.wholesale_client_id
            };
          } catch (err) {
            console.warn('⚠️ Error processing order:', order.id, err);
            return null;
          }
        }));

        return transformedOrders.filter(order => order !== null);
      } catch (error) {
        console.error('❌ Error in getClientOrders:', error);
        throw new Error(error.message);
      }
    },

    // Wholesale analytics queries
    getWholesaleAnalytics: async (_, args, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        console.log('📊 Fetching wholesale analytics');
        
        if (!supabaseClient.isReady()) {
          throw new Error('Analytics service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Get all wholesale customers
        const { data: wholesaleCustomers, error: customersError } = await client
          .from('user_profiles')
          .select('*')
          .eq('is_wholesale_customer', true);

        if (customersError) {
          throw new Error(`Failed to fetch wholesale customers: ${customersError.message}`);
        }

        const totalWholesaleCustomers = wholesaleCustomers?.length || 0;
        
        // Get all orders from wholesale customers
        const wholesaleUserIds = wholesaleCustomers?.map(c => c.user_id) || [];
        
        let totalWholesaleRevenue = 0;
        let totalOrders = 0;
        let monthlyRevenue = 0;
        let monthlyOrders = 0;
        
        if (wholesaleUserIds.length > 0) {
          const { data: orders, error: ordersError } = await client
            .from('orders_main')
            .select('total_price, order_created_at, user_id')
            .in('user_id', wholesaleUserIds)
            .eq('financial_status', 'paid');

          if (ordersError) {
            console.warn('⚠️ Error fetching wholesale orders:', ordersError);
          } else {
            totalOrders = orders?.length || 0;
            totalWholesaleRevenue = orders?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;
            
            // Calculate monthly metrics (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const monthlyOrdersData = orders?.filter(order => 
              new Date(order.order_created_at) >= thirtyDaysAgo
            ) || [];
            
            monthlyOrders = monthlyOrdersData.length;
            monthlyRevenue = monthlyOrdersData.reduce((sum, order) => sum + (order.total_price || 0), 0);
          }
        }

        // Calculate credit rate distribution
        const creditRateDistribution = {};
        wholesaleCustomers?.forEach(customer => {
          const rate = customer.wholesale_credit_rate || 0.05;
          creditRateDistribution[rate] = (creditRateDistribution[rate] || 0) + 1;
        });

        const creditRateDistributionArray = Object.entries(creditRateDistribution).map(([rate, count]) => ({
          creditRate: parseFloat(rate),
          customerCount: count,
          percentage: totalWholesaleCustomers > 0 ? (count / totalWholesaleCustomers) * 100 : 0
        }));

        // Calculate growth rate (simple month-over-month)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let previousMonthRevenue = 0;
        if (wholesaleUserIds.length > 0) {
          const { data: previousOrders, error: prevOrdersError } = await client
            .from('orders_main')
            .select('total_price, order_created_at')
            .in('user_id', wholesaleUserIds)
            .eq('financial_status', 'paid')
            .gte('order_created_at', sixtyDaysAgo.toISOString())
            .lt('order_created_at', thirtyDaysAgo.toISOString());

          if (!prevOrdersError) {
            previousMonthRevenue = previousOrders?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;
          }
        }

        const growthRate = previousMonthRevenue > 0 
          ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
          : 0;

        const averageOrderValue = totalOrders > 0 ? totalWholesaleRevenue / totalOrders : 0;

        console.log('✅ Wholesale analytics calculated');
        
        return {
          totalWholesaleCustomers,
          totalWholesaleRevenue,
          averageOrderValue,
          totalOrders,
          monthlyRevenue,
          monthlyOrders,
          growthRate,
          creditRateDistribution: creditRateDistributionArray
        };
      } catch (error) {
        console.error('❌ Error in getWholesaleAnalytics:', error);
        throw new Error(error.message);
      }
    },

    getWholesaleTopPerformers: async (_, { limit = 10 }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        console.log('🏆 Fetching wholesale top performers');
        
        if (!supabaseClient.isReady()) {
          throw new Error('Analytics service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Get all wholesale customers
        const { data: wholesaleCustomers, error: customersError } = await client
          .from('user_profiles')
          .select('*')
          .eq('is_wholesale_customer', true);

        if (customersError) {
          throw new Error(`Failed to fetch wholesale customers: ${customersError.message}`);
        }

        // Calculate performance metrics for each customer
        const performersWithStats = await Promise.all((wholesaleCustomers || []).map(async (customer) => {
          try {
            const { data: orders, error: ordersError } = await client
              .from('orders_main')
              .select('total_price, order_created_at')
              .eq('user_id', customer.user_id)
              .eq('financial_status', 'paid');

            if (ordersError) {
              console.warn('⚠️ Error fetching orders for customer:', customer.user_id, ordersError);
              return null;
            }

            const totalOrders = orders?.length || 0;
            const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;
            const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
            
            // Get last order date
            const lastOrderDate = orders?.length > 0 
              ? orders.reduce((latest, order) => 
                  new Date(order.order_created_at) > new Date(latest) ? order.order_created_at : latest, 
                  orders[0].order_created_at
                )
              : null;

            // Calculate monthly revenue (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const monthlyOrdersData = orders?.filter(order => 
              new Date(order.order_created_at) >= thirtyDaysAgo
            ) || [];
            
            const monthlyRevenue = monthlyOrdersData.reduce((sum, order) => sum + (order.total_price || 0), 0);

            return {
              id: customer.id,
              userId: customer.user_id,
              firstName: customer.first_name,
              lastName: customer.last_name,
              companyName: customer.company_name,
              totalOrders,
              totalRevenue,
              averageOrderValue,
              creditRate: customer.wholesale_credit_rate || 0.05,
              lastOrderDate,
              monthlyRevenue
            };
          } catch (err) {
            console.warn('⚠️ Error processing customer stats:', err);
            return null;
          }
        }));

        // Filter out null results and sort by total revenue
        const validPerformers = performersWithStats
          .filter(performer => performer !== null)
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, limit);

        console.log(`✅ Found ${validPerformers.length} top performers`);
        
        return validPerformers;
      } catch (error) {
        console.error('❌ Error in getWholesaleTopPerformers:', error);
        throw new Error(error.message);
      }
    },
    
    // Blog query resolvers
    blog_posts: async (_, { limit, offset, where, order_by }) => {
      try {
        console.log('🔍 blog_posts query called with:', { limit, offset, where, order_by });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Blog service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        let query = client.from('blog_posts').select('*');
        
        // Apply where conditions
        if (where) {
          if (where.published && where.published._eq !== undefined) {
            query = query.eq('published', where.published._eq);
          }
          if (where.category && where.category._eq) {
            query = query.eq('category', where.category._eq);
          }
          if (where.slug && where.slug._eq) {
            query = query.eq('slug', where.slug._eq);
          }
        }
        
        // Apply ordering
        if (order_by) {
          if (order_by.created_at) {
            query = query.order('created_at', { ascending: order_by.created_at === 'asc' });
          } else if (order_by.published_at) {
            query = query.order('published_at', { ascending: order_by.published_at === 'asc' });
          }
        } else {
          // Default ordering
          query = query.order('created_at', { ascending: false });
        }
        
        // Apply limit and offset
        if (limit) query = query.limit(limit);
        if (offset) query = query.range(offset, offset + (limit || 10) - 1);
        
        const { data, error } = await query;
        
        if (error) {
          console.error('❌ Error fetching blog posts:', error);
          throw new Error(error.message);
        }
        
        console.log('✅ Fetched blog posts:', data?.length || 0);
        return data || [];
      } catch (error) {
        console.error('❌ Error in blog_posts resolver:', error);
        throw error;
      }
    },
    
    blog_posts_aggregate: async (_, { where }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Blog service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        let query = client.from('blog_posts').select('id', { count: 'exact', head: true });
        
        // Apply where conditions
        if (where) {
          if (where.published && where.published._eq !== undefined) {
            query = query.eq('published', where.published._eq);
          }
          if (where.category && where.category._eq) {
            query = query.eq('category', where.category._eq);
          }
        }
        
        const { count, error } = await query;
        
        if (error) {
          console.error('❌ Error fetching blog posts aggregate:', error);
          throw new Error(error.message);
        }
        
        return {
          aggregate: {
            count: count || 0
          }
        };
      } catch (error) {
        console.error('❌ Error in blog_posts_aggregate resolver:', error);
        throw error;
      }
    },
    
    blog_posts_by_pk: async (_, { id }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Blog service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        const { data, error } = await client
          .from('blog_posts')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          console.error('❌ Error fetching blog post by pk:', error);
          return null;
        }
        
        return data;
      } catch (error) {
        console.error('❌ Error in blog_posts_by_pk resolver:', error);
        throw error;
      }
    },
    
    blog_categories: async (_, { order_by }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Blog service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        let query = client.from('blog_categories').select('*');
        
        // Apply ordering
        if (order_by && order_by.name) {
          query = query.order('name', { ascending: order_by.name === 'asc' });
        } else {
          query = query.order('name', { ascending: true });
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('❌ Error fetching blog categories:', error);
          throw new Error(error.message);
        }
        
        return data || [];
      } catch (error) {
        console.error('❌ Error in blog_categories resolver:', error);
        throw error;
      }
    },

    // Klaviyo Queries
    getKlaviyoSubscriptionStatus: async (_, { email, listId }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const isSubscribed = await klaviyoClient.isSubscribedToList(email, listId);
        const profile = await klaviyoClient.getProfileByEmail(email);
        
        return {
          isSubscribed,
          profileId: profile?.id || null,
          error: null
        };
      } catch (error) {
        console.error('Error checking Klaviyo subscription status:', error);
        return {
          isSubscribed: false,
          profileId: null,
          error: error.message
        };
      }
    },

    getKlaviyoLists: async (_, args, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const lists = await klaviyoClient.getLists();
        return lists.map(list => ({
          id: list.id,
          name: list.attributes?.name || 'Unnamed List',
          created: list.attributes?.created || null,
          updated: list.attributes?.updated || null
        }));
      } catch (error) {
        console.error('Error fetching Klaviyo lists:', error);
        return [];
      }
    },

    getKlaviyoConfiguredLists: async (_, args, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        return klaviyoClient.getConfiguredLists();
      } catch (error) {
        console.error('Error getting configured Klaviyo lists:', error);
        return {
          success: false,
          lists: [],
          error: error.message
        };
      }
    },

    getKlaviyoProfiles: async (_, { limit, cursor }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const result = await klaviyoClient.getAllProfiles(limit, cursor);
        return {
          success: result.success,
          profiles: result.profiles.map(profile => ({
            id: profile.id,
            email: profile.attributes?.email || '',
            firstName: profile.attributes?.first_name || '',
            lastName: profile.attributes?.last_name || '',
            phone: profile.attributes?.phone_number || '',
            city: profile.attributes?.location?.city || '',
            state: profile.attributes?.location?.region || '',
            country: profile.attributes?.location?.country || '',
            totalOrders: profile.attributes?.properties?.total_orders || 0,
            totalSpent: profile.attributes?.properties?.total_spent || 0,
            averageOrderValue: profile.attributes?.properties?.average_order_value || 0,
            firstOrderDate: profile.attributes?.properties?.first_order_date || null,
            lastOrderDate: profile.attributes?.properties?.last_order_date || null,
            createdAt: profile.attributes?.created || null,
            updatedAt: profile.attributes?.updated || null
          })),
          nextCursor: result.nextCursor,
          total: result.total,
          error: result.error || null
        };
      } catch (error) {
        console.error('Error getting Klaviyo profiles:', error);
        return {
          success: false,
          profiles: [],
          nextCursor: null,
          total: 0,
          error: error.message
        };
      }
    },

    getKlaviyoProfilesFromAllLists: async (_, { limit }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const result = await klaviyoClient.getProfilesFromAllLists(limit);
        return {
          success: result.success,
          profiles: result.allProfiles.map(profile => ({
            id: profile.id,
            email: profile.attributes?.email || '',
            firstName: profile.attributes?.first_name || '',
            lastName: profile.attributes?.last_name || '',
            phone: profile.attributes?.phone_number || '',
            city: profile.attributes?.location?.city || '',
            state: profile.attributes?.location?.region || '',
            country: profile.attributes?.location?.country || '',
            totalOrders: profile.attributes?.properties?.total_orders || 0,
            totalSpent: profile.attributes?.properties?.total_spent || 0,
            averageOrderValue: profile.attributes?.properties?.average_order_value || 0,
            firstOrderDate: profile.attributes?.properties?.first_order_date || null,
            lastOrderDate: profile.attributes?.properties?.last_order_date || null,
            createdAt: profile.attributes?.created || null,
            updatedAt: profile.attributes?.updated || null,
            listMembership: profile.listMembership || []
          })),
          totalProfiles: result.totalProfiles,
          uniqueProfiles: result.uniqueProfiles,
          profilesByList: Object.entries(result.profilesByList).map(([listType, data]) => ({
            listType,
            listId: data.listId,
            count: data.count
          })),
          errors: result.errors || []
        };
      } catch (error) {
        console.error('Error getting profiles from all Klaviyo lists:', error);
        return {
          success: false,
          profiles: [],
          totalProfiles: 0,
          uniqueProfiles: 0,
          profilesByList: [],
          errors: [{ error: error.message }]
        };
      }
    },

    getAllSitewideAlerts: async (_, args, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Alert service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        const { data: alerts, error } = await client
          .from('sitewide_alerts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching all alerts:', error);
          throw new Error('Failed to fetch alerts');
        }

        return (alerts || []).map(alert => ({
          id: String(alert.id),
          title: alert.title,
          message: alert.message,
          backgroundColor: alert.background_color,
          textColor: alert.text_color,
          linkUrl: alert.link_url,
          linkText: alert.link_text,
          isActive: alert.is_active,
          startDate: alert.start_date,
          endDate: alert.end_date,
          createdAt: alert.created_at,
          updatedAt: alert.updated_at,
          createdBy: alert.created_by
        }));
      } catch (error) {
        console.error('Error fetching all sitewide alerts:', error);
        throw new Error(error.message);
      }
    },

    // Shared cart queries
    getSharedCart: async (_, { shareId }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Database service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Get shared cart
        const { data: sharedCart, error } = await client
          .from('shared_carts')
          .select('*')
          .eq('share_id', shareId)
          .single();

        if (error) {
          console.error('❌ Error retrieving shared cart:', error);
          throw new Error('Shared cart not found');
        }

        // Check if expired
        if (sharedCart.expires_at && new Date(sharedCart.expires_at) < new Date()) {
          throw new Error('Shared cart has expired');
        }

        // Update access count and last access time
        await client
          .from('shared_carts')
          .update({
            access_count: sharedCart.access_count + 1,
            last_access_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('share_id', shareId);

        console.log('✅ Successfully retrieved shared cart:', shareId);
        
        return {
          success: true,
          sharedCart: {
            id: sharedCart.id,
            shareId: sharedCart.share_id,
            cartData: sharedCart.cart_data,
            createdBy: sharedCart.created_by,
            createdAt: sharedCart.created_at,
            expiresAt: sharedCart.expires_at,
            accessCount: sharedCart.access_count + 1,
            lastAccessAt: new Date().toISOString()
          }
        };
      } catch (error) {
        console.error('❌ Error in getSharedCart:', error);
        return { success: false, error: error.message };
      }
    },

    // Get all shared carts (admin only)
    getAllSharedCarts: async (_, { offset = 0, limit = 20 }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Database service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Get total count first
        const { count: totalCount, error: countError } = await client
          .from('shared_carts')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          console.error('❌ Error getting shared carts count:', countError);
          throw new Error('Failed to get shared carts count');
        }

        // Get shared carts with pagination
        const { data: sharedCarts, error } = await client
          .from('shared_carts')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error('❌ Error retrieving shared carts:', error);
          throw new Error('Failed to retrieve shared carts');
        }

        console.log(`✅ Successfully retrieved ${sharedCarts.length} shared carts (${totalCount} total)`);
        
        return {
          success: true,
          sharedCarts: sharedCarts.map(cart => ({
            id: cart.id,
            shareId: cart.share_id,
            cartData: cart.cart_data,
            createdBy: cart.created_by,
            createdAt: cart.created_at,
            expiresAt: cart.expires_at,
            accessCount: cart.access_count,
            lastAccessAt: cart.last_access_at
          })),
          totalCount: totalCount || 0
        };
      } catch (error) {
        console.error('❌ Error in getAllSharedCarts:', error);
        return { success: false, sharedCarts: [], totalCount: 0, error: error.message };
      }
    },

    // Credit queries
    getUserCreditBalance: async (_, { userId }) => {
      try {
        const balance = await creditHandlers.getUserCreditBalance(userId);
        // Get recent transactions to include with balance
        const history = await creditHandlers.getUserCreditHistory(userId);
        const transactions = history?.transactions || [];
        
        return {
          ...balance,
          transactions: transactions.slice(0, 10) // Include last 10 transactions
        };
      } catch (error) {
        console.error('❌ Error getting credit balance:', error);
        return { balance: 0, transactionCount: 0, lastTransactionDate: null, transactions: [] };
      }
    },

    getUserCreditHistory: async (_, { userId, limit = 10 }) => {
      try {
        const history = await creditHandlers.getUserCreditHistory(userId);
        // Return just the transactions array, limited by the limit parameter
        return (history?.transactions || []).slice(0, limit);
      } catch (error) {
        console.error('❌ Error getting credit history:', error);
        return [];
      }
    },

    getUnreadCreditNotifications: async (_, { userId }) => {
      try {
        const notifications = await creditHandlers.getUnreadCreditNotifications(userId);
        return notifications;
      } catch (error) {
        console.error('❌ Error getting credit notifications:', error);
        return [];
      }
    },

    validateCreditApplication: async (_, { userId, orderSubtotal, requestedCredits }) => {
      try {
        const validation = await creditHandlers.validateCreditApplication(userId, orderSubtotal, requestedCredits);
        return validation;
      } catch (error) {
        console.error('❌ Error validating credit application:', error);
        return {
          valid: false,
          message: 'Error validating credits',
          maxApplicable: 0
        };
      }
    },

    getAllCreditTransactions: async (_, { limit, offset }, context) => {
      try {
        // Admin authentication required
        const { user } = context;
        if (!user) {
          throw new AuthenticationError('Authentication required');
        }
        requireAdminAuth(user);

        const result = await creditHandlers.getAllCreditTransactions(limit, offset);
        return result;
      } catch (error) {
        console.error('❌ Error getting all credit transactions:', error);
        return {
          transactions: [],
          totalCount: 0
        };
      }
    }
  },

  Mutation: {
    createCustomerOrder: async (_, { input }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        return await supabaseClient.createCustomerOrder(input);
      } catch (error) {
        console.error('Error creating customer order:', error);
        throw new Error(error.message);
      }
    },

    updateOrderStatus: async (_, { orderId, statusUpdate }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        
        // Update the order status
        const updatedOrder = await supabaseClient.updateOrderStatus(orderId, statusUpdate);
        
        if (!updatedOrder) {
          throw new Error('Failed to update order status');
        }
        
        // Send customer email notification if order status changed to specific states
        if (statusUpdate.orderStatus && ['Proof Sent', 'Shipped', 'Delivered', 'Printing', 'Building Proof'].includes(statusUpdate.orderStatus)) {
          try {
            console.log('📧 Sending status update email notification to customer...');
            const emailNotifications = require('./email-notifications');
            
            const emailResult = await emailNotifications.sendOrderStatusNotification(
              updatedOrder, 
              statusUpdate.orderStatus
            );
            
            if (emailResult.success) {
              console.log(`✅ Status update email sent successfully for order ${updatedOrder.order_number}`);
            } else {
              console.error('❌ Status update email failed:', emailResult.error);
            }
          } catch (emailError) {
            console.error('⚠️ Failed to send status update email (status update still processed):', emailError);
          }
        }
        
        return updatedOrder;
      } catch (error) {
        console.error('Error updating order status:', error);
        throw new Error(error.message);
      }
    },

    updateOrderShippingAddress: async (_, { orderId, shippingAddress }) => {
      try {
        console.log('📋 Updating order shipping address:', { orderId, shippingAddress });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Update the order shipping address
        const { data: updatedOrder, error } = await client
          .from('orders_main')
          .update({
            shipping_address: shippingAddress,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error updating order shipping address:', error);
          throw new Error(`Failed to update shipping address: ${error.message}`);
        }

        console.log('✅ Successfully updated order shipping address');
        
        return {
          success: true,
          message: 'Shipping address updated successfully',
          order: {
            id: updatedOrder.id,
            orderNumber: updatedOrder.order_number,
            customerFirstName: updatedOrder.customer_first_name,
            customerLastName: updatedOrder.customer_last_name,
            customerEmail: updatedOrder.customer_email,
            shippingAddress: updatedOrder.shipping_address
          }
        };
      } catch (error) {
        console.error('❌ Error in updateOrderShippingAddress:', error);
        return {
          success: false,
          message: error.message,
          order: null
        };
      }
    },

    markOrderAsDelivered: async (_, { orderId }, { user }) => {
      try {
        // Require admin authentication
        requireAdminAuth(user);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        
        // Get the current order
        const client = supabaseClient.getServiceClient();
        const { data: currentOrder, error: fetchError } = await client
          .from('orders_main')
          .select('*')
          .eq('id', orderId)
          .single();
          
        if (fetchError) {
          throw new Error(`Failed to fetch order: ${fetchError.message}`);
        }
        
        if (!currentOrder) {
          throw new Error('Order not found');
        }
        
        // Update the order status to delivered
        const statusUpdate = {
          orderStatus: 'Delivered',
          fulfillmentStatus: 'fulfilled',
          proof_status: 'delivered'
        };
        
        const { data: updatedOrder, error: updateError } = await client
          .from('orders_main')
          .update({
            order_status: statusUpdate.orderStatus,
            fulfillment_status: statusUpdate.fulfillmentStatus,
            proof_status: statusUpdate.proof_status,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .select(`
            *,
            order_items_new(*)
          `)
          .single();
          
        if (updateError) {
          throw new Error(`Failed to update order status: ${updateError.message}`);
        }
        
        // Send delivered email notification to customer
        try {
          console.log('📧 Sending delivered email notification to customer...');
          const emailNotifications = require('./email-notifications');
          
          const emailResult = await emailNotifications.sendOrderStatusNotification(
            updatedOrder, 
            'Delivered'
          );
          
          if (emailResult.success) {
            console.log(`✅ Delivered email sent successfully for order ${updatedOrder.order_number}`);
          } else {
            console.error('❌ Delivered email failed:', emailResult.error);
          }
        } catch (emailError) {
          console.error('⚠️ Failed to send delivered email (order still marked as delivered):', emailError);
        }
        
        return updatedOrder;
      } catch (error) {
        console.error('Error marking order as delivered:', error);
        throw new Error(error.message);
      }
    },

    markOrderReadyForPickup: async (_, { orderId }, { user }) => {
      try {
        // Require admin authentication
        requireAdminAuth(user);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        
        // Get the current order
        const client = supabaseClient.getServiceClient();
        const { data: currentOrder, error: fetchError } = await client
          .from('orders_main')
          .select('*')
          .eq('id', orderId)
          .single();
          
        if (fetchError) {
          throw new Error(`Failed to fetch order: ${fetchError.message}`);
        }
        
        if (!currentOrder) {
          throw new Error('Order not found');
        }
        
        // Check if this is a local pickup order
        if (!currentOrder.shipping_method || !currentOrder.shipping_method.includes('Local Pickup')) {
          throw new Error('This order is not a local pickup order');
        }
        
        // Update the order status to ready for pickup
        const statusUpdate = {
          orderStatus: 'Ready for Pickup',
          fulfillmentStatus: 'fulfilled',
          proof_status: 'ready_for_pickup'
        };
        
        const { data: updatedOrder, error: updateError } = await client
          .from('orders_main')
          .update({
            order_status: statusUpdate.orderStatus,
            fulfillment_status: statusUpdate.fulfillmentStatus,
            proof_status: statusUpdate.proof_status,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .select(`
            *,
            order_items_new(*)
          `)
          .single();
          
        if (updateError) {
          throw new Error(`Failed to update order status: ${updateError.message}`);
        }
        
        // Send pickup ready email notification to customer
        try {
          console.log('📧 Sending pickup ready email notification to customer...');
          const emailNotifications = require('./email-notifications');
          
          const emailResult = await emailNotifications.sendPickupReadyNotification(updatedOrder);
          
          if (emailResult.success) {
            console.log(`✅ Pickup ready email sent successfully for order ${updatedOrder.order_number}`);
          } else {
            console.error('❌ Pickup ready email failed:', emailResult.error);
          }
        } catch (emailError) {
          console.error('⚠️ Failed to send pickup ready email (order still marked as ready for pickup):', emailError);
        }
        
        return updatedOrder;
      } catch (error) {
        console.error('Error marking order as ready for pickup:', error);
        throw new Error(error.message);
      }
    },

    markOrderPickedUp: async (_, { orderId }, { user }) => {
      try {
        // Require admin authentication
        requireAdminAuth(user);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        
        // Get the current order
        const client = supabaseClient.getServiceClient();
        const { data: currentOrder, error: fetchError } = await client
          .from('orders_main')
          .select('*')
          .eq('id', orderId)
          .single();
          
        if (fetchError) {
          throw new Error(`Failed to fetch order: ${fetchError.message}`);
        }
        
        if (!currentOrder) {
          throw new Error('Order not found');
        }
        
        // Check if this is a local pickup order
        if (!currentOrder.shipping_method || !currentOrder.shipping_method.includes('Local Pickup')) {
          throw new Error('This order is not a local pickup order');
        }
        
        // Update the order status to picked up (delivered)
        const statusUpdate = {
          orderStatus: 'Delivered',
          fulfillmentStatus: 'fulfilled',
          proof_status: 'delivered'
        };
        
        const { data: updatedOrder, error: updateError } = await client
          .from('orders_main')
          .update({
            order_status: statusUpdate.orderStatus,
            fulfillment_status: statusUpdate.fulfillmentStatus,
            proof_status: statusUpdate.proof_status,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .select(`
            *,
            order_items_new(*)
          `)
          .single();
          
        if (updateError) {
          throw new Error(`Failed to update order status: ${updateError.message}`);
        }
        
        // Send pickup completed email notification to customer
        try {
          console.log('📧 Sending pickup completed email notification to customer...');
          const emailNotifications = require('./email-notifications');
          
          const emailResult = await emailNotifications.sendPickupCompletedNotification(updatedOrder);
          
          if (emailResult.success) {
            console.log(`✅ Pickup completed email sent successfully for order ${updatedOrder.order_number}`);
          } else {
            console.error('❌ Pickup completed email failed:', emailResult.error);
          }
        } catch (emailError) {
          console.error('⚠️ Failed to send pickup completed email (order still marked as delivered):', emailError);
        }
        
        return updatedOrder;
      } catch (error) {
        console.error('Error marking order as picked up:', error);
        throw new Error(error.message);
      }
    },

    claimGuestOrders: async (_, { userId, email }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        const claimedCount = await supabaseClient.claimGuestOrders(userId, email);
        return {
          success: true,
          claimedOrdersCount: claimedCount,
          message: claimedCount > 0 
            ? `Successfully claimed ${claimedCount} orders`
            : 'No guest orders found to claim'
        };
      } catch (error) {
        console.error('Error claiming guest orders:', error);
        throw new Error(error.message);
      }
    },

    addOrderProof: async (_, { orderId, proofData }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        
        // Debug logging
        console.log('🔍 addOrderProof called with:', {
          orderId,
          proofData: JSON.stringify(proofData, null, 2)
        });
        
        // Add proof to database
        const client = supabaseClient.getServiceClient();
        
        // First, get the current proofs
        const { data: currentOrder, error: fetchError } = await client
          .from('orders_main')
          .select('proofs')
          .eq('id', orderId)
          .single();
          
        if (fetchError) {
          throw new Error(`Failed to fetch order: ${fetchError.message}`);
        }
        
        // Create new proof entry
        const newProof = {
          id: `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          orderId: orderId,
          orderItemId: proofData.orderItemId || null, // Link to specific order item
          proofUrl: proofData.proofUrl,
          proofPublicId: proofData.proofPublicId,
          proofTitle: proofData.proofTitle || 'Proof',
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'admin', // In future, get from auth context
          status: 'pending',
          adminNotes: proofData.adminNotes || null,
          customerNotes: null,
          cutLines: proofData.cutLines || null
        };
        
        console.log('📝 Created new proof object:', JSON.stringify(newProof, null, 2));
        console.log('🔍 Proof orderItemId details:', {
          'proofData.orderItemId': proofData.orderItemId,
          'proofData.orderItemId type': typeof proofData.orderItemId,
          'newProof.orderItemId': newProof.orderItemId,
          'newProof.orderItemId type': typeof newProof.orderItemId,
          'is null': newProof.orderItemId === null,
          'is undefined': newProof.orderItemId === undefined,
          'is empty string': newProof.orderItemId === '',
          'toString': String(newProof.orderItemId)
        });
        
        // Update proofs array
        const currentProofs = currentOrder.proofs || [];
        const updatedProofs = [...currentProofs, newProof];
        
        console.log('🔍 CRITICAL DEBUG - Before saving to database:', {
          'newProof.orderItemId': newProof.orderItemId,
          'newProof.orderItemId type': typeof newProof.orderItemId,
          'updatedProofs length': updatedProofs.length,
          'last proof in array': updatedProofs[updatedProofs.length - 1],
          'last proof orderItemId': updatedProofs[updatedProofs.length - 1].orderItemId,
          'JSON stringified newProof': JSON.stringify(newProof)
        });
        
        // Update order with new proof
        const { data: updatedOrder, error: updateError } = await client
          .from('orders_main')
          .update({ proofs: updatedProofs })
          .eq('id', orderId)
          .select(`
            *,
            order_items_new(*)
          `)
          .single();
          
        if (updateError) {
          throw new Error(`Failed to update order with proof: ${updateError.message}`);
        }
        
        console.log('🔍 CRITICAL DEBUG - After saving to database:', {
          'updatedOrder.proofs': updatedOrder.proofs,
          'proofs length': updatedOrder.proofs?.length,
          'last proof from DB': updatedOrder.proofs?.[updatedOrder.proofs.length - 1],
          'last proof orderItemId from DB': updatedOrder.proofs?.[updatedOrder.proofs.length - 1]?.orderItemId
        });
        
        return updatedOrder;
     } catch (error) {
       console.error('Error adding order proof:', error);
       throw new Error(error.message);
     }
   },

   updateProofStatus: async (_, { orderId, proofId, status, customerNotes }) => {
     try {
       if (!supabaseClient.isReady()) {
         throw new Error('Order service is currently unavailable');
       }
       
       // Validation for request_changes - require either comments or uploaded file
       if (status === 'changes_requested') {
         const hasComments = customerNotes && customerNotes.trim().length > 0;
         // Note: File upload validation would require additional tracking in the database
         // For now, we'll validate that they have comments when requesting changes
         if (!hasComments) {
           throw new Error('Please provide comments describing the changes needed when requesting changes to a proof.');
         }
       }
       
       const client = supabaseClient.getServiceClient();
       
       // Get current order
       const { data: currentOrder, error: fetchError } = await client
         .from('orders_main')
         .select('proofs')
         .eq('id', orderId)
         .single();
         
       if (fetchError) {
         throw new Error(`Failed to fetch order: ${fetchError.message}`);
       }
       
       // Update the specific proof
       const updatedProofs = (currentOrder.proofs || []).map(proof => {
         if (proof.id === proofId) {
           return {
             ...proof,
             status,
             customerNotes: customerNotes || proof.customerNotes,
             updatedAt: new Date().toISOString(),
             ...(status === 'approved' && { approvedAt: new Date().toISOString() })
           };
         }
         return proof;
       });
       
       // Check if all proofs are approved
       const allApproved = updatedProofs.every(proof => proof.status === 'approved');
       
       // For item-specific proofs, also check if all items have at least one approved proof
       const proofsWithItems = updatedProofs.filter(proof => proof.orderItemId);
       const proofsWithoutItems = updatedProofs.filter(proof => !proof.orderItemId);
       
       let allItemsHaveApprovedProofs = true;
       if (proofsWithItems.length > 0) {
         // Get unique order item IDs that have proofs
         const itemIds = [...new Set(proofsWithItems.map(proof => proof.orderItemId))];
         
         // Check if each item has at least one approved proof
         allItemsHaveApprovedProofs = itemIds.every(itemId => 
           proofsWithItems.some(proof => proof.orderItemId === itemId && proof.status === 'approved')
         );
       }
       
       // Update order with modified proofs and potentially the order-level proof status
       const updateData = { 
         proofs: updatedProofs 
       };
       
       // If all proofs are approved AND all items have approved proofs, update the order-level proof status
       if (allApproved && allItemsHaveApprovedProofs) {
         updateData.proof_status = 'approved';
         updateData.order_status = 'Printing'; // Set order to printing when all proofs approved
       } else if (status === 'changes_requested') {
         updateData.proof_status = 'changes_requested';
       }
       
       const { data: updatedOrder, error: updateError } = await client
         .from('orders_main')
         .update(updateData)
         .eq('id', orderId)
         .select(`
           *,
           order_items_new(*)
         `)
         .single();
         
       if (updateError) {
         throw new Error(`Failed to update proof status: ${updateError.message}`);
       }
       
       // Send Discord notification if proof was approved
       if (status === 'approved') {
         try {
           console.log('📱 Sending Discord notification for proof approval...');
           const notificationHelpers = require('./notification-helpers');
           await notificationHelpers.sendProofApprovalNotification(updatedOrder, proofId);
         } catch (notifError) {
           console.error('❌ Failed to send Discord notification:', notifError);
           // Don't throw - we still want to return the updated order
         }
       }
       
       // Send admin email notification for proof actions
       try {
         console.log('📧 Sending admin email notification for proof action...');
         const emailNotifications = require('./email-notifications');
         
         const extraData = {};
         if (status === 'changes_requested' && customerNotes) {
           extraData.customerNotes = customerNotes;
         }
         
         const adminEmailResult = await emailNotifications.sendAdminProofActionNotification(
           updatedOrder, 
           status, 
           extraData
         );
         
         if (adminEmailResult.success) {
           console.log('✅ Admin proof action email notification sent successfully');
         } else {
           console.error('❌ Admin proof action email notification failed:', adminEmailResult.error);
         }
       } catch (emailError) {
         console.error('⚠️ Failed to send admin proof action email (proof update still processed):', emailError);
       }
       
       // Send customer email notification when all proofs are approved
       if (allApproved) {
         try {
           console.log('📧 Sending customer notification that order is now printing...');
           const emailNotifications = require('./email-notifications');
           
           // Ensure order has customer email
           const orderForEmail = {
             ...updatedOrder,
             customerEmail: updatedOrder.customer_email,
             orderNumber: updatedOrder.order_number || updatedOrder.id,
             totalPrice: updatedOrder.total_price
           };
           
           const customerEmailResult = await emailNotifications.sendOrderStatusNotification(
             orderForEmail, 
             'Printing'
           );
           
           if (customerEmailResult.success) {
             console.log('✅ Customer printing notification sent successfully');
           } else {
             console.error('❌ Customer printing notification failed:', customerEmailResult.error);
           }
         } catch (emailError) {
           console.error('⚠️ Failed to send customer printing notification (proof approval still processed):', emailError);
         }
       }
       
       return updatedOrder;
     } catch (error) {
       console.error('Error updating proof status:', error);
       throw new Error(error.message);
     }
   },

   sendProofs: async (_, { orderId }) => {
     try {
       if (!supabaseClient.isReady()) {
         throw new Error('Order service is currently unavailable');
       }
       
       const client = supabaseClient.getServiceClient();
       
       // Get current order
       const { data: currentOrder, error: fetchError } = await client
         .from('orders_main')
         .select('proofs, customer_email, customer_first_name, order_number, proof_status')
         .eq('id', orderId)
         .single();
         
       if (fetchError) {
         throw new Error(`Failed to fetch order: ${fetchError.message}`);
       }
       
       let updatedProofs;
       
       // Check if this is after changes were requested
       if (currentOrder.proof_status === 'changes_requested') {
         // Archive old proofs and only send new ones
         updatedProofs = (currentOrder.proofs || []).map(proof => {
           if (proof.status === 'pending') {
             // New proofs get sent
             return {
               ...proof,
               status: 'sent',
               sentAt: new Date().toISOString()
             };
           } else if (proof.status === 'sent' || proof.status === 'changes_requested') {
             // Old proofs get archived
             return {
               ...proof,
               status: 'archived',
               archivedAt: new Date().toISOString(),
               archiveReason: 'superseded_by_revision'
             };
           } else {
             // Keep other statuses as-is
             return proof;
           }
         });
       } else {
         // Normal flow - update all proofs to 'sent' status
         updatedProofs = (currentOrder.proofs || []).map(proof => ({
           ...proof,
           status: 'sent',
           sentAt: new Date().toISOString()
         }));
       }
       
       // Generate proof approval link
       const baseUrl = 'https://stickershuttle.com';
       const proofLink = `${baseUrl}/proofs?orderId=${orderId}`;
       
       // Update order with sent proofs and status
       const { data: updatedOrder, error: updateError } = await client
         .from('orders_main')
         .update({ 
           proofs: updatedProofs,
           proof_status: 'awaiting_approval',
           proof_sent_at: new Date().toISOString(),
           proof_link: proofLink
         })
         .eq('id', orderId)
         .select(`
           *,
           order_items_new(*)
         `)
         .single();
         
       if (updateError) {
         throw new Error(`Failed to send proofs: ${updateError.message}`);
       }
       
       // Log successful proof sending (here you would trigger email notification)
       console.log(`✅ Proofs sent for order ${currentOrder.order_number} to ${currentOrder.customer_email}`);
       console.log(`📧 Proof approval link: ${proofLink}`);
       
       // Send email notification to customer
       try {
         console.log('📧 Sending proof notification email to customer...');
         const emailNotifications = require('./email-notifications');
         
         // Send proof notification using the "Proof Sent" status
         const emailResult = await emailNotifications.sendOrderStatusNotification(
           updatedOrder, 
           'Proof Sent'
         );
         
         if (emailResult.success) {
           console.log('✅ Proof notification email sent successfully to:', updatedOrder.customer_email);
         } else {
           console.error('❌ Proof notification email failed:', emailResult.error);
         }
       } catch (emailError) {
         console.error('⚠️ Failed to send proof notification email (proofs still marked as sent):', emailError);
       }
       
       return updatedOrder;
     } catch (error) {
       console.error('Error sending proofs:', error);
       throw new Error(error.message);
     }
   },

   replaceProofFile: async (_, { orderId, proofId, newProofData }) => {
     try {
       if (!supabaseClient.isReady()) {
         throw new Error('Order service is currently unavailable');
       }
       
       const client = supabaseClient.getServiceClient();
       
       // Get current order
       const { data: currentOrder, error: fetchError } = await client
         .from('orders_main')
         .select('proofs')
         .eq('id', orderId)
         .single();
         
       if (fetchError) {
         throw new Error(`Failed to fetch order: ${fetchError.message}`);
       }
       
       // Replace the specific proof file (keep same ID and timestamps)
       const updatedProofs = (currentOrder.proofs || []).map(proof => {
         if (proof.id === proofId) {
           return {
             ...proof,
             proofUrl: newProofData.proofUrl,
             proofPublicId: newProofData.proofPublicId,
             proofTitle: newProofData.proofTitle || proof.proofTitle,
             replacedAt: new Date().toISOString(),
             adminNotes: newProofData.adminNotes || proof.adminNotes,
             status: 'pending' // Reset status when file is replaced
           };
         }
         return proof;
       });
       
       // Update order with modified proofs
       const { data: updatedOrder, error: updateError } = await client
         .from('orders_main')
         .update({ proofs: updatedProofs })
         .eq('id', orderId)
         .select(`
           *,
           order_items_new(*)
         `)
         .single();
         
       if (updateError) {
         throw new Error(`Failed to replace proof file: ${updateError.message}`);
       }
       
       return updatedOrder;
     } catch (error) {
       console.error('Error replacing proof file:', error);
       throw new Error(error.message);
     }
   },

   updateProofFileByCustomer: async (_, { orderId, proofId, newFileUrl, originalFileName }) => {
     try {
       if (!supabaseClient.isReady()) {
         throw new Error('Order service is currently unavailable');
       }
       
       const client = supabaseClient.getServiceClient();
       
       // Get current order
       const { data: currentOrder, error: fetchError } = await client
         .from('orders_main')
         .select('proofs')
         .eq('id', orderId)
         .single();
         
       if (fetchError) {
         throw new Error(`Failed to fetch order: ${fetchError.message}`);
       }
       
       // Update the specific proof with new file and mark as replaced
       const updatedProofs = (currentOrder.proofs || []).map(proof => {
         if (proof.id === proofId) {
           return {
             ...proof,
             proofUrl: newFileUrl,
             replaced: true,
             replacedAt: new Date().toISOString(),
             originalFileName: originalFileName,
             updatedAt: new Date().toISOString(),
             status: 'pending' // Reset status when customer replaces file
           };
         }
         return proof;
       });
       
       // Update order with modified proofs
       const { data: updatedOrder, error: updateError } = await client
         .from('orders_main')
         .update({ 
           proofs: updatedProofs,
           proof_status: 'pending' // Reset order proof status when file is replaced
         })
         .eq('id', orderId)
         .select(`
           *,
           order_items_new(*)
         `)
         .single();
         
       if (updateError) {
         throw new Error(`Failed to update proof file: ${updateError.message}`);
       }
       
       console.log(`✅ Customer replaced proof file for order ${orderId}, proof ${proofId}`);
       return updatedOrder;
     } catch (error) {
       console.error('Error updating proof file by customer:', error);
       throw new Error(error.message);
     }
   },

   updateOrderFileByCustomer: async (_, { orderId, newFileUrl, originalFileName }) => {
     try {
       if (!supabaseClient.isReady()) {
         throw new Error('Order service is currently unavailable');
       }
       
       const client = supabaseClient.getServiceClient();
       
       // Get current order and its items
       const { data: currentOrder, error: fetchError } = await client
         .from('orders_main')
         .select(`
           *,
           order_items_new(*)
         `)
         .eq('id', orderId)
         .single();
         
       if (fetchError) {
         throw new Error(`Failed to fetch order: ${fetchError.message}`);
       }
       
       // Update the first item's custom files with the new file
       const updatedItems = (currentOrder.order_items_new || []).map((item, index) => {
         if (index === 0) { // Update the first item
           return {
             ...item,
             customFiles: [newFileUrl], // Replace with new file
             customerReplacementFile: newFileUrl,
             customerReplacementFileName: originalFileName,
             customerReplacementAt: new Date().toISOString()
           };
         }
         return item;
       });
       
       // Update each item in the database
       for (const item of updatedItems) {
         await client
           .from('order_items_new')
           .update({
             customFiles: item.customFiles,
             customerReplacementFile: item.customerReplacementFile,
             customerReplacementFileName: item.customerReplacementFileName,
             customerReplacementAt: item.customerReplacementAt
           })
           .eq('id', item.id);
       }
       
       // Get the updated order
       const { data: updatedOrder, error: updateError } = await client
         .from('orders_main')
         .select(`
           *,
           order_items_new(*)
         `)
         .eq('id', orderId)
         .single();
         
       if (updateError) {
         throw new Error(`Failed to fetch updated order: ${updateError.message}`);
       }
       
       console.log(`✅ Customer replaced order file for order ${orderId}`);
       return updatedOrder;
     } catch (error) {
       console.error('Error updating order file by customer:', error);
       throw new Error(error.message);
     }
   },

   addProofNotes: async (_, { orderId, proofId, adminNotes, customerNotes }) => {
     try {
       if (!supabaseClient.isReady()) {
         throw new Error('Order service is currently unavailable');
       }
       
       const client = supabaseClient.getServiceClient();
       
       // Get current order
       const { data: currentOrder, error: fetchError } = await client
         .from('orders_main')
         .select('proofs')
         .eq('id', orderId)
         .single();
         
       if (fetchError) {
         throw new Error(`Failed to fetch order: ${fetchError.message}`);
       }
       
       // Add notes to the specific proof
       const updatedProofs = (currentOrder.proofs || []).map(proof => {
         if (proof.id === proofId) {
           return {
             ...proof,
             adminNotes: adminNotes || proof.adminNotes,
             customerNotes: customerNotes || proof.customerNotes,
             notesUpdatedAt: new Date().toISOString()
           };
         }
         return proof;
       });
       
       // Update order with modified proofs
       const { data: updatedOrder, error: updateError } = await client
         .from('orders_main')
         .update({ proofs: updatedProofs })
         .eq('id', orderId)
         .select(`
           *,
           order_items_new(*)
         `)
         .single();
         
       if (updateError) {
         throw new Error(`Failed to add proof notes: ${updateError.message}`);
       }
       
       return updatedOrder;
     } catch (error) {
       console.error('Error adding proof notes:', error);
       throw new Error(error.message);
     }
   },

   approveProof: async (_, { orderId, proofId, adminNotes }) => {
     try {
       if (!supabaseClient.isReady()) {
         throw new Error('Order service is currently unavailable');
       }
       
       const client = supabaseClient.getServiceClient();
       
       // Get current order
       const { data: currentOrder, error: fetchError } = await client
         .from('orders_main')
         .select('proofs')
         .eq('id', orderId)
         .single();
         
       if (fetchError) {
         throw new Error(`Failed to fetch order: ${fetchError.message}`);
       }
       
       // Approve the specific proof
       const updatedProofs = (currentOrder.proofs || []).map(proof => {
         if (proof.id === proofId) {
           return {
             ...proof,
             status: 'approved',
             adminNotes: adminNotes || proof.adminNotes,
             approvedAt: new Date().toISOString(),
             approvedBy: 'admin' // In future, get from auth context
           };
         }
         return proof;
       });
       
       // Check if all proofs are approved
       const allApproved = updatedProofs.every(proof => proof.status === 'approved');
       
       // For item-specific proofs, also check if all items have at least one approved proof
       const proofsWithItems = updatedProofs.filter(proof => proof.orderItemId);
       const proofsWithoutItems = updatedProofs.filter(proof => !proof.orderItemId);
       
       let allItemsHaveApprovedProofs = true;
       if (proofsWithItems.length > 0) {
         // Get unique order item IDs that have proofs
         const itemIds = [...new Set(proofsWithItems.map(proof => proof.orderItemId))];
         
         // Check if each item has at least one approved proof
         allItemsHaveApprovedProofs = itemIds.every(itemId => 
           proofsWithItems.some(proof => proof.orderItemId === itemId && proof.status === 'approved')
         );
       }
       
       // Update order with approved proof
       const { data: updatedOrder, error: updateError } = await client
         .from('orders_main')
         .update({ 
           proofs: updatedProofs,
           ...((allApproved && allItemsHaveApprovedProofs) && { 
             proof_status: 'approved',
             order_status: 'Printing' // Changed from 'Ready for Production' to 'Printing'
           })
         })
         .eq('id', orderId)
         .select(`
           *,
           order_items_new(*)
         `)
         .single();
         
       if (updateError) {
         throw new Error(`Failed to approve proof: ${updateError.message}`);
       }
       
       // Send admin email notification for admin proof approval
       try {
         console.log('📧 Sending admin email notification for admin proof approval...');
         const emailNotifications = require('./email-notifications');
         
         const adminEmailResult = await emailNotifications.sendAdminProofActionNotification(
           updatedOrder, 
           'approved', 
           { adminNotes: adminNotes }
         );
         
         if (adminEmailResult.success) {
           console.log('✅ Admin proof approval email notification sent successfully');
         } else {
           console.error('❌ Admin proof approval email notification failed:', adminEmailResult.error);
         }
       } catch (emailError) {
         console.error('⚠️ Failed to send admin proof approval email (proof approval still processed):', emailError);
       }
       
       // Send customer email notification when all proofs are approved
       if (allApproved) {
         try {
           console.log('📧 Sending customer notification that order is now printing...');
           const emailNotifications = require('./email-notifications');
           
           // Ensure order has customer email
           const orderForEmail = {
             ...updatedOrder,
             customerEmail: updatedOrder.customer_email,
             orderNumber: updatedOrder.order_number || updatedOrder.id,
             totalPrice: updatedOrder.total_price
           };
           
           const customerEmailResult = await emailNotifications.sendOrderStatusNotification(
             orderForEmail, 
             'Printing'
           );
           
           if (customerEmailResult.success) {
             console.log('✅ Customer printing notification sent successfully');
           } else {
             console.error('❌ Customer printing notification failed:', customerEmailResult.error);
           }
         } catch (emailError) {
           console.error('⚠️ Failed to send customer printing notification (proof approval still processed):', emailError);
         }
       }
       
       return updatedOrder;
     } catch (error) {
       console.error('Error approving proof:', error);
       throw new Error(error.message);
     }
   },

   requestProofChanges: async (_, { orderId, proofId, adminNotes }) => {
     try {
       if (!supabaseClient.isReady()) {
         throw new Error('Order service is currently unavailable');
       }
       
       const client = supabaseClient.getServiceClient();
       
       // Get current order
       const { data: currentOrder, error: fetchError } = await client
         .from('orders_main')
         .select('proofs')
         .eq('id', orderId)
         .single();
         
       if (fetchError) {
         throw new Error(`Failed to fetch order: ${fetchError.message}`);
       }
       
       // Request changes for the specific proof
       const updatedProofs = (currentOrder.proofs || []).map(proof => {
         if (proof.id === proofId) {
           return {
             ...proof,
             status: 'changes_requested',
             adminNotes: adminNotes,
             changesRequestedAt: new Date().toISOString(),
             requestedBy: 'admin' // In future, get from auth context
           };
         }
         return proof;
       });
       
       // Update order with changes requested
       const { data: updatedOrder, error: updateError } = await client
         .from('orders_main')
         .update({ 
           proofs: updatedProofs,
           proof_status: 'changes_requested'
         })
         .eq('id', orderId)
         .select(`
           *,
           order_items_new(*)
         `)
         .single();
         
       if (updateError) {
         throw new Error(`Failed to request proof changes: ${updateError.message}`);
       }
       
       // Send admin email notification for admin proof changes request
       try {
         console.log('📧 Sending admin email notification for admin proof changes request...');
         const emailNotifications = require('./email-notifications');
         
         const adminEmailResult = await emailNotifications.sendAdminProofActionNotification(
           updatedOrder, 
           'changes_requested', 
           { adminNotes: adminNotes }
         );
         
         if (adminEmailResult.success) {
           console.log('✅ Admin proof changes request email notification sent successfully');
         } else {
           console.error('❌ Admin proof changes request email notification failed:', adminEmailResult.error);
         }
       } catch (emailError) {
         console.error('⚠️ Failed to send admin proof changes request email (proof update still processed):', emailError);
       }
       
       return updatedOrder;
     } catch (error) {
       console.error('Error requesting proof changes:', error);
       throw new Error(error.message);
     }
   },

    // EasyPost tracking mutations
    createEasyPostTracker: async (_, { trackingCode, orderId, carrier }) => {
      try {
        if (!easyPostClient.isReady()) {
          throw new Error('EasyPost service is currently unavailable');
        }

        const result = await trackingEnhancer.createTracker(trackingCode, orderId, carrier);
        
        return {
          success: true,
          message: 'Tracker created successfully',
          trackingCode: result.tracking_code,
          status: result.status,
          carrier: result.carrier,
          publicUrl: result.public_url,
          estDeliveryDate: result.est_delivery_date
        };
      } catch (error) {
        console.error('Error creating EasyPost tracker:', error);
        return {
          success: false,
          message: error.message,
          trackingCode: trackingCode,
          status: null,
          carrier: null,
          publicUrl: null,
          estDeliveryDate: null
        };
      }
    },

    refreshOrderTracking: async (_, { orderId }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Get order tracking number
        const { data: order, error } = await client
          .from('orders_main')
          .select('tracking_number')
          .eq('id', orderId)
          .single();

        if (error || !order?.tracking_number) {
          throw new Error('Order not found or no tracking number available');
        }

        const trackingStatus = await trackingEnhancer.getTrackingStatus(order.tracking_number);
        
        // Process the update
        const mockTracker = {
          tracking_code: order.tracking_number,
          status: trackingStatus.status,
          carrier: trackingStatus.carrier,
          public_url: trackingStatus.public_url,
          est_delivery_date: trackingStatus.est_delivery_date,
          tracking_details: trackingStatus.tracking_details
        };

        await trackingEnhancer.processTrackingUpdate(mockTracker);

        return {
          success: true,
          message: 'Tracking refreshed successfully',
          trackingCode: order.tracking_number,
          status: trackingStatus.status,
          carrier: trackingStatus.carrier,
          publicUrl: trackingStatus.public_url,
          estDeliveryDate: trackingStatus.est_delivery_date
        };
      } catch (error) {
        console.error('Error refreshing order tracking:', error);
        return {
          success: false,
          message: error.message,
          trackingCode: null,
          status: null,
          carrier: null,
          publicUrl: null,
          estDeliveryDate: null
        };
      }
    },

    refreshAllActiveTracking: async (_, args, context) => {
      try {
        if (!easyPostClient.isReady()) {
          throw new Error('EasyPost service is currently unavailable');
        }

        console.log('🔄 Starting bulk tracking refresh...');
        const startTime = Date.now();
        
        await trackingEnhancer.refreshAllActiveTracking();
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        // Get count of active orders for reporting
        let processedCount = 0;
        if (supabaseClient.isReady()) {
          const client = supabaseClient.getServiceClient();
          const { data: orders } = await client
            .from('orders_main')
            .select('id')
            .not('tracking_number', 'is', null)
            .not('order_status', 'eq', 'Delivered')
            .not('order_status', 'eq', 'Cancelled');
          
          processedCount = orders?.length || 0;
        }

        return {
          success: true,
          message: `Successfully refreshed tracking for ${processedCount} orders in ${duration}s`,
          processedCount: processedCount,
          errors: []
        };
      } catch (error) {
        console.error('Error refreshing all tracking:', error);
        return {
          success: false,
          message: error.message,
          processedCount: 0,
          errors: [error.message]
        };
      }
    },

    // Stripe mutations
    createStripeCheckoutSession: async (_, { input }) => {
      try {
        if (!stripeClient.isReady()) {
          throw new Error('Payment service is currently unavailable');
        }
        
        const result = await stripeClient.createCheckoutSession({
          lineItems: input.lineItems,
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          customerEmail: input.customerEmail,
          userId: input.userId,
          metadata: input.metadata,
          currency: 'usd'
        });
        
        return {
          success: result.success,
          sessionId: result.sessionId,
          checkoutUrl: result.checkoutUrl,
          totalAmount: result.totalAmount,
          message: result.success ? 'Checkout session created successfully' : 'Failed to create checkout session',
          error: result.error
        };
      } catch (error) {
        console.error('Error creating Stripe checkout session:', error);
        return {
          success: false,
          message: 'Failed to create checkout session',
          error: error.message
        };
      }
    },

    processStripeCartOrder: async (_, { input }) => {
      try {
        console.log('🎯 Processing Stripe cart order...');
        console.log('📊 Input received:', JSON.stringify(input, null, 2));
        
        const errors = [];
        let checkoutSession = null;
        let customerOrder = null;
        let actualCreditsApplied = 0;
        let remainingCredits = 0;
        
        // Helper function to safely parse numbers and handle NaN
        const safeParseFloat = (value, fallback = 0) => {
          const parsed = parseFloat(value);
          return isNaN(parsed) ? fallback : parsed;
        };

        // Step 1: Calculate totals before creating order
        const cartSubtotal = input.cartItems.reduce((sum, item) => {
          const itemTotal = safeParseFloat(item.totalPrice, 0);
          return sum + itemTotal;
        }, 0);
        const discountAmount = safeParseFloat(input.discountAmount, 0);
        const creditsRequested = safeParseFloat(input.creditsToApply, 0);
        // Safely handle isBlindShipment with debug logging
        const safeIsBlindShipment = (() => {
          const safeBool = Boolean(input.isBlindShipment);
          
          // Debug logging for non-boolean values
          if (typeof input.isBlindShipment !== 'boolean' && input.isBlindShipment !== undefined && input.isBlindShipment !== null) {
            console.warn('⚠️ Backend: Non-boolean isBlindShipment value detected:', {
              original: input.isBlindShipment,
              type: typeof input.isBlindShipment,
              converted: safeBool
            });
          }
          
          return safeBool;
        })();
        
        const blindShipmentFee = safeIsBlindShipment ? 0.00 : 0;
        
        // Step 1a: Handle credit application
        let creditTransactionId = null;
        if (creditsRequested > 0 && input.userId && input.userId !== 'guest') {
          try {
            console.log('💳 Attempting to validate credits:', creditsRequested);
            
            // Validate credit application
            const validation = await creditHandlers.validateCreditApplication(
              input.userId,
              cartSubtotal - discountAmount,
              creditsRequested
            );
            
            if (validation.valid) {
              // Don't deduct credits yet - just validate and pass to Stripe metadata
              actualCreditsApplied = creditsRequested;
              
              // Get current balance for display
              const { balance } = await creditHandlers.getUserCreditBalance(input.userId);
              remainingCredits = safeParseFloat(balance, 0);
              
              console.log('✅ Credits validated successfully:', {
                toApply: actualCreditsApplied,
                currentBalance: remainingCredits
              });
            } else {
              console.warn('⚠️ Credit application invalid:', validation.message);
              errors.push(`Credit application failed: ${validation.message}`);
              actualCreditsApplied = 0;
              remainingCredits = 0;
            }
          } catch (creditError) {
            console.error('❌ Error validating credits:', creditError);
            errors.push(`Credit validation failed: ${creditError.message}`);
            // Continue without credits - don't fail the whole order
            actualCreditsApplied = 0;
            remainingCredits = 0;
          }
        }
        
        // Step 2: Check for wholesale discount (15% off for approved wholesale customers)
        let wholesaleDiscount = 0;
        let userProfile = null;
        
        if (input.userId && input.userId !== 'guest' && supabaseClient.isReady()) {
          try {
            console.log('🔍 Checking for wholesale discount eligibility...');
            const client = supabaseClient.getServiceClient();
            const { data: profile, error: profileError } = await client
              .from('user_profiles')
              .select('is_wholesale_customer, wholesale_status')
              .eq('user_id', input.userId)
              .single();

            if (!profileError && profile) {
              userProfile = profile;
              if (profile.is_wholesale_customer && profile.wholesale_status === 'approved') {
                // Calculate wholesale discount only on non-deal items
                const nonDealSubtotal = input.cartItems.reduce((sum, item) => {
                  const itemTotal = safeParseFloat(item.totalPrice, 0);
                  const isDealItem = item.customization?.isDeal === true;
                  return sum + (isDealItem ? 0 : itemTotal);
                }, 0);
                
                wholesaleDiscount = nonDealSubtotal * 0.15; // 15% discount for wholesale customers on non-deal items only
                console.log('🏪 Wholesale discount applied:', {
                  userId: input.userId,
                  wholesaleStatus: profile.wholesale_status,
                  cartSubtotal: cartSubtotal.toFixed(2),
                  nonDealSubtotal: nonDealSubtotal.toFixed(2),
                  wholesaleDiscount: wholesaleDiscount.toFixed(2),
                  discountPercentage: '15%',
                  note: 'Wholesale discount excludes deal items'
                });
              }
            }
          } catch (profileError) {
            console.warn('⚠️ Could not check wholesale status:', profileError);
          }
        }

        // Step 2.5: Check for reorder discount (10% off reordered items only)
        let reorderDiscount = 0;
        
        // Debug: log cart items to see reorder flag structure
        console.log('🔍 Checking cart items for reorder flags:', input.cartItems.map(item => ({
          productName: item.productName,
          calculatorSelections: item.calculatorSelections,
          customization: item.customization,
          isReorderInCalc: item.calculatorSelections?.isReorder,
          isReorderInCustom: item.customization?.isReorder
        })));
        
        const reorderItems = input.cartItems.filter(item => 
          item.calculatorSelections?.isReorder === true || 
          item.customization?.isReorder === true
        );
        
        console.log('🔍 Filtered reorder items:', reorderItems.map(item => ({
          productName: item.productName,
          totalPrice: item.totalPrice,
          isReorder: item.customization?.isReorder || item.calculatorSelections?.isReorder
        })));
        
        if (reorderItems.length > 0) {
          const reorderItemsSubtotal = reorderItems.reduce((sum, item) => {
            return sum + safeParseFloat(item.totalPrice, 0);
          }, 0);
          
          reorderDiscount = reorderItemsSubtotal * 0.1; // 10% discount on reordered items only
          
          console.log('🔄 Reorder discount applied:', {
            reorderItemsCount: reorderItems.length,
            reorderItemsSubtotal: reorderItemsSubtotal.toFixed(2),
            reorderDiscount: reorderDiscount.toFixed(2),
            discountPercentage: '10%'
          });
        }

        // Step 3: Prepare order in Supabase (as pending payment)
        console.log('🔍 Checking Supabase client status...');
        console.log('Supabase ready?', supabaseClient.isReady());

        if (supabaseClient.isReady()) {
          try {
            const customerOrderData = {
              user_id: (input.userId && input.userId !== 'guest') ? input.userId : null,
              guest_email: (input.userId === 'guest') ? input.customerInfo.email : (input.guestEmail || null),
              order_status: 'Awaiting Payment',
              fulfillment_status: 'unfulfilled',
              financial_status: 'pending',
              subtotal_price: cartSubtotal,
              total_tax: 0, // Will be updated after Stripe checkout
              total_price: cartSubtotal - discountAmount - actualCreditsApplied - wholesaleDiscount - reorderDiscount + blindShipmentFee,
              discount_code: input.discountCode || null,
              discount_amount: discountAmount || 0,
              wholesale_discount: wholesaleDiscount || 0,
              reorder_discount: reorderDiscount || 0,
              credits_applied: actualCreditsApplied || 0,
              credit_transaction_id: creditTransactionId || null,
              currency: 'USD',
              customer_first_name: input.customerInfo.firstName,
              customer_last_name: input.customerInfo.lastName,
              customer_email: input.customerInfo.email,
              customer_phone: input.customerInfo.phone,
              shipping_address: input.shippingAddress,
              billing_address: input.billingAddress || input.shippingAddress,
              order_tags: generateOrderTags(input.cartItems).split(','),
              order_note: generateOrderNote(input.cartItems),
              is_blind_shipment: safeIsBlindShipment,
              order_created_at: new Date().toISOString(),
              order_updated_at: new Date().toISOString()
            };

            console.log('📝 Order data prepared:', JSON.stringify(customerOrderData, null, 2));
            console.log('🚀 Calling supabaseClient.createCustomerOrder...');
            
            customerOrder = await supabaseClient.createCustomerOrder(customerOrderData);
            console.log('✅ Customer order created:', customerOrder?.id);
            console.log('📊 Full order response:', JSON.stringify(customerOrder, null, 2));

            // Create order items
            if (customerOrder) {
              const orderItems = input.cartItems.map(item => ({
                order_id: customerOrder.id,
                product_id: item.productId,
                product_name: item.productName,
                product_category: item.productCategory,
                sku: item.sku,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                total_price: item.totalPrice,
                calculator_selections: item.calculatorSelections,
                custom_files: item.customFiles || [],
                customer_notes: item.customerNotes,
                instagram_handle: item.instagramHandle,
                instagram_opt_in: item.instagramOptIn || false,
                fulfillment_status: 'unfulfilled'
              }));

              await supabaseClient.createOrderItems(orderItems);
              console.log('✅ Order items created');
            }
          } catch (supabaseError) {
            console.error('❌ Supabase order creation failed:', supabaseError);
            errors.push(`Order tracking setup failed: ${supabaseError.message}`);
          }
        } else {
          console.error('❌ Supabase client is not ready');
          errors.push('Order tracking service is not available');
        }

        // Step 3: Check tax exemption status and existing Stripe customer
        let customerTaxExempt = false;
        let existingCustomerId = null;
        
        if (input.userId && input.userId !== 'guest' && supabaseClient.isReady()) {
          try {
            console.log('🏛️ Checking tax exemption status and Stripe customer for user:', input.userId);
            
            const client = supabaseClient.getServiceClient();
            const { data: userProfile, error: profileError } = await client
              .from('user_profiles')
              .select('is_tax_exempt, tax_exempt_expires_at')
              .eq('user_id', input.userId)
              .single();
            
            if (profileError) {
              console.warn('⚠️ Could not fetch user profile for tax exemption check:', profileError);
            } else if (userProfile) {
              // Note: Stripe customer ID is not stored in database - will create new customer each time
              existingCustomerId = null;
              console.log('💳 No existing Stripe customer ID stored - will create new customer');
              
              customerTaxExempt = userProfile.is_tax_exempt || false;
              
              // Check if tax exemption has expired
              if (customerTaxExempt && userProfile.tax_exempt_expires_at) {
                const expirationDate = new Date(userProfile.tax_exempt_expires_at);
                const now = new Date();
                if (now > expirationDate) {
                  console.log('⚠️ Tax exemption has expired for user:', input.userId);
                  customerTaxExempt = false;
                }
              }
              
              console.log('🏛️ Tax exemption status determined:', { 
                userId: input.userId, 
                isTaxExempt: customerTaxExempt,
                expiresAt: userProfile.tax_exempt_expires_at,
                hasStripeCustomer: !!existingCustomerId
              });
            }
          } catch (taxExemptError) {
            console.error('❌ Error checking tax exemption status:', taxExemptError);
            // Default to not exempt on error
            customerTaxExempt = false;
          }
        }

        // Step 4: Create Stripe checkout session
        if (stripeClient.isReady() && errors.length === 0) {
          try {
            console.log('🔍 Stripe client is ready, creating checkout session...');
            
            // Use canonical domain for all Stripe redirects
            let baseUrl;
            if (process.env.NODE_ENV === 'development') {
              baseUrl = 'http://localhost:3000';
            } else {
              // Always use canonical domain in production
              baseUrl = 'https://stickershuttle.com';
            }
            
            console.log('🌐 Using frontend URL for Stripe redirects:', baseUrl);
            
            // Calculate final cart total with all discounts
            const cartTotal = cartSubtotal - discountAmount - actualCreditsApplied - wholesaleDiscount - reorderDiscount + blindShipmentFee;
            
            console.log('💰 Final cart total calculation:', {
              cartSubtotal: cartSubtotal.toFixed(2),
              discountAmount: discountAmount.toFixed(2),
              actualCreditsApplied: actualCreditsApplied.toFixed(2),
              wholesaleDiscount: wholesaleDiscount.toFixed(2),
              reorderDiscount: reorderDiscount.toFixed(2),
              blindShipmentFee: blindShipmentFee.toFixed(2),
              cartTotal: cartTotal.toFixed(2)
            });
            
            const checkoutData = {
              lineItems: [
                ...input.cartItems.map(item => {
                  // Calculate proportional discount for this line item
                  const originalTotalPrice = safeParseFloat(item.totalPrice, 0);
                  const originalUnitPrice = safeParseFloat(item.unitPrice, 0);
                  
                  // Check if this is a deal item - deal items should not receive wholesale discount
                  const isDealItem = item.customization?.isDeal === true;
                  
                  // Calculate wholesale discount only for non-deal items
                  let itemWholesaleDiscount = 0;
                  if (!isDealItem && wholesaleDiscount > 0) {
                    // Calculate what portion of the non-deal subtotal this item represents
                    const nonDealSubtotal = input.cartItems.reduce((sum, cartItem) => {
                      const itemTotal = safeParseFloat(cartItem.totalPrice, 0);
                      const isItemDeal = cartItem.customization?.isDeal === true;
                      return sum + (isItemDeal ? 0 : itemTotal);
                    }, 0);
                    
                    if (nonDealSubtotal > 0) {
                      const itemProportion = originalTotalPrice / nonDealSubtotal;
                      itemWholesaleDiscount = wholesaleDiscount * itemProportion;
                    }
                  }
                  
                  // Check if this item is a reorder item
                  const isReorderItem = item.calculatorSelections?.isReorder === true || item.customization?.isReorder === true;
                  const itemReorderDiscount = isReorderItem ? (originalTotalPrice * 0.1) : 0;
                  
                  // Apply discounts to get final line item price
                  const totalItemDiscount = itemWholesaleDiscount + itemReorderDiscount;
                  const discountedTotalPrice = originalTotalPrice - totalItemDiscount;
                  const discountedUnitPrice = discountedTotalPrice / item.quantity;
                  
                  console.log('🔍 Line item discount calculation:', {
                    productName: item.productName,
                    originalTotalPrice: originalTotalPrice,
                    isDealItem: isDealItem,
                    itemWholesaleDiscount: itemWholesaleDiscount,
                    itemReorderDiscount: itemReorderDiscount,
                    totalItemDiscount: totalItemDiscount,
                    discountedTotalPrice: discountedTotalPrice,
                    isReorderItem: isReorderItem
                  });
                  
                  // Build discount description
                  const discountDescriptions = [];
                  if (itemWholesaleDiscount > 0 && !isDealItem) discountDescriptions.push('Wholesale 15% Off');
                  if (isReorderItem) discountDescriptions.push('Reorder 10% Off');
                  const discountText = discountDescriptions.length > 0 ? ` (${discountDescriptions.join(' + ')})` : '';
                  
                  const lineItem = {
                    name: item.productName,
                    description: `${item.productName} - Custom Configuration${discountText}`,
                    unitPrice: discountedUnitPrice,
                    totalPrice: discountedTotalPrice,
                    quantity: item.quantity,
                    productId: item.productId,
                    sku: item.sku,
                    calculatorSelections: item.calculatorSelections
                  };
                  
                  console.log('📦 Final line item for Stripe:', {
                    name: lineItem.name,
                    originalTotalPrice: originalTotalPrice,
                    finalTotalPrice: lineItem.totalPrice,
                    discountText: discountText,
                    isDealItem: isDealItem,
                    isReorderItem: isReorderItem,
                    wholesaleDiscount: itemWholesaleDiscount > 0 ? '15%' : isDealItem ? 'excluded (deal item)' : 'none',
                    reorderDiscount: isReorderItem ? '10%' : 'none'
                  });
                  
                  return lineItem;
                }),
                // Add blind shipment fee as a line item if applicable
                ...(blindShipmentFee > 0 ? [{
                  name: 'Blind Shipment Fee',
                  description: 'Discreet packaging - no order details on shipping label',
                  unitPrice: blindShipmentFee,
                  totalPrice: blindShipmentFee,
                  quantity: 1,
                  productId: 'blind-shipment',
                  sku: 'BLIND-SHIP',
                  calculatorSelections: {}
                }] : [])
              ],
              successUrl: `${baseUrl}/order-success`,
              cancelUrl: `${baseUrl}/cart`,
              customerEmail: input.customerInfo.email,
              customerFirstName: input.customerInfo.firstName,
              customerLastName: input.customerInfo.lastName,
              shippingAddress: input.shippingAddress, // Pass shipping address for customer creation
              userId: input.userId,
              customerOrderId: customerOrder?.id,
              customerTaxExempt: customerTaxExempt, // Pass tax exemption status
              existingCustomerId: existingCustomerId, // Pass existing customer ID if available
              creditsToApply: actualCreditsApplied, // Pass actual credits applied
              creditTransactionId: creditTransactionId, // Pass credit transaction ID for tracking
              // Generate detailed order note with all selections including white options
              orderNote: generateOrderNote(input.cartItems),
              cartMetadata: {
                itemCount: input.cartItems.length,
                subtotalAmount: cartSubtotal.toFixed(2),
                discountAmount: discountAmount.toFixed(2),
                creditsApplied: actualCreditsApplied.toFixed(2),
                wholesaleDiscount: wholesaleDiscount.toFixed(2),
                reorderDiscount: reorderDiscount.toFixed(2),
                totalAmount: cartTotal.toFixed(2),
                customerEmail: input.customerInfo.email,
                discountCode: input.discountCode || null,
                isWholesaleCustomer: userProfile?.is_wholesale_customer && userProfile?.wholesale_status === 'approved',
                hasReorderItems: reorderItems.length > 0
              }
            };

            console.log('📊 Checkout data prepared:', JSON.stringify({
              lineItemsCount: checkoutData.lineItems.length,
              customerEmail: checkoutData.customerEmail,
              successUrl: checkoutData.successUrl,
              firstItem: checkoutData.lineItems[0]
            }, null, 2));

            // Log the total amount that Stripe will charge
            const totalLineItemAmount = checkoutData.lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
            console.log('💰 Total line item amount for Stripe:', totalLineItemAmount.toFixed(2));
            
            const sessionResult = await stripeClient.createCheckoutSession(checkoutData);
            
            if (sessionResult.success) {
              checkoutSession = sessionResult;
              console.log('✅ Stripe checkout session created:', sessionResult.sessionId);
              
              // Update order with Stripe session ID
              if (customerOrder && supabaseClient.isReady()) {
                try {
                  const client = supabaseClient.getServiceClient();
                  
                  // First try the RPC function
                  const { data: rpcResult, error: rpcError } = await client
                    .rpc('update_order_stripe_session', {
                      p_order_id: customerOrder.id,
                      p_session_id: sessionResult.sessionId
                    });
                  
                  if (rpcError) {
                    console.error('❌ RPC function failed, trying direct update:', rpcError);
                    
                    // Fallback to direct update
                    const { error: updateError } = await client
                      .from('orders_main')
                      .update({ 
                        stripe_session_id: sessionResult.sessionId,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', customerOrder.id);
                    
                    if (updateError) {
                      console.error('❌ Failed to update order with Stripe session ID:', updateError);
                      console.error('Order ID:', customerOrder.id);
                      console.error('Session ID:', sessionResult.sessionId);
                      errors.push('Failed to link payment session with order');
                    } else {
                      console.log('✅ Order updated with Stripe session ID via direct update:', sessionResult.sessionId);
                    }
                  } else {
                    console.log('✅ Order updated with Stripe session ID via RPC:', sessionResult.sessionId);
                  }
                } catch (sessionUpdateError) {
                  console.error('❌ Critical error updating order with session ID:', sessionUpdateError);
                  errors.push('Failed to link payment session with order');
                }
              }
            } else {
              console.error('❌ Stripe session creation failed:', sessionResult);
              errors.push('Failed to create payment session');
            }
          } catch (stripeError) {
            console.error('❌ Stripe checkout creation failed:', stripeError);
            console.error('Full error details:', stripeError.stack);
            errors.push(`Payment session creation failed: ${stripeError.message}`);
          }
        } else {
          if (!stripeClient.isReady()) {
            console.error('❌ Stripe client is not ready');
            errors.push('Payment service is not available');
          }
        }

        // Always return a valid response object
        return {
          success: errors.length === 0 && checkoutSession?.success === true,
          sessionId: checkoutSession?.sessionId || null,
          checkoutUrl: checkoutSession?.checkoutUrl || null,
          customerOrder: customerOrder || null,
          message: errors.length === 0 
            ? 'Checkout session created successfully'
            : 'Order created with some issues',
          errors: errors.length > 0 ? errors : null,
          creditsApplied: actualCreditsApplied,
          remainingCredits: remainingCredits
        };
      } catch (error) {
        console.error('❌ Stripe cart order processing failed:', error);
        console.error('Full error stack:', error.stack);
        
        // Always return a valid response object even on critical errors
        return {
          success: false,
          sessionId: null,
          checkoutUrl: null,
          customerOrder: null,
          message: `Critical error: ${error.message}`,
          errors: [error.message],
          creditsApplied: 0,
          remainingCredits: 0
        };
      }
    },

    createAdditionalPaymentLink: async (_, { input }) => {
      try {
        console.log('🔗 Creating additional payment link for order:', input.orderId);
        
        if (!stripeClient.isReady() || !supabaseClient.isReady()) {
          throw new Error('Payment service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        
        // 1. Get the original order details
        const { data: originalOrder, error: orderError } = await client
          .from('orders_main')
          .select('*')
          .eq('id', input.orderId)
          .single();
          
        if (orderError || !originalOrder) {
          throw new Error('Original order not found');
        }
        
        // 2. Calculate totals for additional items
        const additionalTotal = input.additionalItems.reduce((sum, item) => {
          return sum + (item.totalPrice || 0);
        }, 0);
        
        // 3. Create checkout session for additional items
        const baseUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000' 
          : 'https://stickershuttle.com';
        
        const checkoutData = {
          lineItems: input.additionalItems.map(item => ({
            name: item.productName || 'Additional Item',
            description: `Additional items for Order #${originalOrder.order_number}`,
            unitPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice || 0,
            quantity: item.quantity || 1,
            productId: item.productId || 'additional-item',
            sku: item.sku || 'ADD-ON',
            calculatorSelections: item.calculatorSelections || {}
          })),
          successUrl: `${baseUrl}/order-success?additional=true&orderId=${input.orderId}`,
          cancelUrl: `${baseUrl}/account/dashboard`,
          customerEmail: input.customerEmail,
          customerFirstName: originalOrder.customer_first_name,
          customerLastName: originalOrder.customer_last_name,
          userId: originalOrder.user_id || 'guest',
          orderNote: input.orderNote || `Additional items for Order #${originalOrder.order_number}`,
          cartMetadata: {
            itemCount: input.additionalItems.length,
            subtotalAmount: additionalTotal.toFixed(2),
            totalAmount: additionalTotal.toFixed(2),
            customerEmail: input.customerEmail,
            originalOrderId: input.orderId,
            isAdditionalPayment: true
          }
        };
        
        const sessionResult = await stripeClient.createCheckoutSession(checkoutData);
        
        if (sessionResult.success) {
          console.log(`✅ Additional payment link created for order ${originalOrder.order_number}`);
          
          return {
            success: true,
            sessionId: sessionResult.sessionId,
            checkoutUrl: sessionResult.checkoutUrl,
            message: 'Additional payment link created successfully'
          };
        } else {
          throw new Error('Failed to create payment session');
        }
        
      } catch (error) {
        console.error('Error creating additional payment link:', error);
        return {
          success: false,
          message: error.message,
          errors: [error.message]
        };
      }
    },

    removeProof: async (_, { orderId, proofId }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        
        // Get current order
        const { data: currentOrder, error: fetchError } = await client
          .from('orders_main')
          .select('proofs')
          .eq('id', orderId)
          .single();
          
        if (fetchError) {
          throw new Error(`Failed to fetch order: ${fetchError.message}`);
        }
        
        // Remove the specific proof
        const updatedProofs = (currentOrder.proofs || []).filter(proof => proof.id !== proofId);
        
        // Update order with modified proofs
        const { data: updatedOrder, error: updateError } = await client
          .from('orders_main')
          .update({ proofs: updatedProofs })
          .eq('id', orderId)
          .select(`
            *,
            order_items_new(*)
          `)
          .single();
          
        if (updateError) {
          throw new Error(`Failed to remove proof: ${updateError.message}`);
        }
        
        return updatedOrder;
      } catch (error) {
        console.error('Error removing proof:', error);
        throw new Error(error.message);
      }
    },

    // EasyPost Mutations
    createEasyPostShipment: async (_, { orderId, packageDimensions }) => {
      try {
        console.log('🔍 DEBUG: createEasyPostShipment called');
        console.log('🔍 DEBUG: Input parameters:');
        console.log('  - orderId:', orderId);
        console.log('  - packageDimensions:', JSON.stringify(packageDimensions, null, 2));
        
        console.log('🔍 DEBUG: EasyPost client status check...');
        console.log('easyPostClient exists:', !!easyPostClient);
        
        // The isReady() method now handles re-initialization automatically
        const isReady = easyPostClient.isReady();
        console.log('easyPostClient.isReady():', isReady);
        
        if (!isReady) {
          console.log('❌ EasyPost client not ready - check logs above for details');
          return {
            success: false,
            error: 'EasyPost service is not configured. Please check server logs for details.'
          };
        }
        
        console.log('✅ EasyPost client is ready - proceeding with shipment creation');

        if (!supabaseClient.isReady()) {
          return {
            success: false,
            error: 'Order service is currently unavailable'
          };
        }

        // Get the order from Supabase
        const client = supabaseClient.getServiceClient();
        console.log('🔍 DEBUG: Fetching order from Supabase...');
        const { data: order, error: orderError } = await client
          .from('orders_main')
          .select(`
            *,
            order_items_new(*)
          `)
          .eq('id', orderId)
          .single();

        if (orderError || !order) {
          console.log('❌ Order fetch failed:', orderError?.message);
          return {
            success: false,
            error: `Order not found: ${orderError?.message || 'Unknown error'}`
          };
        }

        console.log('🔍 DEBUG: Order retrieved successfully:');
        console.log('  - Order ID:', order.id);
        console.log('  - Customer:', order.customer_first_name, order.customer_last_name);
        console.log('  - Shipping Address:', JSON.stringify(order.shipping_address, null, 2));

        // Handle from address based on test/production mode
        let fromAddress;
        
        if (easyPostClient.isTestMode()) {
          console.log('📍 Test mode detected - creating from address on the fly');
          // In test mode, create address object
          fromAddress = {
            name: 'Sticker Shuttle',
            company: 'Sticker Shuttle',
            street1: '2981 S Harrison St',
            street2: null,
            city: 'Denver',
            state: 'CO',
            zip: '80210',
            country: 'US',
            phone: '7205550000', // UPS prefers no dashes in phone numbers
            email: 'justin@stickershuttle.com',
            verify: ['delivery'] // Verify address for better carrier compatibility
          };
        } else {
          console.log('📍 Production mode - using pre-verified address ID');
          // In production, use pre-verified address ID
          fromAddress = 'adr_31c828354d4a11f08f10ac1f6bc539aa';
        }

        console.log('🔍 DEBUG: From address configured:');
        console.log('  - Type:', typeof fromAddress);
        console.log('  - Value:', JSON.stringify(fromAddress, null, 2));

        // Format order for EasyPost
        console.log('🔍 DEBUG: Formatting order for shipment...');
        const shipmentData = easyPostClient.formatOrderForShipment(order, fromAddress, packageDimensions);
        
        console.log('🔍 DEBUG: Shipment data formatted. About to call EasyPost...');
        
        // Create shipment with EasyPost
        const shipment = await easyPostClient.createShipment(shipmentData);

        console.log('🔍 DEBUG: EasyPost shipment creation completed');
        console.log('  - Shipment ID:', shipment.id);
        console.log('  - Total rates returned:', shipment.rates?.length || 0);

        // Enhanced rate debugging for the specific issue
        if (shipment.rates && shipment.rates.length > 0) {
          console.log('🔍 DEBUG: Detailed rate breakdown:');
          const carrierGroups = { UPS: [], FEDEX: [], USPS: [] };
          
          shipment.rates.forEach(rate => {
            const carrier = rate.carrier.toUpperCase();
            if (carrier === 'UPS' || carrier === 'UPSDAP') {
              carrierGroups.UPS.push({ service: rate.service, rate: rate.rate });
            } else if (carrier === 'FEDEX' || carrier === 'FEDEXDEFAULT') {
              carrierGroups.FEDEX.push({ service: rate.service, rate: rate.rate });
            } else if (carrier === 'USPS') {
              carrierGroups.USPS.push({ service: rate.service, rate: rate.rate });
            }
          });
          
          console.log('  - UPS rates:', carrierGroups.UPS.length, carrierGroups.UPS);
          console.log('  - FedEx rates:', carrierGroups.FEDEX.length, carrierGroups.FEDEX);
          console.log('  - USPS rates:', carrierGroups.USPS.length, carrierGroups.USPS);
        }

        const result = {
          success: true,
          shipment: {
            id: shipment.id,
            rates: shipment.rates.map(rate => ({
              id: rate.id,
              carrier: rate.carrier,
              service: rate.service,
              rate: rate.rate,
              currency: rate.currency,
              delivery_days: rate.delivery_days,
              delivery_date: rate.delivery_date,
              delivery_date_guaranteed: rate.delivery_date_guaranteed
            })),
            to_address: shipment.to_address,
            from_address: shipment.from_address,
            parcel: shipment.parcel,
            reference: shipment.reference
          }
        };

        console.log('🔍 DEBUG: Returning success response with', result.shipment.rates.length, 'rates');
        return result;
      } catch (error) {
        console.error('❌ ERROR in createEasyPostShipment:', error);
        console.error('❌ Error stack:', error.stack);
        
        // Log more details about the error
        if (error.message && error.message.includes('resource could not be found')) {
          console.error('❌ Resource not found error - this usually means:');
          console.error('  1. Using production address ID in test mode');
          console.error('  2. Invalid address ID');
          console.error('  3. Address was deleted');
          console.error('Current mode:', easyPostClient.isTestMode() ? 'TEST' : 'PRODUCTION');
        }
        
        return {
          success: false,
          error: error.message || 'Failed to create shipment'
        };
      }
    },

    buyEasyPostLabel: async (_, { shipmentId, rateId, orderId, insurance }) => {
      try {
        console.log('🎯 buyEasyPostLabel called with:', {
          shipmentId,
          rateId,
          orderId,
          insurance,
          hasOrderId: !!orderId
        });
        
        if (!easyPostClient.isReady()) {
          return {
            success: false,
            error: 'EasyPost service is not configured'
          };
        }

        // First, retrieve the shipment to get the complete rate object
        const client = easyPostClient.getClient();
        const shipment = await client.Shipment.retrieve(shipmentId);
        
        console.log('📦 Retrieved shipment for label purchase:', {
          id: shipment.id,
          reference: shipment.reference,
          has_reference: !!shipment.reference
        });
        
        // Find the complete rate object by ID
        const rate = shipment.rates.find(r => r.id === rateId);
        if (!rate) {
          return {
            success: false,
            error: 'Selected rate not found in shipment'
          };
        }
        
        // Buy the label with the complete rate object
        const boughtShipment = await easyPostClient.buyShipment(shipmentId, rate, insurance);

        // Update the order with tracking information
        if (boughtShipment.tracking_code && supabaseClient.isReady()) {
          try {
            const client = supabaseClient.getServiceClient();
            
            console.log('📋 Updating order with ID:', orderId);
            
            const { error: updateError } = await client
              .from('orders_main')
              .update({
                tracking_number: boughtShipment.tracking_code,
                tracking_company: boughtShipment.tracker?.carrier || boughtShipment.selected_rate?.carrier,
                tracking_url: boughtShipment.tracker?.public_url,
                fulfillment_status: 'partial', // Changed from 'fulfilled' to 'partial' for shipped status
                order_status: 'Shipped', // Add explicit order status
                proof_status: 'label_printed', // Changed from 'shipped' to 'label_printed' to distinguish label printing from actual shipping
                updated_at: new Date().toISOString()
              })
              .eq('id', orderId); // Use the orderId parameter directly

            if (updateError) {
              console.error('❌ Failed to update order with tracking info:', updateError);
              console.error('Order ID attempted:', orderId);
            } else {
              console.log('✅ Order updated with tracking information and status set to Shipped:', boughtShipment.tracking_code);
              console.log('Updated order ID:', orderId);
              
              // Verify the update and get full order data
              const { data: verifyOrder, error: verifyError } = await client
                .from('orders_main')
                .select('*')
                .eq('id', orderId)
                .single();
                
              if (verifyError) {
                console.error('❌ Error verifying order update:', verifyError);
              } else {
                console.log('✅ Verified order status:', verifyOrder);
                
                // Send shipped email notification
                try {
                  console.log('📧 Sending shipped notification to customer...');
                  const emailNotifications = require('./email-notifications');
                  
                  const orderForEmail = {
                    ...verifyOrder,
                    customerEmail: verifyOrder.customer_email,
                    orderNumber: verifyOrder.order_number || verifyOrder.id,
                    totalPrice: verifyOrder.total_price
                  };
                  
                  const emailResult = await emailNotifications.sendOrderStatusNotification(
                    orderForEmail,
                    'Shipped'
                  );
                  
                  if (emailResult.success) {
                    console.log('✅ Shipped notification sent successfully');
                  } else {
                    console.error('❌ Shipped notification failed:', emailResult.error);
                  }
                } catch (emailError) {
                  console.error('⚠️ Failed to send shipped notification (label still purchased):', emailError);
                }
              }
            }
          } catch (updateErr) {
            console.error('❌ Error updating order with tracking info:', updateErr);
          }
        }

        return {
          success: true,
          shipment: {
            id: boughtShipment.id,
            tracking_code: boughtShipment.tracking_code,
            postage_label: {
              id: boughtShipment.postage_label.id,
              label_url: boughtShipment.postage_label.label_url,
              label_file_type: boughtShipment.postage_label.label_file_type,
              label_size: boughtShipment.postage_label.label_size
            },
            selected_rate: {
              id: boughtShipment.selected_rate.id,
              carrier: boughtShipment.selected_rate.carrier,
              service: boughtShipment.selected_rate.service,
              rate: boughtShipment.selected_rate.rate,
              currency: boughtShipment.selected_rate.currency,
              delivery_days: boughtShipment.selected_rate.delivery_days,
              delivery_date: boughtShipment.selected_rate.delivery_date,
              delivery_date_guaranteed: boughtShipment.selected_rate.delivery_date_guaranteed
            },
            tracker: {
              id: boughtShipment.tracker.id,
              tracking_code: boughtShipment.tracker.tracking_code,
              carrier: boughtShipment.tracker.carrier,
              public_url: boughtShipment.tracker.public_url,
              status: boughtShipment.tracker.status,
              est_delivery_date: boughtShipment.tracker.est_delivery_date
            }
          }
        };
      } catch (error) {
        console.error('Error buying EasyPost label:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    trackEasyPostShipment: async (_, { trackingCode }) => {
      try {
        if (!easyPostClient.isReady()) {
          return {
            success: false,
            error: 'EasyPost service is not configured'
          };
        }

        const tracker = await easyPostClient.trackShipment(trackingCode);

        return {
          success: true,
          tracker: {
            id: tracker.id,
            tracking_code: tracker.tracking_code,
            carrier: tracker.carrier,
            public_url: tracker.public_url,
            status: tracker.status,
            est_delivery_date: tracker.est_delivery_date
          }
        };
      } catch (error) {
        console.error('Error tracking EasyPost shipment:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    getEasyPostLabel: async (_, { trackingCode }) => {
      try {
        if (!easyPostClient.isReady()) {
          return {
            success: false,
            error: 'EasyPost service is not configured'
          };
        }

        // Get order by tracking number to find the shipment reference
        if (!supabaseClient.isReady()) {
          return {
            success: false,
            error: 'Database service is not available'
          };
        }

        const client = supabaseClient.getServiceClient();
        const { data: order, error: orderError } = await client
          .from('orders_main')
          .select('id, order_number, tracking_number')
          .eq('tracking_number', trackingCode)
          .single();

        if (orderError || !order) {
          return {
            success: false,
            error: 'Order not found with this tracking number'
          };
        }

        // Use order reference to find shipment in EasyPost
        const orderReference = order.order_number || order.id;
        console.log('🔍 Looking for EasyPost shipment with reference:', orderReference);

        // Try to find the shipment by searching recent shipments
        const easyPostApiClient = easyPostClient.getClient();
        
        try {
          // Get recent shipments and find the one with matching reference
          const shipments = await easyPostApiClient.Shipment.all({ 
            page_size: 100 // Get last 100 shipments
          });

          const matchingShipment = shipments.shipments.find(shipment => 
            shipment.reference === orderReference && shipment.tracking_code === trackingCode
          );

          if (matchingShipment && matchingShipment.postage_label && matchingShipment.postage_label.label_url) {
            console.log('✅ Found shipment label URL:', matchingShipment.postage_label.label_url);
            
            return {
              success: true,
              labelUrl: matchingShipment.postage_label.label_url,
              trackingCode: matchingShipment.tracking_code,
              carrier: matchingShipment.selected_rate?.carrier || 'Unknown'
            };
          } else {
            console.warn('⚠️ Shipment found but no label URL available');
            return {
              success: false,
              error: 'Shipping label not found for this tracking number'
            };
          }
        } catch (searchError) {
          console.error('❌ Error searching for shipment:', searchError);
          return {
            success: false,
            error: 'Failed to retrieve shipping label from EasyPost'
          };
        }
      } catch (error) {
        console.error('Error getting EasyPost label:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    // Manual tracking update for testing/debugging
    updateOrderTracking: async (_, { orderId }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }

        // Get the order with tracking info
        const client = supabaseClient.getServiceClient();
        const { data: order, error: orderError } = await client
          .from('orders_main')
          .select('id, tracking_number, tracking_company, proof_status')
          .eq('id', orderId)
          .single();

        if (orderError || !order || !order.tracking_number) {
          throw new Error('Order not found or no tracking number available');
        }

        // Get latest tracking info from EasyPost
        if (!easyPostClient.isReady()) {
          throw new Error('EasyPost service is not configured');
        }

        const tracker = await easyPostClient.trackShipment(order.tracking_number);
        
        // Update order status based on tracking status
        let fulfillmentStatus = 'partial';
        let orderStatus = 'Shipped';
        let proofStatus = order.proof_status || 'label_printed';
        
        switch (tracker.status) {
          case 'pre_transit':
          case 'in_transit':
            fulfillmentStatus = 'partial';
            orderStatus = 'Shipped';
            proofStatus = 'shipped';
            break;
          case 'out_for_delivery':
            fulfillmentStatus = 'partial';
            orderStatus = 'Out for Delivery';
            proofStatus = 'shipped';
            break;
          case 'delivered':
            fulfillmentStatus = 'fulfilled';
            orderStatus = 'Delivered';
            proofStatus = 'delivered';
            break;
          case 'exception':
          case 'failure':
            fulfillmentStatus = 'partial';
            orderStatus = 'Shipping Issue';
            proofStatus = 'shipped';
            break;
        }

        // Update the order
        const { data: updatedOrder, error: updateError } = await client
          .from('orders_main')
          .update({
            fulfillment_status: fulfillmentStatus,
            order_status: orderStatus,
            proof_status: proofStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .select(`
            *,
            order_items_new(*)
          `)
          .single();

        if (updateError) {
          throw new Error(`Failed to update order: ${updateError.message}`);
        }

        return {
          ...updatedOrder,
          trackingInfo: {
            status: tracker.status,
            carrier: tracker.carrier,
            est_delivery_date: tracker.est_delivery_date,
            public_url: tracker.public_url
          }
        };
      } catch (error) {
        console.error('Error updating order tracking:', error);
        throw new Error(error.message);
      }
    },

    // Review Mutations
    createReview: async (_, { input }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if user has already reviewed this product
        const { data: existingReview, error: checkError } = await client
          .from('reviews')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', input.productId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw new Error('Failed to check existing reviews');
        }

        if (existingReview) {
          throw new Error('You have already reviewed this product');
        }

        // Check if user has purchased this product
        const canReview = await client
          .rpc('can_user_review_product', { 
            p_user_id: user.id, 
            p_product_id: input.productId 
          });

        if (canReview.error) {
          throw new Error('Failed to verify purchase eligibility');
        }

        if (!canReview.data) {
          throw new Error('You can only review products you have purchased');
        }

        // Find the order that contains this product for verification
        const { data: orderData, error: orderError } = await client
          .from('orders_main')
          .select(`
            id,
            order_items_new!inner(product_id)
          `)
          .eq('user_id', user.id)
          .eq('financial_status', 'paid')
          .eq('order_items_new.product_id', input.productId)
          .limit(1)
          .single();

        // Create the review
        const { data: newReview, error: createError } = await client
          .from('reviews')
          .insert({
            user_id: user.id,
            product_id: input.productId,
            product_category: input.productCategory,
            rating: input.rating,
            title: input.title,
            comment: input.comment,
            is_verified_purchase: !orderError && orderData ? true : false,
            order_id: !orderError && orderData ? orderData.id : null,
            status: 'active'
          })
          .select(`
            *,
            auth.users!inner(email)
          `)
          .single();

        if (createError) {
          console.error('Error creating review:', createError);
          throw new Error('Failed to create review');
        }

        return {
          ...newReview,
          userEmail: newReview.users?.email || user.email,
          userFirstName: user.user_metadata?.first_name || '',
          userLastName: user.user_metadata?.last_name || '',
          userDisplayName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Anonymous User'
        };
      } catch (error) {
        console.error('Error in createReview:', error);
        throw new Error(error.message);
      }
    },

    updateReview: async (_, { reviewId, input }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if review exists and belongs to user
        const { data: existingReview, error: checkError } = await client
          .from('reviews')
          .select('id, user_id')
          .eq('id', reviewId)
          .eq('user_id', user.id)
          .single();

        if (checkError) {
          throw new Error('Review not found or access denied');
        }

        // Update the review
        const updateData = {};
        if (input.rating !== undefined) updateData.rating = input.rating;
        if (input.title !== undefined) updateData.title = input.title;
        if (input.comment !== undefined) updateData.comment = input.comment;
        updateData.updated_at = new Date().toISOString();

        const { data: updatedReview, error: updateError } = await client
          .from('reviews')
          .update(updateData)
          .eq('id', reviewId)
          .select(`
            *,
            auth.users!inner(email)
          `)
          .single();

        if (updateError) {
          console.error('Error updating review:', updateError);
          throw new Error('Failed to update review');
        }

        return {
          ...updatedReview,
          userEmail: updatedReview.users?.email || user.email,
          userFirstName: user.user_metadata?.first_name || '',
          userLastName: user.user_metadata?.last_name || '',
          userDisplayName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Anonymous User'
        };
      } catch (error) {
        console.error('Error in updateReview:', error);
        throw new Error(error.message);
      }
    },

    deleteReview: async (_, { reviewId }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if review exists and belongs to user
        const { data: existingReview, error: checkError } = await client
          .from('reviews')
          .select('id, user_id')
          .eq('id', reviewId)
          .eq('user_id', user.id)
          .single();

        if (checkError) {
          throw new Error('Review not found or access denied');
        }

        // Delete the review
        const { error: deleteError } = await client
          .from('reviews')
          .delete()
          .eq('id', reviewId);

        if (deleteError) {
          console.error('Error deleting review:', deleteError);
          throw new Error('Failed to delete review');
        }

        return true;
      } catch (error) {
        console.error('Error in deleteReview:', error);
        throw new Error(error.message);
      }
    },

    voteOnReview: async (_, { reviewId, isHelpful }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if review exists
        const { data: review, error: reviewError } = await client
          .from('reviews')
          .select('id')
          .eq('id', reviewId)
          .single();

        if (reviewError) {
          throw new Error('Review not found');
        }

        // Upsert the vote (insert or update)
        const { error: voteError } = await client
          .from('review_votes')
          .upsert({
            review_id: reviewId,
            user_id: user.id,
            is_helpful: isHelpful
          }, {
            onConflict: 'review_id,user_id'
          });

        if (voteError) {
          console.error('Error voting on review:', voteError);
          throw new Error('Failed to vote on review');
        }

        // Get updated review with vote counts
        const { data: updatedReview, error: fetchError } = await client
          .rpc('get_product_reviews', { 
            p_product_id: review.product_id, 
            p_limit: 1, 
            p_offset: 0 
          })
          .eq('id', reviewId)
          .single();

        if (fetchError) {
          console.error('Error fetching updated review:', fetchError);
          throw new Error('Failed to fetch updated review');
        }

        return updatedReview;
      } catch (error) {
        console.error('Error in voteOnReview:', error);
        throw new Error(error.message);
      }
    },

    // Order Review Mutations
    createOrderReview: async (_, { input }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if order exists and belongs to user
        const { data: order, error: orderError } = await client
          .from('orders_main')
          .select('id, user_id, financial_status')
          .eq('id', input.orderId)
          .eq('user_id', user.id)
          .single();

        if (orderError) {
          throw new Error('Order not found or access denied');
        }

        // Only allow reviews for paid orders
        if (order.financial_status !== 'paid') {
          throw new Error('You can only review completed orders');
        }

        // Check if user has already reviewed this order
        const { data: existingReview, error: checkError } = await client
          .from('reviews')
          .select('id')
          .eq('user_id', user.id)
          .eq('order_id', input.orderId)
          .eq('product_category', 'order')
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw new Error('Failed to check existing reviews');
        }

        if (existingReview) {
          throw new Error('You have already reviewed this order');
        }

        // Create the order review
        const { data: newReview, error: createError } = await client
          .from('reviews')
          .insert({
            user_id: user.id,
            product_id: 'order-' + input.orderId, // Use order ID as product ID for order reviews
            product_category: 'order',
            rating: input.rating,
            title: input.title || '',
            comment: input.comment || '',
            is_verified_purchase: true, // Order reviews are always verified
            order_id: input.orderId,
            status: 'active'
          })
          .select(`
            *,
            auth.users!inner(email)
          `)
          .single();

        if (createError) {
          console.error('Error creating order review:', createError);
          throw new Error('Failed to create review');
        }

        return {
          ...newReview,
          userEmail: newReview.users?.email || user.email,
          userFirstName: user.user_metadata?.first_name || '',
          userLastName: user.user_metadata?.last_name || '',
          userDisplayName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Anonymous User'
        };
      } catch (error) {
        console.error('Error in createOrderReview:', error);
        throw new Error(error.message);
      }
    },

    updateOrderReview: async (_, { reviewId, input }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if review exists and belongs to user
        const { data: existingReview, error: checkError } = await client
          .from('reviews')
          .select('id, user_id, order_id')
          .eq('id', reviewId)
          .eq('user_id', user.id)
          .single();

        if (checkError) {
          throw new Error('Review not found or access denied');
        }

        // Ensure this is an order review
        if (!existingReview.order_id) {
          throw new Error('Invalid review type');
        }

        // Update the review
        const updateData = {};
        if (input.rating !== undefined) updateData.rating = input.rating;
        if (input.title !== undefined) updateData.title = input.title;
        if (input.comment !== undefined) updateData.comment = input.comment;
        updateData.updated_at = new Date().toISOString();

        const { data: updatedReview, error: updateError } = await client
          .from('reviews')
          .update(updateData)
          .eq('id', reviewId)
          .select(`
            *,
            auth.users!inner(email)
          `)
          .single();

        if (updateError) {
          console.error('Error updating order review:', updateError);
          throw new Error('Failed to update review');
        }

        return {
          ...updatedReview,
          userEmail: updatedReview.users?.email || user.email,
          userFirstName: user.user_metadata?.first_name || '',
          userLastName: user.user_metadata?.last_name || '',
          userDisplayName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Anonymous User'
        };
      } catch (error) {
        console.error('Error in updateOrderReview:', error);
        throw new Error(error.message);
      }
    },

    deleteOrderReview: async (_, { reviewId }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if review exists and belongs to user
        const { data: existingReview, error: checkError } = await client
          .from('reviews')
          .select('id, user_id, order_id')
          .eq('id', reviewId)
          .eq('user_id', user.id)
          .single();

        if (checkError) {
          throw new Error('Review not found or access denied');
        }

        // Ensure this is an order review
        if (!existingReview.order_id) {
          throw new Error('Invalid review type');
        }

        // Delete the review
        const { error: deleteError } = await client
          .from('reviews')
          .delete()
          .eq('id', reviewId);

        if (deleteError) {
          console.error('Error deleting order review:', deleteError);
          throw new Error('Failed to delete review');
        }

        return true;
      } catch (error) {
        console.error('Error in deleteOrderReview:', error);
        throw new Error(error.message);
      }
    },

    // Discount mutations
    createDiscountCode: async (_, { input }, context) => {
      try {
        console.log('🎫 Creating discount code:', input);
        
        // Admin authentication required
        requireAdminAuth(context.user);
        
        const code = await discountManager.createDiscountCode(input);
        
        // Map database fields to GraphQL schema
        return {
          id: code.id,
          code: code.code,
          description: code.description,
          discountType: code.discount_type,
          discountValue: parseFloat(code.discount_value),
          minimumOrderAmount: parseFloat(code.minimum_order_amount),
          usageLimit: code.usage_limit,
          usageCount: code.usage_count,
          validFrom: code.valid_from,
          validUntil: code.valid_until,
          active: code.active,
          createdAt: code.created_at,
          updatedAt: code.updated_at
        };
      } catch (error) {
        console.error('❌ Error creating discount code:', error);
        throw new Error(error.message);
      }
    },

    updateDiscountCode: async (_, { id, input }, context) => {
      try {
        console.log('📝 Updating discount code:', id, input);
        
        // Admin authentication required
        requireAdminAuth(context.user);
        
        const code = await discountManager.updateDiscountCode(id, input);
        
        // Map database fields to GraphQL schema
        return {
          id: code.id,
          code: code.code,
          description: code.description,
          discountType: code.discount_type,
          discountValue: parseFloat(code.discount_value),
          minimumOrderAmount: parseFloat(code.minimum_order_amount),
          usageLimit: code.usage_limit,
          usageCount: code.usage_count,
          validFrom: code.valid_from,
          validUntil: code.valid_until,
          active: code.active,
          createdAt: code.created_at,
          updatedAt: code.updated_at
        };
      } catch (error) {
        console.error('❌ Error updating discount code:', error);
        throw new Error(error.message);
      }
    },

    deleteDiscountCode: async (_, { id }, context) => {
      try {
        console.log('🗑️ Deleting discount code:', id);
        
        // Admin authentication required
        requireAdminAuth(context.user);
        
        return await discountManager.deleteDiscountCode(id);
      } catch (error) {
        console.error('❌ Error deleting discount code:', error);
        throw new Error(error.message);
      }
    },

    applyDiscountToCheckout: async (_, { code, orderAmount, hasReorderItems }, context) => {
      try {
        console.log('💰 Applying discount to checkout:', code, orderAmount, 'hasReorderItems:', hasReorderItems);
        
        // Check if there are reorder items - prevent stacking with reorder discount
        if (hasReorderItems) {
          console.log('❌ Cannot apply discount code with reorder items');
          return {
            valid: false,
            discountCode: null,
            discountAmount: 0,
            message: 'Cannot apply discount codes with reorder discount. You\'re already saving 10% on this reorder!'
          };
        }
        
        // Get user info from context if available
        const userId = context.user?.id || null;
        const guestEmail = context.guestEmail || null;
        
        const result = await discountManager.validateCode(code, orderAmount, userId, guestEmail);
        
        // Map the result to GraphQL schema
        return {
          valid: result.valid,
          discountCode: result.discountCode ? {
            id: result.discountCode.id,
            code: result.discountCode.code,
            description: result.discountCode.description,
            discountType: result.discountCode.discountType,
            discountValue: result.discountCode.discountValue,
            minimumOrderAmount: result.discountCode.minimumOrderAmount,
            usageLimit: result.discountCode.usageLimit,
            usageCount: result.discountCode.usageCount,
            validFrom: result.discountCode.validFrom,
            validUntil: result.discountCode.validUntil,
            active: result.discountCode.active,
            createdAt: result.discountCode.createdAt,
            updatedAt: result.discountCode.updatedAt
          } : null,
          discountAmount: result.discountAmount,
          message: result.message
        };
      } catch (error) {
        console.error('❌ Error applying discount:', error);
        return {
          valid: false,
          discountCode: null,
          discountAmount: 0,
          message: 'Error applying discount',
          error: error.message
        };
      }
    },

    removeDiscountSession: async (_, args, context) => {
      try {
        console.log('🗑️ Removing discount session', 'sessionId:', args.sessionId);
        
        // Get user info from context if available
        const userId = context.user?.id || null;
        const guestEmail = context.guestEmail || null;
        const sessionId = args.sessionId || null;
        
        discountManager.removeDiscountFromSession(userId, guestEmail, sessionId);
        
        return {
          success: true,
          message: 'Discount session removed successfully'
        };
      } catch (error) {
        console.error('❌ Error removing discount session:', error);
        return {
          success: false,
          message: 'Error removing discount session',
          error: error.message
        };
      }
    },
    


    // Klaviyo mutations
    subscribeToKlaviyo: async (_, { email, listId }) => {
      try {
        if (!klaviyoClient || !klaviyoClient.isReady()) {
          throw new Error('Klaviyo service is currently unavailable');
        }

        const result = await klaviyoClient.subscribeToList(email, listId);
        return {
          success: result.success,
          message: result.success ? 'Successfully subscribed to Klaviyo' : 'Failed to subscribe to Klaviyo',
          error: result.error || null,
          profileId: result.profileId || null
        };
      } catch (error) {
        console.error('❌ Error in subscribeToKlaviyo:', error);
        return {
          success: false,
          message: 'Failed to subscribe to Klaviyo',
          error: error.message,
          profileId: null
        };
      }
    },

    unsubscribeFromKlaviyo: async (_, { email, listId }) => {
      try {
        if (!klaviyoClient || !klaviyoClient.isReady()) {
          throw new Error('Klaviyo service is currently unavailable');
        }

        const result = await klaviyoClient.unsubscribeFromList(email, listId);
        return {
          success: result.success,
          message: result.success ? 'Successfully unsubscribed from Klaviyo' : 'Failed to unsubscribe from Klaviyo',
          error: result.error || null,
          profileId: result.profileId || null
        };
      } catch (error) {
        console.error('❌ Error in unsubscribeFromKlaviyo:', error);
        return {
          success: false,
          message: 'Failed to unsubscribe from Klaviyo',
          error: error.message,
          profileId: null
        };
      }
    },

    syncCustomerToKlaviyo: async (_, { customerData }) => {
      try {
        if (!klaviyoClient || !klaviyoClient.isReady()) {
          throw new Error('Klaviyo service is currently unavailable');
        }

        console.log('🔄 Syncing customer to Klaviyo:', customerData.email);
        
        const result = await klaviyoClient.syncCustomerToKlaviyo(customerData);
        return {
          success: result.success,
          message: result.success ? 'Successfully synced customer to Klaviyo' : 'Failed to sync customer to Klaviyo',
          error: result.error || null
        };
      } catch (error) {
        console.error('❌ Error in syncCustomerToKlaviyo:', error);
        return {
          success: false,
          message: 'Failed to sync customer to Klaviyo',
          error: error.message
        };
      }
    },

    bulkSyncCustomersToKlaviyo: async (_, { customers }) => {
      try {
        if (!klaviyoClient || !klaviyoClient.isReady()) {
          throw new Error('Klaviyo service is currently unavailable');
        }

        console.log('🔄 Bulk syncing customers to Klaviyo, count:', customers.length);
        
        const result = await klaviyoClient.bulkSyncCustomers(customers);
        return {
          success: result.success,
          failed: result.failed,
          total: customers.length,
          errors: result.errors || []
        };
      } catch (error) {
        console.error('❌ Error in bulkSyncCustomersToKlaviyo:', error);
        return {
          success: 0,
          failed: customers.length,
          total: customers.length,
          errors: [{ email: 'unknown', error: error.message }]
        };
      }
    },

    updateCustomerSubscription: async (_, { email, subscribed }) => {
      try {
        if (!klaviyoClient || !klaviyoClient.isReady()) {
          throw new Error('Klaviyo service is currently unavailable');
        }

        // Update in Klaviyo
        const klaviyoResult = subscribed
          ? await klaviyoClient.subscribeToList(email)
          : await klaviyoClient.unsubscribeFromList(email);

        // Update in local database if available
        let customer = null;
        if (supabaseClient.isReady()) {
          try {
            const client = supabaseClient.getServiceClient();
            const { data: updatedCustomer, error } = await client
              .from('user_profiles')
              .update({ 
                marketing_opt_in: subscribed,
                updated_at: new Date().toISOString()
              })
              .eq('email', email)
              .select('id, email, marketing_opt_in')
              .single();

            if (!error && updatedCustomer) {
              customer = {
                id: updatedCustomer.id,
                email: updatedCustomer.email,
                marketingOptIn: updatedCustomer.marketing_opt_in
              };
            }
          } catch (dbError) {
            console.warn('⚠️ Failed to update local database:', dbError);
          }
        }

        return {
          success: klaviyoResult.success,
          message: klaviyoResult.success 
            ? `Successfully ${subscribed ? 'subscribed' : 'unsubscribed'} customer`
            : `Failed to ${subscribed ? 'subscribe' : 'unsubscribe'} customer`,
          customer: customer
        };
      } catch (error) {
        console.error('❌ Error in updateCustomerSubscription:', error);
        return {
          success: false,
          message: 'Failed to update customer subscription',
          customer: null
        };
      }
    },

    trackKlaviyoEvent: async (_, { email, eventName, properties }) => {
      try {
        if (!klaviyoClient || !klaviyoClient.isReady()) {
          throw new Error('Klaviyo service is currently unavailable');
        }

        console.log('📊 Tracking Klaviyo event:', { email, eventName });
        
        const result = await klaviyoClient.trackEvent(email, eventName, properties);
        return {
          success: result.success,
          message: result.success ? 'Successfully tracked event' : 'Failed to track event',
          error: result.error || null
        };
      } catch (error) {
        console.error('❌ Error in trackKlaviyoEvent:', error);
        return {
          success: false,
          message: 'Failed to track event',
          error: error.message
        };
      }
    },

    syncAllCustomersToKlaviyo: async (_, args, context) => {
      try {
        // Check if user is admin
        const { user } = context;
        requireAdminAuth(user);

        if (!klaviyoClient || !klaviyoClient.isReady()) {
          throw new Error('Klaviyo service is currently unavailable');
        }

        if (!supabaseClient.isReady()) {
          throw new Error('Database service is currently unavailable');
        }

        console.log('🔄 Starting sync of all customers to Klaviyo...');
        
        // Get all customers from database
        const client = supabaseClient.getServiceClient();
        const { data: customers, error } = await client
          .from('user_profiles')
          .select(`
            user_id,
            first_name,
            last_name,
            email,
            marketing_opt_in,
            created_at,
            updated_at
          `)
          .not('email', 'is', null);

        if (error) {
          throw new Error(`Failed to fetch customers: ${error.message}`);
        }

        // Convert to Klaviyo format
        const klaviyoCustomers = customers.map(customer => ({
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          marketingOptIn: customer.marketing_opt_in,
          createdAt: customer.created_at,
          updatedAt: customer.updated_at
        }));

        console.log(`📊 Found ${klaviyoCustomers.length} customers to sync`);
        
        const result = await klaviyoClient.bulkSyncCustomers(klaviyoCustomers);
        
        console.log('✅ Bulk sync completed:', result);
        
        return {
          success: result.success,
          failed: result.failed,
          total: klaviyoCustomers.length,
          errors: result.errors || []
        };
      } catch (error) {
        console.error('❌ Error in syncAllCustomersToKlaviyo:', error);
        return {
          success: 0,
          failed: 0,
          total: 0,
          errors: [{ email: 'unknown', error: error.message }]
        };
      }
    },

    // Shared cart mutations
    createSharedCart: async (_, { input }, context) => {
      try {
        // Anyone can create shared carts
        const { user } = context;
        const createdBy = user?.email || 'anonymous';

        if (!supabaseClient.isReady()) {
          throw new Error('Database service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Generate a unique share ID
        const { v4: uuidv4 } = require('uuid');
        const shareId = uuidv4();
        
        // Set expiration (default 30 days from now)
        const expiresAt = input.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        
        // Create shared cart record
        const { data: sharedCart, error } = await client
          .from('shared_carts')
          .insert({
            share_id: shareId,
            cart_data: input.cartData,
            created_by: createdBy,
            expires_at: expiresAt,
            access_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error creating shared cart:', error);
          throw new Error(`Failed to create shared cart: ${error.message}`);
        }

        const shareUrl = `https://stickershuttle.com/shared-cart/${shareId}`;
        
        console.log('✅ Successfully created shared cart:', shareId);
        
        return {
          success: true,
          sharedCart: {
            id: sharedCart.id,
            shareId: sharedCart.share_id,
            cartData: sharedCart.cart_data,
            createdBy: sharedCart.created_by,
            createdAt: sharedCart.created_at,
            expiresAt: sharedCart.expires_at,
            accessCount: sharedCart.access_count,
            lastAccessAt: sharedCart.last_access_at
          },
          shareUrl
        };
      } catch (error) {
        console.error('❌ Error in createSharedCart:', error);
        return { success: false, error: error.message };
      }
    },

    // User Profile mutations
    updateUserProfileNames: async (_, { userId, firstName, lastName }) => {
      try {
        console.log('📝 Updating user profile names:', { userId, firstName, lastName });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Profile service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Use direct table update instead of missing RPC function
        const updateData = {
          first_name: firstName,
          last_name: lastName,
          display_name: firstName && lastName ? `${firstName} ${lastName}` : null,
          updated_at: new Date().toISOString()
        };

        const { data: profile, error } = await client
          .from('user_profiles')
          .update(updateData)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error updating user profile names:', error);
          throw new Error(`Failed to update profile: ${error.message}`);
        }

        console.log('✅ Successfully updated user profile names');
        
        return {
          success: true,
          message: 'Profile names updated successfully',
          userProfile: {
            id: profile.id,
            userId: profile.user_id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            displayName: profile.display_name,
            bio: profile.bio,
            profilePhotoUrl: profile.profile_photo_url,
            bannerImageUrl: profile.banner_image_url,
            profilePhotoPublicId: profile.profile_photo_public_id,
            bannerImagePublicId: profile.banner_image_public_id,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at
          }
        };
      } catch (error) {
        console.error('❌ Error in updateUserProfileNames:', error);
        return {
          success: false,
          message: error.message,
          userProfile: null
        };
      }
    },

    createUserProfile: async (_, { userId, firstName, lastName, phoneNumber, companyWebsite }) => {
      try {
        console.log('👤 Creating user profile:', { userId, firstName, lastName, phoneNumber, companyWebsite });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Profile service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Use specific default avatar for all new signups
        const defaultAvatar = 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751390215/StickerShuttle_Avatar1_dmnkat.png';
        console.log('🎭 Assigned default avatar:', defaultAvatar);
        
        // Create profile with default avatar
        const displayName = firstName && lastName ? `${firstName} ${lastName}` : null;
        
        const { data: profile, error } = await client
          .from('user_profiles')
          .upsert({
            user_id: userId,
            first_name: firstName,
            last_name: lastName,
            display_name: displayName,
            phone_number: phoneNumber,
            company_website: companyWebsite,
            profile_photo_url: defaultAvatar,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error creating user profile:', error);
          throw new Error(`Failed to create profile: ${error.message}`);
        }

        console.log('✅ Successfully created user profile with default avatar');
        
        return {
          success: true,
          message: 'Profile created successfully',
          userProfile: {
            id: profile.id,
            userId: profile.user_id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            displayName: profile.display_name,
            bio: profile.bio,
            phoneNumber: profile.phone_number,
            companyWebsite: profile.company_website,
            profilePhotoUrl: profile.profile_photo_url,
            bannerImageUrl: profile.banner_image_url,
            profilePhotoPublicId: profile.profile_photo_public_id,
            bannerImagePublicId: profile.banner_image_public_id,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at
          }
        };
      } catch (error) {
        console.error('❌ Error in createUserProfile:', error);
        return {
          success: false,
          message: error.message,
          userProfile: null
        };
      }
    },

    updateUserProfilePhoto: async (_, { userId, photoUrl, photoPublicId }) => {
      try {
        console.log('📸 Updating user profile photo:', { userId, photoUrl });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Profile service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Call the database function
        const { data, error } = await client.rpc('update_user_profile_photo', {
          p_user_id: userId,
          p_photo_url: photoUrl,
          p_photo_public_id: photoPublicId
        });

        if (error) {
          console.error('❌ Error updating profile photo:', error);
          throw new Error(`Failed to update profile photo: ${error.message}`);
        }

        // Fetch the updated profile
        const { data: profile, error: fetchError } = await client
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (fetchError) {
          console.error('❌ Error fetching updated profile:', fetchError);
          throw new Error('Profile photo updated but failed to fetch result');
        }

        console.log('✅ Successfully updated profile photo');
        
        return {
          success: true,
          message: 'Profile photo updated successfully',
          userProfile: {
            id: profile.id,
            userId: profile.user_id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            displayName: profile.display_name,
            bio: profile.bio,
            profilePhotoUrl: profile.profile_photo_url,
            bannerImageUrl: profile.banner_image_url,
            profilePhotoPublicId: profile.profile_photo_public_id,
            bannerImagePublicId: profile.banner_image_public_id,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at
          }
        };
      } catch (error) {
        console.error('❌ Error in updateUserProfilePhoto:', error);
        return {
          success: false,
          message: error.message,
          userProfile: null
        };
      }
    },

    updateUserProfileBanner: async (_, { userId, bannerUrl, bannerPublicId, bannerTemplate, bannerTemplateId }) => {
      try {
        console.log('🖼️ Updating user profile banner:', { userId, bannerUrl, bannerTemplate, bannerTemplateId });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Profile service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Use direct table update instead of problematic RPC function
        const updateData = {
          banner_image_url: bannerUrl,
          banner_image_public_id: bannerPublicId,
          banner_template: bannerTemplate,
          banner_template_id: bannerTemplateId,
          updated_at: new Date().toISOString()
        };

        // Remove null/undefined values
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });

        const { data: profile, error } = await client
          .from('user_profiles')
          .update(updateData)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error updating profile banner:', error);
          throw new Error(`Failed to update profile banner: ${error.message}`);
        }

        console.log('✅ Successfully updated profile banner');
        
        return {
          success: true,
          message: 'Profile banner updated successfully',
          userProfile: {
            id: profile.id,
            userId: profile.user_id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            displayName: profile.display_name,
            bio: profile.bio,
            profilePhotoUrl: profile.profile_photo_url,
            bannerImageUrl: profile.banner_image_url,
            profilePhotoPublicId: profile.profile_photo_public_id,
            bannerImagePublicId: profile.banner_image_public_id,
            bannerTemplate: profile.banner_template,
            bannerTemplateId: profile.banner_template_id,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at
          }
        };
      } catch (error) {
        console.error('❌ Error in updateUserProfileBanner:', error);
        return {
          success: false,
          message: error.message,
          userProfile: null
        };
      }
    },

    updateUserProfileCompany: async (_, { userId, companyName }) => {
      try {
        console.log('🏢 Updating user profile company:', { userId, companyName });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Profile service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Call the database function
        const { data, error } = await client.rpc('update_user_profile_company', {
          p_user_id: userId,
          p_company_name: companyName
        });

        if (error) {
          console.error('❌ Error updating profile company:', error);
          throw new Error(`Failed to update company name: ${error.message}`);
        }

        // Fetch the updated profile
        const { data: profile, error: fetchError } = await client
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (fetchError) {
          console.error('❌ Error fetching updated profile:', fetchError);
          throw new Error('Company name updated but failed to fetch result');
        }

        console.log('✅ Successfully updated company name');
        
        return {
          success: true,
          message: 'Company name updated successfully',
          userProfile: {
            id: profile.id,
            userId: profile.user_id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            displayName: profile.display_name,
            bio: profile.bio,
            profilePhotoUrl: profile.profile_photo_url,
            bannerImageUrl: profile.banner_image_url,
            profilePhotoPublicId: profile.profile_photo_public_id,
            bannerImagePublicId: profile.banner_image_public_id,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at
          }
        };
      } catch (error) {
        console.error('❌ Error in updateUserProfileCompany:', error);
        return {
          success: false,
          message: error.message,
          userProfile: null
        };
      }
    },

    updateUserProfileComprehensive: async (_, { userId, input }) => {
      try {
        console.log('🔄 Updating user profile comprehensively:', { userId, input });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Profile service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Call the database function
        const { data, error } = await client.rpc('update_user_profile_comprehensive', {
          p_user_id: userId,
          p_first_name: input.firstName,
          p_last_name: input.lastName,
          p_company_name: input.companyName,
          p_profile_photo_url: input.profilePhotoUrl,
          p_profile_photo_public_id: input.profilePhotoPublicId,
          p_banner_image_url: input.bannerImageUrl,
          p_banner_image_public_id: input.bannerImagePublicId,
          p_bio: input.bio
        });

        if (error) {
          console.error('❌ Error updating profile comprehensively:', error);
          throw new Error(`Failed to update profile: ${error.message}`);
        }

        // Fetch the updated profile
        const { data: profile, error: fetchError } = await client
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (fetchError) {
          console.error('❌ Error fetching updated profile:', fetchError);
          throw new Error('Profile updated but failed to fetch result');
        }

        console.log('✅ Successfully updated profile comprehensively');
        
        return {
          success: true,
          message: 'Profile updated successfully',
          userProfile: {
            id: profile.id,
            userId: profile.user_id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            displayName: profile.display_name,
            bio: profile.bio,
            profilePhotoUrl: profile.profile_photo_url,
            bannerImageUrl: profile.banner_image_url,
            profilePhotoPublicId: profile.profile_photo_public_id,
            bannerImagePublicId: profile.banner_image_public_id,
            companyName: profile.company_name,
            isWholesaleCustomer: profile.is_wholesale_customer,
            wholesaleCreditRate: profile.wholesale_credit_rate,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at
          }
        };
      } catch (error) {
        console.error('❌ Error in updateUserProfileComprehensive:', error);
        return {
          success: false,
          message: error.message,
          userProfile: null
        };
      }
    },

    createWholesaleUserProfile: async (_, { userId, input }) => {
      try {
        console.log('🏪 Creating wholesale user profile:', { userId, input });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Profile service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Use specific default avatar for all new signups
        const defaultAvatar = 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751390215/StickerShuttle_Avatar1_dmnkat.png';
        console.log('🎭 Assigned default avatar:', defaultAvatar);
        
        // Create wholesale profile with 5% credit rate (pending approval)
        const displayName = `${input.firstName} ${input.lastName}`;
        const wholesaleCreditRate = 0.05; // 5% until approved for wholesale
        
        const { data: profile, error } = await client
          .from('user_profiles')
          .upsert({
            user_id: userId,
            first_name: input.firstName,
            last_name: input.lastName,
            display_name: displayName,
            phone_number: input.phoneNumber,
            company_website: input.companyWebsite,
            company_name: input.companyName,
            is_wholesale_customer: true,
            wholesale_credit_rate: wholesaleCreditRate,
            wholesale_monthly_customers: input.wholesaleMonthlyCustomers,
            wholesale_ordering_for: input.wholesaleOrderingFor,
            wholesale_fit_explanation: input.wholesaleFitExplanation,
            wholesale_status: 'pending',
            profile_photo_url: defaultAvatar,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error creating wholesale user profile:', error);
          throw new Error(`Failed to create wholesale profile: ${error.message}`);
        }

        console.log('✅ Successfully created wholesale user profile');
        
        // Grant signup credits if specified
        if (input.signupCreditAmount && input.signupCreditAmount > 0) {
          try {
            console.log(`💰 Granting ${input.signupCreditAmount} signup credits to wholesale customer`);
            
            const { data: creditResult, error: creditError } = await client
              .rpc('grant_wholesale_signup_credits', {
                p_user_id: userId,
                p_signup_credits_amount: input.signupCreditAmount
              });

            if (creditError) {
              console.error('❌ Error granting signup credits:', creditError);
              // Don't fail the entire operation, just log it
            } else {
              console.log('✅ Successfully granted signup credits:', creditResult);
            }
          } catch (creditError) {
            console.error('❌ Error in signup credit process:', creditError);
            // Don't fail the entire operation
          }
        }
        
        return {
          success: true,
          message: 'Wholesale profile created successfully',
          userProfile: {
            id: profile.id,
            userId: profile.user_id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            displayName: profile.display_name,
            bio: profile.bio,
            phoneNumber: profile.phone_number,
            companyWebsite: profile.company_website,
            profilePhotoUrl: profile.profile_photo_url,
            bannerImageUrl: profile.banner_image_url,
            profilePhotoPublicId: profile.profile_photo_public_id,
            bannerImagePublicId: profile.banner_image_public_id,
            companyName: profile.company_name,
            isWholesaleCustomer: profile.is_wholesale_customer,
            wholesaleCreditRate: profile.wholesale_credit_rate,
            wholesaleMonthlyCustomers: profile.wholesale_monthly_customers,
            wholesaleOrderingFor: profile.wholesale_ordering_for,
            wholesaleFitExplanation: profile.wholesale_fit_explanation,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at
          }
        };
      } catch (error) {
        console.error('❌ Error in createWholesaleUserProfile:', error);
        return {
          success: false,
          message: error.message,
          userProfile: null
        };
      }
    },

    updateWholesaleStatus: async (_, { userId, isWholesaleCustomer, wholesaleCreditRate }) => {
      try {
        console.log('🔄 Updating wholesale status:', { userId, isWholesaleCustomer, wholesaleCreditRate });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Profile service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Update wholesale status and credit rate
        const updateData = {
          is_wholesale_customer: isWholesaleCustomer,
          wholesale_credit_rate: wholesaleCreditRate || (isWholesaleCustomer ? 0.025 : 0.05),
          wholesale_status: isWholesaleCustomer ? 'approved' : null,
          wholesale_approved_at: isWholesaleCustomer ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        };
        
        const { data: profile, error } = await client
          .from('user_profiles')
          .update(updateData)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error updating wholesale status:', error);
          throw new Error(`Failed to update wholesale status: ${error.message}`);
        }

        console.log('✅ Successfully updated wholesale status');
        
        return {
          success: true,
          message: 'Wholesale status updated successfully',
          userProfile: {
            id: profile.id,
            userId: profile.user_id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            displayName: profile.display_name,
            bio: profile.bio,
            profilePhotoUrl: profile.profile_photo_url,
            bannerImageUrl: profile.banner_image_url,
            profilePhotoPublicId: profile.profile_photo_public_id,
            bannerImagePublicId: profile.banner_image_public_id,
            companyName: profile.company_name,
            isWholesaleCustomer: profile.is_wholesale_customer,
            wholesaleCreditRate: profile.wholesale_credit_rate,
            wholesaleStatus: profile.wholesale_status,
            wholesaleApprovedAt: profile.wholesale_approved_at,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at
          }
        };
      } catch (error) {
        console.error('❌ Error in updateWholesaleStatus:', error);
        return {
          success: false,
          message: error.message,
          userProfile: null
        };
      }
    },

    // Creator management mutations
    updateCreatorStatus: async (_, { userId, isCreator }) => {
      try {
        console.log('🎨 Updating creator status:', { userId, isCreator });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Creator service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        if (isCreator) {
          // Get user's email and name for creator record
          const { data: authUser, error: authError } = await client.auth.admin.getUserById(userId);
          
          if (authError) {
            throw new Error(`Failed to fetch user data: ${authError.message}`);
          }

          // Get user profile for additional info
          const { data: profile, error: profileError } = await client
            .from('user_profiles')
            .select('first_name, last_name')
            .eq('user_id', userId)
            .single();

          const firstName = profile?.first_name || authUser.user?.user_metadata?.first_name || '';
          const lastName = profile?.last_name || authUser.user?.user_metadata?.last_name || '';
          const creatorName = `${firstName} ${lastName}`.trim() || authUser.user?.email?.split('@')[0] || 'Creator';

          // Create or reactivate creator
          const { data: creator, error: upsertError } = await client
            .from('creators')
            .upsert({
              user_id: userId,
              creator_name: creatorName,
              email: authUser.user?.email,
              is_active: true,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            })
            .select('*')
            .single();

          if (upsertError) {
            throw new Error(`Failed to create/update creator: ${upsertError.message}`);
          }

          console.log('✅ Creator created/activated successfully');
          
          return {
            success: true,
            message: 'Creator status updated successfully',
            creator: {
              id: creator.id,
              userId: creator.user_id,
              creatorName: creator.creator_name,
              email: creator.email,
              isActive: creator.is_active,
              totalProducts: creator.total_products || 0,
              createdAt: creator.created_at,
              updatedAt: creator.updated_at
            }
          };
        } else {
          // Deactivate creator
          const { data: creator, error: updateError } = await client
            .from('creators')
            .update({
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select('*')
            .single();

          if (updateError) {
            if (updateError.code === 'PGRST116') {
              // No creator found - that's fine, user wasn't a creator anyway
              return {
                success: true,
                message: 'User was not a creator',
                creator: null
              };
            }
            throw new Error(`Failed to deactivate creator: ${updateError.message}`);
          }

          console.log('✅ Creator deactivated successfully');
          
          return {
            success: true,
            message: 'Creator status updated successfully',
            creator: {
              id: creator.id,
              userId: creator.user_id,
              creatorName: creator.creator_name,
              email: creator.email,
              isActive: creator.is_active,
              totalProducts: creator.total_products || 0,
              createdAt: creator.created_at,
              updatedAt: creator.updated_at
            }
          };
        }
      } catch (error) {
        console.error('❌ Error in updateCreatorStatus:', error);
        return {
          success: false,
          message: error.message,
          creator: null
        };
      }
    },

    // Admin wholesale approval mutations
    approveWholesaleApplication: async (_, { userId, approvedBy }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        console.log('✅ Approving wholesale application:', { userId, approvedBy });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Profile service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Update wholesale status to approved with 2.5% credit rate
        const updateData = {
          wholesale_status: 'approved',
          wholesale_credit_rate: 0.025, // Upgrade to 2.5% 
          wholesale_approved_at: new Date().toISOString(),
          wholesale_approved_by: approvedBy,
          updated_at: new Date().toISOString()
        };
        
        const { data: profile, error } = await client
          .from('user_profiles')
          .update(updateData)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error approving wholesale application:', error);
          throw new Error(`Failed to approve application: ${error.message}`);
        }

        console.log('✅ Successfully approved wholesale application');

        // Send approval email notification
        try {
          const emailNotifications = require('./email-notifications');
          await emailNotifications.sendWholesaleApprovalEmail({
            userId: userId,
            email: profile.email || '',
            firstName: profile.first_name || 'Customer',
            companyName: profile.company_name || ''
          });
          console.log('✅ Wholesale approval email sent');
        } catch (emailError) {
          console.error('⚠️ Failed to send approval email (non-critical):', emailError);
          // Don't fail the whole operation if email fails
        }
        
        return {
          success: true,
          message: 'Wholesale application approved successfully! Customer now gets 10% store credit.',
          userProfile: {
            id: profile.id,
            userId: profile.user_id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            displayName: profile.display_name,
            bio: profile.bio,
            profilePhotoUrl: profile.profile_photo_url,
            bannerImageUrl: profile.banner_image_url,
            profilePhotoPublicId: profile.profile_photo_public_id,
            bannerImagePublicId: profile.banner_image_public_id,
            companyName: profile.company_name,
            isWholesaleCustomer: profile.is_wholesale_customer,
            wholesaleCreditRate: profile.wholesale_credit_rate,
            wholesaleMonthlyCustomers: profile.wholesale_monthly_customers,
            wholesaleOrderingFor: profile.wholesale_ordering_for,
            wholesaleFitExplanation: profile.wholesale_fit_explanation,
            wholesaleStatus: profile.wholesale_status,
            wholesaleApprovedAt: profile.wholesale_approved_at,
            wholesaleApprovedBy: profile.wholesale_approved_by,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at
          }
        };
      } catch (error) {
        console.error('❌ Error in approveWholesaleApplication:', error);
        return {
          success: false,
          message: error.message,
          userProfile: null
        };
      }
    },

    rejectWholesaleApplication: async (_, { userId, rejectedBy }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        console.log('❌ Rejecting wholesale application:', { userId, rejectedBy });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Profile service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Update wholesale status to rejected, keep 5% credit rate
        const updateData = {
          wholesale_status: 'rejected',
          wholesale_credit_rate: 0.05, // Keep at 5%
          wholesale_approved_at: new Date().toISOString(), // Track rejection time
          wholesale_approved_by: rejectedBy,
          updated_at: new Date().toISOString()
        };
        
        const { data: profile, error } = await client
          .from('user_profiles')
          .update(updateData)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error rejecting wholesale application:', error);
          throw new Error(`Failed to reject application: ${error.message}`);
        }

        console.log('✅ Successfully rejected wholesale application');
        
        return {
          success: true,
          message: 'Wholesale application rejected. Customer remains at 5% store credit.',
          userProfile: {
            id: profile.id,
            userId: profile.user_id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            displayName: profile.display_name,
            bio: profile.bio,
            profilePhotoUrl: profile.profile_photo_url,
            bannerImageUrl: profile.banner_image_url,
            profilePhotoPublicId: profile.profile_photo_public_id,
            bannerImagePublicId: profile.banner_image_public_id,
            companyName: profile.company_name,
            isWholesaleCustomer: profile.is_wholesale_customer,
            wholesaleCreditRate: profile.wholesale_credit_rate,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at
          }
        };
      } catch (error) {
        console.error('❌ Error in rejectWholesaleApplication:', error);
        return {
          success: false,
          message: error.message,
          userProfile: null
        };
      }
    },

    revokeWholesaleAccess: async (_, { userId, revokedBy }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        console.log('🚫 Revoking wholesale access:', { userId, revokedBy });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Profile service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Verify the customer exists and is currently approved
        const { data: existingProfile, error: profileError } = await client
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (profileError || !existingProfile) {
          throw new Error('User profile not found');
        }

        if (existingProfile.wholesale_status !== 'approved') {
          throw new Error('User is not an approved wholesale customer');
        }
        
        // Revoke wholesale access: reset to regular customer status
        const updateData = {
          wholesale_status: 'revoked',
          wholesale_credit_rate: 0.05, // Reset to regular 5% credit rate
          is_wholesale_customer: false, // Remove wholesale customer flag
          wholesale_approved_at: new Date().toISOString(), // Track revocation time
          wholesale_approved_by: revokedBy, // Track who revoked it
          updated_at: new Date().toISOString()
        };
        
        const { data: profile, error } = await client
          .from('user_profiles')
          .update(updateData)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error revoking wholesale access:', error);
          throw new Error(`Failed to revoke wholesale access: ${error.message}`);
        }

        console.log('✅ Successfully revoked wholesale access');

        // Send revocation email notification
        try {
          const emailNotifications = require('./email-notifications');
          await emailNotifications.sendWholesaleRevocationEmail({
            userId: userId,
            email: profile.email || '',
            firstName: profile.first_name || 'Customer',
            companyName: profile.company_name || ''
          });
          console.log('✅ Wholesale revocation email sent');
        } catch (emailError) {
          console.error('⚠️ Failed to send revocation email (non-critical):', emailError);
          // Don't fail the whole operation if email fails
        }
        
        return {
          success: true,
          message: 'Wholesale access revoked successfully. Customer returns to regular pricing and 5% store credit.',
          userProfile: {
            id: profile.id,
            userId: profile.user_id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            displayName: profile.display_name,
            bio: profile.bio,
            profilePhotoUrl: profile.profile_photo_url,
            bannerImageUrl: profile.banner_image_url,
            profilePhotoPublicId: profile.profile_photo_public_id,
            bannerImagePublicId: profile.banner_image_public_id,
            companyName: profile.company_name,
            isWholesaleCustomer: profile.is_wholesale_customer,
            wholesaleCreditRate: profile.wholesale_credit_rate,
            wholesaleMonthlyCustomers: profile.wholesale_monthly_customers,
            wholesaleOrderingFor: profile.wholesale_ordering_for,
            wholesaleFitExplanation: profile.wholesale_fit_explanation,
            wholesaleStatus: profile.wholesale_status,
            wholesaleApprovedAt: profile.wholesale_approved_at,
            wholesaleApprovedBy: profile.wholesale_approved_by,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at
          }
        };
      } catch (error) {
        console.error('❌ Error in revokeWholesaleAccess:', error);
        return {
          success: false,
          message: error.message,
          userProfile: null
        };
      }
    },

    updateWholesaleCustomer: async (_, { userId, input }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        console.log('🔄 Updating wholesale customer:', { userId, input });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Profile service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Verify the customer exists and is a wholesale customer
        const { data: existingProfile, error: profileError } = await client
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .eq('is_wholesale_customer', true)
          .single();

        if (profileError || !existingProfile) {
          throw new Error('Wholesale customer not found');
        }

        // Build update data
        const updateData = {
          updated_at: new Date().toISOString()
        };

        if (input.firstName !== undefined) updateData.first_name = input.firstName;
        if (input.lastName !== undefined) updateData.last_name = input.lastName;
        if (input.companyName !== undefined) updateData.company_name = input.companyName;
        if (input.wholesaleCreditRate !== undefined) updateData.wholesale_credit_rate = input.wholesaleCreditRate;
        if (input.wholesaleMonthlyCustomers !== undefined) updateData.wholesale_monthly_customers = input.wholesaleMonthlyCustomers;
        if (input.wholesaleOrderingFor !== undefined) updateData.wholesale_ordering_for = input.wholesaleOrderingFor;
        if (input.wholesaleFitExplanation !== undefined) updateData.wholesale_fit_explanation = input.wholesaleFitExplanation;

        const { data: updatedProfile, error } = await client
          .from('user_profiles')
          .update(updateData)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error updating wholesale customer:', error);
          throw new Error(`Failed to update customer: ${error.message}`);
        }

        console.log('✅ Successfully updated wholesale customer');
        
        return {
          success: true,
          message: 'Wholesale customer updated successfully',
          userProfile: {
            id: updatedProfile.id,
            userId: updatedProfile.user_id,
            firstName: updatedProfile.first_name,
            lastName: updatedProfile.last_name,
            displayName: updatedProfile.display_name,
            bio: updatedProfile.bio,
            profilePhotoUrl: updatedProfile.profile_photo_url,
            bannerImageUrl: updatedProfile.banner_image_url,
            profilePhotoPublicId: updatedProfile.profile_photo_public_id,
            bannerImagePublicId: updatedProfile.banner_image_public_id,
            companyName: updatedProfile.company_name,
            isWholesaleCustomer: updatedProfile.is_wholesale_customer,
            wholesaleCreditRate: updatedProfile.wholesale_credit_rate,
            wholesaleMonthlyCustomers: updatedProfile.wholesale_monthly_customers,
            wholesaleOrderingFor: updatedProfile.wholesale_ordering_for,
            wholesaleFitExplanation: updatedProfile.wholesale_fit_explanation,
            wholesaleStatus: updatedProfile.wholesale_status,
            wholesaleApprovedAt: updatedProfile.wholesale_approved_at,
            wholesaleApprovedBy: updatedProfile.wholesale_approved_by,
            createdAt: updatedProfile.created_at,
            updatedAt: updatedProfile.updated_at
          }
        };
      } catch (error) {
        console.error('❌ Error in updateWholesaleCustomer:', error);
        return {
          success: false,
          message: error.message,
          userProfile: null
        };
      }
    },

    // Tax exemption mutations
    updateTaxExemption: async (_, { userId, input }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        console.log('🏛️ Updating tax exemption for user:', { userId, input });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Profile service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Verify the customer exists
        const { data: existingProfile, error: profileError } = await client
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (profileError || !existingProfile) {
          throw new Error('User profile not found');
        }

        // Build update data
        const updateData = {
          is_tax_exempt: input.isTaxExempt,
          tax_exempt_updated_at: new Date().toISOString(),
          tax_exempt_updated_by: user.id,
          updated_at: new Date().toISOString()
        };

        // Only update these fields if provided
        if (input.taxExemptId !== undefined) updateData.tax_exempt_id = input.taxExemptId;
        if (input.taxExemptReason !== undefined) updateData.tax_exempt_reason = input.taxExemptReason;
        if (input.taxExemptExpiresAt !== undefined) updateData.tax_exempt_expires_at = input.taxExemptExpiresAt;

        // If setting to non-exempt, clear exemption fields
        if (!input.isTaxExempt) {
          updateData.tax_exempt_id = null;
          updateData.tax_exempt_reason = null;
          updateData.tax_exempt_expires_at = null;
        }

        const { data: updatedProfile, error } = await client
          .from('user_profiles')
          .update(updateData)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error updating tax exemption:', error);
          throw new Error(`Failed to update tax exemption: ${error.message}`);
        }

        console.log('✅ Successfully updated tax exemption');
        
        return {
          success: true,
          message: 'Tax exemption updated successfully',
          userProfile: {
            id: updatedProfile.id,
            userId: updatedProfile.user_id,
            firstName: updatedProfile.first_name,
            lastName: updatedProfile.last_name,
            displayName: updatedProfile.display_name,
            bio: updatedProfile.bio,
            profilePhotoUrl: updatedProfile.profile_photo_url,
            bannerImageUrl: updatedProfile.banner_image_url,
            profilePhotoPublicId: updatedProfile.profile_photo_public_id,
            bannerImagePublicId: updatedProfile.banner_image_public_id,
            companyName: updatedProfile.company_name,
            isWholesaleCustomer: updatedProfile.is_wholesale_customer,
            wholesaleCreditRate: updatedProfile.wholesale_credit_rate,
            createdAt: updatedProfile.created_at,
            updatedAt: updatedProfile.updated_at
          }
        };
      } catch (error) {
        console.error('❌ Error in updateTaxExemption:', error);
        return {
          success: false,
          message: error.message,
          userProfile: null
        };
      }
    },

    // Wholesale client management mutations
    createWholesaleClient: async (_, { input }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        console.log('🏪 Creating wholesale client:', input);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Client service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Verify the user is an approved wholesale customer
        const { data: userProfile, error: profileError } = await client
          .from('user_profiles')
          .select('wholesale_status')
          .eq('user_id', user.id)
          .single();

        if (profileError || userProfile?.wholesale_status !== 'approved') {
          throw new Error('Only approved wholesale customers can create clients');
        }

        // Create the client
        const { data: newClient, error } = await client
          .from('wholesale_clients')
          .insert({
            wholesale_user_id: user.id,
            client_name: input.clientName,
            client_email: input.clientEmail,
            client_phone: input.clientPhone,
            client_company: input.clientCompany,
            client_address: input.clientAddress,
            notes: input.notes,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error creating wholesale client:', error);
          throw new Error(`Failed to create client: ${error.message}`);
        }

        console.log('✅ Successfully created wholesale client');
        
        return {
          success: true,
          message: 'Client created successfully',
          client: {
            id: newClient.id,
            wholesaleUserId: newClient.wholesale_user_id,
            clientName: newClient.client_name,
            clientEmail: newClient.client_email,
            clientPhone: newClient.client_phone,
            clientCompany: newClient.client_company,
            clientAddress: newClient.client_address,
            notes: newClient.notes,
            isActive: newClient.is_active,
            createdAt: newClient.created_at,
            updatedAt: newClient.updated_at,
            orderCount: 0,
            totalSpent: 0
          }
        };
      } catch (error) {
        console.error('❌ Error in createWholesaleClient:', error);
        return {
          success: false,
          message: error.message,
          client: null
        };
      }
    },

    updateWholesaleClient: async (_, { clientId, input }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        console.log('🔄 Updating wholesale client:', clientId);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Client service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Verify the client belongs to this user
        const { data: existingClient, error: clientError } = await client
          .from('wholesale_clients')
          .select('*')
          .eq('id', clientId)
          .eq('wholesale_user_id', user.id)
          .single();

        if (clientError || !existingClient) {
          throw new Error('Client not found or access denied');
        }

        // Update the client
        const updateData = {
          updated_at: new Date().toISOString()
        };

        if (input.clientName !== undefined) updateData.client_name = input.clientName;
        if (input.clientEmail !== undefined) updateData.client_email = input.clientEmail;
        if (input.clientPhone !== undefined) updateData.client_phone = input.clientPhone;
        if (input.clientCompany !== undefined) updateData.client_company = input.clientCompany;
        if (input.clientAddress !== undefined) updateData.client_address = input.clientAddress;
        if (input.notes !== undefined) updateData.notes = input.notes;
        if (input.isActive !== undefined) updateData.is_active = input.isActive;

        const { data: updatedClient, error } = await client
          .from('wholesale_clients')
          .update(updateData)
          .eq('id', clientId)
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error updating wholesale client:', error);
          throw new Error(`Failed to update client: ${error.message}`);
        }

        console.log('✅ Successfully updated wholesale client');

                 // Get order stats for the updated client
         const { data: orders, error: ordersError } = await client
           .from('orders_main')
           .select('total_price')
           .eq('wholesale_client_id', clientId);

        const orderCount = orders?.length || 0;
        const totalSpent = orders?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;
        
        return {
          success: true,
          message: 'Client updated successfully',
          client: {
            id: updatedClient.id,
            wholesaleUserId: updatedClient.wholesale_user_id,
            clientName: updatedClient.client_name,
            clientEmail: updatedClient.client_email,
            clientPhone: updatedClient.client_phone,
            clientCompany: updatedClient.client_company,
            clientAddress: updatedClient.client_address,
            notes: updatedClient.notes,
            isActive: updatedClient.is_active,
            createdAt: updatedClient.created_at,
            updatedAt: updatedClient.updated_at,
            orderCount,
            totalSpent
          }
        };
      } catch (error) {
        console.error('❌ Error in updateWholesaleClient:', error);
        return {
          success: false,
          message: error.message,
          client: null
        };
      }
    },

    deleteWholesaleClient: async (_, { clientId }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        console.log('🗑️ Deleting wholesale client:', clientId);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Client service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Verify the client belongs to this user
        const { data: existingClient, error: clientError } = await client
          .from('wholesale_clients')
          .select('*')
          .eq('id', clientId)
          .eq('wholesale_user_id', user.id)
          .single();

        if (clientError || !existingClient) {
          throw new Error('Client not found or access denied');
        }

                 // Check if client has any orders
         const { data: orders, error: ordersError } = await client
           .from('orders_main')
           .select('id')
           .eq('wholesale_client_id', clientId)
           .limit(1);

        if (ordersError) {
          console.warn('⚠️ Error checking client orders:', ordersError);
        }

        if (orders && orders.length > 0) {
          // Soft delete by setting is_active to false
          const { data: deletedClient, error } = await client
            .from('wholesale_clients')
            .update({
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', clientId)
            .select('*')
            .single();

          if (error) {
            console.error('❌ Error soft deleting wholesale client:', error);
            throw new Error(`Failed to delete client: ${error.message}`);
          }

          console.log('✅ Successfully soft deleted wholesale client (has orders)');
          
          return {
            success: true,
            message: 'Client archived successfully (has existing orders)',
            client: null
          };
        } else {
          // Hard delete if no orders
          const { error } = await client
            .from('wholesale_clients')
            .delete()
            .eq('id', clientId);

          if (error) {
            console.error('❌ Error deleting wholesale client:', error);
            throw new Error(`Failed to delete client: ${error.message}`);
          }

          console.log('✅ Successfully deleted wholesale client');
          
          return {
            success: true,
            message: 'Client deleted successfully',
            client: null
          };
        }
      } catch (error) {
        console.error('❌ Error in deleteWholesaleClient:', error);
        return {
          success: false,
          message: error.message,
          client: null
        };
      }
    },

    assignOrderToClient: async (_, { orderId, clientId }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        console.log('🔗 Assigning order to client:', { orderId, clientId });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Verify the client belongs to this user
        const { data: existingClient, error: clientError } = await client
          .from('wholesale_clients')
          .select('*')
          .eq('id', clientId)
          .eq('wholesale_user_id', user.id)
          .single();

        if (clientError || !existingClient) {
          throw new Error('Client not found or access denied');
        }

        // Verify the order belongs to this user
        const { data: existingOrder, error: orderError } = await client
          .from('orders_main')
          .select('*')
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single();

        if (orderError || !existingOrder) {
          throw new Error('Order not found or access denied');
        }

        // Update the order to assign it to the client
        const { data: updatedOrder, error: updateError } = await client
          .from('orders_main')
          .update({
            wholesale_client_id: clientId,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .select('*')
          .single();

        if (updateError) {
          console.error('❌ Error assigning order to client:', updateError);
          throw new Error(`Failed to assign order: ${updateError.message}`);
        }

        console.log('✅ Successfully assigned order to client');
        
        return {
          success: true,
          message: 'Order assigned to client successfully',
          order: {
            id: updatedOrder.id,
            orderNumber: updatedOrder.order_number,
            wholesaleClientId: updatedOrder.wholesale_client_id
          }
        };
      } catch (error) {
        console.error('❌ Error in assignOrderToClient:', error);
        return {
          success: false,
          message: error.message,
          order: null
        };
      }
    },

    unassignOrderFromClient: async (_, { orderId }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        console.log('🔗 Unassigning order from client:', orderId);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Verify the order belongs to this user
        const { data: existingOrder, error: orderError } = await client
          .from('orders_main')
          .select('*')
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single();

        if (orderError || !existingOrder) {
          throw new Error('Order not found or access denied');
        }

        // Update the order to remove client assignment
        const { data: updatedOrder, error: updateError } = await client
          .from('orders_main')
          .update({
            wholesale_client_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .select('*')
          .single();

        if (updateError) {
          console.error('❌ Error unassigning order from client:', updateError);
          throw new Error(`Failed to unassign order: ${updateError.message}`);
        }

        console.log('✅ Successfully unassigned order from client');
        
        return {
          success: true,
          message: 'Order unassigned from client successfully',
          order: {
            id: updatedOrder.id,
            orderNumber: updatedOrder.order_number,
            wholesaleClientId: updatedOrder.wholesale_client_id
          }
        };
      } catch (error) {
        console.error('❌ Error in unassignOrderFromClient:', error);
        return {
          success: false,
          message: error.message,
          order: null
        };
      }
    },
    
    // Blog mutation resolvers
    insert_blog_posts_one: async (_, { object }) => {
      try {
        console.log('📝 Creating new blog post:', { title: object.title });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Blog service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        const { data, error } = await client
          .from('blog_posts')
          .insert(object)
          .select('*')
          .single();
        
        if (error) {
          console.error('❌ Error creating blog post:', error);
          throw new Error(error.message);
        }
        
        console.log('✅ Blog post created:', data.id);
        return data;
      } catch (error) {
        console.error('❌ Error in insert_blog_posts_one:', error);
        throw error;
      }
    },
    
    update_blog_posts_by_pk: async (_, { pk_columns, _set }) => {
      try {
        console.log('📝 Updating blog post:', pk_columns.id);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Blog service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        
        // If published is being set to true, update published_at
        if (_set.published === true) {
          _set.published_at = new Date().toISOString();
        }
        
        const { data, error } = await client
          .from('blog_posts')
          .update(_set)
          .eq('id', pk_columns.id)
          .select('*')
          .single();
        
        if (error) {
          console.error('❌ Error updating blog post:', error);
          throw new Error(error.message);
        }
        
        console.log('✅ Blog post updated:', data.id);
        return data;
      } catch (error) {
        console.error('❌ Error in update_blog_posts_by_pk:', error);
        throw error;
      }
    },
    
    delete_blog_posts_by_pk: async (_, { id }) => {
      try {
        console.log('🗑️ Deleting blog post:', id);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Blog service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        
        // Get the post before deleting
        const { data: postToDelete, error: fetchError } = await client
          .from('blog_posts')
          .select('*')
          .eq('id', id)
          .single();
        
        if (fetchError) {
          console.error('❌ Error fetching blog post to delete:', fetchError);
          return null;
        }
        
        // Delete the post
        const { error } = await client
          .from('blog_posts')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error('❌ Error deleting blog post:', error);
          throw new Error(error.message);
        }
        
        console.log('✅ Blog post deleted:', id);
        return postToDelete;
      } catch (error) {
        console.error('❌ Error in delete_blog_posts_by_pk:', error);
        throw error;
      }
    },
    
    increment_blog_views: async (_, { args }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Blog service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        
        // Get current views
        const { data: post, error: fetchError } = await client
          .from('blog_posts')
          .select('views')
          .eq('slug', args.post_slug)
          .single();
        
        if (fetchError) {
          console.error('❌ Error fetching blog post for view increment:', fetchError);
          return { success: false };
        }
        
        // Increment views
        const { error: updateError } = await client
          .from('blog_posts')
          .update({ views: (post.views || 0) + 1 })
          .eq('slug', args.post_slug);
        
        if (updateError) {
          console.error('❌ Error incrementing blog views:', updateError);
          return { success: false };
        }
        
        return { success: true };
      } catch (error) {
        console.error('❌ Error in increment_blog_views:', error);
        return { success: false };
      }
    },
    
    insert_blog_categories_one: async (_, { object }) => {
      try {
        console.log('📝 Creating new blog category:', { name: object.name });
        
        if (!supabaseClient.isReady()) {
          throw new Error('Blog service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        const { data, error } = await client
          .from('blog_categories')
          .insert(object)
          .select('*')
          .single();
        
        if (error) {
          console.error('❌ Error creating blog category:', error);
          throw new Error(error.message);
        }
        
        console.log('✅ Blog category created:', data.id);
        return data;
      } catch (error) {
        console.error('❌ Error in insert_blog_categories_one:', error);
        throw error;
      }
    },
    
    update_blog_categories_by_pk: async (_, { pk_columns, _set }) => {
      try {
        console.log('📝 Updating blog category:', pk_columns.id);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Blog service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        const { data, error } = await client
          .from('blog_categories')
          .update(_set)
          .eq('id', pk_columns.id)
          .select('*')
          .single();
        
        if (error) {
          console.error('❌ Error updating blog category:', error);
          throw new Error(error.message);
        }
        
        console.log('✅ Blog category updated:', data.id);
        return data;
      } catch (error) {
        console.error('❌ Error in update_blog_categories_by_pk:', error);
        throw error;
      }
    },

    // Mutation to update order item files
    updateOrderItemFiles: async (_, { orderId, itemId, customFiles }, context) => {
      try {
        console.log('📤 Updating order item files:', { orderId, itemId, customFiles });
        
        // Get the order first to verify it exists
        const { data: order, error: orderError } = await supabase
          .from('customer_orders')
          .select('*, items:customer_order_items(*)')
          .eq('id', orderId)
          .single();
          
        if (orderError || !order) {
          throw new Error('Order not found');
        }
        
        // Find the specific item
        const item = order.items.find(item => item.id === itemId);
        if (!item) {
          throw new Error('Order item not found');
        }
        
        // Update the item with new custom files
        const { error: updateError } = await supabase
          .from('customer_order_items')
          .update({ 
            custom_files: customFiles,
            updated_at: new Date().toISOString()
          })
          .eq('id', itemId);
          
        if (updateError) {
          console.error('Error updating order item:', updateError);
          throw new Error('Failed to update order item files');
        }
        
        // Send email notification to admin
        try {
          const emailNotifications = require('./email-notifications');
          await emailNotifications.sendCustomerArtworkUploadNotification(order, {
            productName: item.product_name || item.name || 'Custom Sticker',
            itemId: itemId
          });
        } catch (emailError) {
          console.error('❌ Failed to send artwork upload notification:', emailError);
          // Don't throw - we still want to return success even if email fails
        }
        
        // Return the updated order with items
        const { data: updatedOrder, error: fetchError } = await supabase
          .from('customer_orders')
          .select('*, items:customer_order_items(*)')
          .eq('id', orderId)
          .single();
          
        if (fetchError) {
          throw new Error('Failed to fetch updated order');
        }
        
        console.log('✅ Order item files updated successfully');
        return updatedOrder;
        
      } catch (error) {
        console.error('Error in updateOrderItemFiles:', error);
        throw error;
      }
    },

    // Delete users mutation (admin only)
    deleteUsers: async (_, { userIds }, context) => {
      try {
        console.log('🗑️ Deleting users:', userIds);
        
        const { user } = context;
        if (!user) {
          throw new AuthenticationError('Authentication required');
        }

        // Admin authentication required
        requireAdminAuth(user);

        if (!supabaseClient.isReady()) {
          throw new Error('User service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        const errors = [];
        let deletedCount = 0;

        // Process each user deletion
        for (const userId of userIds) {
          try {
            // Get user info first for logging
            const { data: authUser, error: getUserError } = await client.auth.admin.getUserById(userId);
            
            if (getUserError) {
              console.error(`❌ Error getting user ${userId}:`, getUserError);
              errors.push({ userId, error: getUserError.message });
              continue;
            }

            console.log(`🗑️ Deleting user: ${authUser.user.email} (${userId})`);

            // Delete user profile first (if exists)
            const { error: profileError } = await client
              .from('user_profiles')
              .delete()
              .eq('user_id', userId);

            if (profileError) {
              console.warn(`⚠️ Warning: Could not delete profile for user ${userId}:`, profileError);
            }

            // Delete user credit records
            const { error: creditError } = await client
              .from('user_credits')
              .delete()
              .eq('user_id', userId);

            if (creditError) {
              console.warn(`⚠️ Warning: Could not delete credits for user ${userId}:`, creditError);
            }

            // Delete user from auth (this will cascade to other related data)
            const { error: deleteError } = await client.auth.admin.deleteUser(userId);

            if (deleteError) {
              console.error(`❌ Error deleting user ${userId}:`, deleteError);
              errors.push({ userId, error: deleteError.message });
            } else {
              console.log(`✅ Successfully deleted user: ${authUser.user.email} (${userId})`);
              deletedCount++;
            }
          } catch (error) {
            console.error(`❌ Unexpected error deleting user ${userId}:`, error);
            errors.push({ userId, error: error.message });
          }
        }

        const success = deletedCount > 0;
        console.log(`🗑️ Deletion complete: ${deletedCount} users deleted, ${errors.length} errors`);

        return {
          success,
          deletedCount,
          errors
        };
      } catch (error) {
        console.error('❌ Error in deleteUsers:', error);
        throw new Error(error.message);
      }
    },

    // Credit mutations
    addCredits: async (_, { userId, amount, reason, expiresAt }, context) => {
      try {
        // Admin authentication required
        const { user } = context;
        if (!user) {
          throw new AuthenticationError('Authentication required');
        }
        requireAdminAuth(user);

        const input = {
          userId,
          amount,
          reason,
          expiresAt
        };

        const result = await creditHandlers.addUserCredits(input, user.id);

        if (result.success) {
          // Get the user's new balance
          const balanceInfo = await creditHandlers.getUserCreditBalance(userId);

        return {
          success: true,
          message: `Successfully added ${amount} credits`,
            credit: result.credit,
            newBalance: balanceInfo.balance
        };
        } else {
          return {
            success: false,
            message: result.error || 'Failed to add credits',
            credit: null,
            newBalance: 0
          };
        }
      } catch (error) {
        console.error('❌ Error adding credits:', error);
        return {
          success: false,
          message: error.message,
          credit: null,
          newBalance: 0
        };
      }
    },

    addCreditsToAllUsers: async (_, { amount, reason }, context) => {
      try {
        // Admin authentication required
        const { user } = context;
        if (!user) {
          throw new AuthenticationError('Authentication required');
        }
        requireAdminAuth(user);

        const result = await creditHandlers.addCreditsToAllUsers(
          amount,
          reason,
          user.id
        );

        return {
          success: result.success,
          usersUpdated: result.usersUpdated || 0,
          message: result.success ? `Successfully added ${amount} credits to ${result.usersUpdated} users` : result.error,
          error: result.success ? null : result.error
        };
      } catch (error) {
        console.error('❌ Error adding credits to all users:', error);
        return {
          success: false,
          usersUpdated: 0,
          message: error.message,
          error: error.message
        };
      }
    },

    applyCreditsToOrder: async (_, { userId, orderId, amount }) => {
      try {
        const creditTransaction = await creditHandlers.deductCredits(
          userId,
          amount,
          `Credits applied to order ${orderId}`,
          'used',
          orderId
        );

        return {
          success: true,
          message: `Successfully applied ${amount} credits to order`,
          credit: creditTransaction,
          newBalance: creditTransaction.balance
        };
      } catch (error) {
        console.error('❌ Error applying credits:', error);
        return {
          success: false,
          message: error.message,
          credit: null,
          newBalance: 0
        };
      }
    },

    reverseCredits: async (_, { transactionId, reason }, context) => {
      try {
        // Admin authentication required
        const { user } = context;
        if (!user) {
          throw new AuthenticationError('Authentication required');
        }
        requireAdminAuth(user);

        const reversalTransaction = await creditHandlers.reverseCredits(
          transactionId,
          reason
        );

        return {
          success: true,
          message: 'Credits reversed successfully',
          credit: reversalTransaction,
          newBalance: reversalTransaction.balance
        };
      } catch (error) {
        console.error('❌ Error reversing credits:', error);
        return {
          success: false,
          message: error.message,
          credit: null,
          newBalance: 0
        };
      }
    },

    markCreditNotificationAsRead: async (_, { notificationId }) => {
      try {
        await creditHandlers.markNotificationAsRead(notificationId);
        return true;
      } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        return false;
      }
    },

    // Fix existing earned credit transactions that have wrong transaction_type
    fixExistingEarnedCredits: async (_, {}, context) => {
      try {
        // Admin authentication required
        const { user } = context;
        if (!user) {
          throw new AuthenticationError('Authentication required');
        }
        requireAdminAuth(user);

        console.log('🔧 Admin user triggering fix for existing earned credits:', user.email);
        const result = await creditHandlers.fixExistingEarnedCredits();
        
        return {
          success: result.success,
          fixed: result.fixed || 0,
          message: result.message || 'Fix completed',
          error: result.error || null
        };
      } catch (error) {
        console.error('❌ Error fixing existing earned credits:', error);
        return {
          success: false,
          fixed: 0,
          message: 'Failed to fix existing earned credits',
          error: error.message
        };
      }
    },

    // Sitewide Alert mutations
    createSitewideAlert: async (_, { input }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        // Admin authentication required
        requireAdminAuth(user);

        if (!supabaseClient.isReady()) {
          throw new Error('Alert service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Create the alert
        const { data: newAlert, error } = await client
          .from('sitewide_alerts')
          .insert({
            title: input.title,
            message: input.message,
            background_color: input.backgroundColor || '#FFD700',
            text_color: input.textColor || '#030140',
            link_url: input.linkUrl || null,
            link_text: input.linkText || null,
            is_active: Boolean(input.isActive),
            start_date: input.startDate || null,
            end_date: input.endDate || null,
            created_by: user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error creating sitewide alert:', error);
          throw new Error(`Failed to create alert: ${error.message}`);
        }

        console.log('✅ Successfully created sitewide alert');
        
        return {
          id: String(newAlert.id),
          title: newAlert.title,
          message: newAlert.message,
          backgroundColor: newAlert.background_color,
          textColor: newAlert.text_color,
          linkUrl: newAlert.link_url,
          linkText: newAlert.link_text,
          isActive: newAlert.is_active,
          startDate: newAlert.start_date,
          endDate: newAlert.end_date,
          createdAt: newAlert.created_at,
          updatedAt: newAlert.updated_at,
          createdBy: newAlert.created_by
        };
      } catch (error) {
        console.error('❌ Error in createSitewideAlert:', error);
        throw new Error(error.message);
      }
    },

    updateSitewideAlert: async (_, { id, input }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        // Admin authentication required
        requireAdminAuth(user);

        if (!supabaseClient.isReady()) {
          throw new Error('Alert service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Update the alert
        const updateData = {
          updated_at: new Date().toISOString()
        };

        if (input.title !== undefined) updateData.title = input.title;
        if (input.message !== undefined) updateData.message = input.message;
        if (input.backgroundColor !== undefined) updateData.background_color = input.backgroundColor;
        if (input.textColor !== undefined) updateData.text_color = input.textColor;
        if (input.linkUrl !== undefined) updateData.link_url = input.linkUrl;
        if (input.linkText !== undefined) updateData.link_text = input.linkText;
        if (input.isActive !== undefined) updateData.is_active = Boolean(input.isActive);
        if (input.startDate !== undefined) updateData.start_date = input.startDate;
        if (input.endDate !== undefined) updateData.end_date = input.endDate;

        const { data: updatedAlert, error } = await client
          .from('sitewide_alerts')
          .update(updateData)
          .eq('id', id)
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error updating sitewide alert:', error);
          throw new Error(`Failed to update alert: ${error.message}`);
        }

        console.log('✅ Successfully updated sitewide alert');
        
        return {
          id: String(updatedAlert.id),
          title: updatedAlert.title,
          message: updatedAlert.message,
          backgroundColor: updatedAlert.background_color,
          textColor: updatedAlert.text_color,
          linkUrl: updatedAlert.link_url,
          linkText: updatedAlert.link_text,
          isActive: updatedAlert.is_active,
          startDate: updatedAlert.start_date,
          endDate: updatedAlert.end_date,
          createdAt: updatedAlert.created_at,
          updatedAt: updatedAlert.updated_at,
          createdBy: updatedAlert.created_by
        };
      } catch (error) {
        console.error('❌ Error in updateSitewideAlert:', error);
        throw new Error(error.message);
      }
    },

    deleteSitewideAlert: async (_, { id }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        // Admin authentication required
        requireAdminAuth(user);

        if (!supabaseClient.isReady()) {
          throw new Error('Alert service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        const { error } = await client
          .from('sitewide_alerts')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('❌ Error deleting sitewide alert:', error);
          throw new Error(`Failed to delete alert: ${error.message}`);
        }

        console.log('✅ Successfully deleted sitewide alert');
        return true;
      } catch (error) {
        console.error('❌ Error in deleteSitewideAlert:', error);
        throw new Error(error.message);
      }
    },

    toggleSitewideAlert: async (_, { id, isActive }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        // Admin authentication required
        requireAdminAuth(user);

        if (!supabaseClient.isReady()) {
          throw new Error('Alert service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        const { data: updatedAlert, error } = await client
          .from('sitewide_alerts')
          .update({ 
            is_active: Boolean(isActive),
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error toggling sitewide alert:', error);
          throw new Error(`Failed to toggle alert: ${error.message}`);
        }

        console.log('✅ Successfully toggled sitewide alert');
        
        return {
          id: String(updatedAlert.id),
          title: updatedAlert.title,
          message: updatedAlert.message,
          backgroundColor: updatedAlert.background_color,
          textColor: updatedAlert.text_color,
          linkUrl: updatedAlert.link_url,
          linkText: updatedAlert.link_text,
          isActive: updatedAlert.is_active,
          startDate: updatedAlert.start_date,
          endDate: updatedAlert.end_date,
          createdAt: updatedAlert.created_at,
          updatedAt: updatedAlert.updated_at,
          createdBy: updatedAlert.created_by
        };
      } catch (error) {
        console.error('❌ Error in toggleSitewideAlert:', error);
        throw new Error(error.message);
      }
    }
  }
};

// Helper functions for order processing
function generateOrderNote(cartItems, additionalNote = '') {
  const itemCount = cartItems.length;
  const cartTotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  
  const itemDetails = cartItems.map((item, index) => {
    const configDetails = [];
    
    // Add item header
    configDetails.push(`--- ITEM ${index + 1}: ${item.productName} ---`);
    
    // Add calculator selections
    if (item.calculatorSelections) {
      Object.entries(item.calculatorSelections).forEach(([key, value]) => {
        if (value && typeof value === 'object' && value.displayValue) {
          // Skip rush order when it's set to "Standard" (not a rush order)
          if (key === 'rush' && value.displayValue === 'Standard') {
            return;
          }
          // Skip proof option when it's set to "Send Proof" (default behavior)
          if (key === 'proof' && value.displayValue === 'Send Proof') {
            return;
          }
          configDetails.push(`${getOptionEmoji(value.type)} ${formatOptionName(key)}: ${value.displayValue}`);
        }
      });
    }
    
    // Add quantity and pricing
    configDetails.push(`#️⃣ Quantity: ${item.quantity}`);
    configDetails.push(`💰 Unit Price: $${item.unitPrice.toFixed(2)}`);
    configDetails.push(`💎 Total: $${item.totalPrice.toFixed(2)}`);
    
    // Add custom files if present
    if (item.customFiles && item.customFiles.length > 0) {
      configDetails.push('', '🔗 Cloudinary URL:', '', item.customFiles[0]);
    }
    
    // Add custom notes if present
    if (item.customerNotes && item.customerNotes.trim()) {
      configDetails.push('', '📝 Additional Instructions:', item.customerNotes.trim());
    }
    
    configDetails.push(''); // Empty line between items
    return configDetails.join('\n');
  });

  const orderNote = [
    `🛒 CART ORDER - ${itemCount} item${itemCount > 1 ? 's' : ''}`,
    `💎 Cart Total: $${cartTotal.toFixed(2)}`,
    '',
    ...itemDetails
  ];

  if (additionalNote && additionalNote.trim()) {
    orderNote.push('📝 Additional Order Notes:', additionalNote.trim());
  }

  return orderNote.join('\n');
}

function generateOrderTags(cartItems) {
  const tags = ['cart-order', `items-${cartItems.length}`];
  
  cartItems.forEach(item => {
    if (item.productCategory) {
      tags.push(item.productCategory);
    }
    
    // Add calculator selection tags
    if (item.calculatorSelections) {
      Object.values(item.calculatorSelections).forEach(selection => {
        if (selection && typeof selection === 'object' && selection.value) {
          if (typeof selection.value === 'string') {
            tags.push(selection.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
          }
        }
      });
    }
  });
  
  // Return as comma-separated string (Shopify expects string, not array)
  return [...new Set(tags)].join(',');
}

function getOptionEmoji(type) {
  const emojiMap = {
    'shape': '✂️',
    'finish': '✨',
    'size-preset': '📏',
    'white-base': '⚪',
    'quantity': '#️⃣'
  };
  return emojiMap[type] || '🔸';
}

function formatOptionName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// 3. Server setup
const server = new ApolloServer({ 
  typeDefs, 
  resolvers
});

// 4. Setup Apollo middleware (no longer starts the server)
async function startServer() {
  try {
    await server.start();

    // Apply Apollo middleware with context function
    app.use(
      '/graphql',
      json({ limit: '50mb' }),
      expressMiddleware(server, {
        context: async ({ req }) => {
          // Helper: tiny retry for transient DNS failures from Supabase auth (EAI_AGAIN)
          const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const getUserWithRetry = async (client, token, retries = 2) => {
            for (let attempt = 0; attempt <= retries; attempt++) {
              try {
                const result = await client.auth.getUser(token);
                return result;
              } catch (err) {
                const cause = err?.cause || err;
                const isTransient =
                  (cause && (cause.code === 'EAI_AGAIN' || cause.errno === -3001)) ||
                  /fetch failed/i.test(err?.message || '') ||
                  /getaddrinfo EAI_AGAIN/i.test(String(err));
                if (attempt < retries && isTransient) {
                  const delay = 200 * (attempt + 1);
                  console.warn(`Auth verification transient error (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms`);
                  await sleep(delay);
                  continue;
                }
                throw err;
              }
            }
          };

          // Extract auth token from header
          const token = req.headers.authorization?.replace('Bearer ', '');
          
          let user = null;
          if (token && supabaseClient.isReady()) {
            try {
              const client = supabaseClient.getServiceClient();
              // Verify the JWT token with Supabase
              const { data: { user: authUser }, error } = await getUserWithRetry(client, token, 2);
              
              if (!error && authUser) {
                user = authUser;
              }
            } catch (error) {
              console.error('Auth verification error:', error);
            }
          }
          
          return {
            supabase: supabaseClient,
            stripe: stripeClient,
            user
          };
        },
      })
    );

    // Initialize discount manager
    discountManager.init();
    
    // Validate critical services
    const criticalServices = [];
    if (!stripeClient.isReady()) criticalServices.push('Stripe');
    if (!supabaseClient.isReady()) criticalServices.push('Supabase');
    
    if (criticalServices.length > 0) {
      console.warn('⚠️ Missing critical services:', criticalServices.join(', '));
    }
  } catch (error) {
    console.error('❌ Failed to configure Apollo Server:', error);
    throw error; // Re-throw to be caught by the caller
  }
}

// Start the server immediately with basic endpoints, then add Apollo
const PORT = process.env.PORT || 4000;
const HOST = '0.0.0.0';

// Add a test endpoint that bypasses all middleware
app.get('/ping', (req, res) => {
  res.end('pong');
});

const httpServer = app.listen(PORT, HOST, () => {
  console.log(`✅ API server running on port ${PORT}`);
  
  // Now try to start Apollo after the server is already listening
  startServer().then(() => {
    console.log('✅ GraphQL ready at /graphql');
    
    // Add catch-all route AFTER all other routes are defined
    app.use('*', (req, res) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`⚠️ Unhandled route: ${req.method} ${req.originalUrl}`);
      }
      res.status(404).json({
        error: 'Not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });
  }).catch(error => {
    console.error('❌ Apollo startup failed:', error.message);
    console.log('⚠️ Server running with basic endpoints only');
    
    app.get('/emergency-status', (req, res) => {
      res.json({
        status: 'emergency-mode',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });
  });
});

// Handle graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Graceful shutdown function
async function gracefulShutdown() {
  try {
    console.log('🛑 Shutting down...');
    
    // Stop accepting new connections
    if (httpServer) {
      httpServer.close();
    }
    
    // Stop Apollo if it's running
    if (server) {
      await server.stop();
    }

    // Cleanup discount manager
    if (typeof discountManager !== 'undefined' && discountManager.destroy) {
      discountManager.destroy();
    }

    // Cleanup analytics
    try {
      const serverAnalytics = require('./business-analytics');
      if (serverAnalytics && serverAnalytics.shutdown) {
        await serverAnalytics.shutdown();
      }
    } catch (e) {
      // Silent cleanup
    }

    // Cleanup database connections
    if (supabaseClient && supabaseClient.cleanup) {
      await supabaseClient.cleanup();
    }

    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Shutdown error:', error.message);
    process.exit(1);
  }
}
