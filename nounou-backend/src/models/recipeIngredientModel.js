// src/models/recipeIngredientModel.js
const mongoose = require('mongoose');

const recipeIngredientSchema = new mongoose.Schema({
  ingredient_id: {
    type: String,
    unique: true,
    default: () => require('crypto').randomUUID()
  },
  recipe_id: {
    type: String,
    required: true,
    ref: 'Recipe',
    index: true
  },
  food_id: {
    type: String,
    required: true,
    ref: 'Food',
    index: true
  },
  quantity: {
    type: mongoose.Types.Decimal128,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: [
      'g', 'kg', 'ml', 'l', 'cup', 'cups', 'tbsp', 'tsp', 
      'piece', 'pieces', 'slice', 'slices', 'can', 'cans',
      'package', 'packages', 'handful', 'pinch', 'dash',
      'oz', 'lb', 'fl_oz', 'pt', 'qt', 'gal'
    ]
  },
  preparation_note: {
    type: String,
    trim: true,
    maxlength: 200
  },
  is_optional: {
    type: Boolean,
    default: false
  },
  group_name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  sort_order: {
    type: Number,
    default: 0,
    min: 0
  },
  // Valeurs nutritionnelles calculées pour cette quantité spécifique
  calories_calculated: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  protein_calculated_g: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  carbs_calculated_g: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  fat_calculated_g: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  fiber_calculated_g: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  sugar_calculated_g: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  sodium_calculated_mg: {
    type: mongoose.Types.Decimal128,
    min: 0
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Index composés pour performance
recipeIngredientSchema.index({ recipe_id: 1, sort_order: 1 });
recipeIngredientSchema.index({ recipe_id: 1, group_name: 1, sort_order: 1 });
recipeIngredientSchema.index({ food_id: 1 });

// Validation des unités cohérentes
recipeIngredientSchema.pre('save', function(next) {
  const liquidUnits = ['ml', 'l', 'fl_oz', 'pt', 'qt', 'gal'];
  const solidUnits = ['g', 'kg', 'oz', 'lb'];
  const volumeUnits = ['cup', 'cups', 'tbsp', 'tsp'];
  
  // Validation basique des unités (peut être étendue selon les besoins)
  next();
});

// Méthodes d'instance
recipeIngredientSchema.methods.toJSON = function() {
  const ingredient = this.toObject();
  
  // Convertir Decimal128 en nombres
  const decimalFields = [
    'quantity', 'calories_calculated', 'protein_calculated_g',
    'carbs_calculated_g', 'fat_calculated_g', 'fiber_calculated_g',
    'sugar_calculated_g', 'sodium_calculated_mg'
  ];
  
  decimalFields.forEach(field => {
    if (ingredient[field] !== undefined && ingredient[field] !== null) {
      ingredient[field] = parseFloat(ingredient[field].toString());
    }
  });
  
  return ingredient;
};

recipeIngredientSchema.methods.getDisplayText = function() {
  let text = `${parseFloat(this.quantity.toString())} ${this.unit}`;
  
  if (this.preparation_note) {
    text += ` ${this.preparation_note}`;
  }
  
  if (this.is_optional) {
    text += ' (optional)';
  }
  
  return text;
};

// Méthodes statiques
recipeIngredientSchema.statics.findByRecipe = function(recipeId) {
  return this.find({ recipe_id: recipeId })
    .sort({ group_name: 1, sort_order: 1, created_at: 1 });
};

recipeIngredientSchema.statics.findByRecipeGrouped = async function(recipeId) {
  const ingredients = await this.findByRecipe(recipeId);
  const grouped = {};
  
  ingredients.forEach(ingredient => {
    const group = ingredient.group_name || 'Main Ingredients';
    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push(ingredient);
  });
  
  return grouped;
};

recipeIngredientSchema.statics.calculateNutrition = async function(recipeId) {
  const ingredients = await this.find({ recipe_id: recipeId });
  
  const totals = {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 0
  };
  
  ingredients.forEach(ingredient => {
    if (ingredient.calories_calculated) {
      totals.calories += parseFloat(ingredient.calories_calculated.toString());
    }
    if (ingredient.protein_calculated_g) {
      totals.protein_g += parseFloat(ingredient.protein_calculated_g.toString());
    }
    if (ingredient.carbs_calculated_g) {
      totals.carbs_g += parseFloat(ingredient.carbs_calculated_g.toString());
    }
    if (ingredient.fat_calculated_g) {
      totals.fat_g += parseFloat(ingredient.fat_calculated_g.toString());
    }
    if (ingredient.fiber_calculated_g) {
      totals.fiber_g += parseFloat(ingredient.fiber_calculated_g.toString());
    }
    if (ingredient.sugar_calculated_g) {
      totals.sugar_g += parseFloat(ingredient.sugar_calculated_g.toString());
    }
    if (ingredient.sodium_calculated_mg) {
      totals.sodium_mg += parseFloat(ingredient.sodium_calculated_mg.toString());
    }
  });
  
  return totals;
};

const RecipeIngredient = mongoose.model('RecipeIngredient', recipeIngredientSchema, 'recipe_ingredients');

module.exports = RecipeIngredient;