const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const UserService = require('../services/userService');

// Store for MongoDB-based rate limiting
const rateLimitStore = new Map();

// Custom MongoDB-aware rate limit store
class MongoRateLimitStore {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    this.prefix = options.prefix || 'rl:';
    this.cleanupInterval = options.cleanupInterval || 10 * 60 * 1000; // 10 minutes
    
    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  async get(key) {
    const data = rateLimitStore.get(this.prefix + key);
    if (!data) return { totalHits: 0, resetTime: null };
    
    // Check if window has expired
    if (Date.now() > data.resetTime) {
      rateLimitStore.delete(this.prefix + key);
      return { totalHits: 0, resetTime: null };
    }
    
    // Return Date object for resetTime (express-rate-limit expects this)
    return {
      totalHits: data.totalHits,
      resetTime: new Date(data.resetTime)
    };
  }

  async increment(key) {
    const prefixedKey = this.prefix + key;
    const now = Date.now();
    const resetTimeTimestamp = now + this.windowMs;
    
    const existing = rateLimitStore.get(prefixedKey);
    
    if (!existing || now > existing.resetTime) {
      const newData = { totalHits: 1, resetTime: resetTimeTimestamp };
      rateLimitStore.set(prefixedKey, newData);
      // Return Date object for resetTime
      return {
        totalHits: 1,
        resetTime: new Date(resetTimeTimestamp)
      };
    }
    
    existing.totalHits++;
    rateLimitStore.set(prefixedKey, existing);
    // Return Date object for resetTime
    return {
      totalHits: existing.totalHits,
      resetTime: new Date(existing.resetTime)
    };
  }

  async decrement(key) {
    const prefixedKey = this.prefix + key;
    const existing = rateLimitStore.get(prefixedKey);
    
    if (existing && existing.totalHits > 0) {
      existing.totalHits--;
      rateLimitStore.set(prefixedKey, existing);
    }
  }

  async resetKey(key) {
    rateLimitStore.delete(this.prefix + key);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
      if (now > data.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }
}

// Rate limiter pour la création d'entrées de consommation
const consumptionCreate = rateLimit({
  store: new MongoRateLimitStore({ 
    windowMs: 1 * 60 * 1000, // 1 minute
    prefix: 'consumption_create:'
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: async (req) => {
    // Dynamic limits based on subscription
    const subscriptionLimits = {
      free: 20,
      premium: 50,
      pro: 100
    };
    
    const userSubscription = req.user?.subscriptionType || 'free';
    return subscriptionLimits[userSubscription];
  },
  message: async (req) => {
    const userSubscription = req.user?.subscriptionType || 'free';
    const limits = { free: 20, premium: 50, pro: 100 };
    
    return {
      error: 'Too many consumption entries created',
      message: `You can only create ${limits[userSubscription]} consumption entries per minute with ${userSubscription} subscription. Please try again later.`,
      retryAfter: 60,
      subscription: userSubscription,
      upgradeAvailable: userSubscription === 'free'
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID for authenticated requests, IP for anonymous
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for admins
    return req.user?.role === 'admin' || req.user?.role === 'superadmin';
  },
  // FIXED: Use handler instead of onLimitReached
  handler: async (req, res, options) => {
    // Log rate limit breach for monitoring
    if (req.user?.id) {
      try {
        await UserService.logActivity(req.user.id, {
          action: 'rate_limit_exceeded',
          resource: 'consumption_create',
          timestamp: new Date(),
          metadata: {
            limit: options.max,
            windowMs: options.windowMs,
            subscription: req.user.subscriptionType
          }
        });
      } catch (error) {
        console.error('Error logging rate limit activity:', error);
      }
    }
    
    // Send rate limit response
    const userSubscription = req.user?.subscriptionType || 'free';
    const limits = { free: 20, premium: 50, pro: 100 };
    
    res.status(429).json({
      error: 'Too many consumption entries created',
      message: `You can only create ${limits[userSubscription]} consumption entries per minute with ${userSubscription} subscription. Please try again later.`,
      retryAfter: 60,
      subscription: userSubscription,
      upgradeAvailable: userSubscription === 'free'
    });
  }
});

// Rate limiter pour l'export de données
const exportData = rateLimit({
  store: new MongoRateLimitStore({ 
    windowMs: 15 * 60 * 1000, // 15 minutes
    prefix: 'export_data:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req) => {
    const subscriptionLimits = {
      free: 2,     // 2 exports per 15 minutes
      premium: 10, // 10 exports per 15 minutes
      pro: 25      // 25 exports per 15 minutes
    };
    
    const userSubscription = req.user?.subscriptionType || 'free';
    return subscriptionLimits[userSubscription];
  },
  message: async (req) => {
    const userSubscription = req.user?.subscriptionType || 'free';
    const limits = { free: 2, premium: 10, pro: 25 };
    
    return {
      error: 'Too many export requests',
      message: `You can only export data ${limits[userSubscription]} times per 15 minutes with ${userSubscription} subscription. Please try again later.`,
      retryAfter: 900,
      subscription: userSubscription,
      upgradeAvailable: userSubscription !== 'pro'
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    return req.user?.role === 'admin' || req.user?.role === 'superadmin';
  }
});

// Rate limiter pour les requêtes de dashboard/stats
const dashboardStats = rateLimit({
  store: new MongoRateLimitStore({ 
    windowMs: 1 * 60 * 1000, // 1 minute
    prefix: 'dashboard_stats:'
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: async (req) => {
    const subscriptionLimits = {
      free: 30,    // 30 requests per minute
      premium: 100, // 100 requests per minute
      pro: 200     // 200 requests per minute
    };
    
    const userSubscription = req.user?.subscriptionType || 'free';
    return subscriptionLimits[userSubscription];
  },
  message: async (req) => {
    const userSubscription = req.user?.subscriptionType || 'free';
    const limits = { free: 30, premium: 100, pro: 200 };
    
    return {
      error: 'Too many dashboard requests',
      message: `You can only make ${limits[userSubscription]} dashboard requests per minute with ${userSubscription} subscription. Please try again later.`,
      retryAfter: 60,
      subscription: userSubscription
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Rate limiter pour l'AI analysis
const aiAnalysis = rateLimit({
  store: new MongoRateLimitStore({ 
    windowMs: 1 * 60 * 1000, // 1 minute
    prefix: 'ai_analysis:'
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: async (req) => {
    const subscriptionLimits = {
      free: 5,     // 5 AI requests per minute
      premium: 25, // 25 AI requests per minute  
      pro: 100     // 100 AI requests per minute
    };
    
    const userSubscription = req.user?.subscriptionType || 'free';
    return subscriptionLimits[userSubscription];
  },
  message: async (req) => {
    const userSubscription = req.user?.subscriptionType || 'free';
    const limits = { free: 5, premium: 25, pro: 100 };
    
    return {
      error: 'Too many AI analysis requests',
      message: `You can only make ${limits[userSubscription]} AI analysis requests per minute with ${userSubscription} subscription. Please try again later.`,
      retryAfter: 60,
      subscription: userSubscription,
      upgradeAvailable: userSubscription !== 'pro'
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Only premium and pro users can use AI features
    return req.user?.role === 'admin' || req.user?.role === 'superadmin';
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: true // Don't count failed AI requests against the limit
});

// Rate limiter pour les requêtes d'authentification - SIMPLIFIED VERSION
const authRequests = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login attempts per 15 minutes per IP
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many login attempts from this IP. Please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP for auth requests since user might not be authenticated yet
    return req.ip;
  },
  skipSuccessfulRequests: true, // Don't count successful logins
  skipFailedRequests: false     // Count failed attempts
});

// Rate limiter pour les requêtes de mot de passe oublié
const passwordReset = rateLimit({
  store: new MongoRateLimitStore({ 
    windowMs: 60 * 60 * 1000, // 1 hour
    prefix: 'password_reset:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 password reset requests per hour per IP/email
  message: {
    error: 'Too many password reset requests',
    message: 'You can only request password reset 5 times per hour. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use email if provided, otherwise IP
    return req.body?.email || req.ip;
  }
});

// Rate limiter pour les opérations en batch
const batchOperations = rateLimit({
  store: new MongoRateLimitStore({ 
    windowMs: 5 * 60 * 1000, // 5 minutes
    prefix: 'batch_ops:'
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: async (req) => {
    const subscriptionLimits = {
      free: 2,     // 2 batch operations per 5 minutes
      premium: 10, // 10 batch operations per 5 minutes
      pro: 30      // 30 batch operations per 5 minutes
    };
    
    const userSubscription = req.user?.subscriptionType || 'free';
    return subscriptionLimits[userSubscription];
  },
  message: async (req) => {
    const userSubscription = req.user?.subscriptionType || 'free';
    const limits = { free: 2, premium: 10, pro: 30 };
    
    return {
      error: 'Too many batch operations',
      message: `You can only perform ${limits[userSubscription]} batch operations per 5 minutes with ${userSubscription} subscription.`,
      retryAfter: 300,
      subscription: userSubscription,
      upgradeAvailable: userSubscription !== 'pro'
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    return req.user?.role === 'admin' || req.user?.role === 'superadmin';
  }
});

// Global rate limiter (fallback)
const globalRateLimit = rateLimit({
  store: new MongoRateLimitStore({ 
    windowMs: 15 * 60 * 1000, // 15 minutes
    prefix: 'global:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req) => {
    // Higher limits for authenticated users
    if (req.user) {
      const subscriptionLimits = {
        free: 300,
        premium: 1000,
        pro: 2000
      };
      return subscriptionLimits[req.user.subscriptionType] || 300;
    }
    return 100; // Anonymous users
  },
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this source. Please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Helper function to create custom rate limiters
const createCustomRateLimit = (options) => {
  const {
    windowMs = 15 * 60 * 1000,
    maxRequests = 100,
    prefix = 'custom',
    subscriptionLimits = null,
    skipRoles = ['admin', 'superadmin'],
    keyBy = 'user' // 'user', 'ip', or 'custom'
  } = options;

  return rateLimit({
    store: new MongoRateLimitStore({ windowMs, prefix: `${prefix}:` }),
    windowMs,
    max: async (req) => {
      if (subscriptionLimits && req.user?.subscriptionType) {
        return subscriptionLimits[req.user.subscriptionType] || maxRequests;
      }
      return maxRequests;
    },
    keyGenerator: (req) => {
      switch (keyBy) {
        case 'user': return req.user?.id || req.ip;
        case 'ip': return req.ip;
        case 'custom': return options.keyGenerator?.(req) || req.ip;
        default: return req.user?.id || req.ip;
      }
    },
    skip: (req) => {
      return skipRoles.includes(req.user?.role);
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: options.message || {
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    }
  });
};

module.exports = {
  consumptionCreate,
  exportData,
  dashboardStats,
  aiAnalysis,
  authRequests,
  passwordReset,
  batchOperations,
  globalRateLimit,
  createCustomRateLimit,
  MongoRateLimitStore
};