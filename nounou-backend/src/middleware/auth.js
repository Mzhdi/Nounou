const ApiResponse = require('../utils/responses');
const TokenUtils = require('../utils/tokenUtils');
const UserService = require('../services/userService');
const { HTTP_STATUS } = require('../config/constants');

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
      
      // Check if user still exists and is active
      const user = await UserService.findById(decoded.userId);
      
      if (!user || !user.is_active) {
        return ApiResponse.unauthorizedError(res, 'User not found or inactive');
      }

      // Attach user info to request
      req.user = {
        id: user.id,
        email: user.email,
        subscriptionType: user.subscription_type,
        deviceId: decoded.deviceId
      };

      next();
    } catch (error) {
      if (error.message.includes('expired')) {
        return ApiResponse.unauthorizedError(res, 'Token expired');
      }
      
      return ApiResponse.unauthorizedError(res, 'Invalid token');
    }
  }

  static requireSubscription(subscriptionTypes) {
    return (req, res, next) => {
      if (!req.user) {
        return ApiResponse.unauthorizedError(res, 'Authentication required');
      }

      const userSubscription = req.user.subscriptionType;
      
      if (!subscriptionTypes.includes(userSubscription)) {
        return ApiResponse.error(
          res, 
          `This feature requires ${subscriptionTypes.join(' or ')} subscription`, 
          HTTP_STATUS.FORBIDDEN
        );
      }

      next();
    };
  }

  static requirePremium(req, res, next) {
    return AuthMiddleware.requireSubscription(['premium', 'pro'])(req, res, next);
  }

  static requirePro(req, res, next) {
    return AuthMiddleware.requireSubscription(['pro'])(req, res, next);
  }

  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return ApiResponse.error(res, 'Refresh token required', HTTP_STATUS.BAD_REQUEST);
      }

      const decoded = TokenUtils.verifyRefreshToken(refreshToken);
      const user = await UserService.findById(decoded.userId);
      
      if (!user || !user.is_active) {
        return ApiResponse.unauthorizedError(res, 'User not found or inactive');
      }

      // Generate new token pair
      const tokenPair = TokenUtils.generateTokenPair(user, { deviceId: decoded.deviceId });
      
      req.tokenPair = tokenPair;
      req.user = user;
      
      next();
    } catch (error) {
      return ApiResponse.unauthorizedError(res, 'Invalid refresh token');
    }
  }
}

module.exports = AuthMiddleware;