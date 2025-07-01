module.exports = {
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500
  },

  // User related constants
  USER: {
    GENDERS: ['M', 'F', 'Other'],
    ACTIVITY_LEVELS: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
    SUBSCRIPTION_TYPES: ['free', 'premium', 'pro'],
    GOAL_TYPES: ['weight_loss', 'weight_gain', 'maintain', 'muscle_gain', 'health_improvement'],
    
    // Validation limits
    MIN_AGE: 13,
    MAX_AGE: 120,
    MIN_HEIGHT: 100, // cm
    MAX_HEIGHT: 250, // cm
    MIN_WEIGHT: 30, // kg
    MAX_WEIGHT: 300, // kg
    
    // Password requirements
    MIN_PASSWORD_LENGTH: 8,
    MAX_PASSWORD_LENGTH: 128,

    // Session management (AJOUTÉ ICI)
    SESSION: {
      DEVICE_TYPES: ['mobile', 'tablet', 'web', 'desktop'],
      MAX_SESSIONS_PER_USER: 10,
      SESSION_CLEANUP_INTERVAL: 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  // Session management (SUPPRIMÉ D'ICI - maintenant sous USER.SESSION)

  // Nutrition constants
  NUTRITION: {
    MEAL_TYPES: ['breakfast', 'lunch', 'dinner', 'snack', 'other'],
    ENTRY_METHODS: ['barcode_scan', 'image_analysis', 'recipe', 'manual', 'voice'],
    
    // Daily limits for validation
    MAX_DAILY_CALORIES: 10000,
    MAX_DAILY_PROTEIN: 500, // grams
    MAX_DAILY_CARBS: 1000, // grams
    MAX_DAILY_FAT: 300, // grams
    MAX_DAILY_WATER: 10000 // ml
  },

  // Error messages
  ERRORS: {
    // Authentication
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_ALREADY_EXISTS: 'Email already registered',
    INVALID_TOKEN: 'Invalid or expired token',
    UNAUTHORIZED_ACCESS: 'Unauthorized access',
    
    // User validation
    INVALID_EMAIL: 'Invalid email format',
    WEAK_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
    INVALID_AGE: 'Age must be between 13 and 120 years',
    INVALID_HEIGHT: 'Height must be between 100 and 250 cm',
    INVALID_WEIGHT: 'Weight must be between 30 and 300 kg',
    
    // General
    USER_NOT_FOUND: 'User not found',
    VALIDATION_ERROR: 'Validation error',
    INTERNAL_ERROR: 'Internal server error',
    RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later'
  },

  // Success messages
  SUCCESS: {
    USER_REGISTERED: 'User registered successfully',
    USER_UPDATED: 'User profile updated successfully',
    PASSWORD_CHANGED: 'Password changed successfully',
    LOGOUT_SUCCESS: 'Logged out successfully',
    EMAIL_SENT: 'Email sent successfully'
  },

  // Regex patterns
  REGEX: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    PHONE: /^\+?[\d\s\-\(\)]+$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  }
};