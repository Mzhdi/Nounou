#!/usr/bin/env node

/**
 * Nounou Nutrition API Server - MongoDB Version
 * 
 * Main server entry point that:
 * - Connects to MongoDB
 * - Starts the Express server
 * - Handles graceful shutdown
 * - Sets up error monitoring
 */

const app = require('./src/app');
const config = require('./src/config/env');
const database = require('./src/config/database');

// ========== SERVER CONFIGURATION ==========

const PORT = config.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// ========== DATABASE CONNECTION ==========

async function connectDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await database.connect();
    
    // Test the connection
    const isHealthy = await database.testConnection();
    if (!isHealthy) {
      throw new Error('Database health check failed');
    }
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${database.getConnectionStatus().database}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    
    if (config.NODE_ENV === 'production') {
      console.error('💀 Exiting due to database connection failure in production');
      process.exit(1);
    } else {
      console.warn('⚠️  Continuing without database in development mode');
      return false;
    }
  }
}

// ========== SERVER STARTUP ==========

async function startServer() {
  try {
    // Connect to database first
    const dbConnected = await connectDatabase();
    
    if (!dbConnected && config.NODE_ENV === 'production') {
      throw new Error('Database connection required in production');
    }
    
    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      console.log('\n🚀 ========================================');
      console.log('🥗 Nounou Nutrition API Server Started');
      console.log('========================================');
      console.log(`📍 Environment: ${config.NODE_ENV}`);
      console.log(`🌐 Server: http://${HOST}:${PORT}`);
      console.log(`🏥 Health: http://${HOST}:${PORT}/health`);
      console.log(`📚 API Docs: http://${HOST}:${PORT}/api/docs`);
      console.log(`📊 Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
      console.log('========================================\n');
      
      // Display available endpoints
      console.log('📋 Available Endpoints:');
      
      // GENERAL
      console.log(`   GET  /health`);
      console.log(`   GET  /api/docs`);
      console.log('');
      
      // ENDPOINTS USERS
      console.log('👤 Users Module:');
      console.log(`   GET  /api/v1/users/health`);
      console.log(`   POST /api/v1/users/register`);
      console.log(`   POST /api/v1/users/login`);
      console.log(`   GET  /api/v1/users/profile`);
      console.log(`   PUT  /api/v1/users/profile`);
      console.log(`   POST /api/v1/users/logout`);
      console.log(`   GET  /api/v1/users/sessions`);
      console.log(`   GET  /api/v1/users/goals`);
      console.log(`   POST /api/v1/users/goals`);
      console.log('');
      
      // ENDPOINTS CONSUMPTION
      console.log('📊 Consumption Module:');
      console.log(`   GET  /api/v1/consumption/health`);
      console.log(`   POST /api/v1/consumption/entries`);
      console.log(`   GET  /api/v1/consumption/entries`);
      console.log(`   GET  /api/v1/consumption/dashboard`);
      console.log(`   GET  /api/v1/consumption/stats/today`);
      console.log(`   POST /api/v1/consumption/meals/quick`);
      console.log(`   GET  /api/v1/consumption/export`);
      console.log('');
      
      // ENDPOINTS FOODS
      console.log('🍎 Foods Module:');
      console.log(`   POST /api/v1/foods`);
      console.log(`   GET  /api/v1/foods`);
      console.log(`   GET  /api/v1/foods/search`);
      console.log(`   GET  /api/v1/foods/barcode/:barcode`);
      console.log(`   GET  /api/v1/foods/:foodId`);
      console.log(`   PUT  /api/v1/foods/:foodId`);
      console.log(`   DELETE /api/v1/foods/:foodId`);
      console.log(`   POST /api/v1/foods/categories`);
      console.log(`   GET  /api/v1/foods/categories`);
      console.log(`   GET  /api/v1/foods/categories/tree`);
      console.log('');
      
      // ✨ NOUVEAU - ENDPOINTS RECIPES
      console.log('🍳 Recipes Module:');
      console.log(`   GET  /api/v1/recipes`);
      console.log(`   POST /api/v1/recipes`);
      console.log(`   GET  /api/v1/recipes/search`);
      console.log(`   GET  /api/v1/recipes/my-recipes`);
      console.log(`   GET  /api/v1/recipes/public`);
      console.log(`   POST /api/v1/recipes/complete`);
      console.log(`   GET  /api/v1/recipes/:recipeId`);
      console.log(`   PUT  /api/v1/recipes/:recipeId`);
      console.log(`   DELETE /api/v1/recipes/:recipeId`);
      console.log(`   GET  /api/v1/recipes/:recipeId/nutrition`);
      console.log('');
      
      console.log('🥕 Recipe Ingredients:');
      console.log(`   GET  /api/v1/recipes/:recipeId/ingredients`);
      console.log(`   POST /api/v1/recipes/:recipeId/ingredients`);
      console.log(`   PUT  /api/v1/recipes/ingredients/:ingredientId`);
      console.log(`   DELETE /api/v1/recipes/ingredients/:ingredientId`);
      console.log('');
      
      console.log('📋 Recipe Instructions:');
      console.log(`   POST /api/v1/recipes/:recipeId/instructions`);
      console.log(`   PUT  /api/v1/recipes/instructions/:instructionId`);
      console.log(`   DELETE /api/v1/recipes/instructions/:instructionId`);
      console.log('');
      
      console.log('📂 Recipe Categories:');
      console.log(`   GET  /api/v1/recipes/categories`);
      console.log(`   POST /api/v1/recipes/categories`);
      console.log(`   GET  /api/v1/recipes/categories/search`);
      console.log(`   GET  /api/v1/recipes/categories/roots`);
      console.log(`   GET  /api/v1/recipes/categories/stats`);
      console.log(`   GET  /api/v1/recipes/categories/:categoryId`);
      console.log(`   PUT  /api/v1/recipes/categories/:categoryId`);
      console.log(`   DELETE /api/v1/recipes/categories/:categoryId`);
      console.log(`   GET  /api/v1/recipes/categories/:categoryId/breadcrumb`);
      console.log(`   GET  /api/v1/recipes/categories/:categoryId/stats`);
      console.log('');
      
      console.log('🎉 All modules loaded successfully!');
      console.log('========================================\n');
    });
    
    // Store server reference for graceful shutdown
    app.server = server;
    
    // Set server timeout
    server.timeout = 30000; // 30 seconds
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }
      
      const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;
      
      switch (error.code) {
        case 'EACCES':
          console.error(`❌ ${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(`❌ ${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
    
    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// ========== DEVELOPMENT HELPERS ==========

if (config.NODE_ENV === 'development') {
  // Enable detailed error logging in development
  process.on('warning', (warning) => {
    console.warn('⚠️ Warning:', warning.name);
    console.warn('📝 Message:', warning.message);
    console.warn('📍 Stack:', warning.stack);
  });
  
  // Log memory usage periodically in development
  setInterval(() => {
    const memUsage = process.memoryUsage();
    console.log('📊 Memory Usage:', {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    });
  }, 60000); // Every minute
}

// ========== PRODUCTION OPTIMIZATIONS ==========

if (config.NODE_ENV === 'production') {
  // Enable production-specific optimizations
  process.env.NODE_ENV = 'production';
  
  // Disable some development features
  console.log('🔧 Production mode optimizations enabled');
  
  // Set up process monitoring
  setInterval(() => {
    const usage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    
    // Log critical metrics
    if (memUsage.heapUsed > 500 * 1024 * 1024) { // > 500MB
      console.warn('⚠️ High memory usage detected:', Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB');
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}

// ========== CLUSTER MODE (Optional) ==========

if (process.env.CLUSTER_MODE === 'true') {
  const cluster = require('cluster');
  const numCPUs = require('os').cpus().length;
  
  if (cluster.isMaster) {
    console.log(`🔥 Master process ${process.pid} is running`);
    console.log(`🚀 Starting ${numCPUs} worker processes...`);
    
    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
    
    cluster.on('exit', (worker, code, signal) => {
      console.log(`💀 Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
      console.log('🔄 Starting a new worker...');
      cluster.fork();
    });
  } else {
    // Worker process
    startServer();
    console.log(`👷 Worker process ${process.pid} started`);
  }
} else {
  // Single process mode
  startServer();
}

// ========== ERROR MONITORING ==========

// Monitor uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION!');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  
  // In production, you might want to send this to error monitoring service
  if (config.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error);
  }
  
  // Graceful shutdown
  process.exit(1);
});

// Monitor unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED PROMISE REJECTION!');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  
  // In production, you might want to send this to error monitoring service
  if (config.NODE_ENV === 'production') {
    // Example: Sentry.captureException(reason);
  }
  
  // Graceful shutdown
  process.exit(1);
});

// ========== GRACEFUL SHUTDOWN HANDLERS ==========

const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
  
  try {
    // Stop accepting new requests
    if (app.server) {
      console.log('🔄 Closing HTTP server...');
      app.server.close(() => {
        console.log('✅ HTTP server closed');
      });
    }
    
    // Close database connections
    console.log('🔄 Closing database connections...');
    await database.disconnect();
    console.log('✅ Database connections closed');
    
    // Additional cleanup can be added here
    // - Clear intervals/timeouts
    // - Close file handles
    // - Flush logs
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Register signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle Docker stop signals
process.on('SIGUSR1', () => gracefulShutdown('SIGUSR1'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

// ========== EXPORT FOR TESTING ==========

module.exports = {
  app,
  startServer,
  connectDatabase
};