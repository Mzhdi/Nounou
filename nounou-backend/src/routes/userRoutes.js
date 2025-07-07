const express = require('express');
const router = express.Router();

// Middleware
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const rateLimiter = require('../middleware/rateLimiter');

// Controller
const UserController = require('../controllers/userController');

// ========== PUBLIC ROUTES (No Authentication) ==========

/**
 * @route   POST /api/v1/users/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  rateLimiter.authRequests,
  ValidationMiddleware.validateRegister, 
  UserController.register
);

/**
 * @route   POST /api/v1/users/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', 
  rateLimiter.authRequests,
  ValidationMiddleware.validateLogin, 
  UserController.login
);

/**
 * @route   POST /api/v1/users/refresh-token
 * @desc    Refresh authentication tokens
 * @access  Public (requires refresh token)
 */
router.post('/refresh-token', 
  AuthMiddleware.refreshToken, 
  UserController.refreshToken
);

/**
 * @route   POST /api/v1/users/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password',
  rateLimiter.passwordReset,
  ValidationMiddleware.validateEmail,
  UserController.forgotPassword
);

/**
 * @route   POST /api/v1/users/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password',
  ValidationMiddleware.validatePasswordReset,
  UserController.resetPassword
);

// ========== PROTECTED ROUTES (Authentication Required) ==========
router.use(AuthMiddleware.authenticate);

// ========== PROFILE MANAGEMENT ==========

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', 
  UserController.getProfile
);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', 
  ValidationMiddleware.validateUpdateProfile, 
  UserController.updateProfile
);

/**
 * @route   GET /api/v1/users/profile/history
 * @desc    Get profile modification history
 * @access  Private
 */
router.get('/profile/history',
  ValidationMiddleware.validatePagination,
  UserController.getProfileHistory
);

// ========== AUTHENTICATION & SESSIONS ==========

/**
 * @route   POST /api/v1/users/logout
 * @desc    Logout user (current session)
 * @access  Private
 */
router.post('/logout', 
  UserController.logout
);

/**
 * @route   POST /api/v1/users/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', 
  UserController.logoutAllDevices
);

/**
 * @route   GET /api/v1/users/verify-token
 * @desc    Verify authentication token
 * @access  Private
 */
router.get('/verify-token', 
  UserController.verifyToken
);

/**
 * @route   POST /api/v1/users/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', 
  ValidationMiddleware.validateChangePassword, 
  UserController.changePassword
);

// ========== SESSION MANAGEMENT ==========

/**
 * @route   GET /api/v1/users/sessions
 * @desc    Get active sessions
 * @access  Private
 */
router.get('/sessions', 
  UserController.getSessions
);

/**
 * @route   DELETE /api/v1/users/sessions/:sessionId
 * @desc    Revoke a specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId', 
  ValidationMiddleware.validateSessionId,
  UserController.revokeSession
);

// ========== USER SETTINGS ==========

/**
 * @route   GET /api/v1/users/settings
 * @desc    Get user settings
 * @access  Private
 */
router.get('/settings',
  UserController.getSettings
);

/**
 * @route   PUT /api/v1/users/settings
 * @desc    Update user settings
 * @access  Private
 */
router.put('/settings',
  ValidationMiddleware.validateSettings,
  UserController.updateSettings
);

// ========== GOALS MANAGEMENT ==========

/**
 * @route   GET /api/v1/users/goals
 * @desc    Get user goals
 * @access  Private
 */
router.get('/goals',
  UserController.getGoals
);

/**
 * @route   POST /api/v1/users/goals
 * @desc    Create or update a goal
 * @access  Private
 */
router.post('/goals',
  ValidationMiddleware.validateGoal,
  UserController.upsertGoal
);

/**
 * @route   PUT /api/v1/users/goals/:goalId
 * @desc    Update a specific goal
 * @access  Private
 */
router.put('/goals/:goalId',
  ValidationMiddleware.validateGoalId,
  ValidationMiddleware.validateGoal,
  UserController.upsertGoal
);

/**
 * @route   DELETE /api/v1/users/goals/:goalId
 * @desc    Delete a goal
 * @access  Private
 */
router.delete('/goals/:goalId',
  ValidationMiddleware.validateGoalId,
  UserController.deleteGoal
);

// ========== ACCOUNT MANAGEMENT ==========

/**
 * @route   DELETE /api/v1/users/account
 * @desc    Deactivate user account
 * @access  Private
 */
router.delete('/account', 
  ValidationMiddleware.validateAccountDeletion,
  UserController.deleteAccount
);

/**
 * @route   GET /api/v1/users/export
 * @desc    Export user data (GDPR)
 * @access  Private
 */
router.get('/export',
  rateLimiter.exportData,
  ValidationMiddleware.validateExportFormat,
  UserController.exportUserData
);

/**
 * @route   POST /api/v1/users/request-deletion
 * @desc    Request complete data deletion (GDPR)
 * @access  Private
 */
router.post('/request-deletion',
  ValidationMiddleware.validateDataDeletionRequest,
  UserController.requestDataDeletion
);

// ========== SUBSCRIPTION MANAGEMENT ==========

/**
 * @route   GET /api/v1/users/subscription
 * @desc    Get subscription info
 * @access  Private
 */
router.get('/subscription',
  UserController.getSubscriptionInfo
);

/**
 * @route   POST /api/v1/users/subscription/upgrade
 * @desc    Upgrade subscription
 * @access  Private
 */
router.post('/subscription/upgrade',
  ValidationMiddleware.validateSubscriptionUpgrade,
  UserController.upgradeSubscription
);

/**
 * @route   POST /api/v1/users/subscription/cancel
 * @desc    Cancel subscription
 * @access  Private
 */
router.post('/subscription/cancel',
  AuthMiddleware.requireSubscription(['premium', 'pro']),
  UserController.cancelSubscription
);

// ========== PREMIUM FEATURES ==========

/**
 * @route   GET /api/v1/users/insights
 * @desc    Get personalized insights (Premium)
 * @access  Private (Premium/Pro)
 */
router.get('/insights',
  AuthMiddleware.requirePremium,
  ValidationMiddleware.validatePagination,
  UserController.getPersonalizedInsights
);

/**
 * @route   GET /api/v1/users/analytics
 * @desc    Get advanced analytics (Pro)
 * @access  Private (Pro only)
 */
router.get('/analytics',
  AuthMiddleware.requirePro,
  ValidationMiddleware.validateDateRange,
  UserController.getAdvancedAnalytics
);

/**
 * @route   POST /api/v1/users/ai-coach
 * @desc    Get AI nutritionist recommendations (Premium/Pro)
 * @access  Private (Premium/Pro)
 */
router.post('/ai-coach',
  AuthMiddleware.requirePremium,
  AuthMiddleware.validateFeature('ai_analysis'),
  rateLimiter.aiAnalysis,
  ValidationMiddleware.validateAICoachRequest,
  UserController.getAICoachRecommendations
);

// ========== SOCIAL FEATURES ==========

/**
 * @route   GET /api/v1/users/profile/public/:userId
 * @desc    Get public profile of another user
 * @access  Private (Optional auth)
 */
router.get('/profile/public/:userId',
  AuthMiddleware.optionalAuth,
  ValidationMiddleware.validateUserId,
  UserController.getPublicProfile
);

/**
 * @route   POST /api/v1/users/follow/:userId
 * @desc    Follow another user
 * @access  Private
 */
router.post('/follow/:userId',
  ValidationMiddleware.validateUserId,
  UserController.followUser
);

/**
 * @route   DELETE /api/v1/users/follow/:userId
 * @desc    Unfollow a user
 * @access  Private
 */
router.delete('/follow/:userId',
  ValidationMiddleware.validateUserId,
  UserController.unfollowUser
);

/**
 * @route   GET /api/v1/users/followers
 * @desc    Get user followers
 * @access  Private
 */
router.get('/followers',
  ValidationMiddleware.validatePagination,
  UserController.getFollowers
);

/**
 * @route   GET /api/v1/users/following
 * @desc    Get users being followed
 * @access  Private
 */
router.get('/following',
  ValidationMiddleware.validatePagination,
  UserController.getFollowing
);

// ========== ADMIN ROUTES ==========

/**
 * @route   GET /api/v1/users/admin/stats
 * @desc    Get user statistics (Admin only)
 * @access  Private (Admin)
 */
router.get('/admin/stats', 
  AuthMiddleware.requireAdmin,
  UserController.getUserStats
);

/**
 * @route   GET /api/v1/users/admin/search
 * @desc    Search users (Admin only)
 * @access  Private (Admin)
 */
router.get('/admin/search',
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.validateSearch,
  ValidationMiddleware.validatePagination,
  UserController.searchUsers
);

/**
 * @route   PUT /api/v1/users/admin/:userId/status
 * @desc    Update user status (Admin only)
 * @access  Private (Admin)
 */
router.put('/admin/:userId/status',
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.validateUserId,
  ValidationMiddleware.validateUserStatusUpdate,
  UserController.updateUserStatus
);

/**
 * @route   POST /api/v1/users/admin/:userId/impersonate
 * @desc    Impersonate user (Super Admin only)
 * @access  Private (Super Admin)
 */
router.post('/admin/:userId/impersonate',
  AuthMiddleware.requireRole(['superadmin']),
  ValidationMiddleware.validateUserId,
  UserController.impersonateUser
);

/**
 * @route   GET /api/v1/users/admin/reports/daily
 * @desc    Get daily user reports (Admin)
 * @access  Private (Admin)
 */
router.get('/admin/reports/daily',
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.validateDateRange,
  UserController.getDailyUserReports
);

/**
 * @route   POST /api/v1/users/admin/bulk-actions
 * @desc    Perform bulk actions on users (Admin)
 * @access  Private (Admin)
 */
router.post('/admin/bulk-actions',
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.validateBatchSize(100),
  ValidationMiddleware.validateObjectIds('userIds'),
  ValidationMiddleware.validateBulkUserAction,
  UserController.performBulkActions
);

// ========== UTILITY ROUTES ==========

/**
 * @route   GET /api/v1/users/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'user-service',
    version: process.env.API_VERSION || '1.0.0'
  });
});

/**
 * @route   GET /api/v1/users/features
 * @desc    Get available features for current user
 * @access  Private
 */
router.get('/features',
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