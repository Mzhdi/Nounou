const NutritionalValue = require('../models/nutritionalValueModel');
const Food = require('../models/foodModel');

class NutritionService {
  async updateNutrition(foodId, nutritionData) {
    try {
      // Vérifier que l'aliment existe
      const food = await Food.findOne({ food_id: foodId });
      if (!food) {
        throw new Error('Aliment non trouvé');
      }

      const nutrition = await NutritionalValue.findOneAndUpdate(
        { food_id: foodId },
        nutritionData,
        { 
          new: true, 
          upsert: true, 
          runValidators: true,
          setDefaultsOnInsert: true
        }
      );

      return nutrition;
    } catch (error) {
      console.error('Erreur mise à jour nutrition:', error);
      throw error;
    }
  }

  async calculatePortion(foodId, quantityGrams) {
    try {
      const nutrition = await NutritionalValue.findOne({ food_id: foodId });
      if (!nutrition) {
        throw new Error('Valeurs nutritionnelles non trouvées');
      }

      // Calculer le ratio (quantité demandée / 100g)
      const ratio = quantityGrams / 100;

      // Convertir les Decimal128 en nombres
      const toNumber = (decimal) => decimal ? parseFloat(decimal.toString()) : 0;

      const calculation = {
        food_id: foodId,
        quantity_g: quantityGrams,
        per_portion: {
          calories: toNumber(nutrition.calories) * ratio,
          protein_g: toNumber(nutrition.protein_g) * ratio,
          carbohydrates_g: toNumber(nutrition.carbohydrates_g) * ratio,
          sugars_g: toNumber(nutrition.sugars_g) * ratio,
          fat_g: toNumber(nutrition.fat_g) * ratio,
          saturated_fat_g: toNumber(nutrition.saturated_fat_g) * ratio,
          fiber_g: toNumber(nutrition.fiber_g) * ratio,
          sodium_mg: toNumber(nutrition.sodium_mg) * ratio,
          calcium_mg: toNumber(nutrition.calcium_mg) * ratio,
          iron_mg: toNumber(nutrition.iron_mg) * ratio,
          vitamin_c_mg: toNumber(nutrition.vitamin_c_mg) * ratio,
          vitamin_d_ug: toNumber(nutrition.vitamin_d_ug) * ratio
        }
      };

      return calculation;
    } catch (error) {
      console.error('Erreur calcul portion:', error);
      throw error;
    }
  }

  async getNutritionByFoodId(foodId) {
    try {
      const nutrition = await NutritionalValue.findOne({ food_id: foodId }).lean();
      return nutrition;
    } catch (error) {
      console.error('Erreur récupération nutrition:', error);
      throw error;
    }
  }
}

module.exports = new NutritionService();