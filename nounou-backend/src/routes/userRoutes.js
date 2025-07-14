const express = require('express');
const router = express.Router();

// Middleware
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const rateLimiter = require('../middleware/rateLimiter');

// Controller
const UserController = require('../controllers/userController');

// ========== PUBLIC ROUTES (No Authentication) ==========

router.post('/register', 
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Register a new user'
    #swagger.description = 'Create a new user account with email and password'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $ref: '#/definitions/UserRegistration' }
    }
    #swagger.responses[201] = { 
      description: 'User created successfully',
      schema: { $ref: '#/definitions/AuthResponse' }
    }
    #swagger.responses[400] = { 
      description: 'Invalid input data',
      schema: { $ref: '#/definitions/Error' }
    }
    #swagger.responses[409] = { 
      description: 'Email already exists',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  rateLimiter.authRequests,
  ValidationMiddleware.validateRegister, 
  UserController.register
);

router.post('/login', 
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Login user'
    #swagger.description = 'Authenticate user with email and password'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $ref: '#/definitions/UserLogin' }
    }
    #swagger.responses[200] = { 
      description: 'Login successful',
      schema: { $ref: '#/definitions/AuthResponse' }
    }
    #swagger.responses[401] = { 
      description: 'Invalid credentials',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  rateLimiter.authRequests,
  ValidationMiddleware.validateLogin, 
  UserController.login
);

router.post('/refresh-token', 
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Refresh authentication tokens'
    #swagger.description = 'Refresh access token using refresh token'
    #swagger.responses[200] = { 
      description: 'Token refreshed successfully',
      schema: { $ref: '#/definitions/AuthResponse' }
    }
  */
  AuthMiddleware.refreshToken, 
  UserController.refreshToken
);

router.post('/forgot-password',
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Request password reset'
    #swagger.description = 'Send password reset email to user'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { type: 'object', properties: { email: { type: 'string', format: 'email' } } }
    }
    #swagger.responses[200] = { 
      description: 'Reset email sent',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  rateLimiter.passwordReset,
  ValidationMiddleware.validateEmail,
  UserController.forgotPassword
);

router.post('/reset-password',
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Reset password with token'
    #swagger.description = 'Reset user password using reset token'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { 
        type: 'object',
        properties: {
          token: { type: 'string' },
          password: { type: 'string', minLength: 8 }
        }
      }
    }
    #swagger.responses[200] = { 
      description: 'Password reset successful',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  ValidationMiddleware.validatePasswordReset,
  UserController.resetPassword
);

// ========== PROTECTED ROUTES (Authentication Required) ==========
router.use(AuthMiddleware.authenticate);

// ========== PROFILE MANAGEMENT ==========

router.get('/profile', 
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Get user profile'
    #swagger.description = 'Get authenticated user profile information'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.responses[200] = { 
      description: 'User profile retrieved',
      schema: { 
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          user: { $ref: '#/definitions/User' }
        }
      }
    }
    #swagger.responses[401] = { 
      description: 'Unauthorized',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  UserController.getProfile
);

router.put('/profile', 
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Update user profile'
    #swagger.description = 'Update authenticated user profile information'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'John Doe' },
          age: { type: 'number', example: 26 },
          height: { type: 'number', example: 176 },
          weight: { type: 'number', example: 72 },
          activityLevel: { type: 'string', enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'] }
        }
      }
    }
    #swagger.responses[200] = { 
      description: 'Profile updated successfully',
      schema: { 
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Profile updated successfully' },
          user: { $ref: '#/definitions/User' }
        }
      }
    }
  */
  ValidationMiddleware.validateUpdateProfile, 
  UserController.updateProfile
);

router.get('/profile/history',
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Get profile modification history'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['page'] = { in: 'query', type: 'integer', description: 'Page number' }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer', description: 'Items per page' }
    #swagger.responses[200] = { 
      description: 'Profile history retrieved',
      schema: { 
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { type: 'object' } },
          pagination: { $ref: '#/definitions/Pagination' }
        }
      }
    }
  */
  ValidationMiddleware.validatePagination,
  UserController.getProfileHistory
);

// ========== AUTHENTICATION & SESSIONS ==========

router.post('/logout', 
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Logout user'
    #swagger.description = 'Logout current user session'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.responses[200] = { 
      description: 'Logout successful',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  UserController.logout
);

router.post('/logout-all', 
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Logout from all devices'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.responses[200] = { 
      description: 'Logged out from all devices',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  UserController.logoutAllDevices
);

router.get('/verify-token', 
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Verify authentication token'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.responses[200] = { 
      description: 'Token is valid',
      schema: { 
        type: 'object',
        properties: {
          valid: { type: 'boolean', example: true },
          user: { $ref: '#/definitions/User' }
        }
      }
    }
  */
  UserController.verifyToken
);

router.post('/change-password', 
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Change user password'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 }
        }
      }
    }
    #swagger.responses[200] = { 
      description: 'Password changed successfully',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  ValidationMiddleware.validateChangePassword, 
  UserController.changePassword
);

// ========== SESSION MANAGEMENT ==========

router.get('/sessions', 
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Get active sessions'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.responses[200] = { 
      description: 'Active sessions retrieved',
      schema: { 
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          sessions: { 
            type: 'array', 
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                deviceId: { type: 'string' },
                lastActive: { type: 'string', format: 'date-time' },
                isCurrent: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  */
  UserController.getSessions
);

router.delete('/sessions/:sessionId', 
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Revoke a specific session'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['sessionId'] = { in: 'path', required: true, type: 'string', description: 'Session ID' }
    #swagger.responses[200] = { 
      description: 'Session revoked',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  ValidationMiddleware.validateSessionId,
  UserController.revokeSession
);

// ========== USER SETTINGS ==========

router.get('/settings',
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Get user settings'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.responses[200] = { 
      description: 'User settings retrieved',
      schema: { 
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          settings: {
            type: 'object',
            properties: {
              units: { type: 'string', enum: ['metric', 'imperial'] },
              language: { type: 'string' },
              notifications: { type: 'boolean' },
              privacy: { type: 'object' }
            }
          }
        }
      }
    }
  */
  UserController.getSettings
);

router.put('/settings',
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Update user settings'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        type: 'object',
        properties: {
          units: { type: 'string', enum: ['metric', 'imperial'] },
          language: { type: 'string' },
          notifications: { type: 'boolean' }
        }
      }
    }
    #swagger.responses[200] = { 
      description: 'Settings updated',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  ValidationMiddleware.validateSettings,
  UserController.updateSettings
);

// ========== GOALS MANAGEMENT ==========

router.get('/goals',
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Get user goals'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.responses[200] = { 
      description: 'User goals retrieved',
      schema: { 
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          goals: { type: 'array', items: { $ref: '#/definitions/UserGoal' } }
        }
      }
    }
  */
  UserController.getGoals
);

router.post('/goals',
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Create or update a goal'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['calories', 'protein', 'weight'] },
          target: { type: 'number' },
          unit: { type: 'string' },
          period: { type: 'string', enum: ['daily', 'weekly', 'monthly'] }
        }
      }
    }
    #swagger.responses[201] = { 
      description: 'Goal created/updated',
      schema: { 
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          goal: { $ref: '#/definitions/UserGoal' }
        }
      }
    }
  */
  ValidationMiddleware.validateGoal,
  UserController.upsertGoal
);

router.put('/goals/:goalId',
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Update a specific goal'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['goalId'] = { in: 'path', required: true, type: 'string', description: 'Goal ID' }
    #swagger.parameters['body'] = {
      in: 'body',
      schema: { $ref: '#/definitions/UserGoal' }
    }
    #swagger.responses[200] = { 
      description: 'Goal updated',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  ValidationMiddleware.validateGoalId,
  ValidationMiddleware.validateGoal,
  UserController.upsertGoal
);

router.delete('/goals/:goalId',
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Delete a goal'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['goalId'] = { in: 'path', required: true, type: 'string', description: 'Goal ID' }
    #swagger.responses[200] = { 
      description: 'Goal deleted',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  ValidationMiddleware.validateGoalId,
  UserController.deleteGoal
);

// ========== ACCOUNT MANAGEMENT ==========

router.delete('/account', 
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Deactivate user account'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        properties: {
          password: { type: 'string' },
          reason: { type: 'string' }
        }
      }
    }
    #swagger.responses[200] = { 
      description: 'Account deactivated',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  ValidationMiddleware.validateAccountDeletion,
  UserController.deleteAccount
);

router.get('/export',
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Export user data (GDPR)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['format'] = { in: 'query', type: 'string', enum: ['json', 'csv'], default: 'json' }
    #swagger.responses[200] = { 
      description: 'User data exported',
      schema: { type: 'object' }
    }
  */
  rateLimiter.exportData,
  ValidationMiddleware.validateExportFormat,
  UserController.exportUserData
);

router.post('/request-deletion',
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Request complete data deletion (GDPR)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.responses[200] = { 
      description: 'Deletion request submitted',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  ValidationMiddleware.validateDataDeletionRequest,
  UserController.requestDataDeletion
);

// ========== SUBSCRIPTION MANAGEMENT ==========

router.get('/subscription',
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Get subscription info'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.responses[200] = { 
      description: 'Subscription info retrieved',
      schema: { 
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['free', 'premium', 'pro'] },
          status: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' },
          features: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  */
  UserController.getSubscriptionInfo
);

router.post('/subscription/upgrade',
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Upgrade subscription'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        properties: {
          plan: { type: 'string', enum: ['premium', 'pro'] },
          paymentMethod: { type: 'string' }
        }
      }
    }
    #swagger.responses[200] = { 
      description: 'Subscription upgraded',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  ValidationMiddleware.validateSubscriptionUpgrade,
  UserController.upgradeSubscription
);

router.post('/subscription/cancel',
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Cancel subscription'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.responses[200] = { 
      description: 'Subscription cancelled',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  AuthMiddleware.requireSubscription(['premium', 'pro']),
  UserController.cancelSubscription
);

// ========== PREMIUM FEATURES ==========

router.get('/insights',
  /* 
    #swagger.tags = ['Users', 'Analytics']
    #swagger.summary = 'Get personalized insights (Premium)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['page'] = { in: 'query', type: 'integer' }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer' }
    #swagger.responses[200] = { 
      description: 'Personalized insights',
      schema: { 
        type: 'object',
        properties: {
          insights: { type: 'array', items: { type: 'object' } },
          recommendations: { type: 'array', items: { type: 'string' } }
        }
      }
    }
    #swagger.responses[403] = { 
      description: 'Premium subscription required',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  AuthMiddleware.requirePremium,
  ValidationMiddleware.validatePagination,
  UserController.getPersonalizedInsights
);

router.get('/analytics',
  /* 
    #swagger.tags = ['Users', 'Analytics']
    #swagger.summary = 'Get advanced analytics (Pro)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['dateFrom'] = { in: 'query', type: 'string', format: 'date' }
    #swagger.parameters['dateTo'] = { in: 'query', type: 'string', format: 'date' }
    #swagger.responses[200] = { 
      description: 'Advanced analytics data',
      schema: { type: 'object' }
    }
    #swagger.responses[403] = { 
      description: 'Pro subscription required',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  AuthMiddleware.requirePro,
  ValidationMiddleware.validateDateRange,
  UserController.getAdvancedAnalytics
);

router.post('/ai-coach',
  /* 
    #swagger.tags = ['Users', 'Analytics']
    #swagger.summary = 'Get AI nutritionist recommendations (Premium/Pro)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          context: { type: 'object' }
        }
      }
    }
    #swagger.responses[200] = { 
      description: 'AI coach recommendations',
      schema: { 
        type: 'object',
        properties: {
          recommendation: { type: 'string' },
          confidence: { type: 'number' }
        }
      }
    }
  */
  AuthMiddleware.requirePremium,
  AuthMiddleware.validateFeature('ai_analysis'),
  rateLimiter.aiAnalysis,
  ValidationMiddleware.validateAICoachRequest,
  UserController.getAICoachRecommendations
);

// ========== ADMIN ROUTES ==========

router.get('/admin/stats', 
  /* 
    #swagger.tags = ['Admin']
    #swagger.summary = 'Get user statistics (Admin only)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.responses[200] = { 
      description: 'User statistics',
      schema: { type: 'object' }
    }
    #swagger.responses[403] = { 
      description: 'Admin access required',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  AuthMiddleware.requireAdmin,
  UserController.getUserStats
);

router.get('/admin/search',
  /* 
    #swagger.tags = ['Admin']
    #swagger.summary = 'Search users (Admin only)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['q'] = { in: 'query', required: true, type: 'string', description: 'Search query' }
    #swagger.parameters['page'] = { in: 'query', type: 'integer' }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer' }
    #swagger.responses[200] = { 
      description: 'Search results',
      schema: { 
        type: 'object',
        properties: {
          users: { type: 'array', items: { $ref: '#/definitions/User' } },
          pagination: { $ref: '#/definitions/Pagination' }
        }
      }
    }
  */
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.validateSearch,
  ValidationMiddleware.validatePagination,
  UserController.searchUsers
);

// ========== UTILITY ROUTES ==========

router.get('/health', (req, res) => {
  /* 
    #swagger.tags = ['Health']
    #swagger.summary = 'User service health check'
    #swagger.responses[200] = { 
      description: 'Service is healthy',
      schema: { 
        type: 'object',
        properties: {
          status: { type: 'string', example: 'healthy' },
          service: { type: 'string', example: 'user-service' },
          version: { type: 'string', example: '2.0.0' }
        }
      }
    }
  */
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'user-service',
    version: process.env.API_VERSION || '2.0.0'
  });
});

router.get('/features',
  /* 
    #swagger.tags = ['Users']
    #swagger.summary = 'Get available features for current user'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.responses[200] = { 
      description: 'Available features',
      schema: { 
        type: 'object',
        properties: {
          features: { type: 'array', items: { type: 'string' } },
          subscription: { type: 'string' }
        }
      }
    }
  */
  UserController.getAvailableFeatures
);

// ========== ERROR HANDLING ==========

// Catch-all for undefined routes
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'User route not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'POST /register',
      'POST /login',
      'GET /profile',
      'PUT /profile',
      'POST /logout',
      'GET /sessions',
      'GET /goals',
      'POST /goals'
    ]
  });
});

module.exports = router;