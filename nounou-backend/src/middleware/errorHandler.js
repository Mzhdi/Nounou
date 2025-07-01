const ApiResponse = require('../utils/responses');
const config = require('../config/env');

class ErrorHandler {
  static handle(err, req, res, next) {
    console.error('❌ Error:', {
      message: err.message,
      stack: config.NODE_ENV === 'development' ? err.stack : undefined,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Database errors
    if (err.code === '23505') { // PostgreSQL unique violation
      const detail = err.detail || '';
      if (detail.includes('email')) {
        return ApiResponse.conflictError(res, 'Email already registered');
      }
      return ApiResponse.conflictError(res, 'Resource already exists');
    }

    if (err.code === '23503') { // PostgreSQL foreign key violation
      return ApiResponse.error(res, 'Referenced resource not found', 400);
    }

    if (err.code === '23514') { // PostgreSQL check violation
      return ApiResponse.error(res, 'Data validation failed', 400);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      return ApiResponse.unauthorizedError(res, 'Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
      return ApiResponse.unauthorizedError(res, 'Token expired');
    }

    // Validation errors
    if (err.name === 'ValidationError') {
      return ApiResponse.validationError(res, err.details);
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

    // Default error response
    const message = config.NODE_ENV === 'development' ? err.message : 'Internal server error';
    const statusCode = err.statusCode || err.status || 500;
    
    return ApiResponse.error(res, message, statusCode);
  }

  static notFound(req, res) {
    return ApiResponse.notFoundError(res, `Route ${req.method} ${req.url} not found`);
  }

  // Custom error classes
  static createError(message, statusCode = 500) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }
}

module.exports = ErrorHandler;