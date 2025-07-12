const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const foodSchema = new mongoose.Schema({
  food_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true, // Permet les valeurs null
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  brand: {
    type: String,
    trim: true,
    maxlength: 100
  },
  category_id: {
    type: String,
    required: true,
    index: true
  },
  food_type: {
    type: String,
    enum: ['product', 'ingredient', 'recipe', 'composite'],
    required: true,
    index: true
  },
  serving_size_g: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    min: 0
  },
  serving_description: {
    type: String,
    maxlength: 100
  },
  is_verified: {
    type: Boolean,
    default: false,
    index: true
  },
  verification_source: {
    type: String,
    maxlength: 100
  },
  nutri_score: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'E', ''],
    default: ''
  },
  nova_group: {
    type: Number,
    min: 1,
    max: 4
  },
  ecoscore: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'E', ''],
    default: ''
  },
  created_by: {
    type: String, // UUID de l'utilisateur
    index: true
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'foods'
});

// Index composé pour recherche
foodSchema.index({ name: 'text', brand: 'text' });
foodSchema.index({ category_id: 1, food_type: 1 });
foodSchema.index({ is_verified: 1, created_at: -1 });

module.exports = mongoose.model('Food', foodSchema);