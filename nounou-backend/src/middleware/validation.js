const ApiResponse = require('../utils/responses');
const Validators = require('../utils/validators');
const mongoose = require('mongoose');

class ValidationMiddleware {
  // ====== USER VALIDATION METHODS (Using existing Joi schemas) ======

  static validateRegister(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.registerSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateLogin(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.loginSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateUpdateProfile(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.updateProfileSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateChangePassword(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.changePasswordSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validatePasswordReset(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.passwordResetSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateEmail(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.emailSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateAccountDeletion(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.accountDeletionSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateExportFormat(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.exportFormatSchema, req.query);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedQuery = data;
    next();
  }

  static validateDataDeletionRequest(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.dataDeletionRequestSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateSubscriptionUpgrade(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.subscriptionUpgradeSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateAICoachRequest(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.aiCoachRequestSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateUserStatusUpdate(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.userStatusUpdateSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateBulkUserAction(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.bulkUserActionSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateGoal(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.goalSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateSettings(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.settingsSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  // ====== CONSUMPTION VALIDATION METHODS (Using existing Joi schemas) ======

  static validateImageUpload(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.imageUploadSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateBarcodeData(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.barcodeDataSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateVoiceData(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.voiceDataSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  // ====== MISSING CONSUMPTION VALIDATION METHODS ======

  static validateFoodEntry(req, res, next) {
    const { itemId, foodId, quantity, unit, mealType } = req.body;

    // Support both new format (itemId) and legacy format (foodId)
    const actualFoodId = itemId || foodId;
    
    if (!actualFoodId) {
      return ApiResponse.error(res, 'Food ID (itemId or foodId) is required', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(actualFoodId)) {
      return ApiResponse.error(res, 'Invalid food ID format', 400);
    }

    if (!quantity || isNaN(quantity) || parseFloat(quantity) <= 0) {
      return ApiResponse.error(res, 'Valid quantity is required and must be positive', 400);
    }

    const validUnits = ['g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'oz', 'lb', 'piece'];
    if (unit && !validUnits.includes(unit)) {
      return ApiResponse.error(res, `Invalid unit. Allowed: ${validUnits.join(', ')}`, 400);
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return ApiResponse.error(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`, 400);
    }

    req.validatedData = {
      itemType: 'food',
      itemId: actualFoodId,
      quantity: parseFloat(quantity),
      unit: unit || 'g',
      mealType: mealType || 'other',
      ...req.body
    };

    next();
  }

  static validateRecipeEntry(req, res, next) {
    const { itemId, recipeId, servings, mealType } = req.body;

    // Support both new format (itemId) and legacy format (recipeId)
    const actualRecipeId = itemId || recipeId;
    
    if (!actualRecipeId) {
      return ApiResponse.error(res, 'Recipe ID (itemId or recipeId) is required', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(actualRecipeId)) {
      return ApiResponse.error(res, 'Invalid recipe ID format', 400);
    }

    if (!servings || isNaN(servings) || parseFloat(servings) <= 0) {
      return ApiResponse.error(res, 'Valid servings is required and must be positive', 400);
    }

    if (parseFloat(servings) > 10) {
      return ApiResponse.error(res, 'Servings cannot exceed 10', 400);
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return ApiResponse.error(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`, 400);
    }

    req.validatedData = {
      itemType: 'recipe',
      itemId: actualRecipeId,
      servings: parseFloat(servings),
      mealType: mealType || 'other',
      ...req.body
    };

    next();
  }

  static validateRecipeMeal(req, res, next) {
    const { servings, mealType, notes, includeIngredients } = req.body;

    if (!servings || isNaN(servings) || parseFloat(servings) <= 0) {
      return ApiResponse.error(res, 'Valid servings is required and must be positive', 400);
    }

    if (parseFloat(servings) > 10) {
      return ApiResponse.error(res, 'Servings cannot exceed 10', 400);
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return ApiResponse.error(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`, 400);
    }

    if (notes && typeof notes !== 'string') {
      return ApiResponse.error(res, 'Notes must be a string', 400);
    }

    if (notes && notes.length > 500) {
      return ApiResponse.error(res, 'Notes cannot exceed 500 characters', 400);
    }

    req.validatedData = {
      servings: parseFloat(servings),
      mealType: mealType || 'other',
      notes: notes ? notes.trim() : undefined,
      includeIngredients: includeIngredients === true,
      ...req.body
    };

    next();
  }

  static validateTextSearch(req, res, next) {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return ApiResponse.error(res, 'Search query (q) is required and must be a string', 400);
    }

    if (q.length < 2) {
      return ApiResponse.error(res, 'Search query must be at least 2 characters', 400);
    }

    if (q.length > 100) {
      return ApiResponse.error(res, 'Search query cannot exceed 100 characters', 400);
    }

    req.validatedQuery = {
      ...req.validatedQuery,
      search: q.trim()
    };

    next();
  }

  static validateDashboardParams(req, res, next) {
    const { period, includeComparison, includeGoals, includeInsights, weekOffset, monthOffset } = req.query;

    const validPeriods = ['today', 'week', 'month', 'year'];
    if (period && !validPeriods.includes(period)) {
      return ApiResponse.error(res, `Invalid period. Allowed: ${validPeriods.join(', ')}`, 400);
    }

    if (weekOffset && (isNaN(weekOffset) || parseInt(weekOffset) < -52 || parseInt(weekOffset) > 52)) {
      return ApiResponse.error(res, 'Week offset must be between -52 and 52', 400);
    }

    if (monthOffset && (isNaN(monthOffset) || parseInt(monthOffset) < -12 || parseInt(monthOffset) > 12)) {
      return ApiResponse.error(res, 'Month offset must be between -12 and 12', 400);
    }

    req.validatedQuery = {
      ...req.validatedQuery,
      period: period || 'today',
      includeComparison: includeComparison === 'true',
      includeGoals: includeGoals !== 'false',
      includeInsights: includeInsights === 'true',
      weekOffset: weekOffset ? parseInt(weekOffset) : 0,
      monthOffset: monthOffset ? parseInt(monthOffset) : 0
    };

    next();
  }

  static validateStatsParams(req, res, next) {
    const { limit, period, itemType, mealType } = req.query;

    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 50)) {
      return ApiResponse.error(res, 'Limit must be between 1 and 50', 400);
    }

    const validPeriods = ['today', 'week', 'month', 'year'];
    if (period && !validPeriods.includes(period)) {
      return ApiResponse.error(res, `Invalid period. Allowed: ${validPeriods.join(', ')}`, 400);
    }

    const validItemTypes = ['food', 'recipe'];
    if (itemType && !validItemTypes.includes(itemType)) {
      return ApiResponse.error(res, `Invalid item type. Allowed: ${validItemTypes.join(', ')}`, 400);
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return ApiResponse.error(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`, 400);
    }

    req.validatedQuery = {
      ...req.validatedQuery,
      limit: limit ? parseInt(limit) : 10,
      period: period || 'month',
      itemType,
      mealType
    };

    next();
  }

  static validateSuggestionParams(req, res, next) {
    const { mealType, limit, basedOn, timeOfDay } = req.query;

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return ApiResponse.error(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`, 400);
    }

    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 20)) {
      return ApiResponse.error(res, 'Limit must be between 1 and 20', 400);
    }

    const validBasedOn = ['history', 'goals', 'ingredients'];
    if (basedOn && !validBasedOn.includes(basedOn)) {
      return ApiResponse.error(res, `Invalid basedOn. Allowed: ${validBasedOn.join(', ')}`, 400);
    }

    req.validatedQuery = {
      ...req.validatedQuery,
      mealType,
      limit: limit ? parseInt(limit) : 10,
      basedOn: basedOn || 'history',
      timeOfDay
    };

    next();
  }

  static validateNutrientAnalysis(req, res, next) {
    const { targetNutrients, period } = req.body;

    if (targetNutrients && !Array.isArray(targetNutrients)) {
      return ApiResponse.error(res, 'Target nutrients must be an array', 400);
    }

    const validNutrients = ['protein', 'carbs', 'fat', 'fiber', 'calcium', 'iron', 'vitaminC', 'vitaminD'];
    if (targetNutrients && targetNutrients.some(n => !validNutrients.includes(n))) {
      return ApiResponse.error(res, `Invalid nutrients. Allowed: ${validNutrients.join(', ')}`, 400);
    }

    const validPeriods = ['today', 'week', 'month'];
    if (period && !validPeriods.includes(period)) {
      return ApiResponse.error(res, `Invalid period. Allowed: ${validPeriods.join(', ')}`, 400);
    }

    req.validatedData = {
      targetNutrients: targetNutrients || [],
      period: period || 'week'
    };

    next();
  }

  static validateSyncParams(req, res, next) {
    const { force, itemType, batchSize } = req.body;

    const validItemTypes = ['food', 'recipe'];
    if (itemType && !validItemTypes.includes(itemType)) {
      return ApiResponse.error(res, `Invalid item type. Allowed: ${validItemTypes.join(', ')}`, 400);
    }

    if (batchSize && (isNaN(batchSize) || parseInt(batchSize) < 1 || parseInt(batchSize) > 1000)) {
      return ApiResponse.error(res, 'Batch size must be between 1 and 1000', 400);
    }

    req.validatedData = {
      force: force === true,
      itemType,
      batchSize: batchSize ? parseInt(batchSize) : 100
    };

    next();
  }

  static validateReportParams(req, res, next) {
    const { period, includeComparison } = req.query;

    const validPeriods = ['week', 'month', 'quarter', 'year'];
    if (period && !validPeriods.includes(period)) {
      return ApiResponse.error(res, `Invalid period. Allowed: ${validPeriods.join(', ')}`, 400);
    }

    req.validatedQuery = {
      ...req.validatedQuery,
      period: period || 'month',
      includeComparison: includeComparison === 'true'
    };

    next();
  }

  static validateExportParams(req, res, next) {
    const { format, dateFrom, dateTo, includeNutrition, includeItemDetails, includeMetadata, limit } = req.query;

    const validFormats = ['json', 'csv', 'xlsx'];
    if (format && !validFormats.includes(format)) {
      return ApiResponse.error(res, `Invalid format. Allowed: ${validFormats.join(', ')}`, 400);
    }

    if (dateFrom && !ValidationMiddleware.isValidDate(dateFrom)) {
      return ApiResponse.error(res, 'Invalid dateFrom format', 400);
    }

    if (dateTo && !ValidationMiddleware.isValidDate(dateTo)) {
      return ApiResponse.error(res, 'Invalid dateTo format', 400);
    }

    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 50000)) {
      return ApiResponse.error(res, 'Limit must be between 1 and 50000', 400);
    }

    req.validatedQuery = {
      ...req.validatedQuery,
      format: format || 'json',
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      includeNutrition: includeNutrition !== 'false',
      includeItemDetails: includeItemDetails !== 'false',
      includeMetadata: includeMetadata === 'true',
      limit: limit ? parseInt(limit) : 10000
    };

    next();
  }

  static validateBatchIds(req, res, next) {
    const { entryIds } = req.body;

    if (!entryIds || !Array.isArray(entryIds)) {
      return ApiResponse.error(res, 'Entry IDs array is required', 400);
    }

    if (entryIds.length === 0) {
      return ApiResponse.error(res, 'Entry IDs array cannot be empty', 400);
    }

    if (entryIds.length > 100) {
      return ApiResponse.error(res, 'Cannot process more than 100 entries at once', 400);
    }

    const invalidIds = entryIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return ApiResponse.error(res, `Invalid entry IDs: ${invalidIds.join(', ')}`, 400);
    }

    req.validatedData = {
      entryIds,
      ...req.body
    };

    next();
  }

  static validateBatchConversion(req, res, next) {
    const { entryIds, fromType, toType, conversionData } = req.body;

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return ApiResponse.error(res, 'Entry IDs array is required and cannot be empty', 400);
    }

    const validTypes = ['food', 'recipe'];
    if (!fromType || !validTypes.includes(fromType)) {
      return ApiResponse.error(res, `Invalid fromType. Allowed: ${validTypes.join(', ')}`, 400);
    }

    if (!toType || !validTypes.includes(toType)) {
      return ApiResponse.error(res, `Invalid toType. Allowed: ${validTypes.join(', ')}`, 400);
    }

    if (fromType === toType) {
      return ApiResponse.error(res, 'fromType and toType cannot be the same', 400);
    }

    req.validatedData = {
      entryIds,
      fromType,
      toType,
      conversionData: conversionData || {},
      ...req.body
    };

    next();
  }

  static validateMigrationParams(req, res, next) {
    const { dryRun, batchSize, backupFirst } = req.body;

    if (batchSize && (isNaN(batchSize) || parseInt(batchSize) < 1 || parseInt(batchSize) > 1000)) {
      return ApiResponse.error(res, 'Batch size must be between 1 and 1000', 400);
    }

    req.validatedData = {
      dryRun: dryRun !== false,
      batchSize: batchSize ? parseInt(batchSize) : 100,
      backupFirst: backupFirst !== false
    };

    next();
  }

  static validateCleanupParams(req, res, next) {
    const { olderThan, includeOrphaned, dryRun, maxEntries } = req.body;

    if (olderThan && !ValidationMiddleware.isValidDate(olderThan)) {
      return ApiResponse.error(res, 'Invalid olderThan date format', 400);
    }

    if (maxEntries && (isNaN(maxEntries) || parseInt(maxEntries) < 1 || parseInt(maxEntries) > 10000)) {
      return ApiResponse.error(res, 'Max entries must be between 1 and 10000', 400);
    }

    req.validatedData = {
      olderThan: olderThan ? new Date(olderThan) : undefined,
      includeOrphaned: includeOrphaned === true,
      dryRun: dryRun !== false,
      maxEntries: maxEntries ? parseInt(maxEntries) : 1000
    };

    next();
  }

  static validateQueryFilters(req, res, next) {
    // This combines validateConsumptionFilters with additional query validation
    ValidationMiddleware.validateConsumptionFilters(req, res, () => {
      const { search, sortBy, sortOrder, includeDeleted } = req.query;

      if (search && search.length > 0 && search.length < 2) {
        return ApiResponse.error(res, 'Search term must be at least 2 characters', 400);
      }

      const validSortFields = ['consumedAt', 'createdAt', 'mealType', 'calories', 'foodName'];
      if (sortBy && !validSortFields.includes(sortBy)) {
        return ApiResponse.error(res, `Invalid sortBy. Allowed: ${validSortFields.join(', ')}`, 400);
      }

      const validSortOrders = ['asc', 'desc', '1', '-1'];
      if (sortOrder && !validSortOrders.includes(sortOrder)) {
        return ApiResponse.error(res, `Invalid sortOrder. Allowed: ${validSortOrders.join(', ')}`, 400);
      }

      req.validatedQuery = {
        ...req.validatedQuery,
        search: search ? search.trim() : undefined,
        sortBy: sortBy || 'consumedAt',
        sortOrder: ['desc', '-1'].includes(sortOrder) ? 'desc' : 'asc',
        includeDeleted: includeDeleted === 'true'
      };

      next();
    });
  }  

  static validateGoalProgress(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.goalProgressSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateSharingOptions(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.sharingOptionsSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateDataCleanupOptions(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.dataCleanupOptionsSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  // ====== SIMPLE VALIDATION METHODS FOR CONSUMPTION ======

  static validateConsumptionEntry(req, res, next) {
    const { foodName, quantity, mealType, calories } = req.body;

    if (!foodName || typeof foodName !== 'string') {
      return ApiResponse.error(res, 'Food name is required', 400);
    }

    if (!quantity || isNaN(quantity) || parseFloat(quantity) <= 0) {
      return ApiResponse.error(res, 'Valid quantity is required', 400);
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return ApiResponse.error(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`, 400);
    }

    if (calories && (isNaN(calories) || parseFloat(calories) < 0)) {
      return ApiResponse.error(res, 'Calories must be a positive number', 400);
    }

    req.validatedData = {
      foodName: foodName.trim(),
      quantity: parseFloat(quantity),
      mealType: mealType || 'other',
      calories: calories ? parseFloat(calories) : undefined,
      ...req.body
    };

    next();
  }

  static validateUpdateEntry(req, res, next) {
    const { foodName, quantity, mealType, calories } = req.body;

    if (foodName && typeof foodName !== 'string') {
      return ApiResponse.error(res, 'Food name must be a string', 400);
    }

    if (quantity && (isNaN(quantity) || parseFloat(quantity) <= 0)) {
      return ApiResponse.error(res, 'Quantity must be a positive number', 400);
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return ApiResponse.error(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`, 400);
    }

    if (calories && (isNaN(calories) || parseFloat(calories) < 0)) {
      return ApiResponse.error(res, 'Calories must be a positive number', 400);
    }

    req.validatedData = {
      ...(foodName && { foodName: foodName.trim() }),
      ...(quantity && { quantity: parseFloat(quantity) }),
      ...(mealType && { mealType }),
      ...(calories && { calories: parseFloat(calories) }),
      ...req.body
    };

    next();
  }

  static validateQuickMeal(req, res, next) {
    const { foods, mealType, recipeName } = req.body;

    if (!foods || !Array.isArray(foods) || foods.length === 0) {
      return ApiResponse.error(res, 'Foods array is required and cannot be empty', 400);
    }

    if (foods.length > 20) {
      return ApiResponse.error(res, 'Cannot add more than 20 foods in one meal', 400);
    }

    // Validate each food item
    for (let i = 0; i < foods.length; i++) {
      const food = foods[i];
      if (!food.foodName || !food.quantity) {
        return ApiResponse.error(res, `Food item ${i + 1} must have foodName and quantity`, 400);
      }
      if (isNaN(food.quantity) || parseFloat(food.quantity) <= 0) {
        return ApiResponse.error(res, `Food item ${i + 1} quantity must be a positive number`, 400);
      }
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return ApiResponse.error(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`, 400);
    }

    if (recipeName && typeof recipeName !== 'string') {
      return ApiResponse.error(res, 'Recipe name must be a string', 400);
    }

    req.validatedData = {
      foods: foods.map(food => ({
        foodName: food.foodName.trim(),
        quantity: parseFloat(food.quantity),
        ...food
      })),
      mealType: mealType || 'other',
      ...(recipeName && { recipeName: recipeName.trim() }),
      ...req.body
    };

    next();
  }

  static sanitizeNutritionData(req, res, next) {
    if (req.validatedData && req.validatedData.nutrition) {
      const nutrition = req.validatedData.nutrition;
      
      // Ensure all nutrition values are positive numbers
      Object.keys(nutrition).forEach(key => {
        if (typeof nutrition[key] === 'number' && nutrition[key] < 0) {
          nutrition[key] = 0;
        }
        if (typeof nutrition[key] === 'string' && !isNaN(nutrition[key])) {
          nutrition[key] = Math.max(0, parseFloat(nutrition[key]));
        }
      });

      req.validatedData.nutrition = nutrition;
    }

    next();
  }

  // ====== COMMON VALIDATION METHODS ======

  // MongoDB ObjectId validation
  static validateObjectId(paramName) {
    return (req, res, next) => {
      const value = req.params[paramName];
      
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return ApiResponse.error(res, `Invalid ${paramName} format. Expected MongoDB ObjectId.`, 400);
      }
      
      next();
    };
  }

  // Validate multiple ObjectIds (for batch operations)
  static validateObjectIds(paramName) {
    return (req, res, next) => {
      const values = req.body[paramName];
      
      if (!Array.isArray(values)) {
        return ApiResponse.error(res, `${paramName} must be an array`, 400);
      }

      if (values.length === 0) {
        return ApiResponse.error(res, `${paramName} cannot be empty`, 400);
      }

      if (values.length > 100) {
        return ApiResponse.error(res, `${paramName} cannot contain more than 100 items`, 400);
      }

      const invalidIds = values.filter(id => !mongoose.Types.ObjectId.isValid(id));
      
      if (invalidIds.length > 0) {
        return ApiResponse.error(res, `Invalid ObjectId format in ${paramName}: ${invalidIds.join(', ')}`, 400);
      }
      
      next();
    };
  }

  // Commonly used ID validations
  static validateUserId(req, res, next) {
    return ValidationMiddleware.validateObjectId('userId')(req, res, next);
  }

  static validateEntryId(req, res, next) {
    return ValidationMiddleware.validateObjectId('entryId')(req, res, next);
  }

  static validateGoalId(req, res, next) {
    return ValidationMiddleware.validateObjectId('goalId')(req, res, next);
  }

  static validateSessionId(req, res, next) {
    return ValidationMiddleware.validateObjectId('sessionId')(req, res, next);
  }

  // Generic ObjectId validation with custom field name
  static validateId(fieldName = 'id') {
    return (req, res, next) => {
      return ValidationMiddleware.validateObjectId(fieldName)(req, res, next);
    };
  }

  // Validate pagination parameters
  static validatePagination(req, res, next) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (page < 1) {
      return ApiResponse.error(res, 'Page must be greater than 0', 400);
    }

    if (limit < 1 || limit > 100) {
      return ApiResponse.error(res, 'Limit must be between 1 and 100', 400);
    }

    req.validatedQuery = {
      ...req.validatedQuery,
      page,
      limit,
      skip: (page - 1) * limit
    };

    next();
  }

  // Validate date range parameters
  static validateDateRange(req, res, next) {
    const { dateFrom, dateTo } = req.query;

    if (dateFrom && !ValidationMiddleware.isValidDate(dateFrom)) {
      return ApiResponse.error(res, 'Invalid dateFrom format. Use ISO 8601 format.', 400);
    }

    if (dateTo && !ValidationMiddleware.isValidDate(dateTo)) {
      return ApiResponse.error(res, 'Invalid dateTo format. Use ISO 8601 format.', 400);
    }

    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      return ApiResponse.error(res, 'dateFrom must be before dateTo', 400);
    }

    // Validate date range is not too large (max 1 year)
    if (dateFrom && dateTo) {
      const daysDiff = Math.abs(new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        return ApiResponse.error(res, 'Date range cannot exceed 365 days', 400);
      }
    }

    req.validatedQuery = {
      ...req.validatedQuery,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined
    };

    next();
  }

  // Validate sort parameters
  static validateSort(allowedFields = []) {
    return (req, res, next) => {
      const { sortBy, sortOrder } = req.query;

      if (sortBy && !allowedFields.includes(sortBy)) {
        return ApiResponse.error(res, `Invalid sortBy field. Allowed: ${allowedFields.join(', ')}`, 400);
      }

      if (sortOrder && !['asc', 'desc', '1', '-1'].includes(sortOrder)) {
        return ApiResponse.error(res, 'Invalid sortOrder. Use: asc, desc, 1, or -1', 400);
      }

      req.validatedQuery = {
        ...req.validatedQuery,
        sortBy: sortBy || allowedFields[0] || 'createdAt',
        sortOrder: ['desc', '-1'].includes(sortOrder) ? -1 : 1
      };

      next();
    };
  }

  // Validate search query
  static validateSearch(req, res, next) {
    const { q } = req.query;

    if (q && typeof q !== 'string') {
      return ApiResponse.error(res, 'Search query must be a string', 400);
    }

    if (q && q.length < 2) {
      return ApiResponse.error(res, 'Search query must be at least 2 characters', 400);
    }

    if (q && q.length > 100) {
      return ApiResponse.error(res, 'Search query cannot exceed 100 characters', 400);
    }

    req.validatedQuery = {
      ...req.validatedQuery,
      search: q ? q.trim() : undefined
    };

    next();
  }

  // Validate filter parameters for consumption entries
  static validateConsumptionFilters(req, res, next) {
    const { mealType, entryMethod, tags, minCalories, maxCalories } = req.query;

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    const validEntryMethods = ['barcode_scan', 'image_analysis', 'manual', 'recipe', 'voice'];

    if (mealType && !validMealTypes.includes(mealType)) {
      return ApiResponse.error(res, `Invalid mealType. Allowed: ${validMealTypes.join(', ')}`, 400);
    }

    if (entryMethod && !validEntryMethods.includes(entryMethod)) {
      return ApiResponse.error(res, `Invalid entryMethod. Allowed: ${validEntryMethods.join(', ')}`, 400);
    }

    if (minCalories && (isNaN(minCalories) || parseFloat(minCalories) < 0)) {
      return ApiResponse.error(res, 'minCalories must be a positive number', 400);
    }

    if (maxCalories && (isNaN(maxCalories) || parseFloat(maxCalories) < 0)) {
      return ApiResponse.error(res, 'maxCalories must be a positive number', 400);
    }

    if (minCalories && maxCalories && parseFloat(minCalories) > parseFloat(maxCalories)) {
      return ApiResponse.error(res, 'minCalories must be less than maxCalories', 400);
    }

    let validatedTags = undefined;
    if (tags) {
      validatedTags = Array.isArray(tags) ? tags : tags.split(',');
      validatedTags = validatedTags.map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    req.validatedQuery = {
      ...req.validatedQuery,
      mealType,
      entryMethod,
      tags: validatedTags,
      minCalories: minCalories ? parseFloat(minCalories) : undefined,
      maxCalories: maxCalories ? parseFloat(maxCalories) : undefined
    };

    next();
  }

  // Validate subscription type in requests
  static validateSubscriptionType(req, res, next) {
    const { subscriptionType } = req.body;
    const validTypes = ['free', 'premium', 'pro'];

    if (subscriptionType && !validTypes.includes(subscriptionType)) {
      return ApiResponse.error(res, `Invalid subscription type. Allowed: ${validTypes.join(', ')}`, 400);
    }

    next();
  }

  // Validate request body size for batch operations
  static validateBatchSize(maxItems = 50) {
    return (req, res, next) => {
      const items = req.body.items || req.body.entries || req.body.ids || [];
      
      if (!Array.isArray(items)) {
        return ApiResponse.error(res, 'Batch operation requires an array', 400);
      }

      if (items.length === 0) {
        return ApiResponse.error(res, 'Batch operation requires at least one item', 400);
      }

      if (items.length > maxItems) {
        return ApiResponse.error(res, `Batch operation limited to ${maxItems} items`, 400);
      }

      next();
    };
  }

  // Helper method to check if date string is valid
  static isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Validate that user can only access their own resources
  static validateResourceOwnership(req, res, next) {
    const resourceUserId = req.params.userId || req.body.userId;
    const currentUserId = req.user.id;

    // Admin can access any resource
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
    }

    // User can only access their own resources
    if (resourceUserId && resourceUserId !== currentUserId) {
      return ApiResponse.forbiddenError(res, 'You can only access your own resources');
    }

    next();
  }

  // Express-async-errors compatibility wrapper
  static asyncValidation(validationFn) {
    return async (req, res, next) => {
      try {
        await validationFn(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  }
}

// Deprecated method for backward compatibility
ValidationMiddleware.validateUUID = (paramName) => {
  console.warn(`DEPRECATED: validateUUID is deprecated. Use validateObjectId('${paramName}') instead.`);
  return ValidationMiddleware.validateObjectId(paramName);
};

module.exports = ValidationMiddleware;