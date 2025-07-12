const express = require('express');
const router = express.Router();

// Controllers
const foodController = require('../controllers/foodController');
const categoryController = require('../controllers/categoryController');

// Middleware
const AuthMiddleware = require('../middleware/auth');

// === ROUTES SPÉCIFIQUES EN PREMIER (ORDRE CRITIQUE) ===

// === DEBUG BRUTAL ===
router.get('/debug/:foodId', async (req, res) => {
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
});

// Route de test
router.get('/test', async (req, res) => {
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
});

// Routes de recherche
router.get('/search', foodController.searchFoods);
router.get('/barcode/:barcode', foodController.getFoodByBarcode);

// TOUTES les routes catégories
router.get('/categories/tree', categoryController.getCategoryTree);
router.get('/categories/:categoryId', categoryController.getCategoryById);
router.get('/categories', categoryController.getCategories);
router.post('/categories', AuthMiddleware.authenticate, categoryController.createCategory);
router.put('/categories/:categoryId', AuthMiddleware.authenticate, categoryController.updateCategory);

// Routes aliments racine
router.get('/', foodController.getFoods);
router.post('/', AuthMiddleware.authenticate, foodController.createFood);

// Routes avec :foodId EN DERNIER (très important)
router.get('/:foodId', foodController.getFoodById);
router.put('/:foodId', AuthMiddleware.authenticate, foodController.updateFood);
router.delete('/:foodId', AuthMiddleware.authenticate, foodController.deleteFood);

module.exports = router;