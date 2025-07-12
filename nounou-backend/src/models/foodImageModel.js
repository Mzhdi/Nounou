const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const foodImageSchema = new mongoose.Schema({
  image_id: {
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
  image_url: {
    type: String,
    required: true
  },
  image_type: {
    type: String,
    required: true,
    enum: ['product', 'ingredients', 'nutrition_label', 'package']
  },
  is_primary: {
    type: Boolean,
    default: false,
    index: true
  },
  width: {
    type: Number,
    min: 1
  },
  height: {
    type: Number,
    min: 1
  },
  file_size: {
    type: Number,
    min: 1
  },
  uploaded_by: {
    type: String, // UUID de l'utilisateur
    index: true
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'food_images'
});

// Index pour recherche d'images
foodImageSchema.index({ food_id: 1, image_type: 1 });
foodImageSchema.index({ food_id: 1, is_primary: 1 });

module.exports = mongoose.model('FoodImage', foodImageSchema);