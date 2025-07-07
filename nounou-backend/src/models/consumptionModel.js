const mongoose = require('mongoose');

// Consumption Entry Schema
const consumptionEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food', // Will be created later in nutrition schema
    required: true,
    index: true
  },
  
  quantity: {
    type: Number,
    required: true,
    min: [0.01, 'Quantity must be positive']
  },
  
  unit: {
    type: String,
    enum: ['g', 'kg', 'ml', 'l', 'piece', 'cup', 'tbsp', 'tsp', 'oz', 'lb'],
    default: 'g'
  },
  
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack', 'other'],
    default: 'other',
    index: true
  },
  
  consumedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  entryMethod: {
    type: String,
    enum: ['barcode_scan', 'image_analysis', 'manual', 'recipe', 'voice'],
    default: 'manual',
    index: true
  },
  
  confidenceScore: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  
  // Nutritional values calculated
  nutrition: {
    calories: { type: Number, min: 0, default: 0 },
    protein: { type: Number, min: 0, default: 0 },
    carbs: { type: Number, min: 0, default: 0 },
    fat: { type: Number, min: 0, default: 0 },
    fiber: { type: Number, min: 0, default: 0 },
    sugar: { type: Number, min: 0, default: 0 },
    sodium: { type: Number, min: 0, default: 0 },
    cholesterol: { type: Number, min: 0, default: 0 },
    saturatedFat: { type: Number, min: 0, default: 0 },
    transFat: { type: Number, min: 0, default: 0 }
  },
  
  // Metadata and tracking
  deviceInfo: {
    deviceId: String,
    deviceType: { type: String, enum: ['mobile', 'tablet', 'web', 'desktop'], default: 'mobile' },
    appVersion: String,
    platform: String
  },
  
  location: {
    country: String,
    city: String,
    timezone: String
  },
  
  // For AI analysis entries
  aiAnalysis: {
    originalImage: String, // URL or file path
    confidence: Number,
    identifiedFoods: [{
      name: String,
      confidence: Number,
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      }
    }],
    processingTime: Number
  },
  
  // Recipe/meal context
  recipeContext: {
    recipeName: String,
    recipeId: mongoose.Schema.Types.ObjectId,
    servingSize: Number,
    cookingMethod: String
  },
  
  // User annotations
  notes: {
    type: String,
    maxlength: 500
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Soft delete and modification tracking
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  lastModified: {
    at: Date,
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  },
  
  // Duplicate tracking
  isDuplicate: {
    type: Boolean,
    default: false
  },
  
  originalEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ConsumptionEntry'
  },
  
  // Validation and quality control
  isVerified: {
    type: Boolean,
    default: false
  },
  
  qualityScore: {
    type: Number,
    min: 0,
    max: 100
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Daily Summary Schema for aggregated data
const dailySummarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // Total nutrition for the day
  totalNutrition: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    sugar: { type: Number, default: 0 },
    sodium: { type: Number, default: 0 },
    water: { type: Number, default: 0 } // in ml
  },
  
  // Breakdown by meal type
  mealBreakdown: {
    breakfast: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      entries: { type: Number, default: 0 }
    },
    lunch: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      entries: { type: Number, default: 0 }
    },
    dinner: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      entries: { type: Number, default: 0 }
    },
    snack: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      entries: { type: Number, default: 0 }
    }
  },
  
  // Goals comparison
  goals: {
    dailyCalories: Number,
    dailyProtein: Number,
    dailyCarbs: Number,
    dailyFat: Number
  },
  
  // Progress percentages
  progress: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 }
  },
  
  // Metrics
  entriesCount: { type: Number, default: 0 },
  uniqueFoodsCount: { type: Number, default: 0 },
  mealsLogged: { type: Number, default: 0 },
  
  // Quality scores
  nutritionScore: { type: Number, min: 0, max: 100 },
  varietyScore: { type: Number, min: 0, max: 100 },
  balanceScore: { type: Number, min: 0, max: 100 },
  
  lastCalculated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Food suggestions tracking
const foodSuggestionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food',
    required: true
  },
  
  suggestionReason: {
    type: String,
    enum: ['frequently_eaten', 'goal_aligned', 'nutritional_balance', 'time_pattern', 'similar_users'],
    required: true
  },
  
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack']
  },
  
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  
  accepted: Boolean,
  acceptedAt: Date,
  
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes
consumptionEntrySchema.index({ userId: 1, consumedAt: -1 });
consumptionEntrySchema.index({ userId: 1, mealType: 1, consumedAt: -1 });
consumptionEntrySchema.index({ userId: 1, isDeleted: 1, consumedAt: -1 });
consumptionEntrySchema.index({ foodId: 1, userId: 1 });
consumptionEntrySchema.index({ entryMethod: 1 });
consumptionEntrySchema.index({ tags: 1 });
consumptionEntrySchema.index({ 'nutrition.calories': 1 });

// Text search index
consumptionEntrySchema.index({
  notes: 'text',
  tags: 'text'
});

dailySummarySchema.index({ userId: 1, date: -1 }, { unique: true });
dailySummarySchema.index({ date: -1 });
dailySummarySchema.index({ 'totalNutrition.calories': -1 });

foodSuggestionSchema.index({ userId: 1, createdAt: -1 });
foodSuggestionSchema.index({ foodId: 1, suggestionReason: 1 });

// Virtual properties
consumptionEntrySchema.virtual('totalCalories').get(function() {
  return this.nutrition.calories || 0;
});

consumptionEntrySchema.virtual('macroBreakdown').get(function() {
  const total = this.nutrition.protein + this.nutrition.carbs + this.nutrition.fat;
  if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
  
  return {
    protein: Math.round((this.nutrition.protein / total) * 100),
    carbs: Math.round((this.nutrition.carbs / total) * 100),
    fat: Math.round((this.nutrition.fat / total) * 100)
  };
});

dailySummarySchema.virtual('calorieDeficit').get(function() {
  if (!this.goals.dailyCalories) return null;
  return this.goals.dailyCalories - this.totalNutrition.calories;
});

dailySummarySchema.virtual('overallProgress').get(function() {
  const metrics = ['calories', 'protein', 'carbs', 'fat'];
  const avgProgress = metrics.reduce((sum, metric) => sum + (this.progress[metric] || 0), 0) / metrics.length;
  return Math.round(avgProgress);
});

// Instance methods
consumptionEntrySchema.methods.calculateNutrition = function(foodData) {
  if (!foodData || !foodData.nutritionPer100g) return;
  
  const multiplier = this.quantity / 100; // Assuming quantity is in grams
  const nutrition = foodData.nutritionPer100g;
  
  this.nutrition = {
    calories: Math.round((nutrition.calories || 0) * multiplier * 100) / 100,
    protein: Math.round((nutrition.protein || 0) * multiplier * 100) / 100,
    carbs: Math.round((nutrition.carbs || 0) * multiplier * 100) / 100,
    fat: Math.round((nutrition.fat || 0) * multiplier * 100) / 100,
    fiber: Math.round((nutrition.fiber || 0) * multiplier * 100) / 100,
    sugar: Math.round((nutrition.sugar || 0) * multiplier * 100) / 100,
    sodium: Math.round((nutrition.sodium || 0) * multiplier * 100) / 100
  };
  
  return this.nutrition;
};

consumptionEntrySchema.methods.softDelete = function(userId, reason = 'user_delete') {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.lastModified = {
    at: new Date(),
    by: userId,
    reason
  };
  return this.save();
};

consumptionEntrySchema.methods.restore = function(userId) {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  this.lastModified = {
    at: new Date(),
    by: userId,
    reason: 'restore'
  };
  return this.save();
};

// Static methods
consumptionEntrySchema.statics.findByUserId = function(userId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    mealType,
    dateFrom,
    dateTo,
    entryMethod,
    includeDeleted = false,
    sortBy = 'consumedAt',
    sortOrder = -1
  } = options;

  let query = this.find({ userId });
  
  if (!includeDeleted) {
    query = query.where({ isDeleted: false });
  }
  
  if (mealType) query = query.where({ mealType });
  if (entryMethod) query = query.where({ entryMethod });
  
  if (dateFrom || dateTo) {
    const dateFilter = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom);
    if (dateTo) dateFilter.$lte = new Date(dateTo);
    query = query.where({ consumedAt: dateFilter });
  }
  
  return query
    .sort({ [sortBy]: sortOrder })
    .limit(limit)
    .skip(skip)
    .populate('foodId', 'name brand nutritionPer100g');
};

consumptionEntrySchema.statics.getTopFoods = function(userId, options = {}) {
  const { limit = 10, period = 'month', mealType } = options;
  
  let dateFilter = {};
  if (period !== 'all') {
    const now = new Date();
    const periodMap = {
      week: 7,
      month: 30,
      year: 365
    };
    const days = periodMap[period] || 30;
    dateFilter = { $gte: new Date(now - days * 24 * 60 * 60 * 1000) };
  }

  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    isDeleted: false
  };
  
  if (Object.keys(dateFilter).length > 0) {
    matchStage.consumedAt = dateFilter;
  }
  
  if (mealType) {
    matchStage.mealType = mealType;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$foodId',
        consumptionCount: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        avgQuantity: { $avg: '$quantity' },
        totalCalories: { $sum: '$nutrition.calories' },
        lastConsumed: { $max: '$consumedAt' }
      }
    },
    { $sort: { consumptionCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'foods',
        localField: '_id',
        foreignField: '_id',
        as: 'food'
      }
    },
    { $unwind: '$food' }
  ]);
};

consumptionEntrySchema.statics.getNutritionStats = function(userId, dateFrom, dateTo) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        consumedAt: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
        isDeleted: false
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$consumedAt' } },
          mealType: '$mealType'
        },
        totalCalories: { $sum: '$nutrition.calories' },
        totalProtein: { $sum: '$nutrition.protein' },
        totalCarbs: { $sum: '$nutrition.carbs' },
        totalFat: { $sum: '$nutrition.fat' },
        totalFiber: { $sum: '$nutrition.fiber' },
        entriesCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': -1, '_id.mealType': 1 } }
  ]);
};

consumptionEntrySchema.statics.searchEntries = function(userId, searchOptions = {}) {
  const { query, page = 1, limit = 20, fields = ['notes', 'tags'] } = searchOptions;
  
  const searchQuery = {
    userId: new mongoose.Types.ObjectId(userId),
    isDeleted: false
  };

  if (query) {
    searchQuery.$text = { $search: query };
  }

  return this.find(searchQuery)
    .populate('foodId', 'name brand')
    .sort({ score: { $meta: 'textScore' }, consumedAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

// Static methods for Daily Summary
dailySummarySchema.statics.findOrCreateToday = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let summary = await this.findOne({ userId, date: today });
  
  if (!summary) {
    summary = new this({ userId, date: today });
    await summary.save();
  }
  
  return summary;
};

dailySummarySchema.statics.recalculateForDate = async function(userId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all entries for this date
  const entries = await mongoose.model('ConsumptionEntry').find({
    userId,
    consumedAt: { $gte: startOfDay, $lte: endOfDay },
    isDeleted: false
  });

  // Calculate totals
  const totals = entries.reduce((acc, entry) => {
    acc.calories += entry.nutrition.calories || 0;
    acc.protein += entry.nutrition.protein || 0;
    acc.carbs += entry.nutrition.carbs || 0;
    acc.fat += entry.nutrition.fat || 0;
    acc.fiber += entry.nutrition.fiber || 0;
    acc.sugar += entry.nutrition.sugar || 0;
    acc.sodium += entry.nutrition.sodium || 0;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });

  // Calculate meal breakdown
  const mealBreakdown = {};
  ['breakfast', 'lunch', 'dinner', 'snack'].forEach(meal => {
    const mealEntries = entries.filter(e => e.mealType === meal);
    mealBreakdown[meal] = mealEntries.reduce((acc, entry) => {
      acc.calories += entry.nutrition.calories || 0;
      acc.protein += entry.nutrition.protein || 0;
      acc.carbs += entry.nutrition.carbs || 0;
      acc.fat += entry.nutrition.fat || 0;
      acc.entries += 1;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 });
  });

  // Update or create summary
  return this.findOneAndUpdate(
    { userId, date: startOfDay },
    {
      totalNutrition: totals,
      mealBreakdown,
      entriesCount: entries.length,
      uniqueFoodsCount: new Set(entries.map(e => e.foodId.toString())).size,
      lastCalculated: new Date()
    },
    { upsert: true, new: true }
  );
};

// Create models
const ConsumptionEntry = mongoose.model('ConsumptionEntry', consumptionEntrySchema);
const DailySummary = mongoose.model('DailySummary', dailySummarySchema);
const FoodSuggestion = mongoose.model('FoodSuggestion', foodSuggestionSchema);

// ConsumptionModel class for backward compatibility
class ConsumptionModel {
  async create(consumptionData) {
    const entry = new ConsumptionEntry(consumptionData);
    return entry.save();
  }

  async findByUserId(userId, options = {}) {
    return ConsumptionEntry.findByUserId(userId, options);
  }

  async findById(id) {
    return ConsumptionEntry.findById(id)
      .where({ isDeleted: false })
      .populate('foodId', 'name brand nutritionPer100g');
  }

  async update(id, updateData) {
    return ConsumptionEntry.findByIdAndUpdate(
      id,
      { 
        ...updateData,
        'lastModified.at': new Date(),
        'lastModified.by': updateData.userId,
        'lastModified.reason': 'user_edit'
      },
      { new: true, runValidators: true }
    ).where({ isDeleted: false });
  }

  async softDelete(id, userId) {
    const entry = await ConsumptionEntry.findById(id).where({ userId, isDeleted: false });
    if (!entry) return null;
    
    return entry.softDelete(userId);
  }

  async restore(id, userId) {
    const entry = await ConsumptionEntry.findById(id).where({ userId, isDeleted: true });
    if (!entry) return null;
    
    return entry.restore(userId);
  }

  async getNutritionStats(userId, dateFrom, dateTo) {
    return ConsumptionEntry.getNutritionStats(userId, dateFrom, dateTo);
  }

  async getTodayMealStats(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return ConsumptionEntry.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          consumedAt: { $gte: today, $lt: tomorrow },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$mealType',
          totalCalories: { $sum: '$nutrition.calories' },
          totalProtein: { $sum: '$nutrition.protein' },
          totalCarbs: { $sum: '$nutrition.carbs' },
          totalFat: { $sum: '$nutrition.fat' },
          entriesCount: { $sum: 1 }
        }
      },
      {
        $sort: {
          _id: 1
        }
      }
    ]);
  }

  async getMostConsumedFoods(userId, limit = 10) {
    return ConsumptionEntry.getTopFoods(userId, { limit });
  }

  async getTotalCalories(userId, dateFrom, dateTo) {
    const result = await ConsumptionEntry.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          consumedAt: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          totalCalories: { $sum: '$nutrition.calories' },
          totalEntries: { $sum: 1 }
        }
      }
    ]);

    return result[0] || { totalCalories: 0, totalEntries: 0 };
  }

  async countUserEntries(userId, options = {}) {
    const filter = { userId, isDeleted: false };
    
    if (options.mealType) filter.mealType = options.mealType;
    if (options.dateFrom || options.dateTo) {
      filter.consumedAt = {};
      if (options.dateFrom) filter.consumedAt.$gte = new Date(options.dateFrom);
      if (options.dateTo) filter.consumedAt.$lte = new Date(options.dateTo);
    }

    return ConsumptionEntry.countDocuments(filter);
  }

  async getGlobalStats() {
    return ConsumptionEntry.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          totalCaloriesTracked: { $sum: '$nutrition.calories' },
          barcodeEntries: { $sum: { $cond: [{ $eq: ['$entryMethod', 'barcode_scan'] }, 1, 0] } },
          imageEntries: { $sum: { $cond: [{ $eq: ['$entryMethod', 'image_analysis'] }, 1, 0] } },
          manualEntries: { $sum: { $cond: [{ $eq: ['$entryMethod', 'manual'] }, 1, 0] } },
          recipeEntries: { $sum: { $cond: [{ $eq: ['$entryMethod', 'recipe'] }, 1, 0] } },
          avgConfidence: { $avg: '$confidenceScore' }
        }
      },
      {
        $project: {
          totalEntries: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          totalCaloriesTracked: 1,
          barcodeEntries: 1,
          imageEntries: 1,
          manualEntries: 1,
          recipeEntries: 1,
          avgConfidence: 1
        }
      }
    ]);
  }

  // Daily Summary methods
  async getDailySummary(userId, date) {
    return DailySummary.findOne({ 
      userId: new mongoose.Types.ObjectId(userId), 
      date: new Date(date) 
    });
  }

  async recalculateDailySummary(userId, date) {
    return DailySummary.recalculateForDate(userId, date);
  }

  // Search methods
  async searchEntries(userId, searchOptions) {
    return ConsumptionEntry.searchEntries(userId, searchOptions);
  }
}

module.exports = {
  ConsumptionModel: new ConsumptionModel(),
  ConsumptionEntry,
  DailySummary,
  FoodSuggestion
};