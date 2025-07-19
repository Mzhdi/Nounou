#!/usr/bin/env node

/**
 * Nounou Nutrition API Server - MongoDB Version with AI
 * 
 * Main server entry point that:
 * - Connects to MongoDB
 * - Starts the Express server
 * - Handles graceful shutdown
 * - Sets up error monitoring
 * - Initializes AI image analysis service
 */

const app = require('./src/app');
const config = require('./src/config/env');
const database = require('./src/config/database');

// ========== SERVER CONFIGURATION ==========

const PORT = config.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// ========== AI SERVICE HEALTH CHECK ==========

function checkAIServiceHealth() {
  const aiHealth = {
    geminiConfigured: !!process.env.GOOGLE_API_KEY,
    uploadsDirectoryExists: false,
    tempDirectoryExists: false
  };

  try {
    const fs = require('fs');
    const path = require('path');
    
    const uploadsDir = path.join(__dirname, 'uploads');
    const tempDir = path.join(uploadsDir, 'temp');
    
    aiHealth.uploadsDirectoryExists = fs.existsSync(uploadsDir);
    aiHealth.tempDirectoryExists = fs.existsSync(tempDir);
    
    return aiHealth;
  } catch (error) {
    console.warn('⚠️ Could not check AI service directories:', error.message);
    return aiHealth;
  }
}

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
    
    // 🤖 NEW: Check AI service health
    const aiHealth = checkAIServiceHealth();
    
    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      console.log('\n🚀 ========================================');
      console.log('🥗 Nounou Nutrition API Server Started');
      console.log('========================================');
      console.log(`📍 Environment: ${config.NODE_ENV}`);
      console.log(`🌐 Server: http://${HOST}:${PORT}`);
      console.log(`🏥 Health: http://${HOST}:${PORT}/health`);
      console.log(`📚 API Docs: http://${HOST}:${PORT}/api-docs`);
      console.log(`📊 Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
      
      // 🤖 NEW: Display AI service status
      console.log(`🤖 AI Service: ${aiHealth.geminiConfigured ? 'Configured' : 'Not Configured'}`);
      if (aiHealth.geminiConfigured) {
        console.log(`   📁 Uploads: ${aiHealth.uploadsDirectoryExists ? 'Ready' : 'Not Found'}`);
        console.log(`   🗂️  Temp Dir: ${aiHealth.tempDirectoryExists ? 'Ready' : 'Not Found'}`);
      }
      
      console.log('========================================\n');
      
      // Display available endpoints
      console.log('📋 Available Endpoints:');
      
      // GENERAL
      console.log(`   GET  /health`);
      console.log(`   GET  /api-docs`);
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
      
      // 🤖 NEW: AI CONSUMPTION ENDPOINTS
      if (aiHealth.geminiConfigured) {
        console.log('🤖 AI Image Analysis Module:');
        console.log(`   POST /api/v1/consumption/ai/analyze-image`);
        console.log(`   POST /api/v1/consumption/ai/create-from-image`);
        console.log(`   POST /api/v1/consumption/ai/analyze-multiple`);
        console.log(`   POST /api/v1/consumption/ai/create-meal-from-image`);
        console.log(`   POST /api/v1/consumption/ai/image-tips`);
        console.log(`   GET  /api/v1/consumption/ai/health`);
        console.log(`   GET  /api/v1/consumption/ai/stats`);
        console.log('');
      } else {
        console.log('🤖 AI Image Analysis Module:');
        console.log(`   ⚠️  AI endpoints disabled - GOOGLE_API_KEY not configured`);
        console.log(`   ℹ️  Set GOOGLE_API_KEY environment variable to enable AI features`);
        console.log('');
      }
      
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
      
      // 🤖 NEW: Display AI setup instructions if not configured
      if (!aiHealth.geminiConfigured) {
        console.log('\n🤖 AI Setup Instructions:');
        console.log('========================================');
        console.log('1. Get Google Gemini API key from: https://makersuite.google.com/app/apikey');
        console.log('2. Add to your .env file: GOOGLE_API_KEY=your_api_key_here');
        console.log('3. Restart the server to enable AI image analysis');
        console.log('========================================');
      } else {
        console.log('\n🤖 AI Image Analysis Ready!');
        console.log('========================================');
        console.log('✅ Users can now upload food images for automatic nutrition analysis');
        console.log('✅ Single food detection and analysis');
        console.log('✅ Multiple food detection in one image');
        console.log('✅ Automatic consumption entry creation');
        console.log('✅ Smart food matching and creation');
        console.log('========================================');
      }
      
      console.log('\n📱 Ready for requests!');
      console.log('========================================\n');
    });
    
    // Store server reference for graceful shutdown
    app.server = server;
    
    // Set server timeout (increased for AI processing)
    server.timeout = 60000; // 60 seconds for AI image processing
    
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
  
  // Log memory usage periodically in development (with AI monitoring)
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const aiHealth = checkAIServiceHealth();
    
    console.log('📊 System Status:', {
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
      },
      ai: {
        configured: aiHealth.geminiConfigured,
        uploadsReady: aiHealth.uploadsDirectoryExists && aiHealth.tempDirectoryExists
      }
    });
  }, 60000); // Every minute
}

// ========== PRODUCTION OPTIMIZATIONS ==========

if (config.NODE_ENV === 'production') {
  // Enable production-specific optimizations
  process.env.NODE_ENV = 'production';
  
  // Disable some development features
  console.log('🔧 Production mode optimizations enabled');
  
  // Set up process monitoring with AI metrics
  setInterval(() => {
    const usage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    const aiHealth = checkAIServiceHealth();
    
    // Log critical metrics
    if (memUsage.heapUsed > 500 * 1024 * 1024) { // > 500MB
      console.warn('⚠️ High memory usage detected:', Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB');
    }
    
    // 🤖 NEW: Monitor AI service health in production
    if (!aiHealth.geminiConfigured) {
      console.warn('⚠️ AI service not configured in production - some features disabled');
    }
    
    // Check for temp file buildup
    try {
      const fs = require('fs');
      const path = require('path');
      const tempDir = path.join(__dirname, 'uploads/temp');
      
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        if (files.length > 10) {
          console.warn(`⚠️ Many temporary files detected: ${files.length} files in temp directory`);
        }
      }
    } catch (error) {
      // Ignore monitoring errors
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
    
    // Note: AI image processing works better with fewer workers due to memory usage
    const maxWorkers = Math.min(numCPUs, 4);
    console.log(`🤖 AI-optimized: Using ${maxWorkers} workers (max 4 for AI processing)`);
    
    // Fork workers
    for (let i = 0; i < maxWorkers; i++) {
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
  
  // 🤖 NEW: Log if error is AI-related
  if (error.message.includes('Gemini') || error.message.includes('AI') || error.message.includes('image')) {
    console.error('🤖 AI-related error detected');
  }
  
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
  
  // 🤖 NEW: Log if rejection is AI-related
  if (reason && reason.message && (reason.message.includes('Gemini') || reason.message.includes('AI'))) {
    console.error('🤖 AI-related promise rejection detected');
  }
  
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
    
    // 🤖 NEW: Cleanup AI temporary files during shutdown
    try {
      const fs = require('fs');
      const path = require('path');
      const tempDir = path.join(__dirname, 'uploads/temp');
      
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        let cleanedFiles = 0;
        
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(tempDir, file));
            cleanedFiles++;
          } catch (cleanupError) {
            console.warn(`⚠️ Could not cleanup temp file ${file}:`, cleanupError.message);
          }
        }
        
        console.log(`🤖 Cleaned up ${cleanedFiles} AI temporary files`);
      }
    } catch (cleanupError) {
      console.warn('⚠️ AI cleanup error:', cleanupError.message);
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
  connectDatabase,
  checkAIServiceHealth // 🤖 NEW: Export AI health check for testing
};