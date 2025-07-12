// src/models/recipeCategoryModel.js
const mongoose = require('mongoose');

const recipeCategorySchema = new mongoose.Schema({
  category_id: {
    type: String,
    unique: true,
    default: () => require('crypto').randomUUID()
  },
  parent_id: {
    type: String,
    ref: 'RecipeCategory',
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
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  level: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
    default: 0
  },
  path: {
    type: String,
    required: true,
    index: true
  },
  icon_name: {
    type: String,
    trim: true
  },
  color_hex: {
    type: String,
    match: /^#[0-9A-F]{6}$/i
  },
  sort_order: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  recipe_count: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Index composés
recipeCategorySchema.index({ parent_id: 1, sort_order: 1 });
recipeCategorySchema.index({ level: 1, is_active: 1 });
recipeCategorySchema.index({ path: 1, is_active: 1 });

// Validation du slug
recipeCategorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.isModified('slug')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Validation du path
recipeCategorySchema.pre('save', async function(next) {
  if (this.isModified('parent_id') || this.isModified('slug')) {
    if (this.parent_id) {
      const parent = await this.constructor.findById(this.parent_id);
      if (!parent) {
        return next(new Error('Parent category not found'));
      }
      this.path = `${parent.path}/${this.slug}`;
      this.level = parent.level + 1;
    } else {
      this.path = `/${this.slug}`;
      this.level = 0;
    }
  }
  next();
});

// Méthodes d'instance
recipeCategorySchema.methods.getChildren = function() {
  return this.constructor.find({ parent_id: this._id.toString(), is_active: true })
    .sort({ sort_order: 1, name: 1 });
};

recipeCategorySchema.methods.getParents = async function() {
  const parents = [];
  let current = this;
  
  while (current.parent_id) {
    const parent = await this.constructor.findById(current.parent_id);
    if (!parent) break;
    parents.unshift(parent);
    current = parent;
  }
  
  return parents;
};

recipeCategorySchema.methods.getFullPath = async function() {
  const parents = await this.getParents();
  return [...parents, this];
};

// Méthodes statiques
recipeCategorySchema.statics.findRoots = function() {
  return this.find({ parent_id: null, is_active: true })
    .sort({ sort_order: 1, name: 1 });
};

recipeCategorySchema.statics.findByLevel = function(level) {
  return this.find({ level, is_active: true })
    .sort({ sort_order: 1, name: 1 });
};

recipeCategorySchema.statics.buildTree = async function() {
  const categories = await this.find({ is_active: true })
    .sort({ level: 1, sort_order: 1, name: 1 });
  
  const tree = [];
  const map = new Map();
  
  // Créer une map avec tous les éléments
  categories.forEach(cat => {
    const catObj = cat.toObject();
    catObj.children = [];
    map.set(cat._id.toString(), catObj);
  });
  
  // Construire l'arbre
  categories.forEach(cat => {
    const catObj = map.get(cat._id.toString());
    if (cat.parent_id) {
      const parent = map.get(cat.parent_id);
      if (parent) {
        parent.children.push(catObj);
      }
    } else {
      tree.push(catObj);
    }
  });
  
  return tree;
};

const RecipeCategory = mongoose.model('RecipeCategory', recipeCategorySchema, 'recipe_categories');

module.exports = RecipeCategory;