const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const nutritionalValueSchema = new mongoose.Schema({
  nutrition_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  food_id: {
    type: String,
    required: true,
    index: true
  },
  per_100g: {
    type: Boolean,
    default: true
  },
  calories: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    min: 0
  },
  protein_g: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  carbohydrates_g: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  sugars_g: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  fat_g: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  saturated_fat_g: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  fiber_g: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  sodium_mg: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  calcium_mg: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  iron_mg: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  vitamin_c_mg: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  vitamin_d_ug: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  source: {
    type: String,
    maxlength: 100
  },
  confidence_score: {
    type: mongoose.Schema.Types.Decimal128,
    min: 0,
    max: 1,
    default: 1.0
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'nutritional_values'
});

// Un seul profil nutritionnel par aliment
nutritionalValueSchema.index({ food_id: 1 }, { unique: true });

module.exports = mongoose.model('NutritionalValue', nutritionalValueSchema);