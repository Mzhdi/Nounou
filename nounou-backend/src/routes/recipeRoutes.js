// src/routes/recipeRoutes.js
const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const recipeCategoryController = require('../controllers/recipeCategoryController');
const AuthMiddleware = require('../middleware/auth');

// ===============================
// ROUTES SPÉCIFIQUES (AVANT LES PARAMÈTRES)
// ===============================

// Recherche publique de recettes
router.get('/search', recipeController.searchRecipes);

// Recettes publiques
router.get('/public', recipeController.getPublicRecipes);

// Mes recettes (authentifié)
router.get('/my-recipes', AuthMiddleware.authenticate, recipeController.getMyRecipes);

// Créer une recette complète en une fois (authentifié)
router.post('/complete', AuthMiddleware.authenticate, recipeController.createCompleteRecipe);

// ===============================
// GESTION DES CATÉGORIES
// ===============================

// Recherche de catégories
router.get('/categories/search', recipeCategoryController.searchCategories);

// Statistiques de toutes les catégories
router.get('/categories/stats', recipeCategoryController.getAllCategoryStats);

// Catégories racines
router.get('/categories/roots', recipeCategoryController.getRootCategories);

// Catégories par niveau
router.get('/categories/level/:level', recipeCategoryController.getCategoriesByLevel);

// CRUD Catégories
router.get('/categories', recipeCategoryController.getCategories);
router.post('/categories', AuthMiddleware.authenticate, recipeCategoryController.createCategory);

// Routes avec paramètres pour catégories
router.get('/categories/slug/:slug', recipeCategoryController.getCategoryBySlug);
router.get('/categories/:categoryId', recipeCategoryController.getCategoryById);
router.put('/categories/:categoryId', AuthMiddleware.authenticate, recipeCategoryController.updateCategory);
router.delete('/categories/:categoryId', AuthMiddleware.authenticate, recipeCategoryController.deleteCategory);

// Opérations avancées sur catégories
router.get('/categories/:categoryId/breadcrumb', recipeCategoryController.getCategoryBreadcrumb);
router.get('/categories/:categoryId/stats', recipeCategoryController.getCategoryStats);
router.put('/categories/:categoryId/stats', AuthMiddleware.authenticate, recipeCategoryController.updateCategoryStats);
router.put('/categories/:parent_id/reorder', AuthMiddleware.authenticate, recipeCategoryController.reorderCategories);

// ===============================
// GESTION DES RECETTES
// ===============================

// CRUD Recettes principales
router.get('/', recipeController.getRecipes);
router.post('/', AuthMiddleware.authenticate, recipeController.createRecipe);

// Routes avec paramètres pour recettes (APRÈS les routes spécifiques)
router.get('/:recipeId', recipeController.getRecipeById);
router.put('/:recipeId', AuthMiddleware.authenticate, recipeController.updateRecipe);
router.delete('/:recipeId', AuthMiddleware.authenticate, recipeController.deleteRecipe);

// Nutrition d'une recette
router.get('/:recipeId/nutrition', recipeController.getRecipeNutrition);

// ===============================
// GESTION DES INGRÉDIENTS
// ===============================

// Ingrédients d'une recette
router.get('/:recipeId/ingredients', recipeController.getRecipeIngredients);
router.post('/:recipeId/ingredients', AuthMiddleware.authenticate, recipeController.addIngredient);

// Gestion d'un ingrédient spécifique
router.put('/ingredients/:ingredientId', AuthMiddleware.authenticate, recipeController.updateIngredient);
router.delete('/ingredients/:ingredientId', AuthMiddleware.authenticate, recipeController.removeIngredient);

// ===============================
// GESTION DES INSTRUCTIONS
// ===============================

// Instructions d'une recette
router.post('/:recipeId/instructions', AuthMiddleware.authenticate, recipeController.addInstruction);

// Gestion d'une instruction spécifique
router.put('/instructions/:instructionId', AuthMiddleware.authenticate, recipeController.updateInstruction);
router.delete('/instructions/:instructionId', AuthMiddleware.authenticate, recipeController.removeInstruction);

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