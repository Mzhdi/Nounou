const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Configuration
const config = require('./config/env');
const database = require('./config/database');

// Middleware
const ErrorHandler = require('./middleware/errorHandler');

// Routes
const userRoutes = require('./routes/userRoutes');

class App {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false // Désactivé pour API
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.NODE_ENV === 'production' 
        ? ['https://your-mobile-app.com'] // 👈 CHANGEZ ÇA en production
        : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Logging
    if (config.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Trust proxy (important pour rate limiting et IP)
    this.app.set('trust proxy', 1);
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: config.NODE_ENV,
        version: config.API_VERSION
      });
    });

    // API routes
    this.app.use(`/api/${config.API_VERSION}/users`, userRoutes);

    // 404 handler
    this.app.use('*', ErrorHandler.notFound);
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use(ErrorHandler.handle);
  }

  async start() {
    try {
      // Test database connection
      const dbConnected = await database.testConnection();
      if (!dbConnected) {
        throw new Error('Database connection failed');
      }

      // Start server
      this.server = this.app.listen(config.PORT, () => {
        console.log('🚀 Server started successfully!');
        console.log(`📍 Environment: ${config.NODE_ENV}`);
        console.log(`🌐 Server running on: http://localhost:${config.PORT}`);
        console.log(`📋 API Version: ${config.API_VERSION}`);
        console.log(`🗄️  Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
        console.log(`⚡ Ready to receive requests!`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    }
  }

  async shutdown() {
    console.log('\n🔄 Shutting down gracefully...');
    
    if (this.server) {
      this.server.close(() => {
        console.log('🔒 HTTP server closed');
      });
    }

    await database.close();
    console.log('👋 Server shutdown complete');
    process.exit(0);
  }
}

module.exports = App;