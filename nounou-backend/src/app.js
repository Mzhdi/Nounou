const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const fs = require('fs');
const path = require('path');

// ✨ AUTOMATED: Import Swagger UI only (no manual setup needed)
const swaggerUi = require('swagger-ui-express');

// Import configurations and utilities
const config = require('./config/env');
const database = require('./config/database');
const ErrorHandler = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');

// Import routes
const userRoutes = require('./routes/userRoutes');
const consumptionRoutes = require('./routes/consumptionRoutes');
const foodRoutes = require('./routes/foodRoutes');
const recipeRoutes = require('./routes/recipeRoutes');

// 🤖 NEW: Import AI Image Analysis routes
const aiConsumptionRoutes = require('./routes/aiConsumptionRoutes');

// Create Express application
const app = express();

// 🤖 NEW: Create uploads directory for AI image analysis
const createUploadsDirectory = () => {
  const uploadsDir = path.join(__dirname, '../uploads');
  const tempDir = path.join(uploadsDir, 'temp');
  
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Created uploads directory');
    }
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('✅ Created uploads/temp directory');
    }
  } catch (error) {
    console.warn('⚠️ Could not create uploads directory:', error.message);
  }
};

// Create uploads directory on startup
createUploadsDirectory();

// ✨ AUTOMATED: Load auto-generated swagger documentation
let swaggerDocument;
try {
  swaggerDocument = require('./swagger-output.json');
  console.log('✅ Swagger documentation loaded automatically');
} catch (error) {
  console.warn('⚠️ Swagger documentation not found. Run "npm run swagger-gen" to generate it.');
  swaggerDocument = {
    openapi: '3.0.0',
    info: {
      title: 'Nounou Nutrition API',
      version: '2.0.0',
      description: 'API documentation not generated yet. Run npm run swagger-gen'
    },
    paths: {}
  };
}

// ========== SECURITY MIDDLEWARE ==========

// Set security headers - Updated for Swagger UI and AI image uploads
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for Swagger UI
      imgSrc: ["'self'", "data:", "https:", "https://validator.swagger.io"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
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

// Global rate limiting with higher limits for AI endpoints
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req) => {
    // Higher limits for AI endpoints due to processing time
    if (req.path.includes('/ai/')) {
      return req.user ? 50 : 20; // AI endpoints: 50 for auth users, 20 for anonymous
    }
    
    // Regular limits for other endpoints
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

// 🤖 NEW: Serve uploads directory for AI processed images (optional)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1d', // Cache for 1 day
  etag: false // Disable etag for temporary files
}));

// ========== LOGGING MIDDLEWARE ==========

// Request logging with AI endpoint tracking
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    const isAIEndpoint = req.path.includes('/ai/');
    
    const logMessage = `[${logLevel.toUpperCase()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip}`;
    
    // Add AI analysis indicator
    if (isAIEndpoint) {
      console.log(`🤖 ${logMessage}`);
    } else {
      console.log(logMessage);
    }
    
    // Log errors with more detail
    if (res.statusCode >= 400) {
      console.error(`Error details: User-Agent: ${req.get('User-Agent')}, Body: ${JSON.stringify(req.body)}`);
    }
    
    // Log slow AI requests (>30 seconds)
    if (isAIEndpoint && duration > 30000) {
      console.warn(`⚠️ Slow AI request detected: ${duration}ms for ${req.originalUrl}`);
    }
  });
  
  next();
});

// ✨ AUTOMATED: Swagger UI with auto-generated docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 50px 0 }
    .swagger-ui .scheme-container { background: #fafafa; padding: 30px 0 }
    .swagger-ui .info .title { color: #4CAF50; }
  `,
  customSiteTitle: 'Nounou Nutrition API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    requestInterceptor: (req) => {
      // Add custom headers if needed
      if (req.url.includes('/api/v1/')) {
        req.headers['X-App-Version'] = '2.0.0';
      }
      return req;
    }
  }
}));

// ✨ AUTOMATED: Raw swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});

// ========== HEALTH CHECK ==========

app.get('/health', async (req, res) => {
  /* 
    #swagger.tags = ['Health']
    #swagger.summary = 'Health check endpoint'
    #swagger.description = 'Returns the current health status of the API server with database and service information'
    #swagger.responses[200] = {
      description: 'Server is healthy',
      schema: { $ref: '#/definitions/HealthCheck' }
    }
    #swagger.responses[503] = {
      description: 'Server is unhealthy',
      schema: { 
        allOf: [
          { $ref: '#/definitions/HealthCheck' },
          { 
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        ]
      }
    }
  */
  try {
    const dbStatus = await database.healthCheck();
    
    // 🤖 NEW: Check AI service health
    const aiServiceHealth = {
      geminiConfigured: !!process.env.GOOGLE_API_KEY,
      uploadsDirectory: fs.existsSync(path.join(__dirname, '../uploads')),
      tempDirectory: fs.existsSync(path.join(__dirname, '../uploads/temp'))
    };
    
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      version: process.env.npm_package_version || '2.0.0',
      node: process.version,
      memory: process.memoryUsage(),
      database: dbStatus,
      
      // 🤖 NEW: AI service status
      aiService: aiServiceHealth,
      
      features: {
        unifiedItemSupport: true,
        foodIntegration: true,
        recipeIntegration: true,
        advancedAnalytics: true,
        crossModuleSync: true,
        migrationTools: true,
        // 🤖 NEW: AI features
        aiImageAnalysis: aiServiceHealth.geminiConfigured,
        aiNutritionExtraction: aiServiceHealth.geminiConfigured,
        aiMultiFoodDetection: aiServiceHealth.geminiConfigured
      },
      integrations: {
        foodService: true,
        recipeService: true,
        userService: true,
        consumptionService: true,
        // 🤖 NEW: AI integration
        geminiAI: aiServiceHealth.geminiConfigured
      }
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
  /* 
    #swagger.tags = ['Health']
    #swagger.summary = 'API root endpoint'
    #swagger.description = 'Returns basic API information and available endpoints'
    #swagger.responses[200] = {
      description: 'API information',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Nounou Nutrition API - MongoDB Version' },
          version: { type: 'string', example: '2.0.0' },
          environment: { type: 'string', example: 'development' },
          timestamp: { type: 'string', format: 'date-time' },
          endpoints: {
            type: 'object',
            properties: {
              health: { type: 'string', example: '/health' },
              docs: { type: 'string', example: '/api-docs' },
              users: { type: 'string', example: '/api/v1/users' },
              foods: { type: 'string', example: '/api/v1/foods' },
              recipes: { type: 'string', example: '/api/v1/recipes' },
              consumption: { type: 'string', example: '/api/v1/consumption' }
            }
          }
        }
      }
    }
  */
  res.json({
    message: 'Nounou Nutrition API - MongoDB Version with AI',
    version: process.env.npm_package_version || '2.0.0',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      users: '/api/v1/users',
      consumption: '/api/v1/consumption',
      foods: '/api/v1/foods',
      recipes: '/api/v1/recipes',
      // 🤖 NEW: AI endpoints
      aiConsumption: '/api/v1/consumption/ai',
      docs: '/api-docs',
      'docs-json': '/api-docs.json'
    },
    features: {
      unifiedConsumption: true,
      foodDatabase: true,
      recipeManagement: true,
      advancedAnalytics: true,
      userAuthentication: true,
      // 🤖 NEW: AI features
      aiImageAnalysis: !!process.env.GOOGLE_API_KEY,
      aiNutritionExtraction: !!process.env.GOOGLE_API_KEY,
      aiMultiFoodDetection: !!process.env.GOOGLE_API_KEY
    }
  });
});

// ========== API ROUTES ==========

// API versioning
const API_VERSION = config.API_VERSION || 'v1';

app.use(`/api/${API_VERSION}/users`, userRoutes);
// 🤖 NEW: AI Image Analysis routes
app.use(`/api/${API_VERSION}/consumption/ai`, aiConsumptionRoutes);
app.use(`/api/${API_VERSION}/consumption`, consumptionRoutes);
app.use(`/api/${API_VERSION}/foods`, foodRoutes);
app.use(`/api/${API_VERSION}/recipes`, recipeRoutes);



// Legacy API docs redirect
app.get('/api/docs', (req, res) => {
  res.redirect('/api-docs');
});

// ========== ERROR HANDLING MIDDLEWARE ==========

// 404 handler for undefined routes
app.use('*', ErrorHandler.notFound);

// Global error handler with AI-specific error handling
const originalErrorHandler = ErrorHandler.handle;
app.use((error, req, res, next) => {
  // 🤖 NEW: Handle AI-specific errors
  if (req.path.includes('/ai/')) {
    // Handle Gemini API errors
    if (error.message.includes('API key')) {
      return res.status(503).json({
        success: false,
        error: 'AI service configuration error',
        message: 'Image analysis service is not properly configured',
        code: 'AI_CONFIG_ERROR'
      });
    }
    
    // Handle image processing errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'Image file must be smaller than 10MB',
        code: 'FILE_SIZE_ERROR'
      });
    }
    
    // Handle invalid file type errors
    if (error.message.includes('Only image files')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        message: 'Please upload a valid image file (JPEG, PNG, WebP)',
        code: 'INVALID_FILE_TYPE'
      });
    }
    
    // Log AI errors for monitoring
    console.error('🤖 AI Service Error:', {
      path: req.path,
      method: req.method,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
  
  // Use original error handler for other errors
  originalErrorHandler(error, req, res, next);
});

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

// Graceful shutdown with cleanup
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // 🤖 NEW: Cleanup AI temporary files
    const tempDir = path.join(__dirname, '../uploads/temp');
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(tempDir, file));
        } catch (cleanupError) {
          console.warn(`⚠️ Could not cleanup temp file ${file}:`, cleanupError.message);
        }
      }
      console.log('✅ AI temporary files cleaned up');
    }
    
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