const foodService = require('../services/foodService');

class FoodController {
  async createFood(req, res) {
    try {
      // Validation basique
      if (!req.body.food || !req.body.food.name) {
        return res.status(400).json({
          success: false,
          message: 'Le nom de l\'aliment est requis'
        });
      }

      const foodData = req.body;
      const userId = req.user?.id;

      const result = await foodService.createCompleteFood(foodData, userId);

      res.status(201).json({
        success: true,
        message: 'Aliment créé avec succès',
        data: result
      });
    } catch (error) {
      console.error('Erreur création aliment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur serveur'
      });
    }
  }

  async getFoods(req, res) {
    try {
      const {
        search, category_id, food_type, is_verified,
        page = 1, limit = 20, sort = 'name'
      } = req.query;

      const filters = { 
        search, 
        category_id, 
        food_type, 
        is_verified: is_verified === 'true' ? true : undefined 
      };
      
      const options = { 
        page: parseInt(page), 
        limit: Math.min(parseInt(limit), 100), 
        sort 
      };

      const result = await foodService.getFoodsWithFilters(filters, options);

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Erreur récupération aliments:', error);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async getFoodById(req, res) {
    try {
      const { foodId } = req.params;
      const includeNutrition = req.query.include_nutrition === 'true';
      const includeImages = req.query.include_images === 'true';
      const includeAllergens = req.query.include_allergens === 'true';

      const food = await foodService.getFoodById(foodId, {
        includeNutrition, includeImages, includeAllergens
      });

      if (!food) {
        return res.status(404).json({ success: false, message: 'Aliment non trouvé' });
      }

      res.json({ success: true, data: food });
    } catch (error) {
      console.error('Erreur récupération aliment:', error);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async searchFoods(req, res) {
    try {
      const { q, limit = 10 } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'La recherche doit contenir au moins 2 caractères'
        });
      }

      const results = await foodService.searchFoods(q.trim(), parseInt(limit));
      res.json({ success: true, data: results });
    } catch (error) {
      console.error('Erreur recherche:', error);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async getFoodByBarcode(req, res) {
    try {
      const { barcode } = req.params;
      const food = await foodService.getFoodByBarcode(barcode);

      if (!food) {
        return res.status(404).json({
          success: false,
          message: 'Aucun aliment trouvé pour ce code-barres'
        });
      }

      res.json({ success: true, data: food });
    } catch (error) {
      console.error('Erreur recherche code-barres:', error);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async updateFood(req, res) {
    try {
      const { foodId } = req.params;
      const updateData = req.body;

      const updatedFood = await foodService.updateFood(foodId, updateData);

      if (!updatedFood) {
        return res.status(404).json({
          success: false,
          message: 'Aliment non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Aliment mis à jour avec succès',
        data: updatedFood
      });
    } catch (error) {
      console.error('Erreur mise à jour aliment:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }

  async deleteFood(req, res) {
    try {
      const { foodId } = req.params;

      const deleted = await foodService.softDeleteFood(foodId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Aliment non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Aliment supprimé avec succès'
      });
    } catch (error) {
      console.error('Erreur suppression aliment:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
}

module.exports = new FoodController();