const ApiResponse = require('../utils/responses');
const mongoose = require('mongoose');

// ========================================
// VALIDATIONS UNIFIÉES FOOD + RECIPE
// ========================================

// Valider la création d'entrée unifiée
const validateConsumptionEntry = (req, res, next) => {
  const { 
    itemType, itemId, foodId, recipeId,
    quantity, servings, unit, mealType, 
    notes, tags, rating, mood 
  } = req.body;

  // Validation de l'identification de l'item
  if (!itemType && !foodId && !recipeId) {
    return ApiResponse.badRequestError(res, 'Either itemType+itemId, foodId, or recipeId is required');
  }

  // Validation pour itemType + itemId
  if (itemType) {
    if (!['food', 'recipe'].includes(itemType)) {
      return ApiResponse.badRequestError(res, 'itemType must be either "food" or "recipe"');
    }

    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      return ApiResponse.badRequestError(res, 'Valid itemId is required when itemType is provided');
    }
  }

  // Validation pour foodId legacy
  if (foodId && !mongoose.Types.ObjectId.isValid(foodId)) {
    return ApiResponse.badRequestError(res, 'Invalid foodId format');
  }

  // Validation pour recipeId
  if (recipeId && !mongoose.Types.ObjectId.isValid(recipeId)) {
    return ApiResponse.badRequestError(res, 'Invalid recipeId format');
  }

  // Validation conditionnelle selon le type
  const effectiveType = itemType || (foodId ? 'food' : 'recipe');

  if (effectiveType === 'food') {
    if (!quantity || isNaN(quantity) || parseFloat(quantity) <= 0) {
      return ApiResponse.badRequestError(res, 'Valid positive quantity is required for food items');
    }

    const validUnits = ['g', 'kg', 'ml', 'l', 'piece', 'cup', 'tbsp', 'tsp', 'oz', 'lb'];
    if (unit && !validUnits.includes(unit)) {
      return ApiResponse.badRequestError(res, `Invalid unit. Allowed: ${validUnits.join(', ')}`);
    }
  }

  if (effectiveType === 'recipe') {
    if (!servings || isNaN(servings) || parseFloat(servings) <= 0) {
      return ApiResponse.badRequestError(res, 'Valid positive servings count is required for recipe items');
    }

    if (servings > 20) {
      return ApiResponse.badRequestError(res, 'Servings cannot exceed 20 per entry');
    }
  }

  // Validation des champs communs
  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
  if (mealType && !validMealTypes.includes(mealType)) {
    return ApiResponse.badRequestError(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`);
  }

  if (notes && typeof notes !== 'string') {
    return ApiResponse.badRequestError(res, 'Notes must be a string');
  }

  if (notes && notes.length > 1000) {
    return ApiResponse.badRequestError(res, 'Notes cannot exceed 1000 characters');
  }

  if (tags && !Array.isArray(tags)) {
    return ApiResponse.badRequestError(res, 'Tags must be an array');
  }

  if (tags && tags.length > 10) {
    return ApiResponse.badRequestError(res, 'Cannot have more than 10 tags');
  }

  if (rating && (isNaN(rating) || rating < 1 || rating > 5)) {
    return ApiResponse.badRequestError(res, 'Rating must be between 1 and 5');
  }

  const validMoods = ['happy', 'satisfied', 'neutral', 'disappointed'];
  if (mood && !validMoods.includes(mood)) {
    return ApiResponse.badRequestError(res, `Invalid mood. Allowed: ${validMoods.join(', ')}`);
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
};

// Valider la création d'entrée food spécifique
const validateFoodEntry = (req, res, next) => {
  const { foodId, quantity, unit } = req.body;

  if (!foodId || !mongoose.Types.ObjectId.isValid(foodId)) {
    return ApiResponse.badRequestError(res, 'Valid foodId is required');
  }

  if (!quantity || isNaN(quantity) || parseFloat(quantity) <= 0) {
    return ApiResponse.badRequestError(res, 'Valid positive quantity is required');
  }

  const validUnits = ['g', 'kg', 'ml', 'l', 'piece', 'cup', 'tbsp', 'tsp', 'oz', 'lb'];
  if (!unit || !validUnits.includes(unit)) {
    return ApiResponse.badRequestError(res, `Valid unit is required. Allowed: ${validUnits.join(', ')}`);
  }

  req.validatedData = {
    itemType: 'food',
    itemId: foodId,
    quantity: parseFloat(quantity),
    unit,
    ...req.body
  };

  next();
};

// Valider la création d'entrée recipe spécifique
const validateRecipeEntry = (req, res, next) => {
  const { recipeId, servings } = req.body;

  if (!recipeId || !mongoose.Types.ObjectId.isValid(recipeId)) {
    return ApiResponse.badRequestError(res, 'Valid recipeId is required');
  }

  if (!servings || isNaN(servings) || parseFloat(servings) <= 0) {
    return ApiResponse.badRequestError(res, 'Valid positive servings count is required');
  }

  if (servings > 20) {
    return ApiResponse.badRequestError(res, 'Servings cannot exceed 20 per entry');
  }

  req.validatedData = {
    itemType: 'recipe',
    itemId: recipeId,
    servings: parseFloat(servings),
    ...req.body
  };

  next();
};

// Valider la mise à jour d'entrée
const validateUpdateEntry = (req, res, next) => {
  const { 
    quantity, servings, unit, mealType, 
    notes, tags, rating, mood, consumedAt 
  } = req.body;

  // Tous les champs sont optionnels pour la mise à jour
  if (quantity !== undefined) {
    if (isNaN(quantity) || parseFloat(quantity) <= 0) {
      return ApiResponse.badRequestError(res, 'Quantity must be a positive number');
    }
  }

  if (servings !== undefined) {
    if (isNaN(servings) || parseFloat(servings) <= 0) {
      return ApiResponse.badRequestError(res, 'Servings must be a positive number');
    }
    if (servings > 20) {
      return ApiResponse.badRequestError(res, 'Servings cannot exceed 20');
    }
  }

  const validUnits = ['g', 'kg', 'ml', 'l', 'piece', 'cup', 'tbsp', 'tsp', 'oz', 'lb'];
  if (unit && !validUnits.includes(unit)) {
    return ApiResponse.badRequestError(res, `Invalid unit. Allowed: ${validUnits.join(', ')}`);
  }

  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
  if (mealType && !validMealTypes.includes(mealType)) {
    return ApiResponse.badRequestError(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`);
  }

  if (notes && (typeof notes !== 'string' || notes.length > 1000)) {
    return ApiResponse.badRequestError(res, 'Notes must be a string with max 1000 characters');
  }

  if (tags && (!Array.isArray(tags) || tags.length > 10)) {
    return ApiResponse.badRequestError(res, 'Tags must be an array with max 10 items');
  }

  if (rating && (isNaN(rating) || rating < 1 || rating > 5)) {
    return ApiResponse.badRequestError(res, 'Rating must be between 1 and 5');
  }

  const validMoods = ['happy', 'satisfied', 'neutral', 'disappointed'];
  if (mood && !validMoods.includes(mood)) {
    return ApiResponse.badRequestError(res, `Invalid mood. Allowed: ${validMoods.join(', ')}`);
  }

  if (consumedAt && isNaN(new Date(consumedAt).getTime())) {
    return ApiResponse.badRequestError(res, 'Invalid consumedAt date format');
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
};

// Valider la création de repas rapide
const validateQuickMeal = (req, res, next) => {
  const { items, mealType, mealName, mealNotes, tags } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return ApiResponse.badRequestError(res, 'Items array is required and cannot be empty');
  }

  if (items.length > 20) {
    return ApiResponse.badRequestError(res, 'Cannot add more than 20 items in one meal');
  }

  // Valider chaque item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    if (!item.itemType && !item.foodId && !item.recipeId) {
      return ApiResponse.badRequestError(res, `Item ${i + 1}: itemType+itemId, foodId, or recipeId is required`);
    }

    if (item.itemType && !['food', 'recipe'].includes(item.itemType)) {
      return ApiResponse.badRequestError(res, `Item ${i + 1}: itemType must be "food" or "recipe"`);
    }

    if (item.itemId && !mongoose.Types.ObjectId.isValid(item.itemId)) {
      return ApiResponse.badRequestError(res, `Item ${i + 1}: invalid itemId format`);
    }

    if (item.foodId && !mongoose.Types.ObjectId.isValid(item.foodId)) {
      return ApiResponse.badRequestError(res, `Item ${i + 1}: invalid foodId format`);
    }

    if (item.recipeId && !mongoose.Types.ObjectId.isValid(item.recipeId)) {
      return ApiResponse.badRequestError(res, `Item ${i + 1}: invalid recipeId format`);
    }

    const effectiveType = item.itemType || (item.foodId ? 'food' : 'recipe');

    if (effectiveType === 'food') {
      if (!item.quantity || item.quantity <= 0) {
        return ApiResponse.badRequestError(res, `Item ${i + 1}: valid quantity required for food`);
      }
    }

    if (effectiveType === 'recipe') {
      if (!item.servings || item.servings <= 0) {
        return ApiResponse.badRequestError(res, `Item ${i + 1}: valid servings required for recipe`);
      }
    }
  }

  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
  if (mealType && !validMealTypes.includes(mealType)) {
    return ApiResponse.badRequestError(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`);
  }

  if (mealName && (typeof mealName !== 'string' || mealName.length > 200)) {
    return ApiResponse.badRequestError(res, 'Meal name must be a string with max 200 characters');
  }

  if (mealNotes && (typeof mealNotes !== 'string' || mealNotes.length > 1000)) {
    return ApiResponse.badRequestError(res, 'Meal notes must be a string with max 1000 characters');
  }

  if (tags && (!Array.isArray(tags) || tags.length > 10)) {
    return ApiResponse.badRequestError(res, 'Tags must be an array with max 10 items');
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
};

// Valider la création de repas depuis recette
const validateRecipeMeal = (req, res, next) => {
  const { servings, mealType, notes } = req.body;

  if (!servings || isNaN(servings) || parseFloat(servings) <= 0) {
    return ApiResponse.badRequestError(res, 'Valid positive servings count is required');
  }

  if (servings > 20) {
    return ApiResponse.badRequestError(res, 'Servings cannot exceed 20');
  }

  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
  if (mealType && !validMealTypes.includes(mealType)) {
    return ApiResponse.badRequestError(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`);
  }

  if (notes && (typeof notes !== 'string' || notes.length > 1000)) {
    return ApiResponse.badRequestError(res, 'Notes must be a string with max 1000 characters');
  }

  req.validatedData = {
    servings: parseFloat(servings),
    mealType: mealType || 'other',
    ...(notes && { notes: notes.trim() }),
    ...req.body
  };

  next();
};

// ========================================
// VALIDATIONS DES FILTRES ET REQUÊTES
// ========================================

// Valider les filtres de requête
const validateQueryFilters = (req, res, next) => {
  const { 
    mealType, itemType, entryMethod, tags, 
    minCalories, maxCalories, dateFrom, dateTo 
  } = req.query;

  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
  if (mealType && !validMealTypes.includes(mealType)) {
    return ApiResponse.badRequestError(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`);
  }

  const validItemTypes = ['food', 'recipe'];
  if (itemType && !validItemTypes.includes(itemType)) {
    return ApiResponse.badRequestError(res, `Invalid item type. Allowed: ${validItemTypes.join(', ')}`);
  }

  const validEntryMethods = ['manual', 'barcode_scan', 'image_analysis', 'voice', 'recipe', 'quick_meal'];
  if (entryMethod && !validEntryMethods.includes(entryMethod)) {
    return ApiResponse.badRequestError(res, `Invalid entry method. Allowed: ${validEntryMethods.join(', ')}`);
  }

  if (tags && typeof tags !== 'string') {
    return ApiResponse.badRequestError(res, 'Tags must be a comma-separated string');
  }

  if (minCalories && (isNaN(minCalories) || parseFloat(minCalories) < 0)) {
    return ApiResponse.badRequestError(res, 'minCalories must be a non-negative number');
  }

  if (maxCalories && (isNaN(maxCalories) || parseFloat(maxCalories) < 0)) {
    return ApiResponse.badRequestError(res, 'maxCalories must be a non-negative number');
  }

  if (minCalories && maxCalories && parseFloat(minCalories) > parseFloat(maxCalories)) {
    return ApiResponse.badRequestError(res, 'minCalories cannot be greater than maxCalories');
  }

  if (dateFrom && isNaN(new Date(dateFrom).getTime())) {
    return ApiResponse.badRequestError(res, 'Invalid dateFrom format');
  }

  if (dateTo && isNaN(new Date(dateTo).getTime())) {
    return ApiResponse.badRequestError(res, 'Invalid dateTo format');
  }

  if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
    return ApiResponse.badRequestError(res, 'dateFrom cannot be after dateTo');
  }

  next();
};

// Valider l'ID d'entrée
const validateEntryId = (req, res, next) => {
  const { entryId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(entryId)) {
    return ApiResponse.badRequestError(res, 'Invalid entry ID format');
  }

  next();
};

// Valider les IDs multiples pour les opérations en lot
const validateBatchIds = (req, res, next) => {
  const { entryIds } = req.body;

  if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
    return ApiResponse.badRequestError(res, 'Entry IDs array is required');
  }

  if (entryIds.length > 50) {
    return ApiResponse.badRequestError(res, 'Cannot process more than 50 entries at once');
  }

  const invalidIds = entryIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
  if (invalidIds.length > 0) {
    return ApiResponse.badRequestError(res, `Invalid entry IDs: ${invalidIds.join(', ')}`);
  }

  next();
};

// ========================================
// VALIDATIONS DES PARAMÈTRES D'ANALYTICS
// ========================================

// Valider les paramètres de dashboard
const validateDashboardParams = (req, res, next) => {
  const { period, includeBreakdown, includeGoals, weekOffset, monthOffset } = req.query;

  const validPeriods = ['today', 'week', 'month', 'year'];
  if (period && !validPeriods.includes(period)) {
    return ApiResponse.badRequestError(res, `Invalid period. Allowed: ${validPeriods.join(', ')}`);
  }

  if (includeBreakdown && !['true', 'false'].includes(includeBreakdown)) {
    return ApiResponse.badRequestError(res, 'includeBreakdown must be true or false');
  }

  if (includeGoals && !['true', 'false'].includes(includeGoals)) {
    return ApiResponse.badRequestError(res, 'includeGoals must be true or false');
  }

  if (weekOffset && (isNaN(weekOffset) || Math.abs(parseInt(weekOffset)) > 52)) {
    return ApiResponse.badRequestError(res, 'weekOffset must be a number between -52 and 52');
  }

  if (monthOffset && (isNaN(monthOffset) || Math.abs(parseInt(monthOffset)) > 12)) {
    return ApiResponse.badRequestError(res, 'monthOffset must be a number between -12 and 12');
  }

  next();
};

// Valider les paramètres de statistiques
const validateStatsParams = (req, res, next) => {
  const { period, limit, itemType, mealType } = req.query;

  const validPeriods = ['week', 'month', 'year', 'all'];
  if (period && !validPeriods.includes(period)) {
    return ApiResponse.badRequestError(res, `Invalid period. Allowed: ${validPeriods.join(', ')}`);
  }

  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return ApiResponse.badRequestError(res, 'Limit must be between 1 and 100');
  }

  const validItemTypes = ['food', 'recipe'];
  if (itemType && !validItemTypes.includes(itemType)) {
    return ApiResponse.badRequestError(res, `Invalid item type. Allowed: ${validItemTypes.join(', ')}`);
  }

  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
  if (mealType && !validMealTypes.includes(mealType)) {
    return ApiResponse.badRequestError(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`);
  }

  next();
};

// Valider les paramètres de suggestions
const validateSuggestionParams = (req, res, next) => {
  const { mealType, limit, basedOn } = req.query;

  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
  if (mealType && !validMealTypes.includes(mealType)) {
    return ApiResponse.badRequestError(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`);
  }

  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 50)) {
    return ApiResponse.badRequestError(res, 'Limit must be between 1 and 50');
  }

  const validBasedOn = ['history', 'goals', 'ingredients', 'time_pattern'];
  if (basedOn && !validBasedOn.includes(basedOn)) {
    return ApiResponse.badRequestError(res, `Invalid basedOn. Allowed: ${validBasedOn.join(', ')}`);
  }

  next();
};

// ========================================
// VALIDATIONS D'EXPORT ET RAPPORTS
// ========================================

// Valider les paramètres d'export
const validateExportParams = (req, res, next) => {
  const { 
    format, includeNutrition, includeItemDetails, 
    includeMetadata, dateFrom, dateTo 
  } = req.query;

  const validFormats = ['json', 'csv', 'xlsx'];
  if (format && !validFormats.includes(format)) {
    return ApiResponse.badRequestError(res, `Invalid format. Allowed: ${validFormats.join(', ')}`);
  }

  if (includeNutrition && !['true', 'false'].includes(includeNutrition)) {
    return ApiResponse.badRequestError(res, 'includeNutrition must be true or false');
  }

  if (includeItemDetails && !['true', 'false'].includes(includeItemDetails)) {
    return ApiResponse.badRequestError(res, 'includeItemDetails must be true or false');
  }

  if (includeMetadata && !['true', 'false'].includes(includeMetadata)) {
    return ApiResponse.badRequestError(res, 'includeMetadata must be true or false');
  }

  if (dateFrom && isNaN(new Date(dateFrom).getTime())) {
    return ApiResponse.badRequestError(res, 'Invalid dateFrom format');
  }

  if (dateTo && isNaN(new Date(dateTo).getTime())) {
    return ApiResponse.badRequestError(res, 'Invalid dateTo format');
  }

  // Vérifier que la période d'export n'est pas trop large
  if (dateFrom && dateTo) {
    const daysDiff = (new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      return ApiResponse.badRequestError(res, 'Export period cannot exceed 365 days');
    }
  }

  next();
};

// Valider les paramètres de rapport
const validateReportParams = (req, res, next) => {
  const { 
    period, reportType, includeComparison, 
    includeInsights, dateFrom, dateTo 
  } = req.query;

  const validPeriods = ['week', 'month', 'quarter', 'year', 'custom'];
  if (period && !validPeriods.includes(period)) {
    return ApiResponse.badRequestError(res, `Invalid period. Allowed: ${validPeriods.join(', ')}`);
  }

  const validReportTypes = ['nutrition-sources', 'recipe-usage', 'food-vs-recipe', 'comprehensive'];
  if (reportType && !validReportTypes.includes(reportType)) {
    return ApiResponse.badRequestError(res, `Invalid report type. Allowed: ${validReportTypes.join(', ')}`);
  }

  if (includeComparison && !['true', 'false'].includes(includeComparison)) {
    return ApiResponse.badRequestError(res, 'includeComparison must be true or false');
  }

  if (includeInsights && !['true', 'false'].includes(includeInsights)) {
    return ApiResponse.badRequestError(res, 'includeInsights must be true or false');
  }

  if (period === 'custom') {
    if (!dateFrom || !dateTo) {
      return ApiResponse.badRequestError(res, 'dateFrom and dateTo are required for custom period');
    }

    if (isNaN(new Date(dateFrom).getTime()) || isNaN(new Date(dateTo).getTime())) {
      return ApiResponse.badRequestError(res, 'Invalid date format for custom period');
    }

    const daysDiff = (new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      return ApiResponse.badRequestError(res, 'Custom period cannot exceed 365 days');
    }
  }

  next();
};

// ========================================
// VALIDATIONS DE RECHERCHE
// ========================================

// Valider la recherche textuelle
const validateTextSearch = (req, res, next) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return ApiResponse.badRequestError(res, 'Search query (q) is required');
  }

  if (q.length < 2) {
    return ApiResponse.badRequestError(res, 'Search query must be at least 2 characters');
  }

  if (q.length > 100) {
    return ApiResponse.badRequestError(res, 'Search query cannot exceed 100 characters');
  }

  // Nettoyer la requête de recherche
  req.query.q = q.trim();

  next();
};

// ========================================
// VALIDATIONS ADMINISTRATIVES
// ========================================

// Valider les paramètres de migration
const validateMigrationParams = (req, res, next) => {
  const { dryRun, batchSize, backupFirst } = req.body;

  if (dryRun !== undefined && typeof dryRun !== 'boolean') {
    return ApiResponse.badRequestError(res, 'dryRun must be a boolean');
  }

  if (batchSize && (isNaN(batchSize) || parseInt(batchSize) < 1 || parseInt(batchSize) > 1000)) {
    return ApiResponse.badRequestError(res, 'batchSize must be between 1 and 1000');
  }

  if (backupFirst !== undefined && typeof backupFirst !== 'boolean') {
    return ApiResponse.badRequestError(res, 'backupFirst must be a boolean');
  }

  next();
};

// Valider les paramètres de nettoyage
const validateCleanupParams = (req, res, next) => {
  const { olderThan, includeOrphaned, dryRun, maxEntries } = req.body;

  if (olderThan && isNaN(new Date(olderThan).getTime())) {
    return ApiResponse.badRequestError(res, 'Invalid olderThan date format');
  }

  if (olderThan && new Date(olderThan) > new Date()) {
    return ApiResponse.badRequestError(res, 'olderThan cannot be in the future');
  }

  if (includeOrphaned !== undefined && typeof includeOrphaned !== 'boolean') {
    return ApiResponse.badRequestError(res, 'includeOrphaned must be a boolean');
  }

  if (dryRun !== undefined && typeof dryRun !== 'boolean') {
    return ApiResponse.badRequestError(res, 'dryRun must be a boolean');
  }

  if (maxEntries && (isNaN(maxEntries) || parseInt(maxEntries) < 1 || parseInt(maxEntries) > 10000)) {
    return ApiResponse.badRequestError(res, 'maxEntries must be between 1 and 10000');
  }

  next();
};

// Valider les paramètres de synchronisation
const validateSyncParams = (req, res, next) => {
  const { force, itemType, batchSize } = req.body;

  if (force !== undefined && typeof force !== 'boolean') {
    return ApiResponse.badRequestError(res, 'force must be a boolean');
  }

  const validItemTypes = ['food', 'recipe'];
  if (itemType && !validItemTypes.includes(itemType)) {
    return ApiResponse.badRequestError(res, `Invalid item type. Allowed: ${validItemTypes.join(', ')}`);
  }

  if (batchSize && (isNaN(batchSize) || parseInt(batchSize) < 1 || parseInt(batchSize) > 500)) {
    return ApiResponse.badRequestError(res, 'batchSize must be between 1 and 500');
  }

  next();
};

// Valider la conversion de type en lot
const validateBatchConversion = (req, res, next) => {
  const { entryIds, fromType, toType, conversionData } = req.body;

  if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
    return ApiResponse.badRequestError(res, 'Entry IDs array is required');
  }

  if (entryIds.length > 20) {
    return ApiResponse.badRequestError(res, 'Cannot convert more than 20 entries at once');
  }

  const validTypes = ['food', 'recipe'];
  if (!fromType || !validTypes.includes(fromType)) {
    return ApiResponse.badRequestError(res, `Invalid fromType. Allowed: ${validTypes.join(', ')}`);
  }

  if (!toType || !validTypes.includes(toType)) {
    return ApiResponse.badRequestError(res, `Invalid toType. Allowed: ${validTypes.join(', ')}`);
  }

  if (fromType === toType) {
    return ApiResponse.badRequestError(res, 'fromType and toType cannot be the same');
  }

  if (!conversionData || typeof conversionData !== 'object') {
    return ApiResponse.badRequestError(res, 'Conversion data object is required');
  }

  next();
};

module.exports = {
  validateConsumptionEntry,
  validateFoodEntry,
  validateRecipeEntry,
  validateUpdateEntry,
  validateQuickMeal,
  validateRecipeMeal,
  validateQueryFilters,
  validateEntryId,
  validateBatchIds,
  validateDashboardParams,
  validateStatsParams,
  validateSuggestionParams,
  validateExportParams,
  validateReportParams,
  validateTextSearch,
  validateMigrationParams,
  validateCleanupParams,
  validateSyncParams,
  validateBatchConversion
};