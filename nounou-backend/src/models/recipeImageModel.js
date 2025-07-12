// src/models/recipeImageModel.js
const mongoose = require('mongoose');

const recipeImageSchema = new mongoose.Schema({
  image_id: {
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
  instruction_id: {
    type: String,
    ref: 'RecipeInstruction',
    default: null,
    index: true
  },
  image_url: {
    type: String,
    required: true,
    trim: true
  },
  image_type: {
    type: String,
    required: true,
    enum: [
      'cover',           // Image principale de la recette
      'ingredient',      // Photo des ingrédients
      'step',           // Photo d'une étape spécifique
      'final_result',   // Résultat final
      'process',        // Photo du processus de préparation
      'plating',        // Photo du dressage
      'variation'       // Variante de présentation
    ],
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  alt_text: {
    type: String,
    trim: true,
    maxlength: 200
  },
  is_primary: {
    type: Boolean,
    default: false,
    index: true
  },
  sort_order: {
    type: Number,
    default: 0,
    min: 0
  },
  // Métadonnées de l'image
  file_size_bytes: {
    type: Number,
    min: 0
  },
  width_px: {
    type: Number,
    min: 0
  },
  height_px: {
    type: Number,
    min: 0
  },
  format: {
    type: String,
    enum: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    lowercase: true
  },
  // Upload info
  uploaded_by: {
    type: String,
    required: true,
    index: true
  },
  upload_source: {
    type: String,
    enum: ['user_upload', 'ai_generated', 'stock_photo', 'imported'],
    default: 'user_upload'
  },
  // Modération
  is_approved: {
    type: Boolean,
    default: true,
    index: true
  },
  moderation_notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Index composés pour performance
recipeImageSchema.index({ recipe_id: 1, image_type: 1, sort_order: 1 });
recipeImageSchema.index({ recipe_id: 1, is_primary: 1 });
recipeImageSchema.index({ instruction_id: 1, sort_order: 1 });
recipeImageSchema.index({ uploaded_by: 1, created_at: -1 });

// Validation : une seule image primaire par recette
recipeImageSchema.pre('save', async function(next) {
  if (this.is_primary && this.isModified('is_primary')) {
    // Retirer le statut primaire des autres images de cette recette
    await this.constructor.updateMany(
      { 
        recipe_id: this.recipe_id, 
        _id: { $ne: this._id },
        is_primary: true 
      },
      { is_primary: false }
    );
  }
  next();
});

// Méthodes d'instance
recipeImageSchema.methods.getImageInfo = function() {
  return {
    id: this._id,
    url: this.image_url,
    type: this.image_type,
    title: this.title,
    alt_text: this.alt_text || this.title || `${this.image_type} image`,
    is_primary: this.is_primary,
    dimensions: this.width_px && this.height_px ? {
      width: this.width_px,
      height: this.height_px
    } : null
  };
};

recipeImageSchema.methods.getResponsiveUrls = function() {
  // Cette méthode pourrait générer différentes tailles d'images
  // selon votre système de stockage (CloudFront, Cloudinary, etc.)
  const baseUrl = this.image_url;
  
  return {
    thumbnail: baseUrl, // Pour l'instant, même URL
    small: baseUrl,
    medium: baseUrl,
    large: baseUrl,
    original: baseUrl
  };
};

// Méthodes statiques
recipeImageSchema.statics.findByRecipe = function(recipeId, imageType = null) {
  const query = { recipe_id: recipeId, is_approved: true };
  if (imageType) {
    query.image_type = imageType;
  }
  
  return this.find(query)
    .sort({ is_primary: -1, sort_order: 1, created_at: 1 });
};

recipeImageSchema.statics.findPrimaryImage = function(recipeId) {
  return this.findOne({ 
    recipe_id: recipeId, 
    is_primary: true, 
    is_approved: true 
  });
};

recipeImageSchema.statics.findByInstruction = function(instructionId) {
  return this.find({ 
    instruction_id: instructionId, 
    is_approved: true 
  }).sort({ sort_order: 1, created_at: 1 });
};

recipeImageSchema.statics.setCoverImage = async function(recipeId, imageId) {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Retirer le statut primaire de toutes les images
      await this.updateMany(
        { recipe_id: recipeId },
        { is_primary: false, image_type: 'process' },
        { session }
      );
      
      // Définir la nouvelle image comme cover et primaire
      await this.findByIdAndUpdate(
        imageId,
        { 
          is_primary: true, 
          image_type: 'cover',
          sort_order: 0
        },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
};

recipeImageSchema.statics.getImageStats = async function(recipeId) {
  const images = await this.find({ recipe_id: recipeId, is_approved: true });
  
  const stats = {
    total: images.length,
    by_type: {},
    has_cover: false,
    total_size_bytes: 0
  };
  
  images.forEach(image => {
    // Count by type
    if (!stats.by_type[image.image_type]) {
      stats.by_type[image.image_type] = 0;
    }
    stats.by_type[image.image_type]++;
    
    // Check for cover
    if (image.image_type === 'cover' || image.is_primary) {
      stats.has_cover = true;
    }
    
    // Total size
    if (image.file_size_bytes) {
      stats.total_size_bytes += image.file_size_bytes;
    }
  });
  
  return stats;
};

const RecipeImage = mongoose.model('RecipeImage', recipeImageSchema, 'recipe_images');

module.exports = RecipeImage;