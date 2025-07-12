const recipeService = require('../services/recipeService');
const ApiResponse = require('../utils/responses');

class RecipeController {
  async createRecipe(req, res) {
    try {
      const { user } = req;
      const recipeData = req.body;

      if (!recipeData.name || !recipeData.servings) {
        return ApiResponse.badRequestError(res, 'Name and servings are required');
      }

      const recipe = await recipeService.createRecipe(recipeData, user.id);
      return ApiResponse.created(res, { recipe }, 'Recipe created successfully');
    } catch (error) {
      console.error('Create recipe error:', error);
      return ApiResponse.serverError(res, error.message);
    }
  }

  async getRecipes(req, res) {
    try {
      const { user } = req;
      const {
        search,
        category_id,
        is_public,
        diet_types,
        difficulty_level,
        max_prep_time,
        tags,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'desc',
        my_recipes = false
      } = req.query;

      const filters = {};
      
      if (search) filters.search = search;
      if (category_id) filters.category_id = category_id;
      if (difficulty_level) filters.difficulty_level = difficulty_level;
      if (max_prep_time) filters.max_prep_time = parseFloat(max_prep_time);
      
      if (diet_types) {
        filters.diet_types = Array.isArray(diet_types) ? diet_types : [diet_types];
      }
      
      if (tags) {
        filters.tags = Array.isArray(tags) ? tags : [tags];
      }

      if (my_recipes === 'true' && user) {
        filters.created_by = user.id;
      } else if (is_public !== undefined) {
        filters.is_public = is_public === 'true';
      } else {
        if (!user || my_recipes !== 'true') {
          filters.is_public = true;
        }
      }

      const pagination = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        sort_by,
        sort_order
      };

      const result = await recipeService.searchRecipes(filters, pagination);
      return ApiResponse.paginated(res, result.recipes, result.pagination, 'Recipes retrieved successfully');
    } catch (error) {
      console.error('Get recipes error:', error);
      return ApiResponse.serverError(res, error.message);
    }
  }

  async getRecipeById(req, res) {
    try {
      const { recipeId } = req.params;
      const { include_details = 'true' } = req.query;

      const recipe = await recipeService.getRecipeById(recipeId, include_details === 'true');
      return ApiResponse.success(res, { recipe }, 'Recipe retrieved successfully');
    } catch (error) {
      console.error('Get recipe error:', error);
      if (error.message.includes('not found')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async updateRecipe(req, res) {
    try {
      const { user } = req;
      const { recipeId } = req.params;
      const updateData = req.body;

      const recipe = await recipeService.updateRecipe(recipeId, updateData, user.id);
      return ApiResponse.success(res, { recipe }, 'Recipe updated successfully');
    } catch (error) {
      console.error('Update recipe error:', error);
      if (error.message.includes('not found')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      if (error.message.includes('Not authorized')) {
        return ApiResponse.forbiddenError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async deleteRecipe(req, res) {
    try {
      const { user } = req;
      const { recipeId } = req.params;

      await recipeService.deleteRecipe(recipeId, user.id);
      return ApiResponse.success(res, null, 'Recipe deleted successfully');
    } catch (error) {
      console.error('Delete recipe error:', error);
      if (error.message.includes('not found')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      if (error.message.includes('Not authorized')) {
        return ApiResponse.forbiddenError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async addIngredient(req, res) {
    try {
      const { user } = req;
      const { recipeId } = req.params;
      const ingredientData = req.body;

      if (!ingredientData.food_id || !ingredientData.quantity || !ingredientData.unit) {
        return ApiResponse.badRequestError(res, 'food_id, quantity, and unit are required');
      }

      const ingredient = await recipeService.addIngredient(recipeId, ingredientData, user.id);
      return ApiResponse.created(res, { ingredient }, 'Ingredient added successfully');
    } catch (error) {
      console.error('Add ingredient error:', error);
      if (error.message.includes('not found') || error.message.includes('not authorized')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async getRecipeIngredients(req, res) {
    try {
      const { recipeId } = req.params;
      const ingredients = await recipeService.getRecipeIngredients(recipeId);
      return ApiResponse.success(res, { ingredients }, 'Ingredients retrieved successfully');
    } catch (error) {
      console.error('Get ingredients error:', error);
      return ApiResponse.serverError(res, error.message);
    }
  }

  async updateIngredient(req, res) {
    try {
      const { user } = req;
      const { ingredientId } = req.params;
      const updateData = req.body;

      const ingredient = await recipeService.updateIngredient(ingredientId, updateData, user.id);
      return ApiResponse.success(res, { ingredient }, 'Ingredient updated successfully');
    } catch (error) {
      console.error('Update ingredient error:', error);
      if (error.message.includes('not found')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      if (error.message.includes('Not authorized')) {
        return ApiResponse.forbiddenError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async removeIngredient(req, res) {
    try {
      const { user } = req;
      const { ingredientId } = req.params;

      await recipeService.removeIngredient(ingredientId, user.id);
      return ApiResponse.success(res, null, 'Ingredient removed successfully');
    } catch (error) {
      console.error('Remove ingredient error:', error);
      if (error.message.includes('not found')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      if (error.message.includes('Not authorized')) {
        return ApiResponse.forbiddenError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async addInstruction(req, res) {
    try {
      const { user } = req;
      const { recipeId } = req.params;
      const instructionData = req.body;

      if (!instructionData.description) {
        return ApiResponse.badRequestError(res, 'Description is required');
      }

      const instruction = await recipeService.addInstruction(recipeId, instructionData, user.id);
      return ApiResponse.created(res, { instruction }, 'Instruction added successfully');
    } catch (error) {
      console.error('Add instruction error:', error);
      if (error.message.includes('not found') || error.message.includes('not authorized')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async updateInstruction(req, res) {
    try {
      const { user } = req;
      const { instructionId } = req.params;
      const updateData = req.body;

      const instruction = await recipeService.updateInstruction(instructionId, updateData, user.id);
      return ApiResponse.success(res, { instruction }, 'Instruction updated successfully');
    } catch (error) {
      console.error('Update instruction error:', error);
      if (error.message.includes('not found')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      if (error.message.includes('Not authorized')) {
        return ApiResponse.forbiddenError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async removeInstruction(req, res) {
    try {
      const { user } = req;
      const { instructionId } = req.params;

      await recipeService.removeInstruction(instructionId, user.id);
      return ApiResponse.success(res, null, 'Instruction removed successfully');
    } catch (error) {
      console.error('Remove instruction error:', error);
      if (error.message.includes('not found')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      if (error.message.includes('Not authorized')) {
        return ApiResponse.forbiddenError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }

  async searchRecipes(req, res) {
    try {
      const { q: search } = req.query;
      
      if (!search || search.trim().length < 2) {
        return ApiResponse.badRequestError(res, 'Search query must be at least 2 characters');
      }

      const filters = { 
        search: search.trim(),
        is_public: true
      };
      
      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: Math.min(parseInt(req.query.limit) || 20, 50),
        sort_by: 'rating_average',
        sort_order: 'desc'
      };

      const result = await recipeService.searchRecipes(filters, pagination);
      return ApiResponse.paginated(res, result.recipes, result.pagination, 'Search completed successfully');
    } catch (error) {
      console.error('Search recipes error:', error);
      return ApiResponse.serverError(res, error.message);
    }
  }

  async getMyRecipes(req, res) {
    try {
      const { user } = req;
      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: Math.min(parseInt(req.query.limit) || 20, 50),
        sort_by: req.query.sort_by || 'updated_at',
        sort_order: req.query.sort_order || 'desc'
      };

      const result = await recipeService.getUserRecipes(user.id, pagination);
      return ApiResponse.paginated(res, result.recipes, result.pagination, 'Your recipes retrieved successfully');
    } catch (error) {
      console.error('Get my recipes error:', error);
      return ApiResponse.serverError(res, error.message);
    }
  }

  async getPublicRecipes(req, res) {
    try {
      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: Math.min(parseInt(req.query.limit) || 20, 50),
        sort_by: req.query.sort_by || 'created_at',
        sort_order: req.query.sort_order || 'desc'
      };

      const result = await recipeService.getPublicRecipes(pagination);
      return ApiResponse.paginated(res, result.recipes, result.pagination, 'Public recipes retrieved successfully');
    } catch (error) {
      console.error('Get public recipes error:', error);
      return ApiResponse.serverError(res, error.message);
    }
  }

  async createCompleteRecipe(req, res) {
    try {
      const { user } = req;
      const recipeData = req.body;

      if (!recipeData.name || !recipeData.servings) {
        return ApiResponse.badRequestError(res, 'Name and servings are required');
      }

      if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
        return ApiResponse.badRequestError(res, 'At least one ingredient is required');
      }

      if (!recipeData.instructions || recipeData.instructions.length === 0) {
        return ApiResponse.badRequestError(res, 'At least one instruction is required');
      }

      for (const ingredient of recipeData.ingredients) {
        if (!ingredient.food_id || !ingredient.quantity || !ingredient.unit) {
          return ApiResponse.badRequestError(res, 'Each ingredient must have food_id, quantity, and unit');
        }
      }

      for (const instruction of recipeData.instructions) {
        if (!instruction.description) {
          return ApiResponse.badRequestError(res, 'Each instruction must have a description');
        }
      }

      const recipe = await recipeService.createCompleteRecipe(recipeData, user.id);
      return ApiResponse.created(res, { recipe }, 'Complete recipe created successfully');
    } catch (error) {
      console.error('Create complete recipe error:', error);
      return ApiResponse.serverError(res, error.message);
    }
  }

  async getRecipeNutrition(req, res) {
    try {
      const { recipeId } = req.params;
      const { per_serving = 'true' } = req.query;

      const recipe = await recipeService.getRecipeById(recipeId, false);
      
      const nutrition = {
        calories: parseFloat(recipe.calories_per_serving?.toString() || '0'),
        protein_g: parseFloat(recipe.protein_per_serving_g?.toString() || '0'),
        carbs_g: parseFloat(recipe.carbs_per_serving_g?.toString() || '0'),
        fat_g: parseFloat(recipe.fat_per_serving_g?.toString() || '0'),
        fiber_g: parseFloat(recipe.fiber_per_serving_g?.toString() || '0'),
        sugar_g: parseFloat(recipe.sugar_per_serving_g?.toString() || '0'),
        sodium_mg: parseFloat(recipe.sodium_per_serving_mg?.toString() || '0')
      };

      if (per_serving === 'false') {
        const servings = parseFloat(recipe.servings.toString());
        Object.keys(nutrition).forEach(key => {
          nutrition[key] *= servings;
        });
      }

      return ApiResponse.success(res, { 
        nutrition,
        servings: parseFloat(recipe.servings.toString()),
        per_serving: per_serving === 'true'
      }, 'Recipe nutrition retrieved successfully');
    } catch (error) {
      console.error('Get recipe nutrition error:', error);
      if (error.message.includes('not found')) {
        return ApiResponse.notFoundError(res, error.message);
      }
      return ApiResponse.serverError(res, error.message);
    }
  }
}

module.exports = new RecipeController();