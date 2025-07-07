const express = require('express');
const router = express.Router();

const ConsumptionController = require('../controllers/consumptionController');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const { 
  validateConsumptionEntry, 
  validateUpdateEntry, 
  validateQuickMeal,
  validateQueryFilters,
  validateEntryId,
  validateMultipleIds,
  validateExportParams,
  validateCustomStatsParams,
  validateTextSearch,
  sanitizeNutritionData
} = require('../middleware/consumptionValidation');
const rateLimiter = require('../middleware/rateLimiter');

// Apply authentication to all routes
router.use(AuthMiddleware.authenticate);

// ========== MAIN CONSUMPTION ENTRIES ==========

/**
 * @route   POST /api/v1/consumption/entries
 * @desc    Create a new consumption entry
 * @access  Private
 */
router.post('/entries', 
  rateLimiter.consumptionCreate,
  validateConsumptionEntry,
  sanitizeNutritionData,
  AuthMiddleware.logActivity('create_consumption_entry'),
  ConsumptionController.createEntry
);

/**
 * @route   GET /api/v1/consumption/entries
 * @desc    Get user consumption entries with advanced filtering
 * @access  Private
 * @query   page, limit, mealType, dateFrom, dateTo, entryMethod, search, tags, sortBy, sortOrder
 */
router.get('/entries', 
  validateQueryFilters,
  ValidationMiddleware.validatePagination,
  ValidationMiddleware.validateDateRange,
  ValidationMiddleware.validateConsumptionFilters,
  ValidationMiddleware.validateSort(['consumedAt', 'calories', 'createdAt', 'updatedAt']),
  ConsumptionController.getUserEntries
);

/**
 * @route   GET /api/v1/consumption/entries/:entryId
 * @desc    Get a specific consumption entry by ID
 * @access  Private
 */
router.get('/entries/:entryId', 
  ValidationMiddleware.validateEntryId,
  AuthMiddleware.checkResourceOwnership('entryId', 'userId'),
  ConsumptionController.getEntryById
);

/**
 * @route   PUT /api/v1/consumption/entries/:entryId
 * @desc    Update a consumption entry
 * @access  Private
 */
router.put('/entries/:entryId', 
  ValidationMiddleware.validateEntryId,
  validateUpdateEntry,
  sanitizeNutritionData,
  AuthMiddleware.checkResourceOwnership('entryId', 'userId'),
  AuthMiddleware.logActivity('update_consumption_entry'),
  ConsumptionController.updateEntry
);

/**
 * @route   DELETE /api/v1/consumption/entries/:entryId
 * @desc    Delete a consumption entry (soft delete)
 * @access  Private
 */
router.delete('/entries/:entryId', 
  ValidationMiddleware.validateEntryId,
  AuthMiddleware.checkResourceOwnership('entryId', 'userId'),
  AuthMiddleware.logActivity('delete_consumption_entry'),
  ConsumptionController.deleteEntry
);

/**
 * @route   POST /api/v1/consumption/entries/:entryId/restore
 * @desc    Restore a deleted consumption entry
 * @access  Private
 */
router.post('/entries/:entryId/restore', 
  ValidationMiddleware.validateEntryId,
  AuthMiddleware.checkResourceOwnership('entryId', 'userId'),
  AuthMiddleware.logActivity('restore_consumption_entry'),
  ConsumptionController.restoreEntry
);

/**
 * @route   POST /api/v1/consumption/entries/:entryId/duplicate
 * @desc    Duplicate an existing entry
 * @access  Private
 */
router.post('/entries/:entryId/duplicate', 
  ValidationMiddleware.validateEntryId,
  AuthMiddleware.checkResourceOwnership('entryId', 'userId'),
  AuthMiddleware.logActivity('duplicate_consumption_entry'),
  ConsumptionController.duplicateEntry
);

// ========== SEARCH & DISCOVERY ==========

/**
 * @route   GET /api/v1/consumption/search
 * @desc    Search consumption entries with full-text search
 * @access  Private
 * @query   q (required), page, limit, fields
 */
router.get('/search', 
  validateTextSearch,
  ValidationMiddleware.validatePagination,
  ConsumptionController.searchEntries
);

/**
 * @route   GET /api/v1/consumption/suggestions
 * @desc    Get food suggestions based on user history
 * @access  Private
 * @query   mealType, timeOfDay, limit
 */
router.get('/suggestions',
  AuthMiddleware.validateFeature('ai_analysis'),
  rateLimiter.aiAnalysis,
  ConsumptionController.getFoodSuggestions
);

/**
 * @route   GET /api/v1/consumption/foods/top
 * @desc    Get most consumed foods by user
 * @access  Private
 * @query   limit, period (week/month/year/all), mealType
 */
router.get('/foods/top', 
  ConsumptionController.getTopFoods
);

// ========== QUICK MEAL OPERATIONS ==========

/**
 * @route   POST /api/v1/consumption/meals/quick
 * @desc    Add a quick meal (multiple foods)
 * @access  Private
 */
router.post('/meals/quick', 
  rateLimiter.consumptionCreate,
  validateQuickMeal,
  sanitizeNutritionData,
  AuthMiddleware.logActivity('create_quick_meal'),
  ConsumptionController.addQuickMeal
);

/**
 * @route   POST /api/v1/consumption/meals/from-recipe/:recipeId
 * @desc    Create meal from recipe
 * @access  Private
 */
router.post('/meals/from-recipe/:recipeId',
  ValidationMiddleware.validateObjectId('recipeId'),
  rateLimiter.consumptionCreate,
  AuthMiddleware.logActivity('create_meal_from_recipe'),
  ConsumptionController.createMealFromRecipe
);

// ========== BATCH OPERATIONS ==========

/**
 * @route   POST /api/v1/consumption/batch
 * @desc    Perform batch operations on entries
 * @access  Private (Premium/Pro)
 * @body    { operation: 'delete'|'update'|'duplicate', entryIds: [ObjectId], updateData?: {} }
 */
router.post('/batch',
  AuthMiddleware.validateFeature('bulk_operations'),
  rateLimiter.batchOperations,
  validateMultipleIds,
  ValidationMiddleware.validateBatchSize(50),
  AuthMiddleware.logActivity('batch_consumption_operation'),
  ConsumptionController.batchOperations
);

// ========== DASHBOARD & STATISTICS ==========

/**
 * @route   GET /api/v1/consumption/dashboard
 * @desc    Get comprehensive nutrition dashboard
 * @access  Private
 * @query   period (today/week/month/year), includeComparison, includeGoals
 */
router.get('/dashboard', 
  rateLimiter.dashboardStats,
  ConsumptionController.getDashboard
);

/**
 * @route   GET /api/v1/consumption/summary/today
 * @desc    Get today's nutrition summary
 * @access  Private
 */
router.get('/summary/today', 
  ConsumptionController.getTodayCaloriesSummary
);

/**
 * @route   GET /api/v1/consumption/stats/meals/today
 * @desc    Get today's meal breakdown
 * @access  Private
 */
router.get('/stats/meals/today', 
  ConsumptionController.getTodayMealStats
);

/**
 * @route   GET /api/v1/consumption/stats/weekly
 * @desc    Get weekly nutrition statistics
 * @access  Private
 * @query   weekOffset (0 = current week, -1 = last week)
 */
router.get('/stats/weekly', 
  rateLimiter.dashboardStats,
  ConsumptionController.getWeeklyStats
);

/**
 * @route   GET /api/v1/consumption/stats/monthly
 * @desc    Get monthly nutrition statistics
 * @access  Private
 * @query   monthOffset (0 = current month, -1 = last month)
 */
router.get('/stats/monthly', 
  rateLimiter.dashboardStats,
  ConsumptionController.getMonthlyStats
);

/**
 * @route   GET /api/v1/consumption/stats/custom
 * @desc    Get custom period statistics with advanced analytics
 * @access  Private
 * @query   dateFrom, dateTo (required), groupBy, metrics, includeComparison
 */
router.get('/stats/custom', 
  validateCustomStatsParams,
  rateLimiter.dashboardStats,
  ConsumptionController.getCustomStats
);

// ========== TRENDS & ANALYTICS ==========

/**
 * @route   GET /api/v1/consumption/trends/nutrition
 * @desc    Get nutrition trends analysis (Premium)
 * @access  Private (Premium/Pro)
 * @query   period, metric, includeMovingAverage, includeSeasonality
 */
router.get('/trends/nutrition',
  AuthMiddleware.requirePremium,
  ValidationMiddleware.validateDateRange,
  ConsumptionController.getNutritionTrends
);

/**
 * @route   GET /api/v1/consumption/analysis/nutrition
 * @desc    Get comprehensive nutrition analysis (Premium)
 * @access  Private (Premium/Pro)
 * @query   period, analysisType, includeRecommendations
 */
router.get('/analysis/nutrition',
  AuthMiddleware.requirePremium,
  ValidationMiddleware.validateDateRange,
  ConsumptionController.getNutritionAnalysis
);

/**
 * @route   GET /api/v1/consumption/insights/personal
 * @desc    Get personalized nutrition insights (Pro)
 * @access  Private (Pro)
 */
router.get('/insights/personal',
  AuthMiddleware.requirePro,
  AuthMiddleware.validateFeature('advanced_analytics'),
  ConsumptionController.getPersonalizedInsights
);

// ========== AI & MACHINE LEARNING ==========

/**
 * @route   POST /api/v1/consumption/ai/analyze-image
 * @desc    Analyze food image with AI (Premium/Pro)
 * @access  Private (Premium/Pro)
 */
router.post('/ai/analyze-image',
  AuthMiddleware.requirePremium,
  AuthMiddleware.validateFeature('ai_analysis'),
  rateLimiter.aiAnalysis,
  ValidationMiddleware.validateImageUpload,
  AuthMiddleware.logActivity('ai_image_analysis'),
  ConsumptionController.analyzeImageWithAI
);

/**
 * @route   POST /api/v1/consumption/ai/scan-barcode
 * @desc    Scan barcode and get food information
 * @access  Private
 */
router.post('/ai/scan-barcode',
  ValidationMiddleware.validateBarcodeData,
  AuthMiddleware.logActivity('barcode_scan'),
  ConsumptionController.scanBarcode
);

/**
 * @route   POST /api/v1/consumption/ai/voice-entry
 * @desc    Create entry from voice input (Premium/Pro)
 * @access  Private (Premium/Pro)
 */
router.post('/ai/voice-entry',
  AuthMiddleware.requirePremium,
  AuthMiddleware.validateFeature('ai_analysis'),
  rateLimiter.aiAnalysis,
  ValidationMiddleware.validateVoiceData,
  AuthMiddleware.logActivity('voice_food_entry'),
  ConsumptionController.processVoiceEntry
);

// ========== EXPORT & REPORTING ==========

/**
 * @route   GET /api/v1/consumption/export
 * @desc    Export consumption data
 * @access  Private (Premium for advanced formats)
 * @query   format (json/csv/xlsx), dateFrom, dateTo, includeNutrition, includeMetadata
 */
router.get('/export', 
  rateLimiter.exportData,
  validateExportParams,
  ValidationMiddleware.validateDateRange,
  AuthMiddleware.logActivity('export_consumption_data'),
  ConsumptionController.exportData
);

/**
 * @route   GET /api/v1/consumption/reports/weekly
 * @desc    Generate weekly consumption report (Pro)
 * @access  Private (Pro)
 */
router.get('/reports/weekly',
  AuthMiddleware.requirePro,
  AuthMiddleware.validateFeature('custom_reports'),
  ValidationMiddleware.validateDateRange,
  ConsumptionController.generateWeeklyReport
);

/**
 * @route   GET /api/v1/consumption/reports/monthly
 * @desc    Generate monthly consumption report (Pro)
 * @access  Private (Pro)
 */
router.get('/reports/monthly',
  AuthMiddleware.requirePro,
  AuthMiddleware.validateFeature('custom_reports'),
  ValidationMiddleware.validateDateRange,
  ConsumptionController.generateMonthlyReport
);

// ========== GOAL TRACKING ==========

/**
 * @route   GET /api/v1/consumption/goals/progress
 * @desc    Get nutrition goals progress
 * @access  Private
 */
router.get('/goals/progress',
  ConsumptionController.getGoalsProgress
);

/**
 * @route   POST /api/v1/consumption/goals/update-progress
 * @desc    Update goal progress manually
 * @access  Private
 */
router.post('/goals/update-progress',
  ValidationMiddleware.validateGoalProgress,
  AuthMiddleware.logActivity('update_goal_progress'),
  ConsumptionController.updateGoalProgress
);

// ========== SOCIAL & SHARING ==========

/**
 * @route   POST /api/v1/consumption/share/meal/:entryId
 * @desc    Share a meal with other users
 * @access  Private
 */
router.post('/share/meal/:entryId',
  ValidationMiddleware.validateEntryId,
  ValidationMiddleware.validateSharingOptions,
  AuthMiddleware.checkResourceOwnership('entryId', 'userId'),
  AuthMiddleware.logActivity('share_meal'),
  ConsumptionController.shareMeal
);

/**
 * @route   GET /api/v1/consumption/shared/:shareId
 * @desc    View shared meal (public link)
 * @access  Public
 */
router.get('/shared/:shareId',
  ValidationMiddleware.validateObjectId('shareId'),
  ConsumptionController.viewSharedMeal
);

// ========== ADMIN ROUTES ==========

/**
 * @route   GET /api/v1/consumption/admin/stats/global
 * @desc    Get global consumption statistics (Admin)
 * @access  Private (Admin)
 */
router.get('/admin/stats/global', 
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.validateDateRange,
  ConsumptionController.getGlobalStats
);

/**
 * @route   GET /api/v1/consumption/admin/trends/global
 * @desc    Get global consumption trends (Admin)
 * @access  Private (Admin)
 */
router.get('/admin/trends/global',
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.validateDateRange,
  ConsumptionController.getGlobalTrends
);

/**
 * @route   GET /api/v1/consumption/admin/users/top-consumers
 * @desc    Get top consuming users (Admin)
 * @access  Private (Admin)
 */
router.get('/admin/users/top-consumers',
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.validatePagination,
  ConsumptionController.getTopConsumers
);

/**
 * @route   POST /api/v1/consumption/admin/data/cleanup
 * @desc    Cleanup old or invalid consumption data (Admin)
 * @access  Private (Admin)
 */
router.post('/admin/data/cleanup',
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.validateDataCleanupOptions,
  ConsumptionController.cleanupConsumptionData
);

/**
 * @route   GET /api/v1/consumption/admin/quality/reports
 * @desc    Get data quality reports (Admin)
 * @access  Private (Admin)
 */
router.get('/admin/quality/reports',
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.validateDateRange,
  ConsumptionController.getDataQualityReports
);

// ========== UTILITY ROUTES ==========

/**
 * @route   GET /api/v1/consumption/health
 * @desc    Health check for consumption service
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'consumption-service',
    version: process.env.API_VERSION || '1.0.0',
    features: {
      aiAnalysis: true,
      barcodeScanning: true,
      voiceInput: true,
      bulkOperations: true,
      advancedAnalytics: true
    }
  });
});

/**
 * @route   GET /api/v1/consumption/metadata
 * @desc    Get consumption service metadata
 * @access  Private
 */
router.get('/metadata',
  ConsumptionController.getServiceMetadata
);

// ========== ERROR HANDLING ==========

// Catch-all for undefined routes
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Consumption route not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'POST /entries',
      'GET /entries',
      'GET /dashboard',
      'GET /stats/today',
      'GET /foods/top',
      'POST /meals/quick',
      'GET /search',
      'GET /export'
    ]
  });
});

module.exports = router;