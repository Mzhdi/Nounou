const { UserModel, User, UserSession, UserGoal, ActivityLog } = require('../models/userModel');
const PasswordUtils = require('../utils/passwordUtils');
const { ERRORS, SUCCESS } = require('../config/constants');
const mongoose = require('mongoose');

class UserService {
  // Créer un nouvel utilisateur
  async createUser(userData) {
    try {
      // Vérifier si l'email existe déjà
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        throw new Error(ERRORS.EMAIL_ALREADY_EXISTS);
      }

      // Hacher le mot de passe
      const passwordHash = await PasswordUtils.hash(userData.password);

      // Préparer les données utilisateur
      const userToCreate = {
        ...userData,
        password_hash: passwordHash,
        // Convert camelCase to MongoDB field names
        firstName: userData.firstName || userData.first_name,
        lastName: userData.lastName || userData.last_name,
        dateOfBirth: userData.dateOfBirth || userData.date_of_birth,
        activityLevel: userData.activityLevel || userData.activity_level,
        dietaryPreferences: userData.dietaryPreferences || userData.dietary_preferences || [],
        healthConditions: userData.healthConditions || userData.health_conditions || [],
        subscriptionType: userData.subscriptionType || userData.subscription_type || 'free'
      };

      // Créer l'utilisateur avec Mongoose
      const newUser = await UserModel.create(userToCreate);
      
      // Retourner sans le mot de passe
      return this.sanitizeUser(newUser);
    } catch (error) {
      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        throw new Error(ERRORS.EMAIL_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  // Trouver utilisateur par ID
  async findById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }

      const user = await UserModel.findById(id);
      return user ? this.sanitizeUser(user) : null;
    } catch (error) {
      throw error;
    }
  }

  // Trouver utilisateur par email
  async findByEmail(email) {
    try {
      const user = await User.findOne({ 
        email: email.toLowerCase(), 
        isActive: true 
      });
      return user ? this.sanitizeUser(user) : null;
    } catch (error) {
      throw error;
    }
  }

  // Trouver utilisateur avec mot de passe (pour authentification)
  async findByEmailWithPassword(email) {
    try {
      return await User.findByEmail(email);
    } catch (error) {
      throw error;
    }
  }

  // Mettre à jour le profil utilisateur
  async updateProfile(id, updateData) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(ERRORS.USER_NOT_FOUND);
      }

      // Convert field names if necessary
      const mongoUpdateData = {
        ...updateData,
        firstName: updateData.firstName || updateData.first_name,
        lastName: updateData.lastName || updateData.last_name,
        dateOfBirth: updateData.dateOfBirth || updateData.date_of_birth,
        activityLevel: updateData.activityLevel || updateData.activity_level,
        dietaryPreferences: updateData.dietaryPreferences || updateData.dietary_preferences,
        healthConditions: updateData.healthConditions || updateData.health_conditions,
        subscriptionType: updateData.subscriptionType || updateData.subscription_type
      };

      // Remove undefined values
      Object.keys(mongoUpdateData).forEach(key => 
        mongoUpdateData[key] === undefined && delete mongoUpdateData[key]
      );

      const updatedUser = await UserModel.update(id, mongoUpdateData);
      
      if (!updatedUser) {
        throw new Error(ERRORS.USER_NOT_FOUND);
      }

      return this.sanitizeUser(updatedUser);
    } catch (error) {
      throw error;
    }
  }

  // Changer le mot de passe
  async changePassword(id, currentPassword, newPassword) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(ERRORS.USER_NOT_FOUND);
      }

      // Récupérer l'utilisateur avec mot de passe
      const user = await User.findById(id).select('+password_hash');
      if (!user || !user.isActive) {
        throw new Error(ERRORS.USER_NOT_FOUND);
      }

      // Vérifier l'ancien mot de passe
      const isCurrentPasswordValid = await PasswordUtils.compare(
        currentPassword, 
        user.password_hash
      );

      if (!isCurrentPasswordValid) {
        throw new Error(ERRORS.INVALID_CREDENTIALS);
      }

      // Hacher le nouveau mot de passe
      const newPasswordHash = await PasswordUtils.hash(newPassword);

      // Mettre à jour le mot de passe
      const updatedUser = await UserModel.updatePassword(id, newPasswordHash);
      
      if (!updatedUser) {
        throw new Error(ERRORS.USER_NOT_FOUND);
      }

      return this.sanitizeUser(updatedUser);
    } catch (error) {
      throw error;
    }
  }

  // Vérifier le mot de passe
  async verifyPassword(id, password) {
    try {
      const user = await User.findById(id).select('+password_hash');
      if (!user || !user.isActive) {
        throw new Error(ERRORS.USER_NOT_FOUND);
      }

      const isValid = await PasswordUtils.compare(password, user.password_hash);
      if (!isValid) {
        throw new Error(ERRORS.INVALID_CREDENTIALS);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Désactiver un utilisateur
  async deactivateUser(id, reason = 'user_request') {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(ERRORS.USER_NOT_FOUND);
      }

      const deactivatedUser = await UserModel.deactivate(id);
      
      if (!deactivatedUser) {
        throw new Error(ERRORS.USER_NOT_FOUND);
      }

      // Supprimer toutes les sessions de l'utilisateur
      await UserModel.deleteAllUserSessions(id);

      // Log the deactivation
      await this.logActivity(id, {
        action: 'account_deactivated',
        reason,
        timestamp: new Date()
      });

      return this.sanitizeUser(deactivatedUser);
    } catch (error) {
      throw error;
    }
  }

  // Update last active timestamp
  async updateLastActive(id) {
    try {
      return await UserModel.updateLastActive(id);
    } catch (error) {
      console.error('Error updating last active:', error);
      // Don't throw error as this is non-critical
    }
  }

  // Downgrade user to free tier
  async downgradeToFree(id) {
    try {
      return await User.findByIdAndUpdate(
        id,
        { 
          subscriptionType: 'free',
          subscriptionExpiresAt: null
        },
        { new: true }
      );
    } catch (error) {
      throw error;
    }
  }

  // Session management
  async validateSession(userId, sessionId) {
    try {
      return await UserModel.validateSession(userId, sessionId);
    } catch (error) {
      return false;
    }
  }

  async updateSessionActivity(sessionId, updateData) {
    try {
      return await UserModel.updateSessionActivity(sessionId, updateData);
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  async validateRefreshToken(userId, refreshToken) {
    try {
      return await UserModel.validateRefreshToken(userId, refreshToken);
    } catch (error) {
      return false;
    }
  }

  async updateSessionTokens(sessionId, tokenPair) {
    try {
      return await UserModel.updateSessionTokens(sessionId, tokenPair);
    } catch (error) {
      throw error;
    }
  }

  // User settings management
  async getUserSettings(userId) {
    try {
      const user = await User.findById(userId).select('settings');
      return user ? user.settings : {};
    } catch (error) {
      throw error;
    }
  }

  async updateUserSettings(userId, settingsData) {
    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          $set: {
            'settings.notifications': settingsData.notifications,
            'settings.privacy': settingsData.privacy,
            'settings.units': settingsData.units,
            'settings.language': settingsData.language,
            'settings.timezone': settingsData.timezone
          }
        },
        { new: true, runValidators: true }
      );

      return updatedUser ? updatedUser.settings : null;
    } catch (error) {
      throw error;
    }
  }

  // Goals management
  async getUserGoals(userId) {
    try {
      return await UserModel.getUserGoals(userId);
    } catch (error) {
      throw error;
    }
  }

  async upsertUserGoal(userId, goalData) {
    try {
      const existingGoal = await UserGoal.findOne({
        userId,
        goalType: goalData.goalType,
        isActive: true
      });

      if (existingGoal) {
        // Update existing goal
        Object.assign(existingGoal, goalData);
        const updated = await existingGoal.save();
        return { data: updated, isNew: false };
      } else {
        // Create new goal
        const newGoal = await UserModel.createGoal({ userId, ...goalData });
        return { data: newGoal, isNew: true };
      }
    } catch (error) {
      throw error;
    }
  }

  async deleteUserGoal(userId, goalId) {
    try {
      return await UserModel.deleteGoal(goalId);
    } catch (error) {
      throw error;
    }
  }

  // Activity logging
  async logActivity(userId, activityData) {
    try {
      return await UserModel.logActivity(userId, activityData);
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw error for logging failures
    }
  }

  async getUserActivity(userId, options = {}) {
    try {
      return await UserModel.getUserActivity(userId, options);
    } catch (error) {
      throw error;
    }
  }

  // Profile history
  async getProfileHistory(userId, options = {}) {
    try {
      return await this.getUserActivity(userId, {
        ...options,
        action: 'profile_updated'
      });
    } catch (error) {
      throw error;
    }
  }

  // Data export (GDPR)
  async exportUserData(userId, format = 'json') {
    try {
      const user = await User.findById(userId);
      const goals = await UserGoal.find({ userId });
      const activities = await ActivityLog.find({ userId }).limit(1000).sort({ timestamp: -1 });
      const sessions = await UserSession.find({ userId }).sort({ createdAt: -1 });

      const exportData = {
        profile: this.sanitizeUser(user),
        goals,
        recentActivities: activities,
        sessions: sessions.map(s => ({
          deviceType: s.deviceType,
          createdAt: s.createdAt,
          lastUsedAt: s.lastUsedAt,
          location: s.location
        })),
        exportedAt: new Date().toISOString()
      };

      if (format === 'json') {
        return exportData;
      }

      // For other formats, you could implement CSV/XML conversion here
      return exportData;
    } catch (error) {
      throw error;
    }
  }

  // Data deletion request (GDPR)
  async requestDataDeletion(userId, requestData) {
    try {
      // Create deletion request record
      const deletionRequest = {
        userId,
        ...requestData,
        status: 'pending',
        scheduledDeletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };

      // Log the request
      await this.logActivity(userId, {
        action: 'data_deletion_requested',
        metadata: { reason: requestData.reason }
      });

      // In a real implementation, you'd store this in a separate collection
      // and have a scheduled job to process deletions
      
      return deletionRequest;
    } catch (error) {
      throw error;
    }
  }

  // Subscription management
  async getSubscriptionInfo(user) {
    const isActive = this.isSubscriptionActive(user);
    
    return {
      type: user.subscriptionType,
      isActive,
      expiresAt: user.subscriptionExpiresAt,
      daysRemaining: isActive && user.subscriptionExpiresAt 
        ? Math.ceil((user.subscriptionExpiresAt - new Date()) / (1000 * 60 * 60 * 24))
        : null,
      features: this.getUserPermissions(user)
    };
  }

  // Statistics
  async getUserStats() {
    try {
      const [activeUsersCount, subscriptionStats, retentionStats] = await Promise.all([
        UserModel.countActiveUsers(),
        UserModel.getSubscriptionStats(),
        UserModel.getUserRetentionStats()
      ]);

      return {
        activeUsers: activeUsersCount,
        subscriptionBreakdown: subscriptionStats,
        retention: retentionStats
      };
    } catch (error) {
      throw error;
    }
  }

  async searchUsers(options = {}) {
    try {
      return await UserModel.searchUsers(options);
    } catch (error) {
      throw error;
    }
  }

  async updateUserStatus(userId, status, reason) {
    try {
      const updateData = { isActive: status === 'active' };
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true }
      );

      if (updatedUser) {
        await this.logActivity(userId, {
          action: 'status_updated',
          metadata: { status, reason, updatedBy: 'admin' }
        });
      }

      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  // Helper methods
  calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  calculateBMI(weight, height) {
    if (!weight || !height) return null;
    
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    
    return Math.round(bmi * 10) / 10; // Arrondir à 1 décimale
  }

  calculateProfileCompletion(user) {
    if (!user) return 0;
    
    const requiredFields = ['firstName', 'lastName', 'email', 'dateOfBirth', 'gender', 'height', 'weight', 'activityLevel'];
    const optionalFields = ['phone', 'dietaryPreferences', 'healthConditions'];
    
    let completion = 0;
    const fieldWeight = 100 / (requiredFields.length + optionalFields.length * 0.5);
    
    requiredFields.forEach(field => {
      if (user[field]) completion += fieldWeight;
    });
    
    optionalFields.forEach(field => {
      if (user[field] && (Array.isArray(user[field]) ? user[field].length > 0 : true)) {
        completion += fieldWeight * 0.5;
      }
    });
    
    return Math.round(completion);
  }

  // Nettoyer les données utilisateur (supprimer les infos sensibles)
  sanitizeUser(user) {
    if (!user) return null;

    // Convert MongoDB document to plain object
    const sanitized = user.toObject ? user.toObject() : { ...user };
    
    // Remove sensitive data
    delete sanitized.password_hash;
    delete sanitized.__v;

    // Add calculated fields
    if (sanitized.dateOfBirth) {
      sanitized.age = this.calculateAge(sanitized.dateOfBirth);
    }

    if (sanitized.weight && sanitized.height) {
      sanitized.bmi = this.calculateBMI(sanitized.weight, sanitized.height);
    }

    // Add profile completion
    sanitized.profileCompletion = this.calculateProfileCompletion(sanitized);

    // Ensure arrays are properly formatted
    sanitized.dietaryPreferences = sanitized.dietaryPreferences || [];
    sanitized.allergies = sanitized.allergies || [];
    sanitized.healthConditions = sanitized.healthConditions || [];

    return sanitized;
  }

  // Vérifier si l'abonnement est actif
  isSubscriptionActive(user) {
    if (user.subscriptionType === 'free') return true;
    
    if (!user.subscriptionExpiresAt) return false;
    
    return new Date(user.subscriptionExpiresAt) > new Date();
  }

  // Obtenir les permissions utilisateur basées sur l'abonnement
  getUserPermissions(user) {
    const permissions = {
      basicFeatures: true,
      premiumFeatures: false,
      proFeatures: false,
      aiChat: false,
      imageAnalysis: false,
      advancedAnalytics: false,
      bulkOperations: false,
      customReports: false,
      apiAccess: false,
      prioritySupport: false
    };

    if (!this.isSubscriptionActive(user)) {
      return permissions;
    }

    switch (user.subscriptionType) {
      case 'pro':
        permissions.proFeatures = true;
        permissions.advancedAnalytics = true;
        permissions.customReports = true;
        permissions.apiAccess = true;
        permissions.prioritySupport = true;
        // fall through
      case 'premium':
        permissions.premiumFeatures = true;
        permissions.aiChat = true;
        permissions.imageAnalysis = true;
        permissions.bulkOperations = true;
        break;
    }

    return permissions;
  }
}

module.exports = new UserService();