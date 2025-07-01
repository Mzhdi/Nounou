const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

class TokenUtils {
  static generateAccessToken(payload) {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expire,
      issuer: 'nounou-app',
      audience: 'nounou-mobile'
    });
  }

  static generateRefreshToken(payload) {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpire,
      issuer: 'nounou-app',
      audience: 'nounou-mobile'
    });
  }

  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: 'nounou-app',
        audience: 'nounou-mobile'
      });
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'nounou-app',
        audience: 'nounou-mobile'
      });
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  static generateSessionToken() {
    return uuidv4();
  }

  static generateTokenPair(user, deviceInfo = {}) {
    const payload = {
      userId: user.id,
      email: user.email,
      subscriptionType: user.subscription_type,
      deviceId: deviceInfo.deviceId || uuidv4()
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
      tokenType: 'Bearer',
      expiresIn: config.jwt.expire
    };
  }

  static decodeToken(token) {
    return jwt.decode(token);
  }

  static getTokenExpiration(token) {
    const decoded = this.decodeToken(token);
    return decoded ? new Date(decoded.exp * 1000) : null;
  }
}

module.exports = TokenUtils;