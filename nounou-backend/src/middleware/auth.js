const ApiResponse = require('../utils/responses');
const TokenUtils = require('../utils/tokenUtils');
const UserService = require('../services/userService');
const { HTTP_STATUS } = require('../config/constants');
const mongoose = require('mongoose');

class AuthMiddleware {
  static async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ApiResponse.unauthorizedError(res, 'Access token required');
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      if (!token) {
        return ApiResponse.unauthorizedError(res, 'Access token required');
      }

      // Verify token
      const decoded = TokenUtils.verifyAccessToken(token);
      
      // Validate ObjectId format for userId
      if (!mongoose.Types.ObjectId.isValid(decoded.userId)) {
        return ApiResponse.unauthorizedError(res, 'Invalid user ID in token');
      }

      // Check if user still exists and is active
      const user = await UserService.findById(decoded.userId);
      
      if (!user) {
        return ApiResponse.unauthorizedError(res, 'User not found');
      }

      if (!user.isActive) {
        return ApiResponse.unauthorizedError(res, 'User account is inactive');
      }

      // Check if subscription is still valid (if required)
      if (user.subscriptionType !== 'free' && user.subscriptionExpiresAt && new Date() > user.subscriptionExpiresAt) {
        // Optionally downgrade to free tier instead of rejecting
        await UserService.downgradeToFree(user._id);
        user.subscriptionType = 'free';
      }

      // Validate session if sessionId is in token
      if (decoded.sessionId) {
        const isValidSession = await UserService.validateSession(decoded.userId, decoded.sessionId);
        if (!isValidSession) {
          return ApiResponse.unauthorizedError(res, 'Session expired or invalid');
        }

        // Update session last used timestamp
        await UserService.updateSessionActivity(decoded.sessionId, {
          lastUsedAt: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      // Update user last active timestamp
      await UserService.updateLastActive(user._id);

      // Attach user info to request
      req.user = {
        id: user._id.toString(),
        email: user.email,
        subscriptionType: user.subscriptionType,
        role: user.role || 'user',
        deviceId: decoded.deviceId,
        sessionId: decoded.sessionId,
        // Token metadata for logging
        iat: decoded.iat,
        exp: decoded.exp
      };

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      
      if (error.message.includes('expired')) {
        return ApiResponse.unauthorizedError(res, 'Token expired');
      }
      
      if (error.message.includes('invalid') || error.message.includes('malformed')) {
        return ApiResponse.unauthorizedError(res, 'Invalid token');
      }
      
      return ApiResponse.unauthorizedError(res, 'Authentication failed');
    }
  }

  static requireSubscription(subscriptionTypes) {
    return (req, res, next) => {
      if (!req.user) {
        return ApiResponse.unauthorizedError(res, 'Authentication required');
      }

      const userSubscription = req.user.subscriptionType;
      
      // Admin and superadmin bypass subscription requirements
      if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        return next();
      }
      
      if (!subscriptionTypes.includes(userSubscription)) {
        return ApiResponse.error(
          res, 
          `This feature requires ${subscriptionTypes.join(' or ')} subscription. Current subscription: ${userSubscription}`, 
          HTTP_STATUS.FORBIDDEN
        );
      }

      next();
    };
  }

  // FIXED: These should return middleware functions, not call them immediately
  static requirePremium(req, res, next) {
    if (!req.user) {
      return ApiResponse.unauthorizedError(res, 'Authentication required');
    }

    const userSubscription = req.user.subscriptionType;
    
    // Admin and superadmin bypass subscription requirements
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
    }
    
    if (!['premium', 'pro'].includes(userSubscription)) {
      return ApiResponse.error(
        res, 
        `This feature requires premium or pro subscription. Current subscription: ${userSubscription}`, 
        HTTP_STATUS.FORBIDDEN
      );
    }

    next();
  }

  static requirePro(req, res, next) {
    if (!req.user) {
      return ApiResponse.unauthorizedError(res, 'Authentication required');
    }

    const userSubscription = req.user.subscriptionType;
    
    // Admin and superadmin bypass subscription requirements
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
    }
    
    if (userSubscription !== 'pro') {
      return ApiResponse.error(
        res, 
        `This feature requires pro subscription. Current subscription: ${userSubscription}`, 
        HTTP_STATUS.FORBIDDEN
      );
    }

    next();
  }

  static requireRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return ApiResponse.unauthorizedError(res, 'Authentication required');
      }

      const userRole = req.user.role || 'user';
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(userRole)) {
        return ApiResponse.error(
          res, 
          `This action requires ${allowedRoles.join(' or ')} role`, 
          HTTP_STATUS.FORBIDDEN
        );
      }

      next();
    };
  }

  static requireAdmin(req, res, next) {
    if (!req.user) {
      return ApiResponse.unauthorizedError(res, 'Authentication required');
    }

    const userRole = req.user.role || 'user';
    
    if (!['admin', 'superadmin'].includes(userRole)) {
      return ApiResponse.error(
        res, 
        'This action requires admin or superadmin role', 
        HTTP_STATUS.FORBIDDEN
      );
    }

    next();
  }

  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return ApiResponse.error(res, 'Refresh token required', HTTP_STATUS.BAD_REQUEST);
      }

      const decoded = TokenUtils.verifyRefreshToken(refreshToken);
      
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(decoded.userId)) {
        return ApiResponse.unauthorizedError(res, 'Invalid user ID in refresh token');
      }

      const user = await UserService.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        return ApiResponse.unauthorizedError(res, 'User not found or inactive');
      }

      // Validate refresh token in database
      const isValidRefreshToken = await UserService.validateRefreshToken(decoded.userId, refreshToken);
      if (!isValidRefreshToken) {
        return ApiResponse.unauthorizedError(res, 'Invalid refresh token');
      }

      // Generate new token pair
      const tokenPair = TokenUtils.generateTokenPair(user, { 
        deviceId: decoded.deviceId,
        sessionId: decoded.sessionId 
      });
      
      // Update session with new tokens
      if (decoded.sessionId) {
        await UserService.updateSessionTokens(decoded.sessionId, tokenPair);
      }

      // Update user last active
      await UserService.updateLastActive(user._id);
      
      req.tokenPair = tokenPair;
      req.user = user;
      
      next();
    } catch (error) {
      console.error('Token refresh error:', error);
      return ApiResponse.unauthorizedError(res, 'Invalid refresh token');
    }
  }

  // Rate limiting by user ID
  static userRateLimit(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      maxRequests = 100,
      message = 'Too many requests from this user'
    } = options;

    const userRequests = new Map();

    return (req, res, next) => {
      if (!req.user) {
        return next(); // Skip if not authenticated
      }

      const userId = req.user.id;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old entries
      if (userRequests.has(userId)) {
        const userReqs = userRequests.get(userId);
        userRequests.set(userId, userReqs.filter(timestamp => timestamp > windowStart));
      }

      // Check current user requests
      const currentRequests = userRequests.get(userId) || [];
      
      if (currentRequests.length >= maxRequests) {
        return ApiResponse.error(res, message, HTTP_STATUS.TOO_MANY_REQUESTS, {
          retryAfter: Math.ceil(windowMs / 1000),
          limit: maxRequests,
          remaining: 0,
          reset: new Date(now + windowMs)
        });
      }

      // Add current request
      currentRequests.push(now);
      userRequests.set(userId, currentRequests);

      // Add headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': maxRequests - currentRequests.length,
        'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
      });

      next();
    };
  }

  // Optional authentication - continue if no token
  static optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    // If token is present, try to validate it but don't fail if invalid
    try {
      const token = authHeader.substring(7);
      const decoded = TokenUtils.verifyAccessToken(token);
      
      // Set user if token is valid, but don't fail if not
      UserService.findById(decoded.userId).then(user => {
        if (user && user.isActive) {
          req.user = {
            id: user._id.toString(),
            email: user.email,
            subscriptionType: user.subscriptionType,
            role: user.role || 'user',
            deviceId: decoded.deviceId,
            sessionId: decoded.sessionId
          };
        }
      }).catch(() => {
        // Ignore errors in optional auth
      });
    } catch (error) {
      // Ignore token validation errors in optional auth
    }

    next();
  }

  // Validate device ownership
  static validateDevice(req, res, next) {
    if (!req.user) {
      return ApiResponse.unauthorizedError(res, 'Authentication required');
    }

    const tokenDeviceId = req.user.deviceId;
    const requestDeviceId = req.headers['x-device-id'] || req.body.deviceId;

    if (tokenDeviceId && requestDeviceId && tokenDeviceId !== requestDeviceId) {
      return ApiResponse.unauthorizedError(res, 'Device ID mismatch');
    }

    next();
  }

  // Check if user owns the resource
  static checkResourceOwnership(resourceIdParam = 'id', userIdField = 'userId') {
    return async (req, res, next) => {
      if (!req.user) {
        return ApiResponse.unauthorizedError(res, 'Authentication required');
      }

      // Admin can access all resources
      if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        return next();
      }

      const resourceId = req.params[resourceIdParam];
      
      // If checking user's own profile
      if (resourceIdParam === 'userId' && resourceId === req.user.id) {
        return next();
      }

      // For other resources, this is a placeholder for actual ownership check
      // In a real implementation, you would check the resource in the database
      // For now, we'll just add the check info to the request and let the controller handle it
      req.checkOwnership = {
        resourceId,
        userIdField,
        userId: req.user.id
      };

      next();
    };
  }

  // Log user activities
  static logActivity(action) {
    return async (req, res, next) => {
      if (req.user) {
        // Log user activity asynchronously
        setImmediate(async () => {
          try {
            await UserService.logActivity(req.user.id, {
              action,
              resource: req.originalUrl,
              method: req.method,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              timestamp: new Date(),
              metadata: {
                params: req.params,
                query: req.query,
                deviceId: req.user.deviceId
              }
            });
          } catch (error) {
            console.error('Activity logging error:', error);
          }
        });
      }
      next();
    };
  }

  // Validate subscription features
  static validateFeature(feature) {
    const featureSubscriptions = {
      'ai_analysis': ['premium', 'pro'],
      'export_data': ['premium', 'pro'],
      'advanced_analytics': ['pro'],
      'api_access': ['pro'],
      'bulk_operations': ['premium', 'pro'],
      'custom_reports': ['pro'],
      'unlimited_exports': ['pro'],
      'voice_input': ['premium', 'pro'],
      'image_analysis': ['premium', 'pro'],
      'barcode_scanning': ['free', 'premium', 'pro'], // Available to all
      'social_sharing': ['premium', 'pro'],
      'meal_planning': ['premium', 'pro']
    };

    return (req, res, next) => {
      if (!req.user) {
        return ApiResponse.unauthorizedError(res, 'Authentication required');
      }

      // Admin and superadmin bypass feature restrictions
      if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        return next();
      }

      const requiredSubscriptions = featureSubscriptions[feature];
      if (!requiredSubscriptions) {
        return next(); // Feature not restricted
      }

      if (!requiredSubscriptions.includes(req.user.subscriptionType)) {
        return ApiResponse.error(
          res,
          `Feature '${feature}' requires ${requiredSubscriptions.filter(s => s !== 'free').join(' or ')} subscription`,
          HTTP_STATUS.FORBIDDEN,
          {
            feature,
            requiredSubscriptions: requiredSubscriptions.filter(s => s !== 'free'),
            currentSubscription: req.user.subscriptionType,
            upgradeRequired: true
          }
        );
      }

      next();
    };
  }

  // ADDED: Additional middleware methods that might be referenced

  // Check if user has multiple roles
  static hasAnyRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return ApiResponse.unauthorizedError(res, 'Authentication required');
      }

      const userRole = req.user.role || 'user';
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(userRole)) {
        return ApiResponse.error(
          res, 
          `Access denied. Required role: ${allowedRoles.join(' or ')}`, 
          HTTP_STATUS.FORBIDDEN
        );
      }

      next();
    };
  }

  // Validate API key (for external integrations)
  static validateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!apiKey) {
      return ApiResponse.unauthorizedError(res, 'API key required');
    }

    // TODO: Implement actual API key validation
    // For now, just check if it's a valid format
    if (typeof apiKey !== 'string' || apiKey.length < 32) {
      return ApiResponse.unauthorizedError(res, 'Invalid API key format');
    }

    // In a real implementation, you would validate the API key against the database
    // and set req.apiUser or similar
    req.apiKey = apiKey;
    next();
  }

  // Combine authentication methods (token OR api key)
  static authenticateFlexible(req, res, next) {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      return AuthMiddleware.authenticate(req, res, next);
    } else if (apiKey) {
      return AuthMiddleware.validateApiKey(req, res, next);
    } else {
      return ApiResponse.unauthorizedError(res, 'Authentication required (Bearer token or API key)');
    }
  }

  // Check subscription expiry
  static checkSubscriptionExpiry(req, res, next) {
    if (!req.user) {
      return ApiResponse.unauthorizedError(res, 'Authentication required');
    }

    if (req.user.subscriptionType === 'free') {
      return next(); // Free users don't have expiry
    }

    // This would typically be handled in the authenticate method
    // but you might want a separate check in some cases
    next();
  }

  // Validate session freshness (require recent authentication)
  static requireFreshSession(maxAgeMinutes = 30) {
    return (req, res, next) => {
      if (!req.user || !req.user.iat) {
        return ApiResponse.unauthorizedError(res, 'Authentication required');
      }

      const tokenAge = Date.now() - (req.user.iat * 1000);
      const maxAge = maxAgeMinutes * 60 * 1000;

      if (tokenAge > maxAge) {
        return ApiResponse.unauthorizedError(res, 'Session too old, please re-authenticate');
      }

      next();
    };
  }
}

module.exports = AuthMiddleware;