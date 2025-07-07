const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');
const mongoose = require('mongoose');

class TokenUtils {
  static generateAccessToken(payload) {
    // Ensure payload has proper data types
    const tokenPayload = {
      ...payload,
      userId: payload.userId?.toString() || payload.userId,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expire,
      issuer: 'nounou-app',
      audience: 'nounou-mobile',
      subject: tokenPayload.userId
    });
  }

  static generateRefreshToken(payload) {
    // Ensure payload has proper data types
    const tokenPayload = {
      ...payload,
      userId: payload.userId?.toString() || payload.userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(tokenPayload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpire,
      issuer: 'nounou-app',
      audience: 'nounou-mobile',
      subject: tokenPayload.userId
    });
  }

  static verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: 'nounou-app',
        audience: 'nounou-mobile'
      });

      // Validate userId is a valid ObjectId
      if (decoded.userId && !mongoose.Types.ObjectId.isValid(decoded.userId)) {
        throw new Error('Invalid user ID in token');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      } else if (error.name === 'NotBeforeError') {
        throw new Error('Token not active yet');
      }
      throw new Error('Token verification failed: ' + error.message);
    }
  }

  static verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'nounou-app',
        audience: 'nounou-mobile'
      });

      // Validate userId is a valid ObjectId
      if (decoded.userId && !mongoose.Types.ObjectId.isValid(decoded.userId)) {
        throw new Error('Invalid user ID in refresh token');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      } else if (error.name === 'NotBeforeError') {
        throw new Error('Token not active yet');
      }
      throw new Error('Refresh token verification failed: ' + error.message);
    }
  }

  static generateSessionToken() {
    return uuidv4();
  }

  static generateTokenPair(user, deviceInfo = {}) {
    // Handle both Mongoose documents and plain objects
    const userId = user._id?.toString() || user.id?.toString() || user.userId?.toString();
    const email = user.email;
    const subscriptionType = user.subscriptionType || user.subscription_type || 'free';
    const role = user.role || 'user';

    if (!userId) {
      throw new Error('User ID is required for token generation');
    }

    const payload = {
      userId,
      email,
      subscriptionType,
      role,
      deviceId: deviceInfo.deviceId || uuidv4(),
      sessionId: deviceInfo.sessionId || new mongoose.Types.ObjectId().toString(),
      tokenVersion: 1 // For token invalidation if needed
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: config.jwt.expire,
      refreshExpiresIn: config.jwt.refreshExpire,
      scope: this.getTokenScope(user),
      issuedAt: new Date().toISOString()
    };
  }

  static decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      return null;
    }
  }

  static getTokenExpiration(token) {
    const decoded = jwt.decode(token);
    return decoded?.exp ? new Date(decoded.exp * 1000) : null;
  }

  static getTokenIssuedAt(token) {
    const decoded = jwt.decode(token);
    return decoded?.iat ? new Date(decoded.iat * 1000) : null;
  }

  static isTokenExpired(token) {
    const expiration = this.getTokenExpiration(token);
    return expiration ? new Date() > expiration : true;
  }

  static getTokenRemainingTime(token) {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return 0;
    
    const remaining = expiration.getTime() - Date.now();
    return Math.max(0, remaining);
  }

  static getTokenScope(user) {
    // Define token scope based on user subscription and role
    const subscriptionType = user.subscriptionType || user.subscription_type || 'free';
    const role = user.role || 'user';
    
    const scopes = ['basic'];
    
    switch (role) {
      case 'admin':
      case 'superadmin':
        scopes.push('admin', 'read:all', 'write:all');
        break;
      case 'moderator':
        scopes.push('moderate', 'read:users');
        break;
    }
    
    switch (subscriptionType) {
      case 'pro':
        scopes.push('premium', 'pro', 'ai:advanced', 'analytics:advanced', 'export:all');
        break;
      case 'premium':
        scopes.push('premium', 'ai:basic', 'analytics:basic', 'export:basic');
        break;
    }
    
    return scopes;
  }

  static validateTokenScope(token, requiredScope) {
    try {
      const decoded = this.decodeToken(token);
      const tokenScopes = decoded?.payload?.scope || [];
      
      if (Array.isArray(requiredScope)) {
        return requiredScope.some(scope => tokenScopes.includes(scope));
      }
      
      return tokenScopes.includes(requiredScope);
    } catch (error) {
      return false;
    }
  }

  // Generate API key for external access (Pro users)
  static generateApiKey(user, keyName = 'default') {
    const userId = user._id?.toString() || user.id?.toString();
    
    if (!userId) {
      throw new Error('User ID is required for API key generation');
    }

    const payload = {
      userId,
      email: user.email,
      type: 'api_key',
      keyName,
      subscriptionType: user.subscriptionType || user.subscription_type,
      permissions: ['read:own', 'write:own'],
      createdAt: new Date().toISOString()
    };

    // API keys have longer expiration (1 year)
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: '365d',
      issuer: 'nounou-app',
      audience: 'nounou-api',
      subject: userId
    });
  }

  static verifyApiKey(apiKey) {
    try {
      return jwt.verify(apiKey, config.jwt.secret, {
        issuer: 'nounou-app',
        audience: 'nounou-api'
      });
    } catch (error) {
      throw new Error('Invalid API key');
    }
  }

  // Generate temporary token for password reset, email verification, etc.
  static generateTemporaryToken(payload, expiresIn = '1h') {
    const tokenPayload = {
      ...payload,
      type: 'temporary',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn,
      issuer: 'nounou-app',
      audience: 'nounou-temp'
    });
  }

  static verifyTemporaryToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: 'nounou-app',
        audience: 'nounou-temp'
      });
    } catch (error) {
      throw new Error('Invalid or expired temporary token');
    }
  }

  // Extract user info from token without verification (for logging purposes)
  static extractUserInfo(token) {
    try {
      const decoded = jwt.decode(token);
      return {
        userId: decoded?.userId,
        email: decoded?.email,
        subscriptionType: decoded?.subscriptionType,
        role: decoded?.role,
        deviceId: decoded?.deviceId,
        sessionId: decoded?.sessionId,
        issuedAt: decoded?.iat ? new Date(decoded.iat * 1000) : null,
        expiresAt: decoded?.exp ? new Date(decoded.exp * 1000) : null
      };
    } catch (error) {
      return null;
    }
  }

  // Blacklist token (for logout, security breaches, etc.)
  static generateTokenFingerprint(token) {
    // Generate a fingerprint of the token for blacklisting
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
  }

  // Validate token format without verification
  static isValidTokenFormat(token) {
    if (!token || typeof token !== 'string') return false;
    
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    try {
      // Check if each part is valid base64
      parts.forEach(part => {
        Buffer.from(part, 'base64url');
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get token type from token
  static getTokenType(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded?.type || 'access';
    } catch (error) {
      return null;
    }
  }

  // Refresh token pair with new expiration
  static refreshTokenPair(oldRefreshToken, user, deviceInfo = {}) {
    // Verify the old refresh token first
    const decoded = this.verifyRefreshToken(oldRefreshToken);
    
    // Generate new token pair with same device info
    return this.generateTokenPair(user, {
      deviceId: decoded.deviceId || deviceInfo.deviceId,
      sessionId: decoded.sessionId || deviceInfo.sessionId,
      ...deviceInfo
    });
  }

  // Token introspection (detailed token info)
  static introspectToken(token) {
    try {
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded) {
        return { valid: false, error: 'Invalid token format' };
      }

      const now = Math.floor(Date.now() / 1000);
      const isExpired = decoded.payload.exp < now;
      const timeToExpiry = decoded.payload.exp - now;

      return {
        valid: !isExpired,
        header: decoded.header,
        payload: decoded.payload,
        isExpired,
        timeToExpiry: Math.max(0, timeToExpiry),
        timeToExpiryHuman: this.secondsToHuman(timeToExpiry),
        issuer: decoded.payload.iss,
        audience: decoded.payload.aud,
        subject: decoded.payload.sub,
        issuedAt: new Date(decoded.payload.iat * 1000),
        expiresAt: new Date(decoded.payload.exp * 1000)
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Helper to convert seconds to human readable format
  static secondsToHuman(seconds) {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  }
}

module.exports = TokenUtils;