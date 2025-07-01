const UserService = require('../services/userService');
const AuthService = require('../services/authService');
const ApiResponse = require('../utils/responses');
const { SUCCESS, ERRORS } = require('../config/constants');

class UserController {
  // Inscription
  async register(req, res, next) {
    try {
      const userData = req.validatedData;
      const deviceInfo = {
        ipAddress: req.ip,
        location: req.get('CF-IPCountry') || req.get('X-Forwarded-For') || 'Unknown',
        deviceId: userData.deviceId,
        deviceType: userData.deviceType || 'mobile'
      };

      const result = await AuthService.register(userData, deviceInfo);
      
      return ApiResponse.success(res, result, SUCCESS.USER_REGISTERED, 201);
    } catch (error) {
      next(error);
    }
  }

  // Connexion
  async login(req, res, next) {
    try {
      const credentials = req.validatedData;
      const deviceInfo = {
        ipAddress: req.ip,
        location: req.get('CF-IPCountry') || req.get('X-Forwarded-For') || 'Unknown'
      };

      const result = await AuthService.login(credentials, deviceInfo);
      
      return ApiResponse.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  // Rafraîchir les tokens
  async refreshToken(req, res, next) {
    try {
      const result = req.tokenPair; // Vient du middleware
      
      return ApiResponse.success(res, {
        tokens: result,
        user: UserService.sanitizeUser(req.user)
      }, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      // Récupérer le token depuis les headers
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ApiResponse.unauthorizedError(res, 'Access token required');
      }
  
      const token = authHeader.substring(7); // Remove 'Bearer '
      
      if (!token) {
        return ApiResponse.unauthorizedError(res, 'Access token required');
      }
  
      // Décoder le token pour obtenir l'userId
      const TokenUtils = require('../utils/tokenUtils');
      let decoded;
      
      try {
        decoded = TokenUtils.verifyAccessToken(token);
      } catch (tokenError) {
        // Token invalide mais on peut quand même essayer de le supprimer
        console.log('Token verification failed during logout:', tokenError.message);
        return ApiResponse.success(res, { message: 'Logged out successfully' });
      }
  
      // Supprimer toutes les sessions de cet utilisateur qui contiennent ce token
      // (car nous stockons le session token, pas le JWT access token)
      const UserModel = require('../models/userModel');
      
      // Alternative: supprimer par user_id au lieu du token
      if (decoded && decoded.userId) {
        await UserModel.deleteAllUserSessions(decoded.userId);
        return ApiResponse.success(res, { 
          message: 'Logged out successfully',
          userId: decoded.userId
        });
      } else {
        return ApiResponse.success(res, { message: 'Logged out successfully' });
      }
  
    } catch (error) {
      console.error('Logout error:', error);
      // Même en cas d'erreur, on peut retourner un succès pour le logout
      return ApiResponse.success(res, { message: 'Logged out successfully' });
    }
  }

  // Déconnexion de tous les appareils
  async logoutAllDevices(req, res, next) {
    try {
      const result = await AuthService.logoutAllDevices(req.user.id);
      
      return ApiResponse.success(res, result, 'Logged out from all devices');
    } catch (error) {
      next(error);
    }
  }

  // Obtenir le profil utilisateur
  async getProfile(req, res, next) {
    try {
      const user = await UserService.findById(req.user.id);
      
      if (!user) {
        return ApiResponse.notFoundError(res, ERRORS.USER_NOT_FOUND);
      }

      const permissions = UserService.getUserPermissions(user);
      
      return ApiResponse.success(res, {
        user,
        permissions,
        subscription: {
          type: user.subscription_type,
          isActive: UserService.isSubscriptionActive(user),
          expiresAt: user.subscription_expires_at
        }
      }, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Mettre à jour le profil utilisateur
  async updateProfile(req, res, next) {
    try {
      const updateData = req.validatedData;
      
      const updatedUser = await UserService.updateProfile(req.user.id, updateData);
      
      return ApiResponse.success(res, {
        user: updatedUser
      }, SUCCESS.USER_UPDATED);
    } catch (error) {
      next(error);
    }
  }

  // Changer le mot de passe
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.validatedData;
      
      await UserService.changePassword(req.user.id, currentPassword, newPassword);
      
      return ApiResponse.success(res, null, SUCCESS.PASSWORD_CHANGED);
    } catch (error) {
      next(error);
    }
  }

  // Supprimer le compte (désactivation)
  async deleteAccount(req, res, next) {
    try {
      await UserService.deactivateUser(req.user.id);
      
      return ApiResponse.success(res, null, 'Account deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les sessions actives
  async getSessions(req, res, next) {
    try {
      const sessions = await AuthService.getUserSessions(req.user.id);
      
      return ApiResponse.success(res, {
        sessions,
        totalSessions: sessions.length
      }, 'Sessions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Révoquer une session
  async revokeSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      
      const result = await AuthService.revokeSession(req.user.id, sessionId);
      
      return ApiResponse.success(res, result, 'Session revoked successfully');
    } catch (error) {
      next(error);
    }
  }

  // Vérifier le token (pour validation côté mobile)
  async verifyToken(req, res, next) {
    try {
      const user = await UserService.findById(req.user.id);
      const permissions = UserService.getUserPermissions(user);
      
      return ApiResponse.success(res, {
        valid: true,
        user: UserService.sanitizeUser(user),
        permissions,
        tokenInfo: {
          userId: req.user.id,
          deviceId: req.user.deviceId,
          subscriptionType: req.user.subscriptionType
        }
      }, 'Token is valid');
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les statistiques utilisateur (admin)
  async getUserStats(req, res, next) {
    try {
      // Cette route pourrait être protégée par un middleware admin
      const stats = await UserService.getUserStats();
      
      return ApiResponse.success(res, stats, 'User statistics retrieved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();