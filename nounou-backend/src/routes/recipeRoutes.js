const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const recipeCategoryController = require('../controllers/recipeCategoryController');
const AuthMiddleware = require('../middleware/auth');

// ===============================
// ROUTES SPÉCIFIQUES (AVANT LES PARAMÈTRES)
// ===============================

router.get('/search', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Search recipes by text'
    #swagger.description = 'Search for recipes using text query with fuzzy matching'
    #swagger.parameters['q'] = { in: 'query', required: true, type: 'string', description: 'Search query' }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer', default: 20, description: 'Maximum results' }
    #swagger.parameters['category'] = { in: 'query', type: 'string', description: 'Filter by category' }
    #swagger.parameters['cuisine'] = { in: 'query', type: 'string', description: 'Filter by cuisine' }
    #swagger.parameters['difficulty'] = { in: 'query', type: 'string', enum: ['easy', 'medium', 'hard'] }
    #swagger.parameters['maxTime'] = { in: 'query', type: 'integer', description: 'Maximum total time in minutes' }
    #swagger.responses[200] = { 
      description: 'Recipe search results',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          query: { type: 'string' },
          results: { type: 'array', items: { $ref: '#/definitions/Recipe' } },
          total: { type: 'number' }
        }
      }
    }
  */
  recipeController.searchRecipes
);

router.get('/public', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Get public recipes'
    #swagger.description = 'Retrieve publicly available recipes'
    #swagger.parameters['page'] = { in: 'query', type: 'integer', default: 1 }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer', default: 20 }
    #swagger.parameters['category'] = { in: 'query', type: 'string' }
    #swagger.parameters['cuisine'] = { in: 'query', type: 'string' }
    #swagger.parameters['sortBy'] = { in: 'query', type: 'string', enum: ['name', 'rating', 'createdAt', 'totalTime'], default: 'createdAt' }
    #swagger.responses[200] = { 
      description: 'List of public recipes',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/definitions/Recipe' } },
          pagination: { $ref: '#/definitions/Pagination' }
        }
      }
    }
  */
  recipeController.getPublicRecipes
);

router.get('/my-recipes', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Get user\'s recipes'
    #swagger.description = 'Retrieve recipes created by the authenticated user'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['page'] = { in: 'query', type: 'integer' }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer' }
    #swagger.parameters['includePrivate'] = { in: 'query', type: 'boolean', default: true }
    #swagger.responses[200] = { 
      description: 'User\'s recipes',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/definitions/Recipe' } },
          pagination: { $ref: '#/definitions/Pagination' }
        }
      }
    }
    #swagger.responses[401] = { 
      description: 'Authentication required',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  AuthMiddleware.authenticate, 
  recipeController.getMyRecipes
);

router.post('/complete', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Create complete recipe in one request'
    #swagger.description = 'Create a complete recipe with ingredients and instructions in a single request'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $ref: '#/definitions/RecipeCreate' }
    }
    #swagger.responses[201] = { 
      description: 'Complete recipe created successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { $ref: '#/definitions/Recipe' }
        }
      }
    }
    #swagger.responses[400] = { 
      description: 'Invalid input data',
      schema: { $ref: '#/definitions/Error' }
    }
    #swagger.responses[401] = { 
      description: 'Authentication required',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  AuthMiddleware.authenticate, 
  recipeController.createCompleteRecipe
);

// ===============================
// GESTION DES CATÉGORIES
// ===============================

router.get('/categories/search', 
  /* 
    #swagger.tags = ['Categories']
    #swagger.summary = 'Search recipe categories'
    #swagger.parameters['q'] = { in: 'query', required: true, type: 'string', description: 'Search query' }
    #swagger.responses[200] = { 
      description: 'Category search results',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          results: { type: 'array', items: { $ref: '#/definitions/RecipeCategory' } }
        }
      }
    }
  */
  recipeCategoryController.searchCategories
);

router.get('/categories/stats', 
  /* 
    #swagger.tags = ['Categories']
    #swagger.summary = 'Get all category statistics'
    #swagger.responses[200] = { 
      description: 'Category statistics',
      schema: {
        type: 'object',
        properties: {
          totalCategories: { type: 'number' },
          categoriesWithRecipes: { type: 'number' },
          avgRecipesPerCategory: { type: 'number' }
        }
      }
    }
  */
  recipeCategoryController.getAllCategoryStats
);

router.get('/categories/roots', 
  /* 
    #swagger.tags = ['Categories']
    #swagger.summary = 'Get root categories'
    #swagger.description = 'Get top-level categories (no parent)'
    #swagger.responses[200] = { 
      description: 'Root categories',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/definitions/RecipeCategory' } }
        }
      }
    }
  */
  recipeCategoryController.getRootCategories
);

router.get('/categories/level/:level', recipeCategoryController.getCategoriesByLevel);

router.get('/categories', 
  /* 
    #swagger.tags = ['Categories']
    #swagger.summary = 'Get recipe categories'
    #swagger.description = 'Retrieve recipe categories with optional hierarchy'
    #swagger.parameters['page'] = { in: 'query', type: 'integer' }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer' }
    #swagger.parameters['includeHierarchy'] = { in: 'query', type: 'boolean', default: false }
    #swagger.responses[200] = { 
      description: 'List of recipe categories',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/definitions/RecipeCategory' } },
          pagination: { $ref: '#/definitions/Pagination' }
        }
      }
    }
  */
  recipeCategoryController.getCategories
);

router.post('/categories', 
  /* 
    #swagger.tags = ['Categories']
    #swagger.summary = 'Create recipe category'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Desserts' },
          description: { type: 'string', example: 'Sweet dessert recipes' },
          parentId: { type: 'string', description: 'Parent category ID' },
          icon: { type: 'string', example: '🍰' },
          color: { type: 'string', example: '#FF69B4' }
        }
      }
    }
    #swagger.responses[201] = { 
      description: 'Category created',
      schema: { $ref: '#/definitions/RecipeCategory' }
    }
  */
  AuthMiddleware.authenticate, 
  recipeCategoryController.createCategory
);

// Routes avec paramètres pour catégories
router.get('/categories/slug/:slug', recipeCategoryController.getCategoryBySlug);

router.get('/categories/:categoryId', 
  /* 
    #swagger.tags = ['Categories']
    #swagger.summary = 'Get category by ID'
    #swagger.parameters['categoryId'] = { in: 'path', required: true, type: 'string', description: 'Category ID' }
    #swagger.responses[200] = { 
      description: 'Category details',
      schema: { $ref: '#/definitions/RecipeCategory' }
    }
    #swagger.responses[404] = { 
      description: 'Category not found',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  recipeCategoryController.getCategoryById
);

router.put('/categories/:categoryId', AuthMiddleware.authenticate, recipeCategoryController.updateCategory);
router.delete('/categories/:categoryId', AuthMiddleware.authenticate, recipeCategoryController.deleteCategory);
router.get('/categories/:categoryId/breadcrumb', recipeCategoryController.getCategoryBreadcrumb);
router.get('/categories/:categoryId/stats', recipeCategoryController.getCategoryStats);
router.put('/categories/:categoryId/stats', AuthMiddleware.authenticate, recipeCategoryController.updateCategoryStats);
router.put('/categories/:parent_id/reorder', AuthMiddleware.authenticate, recipeCategoryController.reorderCategories);

// ===============================
// GESTION DES RECETTES
// ===============================

router.get('/', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Get recipes with filtering'
    #swagger.description = 'Retrieve recipes with optional filtering and pagination'
    #swagger.parameters['page'] = { in: 'query', type: 'integer', default: 1, description: 'Page number' }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer', default: 20, description: 'Items per page' }
    #swagger.parameters['category'] = { in: 'query', type: 'string', description: 'Filter by category' }
    #swagger.parameters['cuisine'] = { in: 'query', type: 'string', description: 'Filter by cuisine' }
    #swagger.parameters['difficulty'] = { in: 'query', type: 'string', enum: ['easy', 'medium', 'hard'] }
    #swagger.parameters['maxTime'] = { in: 'query', type: 'integer', description: 'Maximum total time in minutes' }
    #swagger.parameters['publicOnly'] = { in: 'query', type: 'boolean', default: true }
    #swagger.parameters['sortBy'] = { in: 'query', type: 'string', enum: ['name', 'rating', 'createdAt', 'totalTime'] }
    #swagger.parameters['sortOrder'] = { in: 'query', type: 'string', enum: ['asc', 'desc'], default: 'desc' }
    #swagger.responses[200] = { 
      description: 'List of recipes',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/definitions/Recipe' } },
          pagination: { $ref: '#/definitions/Pagination' },
          filters: { 
            type: 'object',
            properties: {
              appliedFilters: { type: 'object' },
              availableFilters: { type: 'object' }
            }
          }
        }
      }
    }
  */
  recipeController.getRecipes
);

router.post('/', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Create new recipe'
    #swagger.description = 'Create a basic recipe (ingredients and instructions added separately)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Chicken Stir Fry' },
          description: { type: 'string', example: 'A healthy chicken stir fry' },
          categoryId: { type: 'string', example: '64f7d1b2c8e5f1234567890g' },
          cuisine: { type: 'string', example: 'Asian' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'], example: 'medium' },
          prepTime: { type: 'number', example: 15 },
          cookTime: { type: 'number', example: 20 },
          servings: { type: 'number', example: 4 },
          isPublic: { type: 'boolean', example: true },
          tags: { type: 'array', items: { type: 'string' }, example: ['healthy', 'quick'] }
        }
      }
    }
    #swagger.responses[201] = { 
      description: 'Recipe created successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { $ref: '#/definitions/Recipe' }
        }
      }
    }
    #swagger.responses[400] = { 
      description: 'Invalid input data',
      schema: { $ref: '#/definitions/Error' }
    }
    #swagger.responses[401] = { 
      description: 'Authentication required',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  AuthMiddleware.authenticate, 
  recipeController.createRecipe
);

// Routes avec paramètres pour recettes (APRÈS les routes spécifiques)
router.get('/:recipeId', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Get recipe by ID'
    #swagger.description = 'Retrieve a specific recipe with all details including ingredients and instructions'
    #swagger.parameters['recipeId'] = { in: 'path', required: true, type: 'string', description: 'Recipe ID' }
    #swagger.parameters['includeNutrition'] = { in: 'query', type: 'boolean', default: true }
    #swagger.parameters['includeAuthor'] = { in: 'query', type: 'boolean', default: true }
    #swagger.responses[200] = { 
      description: 'Recipe details',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { $ref: '#/definitions/Recipe' }
        }
      }
    }
    #swagger.responses[404] = { 
      description: 'Recipe not found',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  recipeController.getRecipeById
);

router.put('/:recipeId', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Update recipe'
    #swagger.description = 'Update recipe details (ingredients and instructions updated separately)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['recipeId'] = { in: 'path', required: true, type: 'string', description: 'Recipe ID' }
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          categoryId: { type: 'string' },
          cuisine: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          prepTime: { type: 'number' },
          cookTime: { type: 'number' },
          servings: { type: 'number' },
          isPublic: { type: 'boolean' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      }
    }
    #swagger.responses[200] = { 
      description: 'Recipe updated successfully',
      schema: { $ref: '#/definitions/Recipe' }
    }
    #swagger.responses[403] = { 
      description: 'Not authorized to update this recipe',
      schema: { $ref: '#/definitions/Error' }
    }
    #swagger.responses[404] = { 
      description: 'Recipe not found',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  AuthMiddleware.authenticate, 
  recipeController.updateRecipe
);

router.delete('/:recipeId', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Delete recipe'
    #swagger.description = 'Soft delete a recipe (only recipe owner or admin)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['recipeId'] = { in: 'path', required: true, type: 'string', description: 'Recipe ID' }
    #swagger.responses[200] = { 
      description: 'Recipe deleted successfully',
      schema: { $ref: '#/definitions/Success' }
    }
    #swagger.responses[403] = { 
      description: 'Not authorized to delete this recipe',
      schema: { $ref: '#/definitions/Error' }
    }
    #swagger.responses[404] = { 
      description: 'Recipe not found',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  AuthMiddleware.authenticate, 
  recipeController.deleteRecipe
);

// Nutrition d'une recette
router.get('/:recipeId/nutrition', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Get recipe nutrition information'
    #swagger.description = 'Calculate and return detailed nutrition information for a recipe'
    #swagger.parameters['recipeId'] = { in: 'path', required: true, type: 'string', description: 'Recipe ID' }
    #swagger.parameters['servings'] = { in: 'query', type: 'number', description: 'Custom serving size for calculation' }
    #swagger.responses[200] = { 
      description: 'Recipe nutrition data',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          recipeId: { type: 'string' },
          servings: { type: 'number' },
          nutrition: {
            type: 'object',
            properties: {
              perServing: {
                type: 'object',
                properties: {
                  calories: { type: 'number' },
                  protein: { type: 'number' },
                  carbs: { type: 'number' },
                  fat: { type: 'number' },
                  fiber: { type: 'number' },
                  sugar: { type: 'number' }
                }
              },
              total: {
                type: 'object',
                properties: {
                  calories: { type: 'number' },
                  protein: { type: 'number' },
                  carbs: { type: 'number' },
                  fat: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
    #swagger.responses[404] = { 
      description: 'Recipe not found',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  recipeController.getRecipeNutrition
);

// ===============================
// GESTION DES INGRÉDIENTS
// ===============================

router.get('/:recipeId/ingredients', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Get recipe ingredients'
    #swagger.parameters['recipeId'] = { in: 'path', required: true, type: 'string', description: 'Recipe ID' }
    #swagger.responses[200] = { 
      description: 'Recipe ingredients',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                foodId: { type: 'string' },
                food: { $ref: '#/definitions/Food' },
                quantity: { type: 'number' },
                unit: { type: 'string' },
                notes: { type: 'string' },
                order: { type: 'number' }
              }
            }
          }
        }
      }
    }
  */
  recipeController.getRecipeIngredients
);

router.post('/:recipeId/ingredients', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Add ingredient to recipe'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['recipeId'] = { in: 'path', required: true, type: 'string', description: 'Recipe ID' }
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        required: ['foodId', 'quantity', 'unit'],
        properties: {
          foodId: { type: 'string', example: '64f7d1b2c8e5f1234567890b' },
          quantity: { type: 'number', example: 200 },
          unit: { type: 'string', example: 'g' },
          notes: { type: 'string', example: 'diced' },
          order: { type: 'number', example: 1 }
        }
      }
    }
    #swagger.responses[201] = { 
      description: 'Ingredient added to recipe',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          ingredient: { type: 'object' }
        }
      }
    }
    #swagger.responses[400] = { 
      description: 'Invalid ingredient data',
      schema: { $ref: '#/definitions/Error' }
    }
    #swagger.responses[404] = { 
      description: 'Recipe or food not found',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  AuthMiddleware.authenticate, 
  recipeController.addIngredient
);

// Gestion d'un ingrédient spécifique
router.put('/ingredients/:ingredientId', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Update recipe ingredient'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['ingredientId'] = { in: 'path', required: true, type: 'string', description: 'Ingredient ID' }
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        type: 'object',
        properties: {
          quantity: { type: 'number' },
          unit: { type: 'string' },
          notes: { type: 'string' },
          order: { type: 'number' }
        }
      }
    }
    #swagger.responses[200] = { 
      description: 'Ingredient updated',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  AuthMiddleware.authenticate, 
  recipeController.updateIngredient
);

router.delete('/ingredients/:ingredientId', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Remove ingredient from recipe'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['ingredientId'] = { in: 'path', required: true, type: 'string', description: 'Ingredient ID' }
    #swagger.responses[200] = { 
      description: 'Ingredient removed',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  AuthMiddleware.authenticate, 
  recipeController.removeIngredient
);

// ===============================
// GESTION DES INSTRUCTIONS
// ===============================

router.post('/:recipeId/instructions', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Add instruction to recipe'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['recipeId'] = { in: 'path', required: true, type: 'string', description: 'Recipe ID' }
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        required: ['step', 'instruction'],
        properties: {
          step: { type: 'number', example: 1 },
          instruction: { type: 'string', example: 'Heat oil in a large pan over medium-high heat' },
          duration: { type: 'number', example: 2, description: 'Duration in minutes' },
          order: { type: 'number', example: 1 }
        }
      }
    }
    #swagger.responses[201] = { 
      description: 'Instruction added to recipe',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          instruction: { type: 'object' }
        }
      }
    }
  */
  AuthMiddleware.authenticate, 
  recipeController.addInstruction
);

// Gestion d'une instruction spécifique
router.put('/instructions/:instructionId', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Update recipe instruction'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['instructionId'] = { in: 'path', required: true, type: 'string', description: 'Instruction ID' }
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        type: 'object',
        properties: {
          step: { type: 'number' },
          instruction: { type: 'string' },
          duration: { type: 'number' },
          order: { type: 'number' }
        }
      }
    }
    #swagger.responses[200] = { 
      description: 'Instruction updated',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  AuthMiddleware.authenticate, 
  recipeController.updateInstruction
);

router.delete('/instructions/:instructionId', 
  /* 
    #swagger.tags = ['Recipes']
    #swagger.summary = 'Remove instruction from recipe'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['instructionId'] = { in: 'path', required: true, type: 'string', description: 'Instruction ID' }
    #swagger.responses[200] = { 
      description: 'Instruction removed',
      schema: { $ref: '#/definitions/Success' }
    }
  */
  AuthMiddleware.authenticate, 
  recipeController.removeInstruction
);

// ===============================
// GESTION DES IMAGES (Future)
// ===============================

// Images d'une recette
// router.get('/:recipeId/images', recipeImageController.getRecipeImages);
// router.post('/:recipeId/images', AuthMiddleware.authenticate, recipeImageController.uploadImage);
// router.put('/images/:imageId', AuthMiddleware.authenticate, recipeImageController.updateImage);
// router.delete('/images/:imageId', AuthMiddleware.authenticate, recipeImageController.deleteImage);
// router.put('/:recipeId/images/cover', AuthMiddleware.authenticate, recipeImageController.setCoverImage);

// ===============================
// ROUTES AVANCÉES (Future)
// ===============================

// Favoris (Future)
// router.post('/:recipeId/favorite', AuthMiddleware.authenticate, recipeController.addToFavorites);
// router.delete('/:recipeId/favorite', AuthMiddleware.authenticate, recipeController.removeFromFavorites);
// router.get('/favorites', AuthMiddleware.authenticate, recipeController.getFavorites);

// Évaluations (Future)
// router.post('/:recipeId/rating', AuthMiddleware.authenticate, recipeController.rateRecipe);
// router.get('/:recipeId/ratings', recipeController.getRecipeRatings);

// Partage (Future)
// router.post('/:recipeId/share', AuthMiddleware.authenticate, recipeController.shareRecipe);
// router.get('/shared/:shareId', recipeController.getSharedRecipe);

// Import/Export (Future)
// router.post('/import', AuthMiddleware.authenticate, recipeController.importRecipe);
// router.get('/:recipeId/export/:format', recipeController.exportRecipe);

// Duplicata (Future)
// router.post('/:recipeId/duplicate', AuthMiddleware.authenticate, recipeController.duplicateRecipe);

// Conversion d'unités (Future)
// router.post('/:recipeId/convert-units', recipeController.convertUnits);

// Adaptation de portions (Future)
// router.post('/:recipeId/scale/:servings', recipeController.scaleRecipe);

module.exports = router;