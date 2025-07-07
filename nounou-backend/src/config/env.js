require('dotenv').config();

const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 3000,
  API_VERSION: process.env.API_VERSION || 'v1',

  // Database (MongoDB)
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nounou',
    name: process.env.DB_NAME || 'nounou',
    
    // Connection options
    options: {
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 20,
      serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 5000,
      socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
      maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME) || 30000,
      retryWrites: process.env.DB_RETRY_WRITES !== 'false',
      w: process.env.DB_WRITE_CONCERN || 'majority'
    },

    // Collections naming (if you want to customize)
    collections: {
      users: process.env.COLLECTION_USERS || 'users',
      userSessions: process.env.COLLECTION_USER_SESSIONS || 'user_sessions',
      userGoals: process.env.COLLECTION_USER_GOALS || 'user_goals',
      consumptionEntries: process.env.COLLECTION_CONSUMPTION_ENTRIES || 'consumption_entries',
      dailySummaries: process.env.COLLECTION_DAILY_SUMMARIES || 'daily_summaries',
      userKpis: process.env.COLLECTION_USER_KPIS || 'user_kpis',
      achievements: process.env.COLLECTION_ACHIEVEMENTS || 'achievements',
      userAchievements: process.env.COLLECTION_USER_ACHIEVEMENTS || 'user_achievements',
      userStreaks: process.env.COLLECTION_USER_STREAKS || 'user_streaks',
      userInsights: process.env.COLLECTION_USER_INSIGHTS || 'user_insights',
      weeklySummaries: process.env.COLLECTION_WEEKLY_SUMMARIES || 'weekly_summaries',
      monthlySummaries: process.env.COLLECTION_MONTHLY_SUMMARIES || 'monthly_summaries'
    }
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expire: process.env.JWT_EXPIRE || '24h',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '7d'
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    lockTime: process.env.LOCK_TIME || '30m'
  },

  // Rate Limiting
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW || '15m',
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100
  },

  // Email
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD
  },

  // MongoDB specific settings
  mongodb: {
    // Enable/disable MongoDB features
    enableTransactions: process.env.MONGODB_ENABLE_TRANSACTIONS !== 'false',
    enableChangeStreams: process.env.MONGODB_ENABLE_CHANGE_STREAMS === 'true',
    
    // Aggregation pipeline settings
    allowDiskUse: process.env.MONGODB_ALLOW_DISK_USE === 'true',
    maxTimeMS: parseInt(process.env.MONGODB_MAX_TIME_MS) || 30000,
    
    // Index settings
    autoIndex: process.env.NODE_ENV === 'development', // Only in development
    autoCreate: process.env.NODE_ENV === 'development' // Only in development
  }
};

// Validation des variables d'environnement critiques
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

// Add MONGODB_URI to required vars if not using default localhost
if (config.NODE_ENV === 'production') {
  requiredEnvVars.push('MONGODB_URI');
}

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Validate MongoDB URI format
if (config.database.uri && !config.database.uri.startsWith('mongodb')) {
  console.error('❌ Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
  process.exit(1);
}

module.exports = config;