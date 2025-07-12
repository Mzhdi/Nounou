const nutritionService = require('../services/nutritionService');
const { validationResult } = require('express-validator');

class NutritionController {
  async updateNutrition(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { foodId } = req.params;
      const nutrition = await nutritionService.updateNutrition(foodId, req.body);

      res.json({
        success: true,
        message: 'Valeurs nutritionnelles mises à jour',
        data: nutrition
      });
    } catch (error) {
      console.error('Erreur mise à jour nutrition:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }

  async calculatePortion(req, res) {
    try {
      const { food_id, quantity_g } = req.body;

      if (!food_id || !quantity_g) {
        return res.status(400).json({
          success: false,
          message: 'food_id et quantity_g sont requis'
        });
      }

      const calculation = await nutritionService.calculatePortion(food_id, quantity_g);

      res.json({
        success: true,
        data: calculation
      });
    } catch (error) {
      console.error('Erreur calcul portion:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
}

module.exports = new NutritionController();