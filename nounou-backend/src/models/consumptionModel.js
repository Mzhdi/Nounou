const mongoose = require('mongoose');

// ========== SCHEMA REFACTORISÉ - FLEXIBLE ==========

const consumptionEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // ✅ NOUVEAU: Support flexible food OU recipe
  consumedItem: {
    itemType: {
      type: String,
      enum: ['food', 'recipe'],
      required: true,
      index: true
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    // Référence dynamique basée sur itemType
    refPath: {
      type: String,
      required: true,
      enum: ['Food', 'Recipe']
    }
  },
  
  // Pour les recettes : combien de portions de la recette
  servings: {
    type: Number,
    required: function() { return this.consumedItem?.itemType === 'recipe'; },
    min: [0.1, 'Servings must be positive'],
    default: 1
  },
  
  // Pour les aliments : quantité en grammes/ml/etc
  quantity: {
    type: Number,
    required: function() { return this.consumedItem?.itemType === 'food'; },
    min: [0.01, 'Quantity must be positive']
  },
  
  unit: {
    type: String,
    enum: ['g', 'kg', 'ml', 'l', 'piece', 'cup', 'tbsp', 'tsp', 'oz', 'lb'],
    required: function() { return this.consumedItem?.itemType === 'food'; },
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
  
  // ✅ NUTRITION CALCULÉE AUTOMATIQUEMENT
  calculatedNutrition: {
    calories: { type: Number, min: 0, default: 0 },
    protein: { type: Number, min: 0, default: 0 },
    carbs: { type: Number, min: 0, default: 0 },
    fat: { type: Number, min: 0, default: 0 },
    fiber: { type: Number, min: 0, default: 0 },
    sugar: { type: Number, min: 0, default: 0 },
    sodium: { type: Number, min: 0, default: 0 },
    cholesterol: { type: Number, min: 0, default: 0 },
    saturatedFat: { type: Number, min: 0, default: 0 },
    
    // Métadonnées sur le calcul
    calculatedAt: { type: Date, default: Date.now },
    calculationSource: {
      type: String,
      enum: ['food_database', 'recipe_computation', 'user_input', 'ai_estimation'],
      default: 'food_database'
    },
    confidence: { type: Number, min: 0, max: 1, default: 1 }
  },
  
  // ✅ CONTEXTE ENRICHI
  context: {
    // Pour les recettes
    originalRecipe: {
      name: String,
      totalServings: Number,
      portionConsumed: Number // 0.5 = moitié de la recette
    },
    
    // Pour les aliments
    preparation: {
      method: String, // 'raw', 'cooked', 'fried', etc.
      notes: String
    },
    
    // Contexte du repas
    meal: {
      isPartOfLargerMeal: { type: Boolean, default: false },
      mealSessionId: String, // Pour grouper plusieurs items d'un même repas
      estimatedPortionSize: String // 'small', 'medium', 'large'
    }
  },
  
  // Métadonnées étendues
  metadata: {
    deviceInfo: {
      deviceId: String,
      deviceType: { type: String, enum: ['mobile', 'tablet', 'web', 'desktop'], default: 'mobile' },
      appVersion: String,
      platform: String
    },
    
    location: {
      country: String,
      city: String,
      timezone: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    
    // Pour l'analyse IA
    aiAnalysis: {
      originalImage: String,
      confidence: Number,
      identifiedItems: [{
        name: String,
        confidence: Number,
        boundingBox: {
          x: Number, y: Number, width: Number, height: Number
        }
      }],
      processingTimeMs: Number,
      aiModel: String
    },
    
    // Annotations utilisateur
    userInput: {
      notes: { type: String, maxlength: 1000 },
      tags: [{ type: String, trim: true, lowercase: true }],
      rating: { type: Number, min: 1, max: 5 },
      mood: { type: String, enum: ['happy', 'satisfied', 'neutral', 'disappointed'] }
    }
  },
  
  // Tracking et versioning
  tracking: {
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    versions: [{
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      changes: mongoose.Schema.Types.Mixed,
      reason: String
    }],
    
    isDuplicate: { type: Boolean, default: false },
    originalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ConsumptionEntry' },
    
    qualityScore: { type: Number, min: 0, max: 100 },
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========== INDEXES OPTIMISÉS ==========

// Indexes composites pour les requêtes fréquentes
consumptionEntrySchema.index({ userId: 1, consumedAt: -1 });
consumptionEntrySchema.index({ userId: 1, mealType: 1, consumedAt: -1 });
consumptionEntrySchema.index({ userId: 1, 'tracking.isDeleted': 1, consumedAt: -1 });
consumptionEntrySchema.index({ 'consumedItem.itemType': 1, 'consumedItem.itemId': 1 });
consumptionEntrySchema.index({ userId: 1, 'metadata.userInput.tags': 1 });

// Index pour recherche textuelle
consumptionEntrySchema.index({
  'metadata.userInput.notes': 'text',
  'metadata.userInput.tags': 'text',
  'context.originalRecipe.name': 'text'
});

// Index pour les statistiques
consumptionEntrySchema.index({ 'calculatedNutrition.calories': -1 });
consumptionEntrySchema.index({ entryMethod: 1, createdAt: -1 });

// ========== VIRTUAL PROPERTIES ==========

// Référence dynamique vers Food ou Recipe
consumptionEntrySchema.virtual('consumedItemRef', {
  ref: function() {
    return this.consumedItem.itemType === 'food' ? 'Food' : 'Recipe';
  },
  localField: 'consumedItem.itemId',
  foreignField: '_id',
  justOne: true
});

// Calculs pratiques
consumptionEntrySchema.virtual('totalCalories').get(function() {
  return this.calculatedNutrition?.calories || 0;
});

consumptionEntrySchema.virtual('macroBreakdown').get(function() {
  const n = this.calculatedNutrition;
  const total = (n?.protein || 0) + (n?.carbs || 0) + (n?.fat || 0);
  
  if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
  
  return {
    protein: Math.round(((n?.protein || 0) / total) * 100),
    carbs: Math.round(((n?.carbs || 0) / total) * 100),
    fat: Math.round(((n?.fat || 0) / total) * 100)
  };
});

consumptionEntrySchema.virtual('displayName').get(function() {
  if (this.consumedItem?.itemType === 'recipe') {
    return this.context?.originalRecipe?.name || 'Recipe';
  }
  return this.populatedItemRef?.name || 'Food Item';
});

// ========== MIDDLEWARE ==========

// Pre-save: Définir refPath automatiquement
consumptionEntrySchema.pre('save', function(next) {
  if (this.isModified('consumedItem.itemType')) {
    this.consumedItem.refPath = this.consumedItem.itemType === 'food' ? 'Food' : 'Recipe';
  }
  next();
});

// Pre-save: Validation business logic
consumptionEntrySchema.pre('save', function(next) {
  // Validation conditionnelle selon le type
  if (this.consumedItem?.itemType === 'food') {
    if (!this.quantity || !this.unit) {
      return next(new Error('Quantity and unit are required for food items'));
    }
  } else if (this.consumedItem?.itemType === 'recipe') {
    if (!this.servings || this.servings <= 0) {
      return next(new Error('Valid servings count is required for recipe items'));
    }
  }
  next();
});

// ========== INSTANCE METHODS ==========

// Calculer automatiquement la nutrition
consumptionEntrySchema.methods.calculateNutritionFromSource = async function() {
  if (this.consumedItem?.itemType === 'food') {
    // Récupérer les données nutritionnelles du Food
    const Food = mongoose.model('Food');
    const food = await Food.findById(this.consumedItem.itemId);
    
    if (food && food.nutritionPer100g) {
      const multiplier = this.quantity / 100;
      this.calculatedNutrition = {
        calories: Math.round((food.nutritionPer100g.calories || 0) * multiplier * 100) / 100,
        protein: Math.round((food.nutritionPer100g.protein || 0) * multiplier * 100) / 100,
        carbs: Math.round((food.nutritionPer100g.carbs || 0) * multiplier * 100) / 100,
        fat: Math.round((food.nutritionPer100g.fat || 0) * multiplier * 100) / 100,
        fiber: Math.round((food.nutritionPer100g.fiber || 0) * multiplier * 100) / 100,
        sugar: Math.round((food.nutritionPer100g.sugar || 0) * multiplier * 100) / 100,
        sodium: Math.round((food.nutritionPer100g.sodium || 0) * multiplier * 100) / 100,
        calculatedAt: new Date(),
        calculationSource: 'food_database',
        confidence: 1
      };
    }
  } else if (this.consumedItem?.itemType === 'recipe') {
    // Récupérer les données nutritionnelles de la Recipe
    const Recipe = mongoose.model('Recipe');
    const recipe = await Recipe.findById(this.consumedItem.itemId);
    
    if (recipe) {
      const servingMultiplier = this.servings;
      this.calculatedNutrition = {
        calories: Math.round((recipe.calories_per_serving || 0) * servingMultiplier * 100) / 100,
        protein: Math.round((recipe.protein_per_serving_g || 0) * servingMultiplier * 100) / 100,
        carbs: Math.round((recipe.carbs_per_serving_g || 0) * servingMultiplier * 100) / 100,
        fat: Math.round((recipe.fat_per_serving_g || 0) * servingMultiplier * 100) / 100,
        fiber: Math.round((recipe.fiber_per_serving_g || 0) * servingMultiplier * 100) / 100,
        sugar: Math.round((recipe.sugar_per_serving_g || 0) * servingMultiplier * 100) / 100,
        sodium: Math.round((recipe.sodium_per_serving_mg || 0) * servingMultiplier * 100) / 100,
        calculatedAt: new Date(),
        calculationSource: 'recipe_computation',
        confidence: 0.95
      };
      
      // Sauvegarder le contexte de la recette
      this.context.originalRecipe = {
        name: recipe.name,
        totalServings: recipe.servings,
        portionConsumed: servingMultiplier / recipe.servings
      };
    }
  }
  
  return this.calculatedNutrition;
};

// Soft delete amélioré
consumptionEntrySchema.methods.softDelete = function(userId, reason = 'user_delete') {
  this.tracking.isDeleted = true;
  this.tracking.deletedAt = new Date();
  this.tracking.deletedBy = userId;
  
  this.tracking.versions.push({
    changedBy: userId,
    changes: { isDeleted: true },
    reason
  });
  
  return this.save();
};

// Restaurer
consumptionEntrySchema.methods.restore = function(userId) {
  this.tracking.isDeleted = false;
  this.tracking.deletedAt = undefined;
  this.tracking.deletedBy = undefined;
  
  this.tracking.versions.push({
    changedBy: userId,
    changes: { isDeleted: false },
    reason: 'restore'
  });
  
  return this.save();
};

// ========== STATIC METHODS ==========

// Recherche unifiée food + recipe
consumptionEntrySchema.statics.findByUserWithDetails = function(userId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    mealType,
    dateFrom,
    dateTo,
    itemType, // 'food', 'recipe', ou undefined pour les deux
    includeDeleted = false,
    sortBy = 'consumedAt',
    sortOrder = -1
  } = options;

  let query = this.find({ userId });
  
  if (!includeDeleted) {
    query = query.where({ 'tracking.isDeleted': false });
  }
  
  if (mealType) query = query.where({ mealType });
  if (itemType) query = query.where({ 'consumedItem.itemType': itemType });
  
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
    .populate('consumedItemRef'); // Populate automatique food ou recipe
};

// Statistiques avancées par type
consumptionEntrySchema.statics.getNutritionStatsByType = function(userId, dateFrom, dateTo) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        consumedAt: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
        'tracking.isDeleted': false
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$consumedAt' } },
          mealType: '$mealType',
          itemType: '$consumedItem.itemType'
        },
        totalCalories: { $sum: '$calculatedNutrition.calories' },
        totalProtein: { $sum: '$calculatedNutrition.protein' },
        totalCarbs: { $sum: '$calculatedNutrition.carbs' },
        totalFat: { $sum: '$calculatedNutrition.fat' },
        entriesCount: { $sum: 1 },
        avgConfidence: { $avg: '$calculatedNutrition.confidence' }
      }
    },
    { $sort: { '_id.date': -1, '_id.mealType': 1 } }
  ]);
};

// Top items (foods + recipes) consommés
consumptionEntrySchema.statics.getTopConsumedItems = function(userId, options = {}) {
  const { limit = 10, period = 'month', itemType } = options;
  
  let dateFilter = {};
  if (period !== 'all') {
    const now = new Date();
    const periodMap = { week: 7, month: 30, year: 365 };
    const days = periodMap[period] || 30;
    dateFilter = { $gte: new Date(now - days * 24 * 60 * 60 * 1000) };
  }

  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    'tracking.isDeleted': false
  };
  
  if (Object.keys(dateFilter).length > 0) {
    matchStage.consumedAt = dateFilter;
  }
  
  if (itemType) {
    matchStage['consumedItem.itemType'] = itemType;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          itemId: '$consumedItem.itemId',
          itemType: '$consumedItem.itemType'
        },
        consumptionCount: { $sum: 1 },
        totalCalories: { $sum: '$calculatedNutrition.calories' },
        avgCaloriesPerServing: { $avg: '$calculatedNutrition.calories' },
        lastConsumed: { $max: '$consumedAt' },
        totalQuantity: {
          $sum: {
            $cond: [
              { $eq: ['$consumedItem.itemType', 'food'] },
              '$quantity',
              '$servings'
            ]
          }
        }
      }
    },
    { $sort: { consumptionCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'foods',
        let: { 
          itemId: '$_id.itemId',
          itemType: '$_id.itemType'
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$itemId'] },
                  { $eq: ['$$itemType', 'food'] }
                ]
              }
            }
          }
        ],
        as: 'foodData'
      }
    },
    {
      $lookup: {
        from: 'recipes',
        let: { 
          itemId: '$_id.itemId',
          itemType: '$_id.itemType'
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$itemId'] },
                  { $eq: ['$$itemType', 'recipe'] }
                ]
              }
            }
          }
        ],
        as: 'recipeData'
      }
    }
  ]);
};

module.exports = {
  ConsumptionEntry: mongoose.model('ConsumptionEntry', consumptionEntrySchema),
  consumptionEntrySchema
};