const mongoose = require('mongoose');

const foodAllergenSchema = new mongoose.Schema({
  food_id: {
    type: String,
    required: true,
    index: true
  },
  allergen: {
    type: String,
    required: true,
    enum: [
      'gluten', 'milk', 'eggs', 'nuts', 'peanuts', 
      'sesame', 'soy', 'fish', 'shellfish', 'sulfites'
    ]
  },
  presence: {
    type: String,
    required: true,
    enum: ['contains', 'may_contain', 'free']
  }
}, {
  collection: 'food_allergens'
});

// Index composé unique
foodAllergenSchema.index({ food_id: 1, allergen: 1 }, { unique: true });

module.exports = mongoose.model('FoodAllergen', foodAllergenSchema);