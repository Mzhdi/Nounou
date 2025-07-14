const ApiResponse = require('../utils/responses');
const mongoose = require('mongoose');

// ========================================
// CONSUMPTION VALIDATION MIDDLEWARE CLASS
// ========================================

class ConsumptionValidation {
  
  // ========================================
  // VALIDATIONS UNIFIÉES FOOD + RECIPE
  // ========================================

  static validateConsumptionEntry(req, res, next) {
    const { 
      itemType, itemId, foodId, recipeId,
      quantity, servings, unit, mealType, 
      notes, tags, rating, mood 
    } = req.body;

    // Validation de l'identification de l'item
    if (!itemType && !foodId && !recipeId) {
      return ApiResponse.error(res, 'Either itemType+itemId, foodId, or recipeId is required', 400);
    }

    // Validation pour itemType + itemId
    if (itemType) {
      if (!['food', 'recipe'].includes(itemType)) {
        return ApiResponse.error(res, 'itemType must be either "food" or "recipe"', 400);
      }

      if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
        return ApiResponse.error(res, 'Valid itemId is required when itemType is provided', 400);
      }
    }

    // Validation pour foodId legacy
    if (foodId && !mongoose.Types.ObjectId.isValid(foodId)) {
      return ApiResponse.error(res, 'Invalid foodId format', 400);
    }

    // Validation pour recipeId
    if (recipeId && !mongoose.Types.ObjectId.isValid(recipeId)) {
      return ApiResponse.error(res, 'Invalid recipeId format', 400);
    }

    // Validation conditionnelle selon le type
    const effectiveType = itemType || (foodId ? 'food' : 'recipe');

    if (effectiveType === 'food') {
      if (!quantity || isNaN(quantity) || parseFloat(quantity) <= 0) {
        return ApiResponse.error(res, 'Valid positive quantity is required for food items', 400);
      }

      const validUnits = ['g', 'kg', 'ml', 'l', 'piece', 'cup', 'tbsp', 'tsp', 'oz', 'lb'];
      if (unit && !validUnits.includes(unit)) {
        return ApiResponse.error(res, `Invalid unit. Allowed: ${validUnits.join(', ')}`, 400);
      }
    }

    if (effectiveType === 'recipe') {
      if (!servings || isNaN(servings) || parseFloat(servings) <= 0) {
        return ApiResponse.error(res, 'Valid positive servings count is required for recipe items', 400);
      }

      if (servings > 20) {
        return ApiResponse.error(res, 'Servings cannot exceed 20 per entry', 400);
      }
    }

    // Validation des champs communs
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return ApiResponse.error(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`, 400);
    }

    if (notes && typeof notes !== 'string') {
      return ApiResponse.error(res, 'Notes must be a string', 400);
    }

    if (notes && notes.length > 1000) {
      return ApiResponse.error(res, 'Notes cannot exceed 1000 characters', 400);
    }

    if (tags && !Array.isArray(tags)) {
      return ApiResponse.error(res, 'Tags must be an array', 400);
    }

    if (tags && tags.length > 10) {
      return ApiResponse.error(res, 'Cannot have more than 10 tags', 400);
    }

    if (rating && (isNaN(rating) || rating < 1 || rating > 5)) {
      return ApiResponse.error(res, 'Rating must be between 1 and 5', 400);
    }

    const validMoods = ['happy', 'satisfied', 'neutral', 'disappointed'];
    if (mood && !validMoods.includes(mood)) {
      return ApiResponse.error(res, `Invalid mood. Allowed: ${validMoods.join(', ')}`, 400);
    }

    // Nettoyer et structurer les données validées
    req.validatedData = {
      ...(itemType && { itemType }),
      ...(itemId && { itemId }),
      ...(foodId && { foodId }),
      ...(recipeId && { recipeId }),
      ...(quantity && { quantity: parseFloat(quantity) }),
      ...(servings && { servings: parseFloat(servings) }),
      ...(unit && { unit }),
      mealType: mealType || 'other',
      ...(notes && { notes: notes.trim() }),
      ...(tags && { tags: tags.map(tag => tag.toString().trim().toLowerCase()) }),
      ...(rating && { rating: parseInt(rating) }),
      ...(mood && { mood }),
      ...req.body
    };

    next();
  }

  static validateFoodEntry(req, res, next) {
    const { foodId, itemId, quantity, unit } = req.body;

    // Support both foodId (legacy) and itemId (new)
    const actualFoodId = itemId || foodId;

    if (!actualFoodId || !mongoose.Types.ObjectId.isValid(actualFoodId)) {
      return ApiResponse.error(res, 'Valid foodId or itemId is required', 400);
    }

    if (!quantity || isNaN(quantity) || parseFloat(quantity) <= 0) {
      return ApiResponse.error(res, 'Valid positive quantity is required', 400);
    }

    const validUnits = ['g', 'kg', 'ml', 'l', 'piece', 'cup', 'tbsp', 'tsp', 'oz', 'lb'];
    if (!unit || !validUnits.includes(unit)) {
      return ApiResponse.error(res, `Valid unit is required. Allowed: ${validUnits.join(', ')}`, 400);
    }

    req.validatedData = {
      itemType: 'food',
      itemId: actualFoodId,
      quantity: parseFloat(quantity),
      unit,
      ...req.body
    };

    next();
  }

  static validateRecipeEntry(req, res, next) {
    const { recipeId, itemId, servings } = req.body;

    // Support both recipeId (legacy) and itemId (new)
    const actualRecipeId = itemId || recipeId;

    if (!actualRecipeId || !mongoose.Types.ObjectId.isValid(actualRecipeId)) {
      return ApiResponse.error(res, 'Valid recipeId or itemId is required', 400);
    }

    if (!servings || isNaN(servings) || parseFloat(servings) <= 0) {
      return ApiResponse.error(res, 'Valid positive servings count is required', 400);
    }

    if (servings > 20) {
      return ApiResponse.error(res, 'Servings cannot exceed 20 per entry', 400);
    }

    req.validatedData = {
      itemType: 'recipe',
      itemId: actualRecipeId,
      servings: parseFloat(servings),
      ...req.body
    };

    next();
  }

  static validateUpdateEntry(req, res, next) {
    const { 
      quantity, servings, unit, mealType, 
      notes, tags, rating, mood, consumedAt 
    } = req.body;

    if (quantity !== undefined) {
      if (isNaN(quantity) || parseFloat(quantity) <= 0) {
        return ApiResponse.error(res, 'Quantity must be a positive number', 400);
      }
    }

    if (servings !== undefined) {
      if (isNaN(servings) || parseFloat(servings) <= 0) {
        return ApiResponse.error(res, 'Servings must be a positive number', 400);
      }
      if (servings > 20) {
        return ApiResponse.error(res, 'Servings cannot exceed 20', 400);
      }
    }

    const validUnits = ['g', 'kg', 'ml', 'l', 'piece', 'cup', 'tbsp', 'tsp', 'oz', 'lb'];
    if (unit && !validUnits.includes(unit)) {
      return ApiResponse.error(res, `Invalid unit. Allowed: ${validUnits.join(', ')}`, 400);
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return ApiResponse.error(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`, 400);
    }

    if (notes && (typeof notes !== 'string' || notes.length > 1000)) {
      return ApiResponse.error(res, 'Notes must be a string with max 1000 characters', 400);
    }

    if (tags && (!Array.isArray(tags) || tags.length > 10)) {
      return ApiResponse.error(res, 'Tags must be an array with max 10 items', 400);
    }

    if (rating && (isNaN(rating) || rating < 1 || rating > 5)) {
      return ApiResponse.error(res, 'Rating must be between 1 and 5', 400);
    }

    const validMoods = ['happy', 'satisfied', 'neutral', 'disappointed'];
    if (mood && !validMoods.includes(mood)) {
      return ApiResponse.error(res, `Invalid mood. Allowed: ${validMoods.join(', ')}`, 400);
    }

    if (consumedAt && isNaN(new Date(consumedAt).getTime())) {
      return ApiResponse.error(res, 'Invalid consumedAt date format', 400);
    }

    req.validatedData = {
      ...(quantity !== undefined && { quantity: parseFloat(quantity) }),
      ...(servings !== undefined && { servings: parseFloat(servings) }),
      ...(unit && { unit }),
      ...(mealType && { mealType }),
      ...(notes && { notes: notes.trim() }),
      ...(tags && { tags: tags.map(tag => tag.toString().trim().toLowerCase()) }),
      ...(rating && { rating: parseInt(rating) }),
      ...(mood && { mood }),
      ...(consumedAt && { consumedAt: new Date(consumedAt) }),
      ...req.body
    };

    next();
  }

  static validateQuickMeal(req, res, next) {
    const { items, mealType, mealName, mealNotes, tags } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return ApiResponse.error(res, 'Items array is required and cannot be empty', 400);
    }

    if (items.length > 20) {
      return ApiResponse.error(res, 'Cannot add more than 20 items in one meal', 400);
    }

    // Valider chaque item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (!item.itemType && !item.foodId && !item.recipeId) {
        return ApiResponse.error(res, `Item ${i + 1}: itemType+itemId, foodId, or recipeId is required`, 400);
      }

      if (item.itemType && !['food', 'recipe'].includes(item.itemType)) {
        return ApiResponse.error(res, `Item ${i + 1}: itemType must be "food" or "recipe"`, 400);
      }

      if (item.itemId && !mongoose.Types.ObjectId.isValid(item.itemId)) {
        return ApiResponse.error(res, `Item ${i + 1}: invalid itemId format`, 400);
      }

      if (item.foodId && !mongoose.Types.ObjectId.isValid(item.foodId)) {
        return ApiResponse.error(res, `Item ${i + 1}: invalid foodId format`, 400);
      }

      if (item.recipeId && !mongoose.Types.ObjectId.isValid(item.recipeId)) {
        return ApiResponse.error(res, `Item ${i + 1}: invalid recipeId format`, 400);
      }

      const effectiveType = item.itemType || (item.foodId ? 'food' : 'recipe');

      if (effectiveType === 'food') {
        if (!item.quantity || item.quantity <= 0) {
          return ApiResponse.error(res, `Item ${i + 1}: valid quantity required for food`, 400);
        }
      }

      if (effectiveType === 'recipe') {
        if (!item.servings || item.servings <= 0) {
          return ApiResponse.error(res, `Item ${i + 1}: valid servings required for recipe`, 400);
        }
      }
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return ApiResponse.error(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`, 400);
    }

    if (mealName && (typeof mealName !== 'string' || mealName.length > 200)) {
      return ApiResponse.error(res, 'Meal name must be a string with max 200 characters', 400);
    }

    if (mealNotes && (typeof mealNotes !== 'string' || mealNotes.length > 1000)) {
      return ApiResponse.error(res, 'Meal notes must be a string with max 1000 characters', 400);
    }

    if (tags && (!Array.isArray(tags) || tags.length > 10)) {
      return ApiResponse.error(res, 'Tags must be an array with max 10 items', 400);
    }

    req.validatedData = {
      items: items.map(item => ({
        ...item,
        ...(item.quantity && { quantity: parseFloat(item.quantity) }),
        ...(item.servings && { servings: parseFloat(item.servings) })
      })),
      mealType: mealType || 'other',
      ...(mealName && { mealName: mealName.trim() }),
      ...(mealNotes && { mealNotes: mealNotes.trim() }),
      ...(tags && { tags: tags.map(tag => tag.toString().trim().toLowerCase()) }),
      ...req.body
    };

    next();
  }

  static validateRecipeMeal(req, res, next) {
    const { servings, mealType, notes } = req.body;

    if (!servings || isNaN(servings) || parseFloat(servings) <= 0) {
      return ApiResponse.error(res, 'Valid positive servings count is required', 400);
    }

    if (servings > 20) {
      return ApiResponse.error(res, 'Servings cannot exceed 20', 400);
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return ApiResponse.error(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`, 400);
    }

    if (notes && (typeof notes !== 'string' || notes.length > 1000)) {
      return ApiResponse.error(res, 'Notes must be a string with max 1000 characters', 400);
    }

    req.validatedData = {
      servings: parseFloat(servings),
      mealType: mealType || 'other',
      ...(notes && { notes: notes.trim() }),
      ...req.body
    };

    next();
  }

  // ========================================
  // VALIDATIONS DES FILTRES ET REQUÊTES
  // ========================================

  static validateQueryFilters(req, res, next) {
    const { 
      mealType, itemType, entryMethod, tags, 
      minCalories, maxCalories, dateFrom, dateTo 
    } = req.query;

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return ApiResponse.error(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`, 400);
    }

    const validItemTypes = ['food', 'recipe'];
    if (itemType && !validItemTypes.includes(itemType)) {
      return ApiResponse.error(res, `Invalid item type. Allowed: ${validItemTypes.join(', ')}`, 400);
    }

    const validEntryMethods = ['manual', 'barcode_scan', 'image_analysis', 'voice', 'recipe', 'quick_meal'];
    if (entryMethod && !validEntryMethods.includes(entryMethod)) {
      return ApiResponse.error(res, `Invalid entry method. Allowed: ${validEntryMethods.join(', ')}`, 400);
    }

    if (tags && typeof tags !== 'string') {
      return ApiResponse.error(res, 'Tags must be a comma-separated string', 400);
    }

    if (minCalories && (isNaN(minCalories) || parseFloat(minCalories) < 0)) {
      return ApiResponse.error(res, 'minCalories must be a non-negative number', 400);
    }

    if (maxCalories && (isNaN(maxCalories) || parseFloat(maxCalories) < 0)) {
      return ApiResponse.error(res, 'maxCalories must be a non-negative number', 400);
    }

    if (minCalories && maxCalories && parseFloat(minCalories) > parseFloat(maxCalories)) {
      return ApiResponse.error(res, 'minCalories cannot be greater than maxCalories', 400);
    }

    if (dateFrom && isNaN(new Date(dateFrom).getTime())) {
      return ApiResponse.error(res, 'Invalid dateFrom format', 400);
    }

    if (dateTo && isNaN(new Date(dateTo).getTime())) {
      return ApiResponse.error(res, 'Invalid dateTo format', 400);
    }

    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      return ApiResponse.error(res, 'dateFrom cannot be after dateTo', 400);
    }

    next();
  }

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

  static validateDateRange(req, res, next) {
    const { dateFrom, dateTo } = req.query;

    if (dateFrom && isNaN(new Date(dateFrom).getTime())) {
      return ApiResponse.error(res, 'Invalid dateFrom format. Use ISO 8601 format.', 400);
    }

    if (dateTo && isNaN(new Date(dateTo).getTime())) {
      return ApiResponse.error(res, 'Invalid dateTo format. Use ISO 8601 format.', 400);
    }

    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      return ApiResponse.error(res, 'dateFrom must be before dateTo', 400);
    }

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

  static validateObjectId(paramName) {
    return (req, res, next) => {
      const value = req.params[paramName];
      
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return ApiResponse.error(res, `Invalid ${paramName} format. Expected MongoDB ObjectId.`, 400);
      }
      
      next();
    };
  }

  static validateEntryId(req, res, next) {
    return ConsumptionValidation.validateObjectId('entryId')(req, res, next);
  }

  static validateBatchIds(req, res, next) {
    const { entryIds } = req.body;

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return ApiResponse.error(res, 'Entry IDs array is required', 400);
    }

    if (entryIds.length > 50) {
      return ApiResponse.error(res, 'Cannot process more than 50 entries at once', 400);
    }

    const invalidIds = entryIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return ApiResponse.error(res, `Invalid entry IDs: ${invalidIds.join(', ')}`, 400);
    }

    next();
  }

  // ========================================
  // VALIDATIONS DES PARAMÈTRES D'ANALYTICS
  // ========================================

  static validateDashboardParams(req, res, next) {
    const { period, includeBreakdown, includeGoals, weekOffset, monthOffset } = req.query;

    const validPeriods = ['today', 'week', 'month', 'year'];
    if (period && !validPeriods.includes(period)) {
      return ApiResponse.error(res, `Invalid period. Allowed: ${validPeriods.join(', ')}`, 400);
    }

    if (includeBreakdown && !['true', 'false'].includes(includeBreakdown)) {
      return ApiResponse.error(res, 'includeBreakdown must be true or false', 400);
    }

    if (includeGoals && !['true', 'false'].includes(includeGoals)) {
      return ApiResponse.error(res, 'includeGoals must be true or false', 400);
    }

    if (weekOffset && (isNaN(weekOffset) || Math.abs(parseInt(weekOffset)) > 52)) {
      return ApiResponse.error(res, 'weekOffset must be a number between -52 and 52', 400);
    }

    if (monthOffset && (isNaN(monthOffset) || Math.abs(parseInt(monthOffset)) > 12)) {
      return ApiResponse.error(res, 'monthOffset must be a number between -12 and 12', 400);
    }

    next();
  }

  static validateStatsParams(req, res, next) {
    const { period, limit, itemType, mealType } = req.query;

    const validPeriods = ['week', 'month', 'year', 'all'];
    if (period && !validPeriods.includes(period)) {
      return ApiResponse.error(res, `Invalid period. Allowed: ${validPeriods.join(', ')}`, 400);
    }

    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
      return ApiResponse.error(res, 'Limit must be between 1 and 100', 400);
    }

    const validItemTypes = ['food', 'recipe'];
    if (itemType && !validItemTypes.includes(itemType)) {
      return ApiResponse.error(res, `Invalid item type. Allowed: ${validItemTypes.join(', ')}`, 400);
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return ApiResponse.error(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`, 400);
    }

    next();
  }

  static validateSuggestionParams(req, res, next) {
    const { mealType, limit, basedOn } = req.query;

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return ApiResponse.error(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`, 400);
    }

    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 50)) {
      return ApiResponse.error(res, 'Limit must be between 1 and 50', 400);
    }

    const validBasedOn = ['history', 'goals', 'ingredients', 'time_pattern'];
    if (basedOn && !validBasedOn.includes(basedOn)) {
      return ApiResponse.error(res, `Invalid basedOn. Allowed: ${validBasedOn.join(', ')}`, 400);
    }

    next();
  }

  // ========================================
  // VALIDATIONS D'EXPORT ET RAPPORTS
  // ========================================

  static validateExportParams(req, res, next) {
    const { 
      format, includeNutrition, includeItemDetails, 
      includeMetadata, dateFrom, dateTo 
    } = req.query;

    const validFormats = ['json', 'csv', 'xlsx'];
    if (format && !validFormats.includes(format)) {
      return ApiResponse.error(res, `Invalid format. Allowed: ${validFormats.join(', ')}`, 400);
    }

    if (includeNutrition && !['true', 'false'].includes(includeNutrition)) {
      return ApiResponse.error(res, 'includeNutrition must be true or false', 400);
    }

    if (includeItemDetails && !['true', 'false'].includes(includeItemDetails)) {
      return ApiResponse.error(res, 'includeItemDetails must be true or false', 400);
    }

    if (includeMetadata && !['true', 'false'].includes(includeMetadata)) {
      return ApiResponse.error(res, 'includeMetadata must be true or false', 400);
    }

    if (dateFrom && isNaN(new Date(dateFrom).getTime())) {
      return ApiResponse.error(res, 'Invalid dateFrom format', 400);
    }

    if (dateTo && isNaN(new Date(dateTo).getTime())) {
      return ApiResponse.error(res, 'Invalid dateTo format', 400);
    }

    if (dateFrom && dateTo) {
      const daysDiff = (new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        return ApiResponse.error(res, 'Export period cannot exceed 365 days', 400);
      }
    }

    next();
  }

  static validateReportParams(req, res, next) {
    const { 
      period, reportType, includeComparison, 
      includeInsights, dateFrom, dateTo 
    } = req.query;

    const validPeriods = ['week', 'month', 'quarter', 'year', 'custom'];
    if (period && !validPeriods.includes(period)) {
      return ApiResponse.error(res, `Invalid period. Allowed: ${validPeriods.join(', ')}`, 400);
    }

    const validReportTypes = ['nutrition-sources', 'recipe-usage', 'food-vs-recipe', 'comprehensive'];
    if (reportType && !validReportTypes.includes(reportType)) {
      return ApiResponse.error(res, `Invalid report type. Allowed: ${validReportTypes.join(', ')}`, 400);
    }

    if (includeComparison && !['true', 'false'].includes(includeComparison)) {
      return ApiResponse.error(res, 'includeComparison must be true or false', 400);
    }

    if (includeInsights && !['true', 'false'].includes(includeInsights)) {
      return ApiResponse.error(res, 'includeInsights must be true or false', 400);
    }

    if (period === 'custom') {
      if (!dateFrom || !dateTo) {
        return ApiResponse.error(res, 'dateFrom and dateTo are required for custom period', 400);
      }

      if (isNaN(new Date(dateFrom).getTime()) || isNaN(new Date(dateTo).getTime())) {
        return ApiResponse.error(res, 'Invalid date format for custom period', 400);
      }

      const daysDiff = (new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        return ApiResponse.error(res, 'Custom period cannot exceed 365 days', 400);
      }
    }

    next();
  }

  // ========================================
  // VALIDATIONS DE RECHERCHE
  // ========================================

  static validateTextSearch(req, res, next) {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return ApiResponse.error(res, 'Search query (q) is required', 400);
    }

    if (q.length < 2) {
      return ApiResponse.error(res, 'Search query must be at least 2 characters', 400);
    }

    if (q.length > 100) {
      return ApiResponse.error(res, 'Search query cannot exceed 100 characters', 400);
    }

    req.query.q = q.trim();
    next();
  }

  // ========================================
  // VALIDATIONS ADMINISTRATIVES
  // ========================================

  static validateMigrationParams(req, res, next) {
    const { dryRun, batchSize, backupFirst } = req.body;

    if (dryRun !== undefined && typeof dryRun !== 'boolean') {
      return ApiResponse.error(res, 'dryRun must be a boolean', 400);
    }

    if (batchSize && (isNaN(batchSize) || parseInt(batchSize) < 1 || parseInt(batchSize) > 1000)) {
      return ApiResponse.error(res, 'batchSize must be between 1 and 1000', 400);
    }

    if (backupFirst !== undefined && typeof backupFirst !== 'boolean') {
      return ApiResponse.error(res, 'backupFirst must be a boolean', 400);
    }

    next();
  }

  static validateCleanupParams(req, res, next) {
    const { olderThan, includeOrphaned, dryRun, maxEntries } = req.body;

    if (olderThan && isNaN(new Date(olderThan).getTime())) {
      return ApiResponse.error(res, 'Invalid olderThan date format', 400);
    }

    if (olderThan && new Date(olderThan) > new Date()) {
      return ApiResponse.error(res, 'olderThan cannot be in the future', 400);
    }

    if (includeOrphaned !== undefined && typeof includeOrphaned !== 'boolean') {
      return ApiResponse.error(res, 'includeOrphaned must be a boolean', 400);
    }

    if (dryRun !== undefined && typeof dryRun !== 'boolean') {
      return ApiResponse.error(res, 'dryRun must be a boolean', 400);
    }

    if (maxEntries && (isNaN(maxEntries) || parseInt(maxEntries) < 1 || parseInt(maxEntries) > 10000)) {
      return ApiResponse.error(res, 'maxEntries must be between 1 and 10000', 400);
    }

    next();
  }

  static validateSyncParams(req, res, next) {
    const { force, itemType, batchSize } = req.body;

    if (force !== undefined && typeof force !== 'boolean') {
      return ApiResponse.error(res, 'force must be a boolean', 400);
    }

    const validItemTypes = ['food', 'recipe'];
    if (itemType && !validItemTypes.includes(itemType)) {
      return ApiResponse.error(res, `Invalid item type. Allowed: ${validItemTypes.join(', ')}`, 400);
    }

    if (batchSize && (isNaN(batchSize) || parseInt(batchSize) < 1 || parseInt(batchSize) > 500)) {
      return ApiResponse.error(res, 'batchSize must be between 1 and 500', 400);
    }

    next();
  }

  static validateBatchConversion(req, res, next) {
    const { entryIds, fromType, toType, conversionData } = req.body;

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return ApiResponse.error(res, 'Entry IDs array is required', 400);
    }

    if (entryIds.length > 20) {
      return ApiResponse.error(res, 'Cannot convert more than 20 entries at once', 400);
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

    if (!conversionData || typeof conversionData !== 'object') {
      return ApiResponse.error(res, 'Conversion data object is required', 400);
    }

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
}

module.exports = ConsumptionValidation;