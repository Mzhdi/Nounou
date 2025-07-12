// src/models/recipeInstructionModel.js
const mongoose = require('mongoose');

const recipeInstructionSchema = new mongoose.Schema({
  instruction_id: {
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
  step_number: {
    type: Number,
    required: true,
    min: 1
  },
  title: {
    type: String,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  duration_minutes: {
    type: mongoose.Types.Decimal128,
    min: 0
  },
  temperature_celsius: {
    type: Number,
    min: 0,
    max: 300
  },
  technique: {
    type: String,
    enum: [
      'mix', 'stir', 'whisk', 'blend', 'chop', 'dice', 'slice', 'mince',
      'saute', 'fry', 'boil', 'simmer', 'bake', 'roast', 'grill', 'steam',
      'marinate', 'rest', 'chill', 'freeze', 'season', 'knead', 'fold'
    ]
  },
  equipment: [{
    type: String,
    trim: true
  }],
  ingredients_used: [{
    ingredient_id: {
      type: String,
      ref: 'RecipeIngredient'
    },
    note: {
      type: String,
      trim: true,
      maxlength: 200
    }
  }],
  tips: [{
    type: String,
    trim: true,
    maxlength: 500
  }],
  warning: {
    type: String,
    trim: true,
    maxlength: 500
  },
  is_critical: {
    type: Boolean,
    default: false
  },
  group_name: {
    type: String,
    trim: true,
    maxlength: 100
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Index composés pour performance
recipeInstructionSchema.index({ recipe_id: 1, step_number: 1 });
recipeInstructionSchema.index({ recipe_id: 1, group_name: 1, step_number: 1 });

// Validation de l'unicité du step_number par recette
recipeInstructionSchema.index({ recipe_id: 1, step_number: 1 }, { unique: true });

// Méthodes d'instance
recipeInstructionSchema.methods.toJSON = function() {
  const instruction = this.toObject();
  
  // Convertir Decimal128 en nombres
  if (instruction.duration_minutes !== undefined && instruction.duration_minutes !== null) {
    instruction.duration_minutes = parseFloat(instruction.duration_minutes.toString());
  }
  
  return instruction;
};

recipeInstructionSchema.methods.getFullDescription = function() {
  let text = this.description;
  
  if (this.duration_minutes) {
    text += ` (${parseFloat(this.duration_minutes.toString())} minutes)`;
  }
  
  if (this.temperature_celsius) {
    text += ` at ${this.temperature_celsius}°C`;
  }
  
  if (this.warning) {
    text += ` ⚠️ ${this.warning}`;
  }
  
  return text;
};

// Méthodes statiques
recipeInstructionSchema.statics.findByRecipe = function(recipeId) {
  return this.find({ recipe_id: recipeId })
    .sort({ step_number: 1 });
};

recipeInstructionSchema.statics.findByRecipeGrouped = async function(recipeId) {
  const instructions = await this.findByRecipe(recipeId);
  const grouped = {};
  
  instructions.forEach(instruction => {
    const group = instruction.group_name || 'Preparation';
    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push(instruction);
  });
  
  // S'assurer que les étapes sont triées dans chaque groupe
  Object.keys(grouped).forEach(group => {
    grouped[group].sort((a, b) => a.step_number - b.step_number);
  });
  
  return grouped;
};

recipeInstructionSchema.statics.reorderSteps = async function(recipeId, stepUpdates) {
  // stepUpdates est un array de { instruction_id, new_step_number }
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      for (const update of stepUpdates) {
        await this.findByIdAndUpdate(
          update.instruction_id,
          { step_number: update.new_step_number },
          { session }
        );
      }
    });
  } finally {
    await session.endSession();
  }
};

recipeInstructionSchema.statics.getTotalDuration = async function(recipeId) {
  const instructions = await this.find({ recipe_id: recipeId });
  
  let totalDuration = 0;
  instructions.forEach(instruction => {
    if (instruction.duration_minutes) {
      totalDuration += parseFloat(instruction.duration_minutes.toString());
    }
  });
  
  return totalDuration;
};

recipeInstructionSchema.statics.getEquipmentList = async function(recipeId) {
  const instructions = await this.find({ recipe_id: recipeId });
  const equipmentSet = new Set();
  
  instructions.forEach(instruction => {
    instruction.equipment.forEach(item => {
      equipmentSet.add(item);
    });
  });
  
  return Array.from(equipmentSet).sort();
};

const RecipeInstruction = mongoose.model('RecipeInstruction', recipeInstructionSchema, 'recipe_instructions');

module.exports = RecipeInstruction;