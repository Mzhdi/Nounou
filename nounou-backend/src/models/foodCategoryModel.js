const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const foodCategorySchema = new mongoose.Schema({
  category_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  parent_id: {
    type: String,
    default: null,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    maxlength: 100,
    index: true
  },
  level: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
    index: true
  },
  path: {
    type: String, // Materialized path: "/fruits/citrus/oranges"
    required: true,
    index: true
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'food_categories'
});

// Index pour recherche hiérarchique
foodCategorySchema.index({ path: 1, level: 1 });
foodCategorySchema.index({ parent_id: 1, is_active: 1 });

module.exports = mongoose.model('FoodCategory', foodCategorySchema);