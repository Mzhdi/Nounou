const express = require('express');
const router = express.Router();

// Controllers
const foodController = require('../controllers/foodController');
const categoryController = require('../controllers/categoryController');

// Middleware
const AuthMiddleware = require('../middleware/auth');

// === ROUTES SPÉCIFIQUES EN PREMIER (ORDRE CRITIQUE) ===

// === DEBUG BRUTAL ===
router.get('/debug/:foodId', 
  /* 
    #swagger.tags = ['Foods']
    #swagger.summary = 'Debug food lookup (Development only)'
    #swagger.description = 'Debug endpoint to troubleshoot food ID lookup issues'
    #swagger.parameters['foodId'] = { in: 'path', required: true, type: 'string', description: 'Food ID to debug' }
    #swagger.responses[200] = { 
      description: 'Debug information',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              search_id: { type: 'string' },
              found_by_food_id: { type: 'object' },
              found_by_mongo_id: { type: 'object' },
              all_foods: { type: 'array' }
            }
          }
        }
      }
    }
  */
  async (req, res) => {
    try {
      const { foodId } = req.params;
      console.log('🔍 DEBUG - Food ID reçu:', foodId);
      
      const Food = require('../models/foodModel');
      
      // Test 1: Chercher par food_id
      const foodById = await Food.findOne({ food_id: foodId });
      console.log('📊 Food trouvé par food_id:', foodById);
      
      // Test 2: Chercher par _id MongoDB
      const foodByMongoId = await Food.findById(foodId).catch(() => null);
      console.log('📊 Food trouvé par _id:', foodByMongoId);
      
      // Test 3: Lister TOUS les foods
      const allFoods = await Food.find({}).limit(5);
      console.log('📊 Tous les foods:', allFoods);
      
      res.json({
        success: true,
        data: {
          search_id: foodId,
          found_by_food_id: foodById,
          found_by_mongo_id: foodByMongoId,
          all_foods: allFoods
        }
      });
    } catch (error) {
      console.error('❌ ERREUR DEBUG:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  }
);

// Route de test
router.get('/test', 
  /* 
    #swagger.tags = ['Foods']
    #swagger.summary = 'Test food service connectivity'
    #swagger.description = 'Test endpoint to verify food service and database connectivity'
    #swagger.responses[200] = { 
      description: 'Service test results',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              categories_count: { type: 'number' },
              foods_count: { type: 'number' },
              database_connected: { type: 'boolean' }
            }
          }
        }
      }
    }
    #swagger.responses[500] = { 
      description: 'Service error',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  async (req, res) => {
    try {
      const FoodCategory = require('../models/foodCategoryModel');
      const Food = require('../models/foodModel');
      
      const categoryCount = await FoodCategory.countDocuments();
      const foodCount = await Food.countDocuments();
      
      res.json({
        success: true,
        data: {
          categories_count: categoryCount,
          foods_count: foodCount,
          database_connected: true
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Routes de recherche
router.get('/search', 
  /* 
    #swagger.tags = ['Foods']
    #swagger.summary = 'Search foods by text'
    #swagger.description = 'Search for foods using text query with fuzzy matching'
    #swagger.parameters['q'] = { in: 'query', required: true, type: 'string', description: 'Search query' }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer', default: 20, maximum: 50, description: 'Maximum number of results' }
    #swagger.parameters['category'] = { in: 'query', type: 'string', description: 'Filter by category' }
    #swagger.parameters['verified'] = { in: 'query', type: 'boolean', description: 'Filter by verified foods only' }
    #swagger.parameters['minCalories'] = { in: 'query', type: 'number', description: 'Minimum calories per 100g' }
    #swagger.parameters['maxCalories'] = { in: 'query', type: 'number', description: 'Maximum calories per 100g' }
    #swagger.responses[200] = { 
      description: 'Search results',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          query: { type: 'string', example: 'apple juice' },
          results: {
            type: 'array',
            items: {
              allOf: [
                { $ref: '#/definitions/Food' },
                {
                  type: 'object',
                  properties: {
                    score: { type: 'number', description: 'Search relevance score', example: 0.95 }
                  }
                }
              ]
            }
          },
          total: { type: 'number' },
          searchTime: { type: 'string' }
        }
      }
    }
    #swagger.responses[400] = { 
      description: 'Missing or invalid search query',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  foodController.searchFoods
);

router.get('/barcode/:barcode', 
  /* 
    #swagger.tags = ['Foods']
    #swagger.summary = 'Get food by barcode'
    #swagger.description = 'Retrieve food information using product barcode'
    #swagger.parameters['barcode'] = { 
      in: 'path', 
      required: true, 
      type: 'string', 
      description: 'Product barcode (EAN, UPC, etc.)',
      example: '1234567890123'
    }
    #swagger.responses[200] = { 
      description: 'Food found by barcode',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { $ref: '#/definitions/Food' }
        }
      }
    }
    #swagger.responses[404] = { 
      description: 'Food not found for this barcode',
      schema: { 
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Food not found' },
          barcode: { type: 'string' },
          suggestion: { type: 'string', example: 'Try manual search or add new food' }
        }
      }
    }
  */
  foodController.getFoodByBarcode
);

// TOUTES les routes catégories
router.get('/categories/tree', 
  /* 
    #swagger.tags = ['Categories']
    #swagger.summary = 'Get food category tree'
    #swagger.description = 'Retrieve the complete hierarchical tree of food categories'
    #swagger.parameters['includeEmpty'] = { in: 'query', type: 'boolean', default: false, description: 'Include categories with no foods' }
    #swagger.parameters['maxDepth'] = { in: 'query', type: 'integer', default: 5, description: 'Maximum tree depth' }
    #swagger.responses[200] = { 
      description: 'Category tree structure',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          tree: {
            type: 'array',
            items: {
              allOf: [
                { $ref: '#/definitions/FoodCategory' },
                {
                  type: 'object',
                  properties: {
                    children: { type: 'array', description: 'Child categories' },
                    foodCount: { type: 'number' },
                    depth: { type: 'number' }
                  }
                }
              ]
            }
          },
          totalCategories: { type: 'number' },
          maxDepth: { type: 'number' }
        }
      }
    }
  */
  categoryController.getCategoryTree
);

router.get('/categories/:categoryId', 
  /* 
    #swagger.tags = ['Categories']
    #swagger.summary = 'Get food category by ID'
    #swagger.parameters['categoryId'] = { in: 'path', required: true, type: 'string', description: 'Category ID' }
    #swagger.parameters['includeFoods'] = { in: 'query', type: 'boolean', default: false, description: 'Include foods in this category' }
    #swagger.parameters['includeChildren'] = { in: 'query', type: 'boolean', default: false, description: 'Include child categories' }
    #swagger.responses[200] = { 
      description: 'Category details',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { $ref: '#/definitions/FoodCategory' }
        }
      }
    }
    #swagger.responses[404] = { 
      description: 'Category not found',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  categoryController.getCategoryById
);

router.get('/categories', 
  /* 
    #swagger.tags = ['Categories']
    #swagger.summary = 'Get food categories'
    #swagger.description = 'Retrieve food categories with optional filtering and pagination'
    #swagger.parameters['page'] = { in: 'query', type: 'integer', default: 1, description: 'Page number' }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer', default: 20, description: 'Items per page' }
    #swagger.parameters['level'] = { in: 'query', type: 'integer', description: 'Filter by category level (0 = root)' }
    #swagger.parameters['parentId'] = { in: 'query', type: 'string', description: 'Filter by parent category' }
    #swagger.parameters['includeStats'] = { in: 'query', type: 'boolean', default: false, description: 'Include food count statistics' }
    #swagger.responses[200] = { 
      description: 'List of food categories',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/definitions/FoodCategory' } },
          pagination: { $ref: '#/definitions/Pagination' }
        }
      }
    }
  */
  categoryController.getCategories
);

router.post('/categories', 
  /* 
    #swagger.tags = ['Categories']
    #swagger.summary = 'Create food category'
    #swagger.description = 'Create a new food category (requires authentication)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Organic Fruits' },
          slug: { type: 'string', example: 'organic-fruits' },
          description: { type: 'string', example: 'Certified organic fresh fruits' },
          parentId: { type: 'string', description: 'Parent category ID' },
          icon: { type: 'string', example: '🍎' },
          color: { type: 'string', example: '#FF6B6B' },
          isActive: { type: 'boolean', default: true }
        }
      }
    }
    #swagger.responses[201] = { 
      description: 'Category created successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { $ref: '#/definitions/FoodCategory' }
        }
      }
    }
    #swagger.responses[400] = { 
      description: 'Invalid category data',
      schema: { $ref: '#/definitions/Error' }
    }
    #swagger.responses[401] = { 
      description: 'Authentication required',
      schema: { $ref: '#/definitions/Error' }
    }
    #swagger.responses[409] = { 
      description: 'Category name already exists',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  AuthMiddleware.authenticate, 
  categoryController.createCategory
);

router.put('/categories/:categoryId', 
  /* 
    #swagger.tags = ['Categories']
    #swagger.summary = 'Update food category'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['categoryId'] = { in: 'path', required: true, type: 'string', description: 'Category ID' }
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          parentId: { type: 'string' },
          icon: { type: 'string' },
          color: { type: 'string' },
          isActive: { type: 'boolean' }
        }
      }
    }
    #swagger.responses[200] = { 
      description: 'Category updated',
      schema: { $ref: '#/definitions/FoodCategory' }
    }
    #swagger.responses[404] = { 
      description: 'Category not found',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  AuthMiddleware.authenticate, 
  categoryController.updateCategory
);

// Routes aliments racine
router.get('/', 
  /* 
    #swagger.tags = ['Foods']
    #swagger.summary = 'Get all foods'
    #swagger.description = 'Retrieve a list of foods with optional filtering and pagination'
    #swagger.parameters['page'] = { in: 'query', type: 'integer', default: 1, description: 'Page number' }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer', default: 20, maximum: 100, description: 'Items per page' }
    #swagger.parameters['category'] = { in: 'query', type: 'string', description: 'Filter by food category' }
    #swagger.parameters['brand'] = { in: 'query', type: 'string', description: 'Filter by brand' }
    #swagger.parameters['verified'] = { in: 'query', type: 'boolean', description: 'Filter by verified foods only' }
    #swagger.parameters['public'] = { in: 'query', type: 'boolean', default: true, description: 'Include public foods' }
    #swagger.parameters['sortBy'] = { 
      in: 'query', 
      type: 'string', 
      enum: ['name', 'calories', 'createdAt', 'updatedAt'], 
      default: 'name',
      description: 'Sort foods by field'
    }
    #swagger.parameters['sortOrder'] = { 
      in: 'query', 
      type: 'string', 
      enum: ['asc', 'desc'], 
      default: 'asc',
      description: 'Sort order'
    }
    #swagger.parameters['minCalories'] = { in: 'query', type: 'number', description: 'Minimum calories per 100g' }
    #swagger.parameters['maxCalories'] = { in: 'query', type: 'number', description: 'Maximum calories per 100g' }
    #swagger.parameters['minProtein'] = { in: 'query', type: 'number', description: 'Minimum protein per 100g' }
    #swagger.parameters['allergens'] = { in: 'query', type: 'string', description: 'Exclude foods with these allergens (comma-separated)' }
    #swagger.responses[200] = { 
      description: 'List of foods',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/definitions/Food' } },
          pagination: { $ref: '#/definitions/Pagination' },
          filters: {
            type: 'object',
            properties: {
              applied: { type: 'object', description: 'Currently applied filters' },
              available: { 
                type: 'object',
                properties: {
                  categories: { type: 'array', items: { type: 'string' } },
                  brands: { type: 'array', items: { type: 'string' } },
                  calorieRange: { type: 'object', properties: { min: { type: 'number' }, max: { type: 'number' } } }
                }
              }
            }
          }
        }
      }
    }
  */
  foodController.getFoods
);

router.post('/', 
  /* 
    #swagger.tags = ['Foods']
    #swagger.summary = 'Create new food'
    #swagger.description = 'Add a new food item to the database (requires authentication)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $ref: '#/definitions/FoodCreate' }
    }
    #swagger.responses[201] = { 
      description: 'Food created successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string', example: 'Food created successfully' },
          data: { $ref: '#/definitions/Food' }
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
    #swagger.responses[409] = { 
      description: 'Food with this name/barcode already exists',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  AuthMiddleware.authenticate, 
  foodController.createFood
);

// Routes avec :foodId EN DERNIER (très important)
router.get('/:foodId', 
  /* 
    #swagger.tags = ['Foods']
    #swagger.summary = 'Get food by ID'
    #swagger.description = 'Retrieve a specific food item by its ID (supports both MongoDB _id and custom food_id)'
    #swagger.parameters['foodId'] = { 
      in: 'path', 
      required: true, 
      type: 'string', 
      description: 'Food ID (MongoDB _id or custom food_id)',
      example: '64f7d1b2c8e5f1234567890b'
    }
    #swagger.parameters['includeCategory'] = { in: 'query', type: 'boolean', default: true, description: 'Include category details' }
    #swagger.parameters['includeNutrition'] = { in: 'query', type: 'boolean', default: true, description: 'Include detailed nutrition data' }
    #swagger.responses[200] = { 
      description: 'Food details',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { $ref: '#/definitions/Food' }
        }
      }
    }
    #swagger.responses[404] = { 
      description: 'Food not found',
      schema: { 
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Food not found' },
          foodId: { type: 'string' },
          suggestion: { type: 'string', example: 'Try searching for similar foods' }
        }
      }
    }
  */
  foodController.getFoodById
);

router.put('/:foodId', 
  /* 
    #swagger.tags = ['Foods']
    #swagger.summary = 'Update food'
    #swagger.description = 'Update a food item (requires authentication and ownership/admin rights)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['foodId'] = { in: 'path', required: true, type: 'string', description: 'Food ID' }
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          brand: { type: 'string' },
          barcode: { type: 'string' },
          categoryId: { type: 'string' },
          nutritionPer100g: {
            type: 'object',
            properties: {
              calories: { type: 'number' },
              protein: { type: 'number' },
              carbs: { type: 'number' },
              fat: { type: 'number' },
              fiber: { type: 'number' },
              sugar: { type: 'number' },
              sodium: { type: 'number' }
            }
          },
          allergens: { type: 'array', items: { type: 'string' } },
          isPublic: { type: 'boolean' }
        }
      }
    }
    #swagger.responses[200] = { 
      description: 'Food updated successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { $ref: '#/definitions/Food' }
        }
      }
    }
    #swagger.responses[403] = { 
      description: 'Not authorized to update this food',
      schema: { $ref: '#/definitions/Error' }
    }
    #swagger.responses[404] = { 
      description: 'Food not found',
      schema: { $ref: '#/definitions/Error' }
    }
  */
  AuthMiddleware.authenticate, 
  foodController.updateFood
);

router.delete('/:foodId', 
  /* 
    #swagger.tags = ['Foods']
    #swagger.summary = 'Delete food'
    #swagger.description = 'Soft delete a food item (requires authentication and ownership/admin rights)'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['foodId'] = { in: 'path', required: true, type: 'string', description: 'Food ID' }
    #swagger.parameters['force'] = { in: 'query', type: 'boolean', default: false, description: 'Force permanent deletion (admin only)' }
    #swagger.responses[200] = { 
      description: 'Food deleted successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string', example: 'Food deleted successfully' },
          deletedAt: { type: 'string', format: 'date-time' }
        }
      }
    }
    #swagger.responses[403] = { 
      description: 'Not authorized to delete this food',
      schema: { $ref: '#/definitions/Error' }
    }
    #swagger.responses[404] = { 
      description: 'Food not found',
      schema: { $ref: '#/definitions/Error' }
    }
    #swagger.responses[409] = { 
      description: 'Cannot delete food that is being used in consumption entries',
      schema: { 
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Food is currently being used' },
          usageCount: { type: 'number' },
          suggestion: { type: 'string', example: 'Archive the food instead of deleting' }
        }
      }
    }
  */
  AuthMiddleware.authenticate, 
  foodController.deleteFood
);

module.exports = router;