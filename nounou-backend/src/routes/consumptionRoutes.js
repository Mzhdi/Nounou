const express = require('express');
const router = express.Router();

const ConsumptionController = require('../controllers/consumptionController');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/consumptionValidation');
const rateLimiter = require('../middleware/rateLimiter');

// Apply authentication to all routes
router.use(AuthMiddleware.authenticate);

// ========== CRÉATION D'ENTRÉES UNIFIÉES ==========

router.post('/entries', 
  /* 
    #swagger.tags = ['Consumption']
    #swagger.summary = 'Create consumption entry (food OR recipe)'
    #swagger.description = 'Create a unified consumption entry for either food or recipe'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $ref: '#/definitions/ConsumptionEntryCreate' }
    }
    #swagger.responses[201] = { 
      description: 'Consumption entry created successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Consumption entry created' },
          data: { $ref: '#/definitions/ConsumptionEntry' }
        }
      }
    }
    #swagger.responses[400] = { 
      description: 'Invalid input data',
      schema: { $ref: '#/definitions/Error' }
    }
    #swagger.responses[404] = { 
      description: 'Food or recipe not found',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  rateLimiter.consumptionCreate,
  ValidationMiddleware.validateConsumptionEntry,
  AuthMiddleware.logActivity('create_consumption_entry'),
  ConsumptionController.createEntry
);

router.post('/entries/food', 
  /* 
    #swagger.tags = ['Consumption']
    #swagger.summary = 'Create food consumption entry (shorthand)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        required: ['foodId', 'quantity', 'unit'],
        properties: {
          foodId: { type: 'string', example: '64f7d1b2c8e5f1234567890b' },
          quantity: { type: 'number', example: 150 },
          unit: { type: 'string', example: 'g' },
          mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          mealName: { type: 'string', example: 'Morning Snack' },
          consumedAt: { type: 'string', format: 'date-time' },
          notes: { type: 'string' }
        }
      }
    }
    #swagger.responses[201] = { 
      description: 'Food entry created',
      schema: { $ref: '#/definitions/ConsumptionEntry' }
    }
  */
  rateLimiter.consumptionCreate,
  ValidationMiddleware.validateFoodEntry,
  AuthMiddleware.logActivity('create_food_entry'),
  ConsumptionController.createFoodEntry
);

router.post('/entries/recipe', 
  /* 
    #swagger.tags = ['Consumption']
    #swagger.summary = 'Create recipe consumption entry (shorthand)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $ref: '#/definitions/RecipeConsumptionEntry' }
    }
    #swagger.responses[201] = { 
      description: 'Recipe entry created',
      schema: { $ref: '#/definitions/ConsumptionEntry' }
    }
  */
  rateLimiter.consumptionCreate,
  ValidationMiddleware.validateRecipeEntry,
  AuthMiddleware.logActivity('create_recipe_entry'),
  ConsumptionController.createRecipeEntry
);

router.post('/meals/quick', 
  /* 
    #swagger.tags = ['Consumption']
    #swagger.summary = 'Create quick meal with multiple items'
    #swagger.description = 'Create a meal containing multiple foods and/or recipes'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $ref: '#/definitions/QuickMeal' }
    }
    #swagger.responses[201] = { 
      description: 'Quick meal created',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              entries: { type: 'array', items: { $ref: '#/definitions/ConsumptionEntry' } },
              totalNutrition: { type: 'object' }
            }
          }
        }
      }
    }
  */
  rateLimiter.consumptionCreate,
  ValidationMiddleware.validateQuickMeal,
  AuthMiddleware.logActivity('create_quick_meal'),
  ConsumptionController.addQuickMeal
);

router.post('/meals/from-recipe/:recipeId',
  /* 
    #swagger.tags = ['Consumption']
    #swagger.summary = 'Create meal from recipe'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['recipeId'] = { in: 'path', required: true, type: 'string', description: 'Recipe ID' }
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        properties: {
          servings: { type: 'number', example: 1.5 },
          mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          notes: { type: 'string' }
        }
      }
    }
    #swagger.responses[201] = { 
      description: 'Meal from recipe created',
      schema: { $ref: '#/definitions/ConsumptionEntry' }
    }
  */
  ValidationMiddleware.validateObjectId('recipeId'),
  ValidationMiddleware.validateRecipeMeal,
  rateLimiter.consumptionCreate,
  AuthMiddleware.logActivity('create_meal_from_recipe'),
  ConsumptionController.createMealFromRecipe
);

// ========== RÉCUPÉRATION AVEC FILTRES AVANCÉS ==========

router.get('/entries', 
  /* 
    #swagger.tags = ['Consumption']
    #swagger.summary = 'Get consumption entries with advanced filtering'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['page'] = { in: 'query', type: 'integer', default: 1, description: 'Page number' }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer', default: 20, description: 'Items per page' }
    #swagger.parameters['mealType'] = { in: 'query', type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'], description: 'Filter by meal type' }
    #swagger.parameters['itemType'] = { in: 'query', type: 'string', enum: ['food', 'recipe'], description: 'Filter by item type' }
    #swagger.parameters['dateFrom'] = { in: 'query', type: 'string', format: 'date', description: 'Start date filter' }
    #swagger.parameters['dateTo'] = { in: 'query', type: 'string', format: 'date', description: 'End date filter' }
    #swagger.parameters['search'] = { in: 'query', type: 'string', description: 'Search in item names' }
    #swagger.parameters['minCalories'] = { in: 'query', type: 'number', description: 'Minimum calories filter' }
    #swagger.parameters['maxCalories'] = { in: 'query', type: 'number', description: 'Maximum calories filter' }
    #swagger.responses[200] = { 
      description: 'List of consumption entries',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/definitions/ConsumptionEntry' } },
          pagination: { $ref: '#/definitions/Pagination' },
          summary: { 
            type: 'object',
            properties: {
              totalCalories: { type: 'number' },
              totalEntries: { type: 'number' },
              itemTypes: { type: 'object' }
            }
          }
        }
      }
    }
  */
  ValidationMiddleware.validateQueryFilters,
  ValidationMiddleware.validatePagination,
  ValidationMiddleware.validateDateRange,
  ConsumptionController.getUserEntries
);

router.get('/entries/foods', 
  /* 
    #swagger.tags = ['Consumption']
    #swagger.summary = 'Get only food consumption entries'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['page'] = { in: 'query', type: 'integer' }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer' }
    #swagger.responses[200] = { 
      description: 'Food consumption entries',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/definitions/ConsumptionEntry' } }
        }
      }
    }
  */
  ValidationMiddleware.validateQueryFilters,
  ValidationMiddleware.validatePagination,
  ConsumptionController.getFoodEntries
);

router.get('/entries/recipes', 
  /* 
    #swagger.tags = ['Consumption']
    #swagger.summary = 'Get only recipe consumption entries'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['page'] = { in: 'query', type: 'integer' }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer' }
    #swagger.responses[200] = { 
      description: 'Recipe consumption entries',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/definitions/ConsumptionEntry' } }
        }
      }
    }
  */
  ValidationMiddleware.validateQueryFilters,
  ValidationMiddleware.validatePagination,
  ConsumptionController.getRecipeEntries
);

router.get('/entries/:entryId', 
  /* 
    #swagger.tags = ['Consumption']
    #swagger.summary = 'Get specific consumption entry'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['entryId'] = { in: 'path', required: true, type: 'string', description: 'Entry ID' }
    #swagger.responses[200] = { 
      description: 'Consumption entry details',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { $ref: '#/definitions/ConsumptionEntry' }
        }
      }
    }
    #swagger.responses[404] = { 
      description: 'Entry not found',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  ValidationMiddleware.validateEntryId,
  AuthMiddleware.checkResourceOwnership('entryId', 'userId'),
  ConsumptionController.getEntryById
);

// ========== RECHERCHE UNIFIÉE ==========

router.get('/search', 
  /* 
    #swagger.tags = ['Consumption']
    #swagger.summary = 'Search consumption entries'
    #swagger.description = 'Search across both food and recipe consumption entries'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['q'] = { in: 'query', required: true, type: 'string', description: 'Search query' }
    #swagger.parameters['page'] = { in: 'query', type: 'integer' }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer' }
    #swagger.parameters['itemType'] = { in: 'query', type: 'string', enum: ['food', 'recipe'] }
    #swagger.parameters['dateFrom'] = { in: 'query', type: 'string', format: 'date' }
    #swagger.parameters['dateTo'] = { in: 'query', type: 'string', format: 'date' }
    #swagger.responses[200] = { 
      description: 'Search results',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          query: { type: 'string' },
          results: { type: 'array', items: { $ref: '#/definitions/ConsumptionEntry' } },
          pagination: { $ref: '#/definitions/Pagination' }
        }
      }
    }
  */
  ValidationMiddleware.validateTextSearch,
  ValidationMiddleware.validatePagination,
  ConsumptionController.searchEntries
);

router.get('/search/foods', 
  /* 
    #swagger.tags = ['Consumption']
    #swagger.summary = 'Search only food consumption entries'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['q'] = { in: 'query', required: true, type: 'string' }
    #swagger.responses[200] = { description: 'Food search results' }
  */
  ValidationMiddleware.validateTextSearch,
  ValidationMiddleware.validatePagination,
  ConsumptionController.searchFoodEntries
);

router.get('/search/recipes', 
  /* 
    #swagger.tags = ['Consumption']
    #swagger.summary = 'Search only recipe consumption entries'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['q'] = { in: 'query', required: true, type: 'string' }
    #swagger.responses[200] = { description: 'Recipe search results' }
  */
  ValidationMiddleware.validateTextSearch,
  ValidationMiddleware.validatePagination,
  ConsumptionController.searchRecipeEntries
);

// ========== ANALYTICS ENRICHIES ==========

router.get('/dashboard', 
  /* 
    #swagger.tags = ['Consumption', 'Analytics']
    #swagger.summary = 'Unified nutrition dashboard'
    #swagger.description = 'Get comprehensive nutrition dashboard with foods and recipes analytics'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['period'] = { 
      in: 'query', 
      type: 'string', 
      enum: ['today', 'week', 'month', 'year'],
      default: 'today',
      description: 'Time period for dashboard data'
    }
    #swagger.parameters['includeBreakdown'] = { in: 'query', type: 'boolean', description: 'Include meal breakdown' }
    #swagger.parameters['includeGoals'] = { in: 'query', type: 'boolean', description: 'Include goal comparison' }
    #swagger.responses[200] = { 
      description: 'Dashboard data',
      schema: { $ref: '#/definitions/DashboardData' }
    }
  */
  rateLimiter.dashboardStats,
  ValidationMiddleware.validateDashboardParams,
  ConsumptionController.getDashboard
);

router.get('/dashboard/by-type', 
  /* 
    #swagger.tags = ['Consumption', 'Analytics']
    #swagger.summary = 'Dashboard breakdown by item type'
    #swagger.description = 'Get dashboard with food vs recipe breakdown'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.responses[200] = { 
      description: 'Dashboard breakdown by type',
      schema: { $ref: '#/definitions/DashboardData' }
    }
  */
  rateLimiter.dashboardStats,
  ValidationMiddleware.validateDashboardParams,
  ConsumptionController.getDashboardByType
);

router.get('/stats/top-items', 
  /* 
    #swagger.tags = ['Consumption', 'Analytics']
    #swagger.summary = 'Top consumed items (foods + recipes)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['limit'] = { in: 'query', type: 'integer', default: 10, description: 'Number of top items' }
    #swagger.parameters['period'] = { in: 'query', type: 'string', enum: ['week', 'month', 'year'] }
    #swagger.parameters['itemType'] = { in: 'query', type: 'string', enum: ['food', 'recipe'] }
    #swagger.parameters['mealType'] = { in: 'query', type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] }
    #swagger.responses[200] = { 
      description: 'Top consumed items',
      schema: { $ref: '#/definitions/TopItems' }
    }
  */
  ValidationMiddleware.validateStatsParams,
  ConsumptionController.getTopConsumedItems
);

router.get('/stats/balance', 
  /* 
    #swagger.tags = ['Consumption', 'Analytics']
    #swagger.summary = 'Nutrition balance analysis'
    #swagger.description = 'Analyze nutrition balance between food and recipe sources'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['period'] = { in: 'query', type: 'string', enum: ['week', 'month', 'year'] }
    #swagger.parameters['includeComparison'] = { in: 'query', type: 'boolean' }
    #swagger.responses[200] = { 
      description: 'Nutrition balance analysis',
      schema: { $ref: '#/definitions/NutritionBalance' }
    }
  */
  rateLimiter.dashboardStats,
  ValidationMiddleware.validateStatsParams,
  ConsumptionController.getNutritionBalance
);

// ========== GESTION DES ENTRÉES ==========

router.put('/entries/:entryId', 
  /* 
    #swagger.tags = ['Consumption']
    #swagger.summary = 'Update consumption entry'
    #swagger.description = 'Update a consumption entry with smart type-based handling'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['entryId'] = { in: 'path', required: true, type: 'string' }
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        type: 'object',
        properties: {
          quantity: { type: 'number' },
          servings: { type: 'number' },
          mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          mealName: { type: 'string' },
          notes: { type: 'string' },
          consumedAt: { type: 'string', format: 'date-time' }
        }
      }
    }
    #swagger.responses[200] = { 
      description: 'Entry updated successfully',
      schema: { $ref: '#/definitions/ConsumptionEntry' }
    }
  */
  ValidationMiddleware.validateEntryId,
  ValidationMiddleware.validateUpdateEntry,
  AuthMiddleware.checkResourceOwnership('entryId', 'userId'),
  AuthMiddleware.logActivity('update_consumption_entry'),
  ConsumptionController.updateEntry
);

router.delete('/entries/:entryId', 
  /* 
    #swagger.tags = ['Consumption']
    #swagger.summary = 'Delete consumption entry'
    #swagger.description = 'Soft delete a consumption entry'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['entryId'] = { in: 'path', required: true, type: 'string' }
    #swagger.responses[200] = { 
      description: 'Entry deleted successfully',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  ValidationMiddleware.validateEntryId,
  AuthMiddleware.checkResourceOwnership('entryId', 'userId'),
  AuthMiddleware.logActivity('delete_consumption_entry'),
  ConsumptionController.deleteEntry
);

router.post('/entries/:entryId/duplicate', 
  /* 
    #swagger.tags = ['Consumption']
    #swagger.summary = 'Duplicate consumption entry'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['entryId'] = { in: 'path', required: true, type: 'string' }
    #swagger.responses[201] = { 
      description: 'Entry duplicated',
      schema: { $ref: '#/definitions/ConsumptionEntry' }
    }
  */
  ValidationMiddleware.validateEntryId,
  AuthMiddleware.checkResourceOwnership('entryId', 'userId'),
  AuthMiddleware.logActivity('duplicate_consumption_entry'),
  ConsumptionController.duplicateEntry
);

// ========== SUGGESTIONS ET RECOMMANDATIONS ==========

router.get('/suggestions/foods',
  /* 
    #swagger.tags = ['Consumption', 'Analytics']
    #swagger.summary = 'Get food suggestions based on history'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['mealType'] = { in: 'query', type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer', default: 10 }
    #swagger.parameters['basedOn'] = { in: 'query', type: 'string', enum: ['frequency', 'nutrition', 'time'] }
    #swagger.responses[200] = { 
      description: 'Food suggestions',
      schema: {
        type: 'object',
        properties: {
          suggestions: { type: 'array', items: { $ref: '#/definitions/Food' } },
          reasoning: { type: 'string' }
        }
      }
    }
    #swagger.responses[403] = { description: 'Premium feature required' }
  */
  AuthMiddleware.validateFeature('ai_analysis'),
  rateLimiter.aiAnalysis,
  ValidationMiddleware.validateSuggestionParams,
  ConsumptionController.getFoodSuggestions
);

router.get('/suggestions/recipes',
  /* 
    #swagger.tags = ['Consumption', 'Analytics']
    #swagger.summary = 'Get recipe suggestions based on history'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.responses[200] = { 
      description: 'Recipe suggestions',
      schema: {
        type: 'object',
        properties: {
          suggestions: { type: 'array', items: { $ref: '#/definitions/Recipe' } }
        }
      }
    }
  */
  AuthMiddleware.validateFeature('ai_analysis'),
  rateLimiter.aiAnalysis,
  ValidationMiddleware.validateSuggestionParams,
  ConsumptionController.getRecipeSuggestions
);

// ========== EXPORT ==========

router.get('/export/unified', 
  /* 
    #swagger.tags = ['Consumption']
    #swagger.summary = 'Export consumption data with details'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['format'] = { in: 'query', type: 'string', enum: ['json', 'csv'], default: 'json' }
    #swagger.parameters['dateFrom'] = { in: 'query', type: 'string', format: 'date' }
    #swagger.parameters['dateTo'] = { in: 'query', type: 'string', format: 'date' }
    #swagger.parameters['includeNutrition'] = { in: 'query', type: 'boolean', default: true }
    #swagger.parameters['includeItemDetails'] = { in: 'query', type: 'boolean', default: true }
    #swagger.responses[200] = { 
      description: 'Exported consumption data',
      content: {
        'application/json': { schema: { type: 'object' } },
        'text/csv': { schema: { type: 'string' } }
      }
    }
    #swagger.responses[403] = { description: 'Premium subscription required' }
  */
  AuthMiddleware.requirePremium,
  rateLimiter.exportData,
  ValidationMiddleware.validateExportParams,
  ConsumptionController.exportUnifiedData
);

// ========== HEALTH CHECK ==========

router.get('/health', (req, res) => {
  /* 
    #swagger.tags = ['Health']
    #swagger.summary = 'Consumption service health check'
    #swagger.responses[200] = { 
      description: 'Service health status',
      schema: { 
        type: 'object',
        properties: {
          status: { type: 'string', example: 'healthy' },
          service: { type: 'string', example: 'consumption-service-v2' },
          version: { type: 'string', example: '2.0.0' },
          features: {
            type: 'object',
            properties: {
              unifiedItemSupport: { type: 'boolean', example: true },
              foodIntegration: { type: 'boolean', example: true },
              recipeIntegration: { type: 'boolean', example: true }
            }
          }
        }
      }
    }
  */
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'consumption-service-v2',
    version: process.env.API_VERSION || '2.0.0',
    features: {
      unifiedItemSupport: true,
      foodIntegration: true,
      recipeIntegration: true,
      advancedAnalytics: true,
      crossModuleSync: true,
      migrationTools: true
    },
    supportedItemTypes: ['food', 'recipe'],
    integrations: {
      foodService: true,
      recipeService: true,
      userService: true
    }
  });
});

// === Add the rest of your existing routes without comments ===
// (All the other routes remain exactly as they were)

router.get('/stats/top-foods', ValidationMiddleware.validateStatsParams, ConsumptionController.getTopFoods);
router.get('/stats/top-recipes', ValidationMiddleware.validateStatsParams, ConsumptionController.getTopRecipes);
router.post('/entries/:entryId/recalculate', ValidationMiddleware.validateEntryId, AuthMiddleware.checkResourceOwnership('entryId', 'userId'), AuthMiddleware.logActivity('recalculate_nutrition'), ConsumptionController.recalculateNutrition);
router.post('/recommendations/missing-nutrients', AuthMiddleware.requirePremium, ValidationMiddleware.validateNutrientAnalysis, ConsumptionController.getMissingNutrientRecommendations);
router.post('/validate/food-exists/:foodId', ValidationMiddleware.validateObjectId('foodId'), ConsumptionController.validateFoodExists);
router.post('/validate/recipe-exists/:recipeId', ValidationMiddleware.validateObjectId('recipeId'), ConsumptionController.validateRecipeExists);
router.post('/sync/nutrition', AuthMiddleware.requirePro, ValidationMiddleware.validateSyncParams, ConsumptionController.syncNutritionData);
router.get('/reports/nutrition-sources', AuthMiddleware.requirePremium, ValidationMiddleware.validateReportParams, ConsumptionController.getNutritionSourcesReport);
router.get('/reports/recipe-usage', AuthMiddleware.requirePremium, ValidationMiddleware.validateReportParams, ConsumptionController.getRecipeUsageReport);
router.get('/reports/food-vs-recipe', AuthMiddleware.requirePro, ValidationMiddleware.validateReportParams, ConsumptionController.getFoodVsRecipeReport);
router.get('/export/by-type', AuthMiddleware.requirePremium, rateLimiter.exportData, ValidationMiddleware.validateExportParams, ConsumptionController.exportDataByType);
router.post('/batch/recalculate', AuthMiddleware.requirePro, rateLimiter.batchOperations, ValidationMiddleware.validateBatchIds, ConsumptionController.batchRecalculateNutrition);
router.post('/batch/convert-type', AuthMiddleware.requireAdmin, ValidationMiddleware.validateBatchConversion, ConsumptionController.batchConvertItemType);
router.post('/migration/schema', AuthMiddleware.requireAdmin, ValidationMiddleware.validateMigrationParams, ConsumptionController.triggerSchemaMigration);
router.get('/migration/status', AuthMiddleware.requireAdmin, ConsumptionController.getMigrationStatus);
router.post('/maintenance/cleanup-orphaned', AuthMiddleware.requireAdmin, ValidationMiddleware.validateCleanupParams, ConsumptionController.cleanupOrphanedEntries);
router.get('/admin/stats/item-types', AuthMiddleware.requireAdmin, ValidationMiddleware.validateDateRange, ConsumptionController.getGlobalItemTypeStats);
router.get('/admin/stats/migration', AuthMiddleware.requireAdmin, ConsumptionController.getMigrationStats);
router.get('/metadata', ConsumptionController.getServiceMetadata);

// ========== ERROR HANDLING ==========
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Consumption route not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    suggestion: 'Check API documentation for available endpoints',
    availableEndpoints: {
      creation: [
        'POST /entries',
        'POST /entries/food', 
        'POST /entries/recipe',
        'POST /meals/quick',
        'POST /meals/from-recipe/:recipeId'
      ],
      retrieval: [
        'GET /entries',
        'GET /entries/foods',
        'GET /entries/recipes',
        'GET /search'
      ],
      analytics: [
        'GET /dashboard',
        'GET /stats/top-items',
        'GET /stats/balance'
      ]
    }
  });
});

module.exports = router;