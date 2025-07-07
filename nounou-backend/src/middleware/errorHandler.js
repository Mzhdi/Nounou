const { 
  AppError, 
  ValidationError, 
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BusinessError,
  DatabaseError,
  RateLimitError
} = require('../utils/errors');
const ApiResponse = require('../utils/responses');
const config = require('../config/env');

class ErrorHandler {
  static handle(err, req, res, next) {
    // Log détaillé de l'erreur
    console.error('❌ Error:', {
      name: err.name,
      message: err.message,
      stack: config.NODE_ENV === 'development' ? err.stack : undefined,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    // Si les headers ont déjà été envoyés, passer au gestionnaire par défaut
    if (res.headersSent) {
      return next(err);
    }

    // Gestion des erreurs custom spécifiques
    if (err instanceof ValidationError) {
      return ApiResponse.validationError(res, err.message, err.details);
    }

    if (err instanceof NotFoundError) {
      return ApiResponse.notFoundError(res, err.message);
    }

    if (err instanceof UnauthorizedError) {
      return ApiResponse.unauthorizedError(res, err.message);
    }

    if (err instanceof ForbiddenError) {
      return ApiResponse.forbiddenError(res, err.message);
    }

    if (err instanceof BusinessError) {
      return ApiResponse.businessError(res, err.message);
    }

    if (err instanceof RateLimitError) {
      return ApiResponse.rateLimitError(res, err.message, err.retryAfter);
    }

    if (err instanceof DatabaseError) {
      const message = config.NODE_ENV === 'production' 
        ? 'Database operation failed' 
        : err.message;
      return ApiResponse.serverError(res, message);
    }

    // MongoDB specific errors
    if (err.name === 'MongoError' || err.name === 'MongooseError') {
      return ErrorHandler.handleMongoError(err, res);
    }

    // Mongoose validation errors
    if (err.name === 'ValidationError' && err.errors) {
      const errorMessages = Object.values(err.errors).map(error => error.message);
      return ApiResponse.validationError(res, 'Validation failed', errorMessages);
    }

    // Mongoose cast errors (invalid ObjectId, etc.)
    if (err.name === 'CastError') {
      if (err.kind === 'ObjectId') {
        return ApiResponse.badRequestError(res, 'Invalid ID format');
      }
      return ApiResponse.badRequestError(res, `Invalid ${err.path}: ${err.value}`);
    }

    // MongoDB duplicate key errors
    if (err.code === 11000 || err.code === 11001) {
      return ErrorHandler.handleDuplicateKeyError(err, res);
    }

    // MongoDB connection errors
    if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
      return ApiResponse.serverError(res, 'Database connection failed');
    }

    // MongoDB server selection errors
    if (err.name === 'MongoServerSelectionError') {
      return ApiResponse.serverError(res, 'Database temporarily unavailable');
    }

    // MongoDB transaction errors
    if (err.name === 'MongoTransactionError') {
      return ApiResponse.serverError(res, 'Transaction failed');
    }

    // Mongoose document not found
    if (err.name === 'DocumentNotFoundError') {
      return ApiResponse.notFoundError(res, 'Document not found');
    }

    // Mongoose version errors
    if (err.name === 'VersionError') {
      return ApiResponse.conflictError(res, 'Document was modified by another process');
    }

    // Mongoose parallel save errors
    if (err.name === 'ParallelSaveError') {
      return ApiResponse.conflictError(res, 'Cannot save document in parallel');
    }

    // Mongoose strict mode errors
    if (err.name === 'StrictModeError') {
      return ApiResponse.badRequestError(res, 'Field not allowed in schema');
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      return ApiResponse.unauthorizedError(res, 'Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
      return ApiResponse.unauthorizedError(res, 'Token expired');
    }

    // Validation errors (Joi et autres)
    if (err.name === 'ValidationError') {
      if (err.isJoi) {
        const errorMessages = err.details.map(detail => detail.message);
        return ApiResponse.validationError(res, 'Validation failed', errorMessages);
      }
      return ApiResponse.validationError(res, err.details || err.message);
    }

    // Multer errors (file upload)
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ApiResponse.error(res, 'File too large', 413);
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return ApiResponse.error(res, 'Too many files', 413);
    }

    // Rate limiting
    if (err.status === 429) {
      return ApiResponse.error(res, 'Too many requests, please try again later', 429);
    }

    // Gestion des erreurs de syntaxe JSON
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return ApiResponse.badRequestError(res, 'Invalid JSON format');
    }

    // Default error response
    const message = config.NODE_ENV === 'development' ? err.message : 'Internal server error';
    const statusCode = err.statusCode || err.status || 500;
    
    return ApiResponse.error(res, message, statusCode);
  }

  // Handle MongoDB specific errors
  static handleMongoError(err, res) {
    const { code, message } = err;

    switch (code) {
      case 11000: // Duplicate key error
      case 11001:
        return ErrorHandler.handleDuplicateKeyError(err, res);
      
      case 2: // BadValue
        return ApiResponse.badRequestError(res, 'Invalid data format');
      
      case 13: // Unauthorized
        return ApiResponse.unauthorizedError(res, 'Database authorization failed');
      
      case 18: // AuthenticationFailed
        return ApiResponse.unauthorizedError(res, 'Database authentication failed');
      
      case 50: // ExceededTimeLimit
        return ApiResponse.serverError(res, 'Database operation timed out');
      
      case 96: // OperationFailed
        return ApiResponse.serverError(res, 'Database operation failed');
      
      case 121: // DocumentValidationFailure
        return ApiResponse.badRequestError(res, 'Document validation failed');
      
      case 197: // InvalidIndexSpecificationOption
        return ApiResponse.serverError(res, 'Database index error');
      
      case 251: // NoSuchTransaction
        return ApiResponse.serverError(res, 'Transaction not found');
      
      case 112: // WriteConflict
        return ApiResponse.conflictError(res, 'Write conflict occurred');
      
      case 89: // NetworkTimeout
        return ApiResponse.serverError(res, 'Database network timeout');
      
      default:
        const errorMessage = config.NODE_ENV === 'development' 
          ? `MongoDB Error: ${message}` 
          : 'Database error occurred';
        return ApiResponse.serverError(res, errorMessage);
    }
  }

  // Handle MongoDB duplicate key errors
  static handleDuplicateKeyError(err, res) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    const value = Object.values(err.keyValue || {})[0];
    
    if (field === 'email') {
      return ApiResponse.conflictError(res, 'Email already registered');
    }
    
    if (field === 'username') {
      return ApiResponse.conflictError(res, 'Username already taken');
    }
    
    if (field === 'phone') {
      return ApiResponse.conflictError(res, 'Phone number already registered');
    }
    
    // Generic duplicate error
    const message = field 
      ? `${field} '${value}' already exists`
      : 'Resource already exists';
    
    return ApiResponse.conflictError(res, message);
  }

  static notFound(req, res) {
    return ApiResponse.notFoundError(res, `Route ${req.method} ${req.url} not found`);
  }

  // Custom error classes (compatibilité avec votre code existant)
  static createError(message, statusCode = 500) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  // Helper method to check if error is MongoDB related
  static isMongoError(err) {
    return (
      err.name === 'MongoError' ||
      err.name === 'MongooseError' ||
      err.name === 'ValidationError' ||
      err.name === 'CastError' ||
      err.name === 'DocumentNotFoundError' ||
      err.name === 'VersionError' ||
      err.name === 'ParallelSaveError' ||
      err.name === 'StrictModeError' ||
      err.name === 'MongoNetworkError' ||
      err.name === 'MongoTimeoutError' ||
      err.name === 'MongoServerSelectionError' ||
      err.name === 'MongoTransactionError' ||
      (err.code && typeof err.code === 'number')
    );
  }

  // Helper method to extract meaningful error info
  static extractErrorInfo(err) {
    if (ErrorHandler.isMongoError(err)) {
      return {
        type: 'database',
        originalName: err.name,
        code: err.code,
        message: err.message,
        field: err.path,
        value: err.value
      };
    }

    return {
      type: 'application',
      originalName: err.name,
      message: err.message,
      statusCode: err.statusCode || err.status
    };
  }
}

// Gestionnaire d'erreurs non capturées
const uncaughtExceptionHandler = (err) => {
  console.error('🚨 Uncaught Exception:', err);
  console.error('💀 Shutting down the application...');
  process.exit(1);
};

// Gestionnaire de promesses rejetées non gérées
const unhandledRejectionHandler = (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('💀 Shutting down the application...');
  process.exit(1);
};

// Middleware de validation des erreurs async
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Setup error handlers
process.on('uncaughtException', uncaughtExceptionHandler);
process.on('unhandledRejection', unhandledRejectionHandler);

module.exports = ErrorHandler;