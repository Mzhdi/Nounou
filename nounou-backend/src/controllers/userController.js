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
        deviceType: userData.deviceType || 'mobile',
        userAgent: req.get('User-Agent') || 'Unknown'
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
        location: req.get('CF-IPCountry') || req.get('X-Forwarded-For') || 'Unknown',
        deviceId: credentials.deviceId,
        deviceType: credentials.deviceType || 'mobile',
        userAgent: req.get('User-Agent') || 'Unknown'
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

  // ADDED: Forgot password method
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.validatedData;
      
      const result = await AuthService.requestPasswordReset(email);
      
      return ApiResponse.success(res, {
        message: 'If this email exists in our system, you will receive a password reset link.',
        tokenSent: result.tokenSent,
        expiresAt: result.expiresAt
      }, 'Password reset requested successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Reset password method
  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.validatedData;
      
      const result = await AuthService.resetPassword(token, newPassword);
      
      return ApiResponse.success(res, {
        message: 'Password reset successfully',
        userId: result.userId
      }, 'Password reset successfully');
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
      if (decoded && decoded.userId) {
        await AuthService.logoutUser(decoded.userId, decoded.sessionId);
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
      const subscriptionInfo = UserService.getSubscriptionInfo(user);
      
      return ApiResponse.success(res, {
        user: UserService.sanitizeUser(user),
        permissions,
        subscription: subscriptionInfo,
        stats: {
          profileCompletion: UserService.calculateProfileCompletion(user),
          memberSince: user.createdAt,
          lastActive: user.lastActiveAt
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
        user: UserService.sanitizeUser(updatedUser),
        profileCompletion: UserService.calculateProfileCompletion(updatedUser)
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
      
      // Optionnel: déconnecter de tous les autres appareils après changement de mot de passe
      if (req.body.logoutOtherDevices) {
        await AuthService.logoutAllDevicesExcept(req.user.id, req.user.sessionId);
      }
      
      return ApiResponse.success(res, null, SUCCESS.PASSWORD_CHANGED);
    } catch (error) {
      next(error);
    }
  }

  // Supprimer le compte (désactivation)
  async deleteAccount(req, res, next) {
    try {
      const { password, reason } = req.validatedData;
      
      // Vérifier le mot de passe avant suppression
      await UserService.verifyPassword(req.user.id, password);
      
      // Désactiver le compte avec raison
      await UserService.deactivateUser(req.user.id, reason);
      
      // Déconnecter de tous les appareils
      await AuthService.logoutAllDevices(req.user.id);
      
      return ApiResponse.success(res, {
        message: 'Account deactivated successfully',
        deactivatedAt: new Date().toISOString()
      }, 'Account deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les sessions actives
  async getSessions(req, res, next) {
    try {
      const sessions = await AuthService.getUserSessions(req.user.id);
      const currentSessionId = req.user.sessionId;
      
      // Marquer la session actuelle
      const sessionsWithCurrent = sessions.map(session => ({
        ...session,
        isCurrent: session._id.toString() === currentSessionId
      }));
      
      return ApiResponse.success(res, {
        sessions: sessionsWithCurrent,
        totalSessions: sessions.length,
        currentSessionId
      }, 'Sessions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Révoquer une session
  async revokeSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      
      // Empêcher la suppression de la session actuelle via cette route
      if (sessionId === req.user.sessionId) {
        return ApiResponse.badRequestError(res, 'Cannot revoke current session. Use logout instead.');
      }
      
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
      const subscriptionInfo = UserService.getSubscriptionInfo(user);
      
      return ApiResponse.success(res, {
        valid: true,
        user: UserService.sanitizeUser(user),
        permissions,
        subscription: subscriptionInfo,
        tokenInfo: {
          userId: req.user.id,
          deviceId: req.user.deviceId,
          sessionId: req.user.sessionId,
          subscriptionType: req.user.subscriptionType,
          issuedAt: req.user.iat,
          expiresAt: req.user.exp
        }
      }, 'Token is valid');
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les paramètres utilisateur
  async getSettings(req, res, next) {
    try {
      const settings = await UserService.getUserSettings(req.user.id);
      
      return ApiResponse.success(res, {
        settings,
        lastUpdated: settings.updatedAt
      }, 'User settings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Mettre à jour les paramètres utilisateur
  async updateSettings(req, res, next) {
    try {
      const settingsData = req.validatedData;
      
      const updatedSettings = await UserService.updateUserSettings(req.user.id, settingsData);
      
      return ApiResponse.success(res, {
        settings: updatedSettings
      }, 'User settings updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les objectifs utilisateur
  async getGoals(req, res, next) {
    try {
      const goals = await UserService.getUserGoals(req.user.id);
      
      return ApiResponse.success(res, {
        goals,
        goalsCount: goals.length,
        activeGoals: goals.filter(goal => goal.isActive)
      }, 'User goals retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Créer ou mettre à jour un objectif
  async upsertGoal(req, res, next) {
    try {
      const goalData = req.validatedData;
      
      const goal = await UserService.upsertUserGoal(req.user.id, goalData);
      
      const statusCode = goal.isNew ? 201 : 200;
      const message = goal.isNew ? 'Goal created successfully' : 'Goal updated successfully';
      
      return ApiResponse.success(res, {
        goal: goal.data
      }, message, statusCode);
    } catch (error) {
      next(error);
    }
  }

  // Supprimer un objectif
  async deleteGoal(req, res, next) {
    try {
      const { goalId } = req.params;
      
      await UserService.deleteUserGoal(req.user.id, goalId);
      
      return ApiResponse.success(res, null, 'Goal deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // Obtenir l'historique des modifications de profil
  async getProfileHistory(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      
      const history = await UserService.getProfileHistory(req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      return ApiResponse.success(res, history, 'Profile history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Exporter les données utilisateur (GDPR)
  async exportUserData(req, res, next) {
    try {
      const { format = 'json' } = req.query;
      
      const userData = await UserService.exportUserData(req.user.id, format);
      
      if (format === 'json') {
        return ApiResponse.success(res, userData, 'User data exported successfully');
      } else {
        // Pour d'autres formats (CSV, etc.), définir les headers appropriés
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="user_data_${req.user.id}.${format}"`);
        return res.send(userData);
      }
    } catch (error) {
      next(error);
    }
  }

  // Demander la suppression définitive des données (GDPR)
  async requestDataDeletion(req, res, next) {
    try {
      const { reason, confirmEmail } = req.validatedData;
      
      const deletionRequest = await UserService.requestDataDeletion(req.user.id, {
        reason,
        confirmEmail,
        requestedAt: new Date(),
        ipAddress: req.ip
      });
      
      return ApiResponse.success(res, {
        requestId: deletionRequest._id,
        scheduledDeletion: deletionRequest.scheduledDeletion,
        message: 'Data deletion request submitted. You will receive a confirmation email.'
      }, 'Data deletion request submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  // ====== SUBSCRIPTION MANAGEMENT ======

  // ADDED: Get subscription info
  async getSubscriptionInfo(req, res, next) {
    try {
      const subscriptionInfo = await UserService.getDetailedSubscriptionInfo(req.user.id);
      
      return ApiResponse.success(res, {
        subscription: subscriptionInfo,
        features: UserService.getSubscriptionFeatures(subscriptionInfo.type),
        usage: await UserService.getSubscriptionUsage(req.user.id)
      }, 'Subscription info retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Upgrade subscription
  async upgradeSubscription(req, res, next) {
    try {
      const { planType, paymentMethod } = req.validatedData;
      
      const result = await UserService.upgradeSubscription(req.user.id, planType, paymentMethod);
      
      return ApiResponse.success(res, {
        subscription: result.subscription,
        invoice: result.invoice,
        effectiveDate: result.effectiveDate
      }, 'Subscription upgraded successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Cancel subscription
  async cancelSubscription(req, res, next) {
    try {
      const { reason } = req.body;
      
      const result = await UserService.cancelSubscription(req.user.id, reason);
      
      return ApiResponse.success(res, {
        subscription: result.subscription,
        cancellationDate: result.cancellationDate,
        accessUntil: result.accessUntil
      }, 'Subscription cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  // ====== PREMIUM FEATURES ======

  // ADDED: Get personalized insights (Premium)
  async getPersonalizedInsights(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const insights = await UserService.getPersonalizedInsights(req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      return ApiResponse.success(res, {
        insights: insights.data,
        pagination: insights.pagination,
        lastUpdated: insights.lastUpdated
      }, 'Personalized insights retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Get advanced analytics (Pro)
  async getAdvancedAnalytics(req, res, next) {
    try {
      const { dateFrom, dateTo } = req.validatedQuery;
      
      const analytics = await UserService.getAdvancedAnalytics(req.user.id, {
        dateFrom,
        dateTo
      });
      
      return ApiResponse.success(res, {
        analytics,
        generatedAt: new Date(),
        period: { from: dateFrom, to: dateTo }
      }, 'Advanced analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Get AI coach recommendations (Premium/Pro)
  async getAICoachRecommendations(req, res, next) {
    try {
      const { message, context, preferences } = req.validatedData;
      
      const recommendations = await UserService.getAICoachRecommendations(req.user.id, {
        message,
        context,
        preferences
      });
      
      return ApiResponse.success(res, {
        recommendations,
        sessionId: recommendations.sessionId,
        timestamp: new Date()
      }, 'AI coach recommendations generated successfully');
    } catch (error) {
      next(error);
    }
  }

  // ====== SOCIAL FEATURES ======

  // ADDED: Get public profile
  async getPublicProfile(req, res, next) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id; // Optional auth
      
      const profile = await UserService.getPublicProfile(userId, currentUserId);
      
      return ApiResponse.success(res, {
        profile,
        isFollowing: profile.isFollowing,
        mutualFollowers: profile.mutualFollowers
      }, 'Public profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Follow user
  async followUser(req, res, next) {
    try {
      const { userId } = req.params;
      
      if (userId === req.user.id) {
        return ApiResponse.badRequestError(res, 'You cannot follow yourself');
      }
      
      const result = await UserService.followUser(req.user.id, userId);
      
      return ApiResponse.success(res, {
        following: result.following,
        followedAt: result.followedAt
      }, 'User followed successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Unfollow user
  async unfollowUser(req, res, next) {
    try {
      const { userId } = req.params;
      
      const result = await UserService.unfollowUser(req.user.id, userId);
      
      return ApiResponse.success(res, {
        unfollowed: result.unfollowed,
        unfollowedAt: result.unfollowedAt
      }, 'User unfollowed successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Get followers
  async getFollowers(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.validatedQuery;
      
      const followers = await UserService.getFollowers(req.user.id, {
        page,
        limit
      });
      
      return ApiResponse.success(res, {
        followers: followers.data,
        pagination: followers.pagination,
        totalFollowers: followers.total
      }, 'Followers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Get following
  async getFollowing(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.validatedQuery;
      
      const following = await UserService.getFollowing(req.user.id, {
        page,
        limit
      });
      
      return ApiResponse.success(res, {
        following: following.data,
        pagination: following.pagination,
        totalFollowing: following.total
      }, 'Following retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Get available features
  async getAvailableFeatures(req, res, next) {
    try {
      const features = await UserService.getAvailableFeatures(req.user.id);
      
      return ApiResponse.success(res, {
        features,
        subscriptionType: req.user.subscriptionType,
        featureUsage: await UserService.getFeatureUsage(req.user.id)
      }, 'Available features retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ====== ADMIN ENDPOINTS ======

  // Obtenir les statistiques utilisateur (admin uniquement)
  async getUserStats(req, res, next) {
    try {
      // Cette route devrait être protégée par un middleware admin
      const stats = await UserService.getUserStats();
      
      return ApiResponse.success(res, stats, 'User statistics retrieved');
    } catch (error) {
      next(error);
    }
  }

  // Rechercher des utilisateurs (admin uniquement)
  async searchUsers(req, res, next) {
    try {
      const { q, page = 1, limit = 20, status, subscriptionType } = req.query;
      
      const users = await UserService.searchUsers({
        query: q,
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        subscriptionType
      });
      
      return ApiResponse.success(res, users, 'Users search completed');
    } catch (error) {
      next(error);
    }
  }

  // Mettre à jour le statut d'un utilisateur (admin uniquement)
  async updateUserStatus(req, res, next) {
    try {
      const { userId } = req.params;
      const { status, reason } = req.validatedData;
      
      const updatedUser = await UserService.updateUserStatus(userId, status, reason);
      
      return ApiResponse.success(res, {
        user: UserService.sanitizeUser(updatedUser)
      }, 'User status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Impersonate user (Super Admin only)
  async impersonateUser(req, res, next) {
    try {
      const { userId } = req.params;
      
      if (userId === req.user.id) {
        return ApiResponse.badRequestError(res, 'You cannot impersonate yourself');
      }
      
      const result = await UserService.createImpersonationSession(req.user.id, userId);
      
      return ApiResponse.success(res, {
        impersonationToken: result.token,
        targetUser: UserService.sanitizeUser(result.targetUser),
        expiresAt: result.expiresAt,
        originalAdmin: UserService.sanitizeUser(req.user)
      }, 'Impersonation session created successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Get daily user reports (Admin)
  async getDailyUserReports(req, res, next) {
    try {
      const { dateFrom, dateTo } = req.validatedQuery;
      
      const reports = await UserService.getDailyUserReports({
        dateFrom,
        dateTo
      });
      
      return ApiResponse.success(res, {
        reports,
        period: { from: dateFrom, to: dateTo },
        generatedAt: new Date()
      }, 'Daily user reports retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ADDED: Perform bulk actions (Admin)
  async performBulkActions(req, res, next) {
    try {
      const { action, userIds, data } = req.validatedData;
      
      const result = await UserService.performBulkUserActions({
        action,
        userIds,
        data,
        performedBy: req.user.id
      });
      
      return ApiResponse.success(res, {
        action,
        processedUsers: result.processedUsers,
        successCount: result.successCount,
        failureCount: result.failureCount,
        errors: result.errors,
        executedAt: new Date()
      }, `Bulk action '${action}' completed successfully`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();