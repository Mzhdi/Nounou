const { HTTP_STATUS } = require('../config/constants');

class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = HTTP_STATUS.OK) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static error(res, message = 'Error', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  static validationError(res, errors) {
    return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: 'Validation failed',
      errors,
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
}

module.exports = ApiResponse;