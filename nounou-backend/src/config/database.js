const mongoose = require('mongoose');
const config = require('./env');

class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    
    // MongoDB connection options
    this.options = {
      maxPoolSize: 20, // Maximum number of connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      retryWrites: true,
      w: 'majority'
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    mongoose.connection.on('connected', () => {
      console.log('🗄️  Connected to MongoDB database');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB disconnected');
      this.isConnected = false;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🔒 MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error);
        process.exit(1);
      }
    });
  }

  async connect() {
    try {
      this.connection = await mongoose.connect(config.database.uri, this.options);
      this.isConnected = true;
      return this.connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  // For backward compatibility with PostgreSQL query method
  async query(operation, params = {}) {
    const start = Date.now();
    try {
      // This is a compatibility layer - in practice, you'll use Mongoose models directly
      // But keeping it for smooth migration
      let result;
      
      if (typeof operation === 'function') {
        result = await operation(params);
      } else {
        throw new Error('MongoDB query method requires a function (use Mongoose models directly)');
      }
      
      const duration = Date.now() - start;
      
      if (config.NODE_ENV === 'development') {
        console.log('🔍 MongoDB operation executed:', { 
          operation: operation.name || 'anonymous', 
          duration: `${duration}ms`
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ MongoDB operation error:', error);
      throw error;
    }
  }

  async getClient() {
    // For MongoDB, return the mongoose connection
    if (!this.isConnected) {
      await this.connect();
    }
    return mongoose.connection;
  }

  async transaction(callback) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        return await callback(session);
      });
    } catch (error) {
      console.error('❌ MongoDB transaction error:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async testConnection() {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      // Test with a simple ping
      const admin = mongoose.connection.db.admin();
      const result = await admin.ping();
      
      console.log('✅ MongoDB connection successful:', {
        status: 'connected',
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port
      });
      
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      return false;
    }
  }

  async close() {
    try {
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('🔒 MongoDB connection closed');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
      throw error;
    }
  }

  // Additional MongoDB specific methods
  getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    return {
      state: states[mongoose.connection.readyState],
      isConnected: this.isConnected,
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port
    };
  }

  async healthCheck() {
    try {
      const status = this.getConnectionStatus();
      if (status.isConnected) {
        await mongoose.connection.db.admin().ping();
        return { status: 'healthy', ...status };
      } else {
        return { status: 'unhealthy', ...status };
      }
    } catch (error) {
      return { 
        status: 'error', 
        error: error.message,
        isConnected: false 
      };
    }
  }
}

// Singleton instance
const database = new Database();

module.exports = database;