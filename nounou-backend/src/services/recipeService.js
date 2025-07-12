// src/services/recipeService.js
const Recipe = require('../models/recipeModel');
const RecipeIngredient = require('../models/recipeIngredientModel');
const RecipeInstruction = require('../models/recipeInstructionModel');
const RecipeImage = require('../models/recipeImageModel');
const RecipeCategory = require('../models/recipeCategoryModel');
const Food = require('../models/foodModel');
const NutritionalValue = require('../models/nutritionalValueModel');

class RecipeService {
  // ===============================
  // CRUD Operations
  // ===============================

  async createRecipe(recipeData, userId) {
    try {
      // Validation des données de base
      if (!recipeData.name || !recipeData.servings) {
        throw new Error('Name and servings are required');
      }

      // Créer la recette principale
      const recipe = new Recipe({
        ...recipeData,
        created_by: userId,
        servings: parseFloat(recipeData.servings)
      });

      await recipe.save();
      return recipe;
    } catch (error) {
      throw new Error(`Failed to create recipe: ${error.message}`);
    }
  }

  async getRecipeById(recipeId, includeDetails = false) {
    try {
      const recipe = await Recipe.findById(recipeId);
      if (!recipe) {
        throw new Error('Recipe not found');
      }

      if (includeDetails) {
        return await this.getRecipeWithDetails(recipeId);
      }

      return recipe;
    } catch (error) {
      throw new Error(`Failed to get recipe: ${error.message}`);
    }
  }

  async getRecipeWithDetails(recipeId) {
    try {
      const [recipe, ingredients, instructions, images, category] = await Promise.all([
        Recipe.findById(recipeId),
        this.getRecipeIngredients(recipeId),
        RecipeInstruction.findByRecipe(recipeId),
        RecipeImage.findByRecipe(recipeId),
        null // Will be populated if recipe has category_id
      ]);

      if (!recipe) {
        throw new Error('Recipe not found');
      }

      // Récupérer la catégorie si elle existe
      let categoryInfo = null;
      if (recipe.category_id) {
        categoryInfo = await RecipeCategory.findById(recipe.category_id);
      }

      return {
        ...recipe.toObject(),
        ingredients,
        instructions,
        images,
        category: categoryInfo
      };
    } catch (error) {
      throw new Error(`Failed to get recipe details: ${error.message}`);
    }
  }

  async updateRecipe(recipeId, updateData, userId) {
    try {
      const recipe = await Recipe.findById(recipeId);
      if (!recipe) {
        throw new Error('Recipe not found');
      }

      // Vérifier les permissions
      if (recipe.created_by !== userId) {
        throw new Error('Not authorized to update this recipe');
      }

      // Mettre à jour la recette
      Object.assign(recipe, updateData);
      await recipe.save();

      // Recalculer les valeurs nutritionnelles si nécessaire
      if (updateData.servings) {
        await this.updateNutritionalValues(recipeId);
      }

      return recipe;
    } catch (error) {
      throw new Error(`Failed to update recipe: ${error.message}`);
    }
  }

  async deleteRecipe(recipeId, userId) {
    try {
      const recipe = await Recipe.findById(recipeId);
      if (!recipe) {
        throw new Error('Recipe not found');
      }

      // Vérifier les permissions
      if (recipe.created_by !== userId) {
        throw new Error('Not authorized to delete this recipe');
      }

      // Supprimer toutes les données associées
      await Promise.all([
        RecipeIngredient.deleteMany({ recipe_id: recipeId }),
        RecipeInstruction.deleteMany({ recipe_id: recipeId }),
        RecipeImage.deleteMany({ recipe_id: recipeId }),
        Recipe.findByIdAndDelete(recipeId)
      ]);

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete recipe: ${error.message}`);
    }
  }

  // ===============================
  // Ingredients Management
  // ===============================

  async addIngredient(recipeId, ingredientData, userId) {
    try {
      // Vérifier que la recette appartient à l'utilisateur
      const recipe = await Recipe.findById(recipeId);
      if (!recipe || recipe.created_by !== userId) {
        throw new Error('Recipe not found or not authorized');
      }

      // Vérifier que l'aliment existe
      const food = await Food.findById(ingredientData.food_id);
      if (!food) {
        throw new Error('Food not found');
      }

      // Créer l'ingrédient
      const ingredient = new RecipeIngredient({
        recipe_id: recipeId,
        food_id: ingredientData.food_id,
        quantity: parseFloat(ingredientData.quantity),
        unit: ingredientData.unit,
        preparation_note: ingredientData.preparation_note,
        is_optional: ingredientData.is_optional || false,
        group_name: ingredientData.group_name,
        sort_order: ingredientData.sort_order || 0
      });

      // Calculer les valeurs nutritionnelles
      await this.calculateIngredientNutrition(ingredient, food);
      await ingredient.save();

      // Mettre à jour les valeurs nutritionnelles de la recette
      await this.updateNutritionalValues(recipeId);

      return ingredient;
    } catch (error) {
      throw new Error(`Failed to add ingredient: ${error.message}`);
    }
  }

  async getRecipeIngredients(recipeId) {
    try {
      const ingredients = await RecipeIngredient.find({ recipe_id: recipeId })
        .sort({ group_name: 1, sort_order: 1, created_at: 1 });

      // Enrichir avec les informations des aliments
      const enrichedIngredients = await Promise.all(
        ingredients.map(async (ingredient) => {
          const food = await Food.findById(ingredient.food_id);
          return {
            ...ingredient.toObject(),
            food: food ? food.toObject() : null
          };
        })
      );

      return enrichedIngredients;
    } catch (error) {
      throw new Error(`Failed to get ingredients: ${error.message}`);
    }
  }

  async updateIngredient(ingredientId, updateData, userId) {
    try {
      const ingredient = await RecipeIngredient.findById(ingredientId);
      if (!ingredient) {
        throw new Error('Ingredient not found');
      }

      // Vérifier les permissions via la recette
      const recipe = await Recipe.findById(ingredient.recipe_id);
      if (!recipe || recipe.created_by !== userId) {
        throw new Error('Not authorized to update this ingredient');
      }

      // Mettre à jour l'ingrédient
      Object.assign(ingredient, updateData);

      // Recalculer la nutrition si quantité ou aliment changé
      if (updateData.quantity || updateData.food_id) {
        const food = await Food.findById(ingredient.food_id);
        await this.calculateIngredientNutrition(ingredient, food);
      }

      await ingredient.save();

      // Mettre à jour les valeurs nutritionnelles de la recette
      await this.updateNutritionalValues(ingredient.recipe_id);

      return ingredient;
    } catch (error) {
      throw new Error(`Failed to update ingredient: ${error.message}`);
    }
  }

  async removeIngredient(ingredientId, userId) {
    try {
      const ingredient = await RecipeIngredient.findById(ingredientId);
      if (!ingredient) {
        throw new Error('Ingredient not found');
      }

      // Vérifier les permissions
      const recipe = await Recipe.findById(ingredient.recipe_id);
      if (!recipe || recipe.created_by !== userId) {
        throw new Error('Not authorized to remove this ingredient');
      }

      const recipeId = ingredient.recipe_id;
      await RecipeIngredient.findByIdAndDelete(ingredientId);

      // Mettre à jour les valeurs nutritionnelles de la recette
      await this.updateNutritionalValues(recipeId);

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to remove ingredient: ${error.message}`);
    }
  }

  // ===============================
  // Instructions Management
  // ===============================

  async addInstruction(recipeId, instructionData, userId) {
    try {
      // Vérifier les permissions
      const recipe = await Recipe.findById(recipeId);
      if (!recipe || recipe.created_by !== userId) {
        throw new Error('Recipe not found or not authorized');
      }

      // Déterminer le numéro d'étape automatiquement si non fourni
      let stepNumber = instructionData.step_number;
      if (!stepNumber) {
        const lastInstruction = await RecipeInstruction.findOne({ recipe_id: recipeId })
          .sort({ step_number: -1 });
        stepNumber = lastInstruction ? lastInstruction.step_number + 1 : 1;
      }

      const instruction = new RecipeInstruction({
        recipe_id: recipeId,
        step_number: stepNumber,
        title: instructionData.title,
        description: instructionData.description,
        duration_minutes: instructionData.duration_minutes ? 
          parseFloat(instructionData.duration_minutes) : undefined,
        temperature_celsius: instructionData.temperature_celsius,
        technique: instructionData.technique,
        equipment: instructionData.equipment || [],
        tips: instructionData.tips || [],
        warning: instructionData.warning,
        is_critical: instructionData.is_critical || false,
        group_name: instructionData.group_name
      });

      await instruction.save();
      return instruction;
    } catch (error) {
      throw new Error(`Failed to add instruction: ${error.message}`);
    }
  }

  async updateInstruction(instructionId, updateData, userId) {
    try {
      const instruction = await RecipeInstruction.findById(instructionId);
      if (!instruction) {
        throw new Error('Instruction not found');
      }

      // Vérifier les permissions
      const recipe = await Recipe.findById(instruction.recipe_id);
      if (!recipe || recipe.created_by !== userId) {
        throw new Error('Not authorized to update this instruction');
      }

      Object.assign(instruction, updateData);
      await instruction.save();

      return instruction;
    } catch (error) {
      throw new Error(`Failed to update instruction: ${error.message}`);
    }
  }

  async removeInstruction(instructionId, userId) {
    try {
      const instruction = await RecipeInstruction.findById(instructionId);
      if (!instruction) {
        throw new Error('Instruction not found');
      }

      // Vérifier les permissions
      const recipe = await Recipe.findById(instruction.recipe_id);
      if (!recipe || recipe.created_by !== userId) {
        throw new Error('Not authorized to remove this instruction');
      }

      await RecipeInstruction.findByIdAndDelete(instructionId);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to remove instruction: ${error.message}`);
    }
  }

  // ===============================
  // Nutritional Calculations
  // ===============================

  async calculateIngredientNutrition(ingredient, food) {
    try {
      // Récupérer les valeurs nutritionnelles de l'aliment
      const nutrition = await NutritionalValue.findOne({ food_id: food._id.toString() });
      if (!nutrition) {
        return; // Pas de données nutritionnelles disponibles
      }

      // Convertir la quantité en grammes selon l'unité
      const quantityInGrams = this.convertToGrams(
        parseFloat(ingredient.quantity.toString()),
        ingredient.unit,
        food
      );

      // Calculer les valeurs pour cette quantité (nutrition est pour 100g)
      const factor = quantityInGrams / 100;

      ingredient.calories_calculated = nutrition.calories ? 
        parseFloat(nutrition.calories.toString()) * factor : 0;
      ingredient.protein_calculated_g = nutrition.protein_g ? 
        parseFloat(nutrition.protein_g.toString()) * factor : 0;
      ingredient.carbs_calculated_g = nutrition.carbohydrates_g ? 
        parseFloat(nutrition.carbohydrates_g.toString()) * factor : 0;
      ingredient.fat_calculated_g = nutrition.fat_g ? 
        parseFloat(nutrition.fat_g.toString()) * factor : 0;
      ingredient.fiber_calculated_g = nutrition.fiber_g ? 
        parseFloat(nutrition.fiber_g.toString()) * factor : 0;
      ingredient.sugar_calculated_g = nutrition.sugars_g ? 
        parseFloat(nutrition.sugars_g.toString()) * factor : 0;
      ingredient.sodium_calculated_mg = nutrition.sodium_mg ? 
        parseFloat(nutrition.sodium_mg.toString()) * factor : 0;

    } catch (error) {
      console.error('Error calculating ingredient nutrition:', error);
    }
  }

  convertToGrams(quantity, unit, food) {
    // Conversions basiques - peut être étendu selon les besoins
    const conversions = {
      'g': 1,
      'kg': 1000,
      'ml': 1, // Approximation pour liquides
      'l': 1000,
      'cup': 240, // Approximation générale
      'cups': 240,
      'tbsp': 15,
      'tsp': 5,
      'piece': food.serving_size_g ? parseFloat(food.serving_size_g.toString()) : 100,
      'pieces': food.serving_size_g ? parseFloat(food.serving_size_g.toString()) : 100,
      'slice': food.serving_size_g ? parseFloat(food.serving_size_g.toString()) / 10 : 30,
      'slices': food.serving_size_g ? parseFloat(food.serving_size_g.toString()) / 10 : 30,
      'oz': 28.35,
      'lb': 453.6
    };

    return quantity * (conversions[unit] || 1);
  }

  async updateNutritionalValues(recipeId) {
    try {
      const recipe = await Recipe.findById(recipeId);
      if (!recipe) {
        return;
      }

      // Calculer les totaux nutritionnels
      const totals = await RecipeIngredient.calculateNutrition(recipeId);
      const servings = parseFloat(recipe.servings.toString());

      // Mettre à jour les valeurs par portion
      recipe.calories_per_serving = totals.calories / servings;
      recipe.protein_per_serving_g = totals.protein_g / servings;
      recipe.carbs_per_serving_g = totals.carbs_g / servings;
      recipe.fat_per_serving_g = totals.fat_g / servings;
      recipe.fiber_per_serving_g = totals.fiber_g / servings;
      recipe.sugar_per_serving_g = totals.sugar_g / servings;
      recipe.sodium_per_serving_mg = totals.sodium_mg / servings;

      await recipe.save();
    } catch (error) {
      console.error('Error updating nutritional values:', error);
    }
  }

  // ===============================
  // Search and Filtering
  // ===============================

  async searchRecipes(filters = {}, pagination = {}) {
    try {
      const {
        search,
        category_id,
        created_by,
        is_public,
        diet_types,
        difficulty_level,
        max_prep_time,
        tags
      } = filters;

      const {
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = pagination;

      // Construire la query
      const query = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      if (category_id) {
        query.category_id = category_id;
      }

      if (created_by) {
        query.created_by = created_by;
      }

      if (is_public !== undefined) {
        query.is_public = is_public;
      }

      if (diet_types && diet_types.length > 0) {
        query.diet_types = { $in: diet_types };
      }

      if (difficulty_level) {
        query.difficulty_level = difficulty_level;
      }

      if (max_prep_time) {
        query.prep_time_minutes = { $lte: parseFloat(max_prep_time) };
      }

      if (tags && tags.length > 0) {
        query.tags = { $in: tags };
      }

      // Pagination
      const skip = (page - 1) * limit;
      const sortOptions = {};
      sortOptions[sort_by] = sort_order === 'desc' ? -1 : 1;

      // Exécuter la requête
      const [recipes, total] = await Promise.all([
        Recipe.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit),
        Recipe.countDocuments(query)
      ]);

      return {
        recipes,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: limit
        }
      };
    } catch (error) {
      throw new Error(`Failed to search recipes: ${error.message}`);
    }
  }

  async getPublicRecipes(pagination = {}) {
    return await this.searchRecipes(
      { is_public: true, is_verified: true },
      pagination
    );
  }

  async getUserRecipes(userId, pagination = {}) {
    return await this.searchRecipes(
      { created_by: userId },
      pagination
    );
  }

  // ===============================
  // Complete Recipe Operations
  // ===============================

  async createCompleteRecipe(recipeData, userId) {
    try {
      // Créer la recette de base
      const recipe = await this.createRecipe(recipeData, userId);

      // Ajouter les ingrédients
      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        for (const ingredientData of recipeData.ingredients) {
          await this.addIngredient(recipe._id.toString(), ingredientData, userId);
        }
      }

      // Ajouter les instructions
      if (recipeData.instructions && recipeData.instructions.length > 0) {
        for (const instructionData of recipeData.instructions) {
          await this.addInstruction(recipe._id.toString(), instructionData, userId);
        }
      }

      // Retourner la recette complète
      return await this.getRecipeWithDetails(recipe._id.toString());
    } catch (error) {
      throw new Error(`Failed to create complete recipe: ${error.message}`);
    }
  }
}

module.exports = new RecipeService();