const UserModel = require('../models/userModel');
const PasswordUtils = require('../utils/passwordUtils');
const { ERRORS, SUCCESS } = require('../config/constants');

class UserService {
  // Créer un nouvel utilisateur
  async createUser(userData) {
    try {
      // Vérifier si l'email existe déjà
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        throw new Error(ERRORS.EMAIL_ALREADY_EXISTS);
      }

      // Hacher le mot de passe
      const passwordHash = await PasswordUtils.hash(userData.password);

      // Préparer les données utilisateur
      const userToCreate = {
        ...userData,
        password_hash: passwordHash
      };

      // Créer l'utilisateur
      const newUser = await UserModel.create(userToCreate);
      
      // Retourner sans le mot de passe
      return this.sanitizeUser(newUser);
    } catch (error) {
      throw error;
    }
  }

  // Trouver utilisateur par ID
  async findById(id) {
    try {
      const user = await UserModel.findById(id);
      return user ? this.sanitizeUser(user) : null;
    } catch (error) {
      throw error;
    }
  }

  // Trouver utilisateur par email
  async findByEmail(email) {
    try {
      const user = await UserModel.findByEmail(email);
      return user ? this.sanitizeUser(user) : null;
    } catch (error) {
      throw error;
    }
  }

  // Trouver utilisateur avec mot de passe (pour authentification)
  async findByEmailWithPassword(email) {
    try {
      return await UserModel.findByEmail(email);
    } catch (error) {
      throw error;
    }
  }

  // Mettre à jour le profil utilisateur
  async updateProfile(id, updateData) {
    try {
      const updatedUser = await UserModel.update(id, updateData);
      
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
      // Récupérer l'utilisateur avec mot de passe
      const user = await UserModel.findById(id);
      if (!user) {
        throw new Error(ERRORS.USER_NOT_FOUND);
      }

      const userWithPassword = await UserModel.findByEmail(user.email);

      // Vérifier l'ancien mot de passe
      const isCurrentPasswordValid = await PasswordUtils.compare(
        currentPassword, 
        userWithPassword.password_hash
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

  // Désactiver un utilisateur
  async deactivateUser(id) {
    try {
      const deactivatedUser = await UserModel.deactivate(id);
      
      if (!deactivatedUser) {
        throw new Error(ERRORS.USER_NOT_FOUND);
      }

      // Supprimer toutes les sessions de l'utilisateur
      await UserModel.deleteAllUserSessions(id);

      return this.sanitizeUser(deactivatedUser);
    } catch (error) {
      throw error;
    }
  }

  // Obtenir les statistiques utilisateur
  async getUserStats() {
    try {
      const [activeUsersCount, subscriptionStats] = await Promise.all([
        UserModel.countActiveUsers(),
        UserModel.getSubscriptionStats()
      ]);

      return {
        activeUsers: activeUsersCount,
        subscriptionBreakdown: subscriptionStats
      };
    } catch (error) {
      throw error;
    }
  }

  // Calculer l'âge à partir de la date de naissance
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

  // Calculer l'IMC
  calculateBMI(weight, height) {
    if (!weight || !height) return null;
    
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    
    return Math.round(bmi * 10) / 10; // Arrondir à 1 décimale
  }

  // Nettoyer les données utilisateur (supprimer les infos sensibles)
  sanitizeUser(user) {
    if (!user) return null;

    const sanitized = { ...user };
    delete sanitized.password_hash;

    // Ajouter des données calculées
    if (sanitized.date_of_birth) {
      sanitized.age = this.calculateAge(sanitized.date_of_birth);
    }

    if (sanitized.weight && sanitized.height) {
      sanitized.bmi = this.calculateBMI(sanitized.weight, sanitized.height);
    }

    // Parser les champs JSON
    if (typeof sanitized.dietary_preferences === 'string') {
      sanitized.dietary_preferences = JSON.parse(sanitized.dietary_preferences);
    }
    if (typeof sanitized.allergies === 'string') {
      sanitized.allergies = JSON.parse(sanitized.allergies);
    }
    if (typeof sanitized.health_conditions === 'string') {
      sanitized.health_conditions = JSON.parse(sanitized.health_conditions);
    }

    return sanitized;
  }

  // Vérifier si l'abonnement est actif
  isSubscriptionActive(user) {
    if (user.subscription_type === 'free') return true;
    
    if (!user.subscription_expires_at) return false;
    
    return new Date(user.subscription_expires_at) > new Date();
  }

  // Obtenir les permissions utilisateur basées sur l'abonnement
  getUserPermissions(user) {
    const permissions = {
      basicFeatures: true,
      premiumFeatures: false,
      proFeatures: false,
      aiChat: false,
      imageAnalysis: false,
      advancedAnalytics: false
    };

    if (!this.isSubscriptionActive(user)) {
      return permissions;
    }

    switch (user.subscription_type) {
      case 'pro':
        permissions.proFeatures = true;
        permissions.advancedAnalytics = true;
        // fall through
      case 'premium':
        permissions.premiumFeatures = true;
        permissions.aiChat = true;
        permissions.imageAnalysis = true;
        break;
    }

    return permissions;
  }
}

module.exports = new UserService();