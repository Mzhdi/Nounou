const ApiResponse = require('../utils/responses');
const mongoose = require('mongoose');

// Validate consumption entry creation
const validateConsumptionEntry = (req, res, next) => {
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
};

// Validate consumption entry update
const validateUpdateEntry = (req, res, next) => {
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
};

// Validate quick meal creation
const validateQuickMeal = (req, res, next) => {
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
};

// Validate query filters
const validateQueryFilters = (req, res, next) => {
  const { mealType, entryMethod, tags } = req.query;

  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
  if (mealType && !validMealTypes.includes(mealType)) {
    return ApiResponse.error(res, `Invalid meal type. Allowed: ${validMealTypes.join(', ')}`, 400);
  }

  const validEntryMethods = ['manual', 'barcode_scan', 'image_analysis', 'voice', 'recipe'];
  if (entryMethod && !validEntryMethods.includes(entryMethod)) {
    return ApiResponse.error(res, `Invalid entry method. Allowed: ${validEntryMethods.join(', ')}`, 400);
  }

  if (tags && typeof tags !== 'string') {
    return ApiResponse.error(res, 'Tags must be a comma-separated string', 400);
  }

  next();
};

// Validate entry ID parameter
const validateEntryId = (req, res, next) => {
  const { entryId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(entryId)) {
    return ApiResponse.error(res, 'Invalid entry ID format', 400);
  }

  next();
};

// Validate multiple IDs for batch operations
const validateMultipleIds = (req, res, next) => {
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
};

// Validate export parameters
const validateExportParams = (req, res, next) => {
  const { format, includeNutrition, includeMetadata } = req.query;

  const validFormats = ['json', 'csv', 'xlsx'];
  if (format && !validFormats.includes(format)) {
    return ApiResponse.error(res, `Invalid export format. Allowed: ${validFormats.join(', ')}`, 400);
  }

  if (includeNutrition && !['true', 'false'].includes(includeNutrition)) {
    return ApiResponse.error(res, 'includeNutrition must be true or false', 400);
  }

  if (includeMetadata && !['true', 'false'].includes(includeMetadata)) {
    return ApiResponse.error(res, 'includeMetadata must be true or false', 400);
  }

  next();
};

// Validate custom stats parameters
const validateCustomStatsParams = (req, res, next) => {
  const { dateFrom, dateTo, groupBy, metrics } = req.query;

  if (!dateFrom || !dateTo) {
    return ApiResponse.error(res, 'dateFrom and dateTo are required', 400);
  }

  const fromDate = new Date(dateFrom);
  const toDate = new Date(dateTo);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return ApiResponse.error(res, 'Invalid date format', 400);
  }

  if (fromDate >= toDate) {
    return ApiResponse.error(res, 'dateFrom must be before dateTo', 400);
  }

  // Max 1 year range
  const daysDiff = (toDate - fromDate) / (1000 * 60 * 60 * 24);
  if (daysDiff > 365) {
    return ApiResponse.error(res, 'Date range cannot exceed 365 days', 400);
  }

  const validGroupBy = ['day', 'week', 'month'];
  if (groupBy && !validGroupBy.includes(groupBy)) {
    return ApiResponse.error(res, `Invalid groupBy. Allowed: ${validGroupBy.join(', ')}`, 400);
  }

  const validMetrics = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];
  if (metrics) {
    const metricArray = metrics.split(',');
    const invalidMetrics = metricArray.filter(m => !validMetrics.includes(m));
    if (invalidMetrics.length > 0) {
      return ApiResponse.error(res, `Invalid metrics: ${invalidMetrics.join(', ')}`, 400);
    }
  }

  next();
};

// Validate text search
const validateTextSearch = (req, res, next) => {
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

  next();
};

// Sanitize nutrition data
const sanitizeNutritionData = (req, res, next) => {
  if (req.validatedData && req.validatedData.nutrition) {
    const nutrition = req.validatedData.nutrition;
    
    // Ensure all nutrition values are positive numbers
    Object.keys(nutrition).forEach(key => {
      if (typeof nutrition[key] === 'number' && nutrition[key] < 0) {
        nutrition[key] = 0;
      }
    });

    req.validatedData.nutrition = nutrition;
  }

  next();
};

// ADDITIONAL VALIDATIONS (that might be referenced in routes)

// Validate image upload
const validateImageUpload = (req, res, next) => {
  const { imageData, imageUrl } = req.body;

  if (!imageData && !imageUrl) {
    return ApiResponse.error(res, 'Image data or URL is required', 400);
  }

  if (imageData && typeof imageData !== 'string') {
    return ApiResponse.error(res, 'Image data must be a base64 string', 400);
  }

  if (imageUrl && typeof imageUrl !== 'string') {
    return ApiResponse.error(res, 'Image URL must be a string', 400);
  }

  next();
};

// Validate barcode data
const validateBarcodeData = (req, res, next) => {
  const { barcode } = req.body;

  if (!barcode || typeof barcode !== 'string') {
    return ApiResponse.error(res, 'Barcode is required and must be a string', 400);
  }

  if (barcode.length < 6 || barcode.length > 20) {
    return ApiResponse.error(res, 'Barcode must be between 6 and 20 characters', 400);
  }

  next();
};

// Validate voice data
const validateVoiceData = (req, res, next) => {
  const { audioData, audioUrl, transcription } = req.body;

  if (!audioData && !audioUrl && !transcription) {
    return ApiResponse.error(res, 'Audio data, URL, or transcription is required', 400);
  }

  if (transcription && typeof transcription !== 'string') {
    return ApiResponse.error(res, 'Transcription must be a string', 400);
  }

  next();
};

// Validate goal progress
const validateGoalProgress = (req, res, next) => {
  const { goalId, progress } = req.body;

  if (!goalId || !mongoose.Types.ObjectId.isValid(goalId)) {
    return ApiResponse.error(res, 'Valid goal ID is required', 400);
  }

  if (progress === undefined || isNaN(progress) || progress < 0 || progress > 100) {
    return ApiResponse.error(res, 'Progress must be a number between 0 and 100', 400);
  }

  next();
};

// Validate sharing options
const validateSharingOptions = (req, res, next) => {
  const { shareType, message, expiresAt } = req.body;

  const validShareTypes = ['public', 'private', 'friends'];
  if (shareType && !validShareTypes.includes(shareType)) {
    return ApiResponse.error(res, `Invalid share type. Allowed: ${validShareTypes.join(', ')}`, 400);
  }

  if (message && typeof message !== 'string') {
    return ApiResponse.error(res, 'Message must be a string', 400);
  }

  if (message && message.length > 500) {
    return ApiResponse.error(res, 'Message cannot exceed 500 characters', 400);
  }

  if (expiresAt && isNaN(new Date(expiresAt).getTime())) {
    return ApiResponse.error(res, 'Invalid expiration date format', 400);
  }

  next();
};

// Validate data cleanup options
const validateDataCleanupOptions = (req, res, next) => {
  const { olderThan, includeDeleted, dryRun } = req.body;

  if (!olderThan) {
    return ApiResponse.error(res, 'olderThan parameter is required', 400);
  }

  const date = new Date(olderThan);
  if (isNaN(date.getTime())) {
    return ApiResponse.error(res, 'Invalid olderThan date format', 400);
  }

  if (date > new Date()) {
    return ApiResponse.error(res, 'olderThan cannot be in the future', 400);
  }

  if (includeDeleted !== undefined && typeof includeDeleted !== 'boolean') {
    return ApiResponse.error(res, 'includeDeleted must be a boolean', 400);
  }

  if (dryRun !== undefined && typeof dryRun !== 'boolean') {
    return ApiResponse.error(res, 'dryRun must be a boolean', 400);
  }

  next();
};

module.exports = {
  validateConsumptionEntry,
  validateUpdateEntry,
  validateQuickMeal,
  validateQueryFilters,
  validateEntryId,
  validateMultipleIds,
  validateExportParams,
  validateCustomStatsParams,
  validateTextSearch,
  sanitizeNutritionData,
  validateImageUpload,
  validateBarcodeData,
  validateVoiceData,
  validateGoalProgress,
  validateSharingOptions,
  validateDataCleanupOptions
};