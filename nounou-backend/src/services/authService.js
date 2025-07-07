const { UserModel, User, UserSession } = require('../models/userModel');
const UserService = require('./userService');
const PasswordUtils = require('../utils/passwordUtils');
const TokenUtils = require('../utils/tokenUtils');
const { ERRORS, SUCCESS } = require('../config/constants');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

class AuthService {
  // Connexion utilisateur
  async login(credentials, deviceInfo = {}) {
    try {
      const { email, password, deviceId, deviceType } = credentials;

      // Trouver l'utilisateur avec mot de passe
      const user = await UserService.findByEmailWithPassword(email);
      
      if (!user || !user.isActive) {
        throw new Error(ERRORS.INVALID_CREDENTIALS);
      }

      // Vérifier le mot de passe
      const isPasswordValid = await PasswordUtils.compare(password, user.password_hash);
      
      if (!isPasswordValid) {
        throw new Error(ERRORS.INVALID_CREDENTIALS);
      }

      // Nettoyer les anciennes sessions si nécessaire
      await this.cleanupUserSessions(user._id);

      // Générer les tokens
      const sessionId = new mongoose.Types.ObjectId();
      const tokenPair = TokenUtils.generateTokenPair(user, { 
        deviceId: deviceId || uuidv4(),
        sessionId: sessionId.toString()
      });

      // Créer la session
      const sessionData = {
        _id: sessionId,
        userId: user._id,
        token: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        deviceId: deviceId || uuidv4(),
        deviceType: deviceType || 'mobile',
        deviceInfo: {
          userAgent: deviceInfo.userAgent,
          platform: deviceInfo.platform,
          version: deviceInfo.version
        },
        ipAddress: deviceInfo.ipAddress,
        location: {
          country: this.extractCountry(deviceInfo.location),
          city: this.extractCity(deviceInfo.location),
          timezone: deviceInfo.timezone
        },
        expiresAt: TokenUtils.getTokenExpiration(tokenPair.accessToken)
      };

      const session = await UserModel.createSession(sessionData);

      // Update user last active
      await UserService.updateLastActive(user._id);

      // Log login activity
      await UserService.logActivity(user._id, {
        action: 'user_login',
        resource: 'auth',
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        metadata: {
          deviceType,
          deviceId: sessionData.deviceId,
          loginMethod: 'email_password'
        }
      });

      // Retourner les données de connexion
      return {
        user: UserService.sanitizeUser(user),
        tokens: tokenPair,
        session: {
          id: session._id.toString(),
          deviceId: sessionData.deviceId,
          deviceType: sessionData.deviceType,
          expiresAt: sessionData.expiresAt
        },
        permissions: UserService.getUserPermissions(user),
        subscription: UserService.getSubscriptionInfo(user)
      };
    } catch (error) {
      // Log failed login attempt
      if (deviceInfo.ipAddress) {
        console.warn(`Failed login attempt from ${deviceInfo.ipAddress} for email: ${credentials.email}`);
      }
      throw error;
    }
  }

  // Rafraîchir les tokens
  async refreshTokens(refreshToken, deviceInfo = {}) {
    try {
      // Vérifier le refresh token
      const decoded = TokenUtils.verifyRefreshToken(refreshToken);
      
      if (!mongoose.Types.ObjectId.isValid(decoded.userId)) {
        throw new Error(ERRORS.INVALID_TOKEN);
      }

      // Récupérer l'utilisateur
      const user = await UserService.findByEmailWithPassword(decoded.email || '');
      
      if (!user || !user.isActive) {
        throw new Error(ERRORS.INVALID_TOKEN);
      }

      // Valider le refresh token en base
      const isValidRefreshToken = await UserService.validateRefreshToken(user._id, refreshToken);
      if (!isValidRefreshToken) {
        throw new Error(ERRORS.INVALID_TOKEN);
      }

      // Générer de nouveaux tokens
      const tokenPair = TokenUtils.generateTokenPair(user, { 
        deviceId: decoded.deviceId,
        sessionId: decoded.sessionId 
      });

      // Mettre à jour la session avec les nouveaux tokens
      if (decoded.sessionId) {
        await UserService.updateSessionTokens(decoded.sessionId, tokenPair);
      }

      // Update user last active
      await UserService.updateLastActive(user._id);

      // Log token refresh
      await UserService.logActivity(user._id, {
        action: 'token_refresh',
        resource: 'auth',
        ipAddress: deviceInfo.ipAddress,
        metadata: {
          sessionId: decoded.sessionId,
          deviceId: decoded.deviceId
        }
      });

      return {
        user: UserService.sanitizeUser(user),
        tokens: tokenPair,
        session: {
          id: decoded.sessionId,
          deviceId: decoded.deviceId,
          deviceType: deviceInfo.deviceType || 'mobile',
          expiresAt: TokenUtils.getTokenExpiration(tokenPair.accessToken)
        },
        permissions: UserService.getUserPermissions(user)
      };
    } catch (error) {
      throw error;
    }
  }

  // Déconnexion simple
  async logout(token) {
    try {
      const deletedSession = await UserModel.deleteSession(token);
      
      if (!deletedSession) {
        throw new Error(ERRORS.INVALID_TOKEN);
      }

      // Log logout activity
      if (deletedSession.userId) {
        await UserService.logActivity(deletedSession.userId, {
          action: 'user_logout',
          resource: 'auth',
          metadata: {
            sessionId: deletedSession._id?.toString(),
            deviceId: deletedSession.deviceId
          }
        });
      }

      return {
        message: SUCCESS.LOGOUT_SUCCESS,
        sessionId: deletedSession._id?.toString()
      };
    } catch (error) {
      throw error;
    }
  }

  // Déconnexion d'un utilisateur spécifique (pour le controller)
  async logoutUser(userId, sessionId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error(ERRORS.USER_NOT_FOUND);
      }

      let deletedCount = 0;

      if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
        // Logout specific session
        const session = await UserSession.findOneAndDelete({
          _id: sessionId,
          userId: userId
        });
        deletedCount = session ? 1 : 0;
      } else {
        // Logout all sessions for this user
        const result = await UserSession.deleteMany({ userId: userId });
        deletedCount = result.deletedCount;
      }

      // Log logout activity
      await UserService.logActivity(userId, {
        action: sessionId ? 'session_logout' : 'all_sessions_logout',
        resource: 'auth',
        metadata: {
          sessionId,
          sessionsDeleted: deletedCount
        }
      });

      return {
        message: SUCCESS.LOGOUT_SUCCESS,
        sessionsDeleted: deletedCount
      };
    } catch (error) {
      throw error;
    }
  }

  // Déconnexion de tous les appareils
  async logoutAllDevices(userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error(ERRORS.USER_NOT_FOUND);
      }

      const deletedCount = await UserModel.deleteAllUserSessions(userId);
      
      // Log activity
      await UserService.logActivity(userId, {
        action: 'logout_all_devices',
        resource: 'auth',
        metadata: {
          devicesLoggedOut: deletedCount
        }
      });

      return {
        message: SUCCESS.LOGOUT_SUCCESS,
        devicesLoggedOut: deletedCount
      };
    } catch (error) {
      throw error;
    }
  }

  // Déconnexion de tous les appareils sauf le current
  async logoutAllDevicesExcept(userId, currentSessionId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error(ERRORS.USER_NOT_FOUND);
      }

      const result = await UserSession.deleteMany({
        userId: userId,
        _id: { $ne: currentSessionId }
      });

      await UserService.logActivity(userId, {
        action: 'logout_other_devices',
        resource: 'auth',
        metadata: {
          devicesLoggedOut: result.deletedCount,
          currentSessionId
        }
      });

      return {
        message: 'Logged out from other devices',
        devicesLoggedOut: result.deletedCount
      };
    } catch (error) {
      throw error;
    }
  }

  // Vérifier un token d'accès
  async verifyAccessToken(token) {
    try {
      const decoded = TokenUtils.verifyAccessToken(token);
      
      if (!mongoose.Types.ObjectId.isValid(decoded.userId)) {
        throw new Error(ERRORS.INVALID_TOKEN);
      }

      const user = await UserService.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        throw new Error(ERRORS.INVALID_TOKEN);
      }

      return {
        user: UserService.sanitizeUser(user),
        permissions: UserService.getUserPermissions(user)
      };
    } catch (error) {
      throw error;
    }
  }

  // Inscription utilisateur
  async register(userData, deviceInfo = {}) {
    try {
      // Créer l'utilisateur
      const newUser = await UserService.createUser(userData);

      // Connecter automatiquement après inscription
      const loginResult = await this.login({
        email: userData.email,
        password: userData.password,
        deviceId: deviceInfo.deviceId,
        deviceType: deviceInfo.deviceType
      }, deviceInfo);

      // Log registration
      await UserService.logActivity(newUser._id || newUser.id, {
        action: 'user_registration',
        resource: 'auth',
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        metadata: {
          registrationMethod: 'email',
          deviceType: deviceInfo.deviceType,
          subscriptionType: userData.subscriptionType || 'free'
        }
      });

      return {
        message: SUCCESS.USER_REGISTERED,
        ...loginResult
      };
    } catch (error) {
      throw error;
    }
  }

  // Obtenir les sessions actives d'un utilisateur
  async getUserSessions(userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return [];
      }

      const sessions = await UserSession.find({
        userId: userId,
        expiresAt: { $gt: new Date() },
        isActive: true
      })
      .select('deviceId deviceType deviceInfo ipAddress location createdAt lastUsedAt expiresAt')
      .sort({ lastUsedAt: -1 })
      .lean();

      return sessions.map(session => ({
        id: session._id.toString(),
        deviceId: session.deviceId,
        deviceType: session.deviceType,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        location: session.location,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt,
        isExpired: new Date() > session.expiresAt
      }));
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  // Révoquer une session spécifique
  async revokeSession(userId, sessionId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(sessionId)) {
        throw new Error('Invalid user ID or session ID');
      }

      const deletedSession = await UserSession.findOneAndDelete({
        _id: sessionId,
        userId: userId
      });
      
      if (!deletedSession) {
        throw new Error('Session not found or unauthorized');
      }

      // Log session revocation
      await UserService.logActivity(userId, {
        action: 'session_revoked',
        resource: 'auth',
        metadata: {
          revokedSessionId: sessionId,
          deviceId: deletedSession.deviceId,
          deviceType: deletedSession.deviceType
        }
      });

      return {
        message: 'Session revoked successfully',
        sessionId: sessionId,
        deviceId: deletedSession.deviceId
      };
    } catch (error) {
      throw error;
    }
  }

  // Nettoyage automatique des sessions expirées
  async cleanupExpiredSessions() {
    try {
      const deletedCount = await UserModel.deleteExpiredSessions();
      
      console.log(`🧹 Cleaned up ${deletedCount} expired sessions`);
      
      return {
        message: 'Expired sessions cleaned up',
        deletedCount
      };
    } catch (error) {
      console.error('❌ Error cleaning up expired sessions:', error);
      throw error;
    }
  }

  // Nettoyer les sessions anciennes d'un utilisateur (garder seulement les N plus récentes)
  async cleanupUserSessions(userId, maxSessions = 10) {
    try {
      const sessions = await UserSession.find({ userId })
        .sort({ lastUsedAt: -1 })
        .skip(maxSessions);

      if (sessions.length > 0) {
        const sessionIds = sessions.map(s => s._id);
        const result = await UserSession.deleteMany({
          _id: { $in: sessionIds }
        });
        
        console.log(`🧹 Cleaned up ${result.deletedCount} old sessions for user ${userId}`);
      }
    } catch (error) {
      console.error('Error cleaning up user sessions:', error);
    }
  }

  // Valider les permissions pour une action
  validatePermissions(user, requiredPermissions) {
    const userPermissions = UserService.getUserPermissions(user);
    
    return requiredPermissions.every(permission => userPermissions[permission]);
  }

  // Générer un token de réinitialisation de mot de passe
  async generatePasswordResetToken(email) {
    try {
      const user = await UserService.findByEmail(email);
      
      if (!user) {
        // Ne pas révéler si l'email existe ou non
        return { message: 'If the email exists, a reset link has been sent' };
      }

      // Générer un token temporaire sécurisé
      const resetToken = TokenUtils.generateSessionToken();
      const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

      // TODO: Stocker le token dans une collection séparée ou dans le user
      // await PasswordResetToken.create({
      //   userId: user._id,
      //   token: resetToken,
      //   expiresAt,
      //   used: false
      // });

      // Log password reset request
      await UserService.logActivity(user._id || user.id, {
        action: 'password_reset_requested',
        resource: 'auth',
        metadata: {
          email: user.email
        }
      });

      // TODO: Envoyer l'email avec le token
      
      return { 
        message: 'Password reset link sent to your email',
        // En développement seulement
        ...(process.env.NODE_ENV === 'development' && { 
          resetToken,
          expiresAt,
          userId: user._id || user.id
        })
      };
    } catch (error) {
      throw error;
    }
  }

  // Réinitialiser le mot de passe avec token
  async resetPasswordWithToken(token, newPassword) {
    try {
      // TODO: Implémenter la vérification du token de reset
      // const resetTokenDoc = await PasswordResetToken.findOne({
      //   token,
      //   expiresAt: { $gt: new Date() },
      //   used: false
      // });

      // if (!resetTokenDoc) {
      //   throw new Error('Invalid or expired reset token');
      // }

      // const user = await User.findById(resetTokenDoc.userId);
      // if (!user) {
      //   throw new Error('User not found');
      // }

      // // Update password
      // const hashedPassword = await PasswordUtils.hash(newPassword);
      // await User.findByIdAndUpdate(user._id, { password_hash: hashedPassword });

      // // Mark token as used
      // await PasswordResetToken.findByIdAndUpdate(resetTokenDoc._id, { used: true });

      // // Logout all sessions
      // await this.logoutAllDevices(user._id);

      // // Log password reset
      // await UserService.logActivity(user._id, {
      //   action: 'password_reset_completed',
      //   resource: 'auth'
      // });

      return {
        message: 'Password reset successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Obtenir des statistiques de sessions
  async getSessionStats() {
    try {
      const stats = await UserSession.aggregate([
        {
          $group: {
            _id: '$deviceType',
            totalSessions: { $sum: 1 },
            activeSessions: {
              $sum: {
                $cond: [{ $gt: ['$expiresAt', new Date()] }, 1, 0]
              }
            },
            avgSessionDuration: {
              $avg: {
                $subtract: ['$lastUsedAt', '$createdAt']
              }
            }
          }
        },
        {
          $sort: { totalSessions: -1 }
        }
      ]);

      return stats.map(stat => ({
        deviceType: stat._id,
        totalSessions: stat.totalSessions,
        activeSessions: stat.activeSessions,
        avgSessionDurationSeconds: Math.round(stat.avgSessionDuration / 1000)
      }));
    } catch (error) {
      throw error;
    }
  }

  // Obtenir les sessions détaillées par utilisateur
  async getUserSessionsDetailed(userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return [];
      }

      const sessions = await UserSession.find({ userId })
        .sort({ lastUsedAt: -1 })
        .lean();

      return sessions.map(session => {
        const now = new Date();
        const sessionDuration = session.lastUsedAt - session.createdAt;
        
        return {
          id: session._id.toString(),
          deviceId: session.deviceId,
          deviceType: session.deviceType,
          deviceInfo: session.deviceInfo,
          ipAddress: session.ipAddress,
          location: session.location,
          createdAt: session.createdAt,
          lastUsedAt: session.lastUsedAt,
          expiresAt: session.expiresAt,
          status: now > session.expiresAt ? 'expired' : 'active',
          sessionDurationSeconds: Math.round(sessionDuration / 1000),
          isActive: session.isActive
        };
      });
    } catch (error) {
      throw error;
    }
  }

  // Helper methods
  extractCountry(location) {
    if (!location) return null;
    return typeof location === 'string' ? location : location.country;
  }

  extractCity(location) {
    if (!location) return null;
    return typeof location === 'object' ? location.city : null;
  }

  // Rate limiting helper (could be moved to separate service)
  async checkRateLimit(identifier, action, windowMs = 15 * 60 * 1000, maxAttempts = 5) {
    try {
      // This is a simple in-memory implementation
      // In production, use Redis or a dedicated rate limiting service
      const key = `${action}:${identifier}`;
      const now = Date.now();
      
      // This is a simplified version - implement proper rate limiting
      return { allowed: true, retryAfter: null };
    } catch (error) {
      return { allowed: true, retryAfter: null };
    }
  }
}

module.exports = new AuthService();