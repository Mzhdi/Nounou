// Classes d'erreur personnalisées pour l'application

class AppError extends Error {
    constructor(message, statusCode = 500) {
      super(message);
      this.name = this.constructor.name;
      this.statusCode = statusCode;
      this.isOperational = true;
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  class ValidationError extends AppError {
    constructor(message, details = []) {
      super(message, 400);
      this.details = details;
    }
  }
  
  class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
      super(message, 404);
    }
  }
  
  class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
      super(message, 401);
    }
  }
  
  class ForbiddenError extends AppError {
    constructor(message = 'Access forbidden') {
      super(message, 403);
    }
  }
  
  class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
      super(message, 409);
    }
  }
  
  class BusinessError extends AppError {
    constructor(message = 'Business logic error', originalError = null) {
      super(message, 422);
      this.originalError = originalError;
      
      if (originalError) {
        this.stack = originalError.stack;
      }
    }
  }
  
  class DatabaseError extends AppError {
    constructor(message = 'Database operation failed', originalError = null) {
      super(message, 500);
      this.originalError = originalError;
      
      if (originalError) {
        this.stack = originalError.stack;
      }
    }
  }
  
  class ExternalServiceError extends AppError {
    constructor(message = 'External service error', statusCode = 502) {
      super(message, statusCode);
    }
  }
  
  class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded', retryAfter = 60) {
      super(message, 429);
      this.retryAfter = retryAfter;
    }
  }
  
  class TokenError extends AppError {
    constructor(message = 'Token error') {
      super(message, 401);
    }
  }
  
  class SubscriptionError extends AppError {
    constructor(message = 'Subscription required') {
      super(message, 402);
    }
  }
  
  module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    BusinessError,
    DatabaseError,
    ExternalServiceError,
    RateLimitError,
    TokenError,
    SubscriptionError
  };