// src/models/recipeModel.js
const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  recipe_id: {
    type: String,
    unique: true,
    default: () => require('crypto').randomUUID()
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  category_id: {
    type: String,
    ref: 'RecipeCategory',
    index: true
  },
  recipe_type: {
    type: String,
    enum: ['personal', 'public', 'premium'],
    default: 'personal',
    index: true
  },
  difficulty_level: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  prep_time_minutes: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  cook_time_minutes: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  total_time_minutes: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  servings: {
    type: mongoose.Types.Decimal128,
    required: true,
    min: 1,
    default: 1
  },
  serving_size_g: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  is_verified: {
    type: Boolean,
    default: false,
    index: true
  },
  is_public: {
    type: Boolean,
    default: false,
    index: true
  },
  created_by: {
    type: String,
    required: true,
    index: true
  },
  // Valeurs nutritionnelles calculées (par portion)
  calories_per_serving: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  protein_per_serving_g: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  carbs_per_serving_g: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  fat_per_serving_g: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  fiber_per_serving_g: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  sugar_per_serving_g: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  sodium_per_serving_mg: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  // Metadata
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  cuisine_type: {
    type: String,
    trim: true
  },
  diet_types: [{
    type: String,
    enum: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'keto', 'paleo', 'low_carb', 'low_fat']
  }],
  allergens: [{
    type: String,
    enum: ['gluten', 'milk', 'eggs', 'nuts', 'peanuts', 'soy', 'fish', 'shellfish', 'sesame']
  }],
  // Stats
  favorite_count: {
    type: Number,
    default: 0,
    min: 0
  },
  rating_average: {
    type: mongoose.Types.Decimal128,
    min: 0,
    max: 5
  },
  rating_count: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Index composés pour performance
recipeSchema.index({ created_by: 1, created_at: -1 });
recipeSchema.index({ is_public: 1, is_verified: 1, created_at: -1 });
recipeSchema.index({ category_id: 1, is_public: 1 });
recipeSchema.index({ recipe_type: 1, created_by: 1 });
recipeSchema.index({ tags: 1 });
recipeSchema.index({ diet_types: 1 });

// Méthodes d'instance
recipeSchema.methods.toJSON = function() {
  const recipe = this.toObject();
  
  // Convertir Decimal128 en nombres
  const decimalFields = [
    'prep_time_minutes', 'cook_time_minutes', 'total_time_minutes', 'servings',
    'serving_size_g', 'calories_per_serving', 'protein_per_serving_g',
    'carbs_per_serving_g', 'fat_per_serving_g', 'fiber_per_serving_g',
    'sugar_per_serving_g', 'sodium_per_serving_mg', 'rating_average'
  ];
  
  decimalFields.forEach(field => {
    if (recipe[field] !== undefined && recipe[field] !== null) {
      recipe[field] = parseFloat(recipe[field].toString());
    }
  });
  
  return recipe;
};

// Méthodes statiques
recipeSchema.statics.findPublic = function(filters = {}) {
  return this.find({
    is_public: true,
    is_verified: true,
    ...filters
  });
};

recipeSchema.statics.findByUser = function(userId, includePrivate = true) {
  const query = { created_by: userId };
  if (!includePrivate) {
    query.is_public = true;
  }
  return this.find(query);
};

const Recipe = mongoose.model('Recipe', recipeSchema, 'recipes');

module.exports = Recipe;