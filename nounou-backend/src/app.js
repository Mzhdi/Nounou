const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Import configurations and utilities
const config = require('./config/env');
const database = require('./config/database');
const ErrorHandler = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');

// Import routes
const userRoutes = require('./routes/userRoutes');
const consumptionRoutes = require('./routes/consumptionRoutes');
const foodRoutes = require('./routes/foodRoutes');
const recipeRoutes = require('./routes/recipeRoutes'); // ✨ NOUVEAU

// Create Express application
const app = express();

// ========== SECURITY MIDDLEWARE ==========

// Set security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Enable CORS
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:8080',
      'https://nounou-app.vercel.app',
      'https://nounou-app.netlify.app',
      // Add your production domains here
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-Device-ID', 'X-App-Version']
}));

// Handle preflight requests
app.options('*', cors());

// Compress responses
app.use(compression());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized NoSQL injection attempt: ${key} from ${req.ip}`);
  }
}));

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Global rate limiting
const globalLimiter = rateLimit({
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
    message: 'Too many requests from this IP. Please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

app.use(globalLimiter);

// ========== BODY PARSING MIDDLEWARE ==========

// Parse JSON bodies (limit 10mb for file uploads)
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Parse URL-encoded bodies
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// ========== LOGGING MIDDLEWARE ==========

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    console.log(`[${logLevel.toUpperCase()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
    
    // Log errors with more detail
    if (res.statusCode >= 400) {
      console.error(`Error details: User-Agent: ${req.get('User-Agent')}, Body: ${JSON.stringify(req.body)}`);
    }
  });
  
  next();
});

// ========== HEALTH CHECK ==========

app.get('/health', async (req, res) => {
  try {
    const dbStatus = await database.healthCheck();
    
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      node: process.version,
      memory: process.memoryUsage(),
      database: dbStatus
    };

    res.status(200).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Nounou Nutrition API - MongoDB Version',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      users: '/api/v1/users',
      consumption: '/api/v1/consumption',
      foods: '/api/v1/foods',
      recipes: '/api/v1/recipes', // ✨ NOUVEAU
      docs: '/api/docs'
    }
  });
});

// ========== API ROUTES ==========

// API versioning
const API_VERSION = config.API_VERSION || 'v1';

app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/consumption`, consumptionRoutes);
app.use(`/api/${API_VERSION}/foods`, foodRoutes);
app.use(`/api/${API_VERSION}/recipes`, recipeRoutes); // ✨ NOUVEAU

// API documentation endpoint (placeholder)
app.get('/api/docs', (req, res) => {
  res.json({
    message: 'API Documentation',
    version: API_VERSION,
    baseUrl: `/api/${API_VERSION}`,
    endpoints: {
      users: {
        'POST /users/register': 'Register a new user',
        'POST /users/login': 'Login user',
        'GET /users/profile': 'Get user profile',
        'PUT /users/profile': 'Update user profile',
        'POST /users/logout': 'Logout user',
        'GET /users/sessions': 'Get active sessions',
        'GET /users/goals': 'Get user goals',
        'POST /users/goals': 'Create/update goal'
      },
      consumption: {
        'POST /consumption/entries': 'Create consumption entry',
        'GET /consumption/entries': 'Get user entries',
        'GET /consumption/dashboard': 'Get nutrition dashboard',
        'GET /consumption/stats/today': 'Get today\'s stats',
        'POST /consumption/meals/quick': 'Add quick meal',
        'GET /consumption/export': 'Export consumption data'
      },
      foods: {
        'POST /foods': 'Create new food item',
        'GET /foods': 'List foods with filters',
        'GET /foods/search': 'Search foods by text',
        'GET /foods/barcode/:barcode': 'Get food by barcode',
        'GET /foods/:foodId': 'Get food details',
        'PUT /foods/:foodId': 'Update food',
        'DELETE /foods/:foodId': 'Delete food (soft)',
        'GET /foods/categories': 'List food categories',
        'GET /foods/categories/tree': 'Category hierarchy'
      },
      // ✨ NOUVEAU - Documentation Recipes
      recipes: {
        'GET /recipes': 'List recipes with filters',
        'POST /recipes': 'Create new recipe',
        'GET /recipes/search': 'Search recipes by text',
        'GET /recipes/my-recipes': 'Get user\'s recipes',
        'GET /recipes/public': 'Get public recipes',
        'POST /recipes/complete': 'Create complete recipe',
        'GET /recipes/:recipeId': 'Get recipe details',
        'PUT /recipes/:recipeId': 'Update recipe',
        'DELETE /recipes/:recipeId': 'Delete recipe',
        'GET /recipes/:recipeId/nutrition': 'Get recipe nutrition',
        'GET /recipes/:recipeId/ingredients': 'Get recipe ingredients',
        'POST /recipes/:recipeId/ingredients': 'Add ingredient to recipe',
        'PUT /recipes/ingredients/:ingredientId': 'Update recipe ingredient',
        'DELETE /recipes/ingredients/:ingredientId': 'Remove recipe ingredient',
        'POST /recipes/:recipeId/instructions': 'Add instruction to recipe',
        'PUT /recipes/instructions/:instructionId': 'Update recipe instruction',
        'DELETE /recipes/instructions/:instructionId': 'Remove recipe instruction',
        'GET /recipes/categories': 'List recipe categories',
        'POST /recipes/categories': 'Create recipe category',
        'GET /recipes/categories/:categoryId': 'Get recipe category',
        'PUT /recipes/categories/:categoryId': 'Update recipe category',
        'DELETE /recipes/categories/:categoryId': 'Delete recipe category',
        'GET /recipes/categories/:categoryId/breadcrumb': 'Get category breadcrumb',
        'GET /recipes/categories/:categoryId/stats': 'Get category statistics'
      }
    }
  });
});

// ========== ERROR HANDLING MIDDLEWARE ==========

// 404 handler for undefined routes
app.use('*', ErrorHandler.notFound);

// Global error handler
app.use(ErrorHandler.handle);

// ========== GRACEFUL SHUTDOWN ==========

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error('Error:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED PROMISE REJECTION! Shutting down...');
  console.error('Error:', err);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close database connection
    await database.disconnect();
    console.log('✅ Database connection closed');
    
    // Close server
    if (app.server) {
      app.server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ========== EXPORT ==========

module.exports = app;