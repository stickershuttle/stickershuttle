const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

/**
 * Enhanced Rate Limiting & Performance Optimizations
 * 
 * This module provides:
 * 1. Per-user rate limiting (not just per-IP)
 * 2. Intelligent caching layer
 * 3. Request debouncing and batching
 * 4. Performance monitoring
 */

// ==========================================
// 1. ENHANCED RATE LIMITING
// ==========================================

// Cache for user-based rate limiting
const userRateLimitCache = new Map();

// Helper to get user identifier from request
function getUserIdentifier(req) {
  // Try to get user ID from auth, fall back to IP
  const userId = req.user?.id || req.user?.sub;
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fall back to IP address
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  return `ip:${ip}`;
}

// Per-user rate limiting store
const userRateLimitStore = {
  incr: (key) => {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const entry = userRateLimitCache.get(key) || { count: 0, resetTime: now + windowMs };
    
    if (now > entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + windowMs;
    }
    
    entry.count++;
    userRateLimitCache.set(key, entry);
    
    return entry.count;
  },
  
  decrement: (key) => {
    const entry = userRateLimitCache.get(key);
    if (entry && entry.count > 0) {
      entry.count--;
      userRateLimitCache.set(key, entry);
    }
  },
  
  resetKey: (key) => {
    userRateLimitCache.delete(key);
  }
};

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of userRateLimitCache.entries()) {
    if (now > entry.resetTime) {
      userRateLimitCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

// Enhanced rate limiter with per-user tracking
const createSmartRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxPerIP = 100,
    maxPerUser = 200, // Users get higher limits
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = null
  } = options;

  return rateLimit({
    windowMs,
    max: maxPerIP,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => getUserIdentifier(req)),
    skipSuccessfulRequests,
    skipFailedRequests,
    store: userRateLimitStore,
    // Skip rate limiting in development mode completely
    skip: (req) => {
      // Skip rate limiting completely in development
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      return false;
    },
    // Use handler instead of deprecated onLimitReached
    handler: (req, res) => {
      const userKey = getUserIdentifier(req);
      console.warn(`⚠️ Rate limit exceeded for ${userKey}`);
      
      // Log pattern for potential abuse
      if (userKey.startsWith('ip:')) {
        console.warn(`🚨 Potential abuse from IP: ${userKey}`);
      }
      
      // Send the rate limit response
      res.status(429).json({ error: message });
    }
  });
};

// ==========================================
// 2. INTELLIGENT CACHING LAYER
// ==========================================

class InMemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 300000; // 5 minutes default
    this.maxSize = options.maxSize || 1000;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  set(key, value, customTtl = null) {
    const ttl = customTtl || this.ttl;
    const expiresAt = Date.now() + ttl;
    
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, { value, expiresAt });
    this.stats.sets++;
  }

  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: `${hitRate}%`,
      maxSize: this.maxSize
    };
  }
}

// Create cache instances for different data types
const caches = {
  products: new InMemoryCache({ ttl: 60000 * 10, maxSize: 200 }), // 10 minutes
  pricing: new InMemoryCache({ ttl: 60000 * 5, maxSize: 500 }), // 5 minutes
  users: new InMemoryCache({ ttl: 60000 * 2, maxSize: 1000 }), // 2 minutes
  orders: new InMemoryCache({ ttl: 60000 * 1, maxSize: 1000 }), // 1 minute
  general: new InMemoryCache({ ttl: 60000 * 5, maxSize: 1000 }) // 5 minutes
};

// Cache middleware factory
const createCacheMiddleware = (cacheType, keyGenerator, ttl = null) => {
  return (req, res, next) => {
    const cache = caches[cacheType];
    if (!cache) {
      return next();
    }

    const key = typeof keyGenerator === 'function' ? keyGenerator(req) : keyGenerator;
    const cached = cache.get(key);
    
    if (cached) {
      console.log(`📦 Cache hit: ${cacheType}:${key}`);
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json;
    
    // Override json method to cache response
    res.json = function(data) {
      if (res.statusCode === 200 && data) {
        console.log(`💾 Caching: ${cacheType}:${key}`);
        cache.set(key, data, ttl);
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// ==========================================
// 3. REQUEST DEBOUNCING & BATCHING
// ==========================================

class RequestDebouncer {
  constructor(delay = 300) {
    this.delay = delay;
    this.timers = new Map();
    this.batches = new Map();
  }

  // Debounce a function call
  debounce(key, fn, context = null) {
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set new timer
    const timer = setTimeout(() => {
      fn.call(context);
      this.timers.delete(key);
    }, this.delay);

    this.timers.set(key, timer);
  }

  // Batch multiple requests with the same key
  batch(key, request, resolver) {
    if (!this.batches.has(key)) {
      this.batches.set(key, {
        requests: [],
        resolvers: [],
        timer: null
      });
    }

    const batch = this.batches.get(key);
    batch.requests.push(request);
    batch.resolvers.push(resolver);

    // Clear existing timer
    if (batch.timer) {
      clearTimeout(batch.timer);
    }

    // Set new timer to process batch
    batch.timer = setTimeout(() => {
      this.processBatch(key);
    }, this.delay);
  }

  async processBatch(key) {
    const batch = this.batches.get(key);
    if (!batch) return;

    this.batches.delete(key);

    try {
      // Process all requests in the batch
      const results = await Promise.all(
        batch.requests.map(async (request) => {
          // Your batch processing logic here
          return await request();
        })
      );

      // Resolve all promises
      batch.resolvers.forEach((resolver, index) => {
        resolver(results[index]);
      });
    } catch (error) {
      // Reject all promises
      batch.resolvers.forEach(resolver => {
        resolver(Promise.reject(error));
      });
    }
  }

  clear() {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    
    this.batches.forEach(batch => {
      if (batch.timer) clearTimeout(batch.timer);
    });
    this.batches.clear();
  }
}

// Global debouncer instance
const debouncer = new RequestDebouncer(300);

// ==========================================
// 4. PERFORMANCE MONITORING
// ==========================================

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorCount: 0,
      peakMemoryUsage: 0,
      cacheStats: {}
    };
    
    this.requestTimes = [];
    this.maxRequestTimes = 1000; // Keep last 1000 requests
    
    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  recordRequest(responseTime, isError = false) {
    this.metrics.requestCount++;
    
    if (isError) {
      this.metrics.errorCount++;
    }
    
    // Record response time
    this.requestTimes.push(responseTime);
    if (this.requestTimes.length > this.maxRequestTimes) {
      this.requestTimes.shift();
    }
    
    // Update average
    const sum = this.requestTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = Math.round(sum / this.requestTimes.length);
    
    // Count slow requests (>2 seconds)
    if (responseTime > 2000) {
      this.metrics.slowRequests++;
    }
  }

  startMemoryMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
      
      if (heapUsed > this.metrics.peakMemoryUsage) {
        this.metrics.peakMemoryUsage = heapUsed;
      }
      
      // Update cache stats
      this.metrics.cacheStats = Object.fromEntries(
        Object.entries(caches).map(([key, cache]) => [key, cache.getStats()])
      );
      
      // Log warning if memory is high
      if (heapUsed > 500) { // 500MB threshold
        console.warn(`⚠️ High memory usage: ${heapUsed}MB`);
      }
    }, 30000); // Check every 30 seconds
  }

  getStats() {
    return {
      ...this.metrics,
      currentMemoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      uptime: Math.round(process.uptime()),
      errorRate: this.metrics.requestCount > 0 ? 
        (this.metrics.errorCount / this.metrics.requestCount * 100).toFixed(2) + '%' : '0%'
    };
  }

  reset() {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorCount: 0,
      peakMemoryUsage: 0,
      cacheStats: {}
    };
    this.requestTimes = [];
  }
}

// Global performance monitor
const performanceMonitor = new PerformanceMonitor();

// Performance monitoring middleware
const performanceMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Hook into response finish to record metrics
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    performanceMonitor.recordRequest(responseTime, isError);
  });
  
  next();
};

// ==========================================
// 5. SPECIFIC RATE LIMITERS
// ==========================================

const rateLimiters = {
  // General API rate limiting
  general: createSmartRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxPerIP: 100,
    maxPerUser: 200,
    message: 'Too many requests, please try again later.'
  }),

  // Stricter for uploads
  upload: createSmartRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxPerIP: 15,
    maxPerUser: 25,
    message: 'Too many upload attempts, please try again later.'
  }),

  // Very strict for auth operations
  auth: createSmartRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxPerIP: 5,
    maxPerUser: 10,
    message: 'Too many authentication attempts, please try again later.'
  }),

  // Lenient for read operations
  read: createSmartRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxPerIP: 200,
    maxPerUser: 500,
    message: 'Too many read requests, please try again later.'
  }),

  // Moderate for mutations
  mutation: createSmartRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxPerIP: 50,
    maxPerUser: 100,
    message: 'Too many update requests, please try again later.'
  })
};

// Slow down middleware for suspicious activity
const slowDownMiddleware = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs at full speed
  delayMs: () => 500, // Add 500ms delay after delayAfter requests (new format)
  maxDelayMs: 5000, // Maximum delay of 5 seconds
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  validate: { delayMs: false }, // Disable validation warnings
  // Skip in development mode
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  }
});

// ==========================================
// 6. EXPORTS
// ==========================================

module.exports = {
  // Rate limiting
  rateLimiters,
  slowDownMiddleware,
  createSmartRateLimit,
  
  // Caching
  caches,
  createCacheMiddleware,
  
  // Debouncing
  debouncer,
  RequestDebouncer,
  
  // Performance monitoring
  performanceMonitor,
  performanceMiddleware,
  
  // Utilities
  getUserIdentifier,
  
  // Cache helper for GraphQL resolvers
  cacheResolver: (cacheType, key, resolver, ttl = null) => {
    const cache = caches[cacheType];
    if (!cache) {
      return resolver();
    }
    
    const cached = cache.get(key);
    if (cached) {
      return Promise.resolve(cached);
    }
    
    return Promise.resolve(resolver()).then(result => {
      if (result) {
        cache.set(key, result, ttl);
      }
      return result;
    });
  }
}; 