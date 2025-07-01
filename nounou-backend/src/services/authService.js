const UserModel = require('../models/userModel');
const UserService = require('./userService');
const PasswordUtils = require('../utils/passwordUtils');
const TokenUtils = require('../utils/tokenUtils');
const { ERRORS, SUCCESS } = require('../config/constants');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');
const database = require('../config/database');

class AuthService {
  // Connexion utilisateur
  async login(credentials, deviceInfo = {}) {
    try {
      const { email, password, deviceId, deviceType } = credentials;

      // Trouver l'utilisateur avec mot de passe
      const user = await UserService.findByEmailWithPassword(email);
      
      if (!user || !user.is_active) {
        throw new Error(ERRORS.INVALID_CREDENTIALS);
      }

      // Vérifier le mot de passe
      const isPasswordValid = await PasswordUtils.compare(password, user.password_hash);
      
      if (!isPasswordValid) {
        throw new Error(ERRORS.INVALID_CREDENTIALS);
      }

      // Générer les tokens
      const tokenPair = TokenUtils.generateTokenPair(user, { deviceId });

      // Créer la session
      const sessionData = {
        userId: user.id,
        token: TokenUtils.generateSessionToken(),
        refreshToken: tokenPair.refreshToken,
        deviceId: deviceId || uuidv4(),
        deviceType: deviceType || 'mobile',
        ipAddress: deviceInfo.ipAddress,
        location: deviceInfo.location,
        expiresAt: TokenUtils.getTokenExpiration(tokenPair.accessToken)
      };

      await UserModel.createSession(sessionData);

      // Retourner les données de connexion
      return {
        user: UserService.sanitizeUser(user),
        tokens: tokenPair,
        session: {
          deviceId: sessionData.deviceId,
          deviceType: sessionData.deviceType,
          expiresAt: sessionData.expiresAt
        },
        permissions: UserService.getUserPermissions(user)
      };
    } catch (error) {
      throw error;
    }
  }

  // Rafraîchir les tokens
  async refreshTokens(refreshToken, deviceInfo = {}) {
    try {
      // Vérifier le refresh token
      const decoded = TokenUtils.verifyRefreshToken(refreshToken);
      
      // Récupérer l'utilisateur
      const user = await UserService.findById(decoded.userId);
      
      if (!user || !user.is_active) {
        throw new Error(ERRORS.INVALID_TOKEN);
      }

      // Générer de nouveaux tokens
      const tokenPair = TokenUtils.generateTokenPair(user, { deviceId: decoded.deviceId });

      // Mettre à jour la session
      const sessionData = {
        userId: user.id,
        token: TokenUtils.generateSessionToken(),
        refreshToken: tokenPair.refreshToken,
        deviceId: decoded.deviceId,
        deviceType: deviceInfo.deviceType || 'mobile',
        ipAddress: deviceInfo.ipAddress,
        location: deviceInfo.location,
        expiresAt: TokenUtils.getTokenExpiration(tokenPair.accessToken)
      };

      await UserModel.createSession(sessionData);

      return {
        user: UserService.sanitizeUser(user),
        tokens: tokenPair,
        session: {
          deviceId: sessionData.deviceId,
          deviceType: sessionData.deviceType,
          expiresAt: sessionData.expiresAt
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Déconnexion
  async logout(token) {
    try {
      const deletedSession = await UserModel.deleteSession(token);
      
      if (!deletedSession) {
        throw new Error(ERRORS.INVALID_TOKEN);
      }

      return {
        message: SUCCESS.LOGOUT_SUCCESS,
        sessionId: deletedSession.id
      };
    } catch (error) {
      throw error;
    }
  }

  // Déconnexion de tous les appareils
  async logoutAllDevices(userId) {
    try {
      const deletedCount = await UserModel.deleteAllUserSessions(userId);
      
      return {
        message: SUCCESS.LOGOUT_SUCCESS,
        devicesLoggedOut: deletedCount
      };
    } catch (error) {
      throw error;
    }
  }

  // Vérifier un token d'accès
  async verifyAccessToken(token) {
    try {
      const decoded = TokenUtils.verifyAccessToken(token);
      const user = await UserService.findById(decoded.userId);
      
      if (!user || !user.is_active) {
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

      return {
        message: SUCCESS.USER_REGISTERED,
        ...loginResult
      };
    } catch (error) {
      throw error;
    }
  }

  // Obtenir les sessions actives d'un utilisateur (CORRIGÉ)
  async getUserSessions(userId) {
    try {
      const query = `
        SELECT id, device_id, device_type, ip_address, location,
               created_at, last_used_at, expires_at
        FROM ${config.database.schemas.users}.user_sessions
        WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
        ORDER BY last_used_at DESC
      `;

      const result = await database.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Révoquer une session spécifique (CORRIGÉ)
  async revokeSession(userId, sessionId) {
    try {
      const query = `
        DELETE FROM ${config.database.schemas.users}.user_sessions
        WHERE id = $1 AND user_id = $2
        RETURNING id, device_id
      `;

      const result = await database.query(query, [sessionId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Session not found or unauthorized');
      }

      return {
        message: 'Session revoked successfully',
        sessionId: result.rows[0].id,
        deviceId: result.rows[0].device_id
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

      // Générer un token temporaire (vous pouvez l'implémenter selon vos besoins)
      const resetToken = TokenUtils.generateSessionToken();
      
      // TODO: Stocker le token avec expiration et envoyer par email
      
      return { 
        message: 'Password reset link sent to your email',
        // En développement seulement
        ...(process.env.NODE_ENV === 'development' && { resetToken })
      };
    } catch (error) {
      throw error;
    }
  }

  // Obtenir des statistiques de sessions (AJOUTÉ)
  async getSessionStats() {
    try {
      const query = `
        SELECT 
          device_type,
          COUNT(*) as total_sessions,
          COUNT(*) FILTER (WHERE expires_at > CURRENT_TIMESTAMP) as active_sessions,
          AVG(EXTRACT(EPOCH FROM (last_used_at - created_at))) as avg_session_duration
        FROM ${config.database.schemas.users}.user_sessions
        GROUP BY device_type
        ORDER BY total_sessions DESC
      `;

      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Obtenir les sessions par utilisateur (AJOUTÉ)
  async getUserSessionsDetailed(userId) {
    try {
      const query = `
        SELECT 
          s.id,
          s.device_id,
          s.device_type,
          s.ip_address,
          s.location,
          s.created_at,
          s.last_used_at,
          s.expires_at,
          CASE 
            WHEN s.expires_at > CURRENT_TIMESTAMP THEN 'active'
            ELSE 'expired'
          END as status,
          EXTRACT(EPOCH FROM (s.last_used_at - s.created_at)) as session_duration_seconds
        FROM ${config.database.schemas.users}.user_sessions s
        WHERE s.user_id = $1
        ORDER BY s.last_used_at DESC
      `;

      const result = await database.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService();