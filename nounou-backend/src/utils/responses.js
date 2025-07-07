const { HTTP_STATUS } = require('../config/constants');

class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = HTTP_STATUS.OK, meta = {}) {
    const response = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    // Add metadata if provided
    if (Object.keys(meta).length > 0) {
      response.meta = meta;
    }

    return res.status(statusCode).json(response);
  }

  static error(res, message = 'Error', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = null, meta = {}) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (errors) {
      response.errors = errors;
    }

    if (Object.keys(meta).length > 0) {
      response.meta = meta;
    }

    return res.status(statusCode).json(response);
  }

  static validationError(res, errors, message = 'Validation failed') {
    // Handle different error formats
    let formattedErrors = errors;
    
    if (typeof errors === 'string') {
      formattedErrors = [{ message: errors }];
    } else if (Array.isArray(errors) && typeof errors[0] === 'string') {
      formattedErrors = errors.map(error => ({ message: error }));
    }

    return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
      success: false,
      message,
      errors: formattedErrors,
      timestamp: new Date().toISOString()
    });
  }

  static unauthorizedError(res, message = 'Unauthorized access') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  static forbiddenError(res, message = 'Access forbidden') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  static notFoundError(res, message = 'Resource not found') {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  static conflictError(res, message = 'Resource already exists') {
    return res.status(HTTP_STATUS.CONFLICT).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  static badRequestError(res, message = 'Bad request') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  static businessError(res, message = 'Business logic error') {
    return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  static serverError(res, message = 'Internal server error') {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  static rateLimitError(res, message = 'Rate limit exceeded', retryAfter = 60) {
    res.set('Retry-After', retryAfter);
    
    return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message,
      retryAfter,
      timestamp: new Date().toISOString()
    });
  }

  // Paginated response helper
  static paginated(res, data, pagination, message = 'Data retrieved successfully', meta = {}) {
    return this.success(res, data, message, HTTP_STATUS.OK, {
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || 0,
        totalPages: pagination.totalPages || 0,
        hasNext: pagination.hasNext || false,
        hasPrev: pagination.hasPrev || false
      },
      ...meta
    });
  }

  // Collection response with stats
  static collection(res, items, stats = {}, message = 'Collection retrieved successfully') {
    return this.success(res, {
      items,
      count: items.length,
      ...stats
    }, message);
  }

  // Created response for new resources
  static created(res, data, message = 'Resource created successfully', location = null) {
    const response = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    if (location) {
      res.set('Location', location);
      response.location = location;
    }

    return res.status(HTTP_STATUS.CREATED).json(response);
  }

  // No content response
  static noContent(res) {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  // Accepted response for async operations
  static accepted(res, message = 'Request accepted for processing', taskId = null) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };

    if (taskId) {
      response.taskId = taskId;
    }

    return res.status(202).json(response);
  }

  // Health check response
  static health(res, status = 'healthy', checks = {}) {
    const isHealthy = status === 'healthy';
    const statusCode = isHealthy ? HTTP_STATUS.OK : 503;

    return res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks
    });
  }

  // File download response
  static file(res, filePath, fileName = null, mimeType = null) {
    if (fileName) {
      res.set('Content-Disposition', `attachment; filename="${fileName}"`);
    }
    
    if (mimeType) {
      res.set('Content-Type', mimeType);
    }

    return res.sendFile(filePath);
  }

  // Stream response
  static stream(res, stream, mimeType = 'application/octet-stream', fileName = null) {
    res.set('Content-Type', mimeType);
    
    if (fileName) {
      res.set('Content-Disposition', `attachment; filename="${fileName}"`);
    }

    return stream.pipe(res);
  }

  // CSV response
  static csv(res, data, fileName = 'export.csv') {
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(data);
  }

  // Excel response
  static excel(res, data, fileName = 'export.xlsx') {
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(data);
  }

  // PDF response
  static pdf(res, data, fileName = 'document.pdf') {
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(data);
  }

  // Response with custom headers
  static withHeaders(res, data, headers = {}, message = 'Success', statusCode = HTTP_STATUS.OK) {
    Object.keys(headers).forEach(key => {
      res.set(key, headers[key]);
    });

    return this.success(res, data, message, statusCode);
  }

  // MongoDB-specific error handling
  static mongoError(res, error) {
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const message = field ? `${field} already exists` : 'Duplicate key error';
      return this.conflictError(res, message);
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      return this.validationError(res, errors, 'Document validation failed');
    }

    if (error.name === 'CastError') {
      return this.badRequestError(res, `Invalid ${error.path}: ${error.value}`);
    }

    if (error.name === 'DocumentNotFoundError') {
      return this.notFoundError(res, 'Document not found');
    }

    // Generic MongoDB error
    return this.serverError(res, 'Database operation failed');
  }

  // Subscription required error
  static subscriptionRequired(res, requiredTier = 'premium', currentTier = 'free') {
    return res.status(402).json({
      success: false,
      message: `This feature requires ${requiredTier} subscription`,
      currentSubscription: currentTier,
      requiredSubscription: requiredTier,
      upgradeUrl: `/subscription/upgrade?tier=${requiredTier}`,
      timestamp: new Date().toISOString()
    });
  }

  // Feature flag response
  static featureUnavailable(res, feature, reason = 'Feature not available') {
    return res.status(501).json({
      success: false,
      message: reason,
      feature,
      timestamp: new Date().toISOString()
    });
  }

  // Maintenance mode response
  static maintenance(res, message = 'Service temporarily unavailable for maintenance', estimatedDuration = null) {
    const response = {
      success: false,
      message,
      maintenanceMode: true,
      timestamp: new Date().toISOString()
    };

    if (estimatedDuration) {
      response.estimatedDuration = estimatedDuration;
    }

    res.set('Retry-After', '3600'); // 1 hour
    return res.status(503).json(response);
  }

  // API version mismatch
  static versionMismatch(res, supportedVersions = [], requestedVersion = null) {
    return res.status(400).json({
      success: false,
      message: 'API version not supported',
      requestedVersion,
      supportedVersions,
      timestamp: new Date().toISOString()
    });
  }

  // Rate limit info helper
  static addRateLimitHeaders(res, limit, remaining, reset) {
    res.set({
      'X-RateLimit-Limit': limit,
      'X-RateLimit-Remaining': remaining,
      'X-RateLimit-Reset': reset
    });
  }

  // CORS helper
  static setCorsHeaders(res, origin = '*', methods = 'GET,POST,PUT,DELETE,OPTIONS', headers = 'Content-Type,Authorization') {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers': headers,
      'Access-Control-Allow-Credentials': 'true'
    });
  }

  // Cache headers helper
  static setCacheHeaders(res, maxAge = 3600, isPublic = true) {
    const cacheControl = isPublic ? `public, max-age=${maxAge}` : `private, max-age=${maxAge}`;
    res.set({
      'Cache-Control': cacheControl,
      'ETag': `"${Date.now()}"`,
      'Last-Modified': new Date().toUTCString()
    });
  }
}

module.exports = ApiResponse;